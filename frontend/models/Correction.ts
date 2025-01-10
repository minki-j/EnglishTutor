import mongoose from "mongoose";

import { IExtraQuestion } from "./ExtraQuestions";

export interface ICorrectionItem {
  correction: string;
  explanation: string;
}


export interface ICorrection {
  id: string;
  type: "correction";
  userId: string;
  input: string;
  correctedText: string;
  corrections: ICorrectionItem[];
  extraQuestions: IExtraQuestion[];
  createdAt: Date;
}

const CorrectionSchema = new mongoose.Schema<ICorrection>({
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
  correctedText: {
    type: String,
    required: true,
  },
  corrections: [
    {
      correction: String,
      explanation: String,
    },
  ],
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

export const CorrectionModel =
  mongoose.models.Correction || mongoose.model("Correction", CorrectionSchema);
