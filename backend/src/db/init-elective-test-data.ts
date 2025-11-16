// backend/src/db/scripts/init-elective-test-data.ts
// Run this ONCE to create test data for the elective system

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'your_mongo_uri_here';

async function initTestData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('âœ… Connected to MongoDB');
    
    const db = client.db('SamrtSchedular');
    
    // 1. Create a completed elective form deadline
    console.log('\nðŸ“… Creating elective form deadline...');
    
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    await db.collection('Deadlines').insertOne({
      type: 'elective_form',
      description: 'Fall 2024 Elective Course Selection',
      start_date: lastWeek,
      end_date: yesterday,
      semester: 'Fall',
      academic_year: '2024-2025',
      created_at: new Date(),
      is_active: false
    });
    
    console.log('âœ… Created elective form deadline (ended yesterday)');
    
    // 2. Add some sample elective courses if they don't exist
    console.log('\nðŸ“š Creating sample elective courses...');
    
    const sampleElectives = [
      {
        name: 'Machine Learning Fundamentals',
        code: 'CS401',
        credit_hours: 3,
        Duration: 3,
        is_elective: true,
        department: 'Computer Science',
        college: 'Engineering',
        level: 7,
        prerequisites: ['CS301'],
        exam_date: null,
        exam_time: null,
        pattern: null,
        section: [],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Data Mining and Analytics',
        code: 'CS402',
        credit_hours: 3,
        Duration: 3,
        is_elective: true,
        department: 'Computer Science',
        college: 'Engineering',
        level: 7,
        prerequisites: ['CS201'],
        exam_date: null,
        exam_time: null,
        pattern: null,
        section: [],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Computer Vision',
        code: 'CS403',
        credit_hours: 3,
        Duration: 3,
        is_elective: true,
        department: 'Computer Science',
        college: 'Engineering',
        level: 7,
        prerequisites: [],
        exam_date: null,
        exam_time: null,
        pattern: null,
        section: [],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Cloud Computing',
        code: 'CS404',
        credit_hours: 3,
        Duration: 3,
        is_elective: true,
        department: 'Computer Science',
        college: 'Engineering',
        level: 7,
        prerequisites: [],
        exam_date: null,
        exam_time: null,
        pattern: null,
        section: [],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Cybersecurity',
        code: 'CS405',
        credit_hours: 3,
        Duration: 3,
        is_elective: true,
        department: 'Computer Science',
        college: 'Engineering',
        level: 7,
        prerequisites: [],
        exam_date: null,
        exam_time: null,
        pattern: null,
        section: [],
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    for (const course of sampleElectives) {
      await db.collection('Course').updateOne(
        { code: course.code },
        { $setOnInsert: course },
        { upsert: true }
      );
    }
    
    console.log(`âœ… Created ${sampleElectives.length} sample elective courses`);
    
    // 3. Create some sample student submissions
    console.log('\nðŸ‘¨â€ðŸŽ“ Creating sample student submissions...');
    
    const submissions = [
      {
        student_id: 'student001',
        student_level: 7,
        selected_courses: ['CS401', 'CS402', 'CS403'],
        semester: 'Fall',
        academic_year: '2024-2025',
        submission_status: 'submitted',
        submitted_at: new Date()
      },
      {
        student_id: 'student002',
        student_level: 7,
        selected_courses: ['CS401', 'CS404', 'CS405'],
        semester: 'Fall',
        academic_year: '2024-2025',
        submission_status: 'submitted',
        submitted_at: new Date()
      },
      {
        student_id: 'student003',
        student_level: 7,
        selected_courses: ['CS401', 'CS402', 'CS404'],
        semester: 'Fall',
        academic_year: '2024-2025',
        submission_status: 'submitted',
        submitted_at: new Date()
      },
      {
        student_id: 'student004',
        student_level: 7,
        selected_courses: ['CS402', 'CS403', 'CS405'],
        semester: 'Fall',
        academic_year: '2024-2025',
        submission_status: 'submitted',
        submitted_at: new Date()
      },
      {
        student_id: 'student005',
        student_level: 7,
        selected_courses: ['CS401', 'CS403', 'CS404'],
        semester: 'Fall',
        academic_year: '2024-2025',
        submission_status: 'submitted',
        submitted_at: new Date()
      }
    ];
    
    await db.collection('elective_submissions').insertMany(submissions);
    console.log(`âœ… Created ${submissions.length} sample submissions`);
    
    // 4. Update Level 7 document to add elective fields
    console.log('\nðŸ“Š Updating Level 7 document...');
    
    await db.collection('Level').updateOne(
      { level_num: 7 },
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
    
    console.log('âœ… Updated Level 7 document');
    
    // 5. Show summary
    console.log('\nðŸ“Š Database Summary:');
    const electiveCourseCount = await db.collection('Course').countDocuments({ is_elective: true });
    const submissionCount = await db.collection('elective_submissions').countDocuments();
    const deadlineCount = await db.collection('Deadlines').countDocuments({ type: 'elective_form' });
    
    console.log(`  - Elective Courses: ${electiveCourseCount}`);
    console.log(`  - Student Submissions: ${submissionCount}`);
    console.log(`  - Elective Form Deadlines: ${deadlineCount}`);
    
    console.log('\nâœ… Test data initialization completed!');
    console.log('You can now access the faculty elective selection page.');
    
  } catch (error) {
    console.error('âŒ Initialization failed:', error);
  } finally {
    await client.close();
    console.log('\nðŸ”’ Connection closed');
  }
}

// Run the initialization
initTestData();

/*
HOW TO USE THIS SCRIPT:
1. Save this file as: backend/src/db/scripts/init-elective-test-data.ts
2. Make sure your .env file has MONGO_URI set
3. Run from backend directory:
   npx ts-node src/db/scripts/init-elective-test-data.ts
4. This will create:

*/