// check-data.js - Run this to debug your database (ES Module version)
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function checkData() {
  const client = new MongoClient(MONGO_URI);
  //h
  try {
    await client.connect();
    console.log('âœ… Connected to MongoDB\n');
    
    const db = client.db('SamrtSchedular');
    
    // 1. Check deadline
    console.log('ðŸ“… CHECKING DEADLINES:');
    console.log('=' .repeat(50));
    const deadlines = await db.collection('Deadlines')
      .find({ type: 'elective_form' })
      .toArray();
    
    if (deadlines.length === 0) {
      console.log('âŒ No elective_form deadline found!');
    } else {
      deadlines.forEach(d => {
        console.log('Found deadline:');
        console.log(`  - Semester: ${d.semester}`);
        console.log(`  - Academic Year: ${d.academic_year}`);
        console.log(`  - Start: ${d.start_date}`);
        console.log(`  - End: ${d.end_date}`);
        console.log(`  - Ended: ${new Date(d.end_date) < new Date() ? 'Yes' : 'No'}`);
      });
    }
    
    // 2. Check submissions
    console.log('\nðŸ“ CHECKING SUBMISSIONS:');
    console.log('=' .repeat(50));
    const submissions = await db.collection('elective_submissions')
      .find({})
      .toArray();
    
    console.log(`Total submissions: ${submissions.length}\n`);
    
    if (submissions.length > 0) {
      // Group by level
      const byLevel = {};
      submissions.forEach(sub => {
        const level = sub.student_level;
        if (!byLevel[level]) byLevel[level] = [];
        byLevel[level].push(sub);
      });
      
      Object.entries(byLevel).forEach(([level, subs]) => {
        console.log(`Level ${level}: ${subs.length} submissions`);
        subs.forEach(sub => {
          console.log(`  - Student: ${sub.student_id}`);
          console.log(`    Semester: ${sub.semester}, Year: ${sub.academic_year}`);
          console.log(`    Courses: ${sub.selected_courses.join(', ')}`);
          console.log(`    Status: ${sub.submission_status}`);
        });
        console.log('');
      });
      
      // Check if submissions match deadline
      if (deadlines.length > 0) {
        const deadline = deadlines[0];
        const matching = submissions.filter(sub => 
          sub.semester === deadline.semester &&
          sub.academic_year === deadline.academic_year &&
          sub.submission_status === 'submitted'
        );
        
        console.log(`Submissions matching deadline: ${matching.length}`);
        if (matching.length !== submissions.length) {
          console.log('âš ï¸ WARNING: Some submissions do NOT match deadline criteria!');
        }
      }
    } else {
      console.log('âŒ No submissions found!');
    }
    
    // 3. Check students
    console.log('\nðŸ‘¥ CHECKING STUDENTS:');
    console.log('=' .repeat(50));
    for (let level = 3; level <= 8; level++) {
      const count = await db.collection('student').countDocuments({ level });
      console.log(`Level ${level}: ${count} students`);
    }
    
    // 4. Check courses
    console.log('\nðŸ“š CHECKING COURSES:');
    console.log('=' .repeat(50));
    
    // Get unique course codes from submissions
    const allCourses = new Set();
    submissions.forEach(sub => {
      sub.selected_courses.forEach(code => allCourses.add(code));
    });
    
    console.log(`Unique courses in submissions: ${allCourses.size}`);
    if (allCourses.size > 0) {
      console.log('Courses:', Array.from(allCourses).join(', '));
      
      // Check if these courses exist in Course collection
      const coursesInDb = await db.collection('Course')
        .find({ code: { $in: Array.from(allCourses) } })
        .toArray();
      
      console.log(`\nCourses found in database: ${coursesInDb.length}`);
      coursesInDb.forEach(course => {
        console.log(`  - ${course.code}: ${course.name} (${course.is_elective ? 'Elective' : 'Required'})`);
      });
      
      // Check missing courses
      const foundCodes = coursesInDb.map(c => c.code);
      const missing = Array.from(allCourses).filter(code => !foundCodes.includes(code));
      if (missing.length > 0) {
        console.log(`\nâš ï¸ Courses NOT in database: ${missing.join(', ')}`);
      }
    }
    
    // 5. Check Level documents
    console.log('\nðŸ“Š CHECKING LEVEL DOCUMENTS:');
    console.log('=' .repeat(50));
    for (let level = 3; level <= 8; level++) {
      const levelDoc = await db.collection('Level').findOne({ level_num: level });
      if (levelDoc) {
        const hasElectives = levelDoc.elective_courses && levelDoc.elective_courses.length > 0;
        console.log(`Level ${level}: ${hasElectives ? 'âœ… Has electives (' + levelDoc.elective_courses.join(', ') + ')' : 'âŒ No electives selected'}`);
      } else {
        console.log(`Level ${level}: âš ï¸ Document not found`);
      }
    }
    
    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY:');
    console.log('='.repeat(50));
    console.log(`âœ“ Deadlines: ${deadlines.length}`);
    console.log(`âœ“ Submissions: ${submissions.length}`);
    console.log(`âœ“ Unique course selections: ${allCourses.size}`);
    
    if (deadlines.length > 0 && submissions.length > 0) {
      console.log('\nâœ… System should work! Check backend console for API logs.');
    } else {
      console.log('\nâš ï¸ Missing data - system may not display correctly.');
    }
    
  } catch (error) {
    console.error('âŒ Error:', error);
  } finally {
    await client.close();
    console.log('\nðŸ”’ Connection closed');
  }
}

checkData();