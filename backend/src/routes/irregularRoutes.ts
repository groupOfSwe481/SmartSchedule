import express, { Request, Response } from "express";
import { Student } from "../db/models/Student.js";
import { Course } from "../db/models/Course.js";

const router = express.Router();

/**
 * GET /api/irregulars
 * Get all irregular students
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    console.log("[IRREGULARS] Fetching all irregular students");
    
    const irregularStudents = await Student.find({ irregulars: true })
      .sort({ level: 1, student_id: 1 })
      .lean();

    console.log(`[IRREGULARS] Found ${irregularStudents.length} irregular students`);

    return res.json({
      success: true,
      data: irregularStudents,
      count: irregularStudents.length,
    });
  } catch (error) {
    console.error("[IRREGULARS] Error fetching:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch irregular students",
    });
  }
});

/**
 * GET /api/irregulars/courses/:level
 * Get available courses for a specific level
 */
router.get("/courses/:level", async (req: Request, res: Response) => {
  try {
    const { level } = req.params;
    console.log(`[IRREGULARS] Fetching courses for level ${level}`);

    // Get all courses (you can filter by level if needed)
    const courses = await Course.find({})
      .select("code name level")
      .sort({ code: 1 })
      .lean();

    console.log(`[IRREGULARS] Found ${courses.length} courses`);

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("[IRREGULARS] Error fetching courses:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch courses",
    });
  }
});

/**
 * POST /api/irregulars
 * Add a new irregular student
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { student_id, level, remaining_courses } = req.body;

    console.log("[IRREGULARS] Adding new irregular student:", {
      student_id,
      level,
      remaining_courses,
    });

    // Validate required fields
    if (!student_id || !level) {
      return res.status(400).json({
        success: false,
        error: "Student ID and level are required",
      });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({ student_id });

    if (existingStudent) {
      // Update existing student to be irregular
      existingStudent.irregulars = true;
      existingStudent.level = level;
      existingStudent.remaining_courses_from_past_levels = remaining_courses || [];
      
      await existingStudent.save();

      console.log("[IRREGULARS] Updated existing student to irregular");

      return res.json({
        success: true,
        message: "Student updated to irregular status",
        data: existingStudent,
      });
    }

    // Create new student
    const newStudent = await Student.create({
      student_id,
      user_id: `user_${student_id}`,
      level,
      irregulars: true,
      remaining_courses_from_past_levels: remaining_courses || [],
      prevent_falling_behind_courses: [],
      courses_taken: [],
      user_elective_choice: [],
    });

    console.log("[IRREGULARS] Created new irregular student");

    return res.status(201).json({
      success: true,
      message: "Irregular student added successfully",
      data: newStudent,
    });
  } catch (error) {
    console.error("[IRREGULARS] Error adding student:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to add irregular student",
    });
  }
});

/**
 * PUT /api/irregulars/:id
 * Update an irregular student
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { level, remaining_courses } = req.body;

    console.log("[IRREGULARS] Updating student:", id);

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        level,
        remaining_courses_from_past_levels: remaining_courses,
      },
      { new: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    console.log("[IRREGULARS] Student updated successfully");

    return res.json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("[IRREGULARS] Error updating student:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update student",
    });
  }
});

/**
 * DELETE /api/irregulars/:id
 * Delete an irregular student (or mark as regular)
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log("[IRREGULARS] Deleting/marking student as regular:", id);

    // Option 1: Mark as regular instead of deleting
    const student = await Student.findByIdAndUpdate(
      id,
      { irregulars: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        error: "Student not found",
      });
    }

    console.log("[IRREGULARS] Student marked as regular");

    return res.json({
      success: true,
      message: "Student removed from irregular list",
      data: student,
    });

    // Option 2: Permanently delete (uncomment if you want this instead)
    // const deletedStudent = await Student.findByIdAndDelete(id);
    // if (!deletedStudent) {
    //   return res.status(404).json({
    //     success: false,
    //     error: "Student not found",
    //   });
    // }
    // return res.json({
    //   success: true,
    //   message: "Student deleted successfully",
    //   data: deletedStudent,
    // });
  } catch (error) {
    console.error("[IRREGULARS] Error deleting student:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete student",
    });
  }
});

console.log("[IRREGULARS] Routes loaded successfully");

export default router;