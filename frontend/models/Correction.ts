import mongoose from "mongoose";

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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const CorrectionModel =
  mongoose.models.Correction || mongoose.model("Correction", CorrectionSchema);
