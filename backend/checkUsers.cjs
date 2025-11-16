// Script to check existing users
const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
  First_Name: String,
  Last_Name: String,
  Email: String,
  Password: String,
  role: String
});

const User = mongoose.model('User', UserSchema, 'users');

async function checkUsers() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-schedule';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const allUsers = await User.find({});
    console.log(`📊 Total users: ${allUsers.length}\n`);

    allUsers.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Name: ${user.First_Name} ${user.Last_Name}`);
      console.log(`  Email: ${user.Email}`);
      console.log(`  Role: ${user.role}`);
      console.log('---');
    });

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkUsers();
