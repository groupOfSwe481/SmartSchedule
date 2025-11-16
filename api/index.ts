import app from '../backend/dist/app.js';
import { connectDB } from '../backend/dist/db/connection.js';

// Initialize database connection
let dbInitialized = false;

export default async function handler(req: any, res: any) {
  // Connect to database on first request (cold start)
  if (!dbInitialized) {
    try {
      await connectDB();
      dbInitialized = true;
      console.log('✅ Database connected in serverless function');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
    }
  }

  // Handle the request with Express app
  return app(req, res);
}
