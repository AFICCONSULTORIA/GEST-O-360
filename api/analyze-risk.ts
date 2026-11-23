import { GoogleGenAI } from "@google/genai";
import { checkRateLimit, isPayloadTooLarge, resolveAllowedOrigin, verifySupabaseAuthHeader } from "./_utils/security";

export default async function handler(req: any, res: any) {
  const allowedOrigin = resolveAllowedOrigin(req.headers?.origin);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifySupabaseAuthHeader(req.headers?.authorization);
  if (!auth.ok) {
    return res.status(auth.status || 401).json({ error: auth.error });
  }

  if (!checkRateLimit(`analyze-risk:${auth.userId}`, 20, 60_000)) {
    return res.status(429).json({ error: 'Limite de requisições excedido. Aguarde um minuto.' });
  }

  try {
    const { context } = req.body || {};
    if (!context || typeof context !== 'string') {
      return res.status(400).json({ error: 'Parâmetro context inválido ou ausente.' });
    }
    if (isPayloadTooLarge(context, 25_000)) {
      return res.status(413).json({ error: 'Cenário excede o limite máximo de 25 KB.' });
    }
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
    
    return res.status(200).json({ analysis: result.text });
  } catch (error) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: "Failed to analyze risk" });
  }
}
