import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Controle 360 API is running" });
  });

  // Example Gemini endpoint for Risk Analysis
  app.post("/api/analyze-risk", async (req, res) => {
    try {
      const { context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const genAI = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
        Você é um Auditor Sênior de Controle Interno Municipal especializado em legislação brasileira (LRF, Nova Lei de Licitações, etc).
        Analise o cenário abaixo e retorne um parecer técnico estruturado em:
        1. RISCOS IDENTIFICADOS (Aponta gravidade e impacto)
        2. FUNDAMENTAÇÃO LEGAL (Cite leis ou normas brasileiras relevantes)
        3. PLANO DE AÇÃO (Passos práticos para regularização)
        
        Cenário: ${context}
      `;
      
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      res.json({ analysis: result.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to analyze risk" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
