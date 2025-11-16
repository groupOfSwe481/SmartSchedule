// Script to check User collection (capital U)
const mongoose = require('mongoose');
require('dotenv').config();

async function checkUserCollection() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-schedule';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Check User collection (capital U)
    console.log('👥 USER COLLECTION (capital U):');
    const usersCount = await db.collection('User').countDocuments();
    console.log(`   Total documents: ${usersCount}\n`);

    if (usersCount > 0) {
      const users = await db.collection('User').find({}).toArray();
      users.forEach((user, i) => {
        console.log(`   User ${i + 1}:`);
        console.log(`     _id: ${user._id}`);
        console.log(`     Name: ${user.First_Name} ${user.Last_Name}`);
        console.log(`     Email: ${user.Email}`);
        console.log(`     Role: ${user.role}`);
        console.log('');
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

checkUserCollection();
