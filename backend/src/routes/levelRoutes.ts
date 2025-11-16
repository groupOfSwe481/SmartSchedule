// backend/src/routes/levelRoutes.ts
import express from 'express';
import { getDB } from '../db/connection.js';

const router = express.Router();

/**
 * GET /api/levels
 * Get all levels with their ObjectIds and level numbers
 * Returns: { levels: [{_id, level_num}], count: number }
 */
router.get('/levels', async (req, res) => {
  try {
    const db = getDB();
    
    // Fetch all levels from the Level collection
    const levels = await db.collection('Level')
      .find({})
      .project({ 
        _id: 1,           // ObjectId
        level_num: 1      // Level number (3, 4, 5, 6, 7, 8)
      })
      .sort({ level_num: 1 })  // Sort by level number ascending
      .toArray();
    
    console.log(`✅ Fetched ${levels.length} levels`);
    
    res.json({
      levels: levels,
      count: levels.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching levels:', error);
    res.status(500).json({ 
      error: 'Failed to fetch levels',
      message: (error as Error).message 
    });
  }
});

/**
 * GET /api/levels/:levelNum
 * Get a specific level by its level number
 * Example: /api/levels/5 -> Returns level 5 details
 */
router.get('/levels/:levelNum', async (req, res) => {
  try {
    const { levelNum } = req.params;
    const levelNumber = parseInt(levelNum);
    
    if (isNaN(levelNumber) || levelNumber < 3 || levelNumber > 8) {
      return res.status(400).json({ 
        error: 'Invalid level number. Must be between 3 and 8.' 
      });
    }
    
    const db = getDB();
    const level = await db.collection('Level')
      .findOne({ level_num: levelNumber });
    
    if (!level) {
      return res.status(404).json({ 
        error: `Level ${levelNumber} not found` 
      });
    }
    
    res.json(level);
    
  } catch (error) {
    console.error('❌ Error fetching level:', error);
    res.status(500).json({ 
      error: 'Failed to fetch level',
      message: (error as Error).message 
    });
  }
});

export default router;