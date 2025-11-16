import express, { Request, Response } from "express";
import Notification from "../db/models/Notification.js";

const router = express.Router();

/**
 * GET /api/notifications/user/:userId
 * Get all notifications for a specific user by their ObjectId
 */
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    console.log("[NOTIFICATIONS API] Fetching notifications for user ObjectId:", userId);

    // Fetch notifications where userId matches the user's _id
    const notifications = await Notification.find({ 
      userId: userId
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log("[NOTIFICATIONS API] Found", notifications.length, "notifications");

    res.json({
      success: true,
      data: notifications
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS API] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch notifications"
    });
  }
});

/**
 * GET /api/notifications/count/:userId
 * Get unread notification count for a user
 */
router.get("/count/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const count = await Notification.countDocuments({
      userId,
      read: false
    });

    res.json({
      success: true,
      count
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS API] Error counting:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to count notifications"
    });
  }
});

/**
 * POST /api/notifications/mark-read
 * Mark all notifications as read for a user
 */
router.post("/mark-read", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    console.log("[NOTIFICATIONS API] Marking all as read for user:", userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required"
      });
    }

    const result = await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    console.log("[NOTIFICATIONS API] Marked", result.modifiedCount, "as read");

    res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS API] Error marking read:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to mark notifications as read"
    });
  }
});

/**
 * POST /api/notifications
 * Create a new notification
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, role, title, message, relatedId } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userId, title, message"
      });
    }

    const notification = new Notification({
      userId,
      role: role || undefined,
      title,
      message,
      relatedId,
      read: false,
      createdAt: new Date()
    });

    await notification.save();

    console.log("[NOTIFICATIONS API] Created notification:", notification._id);

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS API] Error creating:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create notification"
    });
  }
});

console.log("[NOTIFICATIONS API] Routes loaded successfully");

export default router;