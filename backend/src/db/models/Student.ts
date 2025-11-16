import mongoose, { Schema, Document } from "mongoose";

export interface IStudent extends Document {
  student_id: string;
  user_id: string;
  level: number;
  irregulars: boolean;
  prevent_falling_behind_courses: string[];
  remaining_courses_from_past_levels: string[];
  courses_taken: string[];
  user_elective_choice: string[];
}

const StudentSchema: Schema = new Schema({
  student_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  level: {
    type: Number,
    required: true,
    min: 3,
    max: 8,
  },
  irregulars: {
    type: Boolean,
    default: false,
  },
  prevent_falling_behind_courses: {
    type: [String],
    default: [],
  },
  remaining_courses_from_past_levels: {
    type: [String],
    default: [],
  },
  courses_taken: {
    type: [String],
    default: [],
  },
  user_elective_choice: {
    type: [String],
    default: [],
  },
});

StudentSchema.index({ student_id: 1 });
StudentSchema.index({ irregulars: 1 });
StudentSchema.index({ level: 1 });

export const Student = mongoose.model<IStudent>("student", StudentSchema, "student");