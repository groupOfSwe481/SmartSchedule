// fix-deadline.js - Check and fix your deadline
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function fixDeadline() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('âœ… Connected to MongoDB\n');
    
    const db = client.db('SamrtSchedular');
    
    // Check ALL deadlines
    console.log('ðŸ“… ALL DEADLINES IN DATABASE:');
    console.log('='.repeat(50));
    const allDeadlines = await db.collection('Deadlines').find({}).toArray();
    
    if (allDeadlines.length === 0) {
      console.log('âŒ No deadlines found at all!');
      console.log('\nðŸ’¡ Creating a new elective_form deadline...');
      
      // Create the deadline from document 10 you showed me
      const newDeadline = {
        type: "elective_form",
        semester: 1,
        academic_year: "2025",
        start_date: new Date("2025-10-08T08:00:00.000Z"),
        end_date: new Date("2025-10-12T23:59:59.000Z"),
        is_active: true,
        description: "Fall Semester 2025 Elective Course Selection",
        created_at: new Date()
      };
      
      await db.collection('Deadlines').insertOne(newDeadline);
      console.log('âœ… Created elective_form deadline!');
      
    } else {
      console.log(`Found ${allDeadlines.length} deadline(s):\n`);
      
      allDeadlines.forEach((d, i) => {
        console.log(`Deadline ${i + 1}:`);
        console.log(`  _id: ${d._id}`);
        console.log(`  type: "${d.type}"`);
        console.log(`  semester: ${d.semester}`);
        console.log(`  academic_year: ${d.academic_year}`);
        console.log(`  start_date: ${d.start_date}`);
        console.log(`  end_date: ${d.end_date}`);
        console.log(`  description: ${d.description}`);
        console.log('');
      });
      
      // Check if any match 'elective_form'
      const electiveDeadline = allDeadlines.find(d => d.type === 'elective_form');
      
      if (!electiveDeadline) {
        console.log('âš ï¸ Found deadlines but NONE have type="elective_form"');
        console.log('\nðŸ’¡ OPTIONS:');
        console.log('1. If one of these IS your elective deadline, I can update its type');
        console.log('2. Or I can create a new elective_form deadline\n');
        
        // If there's exactly one deadline, assume it's the elective one
        if (allDeadlines.length === 1) {
          const deadline = allDeadlines[0];
          console.log(`ðŸ”§ Found 1 deadline. Updating its type to "elective_form"...`);
          
          await db.collection('Deadlines').updateOne(
            { _id: deadline._id },
            { $set: { type: 'elective_form' } }
          );
          
          console.log('âœ… Updated deadline type to "elective_form"!');
        } else {
          console.log('âŒ Multiple deadlines found. Please manually specify which one is for electives.');
          console.log('   Or delete all and let me create a new one.');
        }
      } else {
        console.log('âœ… Found elective_form deadline!');
        console.log(`   Semester: ${electiveDeadline.semester}`);
        console.log(`   Year: ${electiveDeadline.academic_year}`);
        console.log(`   Ended: ${new Date(electiveDeadline.end_date) < new Date() ? 'Yes âœ“' : 'No (still active)'}`);
      }
    }
    
    // Now update Level 4 to ensure it has elective fields
    console.log('\nðŸ“Š Ensuring Level 4 has elective fields...');
    await db.collection('Level').updateOne(
      { level_num: 4 },
      {
        $setOnInsert: {
          level_num: 4,
          has: [],
          student_count: 0
        },
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
    
    console.log('âœ… Level 4 document ready!');
    
    console.log('\n' + '='.repeat(50));
    console.log('âœ… SETUP COMPLETE!');
    console.log('='.repeat(50));
    console.log('Next steps:');
    console.log('1. Start your backend: cd backend && npm run dev');
    console.log('2. Open: http://localhost:4000/faculty-electives.html');
    console.log('3. You should see Level 4 with 2 submissions!');
    
  } catch (error) {
    console.error('âŒ Error:', error);
  } finally {
    await client.close();
    console.log('\nðŸ”’ Connection closed');
  }
}

fixDeadline();