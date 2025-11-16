// backend/src/routes/student-elective.routes.ts
// Student elective form routes
import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';

const router = Router();

/**
 * GET /api/elective-courses
 * Get available elective courses and check if form is active
 */
router.get('/elective-courses', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    console.log('📚 Fetching elective courses...');

    // Check if elective form is currently active in Deadlines collection
    const deadline = await db.collection('Deadlines')
      .find({
        type: 'elective_form',
        is_active: true  // Check if form is active
      })
      .sort({ end_date: -1 })
      .limit(1)
      .toArray();

    if (deadline.length === 0) {
      console.log('⚠️ No active elective deadline found');
      return res.status(400).json({
        error: 'Elective form is not currently available',
        form_active: false
      });
    }

    const formDeadline = deadline[0];
    const now = new Date();
    const endDate = new Date(formDeadline.end_date);
    const startDate = new Date(formDeadline.start_date || now);

    console.log('📅 Deadline check:', {
      now: now.toISOString(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      is_active: formDeadline.is_active
    });

    // Check if current date is within the form period
    if (now < startDate || now > endDate) {
      console.log('⚠️ Current date is outside the form period');
      return res.status(400).json({
        error: 'Elective form is not currently active',
        form_active: false,
        start_date: startDate,
        end_date: endDate
      });
    }

    // Get all elective courses from Course collection
    // Elective courses have is_elective: true
    const courses = await db.collection('Course')
      .find({
        is_elective: true  // Check for is_elective field
      })
      .toArray();

    console.log(`✅ Found ${courses.length} elective courses`);

    res.json({
      form_active: true,
      deadline: endDate,
      semester: formDeadline.semester,
      academic_year: formDeadline.academic_year,
      courses: courses.map(course => ({
        code: course.code,
        name: course.name,
        credit_hours: course.credit_hours,
        department: course.department,
        college: course.college,
        description: course.description || ''
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching elective courses:', error);
    res.status(500).json({ error: 'Failed to fetch elective courses' });
  }
});

/**
 * GET /api/student-electives/:student_id
 * Get student's elective submission status
 */
router.get('/student-electives/:student_id', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const studentId = req.params.student_id;

    console.log(`🔍 Checking elective submission for student: ${studentId}`);

    // Get current deadline
    const deadline = await db.collection('Deadlines')
      .find({
        type: 'elective_form',
        is_active: true
      })
      .sort({ end_date: -1 })
      .limit(1)
      .toArray();

    if (deadline.length === 0) {
      return res.json({
        form_active: false,
        message: 'No active elective form period',
        submission: null
      });
    }

    const formDeadline = deadline[0];
    const now = new Date();
    const endDate = new Date(formDeadline.end_date);
    const startDate = new Date(formDeadline.start_date || now);
    const isActive = formDeadline.is_active && now >= startDate && now <= endDate;

    // Check if student has a submission for this period
    const submission = await db.collection('elective_submissions').findOne({
      student_id: studentId,
      semester: formDeadline.semester,
      academic_year: formDeadline.academic_year
    });

    res.json({
      form_active: isActive,
      deadline: endDate,
      submission: submission
    });

  } catch (error) {
    console.error('❌ Error checking student electives:', error);
    res.status(500).json({ error: 'Failed to check elective submission' });
  }
});

/**
 * POST /api/start-electives/:student_id
 * Start a new elective submission (create draft)
 */
router.post('/start-electives/:student_id', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const studentId = req.params.student_id;

    console.log(`🆕 Starting elective submission for student: ${studentId}`);

    // Get current deadline
    const deadline = await db.collection('Deadlines')
      .find({
        type: 'elective_form',
        is_active: true
      })
      .sort({ end_date: -1 })
      .limit(1)
      .toArray();

    if (deadline.length === 0) {
      return res.status(400).json({ error: 'No active elective form period' });
    }

    const formDeadline = deadline[0];

    // Get student info
    const student = await db.collection('student').findOne({ student_id: studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if submission already exists
    const existing = await db.collection('elective_submissions').findOne({
      student_id: studentId,
      semester: formDeadline.semester,
      academic_year: formDeadline.academic_year
    });

    if (existing) {
      return res.json({
        message: 'Submission already exists',
        submission_id: existing._id
      });
    }

    // Create new draft submission
    const newSubmission = {
      student_id: studentId,
      student_level: student.level,
      semester: formDeadline.semester,
      academic_year: formDeadline.academic_year,
      selected_courses: [],
      suggestions: '',
      submission_status: 'draft',
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.collection('elective_submissions').insertOne(newSubmission);

    console.log(`✅ Created draft submission: ${result.insertedId}`);

    res.json({
      message: 'Elective submission started',
      submission_id: result.insertedId
    });

  } catch (error) {
    console.error('❌ Error starting elective submission:', error);
    res.status(500).json({ error: 'Failed to start elective submission' });
  }
});

/**
 * PUT /api/save-electives/:student_id
 * Save/update student's elective choices (autosave)
 */
router.put('/save-electives/:student_id', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const studentId = req.params.student_id;
    const { selected_courses, suggestions } = req.body;

    console.log(`💾 Saving electives for student: ${studentId}`);

    // Get current deadline
    const deadline = await db.collection('Deadlines')
      .find({
        type: 'elective_form',
        is_active: true
      })
      .sort({ end_date: -1 })
      .limit(1)
      .toArray();

    if (deadline.length === 0) {
      return res.status(400).json({ error: 'No active elective form period' });
    }

    const formDeadline = deadline[0];

    // Update or create submission
    const result = await db.collection('elective_submissions').findOneAndUpdate(
      {
        student_id: studentId,
        semester: formDeadline.semester,
        academic_year: formDeadline.academic_year
      },
      {
        $set: {
          selected_courses: selected_courses || [],
          suggestions: suggestions || '',
          updated_at: new Date()
        }
      },
      {
        returnDocument: 'after',
        upsert: false
      }
    );

    if (!result) {
      return res.status(404).json({ error: 'Submission not found. Please start the form first.' });
    }

    console.log('✅ Electives saved successfully');

    res.json({
      message: 'Electives saved successfully',
      selected_courses: result.selected_courses,
      suggestions: result.suggestions
    });

  } catch (error) {
    console.error('❌ Error saving electives:', error);
    res.status(500).json({ error: 'Failed to save electives' });
  }
});

/**
 * POST /api/submit-electives/:student_id
 * Submit final elective choices
 */
router.post('/submit-electives/:student_id', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const studentId = req.params.student_id;

    console.log(`📤 Submitting electives for student: ${studentId}`);

    // Get current deadline
    const deadline = await db.collection('Deadlines')
      .find({
        type: 'elective_form',
        is_active: true
      })
      .sort({ end_date: -1 })
      .limit(1)
      .toArray();

    if (deadline.length === 0) {
      return res.status(400).json({ error: 'No active elective form period' });
    }

    const formDeadline = deadline[0];
    const now = new Date();
    const endDate = new Date(formDeadline.end_date);

    // Check if deadline has passed
    if (now > endDate) {
      return res.status(400).json({ error: 'Elective form deadline has passed' });
    }

    // Update submission status to 'submitted'
    const result = await db.collection('elective_submissions').findOneAndUpdate(
      {
        student_id: studentId,
        semester: formDeadline.semester,
        academic_year: formDeadline.academic_year
      },
      {
        $set: {
          submission_status: 'submitted',
          submitted_at: new Date(),
          updated_at: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    if (!result) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log('✅ Electives submitted successfully');

    res.json({
      message: 'Electives submitted successfully',
      submission: result
    });

  } catch (error) {
    console.error('❌ Error submitting electives:', error);
    res.status(500).json({ error: 'Failed to submit electives' });
  }
});

export default router;
