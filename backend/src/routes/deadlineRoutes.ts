import express, { Request, Response } from "express";
import Deadline from "../db/models/Deadlines.js";

const router = express.Router();

/**
 * GET /api/deadlines/role/:role
 * Get all active deadlines for a specific role
 */
router.get("/role/:role", async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    
    console.log("[DEADLINES API] Fetching deadlines for role:", role);

    const now = new Date();

    // Find deadlines for this role or "All" roles
    // Only get active deadlines that haven't passed yet
    const deadlines = await Deadline.find({
      $or: [
        { role: role },
        { role: "All" }
      ],
      is_active: { $ne: false }
    })
      .sort({ time: 1, time_start: 1 })
      .limit(20)
      .lean();

    console.log("[DEADLINES API] Found", deadlines.length, "deadlines");

    // Format deadlines for frontend
    const formattedDeadlines = deadlines.map(deadline => ({
      _id: deadline._id,
      task: deadline.task,
      type: deadline.type || deadline.role,
      time: deadline.time,
      time_start: deadline.time_start,
      time_end: deadline.time_end,
      start_date: deadline.start_date,
      end_date: deadline.end_date,
      description: deadline.description,
      is_active: deadline.is_active
    }));

    res.json({
      success: true,
      data: formattedDeadlines
    });
  } catch (error: any) {
    console.error("[DEADLINES API] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch deadlines"
    });
  }
});

/**
 * GET /api/deadlines
 * Get all active deadlines (admin/scheduler view)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const deadlines = await Deadline.find({ is_active: { $ne: false } })
      .sort({ time: 1, time_start: 1 })
      .lean();

    res.json({
      success: true,
      data: deadlines
    });
  } catch (error: any) {
    console.error("[DEADLINES API] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch deadlines"
    });
  }
});

/**
 * POST /api/deadlines
 * Create a new deadline
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { task, type, role, time, time_start, time_end, start_date, end_date, description } = req.body;

    if (!task || !role) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: task and role"
      });
    }

    const deadline = new Deadline({
      task,
      type: type || role,
      role,
      time: time ? new Date(time) : undefined,
      time_start: time_start ? new Date(time_start) : undefined,
      time_end: time_end ? new Date(time_end) : undefined,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      description: description || "",
      is_active: true
    });

    await deadline.save();

    console.log("[DEADLINES API] Created deadline:", deadline._id);

    res.status(201).json({
      success: true,
      data: deadline
    });
  } catch (error: any) {
    console.error("[DEADLINES API] Error creating:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create deadline"
    });
  }
});

/**
 * PUT /api/deadlines/:id
 * Update a deadline
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert date strings to Date objects
    if (updateData.time) updateData.time = new Date(updateData.time);
    if (updateData.time_start) updateData.time_start = new Date(updateData.time_start);
    if (updateData.time_end) updateData.time_end = new Date(updateData.time_end);
    if (updateData.start_date) updateData.start_date = new Date(updateData.start_date);
    if (updateData.end_date) updateData.end_date = new Date(updateData.end_date);

    const deadline = await Deadline.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!deadline) {
      return res.status(404).json({
        success: false,
        error: "Deadline not found"
      });
    }

    console.log("[DEADLINES API] Updated deadline:", id);

    res.json({
      success: true,
      data: deadline
    });
  } catch (error: any) {
    console.error("[DEADLINES API] Error updating:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update deadline"
    });
  }
});

/**
 * DELETE /api/deadlines/:id
 * Delete a deadline
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deadline = await Deadline.findByIdAndDelete(id);

    if (!deadline) {
      return res.status(404).json({
        success: false,
        error: "Deadline not found"
      });
    }

    console.log("[DEADLINES API] Deleted deadline:", id);

    res.json({
      success: true,
      message: "Deadline deleted successfully"
    });
  } catch (error: any) {
    console.error("[DEADLINES API] Error deleting:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete deadline"
    });
  }
});

console.log("[DEADLINES API] Routes loaded successfully");

export default router;