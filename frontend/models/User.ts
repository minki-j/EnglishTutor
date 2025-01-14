import mongoose from "mongoose";

export interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  image?: string;
  motherTongue?: string;
  englishLevel?: string;
  aboutMe?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<User>({
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  image: {
    type: String,
  },
  motherTongue: {
    type: String,
  },
  englishLevel: {
    type: String,
  },
  aboutMe: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
