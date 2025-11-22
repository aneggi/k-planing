import mongoose from 'mongoose';

const TodoCheckSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    emailNotification: { type: Boolean, default: false },
    deadline: { type: Date },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const TodoSubSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    checks: [TodoCheckSchema],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
    assignedToName: { type: String },
    done: { type: Boolean, default: false },
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

const TodoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    orderCode: { type: String },
    customer: { type: String },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'TodoTemplate' },
    subTodos: [TodoSubSchema],
    statuses: { type: [StatusEventSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('Todo', TodoSchema);
