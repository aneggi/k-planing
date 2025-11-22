import mongoose from 'mongoose';

const StatusSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    enableInOrder: { type: Boolean, default: true },
    enableInQuotation: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Status', StatusSchema);
