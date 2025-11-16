import express from "express";
import multer from "multer";
import { Level } from "../db/models/Level.js";
import { Course } from "../db/models/Course.js";
import Tesseract from "tesseract.js";

const router = express.Router();

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    // Only accept images for now (PDF support can be added later)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an image (JPG, PNG)'));
    }
  },
});

/**
 * GET /api/students/levels
 * Get all levels with student counts and courses
 */
router.get("/levels", async (req, res) => {
  try {
    const levels = await Level.find()
      .populate('has', 'name code')
      .sort({ level_num: 1 });

    const formattedLevels = levels.map(level => ({
      level_num: level.level_num,
      student_count: level.student_count || 0,
      course_count: level.has.length,
      course_enrollments: level.course_enrollments 
        ? Object.fromEntries(level.course_enrollments) 
        : {},
      courses: level.has,
      updated_at: level.updated_at,
    }));

    res.json({ success: true, data: formattedLevels });
  } catch (error) {
    console.error("Error fetching levels:", error);
    res.status(500).json({ success: false, error: "Error fetching data" });
  }
});

/**
 * PUT /api/students/level/:levelNum
 * Update student count for a specific level
 * Body can include: student_count, course_enrollments
 */
router.put("/level/:levelNum", async (req, res) => {
  try {
    const { levelNum } = req.params;
    const { student_count, course_enrollments } = req.body;

    const level = await Level.findOne({ level_num: parseInt(levelNum) });
    if (!level) {
      return res.status(404).json({ success: false, error: "Level not found" });
    }

    // Update total student count if provided
    if (student_count !== undefined) {
      level.student_count = student_count;
    }

    // Update course enrollments if provided
    if (course_enrollments) {
      level.course_enrollments = new Map(Object.entries(course_enrollments));
    }

    await level.save();

    res.json({ 
      success: true, 
      message: "Data updated successfully",
      data: {
        level_num: level.level_num,
        student_count: level.student_count,
        course_enrollments: Object.fromEntries(level.course_enrollments || new Map()),
      }
    });
  } catch (error) {
    console.error("Error updating level:", error);
    res.status(500).json({ success: false, error: "Error updating data" });
  }
});

/**
 * POST /api/students/upload
 * Upload image file and extract course enrollment data using OCR
 */
router.post("/upload", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const { levelNum } = req.body;
    if (!levelNum) {
      return res.status(400).json({ success: false, error: "Level number is required" });
    }

    console.log(`Processing file for Level ${levelNum}...`);

    // Extract text from image using OCR
    const result = await Tesseract.recognize(
      req.file.buffer,
      'eng', // English language
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    const extractedText = result.data.text;
    console.log('Extracted text:', extractedText);

    // Parse the extracted text to get course enrollments
    const parsedData = parseStudentData(extractedText);

    if (!parsedData || Object.keys(parsedData.courses).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No valid course data found in the image. Please ensure the image contains course codes (e.g., CS601: 45)",
        extractedText: extractedText.substring(0, 500) // For debugging
      });
    }

    // Update database
    const level = await Level.findOne({ level_num: parseInt(levelNum) });
    if (!level) {
      return res.status(404).json({ success: false, error: "Level not found" });
    }

    // Update course enrollments
    level.course_enrollments = new Map(Object.entries(parsedData.courses));
    
    // Optionally update total if found in file
    if (parsedData.total > 0) {
      level.student_count = parsedData.total;
    }

    await level.save();

    res.json({ 
      success: true, 
      message: "Image processed and data updated successfully",
      data: {
        level_num: level.level_num,
        student_count: level.student_count,
        course_enrollments: Object.fromEntries(level.course_enrollments),
        courses_found: Object.keys(parsedData.courses).length,
        extracted_sample: extractedText.substring(0, 200)
      }
    });

  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error processing image",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/students/level/:levelNum
 * Clear all student data for a specific level
 */
router.delete("/level/:levelNum", async (req, res) => {
  try {
    const { levelNum } = req.params;

    const level = await Level.findOne({ level_num: parseInt(levelNum) });
    if (!level) {
      return res.status(404).json({ success: false, error: "Level not found" });
    }

    level.student_count = 0;
    level.course_enrollments = new Map();
    await level.save();

    res.json({ 
      success: true, 
      message: "Student data cleared successfully" 
    });
  } catch (error) {
    console.error("Error clearing data:", error);
    res.status(500).json({ success: false, error: "Error clearing data" });
  }
});

/**
 * Parse extracted text to get course codes and student counts
 * Expected formats:
 * 1. CS101: 45
 * 2. CS101 45
 * 3. | CS101 | 45 |
 * 4. CS101    45
 */
function parseStudentData(text: string): { total: number; courses: Record<string, number> } {
  const courses: Record<string, number> = {};
  let total = 0;

  // Clean up the text
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Pattern 1: Course code followed by colon/space and number
  // Examples: CS101: 45, CS101 45, CS101:45
  const pattern1 = /([A-Z]{2,4}\d{3})\s*[:\s-]\s*(\d+)/gi;
  let match;
  
  while ((match = pattern1.exec(text)) !== null) {
    const courseCode = match[1].toUpperCase();
    const count = parseInt(match[2]);
    if (!isNaN(count) && count > 0 && count < 500) { // Sanity check
      courses[courseCode] = count;
      total += count;
    }
  }

  // Pattern 2: Table format with pipes
  // Example: | CS101 | 45 |
  const pattern2 = /\|\s*([A-Z]{2,4}\d{3})\s*\|\s*(\d+)/gi;
  while ((match = pattern2.exec(text)) !== null) {
    const courseCode = match[1].toUpperCase();
    const count = parseInt(match[2]);
    if (!isNaN(count) && count > 0 && count < 500 && !courses[courseCode]) {
      courses[courseCode] = count;
      total += count;
    }
  }

  // Pattern 3: Look for explicit total
  // Examples: Total: 150, Total 150, Total Students: 150
  const totalPattern = /(?:total|sum|total students)\s*[:\s]\s*(\d+)/i;
  const totalMatch = text.match(totalPattern);
  if (totalMatch) {
    const explicitTotal = parseInt(totalMatch[1]);
    if (!isNaN(explicitTotal) && explicitTotal > 0) {
      total = explicitTotal;
    }
  }

  return { total, courses };
}

export default router;