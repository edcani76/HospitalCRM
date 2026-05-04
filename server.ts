import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const { message, conversationHistory = [] } = req.body;

      const systemPrompt = "You are edvirontvet AI, a veterinary health assistant. You help pet owners and veterinary professionals with pet health questions, symptom analysis, and medication information. Always include a disclaimer that your advice does not replace professional veterinary consultation. Be friendly and concise.";

      const contents = [
        { role: "user" as const, parts: [{ text: systemPrompt }] },
        { role: "model" as const, parts: [{ text: "Understood! I'm edvirontvet AI, your veterinary health assistant. How can I help you and your furry friend today? 🐾" }] },
        ...conversationHistory.map((m: any) => ({
          role: m.role === "assistant" ? "model" as const : "user" as const,
          parts: [{ text: m.content }],
        })),
        { role: "user" as const, parts: [{ text: message }] },
      ];

      const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents });
      res.json({ success: true, data: { response: response.text } });
    } catch (error: any) {
      console.error("AI error:", error);
      res.json({ success: false, message: error.message || "AI service error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
