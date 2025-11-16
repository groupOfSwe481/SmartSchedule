import express, { Request, Response } from "express";
import { Rule, IRule } from "../db/models/Rule.js";

const router = express.Router();

/**
 * 📘 GET /api/rules
 * Fetch all rules
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const rules: IRule[] = await Rule.find();
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * 🧩 POST /api/rules
 * Create a new rule
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const newRule = new Rule(req.body);
    const savedRule = await newRule.save();
    res.json({ success: true, data: savedRule });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * ✏️ PUT /api/rules/:id
 * Update existing rule
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const updatedRule = await Rule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updatedRule) {
      return res
        .status(404)
        .json({ success: false, error: "Rule not found" });
    }

    res.json({ success: true, data: updatedRule });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * 🗑️ DELETE /api/rules/:id
 * Delete a rule by ID
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deletedRule = await Rule.findByIdAndDelete(req.params.id);

    if (!deletedRule) {
      return res
        .status(404)
        .json({ success: false, error: "Rule not found" });
    }

    res.json({
      success: true,
      message: "Rule deleted successfully",
      data: deletedRule,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
