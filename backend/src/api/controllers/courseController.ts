import { Request, Response } from 'express';


import courseService from '../../business/services/courseService.js';
import { CourseCreateInput } from '../../types/index.js';


export const getAllCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const courses = await courseService.getAllCourses();
    res.json({
      courses: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getCoursesByDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { department } = req.query;
    const courses = await courseService.getCoursesByDepartment(department as string);
    res.json({
      department: department,
      courses: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching courses by department:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getCourseDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseCode } = req.params;
    
    if (!courseCode) {
      res.status(400).json({ error: 'Course code is required' });
      return;
    }

    const course = await courseService.getCourseDetails(courseCode);
    
    res.json({
      code: course.code,
      name: course.name,
      credit_hours: course.credit_hours,
      department: course.department,
      college: course.college,
      is_elective: course.is_elective,
      duration: course.Duration,
      level: course.level,
      pattern: course.pattern || null,
      prerequisites: course.prerequisites_details?.map(p => p.code) || [], // Return course codes for frontend
      hour_prerequisites: course.hour_prerequisites || [],
      prerequisites_details: course.prerequisites_details || [] // Full course objects
    });
  } catch (error) {
    const statusCode = (error as Error).message === 'Course not found' ? 404 : 500;
    res.status(statusCode).json({ error: (error as Error).message });
  }
};

export const createCourse = async (req: Request<{}, {}, CourseCreateInput>, res: Response): Promise<void> => {
  try {
    console.log('📝 Creating course:', req.body.code);
    const course = await courseService.createCourse(req.body);
    res.status(201).json({
      message: 'Course created successfully',
      course: course
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(400).json({ error: (error as Error).message });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseCode } = req.params;
    console.log('🔄 Updating course:', courseCode);

    const updated = await courseService.updateCourse(courseCode, req.body);

    if (!updated) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json({
      message: 'Course updated successfully',
      courseCode: courseCode
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseCode } = req.params;
    console.log('🗑️ Deleting course:', courseCode);

    const deleted = await courseService.deleteCourse(courseCode);

    if (!deleted) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json({
      message: 'Course deleted successfully',
      courseCode: courseCode
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    const statusCode = (error as Error).message === 'Course not found' ? 404 : 500;
    res.status(statusCode).json({ error: (error as Error).message });
  }
};