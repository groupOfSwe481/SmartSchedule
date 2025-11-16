import mongoose, { Schema, Document } from "mongoose";

export interface IRule extends Document {
  rule_name: string;
  rule_description: string;
}

const RuleSchema: Schema = new Schema({
  rule_name: {
    type: String,
    required: true,
    trim: true,
  },
  rule_description: {
    type: String,
    required: true,
    trim: true,
  },
});

export const Rule = mongoose.model<IRule>("Rule", RuleSchema, "Rule");
