import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    surname: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('Customer', CustomerSchema);
