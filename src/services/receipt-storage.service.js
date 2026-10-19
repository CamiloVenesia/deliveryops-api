
import { Readable } from 'node:stream';
import mongoose from 'mongoose';

import { deliveryService } from './delivery.service.js';
import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

const BUCKET_NAME = 'deliveryReceipts';
const MAX_BYTES = 5 * 1024 * 1024;
const STORAGE_PREFIX = 'gridfs:';

const FILE_SIGNATURES = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
  'image/png': Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a
  ]),
  'application/pdf': Buffer.from('%PDF-')
};

function getBucket() {
  if (!mongoose.connection.db) {
    throw new customError(
      ERROR_CODES.DATABASE_ERROR,
      'La base de datos no está disponible'
    );
  }

  return new mongoose.mongo.GridFSBucket(
    mongoose.connection.db,
    { bucketName: BUCKET_NAME }
  );
}

function validateFile(file) {
  if (!file?.buffer?.length) {
    throw new customError(ERROR_CODES.FILE_REQUIRED);
  }

  if (file.buffer.length > MAX_BYTES) {
    throw new customError(ERROR_CODES.FILE_TOO_LARGE);
  }

  const expectedSignature = FILE_SIGNATURES[file.mimetype];

  if (
    !expectedSignature ||
    !file.buffer
      .subarray(0, expectedSignature.length)
      .equals(expectedSignature)
  ) {
    throw new customError(
      ERROR_CODES.INVALID_FILE_TYPE,
      'Archivo inválido. Se admiten únicamente JPG, PNG y PDF válidos.'
    );
  }
}

async function uploadToGridFS(bucket, file, delivery, actor) {
  const extension =
    file.mimetype === 'image/png'
      ? 'png'
      : file.mimetype === 'application/pdf'
        ? 'pdf'
        : 'jpg';

  const upload = bucket.openUploadStream(
    `${delivery._id}-${Date.now()}.${extension}`,
    {
      contentType: file.mimetype,
      metadata: {
        deliveryId: delivery._id,
        uploadedBy: actor.id
      }
    }
  );

  await new Promise((resolve, reject) => {
    upload.on('error', reject);
    upload.on('finish', resolve);

    Readable.from([file.buffer]).pipe(upload);
  });

  return upload.id;
}

export const receiptStorageService = {
  async upload(did, file, actor) {
    const delivery = await deliveryService.getById(
      did,
      actor
    );

    if (
      delivery.status !== 'in_transit' ||
      delivery.proofOfDelivery?.receivedAt
    ) {
      throw new customError(
        ERROR_CODES.VALIDATION_ERROR,
        'La evidencia debe cargarse antes de confirmar una entrega en tránsito.'
      );
    }

    validateFile(file);

    const bucket = getBucket();

    const previousId = delivery.receipt?.path?.startsWith(
      STORAGE_PREFIX
    )
      ? delivery.receipt.path.slice(STORAGE_PREFIX.length)
      : null;

    const fileId = await uploadToGridFS(
      bucket,
      file,
      delivery,
      actor
    );

    try {
      delivery.receipt = {
        originalName: file.originalname,
        generatedName: String(fileId),
        path: `${STORAGE_PREFIX}${fileId}`,
        mimetype: file.mimetype,
        size: file.buffer.length,
        uploadedAt: new Date()
      };

      await delivery.save();
    } catch (error) {
      await bucket.delete(fileId).catch(() => {});
      throw error;
    }

    // Conservamos el archivo anterior hasta confirmar que
    // la nueva versión quedó guardada correctamente.
    if (previousId && mongoose.isValidObjectId(previousId)) {
      await bucket.delete(
        new mongoose.Types.ObjectId(previousId)
      ).catch(() => {});
    }

    return delivery;
  },

  async find(did, actor) {
    // getById valida que el administrador, cliente o
    // repartidor tenga permiso para consultar esta entrega.
    const delivery = await deliveryService.getById(
      did,
      actor
    );

    const receipt = delivery.receipt;

    if (!receipt) {
      return { state: 'missing' };
    }

    if (!receipt.path?.startsWith(STORAGE_PREFIX)) {
      return { state: 'legacy' };
    }

    const idText = receipt.path.slice(
      STORAGE_PREFIX.length
    );

    if (!mongoose.isValidObjectId(idText)) {
      return { state: 'missing' };
    }

    const id = new mongoose.Types.ObjectId(idText);
    const bucket = getBucket();

    const storedFile = await bucket
      .find({ _id: id })
      .next();

    if (!storedFile) {
      return { state: 'missing' };
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf'
    ];

    const contentType = allowedTypes.includes(
      storedFile.contentType
    )
      ? storedFile.contentType
      : 'application/octet-stream';

    return {
      state: 'ready',
      contentType,
      length: storedFile.length,
      stream: bucket.openDownloadStream(id)
    };
  }
};
