// quick-add-test-data.js - ES Module version
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function addTestData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('âœ… Connected to MongoDB');
    
    const db = client.db('SamrtSchedular');
    
    // 1. Add sample elective courses for Level 4 (matching your existing submissions)
    console.log('\nðŸ“š Adding elective courses...');
    
    const electives = [
      {
        name: 'Microbiology',
        code: 'MBI140',
        credit_hours: 3,
        Duration: 3,
        is_elective: true,
        department: 'Biology',
        college: 'Science',
        level: 4,
        prerequisites: [],
        exam_date: null,
        exam_time: null,
        pattern: null,
        section: [],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Physics II',
        code: 'PHYS201',
        credit_hours: 3,
        Duration: 3,
        is_elective: true,
        department: 'Physics',
        college: 'Science',
        level: 4,
        prerequisites: [],
        exam_date: null,
        exam_time: null,
        pattern: null,
        section: [],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Islamic Culture 106',
        code: 'IC106',
        credit_hours: 2,
        Duration: 2,
        is_elective: true,
        department: 'Islamic Studies',
        college: 'Arts',
        level: 4,
        prerequisites: [],
        exam_date: null,
        exam_time: null,
        pattern: null,
        section: [],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Islamic Culture 102',
        code: 'IC102',
        credit_hours: 2,
        Duration: 2,
        is_elective: true,
        department: 'Islamic Studies',
        college: 'Arts',
        level: 4,
        prerequisites: [],
        exam_date: null,
        exam_time: null,
        pattern: null,
        section: [],
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    for (const course of electives) {
      await db.collection('Course').updateOne(
        { code: course.code },
        { $setOnInsert: course },
        { upsert: true }
      );
    }
    
    console.log(`âœ… Added ${electives.length} elective courses for Level 4`);
    
    // 2. Update Level 4 document
    console.log('\nðŸ“Š Updating Level 4 document...');
    
    await db.collection('Level').updateOne(
      { level_num: 4 },
      {
        $set: {
          elective_courses: [],
          elective_course_ids: [],
          elective_selection_mode: null,
          elective_selected_by: null,
          elective_selected_at: null,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log('âœ… Updated Level 4 document');
    
    // 3. Show summary
    console.log('\nðŸ“Š Summary:');
    
    const submissions = await db.collection('elective_submissions')
      .find({ student_level: 4 })
      .toArray();
    
    const counts = {};
    submissions.forEach(sub => {
      sub.selected_courses.forEach(code => {
        counts[code] = (counts[code] || 0) + 1;
      });
    });
    
    console.log('Course selections for Level 4:');
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
      console.log(`  ${code}: ${count} students (${Math.round(count/submissions.length * 100)}%)`);
    });
    
    console.log('\nâœ… Setup completed successfully!');
    console.log('You can now access: http://localhost:4000/faculty-electives.html');
    
  } catch (error) {
    console.error('âŒ Error:', error);
  } finally {
    await client.close();
    console.log('\nðŸ”’ Connection closed');
  }
}

addTestData();