import express, { Request, Response } from "express";
import {
  generateSchedule,
  getScheduleImpactReport,
} from "../services/scheduler.js";
import { Schedule } from "../db/models/Schedule.js";
import { User } from "../db/models/User.js";
import Notification from "../db/models/Notification.js";
import { ScheduleHistory } from "../db/models/ScheduleHistory.js";
import * as jsondiffpatchLib from "jsondiffpatch";

const router = express.Router();
const jsondiffpatch = (jsondiffpatchLib as any).create();

/* -------------------------------------------------------------------------- */
/* 🧾 GET /schedule/level/:levelNum - Get Draft AND Published schedules       */
/* -------------------------------------------------------------------------- */
router.get("/schedule/level/:levelNum", async (req: Request, res: Response) => {
  try {
    const { levelNum } = req.params;

    const latestSchedulesByGroup = await Schedule.aggregate([
      {
        $match: {
          level: parseInt(levelNum),
          // FIX: Allow both Draft and Published so history works for both
          status: { $in: ["Draft", "Published"] },
        },
      },
      { $sort: { history_version: -1 } },
      {
        $group: {
          _id: "$section",
          latestDoc: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$latestDoc" } },
      { $sort: { section: 1 } },
    ]);

    // Note: We return empty array instead of 404 to handle empty states better on frontend
    res.json({ success: true, schedules: latestSchedulesByGroup });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔍 GET /api/schedule/:id - Get Single Schedule (New Route for History)     */
/* -------------------------------------------------------------------------- */
router.get("/schedule/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    res.json({ success: true, schedule });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🧩 POST /api/schedule/generate - Generate schedule                         */
/* -------------------------------------------------------------------------- */
router.post("/schedule/generate", async (req: Request, res: Response) => {
  try {
    const { level } = req.body;
    if (!level)
      return res.status(400).json({ error: "Level number is required." });

    const result = await generateSchedule(level);

    res.json({ success: true, schedules: result.schedules });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🕵️ POST /api/check-impact - Get conflict report                            */
/* -------------------------------------------------------------------------- */
router.post("/check-impact", getScheduleImpactReport);

/* -------------------------------------------------------------------------- */
/* 💾 PUT /api/update/:id - Update schedule grid + create version history      */
/* -------------------------------------------------------------------------- */
router.put("/update/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { grid } = req.body;

    if (!grid)
      return res
        .status(400)
        .json({ success: false, error: "Grid data is missing." });

    const oldSchedule = await Schedule.findById(id);
    if (!oldSchedule)
      return res
        .status(404)
        .json({ success: false, error: "Schedule not found." });

    const oldGrid = JSON.parse(JSON.stringify(oldSchedule.grid));
    const delta = jsondiffpatch.diff(oldGrid, grid);

    if (!delta) {
      return res.json({
        success: true,
        message: "No changes detected.",
        schedule: oldSchedule,
      });
    }

    const nextHistoryVersion = (oldSchedule.history_version || 0) + 1;

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { grid, history_version: nextHistoryVersion },
      { new: true }
    );

    const historyRecord = new ScheduleHistory({
      schedule_id: updatedSchedule!._id,
      history_version: nextHistoryVersion,
      delta,
      user_id: (req as any).user?.id || "COMMITTEE_MEMBER",
      summary: "Manual Grid Edit",
    });
    await historyRecord.save();

    res.json({
      success: true,
      schedule: updatedSchedule,
      historyVersion: nextHistoryVersion,
    });
  } catch (error: any) {
    console.error("❌ Error updating schedule:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 📜 GET /api/schedule/history/:scheduleId - Get schedule version history     */
/* -------------------------------------------------------------------------- */
router.get(
  "/schedule/history/:scheduleId",
  async (req: Request, res: Response) => {
    try {
      const { scheduleId } = req.params;
      const history = await ScheduleHistory.find({ schedule_id: scheduleId })
        .sort({ history_version: -1 })
        .lean();

      res.json({ success: true, history });
    } catch (error: any) {
      console.error("❌ Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch version history." });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* 🚀 POST /schedule/publish/:id - Publish schedule                           */
/* -------------------------------------------------------------------------- */
router.post("/schedule/publish/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);
    if (!schedule)
      return res.status(404).json({ error: "Schedule not found." });

    const newVersion = (schedule.version || 0) + 1;

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { version: newVersion, publishedAt: new Date(), status: "Published" },
      { new: true }
    );

    const recipients =
      newVersion === 1
        ? await User.find({ role: { $in: ["LoadCommittee", "Scheduler"] } })
        : await User.find({});

    const notifications = recipients.map((user) => ({
      userId: user._id,
      title: `Schedule Version ${newVersion} Published`,
      message:
        newVersion === 1
          ? `Initial schedule for Level ${
              updatedSchedule!.level
            } has been published.`
          : `Updated schedule (v${newVersion}) for Level ${
              updatedSchedule!.level
            } is now available.`,
      createdAt: new Date(),
      read: false,
    }));

    await Notification.insertMany(notifications);

    res.json({
      success: true,
      message: `Schedule version ${newVersion} published successfully.`,
      recipients: recipients.length,
      version: newVersion,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: error.message || "Failed to publish schedule" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔄 POST /api/schedule/restore/:scheduleId/:version - Restore schedule       */
/* -------------------------------------------------------------------------- */
router.post(
  "/schedule/restore/:scheduleId/:version",
  async (req: Request, res: Response) => {
    try {
      const { scheduleId, version } = req.params;
      const targetHistoryVersion = parseInt(version);

      if (!scheduleId || isNaN(targetHistoryVersion)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid schedule ID or version." });
      }

      const currentSchedule = await Schedule.findById(scheduleId);
      if (!currentSchedule)
        return res
          .status(404)
          .json({ success: false, error: "Schedule not found." });

      const targetHistoryRecord = await ScheduleHistory.findOne({
        schedule_id: scheduleId,
        history_version: targetHistoryVersion,
      });

      if (!targetHistoryRecord) {
        return res
          .status(404)
          .json({
            success: false,
            error: `Version ${targetHistoryVersion} not found.`,
          });
      }

      const newerVersions = await ScheduleHistory.find({
        schedule_id: scheduleId,
        history_version: { $gt: targetHistoryVersion },
      }).sort({ history_version: -1 });

      let reconstructedGrid = JSON.parse(JSON.stringify(currentSchedule.grid));

      for (const versionRecord of newerVersions) {
        if (versionRecord.delta) {
          reconstructedGrid = jsondiffpatch.unpatch(
            reconstructedGrid,
            versionRecord.delta
          );
        }
      }

      const oldGrid = JSON.parse(JSON.stringify(currentSchedule.grid));
      const newHistoryVersion = (currentSchedule.history_version || 0) + 1;
      const delta = jsondiffpatch.diff(oldGrid, reconstructedGrid);

      if (!delta) {
        return res
          .status(400)
          .json({ success: false, error: "Restore resulted in no change." });
      }

      currentSchedule.grid = reconstructedGrid;
      currentSchedule.history_version = newHistoryVersion;
      await currentSchedule.save();

      const historyRecord = new ScheduleHistory({
        schedule_id: currentSchedule._id,
        history_version: newHistoryVersion,
        delta,
        user_id: (req as any).user?.id || "SYSTEM_RESTORE",
        summary: `Restored to version ${targetHistoryVersion}`,
      });
      await historyRecord.save();

      res.json({
        success: true,
        message: `Successfully restored version ${targetHistoryVersion}`,
        newHistoryVersion,
        schedule: currentSchedule,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          error: error.message || "Failed to restore version.",
        });
    }
  }
);

export default router;
