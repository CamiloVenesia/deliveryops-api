
import {
  receiptStorageService
} from '../services/receipt-storage.service.js';

import { customError } from '../utils/customError.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const deliveryReceiptController = {
  async upload(req, res) {
    const delivery = await receiptStorageService.upload(
      req.params.did,
      req.file,
      req.user
    );

    res.status(201).json(delivery);
  },

  async download(req, res, next) {
    const receipt = await receiptStorageService.find(
      req.params.did,
      req.user
    );

    if (receipt.state === 'missing') {
      res.status(404).json({
        code: 'RECEIPT_NOT_FOUND',
        message: 'Esta entrega no tiene comprobante disponible.'
      });
      return;
    }

    if (receipt.state === 'legacy') {
      res.status(410).json({
        code: 'RECEIPT_NOT_PERSISTENT',
        message:
          'Este comprobante se guardó anteriormente en el disco temporal. ' +
          'Los comprobantes nuevos se almacenan de forma persistente.'
      });
      return;
    }

    const extension =
      receipt.contentType === 'image/png'
        ? 'png'
        : receipt.contentType === 'application/pdf'
          ? 'pdf'
          : 'jpg';

    const disposition =
      req.query.download === '1'
        ? 'attachment'
        : 'inline';

    res.setHeader(
      'Content-Type',
      receipt.contentType
    );

    res.setHeader(
      'Content-Length',
      String(receipt.length)
    );

    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="comprobante-deliveryops.${extension}"`
    );

    res.setHeader(
      'Cache-Control',
      'private, no-store'
    );

    res.setHeader(
      'X-Content-Type-Options',
      'nosniff'
    );

    receipt.stream.once('error', () => {
      if (res.headersSent) {
        res.destroy();
      } else {
        next(
          new customError(
            ERROR_CODES.FILE_UPLOAD_ERROR,
            'No se pudo leer el comprobante.'
          )
        );
      }
    });

    receipt.stream.pipe(res);
  }
};
