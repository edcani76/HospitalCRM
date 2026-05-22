import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import multer from "multer";
import type { Multer } from "multer";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || "";
const GOOGLE_DRIVE_FOLDER_ID = process.env.VITE_GOOGLE_DRIVE_FOLDER_ID || "";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const storage = multer.memoryStorage();
const upload: Multer = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

async function getOrCreateNestedFolder(token: string, paths: string[]): Promise<string> {
  let parentId = GOOGLE_DRIVE_FOLDER_ID;

  for (const folderName of paths) {
    const safeName = folderName.replace(/[/\\?%*:|"<>]/g, "-").trim();
    if (!safeName) continue;

    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(safeName)}'+and+mimeType='application/vnd.google-apps.folder'+and+'${parentId}'+in+parents+and+trashed=false&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!listResponse.ok) throw new Error(`Failed to search for folder: ${safeName}`);

    const listData = await listResponse.json();
    if (listData.files?.length > 0) {
      parentId = listData.files[0].id;
      continue;
    }

    const createResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: safeName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    });

    if (!createResponse.ok) throw new Error(`Failed to create folder: ${safeName}`);

    const createData = await createResponse.json();
    parentId = createData.id;
  }

  return parentId;
}

async function getAccessToken(): Promise<string> {
  const refreshToken = GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("No Google Drive refresh token configured. Go to Settings > Google Drive to authorize.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to get access token: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST (before static files)
  app.get("/api/health", (req: express.Request, res: express.Response) => {
    res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
  });

  app.get("/api/drive/status", async (req: express.Request, res: express.Response) => {
    const hasRefreshToken = !!GOOGLE_DRIVE_REFRESH_TOKEN;
    const hasFolder = !!GOOGLE_DRIVE_FOLDER_ID;
    res.json({
      connected: hasRefreshToken,
      hasFolder,
      folderId: GOOGLE_DRIVE_FOLDER_ID || null,
    });
  });

  app.post("/api/ai/chat", async (req: express.Request, res: express.Response) => {
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

  app.get("/api/auth/google-drive/connect", (req: express.Request, res: express.Response) => {
    // Handle proxy/load balancer scenarios for redirect URI
    const forwardedHost = req.get('x-forwarded-host');
    const forwardedProto = req.get('x-forwarded-proto');
    const redirectHost = forwardedHost || req.get('host');
    const redirectProto = forwardedProto || req.protocol;
    const redirectUri = `${redirectProto}://${redirectHost}/api/auth/google-drive/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/drive.file&response_type=code&access_type=offline&prompt=consent`;
    console.log("[GDrive] Connect: Redirect URI will be:", redirectUri);
    res.redirect(authUrl);
  });

  app.get("/api/auth/google-drive/callback", async (req: express.Request, res: express.Response) => {
    const code = req.query.code as string;
    const error = req.query.error as string;
    
    // Handle proxy/load balancer scenarios
    const forwardedHost = req.get('x-forwarded-host');
    const forwardedProto = req.get('x-forwarded-proto');
    const frontendHost = forwardedHost || req.get('host');
    const frontendProtocol = forwardedProto || req.protocol;
    
    // Frontend URL for redirects after OAuth
    const frontendUrl = process.env.FRONTEND_URL || 
      `${frontendProtocol}://${frontendHost}`;
    
    // The callback redirect URI that Google will use (must match Google Cloud Console)
    const callbackRedirectUri = `${frontendProtocol}://${frontendHost}/api/auth/google-drive/callback`;
    
    console.log("[GDrive] Callback - Frontend URL:", frontendUrl);
    console.log("[GDrive] Callback - Callback Redirect URI:", callbackRedirectUri);
    console.log("[GDrive] Callback - Error param:", error);
    console.log("[GDrive] Callback - Has code:", !!code);

    if (error) {
      return res.redirect(`${frontendUrl}/crm/settings?drive_error=${error}`);
    }

    if (!code) {
      return res.redirect(`${frontendUrl}/crm/settings?drive_error=no_code`);
    }

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: callbackRedirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        console.error("Token exchange failed:", errText);
        return res.redirect(`${frontendUrl}/crm/settings?drive_error=token_failed`);
      }

      const tokenData = await tokenResponse.json();
      console.log("[GDrive] Refresh token received, expires_in:", tokenData.expires_in);

      return res.redirect(`${frontendUrl}/crm/settings?drive_success=true&refresh_token=${tokenData.refresh_token}`);
    } catch (err: any) {
      console.error("Token exchange error:", err);
      return res.redirect(`${frontendUrl}/crm/settings?drive_error=exchange_failed`);
    }
  });

  app.post("/api/upload-to-drive", upload.single("file") as any, async (req: any, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: "No file provided" });
      }

      const { ownerName, petName, fileType } = req.body as { ownerName: string; petName: string; fileType: string };
      if (!ownerName || !petName) {
        return res.status(400).json({ success: false, message: "ownerName and petName are required" });
      }

      console.log(`[GDrive] Upload: ${ownerName}/${petName}/${fileType || 'photos'}/${file.originalname}`);

      const token = await getAccessToken();
      const folderPath = [ownerName, petName, fileType || "photos"];
      const folderId = await getOrCreateNestedFolder(token, folderPath);

      const ext = file.originalname.includes(".") ? "" : ".jpg";
      const fileName = file.originalname.includes(".") ? file.originalname : `${petName}${ext}`;

      const metadata = {
        name: fileName,
        mimeType: file.mimetype || "application/octet-stream",
        parents: [folderId],
      };

      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", new Blob([file.buffer], { type: file.mimetype }));

      const uploadResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        console.error("[GDrive] Upload failed:", error);
        return res.status(500).json({ success: false, message: error.error?.message || "Upload failed" });
      }

      const uploadData = await uploadResponse.json();
      console.log("[GDrive] Upload successful:", uploadData.id);

      await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      });

      console.log("[GDrive] Permissions set for file:", uploadData.id);

      const imageUrl = `https://drive.google.com/thumbnail?id=${uploadData.id}&sz=w1000`;

      res.json({
        success: true,
        data: {
          fileId: uploadData.id,
          webViewLink: uploadData.webViewLink,
          downloadUrl: imageUrl,
        },
      });
    } catch (error: any) {
      console.error("[GDrive] Server upload error:", error);
      res.status(500).json({ success: false, message: error.message || "Upload error" });
    }
  });

  app.post("/api/send-email", async (req: express.Request, res: express.Response) => {
    try {
      const { to, subject, html } = req.body;
      if (!to || !subject || !html) {
        return res.status(400).json({ success: false, message: "Missing required fields: to, subject, html" });
      }
      const recipients = Array.isArray(to) ? to : [to];
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[Email] SMTP credentials not configured — skipping email");
        return res.json({ success: false, message: "SMTP not configured" });
      }
      const info = await transporter.sendMail({
        from: `"EdvirontMed" <${process.env.SMTP_USER}>`,
        to: recipients,
        subject,
        html,
      });
      console.log("[Email] Sent:", subject, "to:", recipients.join(", "), "messageId:", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("[Email] Error:", error);
      res.status(500).json({ success: false, message: error.message || "Email send failed" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
