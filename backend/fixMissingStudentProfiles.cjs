// Script to create student profiles for all Student users who don't have one
const mongoose = require('mongoose');
require('dotenv').config();

async function fixMissingStudentProfiles() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-schedule';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get all users with Student role
    const studentUsers = await db.collection('User').find({ role: 'Student' }).toArray();
    console.log(`📊 Found ${studentUsers.length} Student users\n`);

    let created = 0;
    let skipped = 0;

    for (const user of studentUsers) {
      const userId = user._id.toString();

      // Check if student profile already exists
      const existingStudent = await db.collection('student').findOne({ user_id: userId });

      if (existingStudent) {
        console.log(`⏭️  Student profile already exists for ${user.First_Name} ${user.Last_Name} (${user.Email})`);
        skipped++;
        continue;
      }

      // Extract student ID from email if it's a student email
      let studentId;
      if (user.Email && user.Email.includes('@student.ksu.edu.sa')) {
        studentId = user.Email.split('@')[0]; // e.g., "444200551"
      } else {
        // Generate a unique student ID if not a student email
        studentId = `STU${Date.now()}${Math.floor(Math.random() * 1000)}`;
      }

      // Create new student profile
      const newStudent = {
        student_id: studentId,
        user_id: userId,
        level: 4, // Default level 4
        irregulars: false,
        prevent_falling_behind_courses: [],
        remaining_courses_from_past_levels: [],
        courses_taken: [],
        user_elective_choice: []
      };

      await db.collection('student').insertOne(newStudent);
      console.log(`✅ Created student profile for ${user.First_Name} ${user.Last_Name} (${user.Email})`);
      console.log(`   student_id: ${studentId}, level: 4\n`);
      created++;
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Created: ${created} student profiles`);
    console.log(`   ⏭️  Skipped: ${skipped} (already exist)`);
    console.log(`   📊 Total: ${studentUsers.length} student users`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixMissingStudentProfiles();
