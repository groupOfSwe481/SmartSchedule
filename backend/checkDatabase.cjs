// Script to check all collections and data
const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-schedule';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📦 Collections in database:`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    console.log('');

    // Check users collection
    console.log('👥 USERS COLLECTION:');
    const usersCount = await db.collection('users').countDocuments();
    console.log(`   Total documents: ${usersCount}`);

    if (usersCount > 0) {
      const users = await db.collection('users').find({}).toArray();
      users.forEach((user, i) => {
        console.log(`\n   User ${i + 1}:`);
        console.log(`     _id: ${user._id}`);
        console.log(`     Name: ${user.First_Name} ${user.Last_Name}`);
        console.log(`     Email: ${user.Email}`);
        console.log(`     Role: ${user.role}`);
      });
    }
    console.log('');

    // Check student collection
    console.log('🎓 STUDENT COLLECTION:');
    const studentsCount = await db.collection('student').countDocuments();
    console.log(`   Total documents: ${studentsCount}`);

    if (studentsCount > 0) {
      const students = await db.collection('student').find({}).toArray();
      students.forEach((student, i) => {
        console.log(`\n   Student ${i + 1}:`);
        console.log(`     student_id: ${student.student_id}`);
        console.log(`     user_id: ${student.user_id}`);
        console.log(`     level: ${student.level}`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkDatabase();
