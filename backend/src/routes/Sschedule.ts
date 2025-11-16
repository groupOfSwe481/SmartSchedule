// backend/src/routes/Sschedule.ts
import { Router, Request, Response } from "express";
import { Schedule, ISchedule } from "../db/models/Schedule.js";

type GetSchedulesByLevelParams = {
  level: string;
};

const router: Router = Router();

/**
 * @route   GET /api/student-schedules/:level
 * @desc    Fetches schedules for students (version 2+ only, published preferred)
 * @access  Public (Students)
 */
router.get(
  "/student-schedules/:level",
  async (req: Request<GetSchedulesByLevelParams>, res: Response) => {
    try {
      const { level } = req.params;
      const studentLevel = parseInt(level, 10);

      if (isNaN(studentLevel) || studentLevel < 1 || studentLevel > 8) {
        return res.status(400).json({ error: "Invalid academic level provided." });
      }

      console.log(`📡 [STUDENT-API] Fetching schedules for Level ${studentLevel}`);

      // ✅ للطلاب: فقط النسخة 2 فما فوق
      const schedules = await Schedule.find({
        level: studentLevel,
        version: { $gte: 2 }  // ✅ نسخة 2 أو أعلى فقط
      })
        .sort({ 
          publishedAt: -1,  // المنشورة أولاً
          version: -1,      // ثم أحدث نسخة
          created_at: -1,
          createdAt: -1
        })
        .limit(10)
        .lean();

      console.log(`✅ [STUDENT-API] Found ${schedules.length} schedule(s) (version 2+)`);

      if (schedules.length === 0) {
        console.log(`⚠️ [STUDENT-API] No schedules version 2+ for Level ${studentLevel}`);
        return res.status(404).json({
          error: `No final schedules available for Level ${level} yet.`,
          message: "The schedule committee is still working on your schedule. Please check back later."
        });
      }

      // ✅ نعطي أولوية للجداول المنشورة
      let selectedSchedules = schedules.filter(s => s.publishedAt != null);
      
      if (selectedSchedules.length === 0) {
        console.log(`ℹ️ [STUDENT-API] No published schedules, using latest version ${schedules[0].version}`);
        selectedSchedules = [schedules[0]];
      }

      console.log(`📊 [STUDENT-API] Returning schedule - Version: ${selectedSchedules[0]?.version}, Published: ${selectedSchedules[0]?.publishedAt || 'Not yet'}`);

      return res.json({
        level: studentLevel,
        schedules: selectedSchedules,
        count: selectedSchedules.length
      });
    } catch (e: unknown) {
      console.error("❌ [STUDENT-API] Error:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ 
        message: "Server error", 
        error: errorMessage 
      });
    }
  }
);

/**
 * ✅ ⭐ NEW ENDPOINT ⭐
 * @route   GET /api/committee-schedules/:level
 * @desc    Fetches schedules for Load Committee (version 1+ including drafts)
 * @access  Load Committee Members
 */
router.get(
  "/committee-schedules/:level",
  async (req: Request<GetSchedulesByLevelParams>, res: Response) => {
    try {
      const { level } = req.params;
      const committeeLevel = parseInt(level, 10);

      if (isNaN(committeeLevel) || committeeLevel < 1 || committeeLevel > 8) {
        return res.status(400).json({ error: "Invalid academic level provided." });
      }

      console.log(`📡 [COMMITTEE-API] Fetching schedules for Level ${committeeLevel}`);

      // ✅ للجنة: جميع النسخ من 1 فما فوق (بما فيها المسودات)
      const schedules = await Schedule.find({
        level: committeeLevel,
        version: { $gte: 1 }  // ✅ النسخة 1 فما فوق
      })
        .sort({ 
          version: -1,      // أحدث نسخة أولاً
          created_at: -1,
          createdAt: -1
        })
        .limit(20)  // نعرض المزيد للجنة
        .lean();

      console.log(`✅ [COMMITTEE-API] Found ${schedules.length} schedule(s) (version 1+)`);

      if (schedules.length === 0) {
        console.log(`⚠️ [COMMITTEE-API] No schedules for Level ${committeeLevel}`);
        return res.status(404).json({
          error: `No schedules available for Level ${level}.`,
          message: "No schedule versions have been created yet for this level."
        });
      }

      // ✅ نعرض أحدث نسخة متاحة
      const latestSchedule = schedules[0];

      console.log(`📊 [COMMITTEE-API] Returning schedule - Version: ${latestSchedule.version}, Published: ${latestSchedule.publishedAt || 'Draft'}`);

      return res.json({
        level: committeeLevel,
        schedules: [latestSchedule],  // نعرض أحدث نسخة
        allVersions: schedules,        // نرسل جميع النسخ للمعلومات
        count: schedules.length
      });
    } catch (e: unknown) {
      console.error("❌ [COMMITTEE-API] Error:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ 
        message: "Server error", 
        error: errorMessage 
      });
    }
  }
);

console.log("✅ [SCHEDULES] Student and Committee routes loaded");

export default router;
