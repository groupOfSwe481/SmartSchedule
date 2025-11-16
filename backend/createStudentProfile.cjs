// Script to create Student profile for existing users
const mongoose = require('mongoose');
require('dotenv').config();

// User Schema (simplified)
const UserSchema = new mongoose.Schema({
  First_Name: String,
  Last_Name: String,
  Email: String,
  Password: String,
  role: String
});

// Student Schema
const StudentSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: true,
    unique: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  level: {
    type: Number,
    required: true,
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

const User = mongoose.model('User', UserSchema, 'users');
const Student = mongoose.model('student', StudentSchema, 'student');

async function createStudentProfiles() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-schedule';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all users with Student role who don't have a student profile
    const studentUsers = await User.find({ role: 'Student' });
    console.log(`📊 Found ${studentUsers.length} student users`);

    for (const user of studentUsers) {
      // Check if student profile already exists
      const existingStudent = await Student.findOne({ user_id: user._id.toString() });

      if (existingStudent) {
        console.log(`⏭️  Student profile already exists for ${user.Email}`);
        continue;
      }

      // Create new student profile
      const studentId = `STU${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const newStudent = new Student({
        student_id: studentId,
        user_id: user._id.toString(),
        level: 4, // Default level 4 (adjust as needed)
        irregulars: false,
        prevent_falling_behind_courses: [],
        remaining_courses_from_past_levels: [],
        courses_taken: [],
        user_elective_choice: []
      });

      await newStudent.save();
      console.log(`✅ Created student profile for ${user.Email} (ID: ${studentId}, Level: 4)`);
    }

    console.log('\n✨ Done! All student profiles created.');
    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createStudentProfiles();
