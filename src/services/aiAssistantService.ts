import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export interface SendMessageOptions {
  message: string;
  history: ChatMessage[];
  moduleContext: string;
}

// Sugestões inteligentes personalizadas por módulo da administração pública
export const MODULE_SUGGESTIONS: Record<string, string[]> = {
  Contracts: [
    "Como funciona o reajuste de preços na Lei 14.133/21?",
    "Quais as exigências para prorrogar contrato de serviço contínuo?",
    "O que deve constar obrigatoriamente no Termo Aditivo?"
  ],
  Orders: [
    "Quais os limites atuais de dispensa de licitação por valor?",
    "Como elaborar uma pesquisa de preços válida conforme a IN?",
    "O que é indispensável no Estudo Técnico Preliminar (ETP)?"
  ],
  Controls: [
    "Quais os prazos da LRF para o RGF e RREO neste quadrimestre?",
    "Como estruturar o parecer prévio do Controle Interno?",
    "Quais os pontos críticos de fiscalização no abastecimento de frotas?"
  ],
  Risk: [
    "Como montar a Matriz de Riscos para uma nova contratação?",
    "Como classificar a probabilidade e o impacto de risco de inadimplência?",
    "Quais medidas mitigatórias adotar para riscos de TI e LGPD?"
  ],
  PNTP: [
    "Quais são os itens obrigatórios para selo Ouro/Diamante no Radar ATRICON?",
    "Como publicar a folha de pagamento respeitando a LGPD?",
    "Qual o prazo máximo para publicação de despesas no portal da transparência?"
  ],
  AdminFinancas: [
    "Qual o teto de gastos com pessoal pelo Poder Executivo na LRF?",
    "Como calcular o índice de liquidez para restos a pagar?",
    "Como conciliar repasses constitucionais (FPM, ICMS, Fundeb)?"
  ],
  Saude: [
    "Quais são os critérios de controle de estoque na Farmácia Básica?",
    "Como comprovar a aplicação dos 15% constitucionais em Saúde?",
    "Quais os requisitos para concessão de TFD (Tratamento Fora de Domicílio)?"
  ],
  ConsultorioMedico: [
    "Quais são os critérios de preenchimento do método SOAP no prontuário?",
    "Como funciona a sincronização automática da receita com a Farmácia Municipal?",
    "Quais exames laboratoriais básicos para investigação de hipertensão e diabetes?"
  ],
  Education: [
    "Qual a regra de aplicação dos 25% em Manutenção e Desenvolvimento do Ensino?",
    "Como fiscalizar os recursos do PNAE (Alimentação Escolar)?",
    "Quais os critérios de aplicação dos recursos do FUNDEB na folha?"
  ],
  Ouvidoria: [
    "Qual o prazo legal de resposta ao cidadão pela Lei 13.460/2017?",
    "Como proceder em caso de manifestações anônimas de denúncia?",
    "Como estruturar o Relatório de Gestão da Ouvidoria Municipal?"
  ],
  Patrimonio: [
    "Como realizar o inventário anual de bens móveis e imóveis?",
    "Qual o procedimento correto para baixa e leilão de bens inservíveis?",
    "Como calcular a depreciação de bens públicos municipais?"
  ],
  Geral: [
    "Quais as principais obrigações fiscais do município neste mês?",
    "Como auditar um processo de pagamento antes da liquidação?",
    "Como o Gestão 360 auxilia a evitar apontamentos no Tribunal de Contas?"
  ]
};

export function getSuggestionsForModule(moduleName?: string): string[] {
  if (!moduleName) return MODULE_SUGGESTIONS['Geral'];
  return MODULE_SUGGESTIONS[moduleName] || MODULE_SUGGESTIONS['Geral'];
}

/**
 * Envia uma mensagem para o Agente Gestão 360.
 * Tenta primeiro a rota de backend /api/chat-assistant.
 * Se houver falha de rede ou rota inexistente (ex: Vite dev puro), faz fallback direto via SDK com a chave local.
 */
export async function sendMessageToAgent({
  message,
  history,
  moduleContext
}: SendMessageOptions): Promise<string> {
  // 1. Tentar via API backend
  try {
    const res = await fetch('/api/chat-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        history: history.map(h => ({ sender: h.sender, text: h.text })),
        moduleContext
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.reply) {
        return data.reply;
      }
    }
  } catch (backendError) {
    console.warn("Backend /api/chat-assistant indisponível, usando fallback de cliente:", backendError);
  }

  // 2. Fallback direto com o SDK do Gemini no cliente
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chave do Gemini não encontrada. Configure VITE_GEMINI_API_KEY no arquivo .env.");
  }

  const genAI = new GoogleGenAI({ apiKey });

  const systemInstruction = `
Você é o Agente Gestão 360, o copiloto oficial de inteligência artificial da plataforma Gestão 360.
Você assessora servidores públicos, auditores e secretários municipais no Brasil.
Legislações principais: Lei 14.133/21 (Licitações), LC 101/00 (LRF), Lei 12.527/11 (LAI) e critérios PNTP/ATRICON.
Contexto atual da tela: "${moduleContext}".
Responda de forma clara, técnica, estruturada em tópicos executivos com formatação Markdown.
`;

  const contents: any[] = [
    { role: 'user', parts: [{ text: `[INSTRUÇÕES DO SISTEMA]: ${systemInstruction}` }] },
    { role: 'model', parts: [{ text: 'Entendido. Sou o Agente Gestão 360, pronto para orientar os procedimentos municipais.' }] }
  ];

  const recentHistory = history.slice(-6);
  for (const item of recentHistory) {
    contents.push({
      role: item.sender === 'user' ? 'user' : 'model',
      parts: [{ text: item.text }]
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: `[Tela Atual: ${moduleContext}]\n\n${message}` }]
  });

  const result = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents
  });

  return result.text || "Sem resposta do modelo.";
}
