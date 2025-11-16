// backend/src/db/connection.ts
// HYBRID: Supports both Mongoose (for friend's code) and Native MongoDB (for your code)

import mongoose from "mongoose";
import { MongoClient, Db } from 'mongodb';
import { config } from "../config/index.js";

// Import friend's Mongoose models
import "../db/models/Course.js";
import "../db/models/Level.js";
import "../db/models/Rule.js";
import "../db/models/Schedule.js";
import "../db/models/Notification.js";
import "../db/models/Student.js";

// ==========================================
// NATIVE MONGODB (for your external dept code)
// ==========================================
let nativeClient: MongoClient | null = null;
let nativeDb: Db | null = null;

export async function connectNativeMongoDB(): Promise<Db> {
  try {
    if (nativeDb) {
      console.log('âœ… Native MongoDB already connected');
      return nativeDb;
    }

    if (!config.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in config");
    }

    nativeClient = new MongoClient(config.MONGO_URI);
    await nativeClient.connect();
    
    // Extract database name from URI or use default
    const dbName = extractDbName(config.MONGO_URI) || 'SamrtSchedular';
    nativeDb = nativeClient.db(dbName);
    
    console.log(`âœ… Native MongoDB connected to: ${dbName}`);
    return nativeDb;
  } catch (error) {
    console.error('âŒ Native MongoDB connection failed:', error);
    throw error;
  }
}

export function getDB(): Db {
  if (!nativeDb) {
    throw new Error('Native MongoDB not initialized. Call connectNativeMongoDB first.');
  }
  return nativeDb;
}

function extractDbName(uri: string): string | null {
  try {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// ==========================================
// MONGOOSE (for friend's existing code)
// ==========================================
export const connectDB = async () => {
  try {
    if (!config.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in config");
    }

    await mongoose.connect(config.MONGO_URI);
    console.log("âœ… Mongoose connected to MongoDB");
    console.log(`âœ… Mongoose database: '${mongoose.connection.name}'`);
    
    // Also connect native MongoDB for external dept features
    await connectNativeMongoDB();
    
  } catch (err) {
    console.error("âŒ Database connection failed:", err);
    process.exit(1);
  }
};

// ==========================================
// CLEANUP
// ==========================================
export async function closeConnections(): Promise<void> {
  try {
    if (nativeClient) {
      await nativeClient.close();
      console.log('Native MongoDB connection closed');
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Mongoose connection closed');
    }
  } catch (error) {
    console.error('Error closing connections:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeConnections();
  process.exit(0);
});
