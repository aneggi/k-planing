import mongoose from 'mongoose';

const TodoCheckSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    emailNotification: { type: Boolean, default: false },
    deadline: { type: Date },
  },
  { _id: false }
);

const TodoSubSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    checks: [TodoCheckSchema],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
    assignedToName: { type: String },
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

const TodoTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subTodos: [TodoSubSchema],
    status: { type: [StatusEventSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('TodoTemplate', TodoTemplateSchema);
