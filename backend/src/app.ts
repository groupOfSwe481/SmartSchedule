// backend/src/app.ts
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { connectDB } from "./db/connection.js";
import { config } from "./config/index.js";

// Import models
import "./db/models/Course.js";
import "./db/models/Level.js";
import "./db/models/Rule.js";
import "./db/models/Schedule.js";
import "./db/models/Notification.js";
import "./db/models/Comment.js";

// Import routes
import scheduleRoutes from "./routes/Sschedule.js";
import router from "./routes/schedule.js";
import ruleRoutes from "./routes/ruleRoutes.js";
import authRoutes from "./routes/auth.js";
import irregularRoutes from "./routes/irregularRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import deadlineRoutes from "./routes/deadlineRoutes.js";
import courseRoutes from './routes/courseRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import studentProfileRoutes from "./routes/student-profile.routes.js";
import electiveRoutes from "./routes/elective.routes.js";
import facultyElectiveRoutes from "./routes/faculty-elective.routes.js";
import studentElectiveRoutes from "./routes/student-elective.routes.js";
import levelRoutes from './routes/levelRoutes.js';
import commentRoutes from "./routes/commentRoutes.js";

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "../../")));

// API Routes
app.use("/api", scheduleRoutes);
app.use("/api", router);
app.use("/api/rules", ruleRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/irregulars", irregularRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/deadlines", deadlineRoutes);
app.use('/api', courseRoutes);
app.use('/api', sectionRoutes);
app.use('/api', levelRoutes); // ✅ ADD THIS LINE
app.use("/api/student", studentProfileRoutes);
app.use("/api", electiveRoutes);
app.use("/api/faculty", facultyElectiveRoutes);
app.use("/api", studentElectiveRoutes);
app.use("/api/comments", commentRoutes);

// Export app for Vercel serverless
export default app;

// Only start server if not in Vercel/serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const port = config.PORT || 4000;
  connectDB().then(() => {
    app.listen(port, () => {
      console.log(` Server running on http://localhost:${port}`);
    });
  });
}
