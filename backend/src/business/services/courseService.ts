import { ObjectId } from 'mongodb';
import { getDB } from '../../db/connection.js';
import courseRepository from '../../data/repositories/courseRepository.js';
import { Course, CourseCreateInput, CoursePattern, CourseWithDetails } from '../../types/index.js';

class CourseService {
  async getAllCourses(): Promise<CourseWithDetails[]> {
    const courses = await courseRepository.findAll();
    
    // Populate prerequisites for all courses
    const coursesWithDetails = await Promise.all(
      courses.map(async (course) => {
        let prerequisites_details: Course[] = [];
        if (course.prerequisites && course.prerequisites.length > 0) {
          prerequisites_details = await courseRepository.findCoursesByIds(course.prerequisites);
        }
        
        return {
          ...course,
          prerequisites_details
        } as CourseWithDetails;
      })
    );
    
    return coursesWithDetails;
  }

  async getCoursesByDepartment(department: string): Promise<CourseWithDetails[]> {
    const courses = await courseRepository.findByDepartment(department);
    
    // Populate prerequisites
    const coursesWithDetails = await Promise.all(
      courses.map(async (course) => {
        let prerequisites_details: Course[] = [];
        if (course.prerequisites && course.prerequisites.length > 0) {
          prerequisites_details = await courseRepository.findCoursesByIds(course.prerequisites);
        }
        
        return {
          ...course,
          prerequisites_details
        } as CourseWithDetails;
      })
    );
    
    return coursesWithDetails;
  }

  async getCourseDetails(courseCode: string): Promise<CourseWithDetails> {
    const course = await courseRepository.findByCode(courseCode);
    if (!course) {
      throw new Error('Course not found');
    }
    
    // Populate prerequisites with course details
    let prerequisites_details: Course[] = [];
    if (course.prerequisites && course.prerequisites.length > 0) {
      prerequisites_details = await courseRepository.findCoursesByIds(course.prerequisites);
    }
    
    return {
      ...course,
      prerequisites_details
    } as CourseWithDetails;
  }

  async createCourse(courseData: CourseCreateInput): Promise<Course> {
    // Validate required fields
    this.validateRequiredFields(courseData);
    
    // Check duplicates
    await this.checkDuplicates(courseData);
    
    // Convert course codes to ObjectIds
    const prerequisiteIds = await this.convertPrerequisitesToObjectIds(courseData.prerequisites);
    
    // Validate pattern
    this.validatePattern(courseData.pattern, courseData.Duration);
    
    // Transform and create
    const transformedCourse = await this.transformCourseData(courseData, prerequisiteIds);
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

    // Convert prerequisites to ObjectIds if provided
    let prerequisiteIds: ObjectId[] = [];
    if (courseData.prerequisites) {
      prerequisiteIds = await this.convertPrerequisitesToObjectIds(courseData.prerequisites);
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
    
    // Handle prerequisites
    if (courseData.prerequisites !== undefined) {
      updateData.prerequisites = prerequisiteIds;
    }

    if (courseData.hour_prerequisites !== undefined) {
      updateData.hour_prerequisites = courseData.hour_prerequisites || [];
    }
    
    // LEVEL: Query Level collection and get the actual ObjectId
    if (courseData.level !== undefined) {
      if (courseData.level && !isNaN(Number(courseData.level))) {
        const levelNum = parseInt(String(courseData.level));
        const levelObjectId = await this.getLevelObjectId(levelNum);
        if (levelObjectId) {
          updateData.level = levelObjectId;
        } else {
          throw new Error(`Level ${levelNum} not found in database`);
        }
      } else {
        updateData.level = null;
      }
    }
    
    if (courseData.exam_date !== undefined) updateData.exam_date = courseData.exam_date || null;
    if (courseData.exam_time !== undefined) updateData.exam_time = courseData.exam_time || null;
    
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

  private async convertPrerequisitesToObjectIds(prerequisites?: string[]): Promise<ObjectId[]> {
    if (!prerequisites || prerequisites.length === 0) {
      return [];
    }

    const db = getDB();
    const objectIds: ObjectId[] = [];
    const missingCourses: string[] = [];

    for (const courseCode of prerequisites) {
      const course = await db.collection('Course').findOne({ 
        code: courseCode.toUpperCase().trim() 
      });
      
      if (course && course._id) {
        objectIds.push(course._id);
      } else {
        missingCourses.push(courseCode);
      }
    }

    if (missingCourses.length > 0) {
      throw new Error(`Prerequisite courses not found: ${missingCourses.join(', ')}`);
    }

    return objectIds;
  }

  private async transformCourseData(courseData: CourseCreateInput, prerequisiteIds: ObjectId[]): Promise<Course> {
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
      prerequisites: prerequisiteIds, // ObjectIds
      hour_prerequisites: courseData.hour_prerequisites || [], // Credit hours text
      exam_date: courseData.exam_date || null,
      exam_time: courseData.exam_time || null,
      pattern: coursePattern,
      section: [null],
      created_at: new Date(),
      updated_at: new Date()
    };

    // LEVEL: Query Level collection and get the actual ObjectId
    if (courseData.level !== undefined && courseData.level !== null) {
      if (!isNaN(Number(courseData.level)) && Number(courseData.level) > 0) {
        const levelNum = parseInt(String(courseData.level));
        const levelObjectId = await this.getLevelObjectId(levelNum);
        
        if (levelObjectId) {
          transformedCourse.level = levelObjectId;
        } else {
          throw new Error(`Level ${levelNum} not found in database`);
        }
      }
    }

    return transformedCourse as Course;
  }

  // ... keep the existing validateRequiredFields, checkDuplicates, validatePattern, getLevelObjectId methods
  private validateRequiredFields(courseData: CourseCreateInput): void {
    const required: (keyof CourseCreateInput)[] = ['name', 'code', 'credit_hours', 'department', 'college'];
    const missing = required.filter(field => !courseData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

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

  private validatePattern(pattern: any, duration: number): void {
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

  private async getLevelObjectId(levelNum: number): Promise<ObjectId | null> {
    const db = getDB();
    const levelDoc = await db.collection('Level').findOne({ level_num: levelNum });
    
    if (levelDoc && levelDoc._id) {
      console.log(`✅ Found Level ${levelNum} with ObjectId: ${levelDoc._id.toString()}`);
      return levelDoc._id;
    }
    
    console.warn(`⚠️ Level ${levelNum} not found in Level collection`);
    return null;
  }
}

export default new CourseService();
