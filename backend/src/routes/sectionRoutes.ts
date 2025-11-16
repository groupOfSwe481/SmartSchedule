import express from 'express';
import {
  getLectureSections,
  getAllSections,
  getSectionDetails,
  createSection,
  createSectionUnified,
  updateSection
} from '../api/controllers/sectionController.js';
import { getDB } from '../db/connection.js';

const router = express.Router();

router.get('/lecture-sections/:courseCode', getLectureSections);
router.get('/sections', getAllSections);
router.get('/section-details/:sectionNum', getSectionDetails);
router.post('/create-section', createSection);
router.post('/create-section-unified', createSectionUnified);
router.put('/update-section/:sectionNum', updateSection);

/**
 * DELETE /api/delete-section/:sectionNum
 * Delete a section
 */
router.delete('/delete-section/:sectionNum', async (req, res) => {
  try {
    const db = getDB();
    const { sectionNum } = req.params;
    
    const result = await db.collection('Section').deleteOne({ 
      sec_num: sectionNum 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    res.json({ message: 'Section deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

export default router;
