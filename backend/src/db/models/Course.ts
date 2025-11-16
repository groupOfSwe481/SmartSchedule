import mongoose, { Schema, Document } from "mongoose";

/**
 * Course Interface for TypeScript
 */
export interface ICourse extends Document {
  name: string;
  code: string;
  credit_hours: number;
  is_elective: boolean;
  exam_date: string;
  exam_time: string;
  department: string;
  college: string;
  prerequisites: string[];
  section: string[];
  level: mongoose.Types.ObjectId; // Reference to Level
  duration: string;
  // --- ADDED THIS ---
  pattern: {
    pattern_type: string; // <-- RENAMED
    lecture_hours: number;
    lab_hours: number;
    tutorial_hours: number;
    total_hours: number;
  };
  // --- END ADDITION ---
}

/**
 * Course Schema
 */
const CourseSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  credit_hours: {
    type: Number,
    required: true,
  },
  is_elective: {
    type: Boolean,
    default: false,
  },
  exam_date: {
    type: String,
  },
  exam_time: {
    type: String,
  },
  department: {
    type: String,
    required: true,
  },
  college: {
    type: String,
    required: true,
  },
  prerequisites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
  ],
  section: {
    type: [String],
    default: [],
  },
  level: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Level",
  },
  duration: {
    type: String,
    required: true,
  },
  // --- START OF FIX ---
  pattern: {
    type: {
      pattern_type: { type: String, required: true }, // <-- RENAMED from 'type'
      lecture_hours: { type: Number, default: 0 },
      lab_hours: { type: Number, default: 0 },
      tutorial_hours: { type: Number, default: 0 },
      total_hours: { type: Number, default: 0 },
    },
    select: false, // <-- This is why we must use .select("+pattern")
  },
  // --- END OF FIX ---
});

/**
 * Export the Course model
 */
export const Course = mongoose.model<ICourse>("Course", CourseSchema, "Course");
