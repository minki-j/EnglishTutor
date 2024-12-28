import mongoose from "mongoose";

export interface IVocabulary {
  id: string;
  type: "vocabulary";
  userId: string;
  vocabulary: string;
  definition: string;
  examples: Array<{
    example: string;
  }>;
  createdAt: Date;
}

const VocabularySchema = new mongoose.Schema<IVocabulary>({
  userId: {
    type: String,
    required: true,
  },
  vocabulary: {
    type: String,
    required: true,
  },
  definition: {
    type: String,
    required: true,
  },
  examples: [{
    example: {
      type: String,
      required: true,
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const VocabularyModel =
  mongoose.models.Vocabulary || mongoose.model("Vocabulary", VocabularySchema);
