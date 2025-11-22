import mongoose from 'mongoose';

const StageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    department: { type: String },
    percentageOfWork: { type: Number, default: 0 },
    orderBy: { type: Number, default: 1 },
    dueDate: { type: Date },
  },
  { _id: false }
);

const OrderTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    stages: [StageSchema],
  },
  { timestamps: true }
);

export default mongoose.model('OrderTemplate', OrderTemplateSchema);
