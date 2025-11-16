import { Request, Response } from 'express';
import sectionService from '../../business/services/sectionService.js';
import { SectionCreateInput, UnifiedSectionInput } from '../../types/index.js';

export const getLectureSections = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseCode } = req.params;
    const lectureSections = await sectionService.getLectureSections(courseCode);
    
    res.json({
      course_code: courseCode,
      lecture_sections: lectureSections.map(section => ({
        sec_num: section.sec_num,
        time_slots: section.time_Slot,
        academic_level: section.academic_level
      })),
      count: lectureSections.length
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getAllSections = async (req: Request, res: Response): Promise<void> => {
  try {
    const sections = await sectionService.getAllSections();
    res.json({
      sections: sections,
      count: sections.length
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getSectionDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionNum } = req.params;
    
    if (!sectionNum) {
      res.status(400).json({ error: 'Section number is required' });
      return;
    }

    const section = await sectionService.getSectionDetails(sectionNum);
    
    if (!section) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }
    
    res.json(section);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const createSection = async (req: Request<{}, {}, SectionCreateInput>, res: Response): Promise<void> => {
  try {
    const section = await sectionService.createSection(req.body);
    res.status(201).json({
      message: 'Section created successfully',
      section: section
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const createSectionUnified = async (req: Request<{}, {}, UnifiedSectionInput>, res: Response): Promise<void> => {
  try {
    console.log('📦 Controller: Creating unified section');
    const section = await sectionService.createSectionUnified(req.body);
    res.status(201).json({
      message: 'Unified section created successfully',
      section: {
        sec_num: section.sec_num,
        course: section.course,
        time_slots: section.time_Slot.length
      }
    });
  } catch (error) {
    console.error('❌ Controller error:', error);
    res.status(400).json({ error: (error as Error).message });
  }
};

export const updateSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionNum } = req.params;
    console.log('🔄 Updating section:', sectionNum);
    
    const updated = await sectionService.updateSection(sectionNum, req.body);
    
    if (!updated) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }
    
    res.json({
      message: 'Section updated successfully',
      sectionNum: sectionNum
    });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(400).json({ error: (error as Error).message });
  }
};
