// backend/src/db/migrations/update-level-schema.ts
// Run this script ONCE to add elective fields to existing Level documents

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'your_mongo_uri_here';

async function updateLevelSchema() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('âœ… Connected to MongoDB');
    
    const db = client.db('SamrtSchedular'); // Your database name
    const levelCollection = db.collection('Level');
    
    // Add elective fields to all Level documents that don't have them
    const result = await levelCollection.updateMany(
      { 
        elective_courses: { $exists: false } 
      },
      {
        $set: {
          elective_courses: [],
          elective_course_ids: [],
          elective_selection_mode: null,
          elective_selected_by: null,
          elective_selected_at: null
        }
      }
    );
    
    console.log(`âœ… Updated ${result.modifiedCount} Level documents with elective fields`);
    
    // Show updated documents
    const levels = await levelCollection.find({}).toArray();
    console.log('\nðŸ“Š Level documents after update:');
    levels.forEach(level => {
      console.log(`\nLevel ${level.level_num}:`);
      console.log(`  - elective_courses: ${level.elective_courses || 'Not set'}`);
      console.log(`  - Number of students: ${level.numberOfStudents || level.student_count || 0}`);
    });
    
    console.log('\nâœ… Migration completed successfully!');
    
  } catch (error) {
    console.error('âŒ Migration failed:', error);
  } finally {
    await client.close();
    console.log('\nðŸ”’ Connection closed');
  }
}

// Run the migration
updateLevelSchema();

/*
HOW TO USE THIS SCRIPT:
1. Save this file as: backend/src/db/migrations/update-level-schema.ts
2. Make sure your .env file has MONGO_URI set
3. Run from backend directory:
   npx ts-node src/db/migrations/update-level-schema.ts
4. This only needs to be run ONCE
*/