import mongoose, { Schema, Document } from "mongoose";

export interface IDeadline extends Document {
  task: string;
  type?: string;
  role: string;
  time?: Date;
  time_start?: Date;
  time_end?: Date;
  start_date?: Date;
  end_date?: Date;
  description?: string;
  is_active?: boolean;
}

const DeadlineSchema = new Schema<IDeadline>(
  {
    task: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["Student", "Faculty", "Scheduler", "LoadCommittee", "Scheduling committee", "Load committee", "Students", "All"],
    },
    time: {
      type: Date,
      required: false,
    },
    time_start: {
      type: Date,
      required: false,
    },
    time_end: {
      type: Date,
      required: false,
    },
    start_date: {
      type: Date,
      required: false,
    },
    end_date: {
      type: Date,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: false,
  }
);

// Index for faster queries
DeadlineSchema.index({ role: 1, time: 1, is_active: 1 });

export default mongoose.model<IDeadline>("Deadline", DeadlineSchema);