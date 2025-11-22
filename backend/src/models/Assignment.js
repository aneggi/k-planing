import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema(
  {
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
    personName: { type: String, required: true },
    orderCode: { type: String },
    note: { type: String },
    date: { type: Date, required: true },
    slot: { type: String, enum: ['m1', 'm2', 'p1', 'p2'], required: true }, // two morning, two afternoon
  },
  { timestamps: true }
);

export default mongoose.model('Assignment', AssignmentSchema);
