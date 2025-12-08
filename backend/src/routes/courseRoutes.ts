// UPDATE your existing backend/src/routes/courseRoutes.ts file
// Add this route to the existing router

import express from 'express';
import {
  getAllCourses,
  getCoursesByDepartment,
  getCourseDetails,
  createCourse,
  updateCourse,
  deleteCourse
} from '../api/controllers/courseController.js';
import { getDB } from '../db/connection.js';

const router = express.Router();

router.get('/all-courses', getAllCourses);
router.get('/courses-by-department', getCoursesByDepartment);
router.get('/course-details/:courseCode', getCourseDetails);
router.post('/create-course', createCourse);
router.put('/update-course/:courseCode', updateCourse);
router.delete('/delete-course/:courseCode', deleteCourse);

/**
 * GET /api/courses/electives
 * Get all elective courses, optionally filtered by level
 */
router.get('/courses/electives', async (req, res) => {
  try {
    const db = getDB();
    const level = req.query.level ? parseInt(req.query.level as string) : undefined;
    
    const query: any = { is_elective: true };
    
    if (level) {
      query.level = level;
    }
    
    const courses = await db.collection('Course')
      .find(query)
      .sort({ code: 1 })
      .toArray();
    
    res.json(courses);
    
  } catch (error) {
    console.error('Error fetching elective courses:', error);
    res.status(500).json({ error: 'Failed to fetch elective courses' });
  }
});

export default router;
