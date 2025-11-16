import { getDB } from '../../db/connection.js';
import sectionRepository from '../../data/repositories/sectionRepository.js';
import { Section, SectionCreateInput, UnifiedSectionInput, TimeSlotDetail, CoursePattern } from '../../types/index.js';

class SectionService {
  async getLectureSections(courseCode: string): Promise<Section[]> {
    const db = getDB();
    return await db.collection<Section>('Section')
      .find({ 
        course: courseCode,
        type: 'lecture'
      })
      .sort({ sec_num: 1 })
      .toArray();
  }

  async getAllSections(): Promise<Section[]> {
    const db = getDB();
    return await db.collection<Section>('Section').find().toArray();
  }

  async getSectionDetails(sectionNum: string): Promise<Section | null> {
    const db = getDB();
    return await db.collection<Section>('Section').findOne({ sec_num: sectionNum });
  }

  async createSection(sectionData: SectionCreateInput): Promise<Section> {
    const db = getDB();
    
    // Verify course exists
    const course = await db.collection('Course').findOne({ code: sectionData.course_code });
    if (!course) {
      throw new Error('Course not found');
    }

    // Check if section type matches course pattern
    if (course.pattern) {
      const sectionType = sectionData.type || 'lecture';
      const isValidType = this.validateSectionTypeAgainstPattern(sectionType, course.pattern);
      
      if (!isValidType) {
        throw new Error(`Section type "${sectionType}" doesn't match course pattern`);
      }
    }

    // Generate section number
    const sectionNumber = await this.generateSectionNumber();

    // Format time slots
    const formattedTimeSlots = sectionData.time_slots.map(slot => {
      return `${slot.day} ${slot.start_time}-${slot.end_time}`;
    });

    // Create new section
    const newSection: Section = {
      sec_num: sectionNumber,
      classroom: sectionData.classroom || null,
      max_Number: sectionData.max_number ? parseInt(String(sectionData.max_number)) : null,
      time_Slot: formattedTimeSlots,
      course: sectionData.course_code,
      academic_level: sectionData.academic_level ? parseInt(String(sectionData.academic_level)) : null,
      type: sectionData.type || 'lecture',
      follows_lecture: sectionData.follows_lecture || null,
      time_slots_detail: sectionData.time_slots,
      created_at: new Date(),
      created_by: sectionData.faculty_id || 'file_upload'
    };

    const result = await db.collection<Section>('Section').insertOne(newSection);
    newSection._id = result.insertedId;

    return newSection;
  }

  async updateSection(sectionNum: string, updateData: Partial<SectionCreateInput & UnifiedSectionInput>): Promise<boolean> {
    const db = getDB();
    
    // Check if section exists
    const existingSection = await db.collection<Section>('Section').findOne({ sec_num: sectionNum });
    if (!existingSection) {
      throw new Error('Section not found');
    }

    // If updating course_code, verify it exists and validate type against pattern
    let courseToValidate = null;
    if (updateData.course_code) {
      courseToValidate = await db.collection('Course').findOne({ code: updateData.course_code });
      if (!courseToValidate) {
        throw new Error('Course not found');
      }
    } else {
      // Get existing course for validation
      courseToValidate = await db.collection('Course').findOne({ code: existingSection.course });
    }

    // Validate section type against course pattern (same as create)
    if (courseToValidate && courseToValidate.pattern && updateData.type) {
      const isValidType = this.validateSectionTypeAgainstPattern(updateData.type, courseToValidate.pattern);
      
      if (!isValidType) {
        throw new Error(`Section type "${updateData.type}" doesn't match course pattern`);
      }
    }

    // Build update object
    const update: any = {};
    
    if (updateData.course_code) update.course = updateData.course_code;
    if (updateData.classroom !== undefined) update.classroom = updateData.classroom || null;
    if (updateData.max_number !== undefined) {
      update.max_Number = updateData.max_number ? parseInt(String(updateData.max_number)) : null;
    }
    if (updateData.max_Number !== undefined) {
      update.max_Number = updateData.max_Number || null;
    }
    if (updateData.academic_level !== undefined) {
      update.academic_level = updateData.academic_level ? parseInt(String(updateData.academic_level)) : null;
    }
    if (updateData.type) update.type = updateData.type;
    if (updateData.follows_lecture !== undefined) update.follows_lecture = updateData.follows_lecture || null;
    if (updateData.faculty_id !== undefined) update.created_by = updateData.faculty_id || 'file_upload';

    // Handle time slots (same as create)
    if (updateData.time_slots && updateData.time_slots.length > 0) {
      const formattedTimeSlots = updateData.time_slots.map(slot => {
        return `${slot.day} ${slot.start_time}-${slot.end_time}`;
      });
      update.time_Slot = formattedTimeSlots;
      update.time_slots_detail = updateData.time_slots;
    } else if (updateData.time_Slot && updateData.time_Slot.length > 0) {
      update.time_Slot = updateData.time_Slot;
      if (updateData.time_slots_detail) {
        update.time_slots_detail = updateData.time_slots_detail;
      }
    }

    // Add updated timestamp
    update.updated_at = new Date();

    // Perform update
    const result = await db.collection<Section>('Section').updateOne(
      { sec_num: sectionNum },
      { $set: update }
    );
    
    return result.modifiedCount > 0;
  }

  private async generateSectionNumber(): Promise<string> {
    const db = getDB();
    const lastSection = await db.collection<Section>('Section')
      .find()
      .sort({ sec_num: -1 })
      .limit(1)
      .toArray();

    if (lastSection.length === 0) {
      return '72700';
    }

    const lastNumber = parseInt(lastSection[0].sec_num || '72699');
    const nextNumber = lastNumber + 1;

    return nextNumber.toString();
  }

  private validateSectionTypeAgainstPattern(sectionType: string, pattern: CoursePattern): boolean {
    if (!pattern || !pattern.type) return true;
    
    const normalizedType = sectionType.toLowerCase();
    
    switch(pattern.type) {
      case 'lecture_only':
        return normalizedType === 'lecture';
      case 'lecture_tutorial':
        return normalizedType === 'lecture' || normalizedType === 'tutorial';
      case 'lecture_lab':
        return normalizedType === 'lecture' || normalizedType.includes('lab');
      case 'lecture_lab_tutorial':
        return ['lecture', 'tutorial'].includes(normalizedType) || normalizedType.includes('lab');
      case 'lab_only':
        return normalizedType.includes('lab');
      case 'custom':
        return true;
      default:
        return true;
    }
  }

  async createSectionUnified(sectionData: UnifiedSectionInput): Promise<Section> {
    const db = getDB();
    
    // Verify course exists
    const course = await db.collection('Course').findOne({ 
      code: sectionData.course_code 
    });
    
    if (!course) {
      throw new Error('Course not found');
    }
    
    // Validate required fields
    if (!sectionData.time_Slot || !Array.isArray(sectionData.time_Slot)) {
      throw new Error('time_Slot array is required');
    }
    
    if (sectionData.time_Slot.length === 0) {
      throw new Error('At least one time slot is required');
    }
    
    console.log('🔧 Service: Creating unified section for', sectionData.course_code);
    
    // Use repository to create the section
    const newSection = await sectionRepository.createUnifiedSection({
      course_code: sectionData.course_code,
      classroom: sectionData.classroom || null,
      max_Number: sectionData.max_Number || null,
      time_Slot: sectionData.time_Slot,
      time_slots_detail: sectionData.time_slots_detail || [],
      academic_level: sectionData.academic_level || null,
      created_by: sectionData.created_by || 'manual_entry'
    });
    
    console.log('✅ Service: Unified section created:', newSection.sec_num);
    return newSection;
  }
}

export default new SectionService();
