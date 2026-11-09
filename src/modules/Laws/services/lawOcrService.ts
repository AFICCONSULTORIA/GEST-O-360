import { GoogleGenAI } from '@google/genai';
import { LawType, LawCategory, LawStatus, LawOriginPower } from '../../../types';

export interface ExtractedBudgetRow {
  titulo?: string;
  orgao?: string;
  unidade?: string;
  funcao?: string;
  subfuncao?: string;
  programa?: string;
  projeto_atividade?: string;
  natureza_despesa?: string;
  fonte_recurso?: string;
  ficha?: string;
  valor?: string;
}

export interface LawOcrResult {
  numero: string;
  ano: string;
  tipo: LawType;
  categoria: LawCategory;
  status: LawStatus;
  origem_poder: LawOriginPower;
  data_publicacao: string;
  titulo: string;
  autor: string;
  ementa: string;
  materia_numero?: string;
  tags: string[];
  texto_integral: string;
  resumo_artigos?: string;
  valor_total_credito?: string;
  tipo_credito?: string;
  tabelas_orcamento?: ExtractedBudgetRow[];
  confidence?: 'alta' | 'media' | 'baixa';
}

/**
 * Converte um objeto File (PDF, PNG, JPG) para string Base64 limpa
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Gera um título temático descritivo a partir da ementa caso o título seja apenas o número da lei
 */
export function buildDescriptiveLawTitle(rawTitle: string, ementa: string, tipo: string, numero: string, ano: string): string {
  const cleanTitle = (rawTitle || '').trim();
  const isJustNumber = !cleanTitle || /^(lei|decreto|portaria|resolução|emenda)\s+(ordinária\s+|complementar\s+|municipal\s+)?(nº|n°|n\.º|num)?\s*[\d./\s-]+$/i.test(cleanTitle);

  if (!isJustNumber && cleanTitle.length > 10) {
    return cleanTitle;
  }

  if (ementa && ementa.trim().length > 10) {
    let desc = ementa
      .trim()
      .replace(/^["“']+|["”'.]+$/g, '')
      .replace(/^(dispõe\s+sobre\s+(a\s+autorização\s+de\s+|a\s+|o\s+|os\s+|as\s+)?|autoriza\s+o\s+poder\s+executivo\s+(municipal\s+)?a\s+|institui\s+(o\s+|a\s+)?|altera\s+(dispositivos\s+da\s+|a\s+|o\s+)?)/i, '')
      .replace(/,?\s*e\s+dá\s+outras\s+providências\.?$/i, '')
      .trim();

    if (desc.length > 0) {
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);
      return desc.length > 110 ? desc.slice(0, 107) + '...' : desc;
    }
  }

  return `${tipo} nº ${numero}/${ano}`;
}

/**
 * Executa uma promessa com timeout estrito para evitar travamentos de rede
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Normaliza o objeto JSON retornado pela IA para LawOcrResult
 */
function normalizeParsedOcrResult(parsed: any): LawOcrResult {
  const rawNum = String(parsed.numero || '').trim();
  const numDigits = rawNum.split('/')[0].replace(/\D+/g, '') || '1';
  const ano = String(parsed.ano || (rawNum.includes('/') ? rawNum.split('/')[1] : '') || new Date().getFullYear()).replace(/\D+/g, '') || String(new Date().getFullYear());
  const formattedNumber = `${numDigits}/${ano}`;
  const tipo: LawType = (parsed.tipo as LawType) || 'Lei Ordinária';
  const ementa = String(parsed.ementa || '').replace(/^["“']+|["”']+$/g, '').trim();
  const titulo = buildDescriptiveLawTitle(parsed.titulo, ementa, tipo, numDigits, ano);

  return {
    numero: formattedNumber,
    ano,
    tipo,
    categoria: (parsed.categoria as LawCategory) || 'Administração Geral',
    status: (parsed.status as LawStatus) || 'Em Vigor',
    origem_poder: parsed.origem_poder === 'legislativo' ? 'legislativo' : 'executivo',
    data_publicacao: parsed.data_publicacao || `${ano}-01-01`,
    titulo,
    autor: parsed.autor || 'Prefeito Municipal',
    ementa,
    materia_numero: parsed.materia_numero || undefined,
    tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : ['Legislação Municipal'],
    texto_integral: parsed.texto_integral || '',
    resumo_artigos: parsed.resumo_artigos,
    valor_total_credito: parsed.valor_total_credito,
    tipo_credito: parsed.tipo_credito,
    tabelas_orcamento: Array.isArray(parsed.tabelas_orcamento) ? parsed.tabelas_orcamento : [],
    confidence: 'alta'
  };
}

/**
 * Executa o OCR e a transcrição estruturada da Lei / Diário Oficial via Gemini API (@google/genai)
 * Otimizado com gemini-3.5-flash-lite (~4-5s para documentos de 5 páginas) e fallback resiliente.
 */
export async function extractLawFromPdf(
  file: File,
  institutionContext?: { municipio?: string; estado?: string }
): Promise<LawOcrResult> {
  const base64Data = await fileToBase64(file);
  const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  const municipio = institutionContext?.municipio || 'Torixoréu';
  const estado = institutionContext?.estado || 'Mato Grosso';

  const prompt = `Você é um especialista em técnica legislativa municipal brasileira (LC 95/1998, Lei 4.320/1964 e Diários Oficiais AMM-MT).
Analise o documento oficial anexo (${file.name}) do Município de ${municipio}/${estado} e faça a transcrição completa e fiel de todo o ato normativo.

Retorne ESTRITAMENTE um JSON válido com a estrutura abaixo:
{
  "numero": "apenas o número da norma (ex: 1331)",
  "ano": "ano com 4 dígitos (ex: 2026)",
  "tipo": "Lei Ordinária" | "Lei Complementar" | "Decreto" | "Portaria" | "Resolução" | "Emenda à LOM" | "Outros",
  "categoria": "Finanças e Tributos" | "Administração Geral" | "Saúde" | "Educação" | "Meio Ambiente" | "Viação e Obras" | "Servidores e RH" | "Assistência Social" | "Urbanismo e Patrimônio" | "Geral",
  "status": "Em Vigor",
  "origem_poder": "executivo" | "legislativo",
  "data_publicacao": "YYYY-MM-DD",
  "titulo": "Assunto descritivo conciso da lei (ex: Abertura de Crédito Adicional Especial por Superávit Financeiro e LDO/2026)",
  "autor": "Nome do signatário e cargo (ex: Thiago Timo Oliveira - Prefeito Municipal)",
  "ementa": "Texto completo e fiel da ementa sem aspas",
  "materia_numero": "Projeto de Lei de origem se mencionado, ou vazio",
  "tags": ["3 a 5 palavras-chave sobre o tema da norma"],
  "valor_total_credito": "Valor total R$ se for crédito orçamentário, ou vazio",
  "texto_integral": "Transcrição 100% fiel e completa do documento do início ao fim. Mantenha todos os artigos (Art. 1º, Art. 2º...), parágrafos, incisos e o fecho com data e assinatura. Se houver quadros/tabelas de dotação orçamentária, transcreva TODOS os quadros usando exatamente uma linha por campo:\\nPrefeitura Municipal de ${municipio}\\nÓrgão: ...\\nFunção: ...\\nSubfunção: ...\\nPrograma: ...\\nProjeto/Atividade: ...\\nNatureza da Despesa: codigo descricao .................... R$ valor\\nFonte de Recurso: codigo"
}`;

  const apiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY;

  let lastError: any = null;

  // 1. Tentativa direta e ultrarrápida via SDK (@google/genai)
  if (apiKey) {
    const genAI = new GoogleGenAI({ apiKey });

    // gemini-3.5-flash-lite é o modelo primário pois responde PDFs de 5 páginas em ~4 a 5 segundos!
    const modelConfigs = [
      { model: 'gemini-3.5-flash-lite', timeoutMs: 35000, config: { responseMimeType: 'application/json', temperature: 0.1 } },
      { model: 'gemini-3.8-flash', timeoutMs: 40000, config: { responseMimeType: 'application/json', temperature: 0.1, thinkingConfig: { thinkingLevel: 'minimal' as any } } }
    ];

    for (const mc of modelConfigs) {
      try {
        const response = await withTimeout(
          genAI.models.generateContent({
            model: mc.model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data
                    }
                  },
                  {
                    text: prompt
                  }
                ]
              }
            ],
            config: mc.config
          }),
          mc.timeoutMs,
          `Tempo limite excedido no modelo ${mc.model}`
        );

        let jsonText = response.text?.trim() || '';
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        }

        if (!jsonText) {
          throw new Error(`Modelo ${mc.model} retornou resposta vazia.`);
        }

        const parsed = JSON.parse(jsonText);
        return normalizeParsedOcrResult(parsed);
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa com ${mc.model} falhou:`, err?.message || err);
      }
    }
  }

  // 2. Fallback via Serverless Function (/api/extract-pdf)
  try {
    const response = await withTimeout(
      fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'law_ocr',
          base64Data,
          userInstructions: prompt
        })
      }),
      40000,
      'Tempo limite excedido no servidor de OCR (/api/extract-pdf)'
    );

    if (response.ok) {
      const parsed = await response.json();
      return normalizeParsedOcrResult(parsed);
    }
  } catch (serverErr: any) {
    lastError = serverErr;
    console.warn('Fallback /api/extract-pdf falhou:', serverErr?.message || serverErr);
  }

  throw new Error(`Falha ao transcrever PDF: ${lastError?.message || 'Verifique a conexão ou a chave VITE_GEMINI_API_KEY.'}`);
}
