import mongoose from 'mongoose';

const StageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    department: { type: String },
    percentageOfWork: { type: Number, default: 0 },
    estimateHours: { type: Number, default: 0 },
    orderBy: { type: Number, default: 1 },
    dueDate: { type: Date },
    startDate: { type: Date },
  },
  { _id: false }
);

const StatusEventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    changeDate: { type: Date, default: Date.now },
  },
  { _id: false }
);

  const OrderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    customer: { type: String, required: true },
    statuses: { type: [StatusEventSchema], default: [] },
    estimateHours: { type: Number, default: 0 },
    dueDate: { type: Date },
    mediumTermPlan: { type: Boolean, default: false },
    stages: [StageSchema],
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderTemplate' },
  },
  { timestamps: true }
);

export default mongoose.model('Order', OrderSchema);
