import { ObjectId } from 'mongodb';

// Section Type alias for reuse
export type SectionType = 'lecture' | 'lab' | 'tutorial';

// Course Pattern
export interface CoursePattern {
  type: 'lecture_only' | 'lecture_tutorial' | 'lecture_lab' | 'lecture_lab_tutorial' | 'lab_only' | 'custom';
  lecture_hours: number;
  lab_hours: number;
  tutorial_hours: number;
  total_hours: number;
}

// Course - Database Model
export interface Course {
  _id?: ObjectId;
  name: string;
  code: string;
  credit_hours: number;
  Duration: number;
  is_elective: boolean;
  department: string;
  college: string;
  level?: ObjectId; // ObjectId reference to Level collection
  prerequisites: ObjectId[]; // ✅ FIXED: ObjectIds in database
  hour_prerequisites?: string[]; // Credit hour requirements as strings
  exam_date: string | null;
  exam_time: string | null;
  pattern: CoursePattern | null;
  section: (string | null)[];
  description?: string;
  created_at: Date;
  updated_at: Date;
}

// Course with populated prerequisites
export interface CourseWithDetails extends Omit<Course, 'prerequisites'> {
  prerequisites: ObjectId[]; // Keep the ObjectIds
  prerequisites_details: Course[]; // Add populated prerequisite courses
}

// Course Create Input - API Request
export interface CourseCreateInput {
  name: string;
  code: string;
  credit_hours: number;
  Duration: number;
  is_elective?: boolean;
  department: string;
  college: string;
  level?: number; // Input as number (e.g., 7), converted to ObjectId internally
  prerequisites?: string[]; // Input as course codes (e.g., ["MATH101"])
  hour_prerequisites?: string[]; // Credit hour requirements
  exam_date?: string | null;
  exam_time?: string | null;
  pattern?: {
    type: string;
    lecture_hours: number;
    lab_hours: number;
    tutorial_hours: number;
  };
}

// Section Types
export interface TimeSlotDetail {
  day: string;
  start_time: string;
  end_time: string;
  duration?: number;
  type?: string;
}

export interface Section {
  _id?: ObjectId;
  sec_num: string;
  course: string;
  classroom: string | null;
  max_Number: number | null;
  time_Slot: string[];
  time_slots_detail: TimeSlotDetail[];
  academic_level: number | null;
  type?: SectionType;
  follows_lecture?: string | null;
  created_at: Date;
  created_by: string;
  updated_at?: Date;
}

export interface SectionCreateInput {
  course_code: string;
  classroom?: string;
  max_number?: number;
  time_slots: TimeSlotDetail[];
  academic_level?: number;
  type?: SectionType;
  follows_lecture?: string;
  faculty_id?: string;
}

export interface UnifiedSectionInput {
  course_code: string;
  classroom?: string | null;
  max_Number?: number | null;
  time_Slot: string[];
  time_slots_detail?: TimeSlotDetail[];
  academic_level?: number | null;
  created_by?: string;
}
