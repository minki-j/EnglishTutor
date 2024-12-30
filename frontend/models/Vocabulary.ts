import mongoose from "mongoose";

export interface IVocabulary {
  id: string;
  type: "vocabulary";
  userId: string;
  input: string;
  definition: string;
  examples: string[];
  createdAt: Date;
}

const VocabularySchema = new mongoose.Schema<IVocabulary>({
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
  definition: {
    type: String,
    required: true,
  },
  examples: {
    type: [String],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const VocabularyModel =
  mongoose.models.Vocabulary || mongoose.model("Vocabulary", VocabularySchema);
