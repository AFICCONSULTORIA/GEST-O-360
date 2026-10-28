import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [], moduleContext = 'Geral' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem inválida ou ausente' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini API não configurada' });
    }

    const genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'gestao360-copilot',
        }
      }
    });

    const systemInstruction = `
Você é o Agente Gestão 360, o copiloto oficial de inteligência artificial integrado à plataforma Gestão 360.
Sua missão é auxiliar servidores públicos municipais, gestores, fiscais de contrato, auditores de controle interno e secretários a exercerem uma gestão pública eficiente, transparente e em estrita conformidade legal.

DIRETRIZES FUNDAMENTAIS:
1. Domínio da Legislação Brasileira:
   - Nova Lei de Licitações e Contratos Administrativos (Lei nº 14.133/2021)
   - Lei de Responsabilidade Fiscal (LC nº 101/2000)
   - Lei de Acesso à Informação (Lei nº 12.527/2011) e Diretrizes PNTP / ATRICON
   - Marco do Governo Digital (Lei nº 14.129/2021) e LGPD (Lei nº 13.709/2018)
2. Contexto do Usuário:
   - O usuário está atualmente no módulo: "${moduleContext}".
   - Priorize respostas com exemplos e implicações práticas relacionadas a esse módulo quando fizer sentido.
3. Formato das Respostas:
   - Respostas executivas, claras, estruturadas em tópicos ou passos quando aplicável.
   - Use formatação Markdown (negrito, listas, blocos de código se for o caso).
   - Seja cordial, profissional e seguro. Sempre que alertar sobre riscos fiscais ou operacionais, aponte a solução preventiva recomendada.
`;

    // Constrói os conteúdos formatados para o modelo
    const contents: any[] = [];

    // Contexto de sistema
    contents.push({
      role: 'user',
      parts: [{ text: `[INSTRUÇÕES DO SISTEMA]:\n${systemInstruction}` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Entendido. Sou o Agente Gestão 360, copiloto especialista em gestão pública municipal, controle interno e governança. Como posso apoiar os trabalhos agora?' }]
    });

    // Histórico de mensagens anteriores (últimas 6 para otimizar tokens)
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-6);
      for (const item of recentHistory) {
        if (item.sender === 'user') {
          contents.push({
            role: 'user',
            parts: [{ text: item.text }]
          });
        } else if (item.sender === 'agent') {
          contents.push({
            role: 'model',
            parts: [{ text: item.text }]
          });
        }
      }
    }

    // Mensagem atual do usuário com o contexto atual da tela
    contents.push({
      role: 'user',
      parts: [{ text: `[Contexto da tela atual: ${moduleContext}]\n\n${message}` }]
    });

    // Chamada do modelo Gemini
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents
    });

    const reply = result.text || "Desculpe, não consegui processar a resposta no momento. Por favor, tente novamente.";

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error("Erro no Agente Gestão 360:", error);
    return res.status(500).json({
      error: "Falha ao consultar o Agente Gestão 360",
      details: error?.message || String(error)
    });
  }
}
