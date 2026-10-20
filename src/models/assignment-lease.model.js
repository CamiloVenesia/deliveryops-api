
import mongoose from 'mongoose';

const assignmentLeaseSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true }
}, { versionKey: false });

assignmentLeaseSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const AssignmentLease = mongoose.model(
    'AssignmentLease',
    assignmentLeaseSchema
);

export default AssignmentLease;
