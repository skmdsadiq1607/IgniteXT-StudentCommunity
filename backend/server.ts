import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Enable CORS so the React frontend on Vercel can securely talk to this API
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "IgniteXT API is healthy and running!" });
  });

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
