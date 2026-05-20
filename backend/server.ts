import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// --- MongoDB User Schema & Model ---
const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  email: { type: String, required: true },
  photoURL: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Establish MongoDB Atlas Connection
  if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => console.log("Successfully connected to MongoDB Atlas! 🎉"))
      .catch((err) => console.error("MongoDB Atlas connection error ❌:", err));
  } else {
    console.warn("⚠️ MONGODB_URI is not defined in environment variables.");
  }

  // Enable CORS so the React frontend on Vercel can securely talk to this API
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // --- API Routes ---
  
  // Base Health Check
  app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "IgniteXT API is healthy and running!" });
  });

  // User Profile Upsert Route (triggered upon successful Google Login)
  app.post("/api/auth/google", async (req, res) => {
    const { uid, displayName, email, photoURL } = req.body;
    
    if (!uid || !email) {
      return res.status(400).json({ success: false, message: "Missing uid or email credentials" });
    }

    try {
      // Find user by unique Google ID, update profile info, or create a new user profile
      const user = await User.findOneAndUpdate(
        { uid },
        { 
          displayName, 
          email, 
          photoURL,
          lastLogin: new Date()
        },
        { new: true, upsert: true }
      );
      
      console.log(`Successfully synced user profile in MongoDB: ${email} 👤`);
      res.json({ success: true, user });
    } catch (err) {
      console.error("Error saving user to MongoDB:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
