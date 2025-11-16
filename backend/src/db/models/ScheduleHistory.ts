import mongoose, { Schema, Document } from "mongoose";

/**
 * Interface for the Schedule History Document.
 * Stores the difference (delta) between two versions of a schedule grid.
 */
export interface IScheduleHistory extends Document {
  schedule_id: mongoose.Schema.Types.ObjectId;
  history_version: number; // <-- RENAMED from 'version'
  timestamp: Date;
  delta: any; // Stores the JSON Diff Patch object
  user_id: string; // Optional: To track who made the change
  summary: string; // Brief description of the change (e.g., "Manual Edit")
}

const ScheduleHistorySchema: Schema = new Schema({
  schedule_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Schedule", // Links back to the Schedule document
  },
  history_version: {
    // <-- RENAMED from 'version'
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  delta: {
    type: Schema.Types.Mixed, // Stores arbitrary JSON structure (the diff patch)
    required: true,
  },
  user_id: {
    type: String, // You should integrate this with your auth system
    default: "SYSTEM",
  },
  summary: {
    type: String,
    required: true,
  },
});

// <-- UPDATED INDEX to use the new field name
ScheduleHistorySchema.index({ schedule_id: 1, history_version: -1 });

export const ScheduleHistory = mongoose.model<IScheduleHistory>(
  "ScheduleHistory",
  ScheduleHistorySchema,
  "schedule_history"
);
