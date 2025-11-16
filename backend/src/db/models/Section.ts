import mongoose, { Schema } from "mongoose";

const SectionSchema = new Schema({
  sec_num: String,
  classroom: String,
  max_Number: Number,
  time_Slot: [String],
  course: String, // or mongoose.Schema.Types.ObjectId if linked
});

export const Section = mongoose.model("Section", SectionSchema, "Section");
