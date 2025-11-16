// backend/src/routes/faculty-elective.routes.ts - UPDATED TO SHOW ALL ELECTIVES
import { Router, Request, Response } from 'express';
import { getDB } from '../db/connection.js';
import { ObjectId } from 'mongodb';

const router = Router();

/**
 * GET /api/faculty/elective-selection-summary
 * Get summary of all levels for faculty elective selection
 */
router.get('/elective-selection-summary', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    
    // Find the most recent elective form deadline
    const deadline = await db.collection('Deadlines')
      .find({ type: 'elective_form' })
      .sort({ end_date: -1 })
      .limit(1)
      .toArray();
    
    let formPeriod: any = null;
    let isFormEnded = false;
    
    if (deadline.length > 0) {
      formPeriod = deadline[0];
      isFormEnded = new Date(formPeriod.end_date) < new Date();
    }
    
    // Get submission stats for each level
    const levels = [3, 4, 5, 6, 7, 8];
    const levelStats = [];
    
    for (const level of levels) {
      const totalStudents = await db.collection('student')
        .countDocuments({ level: level });
      
      let submissions = 0;
      if (formPeriod) {
        submissions = await db.collection('elective_submissions')
          .countDocuments({
            student_level: level,
            semester: formPeriod.semester,
            academic_year: formPeriod.academic_year,
            submission_status: 'submitted'
          });
      }
      
      // Check if faculty has already selected electives for this level
      const levelDoc = await db.collection('Level').findOne({ level_num: level });
      const hasSelection = levelDoc && levelDoc.elective_courses && levelDoc.elective_courses.length > 0;
      
      levelStats.push({
        level: level,
        total_students: totalStudents,
        submissions: submissions,
        submission_rate: totalStudents > 0 ? Math.round((submissions / totalStudents) * 100) : 0,
        elective_selected: hasSelection
      });
    }
    
    res.json({
      form_ended: formPeriod ? formPeriod.end_date : null,
      is_form_ended: isFormEnded,
      semester: formPeriod ? formPeriod.semester : null,
      academic_year: formPeriod ? formPeriod.academic_year : null,
      deadline_description: formPeriod ? formPeriod.description : null,
      levels: levelStats
    });
    
  } catch (error) {
    console.error('Error getting elective selection summary:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

/**
 * GET /api/faculty/elective-stats/:level
 * Get detailed stats for a specific level including current selection
 * UPDATED: Shows ALL elective courses with 0% for those not selected
 */
router.get('/elective-stats/:level', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const level = parseInt(req.params.level);
    
    // Find the most recent elective form deadline
    const deadline = await db.collection('Deadlines')
      .find({ type: 'elective_form' })
      .sort({ end_date: -1 })
      .limit(1)
      .toArray();
    
    let submissions: any[] = [];
    let formPeriod: any = null;
    
    if (deadline.length > 0) {
      formPeriod = deadline[0];
      
      // Get submissions for this level
      submissions = await db.collection('elective_submissions')
        .find({
          student_level: level,
          semester: formPeriod.semester,
          academic_year: formPeriod.academic_year,
          submission_status: 'submitted'
        })
        .toArray();
    }

    // Count course selections from student submissions
    const courseCounts: { [key: string]: number } = {};
    submissions.forEach(submission => {
      submission.selected_courses.forEach((courseCode: string) => {
        courseCounts[courseCode] = (courseCounts[courseCode] || 0) + 1;
      });
    });

    // Get ALL elective courses (not just the ones students selected)
    const allCourses = await db.collection('Course')
      .find({ is_elective: true })
      .toArray();

    // Build course details map
    const courseDetails: { [key: string]: any } = {};
    allCourses.forEach(course => {
      courseDetails[course.code] = course;
    });

    // Build sorted course list with ALL electives (even those with 0 selections)
    const sortedCourses = allCourses
      .map(course => ({
        course_code: course.code,
        count: courseCounts[course.code] || 0,
        course_name: course.name || 'Unknown Course',
        credit_hours: course.credit_hours || 0,
        department: course.department || 'Unknown',
        percentage: submissions.length > 0 ? 
          Math.round(((courseCounts[course.code] || 0) / submissions.length) * 100) : 0
      }))
      .sort((a, b) => {
        // Sort by selection count (descending), then by course code
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.course_code.localeCompare(b.course_code);
      });

    // Get current selection from Level collection
    const levelDoc = await db.collection('Level').findOne({ level_num: level });
    const currentSelection = levelDoc?.elective_courses || [];

    // Get total students
    const totalStudents = await db.collection('student')
      .countDocuments({ level: level });

    res.json({
      level: level,
      semester: formPeriod ? formPeriod.semester : null,
      academic_year: formPeriod ? formPeriod.academic_year : null,
      total_students: totalStudents,
      total_submissions: submissions.length,
      submission_rate: totalStudents > 0 ? 
        Math.round((submissions.length / totalStudents) * 100) : 0,
      course_selections: sortedCourses,
      current_selection: currentSelection,
      generated_at: new Date()
    });
    
  } catch (error) {
    console.error('Error getting elective statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * POST /api/faculty/save-elective-selection
 * Save faculty's elective course selection for a level
 */
router.post('/save-elective-selection', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { level, elective_courses, selection_mode, selected_by } = req.body;
    
    if (!level || !elective_courses || !Array.isArray(elective_courses)) {
      return res.status(400).json({ 
        error: 'Invalid request. Level and elective_courses array required.' 
      });
    }
    
    if (elective_courses.length === 0) {
      return res.status(400).json({ 
        error: 'At least one elective course must be selected' 
      });
    }
    
    // Verify all courses exist and are electives
    const courses = await db.collection('Course')
      .find({ 
        code: { $in: elective_courses },
        is_elective: true 
      })
      .toArray();
    
    if (courses.length !== elective_courses.length) {
      return res.status(400).json({ 
        error: 'One or more selected courses are invalid or not elective courses' 
      });
    }
    
    // Get course ObjectIds
    const courseIds = courses.map(c => c._id);
    
    // Update Level document with elective courses
    const result = await db.collection('Level').findOneAndUpdate(
      { level_num: level },
      {
        $set: {
          elective_courses: elective_courses,
          elective_course_ids: courseIds,
          elective_selection_mode: selection_mode || 'manual',
          elective_selected_by: selected_by || 'faculty',
          elective_selected_at: new Date(),
          updated_at: new Date()
        }
      },
      { 
        returnDocument: 'after',
        upsert: false 
      }
    );
    
    if (!result) {
      return res.status(404).json({ 
        error: `Level ${level} not found in database` 
      });
    }
    
    // Log the selection
    await db.collection('elective_selection_history').insertOne({
      level: level,
      elective_courses: elective_courses,
      selection_mode: selection_mode || 'manual',
      selected_by: selected_by || 'faculty',
      selected_at: new Date(),
      course_count: elective_courses.length
    });
    
    res.json({
      message: 'Elective selection saved successfully',
      level: level,
      elective_courses: elective_courses,
      course_count: elective_courses.length
    });
    
  } catch (error) {
    console.error('Error saving elective selection:', error);
    res.status(500).json({ error: 'Failed to save elective selection' });
  }
});

/**
 * GET /api/faculty/elective-selection/:level
 * Get current elective selection for a level
 */
router.get('/elective-selection/:level', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const level = parseInt(req.params.level);
    
    const levelDoc = await db.collection('Level').findOne({ level_num: level });
    
    if (!levelDoc) {
      return res.status(404).json({ error: 'Level not found' });
    }
    
    const electiveCourses = levelDoc.elective_courses || [];
    const selectionMode = levelDoc.elective_selection_mode || null;
    const selectedBy = levelDoc.elective_selected_by || null;
    const selectedAt = levelDoc.elective_selected_at || null;
    
    // Get course details
    let courseDetails = [];
    if (electiveCourses.length > 0) {
      courseDetails = await db.collection('Course')
        .find({ code: { $in: electiveCourses } })
        .toArray();
    }
    
    res.json({
      level: level,
      has_selection: electiveCourses.length > 0,
      elective_courses: electiveCourses,
      course_details: courseDetails,
      selection_mode: selectionMode,
      selected_by: selectedBy,
      selected_at: selectedAt
    });
    
  } catch (error) {
    console.error('Error getting elective selection:', error);
    res.status(500).json({ error: 'Failed to get elective selection' });
  }
});

/**
 * DELETE /api/faculty/elective-selection/:level
 * Remove elective selection for a level (reset)
 */
router.delete('/elective-selection/:level', async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const level = parseInt(req.params.level);
    
    const result = await db.collection('Level').updateOne(
      { level_num: level },
      {
        $unset: {
          elective_courses: "",
          elective_course_ids: "",
          elective_selection_mode: "",
          elective_selected_by: "",
          elective_selected_at: ""
        },
        $set: {
          updated_at: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Level not found' });
    }
    
    res.json({
      message: 'Elective selection removed successfully',
      level: level
    });
    
  } catch (error) {
    console.error('Error removing elective selection:', error);
    res.status(500).json({ error: 'Failed to remove elective selection' });
  }
});

export default router;