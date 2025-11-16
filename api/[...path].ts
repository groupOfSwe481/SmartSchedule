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
      res.status(500).json({ error: 'Database connection failed' });
      return;
    }
  }

  // Handle the request with Express app
  // Express app expects (req, res, next) but Vercel provides (req, res)
  return new Promise((resolve, reject) => {
    app(req, res, (err: any) => {
      if (err) {
        console.error('Express error:', err);
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}
