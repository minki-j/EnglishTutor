import mongoose from "mongoose";

import { IExtraQuestion } from "./ExtraQuestions";

export interface IBreakdown {
  id: string;
  type: "breakdown";
  userId: string;
  input: string;
  paraphrase: string;
  breakdown: string;
  extraQuestions: IExtraQuestion[];
  createdAt: Date;
}

const BreakdownSchema = new mongoose.Schema<IBreakdown>({
  type: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  input: {
    type: String,
    required: true,
  },
  paraphrase: {
    type: String,
    required: true,
  },
  breakdown: {
    type: String,
    required: true,
  },
  extraQuestions: [
    {
      question: String,
      answer: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const BreakdownModel = mongoose.models.Breakdown ||
  mongoose.model("Breakdown", BreakdownSchema);
