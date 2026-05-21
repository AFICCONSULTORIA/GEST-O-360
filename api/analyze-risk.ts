import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    
    return res.status(200).json({ analysis: result.text });
  } catch (error) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: "Failed to analyze risk" });
  }
}
