import mongoose from 'mongoose';

const CorrectionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  originalText: {
    type: String,
    required: true,
  },
  correctedText: {
    type: String,
    required: true,
  },
  corrections: [{
    correction: String,
    explanation: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Correction || mongoose.model('Correction', CorrectionSchema); 