// backend/src/routes/student-profile.routes.ts
// For individual student data (used by elective form)
import { Router, Request, Response } from 'express';
import { Student } from '../db/models/Student.js';

const router = Router();

/**
 * GET /api/student-profile/:id
 * Get individual student data by student_id OR user_id
 * This is used by the elective form to load student info
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    // Try to find student by EITHER student_id OR user_id
    // This makes it work with User.userID from auth system
    const student = await Student.findOne({
      $or: [
        { student_id: id },
        { user_id: id },
        { user_id: String(id) }
      ]
    }).lean();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      student_id: student.student_id,
      user_id: student.user_id,
      level: student.level,
      irregulars: student.irregulars || false,
      prevent_falling_behind_courses: student.prevent_falling_behind_courses || [],
      remaining_courses_from_past_levels: student.remaining_courses_from_past_levels || [],
      courses_taken: student.courses_taken || [],
      user_elective_choice: student.user_elective_choice || []
    });
  } catch (error) {
    console.error('Error fetching student data:', error);
    res.status(500).json({ error: 'Failed to fetch student data' });
  }
});

/**
 * PUT /api/student-profile/:id/electives
 * Update student's elective choices
 */
router.put('/:id/electives', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { user_elective_choice } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const student = await Student.findOneAndUpdate(
      {
        $or: [
          { student_id: id },
          { user_id: id }
        ]
      },
      {
        $set: { user_elective_choice }
      },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      message: 'Elective choices updated',
      user_elective_choice: student.user_elective_choice
    });
  } catch (error) {
    console.error('Error updating electives:', error);
    res.status(500).json({ error: 'Failed to update electives' });
  }
});

export default router;
