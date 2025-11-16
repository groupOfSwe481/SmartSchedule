import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

/**
 * 🧩 TypeScript interface for strong typing
 */
export interface IUser extends Document {
  userID: number;
  First_Name: string;
  Last_Name: string;
  Email: string;
  Password: string;
  role: "Faculty" | "Scheduler" | "LoadCommittee" | "Student";
  comments: mongoose.Types.ObjectId[];
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * 🗃️ User Schema
 * Mirrors the existing MongoDB documents exactly
 * with enhancements for auto-generating userID and supporting Student role.
 */
const UserSchema = new Schema<IUser>(
  {
    userID: {
      type: Number,
      required: true,
      unique: true,
    },
    First_Name: {
      type: String,
      required: true,
      trim: true,
    },
    Last_Name: {
      type: String,
      required: true,
      trim: true,
    },
    Email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    },
    Password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      required: true,
      enum: ["Faculty", "Scheduler", "LoadCommittee", "Student"], // 👈 Added Student
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: [],
      },
    ],
  },
  {
    collection: "User", // 👈 Match your existing MongoDB collection name
    timestamps: true,
  }
);

/**
 * 🔌 Indexes for efficient lookup
 */
UserSchema.index({ userID: 1 });
UserSchema.index({ Email: 1 });

/**
 * 🧠 Pre-save hook to auto-generate userID if not provided
 */
UserSchema.pre<IUser>("validate", async function (next) {
  if (this.isNew && !this.userID) {
    const lastUser = await User.findOne({}, { userID: 1 })
      .sort({ userID: -1 })
      .lean();
    this.userID = lastUser ? lastUser.userID + 1 : 1;
  }
  next();
});

/**
 * 🔒 Pre-save hook to hash password before saving
 */
UserSchema.pre<IUser>("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("Password")) return next();

  try {
    // Generate salt and hash password
    const saltRounds = 12; // Higher = more secure but slower
    const hashedPassword = await bcrypt.hash(this.Password, saltRounds);
    this.Password = hashedPassword;
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * 🔍 Instance method to compare passwords
 */
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.Password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

/**
 * 📤 Export the model
 */
export const User = mongoose.model<IUser>("User", UserSchema);