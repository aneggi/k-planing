import mongoose from 'mongoose';

const StatusEventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    changeDate: { type: Date, default: Date.now },
  },
  { _id: false }
);

const QuotationSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    note: { type: String },
    estimateHours: { type: Number, default: 0 },
    desideratedDate: { type: Date },
    statuses: { type: [StatusEventSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Quotation', QuotationSchema);
