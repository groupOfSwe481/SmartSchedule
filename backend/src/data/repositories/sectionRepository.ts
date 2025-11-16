import { ObjectId } from 'mongodb';
import { getDB } from '../../db/connection.js';
import { Section, SectionType, TimeSlotDetail, UnifiedSectionInput } from '../../types/index.js';

class SectionRepository {
    /**
     * Find all sections
     */
    async findAll(): Promise<Section[]> {
        const db = getDB();
        return await db.collection<Section>('Section').find().toArray();
    }

    /**
     * Find sections by course code, optionally filtered by type
     */
    async findByCourse(courseCode: string, type: SectionType | null = null): Promise<Section[]> {
        const db = getDB();
        const query: any = { course: courseCode };
        if (type) query.type = type;
        
        return await db.collection<Section>('Section')
            .find(query)
            .sort({ sec_num: 1 })
            .toArray();
    }

    /**
     * Find a section by its ID (section number)
     */
    async findById(sectionId: string): Promise<Section | null> {
        const db = getDB();
        return await db.collection<Section>('Section').findOne({ sec_num: sectionId });
    }

    /**
     * Get the last section (for generating new section numbers)
     */
    async getLastSection(): Promise<Section[]> {
        const db = getDB();
        return await db.collection<Section>('Section')
            .find()
            .sort({ sec_num: -1 })
            .limit(1)
            .toArray();
    }

    /**
     * Create a standard section
     */
    async create(sectionData: Section): Promise<Section> {
        const db = getDB();
        const result = await db.collection<Section>('Section').insertOne(sectionData);
        return { ...sectionData, _id: result.insertedId };
    }

    /**
     * Update a section
     */
    async update(sectionId: string, updateData: Partial<Section>): Promise<boolean> {
        const db = getDB();
        const result = await db.collection<Section>('Section').updateOne(
            { sec_num: sectionId },
            { $set: updateData }
        );
        return result.modifiedCount > 0;
    }

    /**
     * Delete a section
     */
    async delete(sectionId: string): Promise<boolean> {
        const db = getDB();
        const result = await db.collection<Section>('Section').deleteOne({ sec_num: sectionId });
        return result.deletedCount > 0;
    }

    /**
     * Create a unified section (supports multiple time slots in one section)
     * This is the key method for file upload functionality
     */
    async createUnifiedSection(sectionData: UnifiedSectionInput): Promise<Section> {
        const db = getDB();
        
        console.log('📝 Repository: Creating unified section for', sectionData.course_code);
        
        // Generate section number in format: L{level}-{courseCode}-G{group}
        const newSecNum = await this.generateSectionNumberForCourse(
            sectionData.course_code, 
            sectionData.academic_level || 3
        );
        
        console.log(`✅ Generated section number: ${newSecNum}`);
        
        // Create the unified section document (without type and follows_lecture)
        const sectionDoc: any = {
            sec_num: newSecNum,
            course: sectionData.course_code,
            classroom: sectionData.classroom || null,
            max_Number: sectionData.max_Number || null,
            time_Slot: sectionData.time_Slot,  // Already formatted: ["lecture: Sunday 8:00-9:50"]
            time_slots_detail: sectionData.time_slots_detail || [],
            academic_level: sectionData.academic_level || null,
            created_at: new Date(),
            created_by: sectionData.created_by || 'file_upload'
        };
        
        // Insert into database
        const result = await db.collection('Section').insertOne(sectionDoc);
        
        console.log('✅ Repository: Unified section created:', newSecNum);
        
        return {
            ...sectionDoc,
            _id: result.insertedId
        } as Section;
    }

    /**
     * Check if a section exists
     */
    async exists(sectionId: string): Promise<boolean> {
        const db = getDB();
        const count = await db.collection<Section>('Section').countDocuments({
            sec_num: sectionId
        });
        return count > 0;
    }

    /**
     * Find sections by academic level
     */
    async findByAcademicLevel(level: number): Promise<Section[]> {
        const db = getDB();
        return await db.collection<Section>('Section')
            .find({ academic_level: level })
            .sort({ sec_num: 1 })
            .toArray();
    }

    /**
     * Find sections by type (lecture, lab, tutorial)
     */
    async findByType(type: SectionType): Promise<Section[]> {
        const db = getDB();
        return await db.collection<Section>('Section')
            .find({ type })
            .sort({ sec_num: 1 })
            .toArray();
    }

    /**
     * Count sections for a specific course
     */
    async countByCourse(courseCode: string): Promise<number> {
        const db = getDB();
        return await db.collection<Section>('Section').countDocuments({
            course: courseCode
        });
    }

    /**
     * Generate next section number in format: L{level}-{courseCode}-G{group}
     * Example: L3-MATH106-G1, L3-MATH106-G2, L4-CSC113-G1
     */
    async generateSectionNumberForCourse(courseCode: string, academicLevel: number): Promise<string> {
        const db = getDB();
        
        // Find all sections for this course and level
        const existingSections = await db.collection<Section>('Section')
            .find({ 
                course: courseCode.toUpperCase(),
                academic_level: academicLevel
            })
            .sort({ sec_num: -1 })
            .toArray();
        
        let nextGroupNumber = 1;
        
        if (existingSections.length > 0) {
            // Extract group numbers from existing sections
            // Format: L3-MATH106-G2 -> extract "2"
            const groupNumbers = existingSections
                .map(section => {
                    const match = section.sec_num.match(/G(\d+)$/);
                    return match ? parseInt(match[1]) : 0;
                })
                .filter(num => num > 0);
            
            if (groupNumbers.length > 0) {
                const maxGroupNumber = Math.max(...groupNumbers);
                nextGroupNumber = maxGroupNumber + 1;
            }
        }
        
        // Generate section number: L{level}-{courseCode}-G{group}
        const sectionNumber = `L${academicLevel}-${courseCode.toUpperCase()}-G${nextGroupNumber}`;
        
        console.log(`📊 Course: ${courseCode}, Level: ${academicLevel}, Next Group: ${nextGroupNumber}`);
        
        return sectionNumber;
    }

    /**
     * Generate next section number (legacy method - kept for compatibility)
     */
    async generateSectionNumber(): Promise<string> {
        const lastSection = await this.getLastSection();
        
        if (lastSection.length === 0) {
            return '72700';
        }

        const lastNumber = parseInt(lastSection[0].sec_num || '72699');
        const nextNumber = lastNumber + 1;

        return nextNumber.toString();
    }
}

export default new SectionRepository();
