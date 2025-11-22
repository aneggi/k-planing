import mongoose from 'mongoose';

const PersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    surname: { type: String },
    email: { type: String },
    mobile: { type: String },
    type: { type: String, enum: ['EMP', 'EXT'], default: 'EMP' },
    department: { type: String },
    hoursPerDayOfTheWeek: {
      type: [Number],
      default: [0, 8, 8, 8, 6, 0, 0, 8],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Person', PersonSchema);
