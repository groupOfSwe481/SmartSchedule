import mongoose, { Schema, Document } from "mongoose";

/**
 * 📘 Schedule Interface
 * Supports versioning, publishing, and notification triggers.
 */
export interface ISchedule extends Document {
  level: number;
  section: string;
  grid: Record<string, any>;

  // YOUR field for permissions (e.g., v1 = faculty, v3 = student)
  version: number;

  // --- NEW FIELD ---
  // NEW field to track every single edit (AI or manual)
  history_version: number;
  // --- END NEW FIELD ---

  publishedAt?: Date;
  created_at: Date; // This is from your original file

  // --- NEW FIELD ---
  // This field is critical for the logic
  status: "Draft" | "Published" | "Archived";
  // --- END NEW FIELD ---
}

/**
 * 🧩 Schedule Schema
 */
const ScheduleSchema: Schema<ISchedule> = new Schema(
  {
    level: {
      type: Number,
      required: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    grid: {
      type: Object,
      required: true,
    },
    version: {
      // <-- YOUR field, untouched
      type: Number,
      default: 0,
    },
    // --- NEW FIELD ---
    history_version: {
      type: Number,
      default: 1, // Edit history starts at 1
    },
    // ---
    publishedAt: {
      type: Date,
      default: null,
    },
    created_at: {
      // Your original field
      type: Date,
      default: Date.now,
    },
    // --- NEW FIELD ---
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
      index: true,
    },
    // ---
  },
  {
    collection: "Schedule", // Keep consistent with your DB
  }
);

/**
 * 🔍 Index for faster queries
 */
ScheduleSchema.index({ level: 1 });
ScheduleSchema.index({ version: -1 });
// Index the new fields for faster queries
ScheduleSchema.index({ level: 1, status: 1 });
ScheduleSchema.index({ level: 1, section: 1, status: 1, history_version: -1 });

/**
 * 🏗️ Export model
 */
export const Schedule = mongoose.model<ISchedule>("Schedule", ScheduleSchema);
// We can use the same model for MasterSchedules,
// a "MasterSchedule" is just a Schedule with status: "Published".
export const MasterSchedule = Schedule;
