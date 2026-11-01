import { GoogleGenAI } from '@google/genai';
import { GESTAO_360_SYSTEM_INSTRUCTION } from './_prompts/gestao360Prompt';

export const config = {
  runtime: 'edge', // Execução ultra-rápida na Vercel com streaming nativo
};

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface RequestBody {
  message: string;
  history?: ChatMessage[];
  currentPath?: string;
  userData?: {
    name?: string;
    role?: string;
    municipio?: string;
  };
}

export default async function handler(req: Request) {
  // CORS para Edge
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Configuração ausente: GEMINI_API_KEY não definida no servidor.' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const { message, history = [], currentPath = '/', userData } = body;

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Mensagem inválida ou ausente.' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Injeção de Contexto Dinâmico do Servidor Público
    const dynamicContext = `
DADOS DO USUÁRIO EM ATENDIMENTO:
- Nome do Servidor: ${userData?.name || 'Servidor(a)'}
- Perfil / Secretaria: ${userData?.role || 'Geral'}
- Município / Instância: ${userData?.municipio || 'Prefeitura Municipal'}
- Tela / Rota onde o servidor está navegando no momento: ${currentPath}
`;

    const fullSystemInstruction = `${GESTAO_360_SYSTEM_INSTRUCTION}\n\n${dynamicContext}`;

    // Mapeamento do histórico para a API do Gemini
    const contents = [
      ...history.map((msg) => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    // Chamada do modelo Gemini com Streaming e resiliência de modelos
    const modelsToTry = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let responseStream: any = null;
    let streamError: any = null;

    for (const modelName of modelsToTry) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction: fullSystemInstruction,
            temperature: 0.6, // Balanço ideal entre precisão nas regras e naturalidade na fala
          },
        });
        if (responseStream) break;
      } catch (err: any) {
        streamError = err;
        console.warn(`Tentativa com ${modelName} no Edge falhou:`, err?.message || err);
      }
    }

    if (!responseStream) {
      throw streamError || new Error('Não foi possível inicializar streaming com os modelos Gemini.');
    }

    // Stream de transformação para processar texto e extrair <<<ACTION:...>>> em tempo real
    const encoder = new TextEncoder();
    let accumulatedText = '';
    const actionRegex = /<<<ACTION:([\s\S]*?)>>>/;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const rawChunkText = chunk.text;
            if (!rawChunkText) continue;

            accumulatedText += rawChunkText;

            // Se o chunk ainda não fechou ou começou uma ação, envia o texto regular
            if (!accumulatedText.includes('<<<ACTION:')) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: rawChunkText })}\n\n`)
              );
            } else {
              // Se detectou o início de uma ação, aguarda fechar o delimitador >>>
              const actionMatch = accumulatedText.match(actionRegex);
              if (actionMatch) {
                const actionJsonRaw = actionMatch[1];
                try {
                  const parsedAction = JSON.parse(actionJsonRaw);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'action', action: parsedAction })}\n\n`)
                  );
                } catch {
                  // Fallback se o JSON estiver incompleto ou com erro de sintaxe
                  console.warn('Falha no parse do payload de ação:', actionJsonRaw);
                }
                // Limpa o marcador de ação do texto acumulado para evitar duplicação
                accumulatedText = accumulatedText.replace(actionMatch[0], '');
              }
            }
          }

          // Sinaliza encerramento do stream
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (streamError) {
          controller.error(streamError);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Erro na execução do chat-assistant:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno ao processar atendimento inteligente.',
        details: error?.message || String(error),
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}
