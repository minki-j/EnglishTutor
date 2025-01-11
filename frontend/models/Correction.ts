import mongoose from "mongoose";

import { IExtraQuestion } from "./ExtraQuestions";
import { EntryType } from "./EntryType";

export interface ICorrectionItem {
  correction: string;
  explanation: string;
}

/**
 * Represents a correction entry
 */
export interface ICorrection {
  id: string;
  type: EntryType;
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
    enum: [EntryType.CORRECTION],
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
