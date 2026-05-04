import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
  });

  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.json({ success: true, data: { response: "AI assistant is not configured. Please set GEMINI_API_KEY in your .env file.", isDemo: true } });
      
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const ai = new GoogleGenerativeAI({ apiKey });
      const { message, conversationHistory = [] } = req.body;
      
      const systemPrompt = "You are edvirontvet AI, a veterinary health assistant. You help pet owners and veterinary professionals with pet health questions, symptom analysis, and medication information. Always include a disclaimer that your advice does not replace professional veterinary consultation. Be friendly and concise.";
      
      const contents = [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood! I'm edvirontvet AI, your veterinary health assistant. How can I help you and your furry friend today? 🐾" }] },
        ...conversationHistory.map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        })),
        { role: "user", parts: [{ text: message }] }
      ];
      
      const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents });
      res.json({ success: true, data: { response: response.text } });
    } catch (error: any) {
      console.error("AI error:", error);
      res.json({ success: false, message: error.message || "AI service error" });
    }
  });

  // Serve pre-built frontend if exists
  const distPath = path.join(process.cwd(), 'dist');
  try {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } catch (e) {
    console.log("No dist/ folder found, API only mode");
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
