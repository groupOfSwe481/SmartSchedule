// backend/src/db/models/Comment.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  student_id: string;
  student_name: string;
  student_level: number;
  course_code: string;
  course_name: string;
  time_slot: string;
  day: string;
  comment_text: string;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewed_by?: string; // User ID of committee member who reviewed
  reviewed_at?: Date;
  procedures?: string; // ✅ الحقل الوحيد للرد
  created_at: Date;
  updated_at: Date;
}

const CommentSchema = new Schema<IComment>({
  student_id: { 
    type: String, 
    required: true,
    index: true 
  },
  student_name: { 
    type: String, 
    required: true 
  },
  student_level: { 
    type: Number, 
    required: true,
    min: 3,
    max: 8,
    index: true
  },
  course_code: { 
    type: String, 
    required: true 
  },
  course_name: { 
    type: String, 
    required: true 
  },
  time_slot: { 
    type: String, 
    required: true 
  },
  day: { 
    type: String, 
    required: true 
  },
  comment_text: { 
    type: String, 
    required: true,
    maxlength: 1000
  },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending',
    index: true
  },
  reviewed_by: { 
    type: String 
  },
  reviewed_at: { 
    type: Date 
  },
  procedures: { // ✅ تم إزالة admin_response
    type: String,
    maxlength: 2000 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on save
CommentSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Indexes for performance
CommentSchema.index({ student_level: 1, status: 1 });
CommentSchema.index({ created_at: -1 });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
