import courseRepository from '../../data/repositories/courseRepository';
import { Course, CourseCreateInput, CoursePattern } from '../../types';

class CourseService {
  async getAllCourses(): Promise<Course[]> {
    return await courseRepository.findAll();
  }

  async getCoursesByDepartment(department: string): Promise<Course[]> {
    return await courseRepository.findByDepartment(department);
  }

  async getCourseDetails(courseCode: string): Promise<Course> {
    const course = await courseRepository.findByCode(courseCode);
    if (!course) {
      throw new Error('Course not found');
    }
    return course;
  }

  async createCourse(courseData: CourseCreateInput): Promise<Course> {
    // Validate required fields
    this.validateRequiredFields(courseData);
    
    // Check duplicates
    await this.checkDuplicates(courseData);
    
    // Validate prerequisites
    await this.validatePrerequisites(courseData.prerequisites);
    
    // Validate pattern
    this.validatePattern(courseData.pattern, courseData.Duration);
    
    // Transform and create
    const transformedCourse = this.transformCourseData(courseData);
    return await courseRepository.create(transformedCourse);
  }

  async updateCourse(courseCode: string, courseData: Partial<CourseCreateInput>): Promise<boolean> {
    // Check if course exists
    const existingCourse = await courseRepository.findByCode(courseCode);
    if (!existingCourse) {
      throw new Error('Course not found');
    }

    // If updating code, check for duplicates
    if (courseData.code && courseData.code.toUpperCase() !== courseCode.toUpperCase()) {
      const duplicate = await courseRepository.findByCode(courseData.code);
      if (duplicate) {
        throw new Error(`Course with code "${courseData.code.toUpperCase()}" already exists`);
      }
    }

    // If updating name, check for duplicates
    if (courseData.name && courseData.name !== existingCourse.name) {
      const duplicate = await courseRepository.findByName(courseData.name);
      if (duplicate && duplicate.code !== courseCode) {
        throw new Error(`Course with name "${courseData.name}" already exists`);
      }
    }

    // Validate prerequisites if provided
    if (courseData.prerequisites) {
      await this.validatePrerequisites(courseData.prerequisites);
    }

    // Validate pattern if provided
    if (courseData.pattern || courseData.Duration) {
      const duration = courseData.Duration !== undefined ? courseData.Duration : existingCourse.Duration;
      const pattern = courseData.pattern || existingCourse.pattern;
      this.validatePattern(pattern, duration);
    }

    // Transform update data
    const updateData: any = {};
    
    if (courseData.name) updateData.name = courseData.name.trim();
    if (courseData.code) updateData.code = courseData.code.toUpperCase().trim();
    if (courseData.credit_hours !== undefined) updateData.credit_hours = parseInt(String(courseData.credit_hours));
    if (courseData.Duration !== undefined) updateData.Duration = parseInt(String(courseData.Duration));
    if (courseData.is_elective !== undefined) updateData.is_elective = Boolean(courseData.is_elective);
    if (courseData.department) updateData.department = courseData.department;
    if (courseData.college) updateData.college = courseData.college;
    
    // ✅ LEVEL: Store the actual level number (e.g., 7), not an ID reference
    if (courseData.level !== undefined) {
      // If level is provided and is a valid number, store it as integer
      // If level is null/0/empty, store null
      if (courseData.level && !isNaN(Number(courseData.level))) {
        updateData.level = parseInt(String(courseData.level));
      } else {
        updateData.level = null;
      }
    }
    
    if (courseData.exam_date !== undefined) updateData.exam_date = courseData.exam_date || null;
    if (courseData.exam_time !== undefined) updateData.exam_time = courseData.exam_time || null;
    
    if (courseData.prerequisites !== undefined) {
      updateData.prerequisites = courseData.prerequisites && courseData.prerequisites.length > 0 
        ? courseData.prerequisites 
        : [null];
    }

    if (courseData.pattern) {
      const lectureHours = parseInt(String(courseData.pattern.lecture_hours)) || 0;
      const labHours = parseInt(String(courseData.pattern.lab_hours)) || 0;
      const tutorialHours = parseInt(String(courseData.pattern.tutorial_hours)) || 0;

      updateData.pattern = {
        type: courseData.pattern.type as any,
        lecture_hours: lectureHours,
        lab_hours: labHours,
        tutorial_hours: tutorialHours,
        total_hours: lectureHours + labHours + tutorialHours
      };
    }

    updateData.updated_at = new Date();

    return await courseRepository.update(courseCode, updateData);
  }

  private validateRequiredFields(courseData: CourseCreateInput): void {
    // Level is optional - only name, code, credit_hours, department, college are required
    const required: (keyof CourseCreateInput)[] = ['name', 'code', 'credit_hours', 'department', 'college'];
    const missing = required.filter(field => !courseData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Duration is required but can be 0 for courses like graduation projects, independent study, etc.
    if (courseData.Duration === undefined || courseData.Duration === null) {
      throw new Error('Duration field is required (use 0 for independent study courses)');
    }
  }

  private async checkDuplicates(courseData: CourseCreateInput): Promise<void> {
    const existingByCode = await courseRepository.findByCode(courseData.code);
    if (existingByCode) {
      throw new Error(`Course with code "${courseData.code.toUpperCase()}" already exists`);
    }

    const existingByName = await courseRepository.findByName(courseData.name);
    if (existingByName) {
      throw new Error(`Course with name "${courseData.name}" already exists`);
    }
  }

  private async validatePrerequisites(prerequisites?: string[]): Promise<void> {
    if (!prerequisites || prerequisites.length === 0) {
      return;
    }

    // Separate course codes from credit hours text
    // Course codes typically match pattern: 2-4 letters followed by 3-4 digits (e.g., CSC111, MATH151)
    const courseCodePattern = /^[A-Z]{2,4}\d{3,4}$/i;
    
    const courseCodes: string[] = [];
    const creditHoursText: string[] = [];
    
    prerequisites.forEach(prereq => {
      if (prereq && prereq.trim()) {
        const trimmed = prereq.trim();
        if (courseCodePattern.test(trimmed)) {
          courseCodes.push(trimmed);
        } else {
          // It's credit hours text or other requirement
          creditHoursText.push(trimmed);
        }
      }
    });

    // Only validate course codes against database
    if (courseCodes.length > 0) {
      const validPrereqs = await courseRepository.validatePrerequisites(courseCodes);
      if (validPrereqs.length !== courseCodes.length) {
        const invalidPrereqs = courseCodes.filter(prereq => 
          !validPrereqs.some(course => course.code.toUpperCase() === prereq.toUpperCase())
        );
        throw new Error(`Invalid course prerequisites: ${invalidPrereqs.join(', ')}`);
      }
    }

    // Credit hours text is always valid (no validation needed)
    console.log(`✅ Validated prerequisites - Courses: ${courseCodes.join(', ') || 'none'}, Credit hours: ${creditHoursText.join(', ') || 'none'}`);
  }

  private validatePattern(pattern: any, duration: number): void {
    // Skip pattern validation for independent study courses (Duration = 0)
    if (!pattern || duration === 0) {
      if (duration === 0) {
        console.log('✅ Skipping pattern validation for independent study course (Duration = 0)');
      }
      return;
    }

    const lectureHours = parseInt(pattern.lecture_hours) || 0;
    const labHours = parseInt(pattern.lab_hours) || 0;
    const tutorialHours = parseInt(pattern.tutorial_hours) || 0;
    const totalPatternHours = lectureHours + labHours + tutorialHours;

    if (totalPatternHours !== parseInt(String(duration))) {
      throw new Error(
        `Pattern total hours (${totalPatternHours}) doesn't match Duration (${duration})`
      );
    }
  }

  private transformCourseData(courseData: CourseCreateInput): Course {
    let coursePattern: CoursePattern | null = null;
    if (courseData.pattern) {
      const lectureHours = parseInt(String(courseData.pattern.lecture_hours)) || 0;
      const labHours = parseInt(String(courseData.pattern.lab_hours)) || 0;
      const tutorialHours = parseInt(String(courseData.pattern.tutorial_hours)) || 0;

      coursePattern = {
        type: courseData.pattern.type as any,
        lecture_hours: lectureHours,
        lab_hours: labHours,
        tutorial_hours: tutorialHours,
        total_hours: lectureHours + labHours + tutorialHours
      };
    }

    const transformedCourse: any = {
      name: courseData.name.trim(),
      code: courseData.code.toUpperCase().trim(),
      credit_hours: parseInt(String(courseData.credit_hours)),
      Duration: parseInt(String(courseData.Duration)),
      is_elective: Boolean(courseData.is_elective),
      department: courseData.department,
      college: courseData.college,
      prerequisites: courseData.prerequisites && courseData.prerequisites.length > 0 
        ? courseData.prerequisites : [null],
      exam_date: courseData.exam_date || null,
      exam_time: courseData.exam_time || null,
      pattern: coursePattern,
      section: [null],
      created_at: new Date(),
      updated_at: new Date()
    };

    // ✅ LEVEL: Store the actual level number (e.g., 7), not an ID reference
    // Only add level if provided and is a valid number
    if (courseData.level !== undefined && courseData.level !== null) {
      if (!isNaN(Number(courseData.level)) && Number(courseData.level) > 0) {
        transformedCourse.level = parseInt(String(courseData.level));
      }
    }

    return transformedCourse as Course;
  }
}

export default new CourseService();
