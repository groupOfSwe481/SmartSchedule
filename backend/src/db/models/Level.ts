// backend/src/db/models/Level.ts - UPDATED VERSION
import mongoose, { Schema, Document } from "mongoose";

export interface ILevel extends Document {
  level_num: number;
  has: mongoose.Types.ObjectId[];
  student_count?: number; // Total number of students in this level
  course_enrollments?: Map<string, number>; // Student count per course code
  updated_at?: Date;
  
  // NEW: Elective course fields
  elective_courses?: string[];           // Array of course codes selected by faculty
  elective_course_ids?: mongoose.Types.ObjectId[];  // Array of course ObjectIds
  elective_selection_mode?: 'auto' | 'manual' | null;  // How courses were selected
  elective_selected_by?: string | null;  // Faculty member who made selection
  elective_selected_at?: Date | null;    // When selection was made
}

const LevelSchema: Schema = new Schema({
  level_num: {
    type: Number,
    required: true,
    min: 3,
    max: 8,
  },
  has: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
  ],
  student_count: {
    type: Number,
    default: 0,
    min: 0,
  },
  course_enrollments: {
    type: Map,
    of: Number,
    default: new Map(),
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  
  // NEW: Elective course fields
  elective_courses: {
    type: [String],
    default: [],
  },
  elective_course_ids: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    }
  ],
  elective_selection_mode: {
    type: String,
    enum: ['auto', 'manual', null],
    default: null,
  },
  elective_selected_by: {
    type: String,
    default: null,
  },
  elective_selected_at: {
    type: Date,
    default: null,
  },
});

// Auto-update updated_at on save
LevelSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export const Level = mongoose.model<ILevel>("Level", LevelSchema, "Level");
