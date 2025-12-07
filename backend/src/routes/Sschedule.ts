// backend/src/routes/Sschedule.ts
import { Router, Request, Response } from "express";
import { Schedule, ISchedule } from "../db/models/Schedule.js";

type GetSchedulesByLevelParams = {
  level: string;
};

const router: Router = Router();

/**
 * @route   GET /api/student-schedules/:level
 * @desc    Fetches schedules for students (version 2+ only, published preferred, latest version per group)
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

      // ✅ Get all schedules version 2+
      const allSchedules = await Schedule.find({
        level: studentLevel,
        version: { $gte: 2 }  // ✅ Version 2 or higher only
      })
        .sort({
          publishedAt: -1,  // Published first
          version: -1,      // Then latest version
          created_at: -1,
          createdAt: -1
        })
        .lean();

      console.log(`✅ [STUDENT-API] Found ${allSchedules.length} schedule(s) (version 2+)`);

      if (allSchedules.length === 0) {
        console.log(`⚠️ [STUDENT-API] No schedules version 2+ for Level ${studentLevel}`);
        return res.status(404).json({
          error: `No final schedules available for Level ${level} yet.`,
          message: "The schedule committee is still working on your schedule. Please check back later."
        });
      }

      // ✅ Group by section and get latest version for each group
      const latestBySection = new Map<string, typeof allSchedules[0]>();

      for (const schedule of allSchedules) {
        // Normalize section name: trim whitespace and convert to lowercase for comparison
        const section = (schedule.section || 'default').trim().toLowerCase();

        console.log(`🔍 [STUDENT-API] Processing schedule: section="${schedule.section}" normalized="${section}" version=${schedule.version} published=${!!schedule.publishedAt}`);

        const existing = latestBySection.get(section);

        if (!existing) {
          // No schedule for this section yet, add it
          latestBySection.set(section, schedule);
          console.log(`  ➕ Added new section: ${section}`);
        } else {
          // Compare versions - higher version wins
          if (schedule.version && existing.version && schedule.version > existing.version) {
            latestBySection.set(section, schedule);
            console.log(`  🔄 Replaced ${section}: v${existing.version} -> v${schedule.version}`);
          } else {
            console.log(`  ⏭️ Skipped ${section}: v${schedule.version} (keeping v${existing.version})`);
          }
        }
      }

      // Convert map to array and sort by section
      const selectedSchedules = Array.from(latestBySection.values())
        .sort((a, b) => ((a.section || '').trim().toLowerCase()).localeCompare((b.section || '').trim().toLowerCase()));

      console.log(`📊 [STUDENT-API] Returning ${selectedSchedules.length} schedule(s) - latest version per group`);
      selectedSchedules.forEach(s => {
        console.log(`  📄 ${s.section} v${s.version} (published: ${!!s.publishedAt})`);
      });

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
 * @desc    Fetches schedules for Load Committee (version 1+ including drafts, latest version per group)
 * @access  Load Committee Members & Faculty
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

      // ✅ Get all versions for this level (version 1+)
      const allSchedules = await Schedule.find({
        level: committeeLevel,
        version: { $gte: 1 }  // ✅ Version 1 and above
      })
        .sort({
          version: -1,      // Latest version first
          created_at: -1,
          createdAt: -1
        })
        .lean();

      console.log(`✅ [COMMITTEE-API] Found ${allSchedules.length} total schedule(s) (version 1+)`);

      if (allSchedules.length === 0) {
        console.log(`⚠️ [COMMITTEE-API] No schedules for Level ${committeeLevel}`);
        return res.status(404).json({
          error: `No schedules available for Level ${level}.`,
          message: "No schedule versions have been created yet for this level."
        });
      }

      // ✅ Group by section and get latest version for each group
      const latestBySection = new Map<string, typeof allSchedules[0]>();

      for (const schedule of allSchedules) {
        // Normalize section name: trim whitespace and convert to lowercase for comparison
        const section = (schedule.section || 'default').trim().toLowerCase();

        if (!latestBySection.has(section) ||
            (schedule.version && latestBySection.get(section)!.version &&
             schedule.version > latestBySection.get(section)!.version!)) {
          latestBySection.set(section, schedule);
        }
      }

      // Convert map to array and sort by section
      const latestSchedules = Array.from(latestBySection.values())
        .sort((a, b) => ((a.section || '').trim().toLowerCase()).localeCompare((b.section || '').trim().toLowerCase()));

      console.log(`📊 [COMMITTEE-API] Returning ${latestSchedules.length} schedule(s) - latest version per group`);

      return res.json({
        level: committeeLevel,
        schedules: latestSchedules,  // ✅ Latest version of each group
        allVersions: allSchedules,   // All versions for version control
        count: allSchedules.length
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
