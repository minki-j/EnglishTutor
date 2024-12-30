import mongoose from "mongoose";

export interface IBreakdown {
  id: string;
  type: "breakdown";
  userId: string;
  input: string;
  breakdown: string;
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
  breakdown: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const BreakdownModel = mongoose.models.Breakdown ||
  mongoose.model("Breakdown", BreakdownSchema);
