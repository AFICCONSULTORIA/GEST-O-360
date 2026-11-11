import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // Configuração de CORS para segurança de endpoints de API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { mode, base64Data, mimeType, pageImages, customColumns, userInstructions, systemInstruction } = req.body || {};

    if (!base64Data && (!Array.isArray(pageImages) || pageImages.length === 0)) {
      return res.status(400).json({ error: 'Parâmetro base64Data ou pageImages é obrigatório.' });
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Chave GEMINI_API_KEY / VITE_GEMINI_API_KEY não configurada no servidor.' 
      });
    }

    // Limpa possível cabeçalho data:application/pdf;base64,
    const cleanBase64 = base64Data && base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    let prompt = '';

    if (mode === 'law_ocr') {
      prompt = userInstructions || `
Você é o mais conceituado especialista em técnica legislativa municipal brasileira (LC 95/1998, Lei 4.320/1964 e Diários Oficiais AMM-MT).
Analise o PDF anexo e faça a transcrição completa e fiel do ato normativo em JSON válido:
{
  "numero": "apenas o número (ex: 1331)",
  "ano": "ano de publicação com 4 dígitos (ex: 2026)",
  "tipo": "Lei Ordinária" | "Lei Complementar" | "Decreto" | "Portaria" | "Resolução" | "Emenda à LOM" | "Outros",
  "categoria": "Finanças e Tributos" | "Administração Geral" | "Saúde" | "Educação" | "Meio Ambiente" | "Viação e Obras" | "Servidores e RH" | "Assistência Social" | "Urbanismo e Patrimônio" | "Geral",
  "status": "Em Vigor",
  "origem_poder": "executivo" | "legislativo",
  "data_publicacao": "YYYY-MM-DD",
  "titulo": "Título descritivo curto sobre o assunto da norma (ex: Abertura de Crédito Adicional Especial por Superávit Financeiro)",
  "autor": "Nome do signatário (ex: Thiago Timo Oliveira)",
  "ementa": "Texto completo da ementa sem aspas",
  "tags": ["tag1", "tag2", "tag3"],
  "valor_total_credito": "R$ valor se for crédito adicional ou vazio",
  "texto_integral": "Transcrição integral e fiel de toda a norma com cabeçalho, epígrafe, ementa, preâmbulo, todos os artigos, todas as dotações orçamentárias (Órgão, Função, Subfunção, Programa, Projeto/Atividade, Natureza da Despesa, Fonte de Recurso) e fecho com assinatura."
}`;
    } else if (mode === 'table_extractor') {
      const columnsToExtract = (customColumns && Array.isArray(customColumns) && customColumns.length > 0)
        ? customColumns
        : [];

      const columnsPrompt = columnsToExtract.length > 0
        ? `Extraia EXCLUSIVAMENTE os seguintes campos para cada registro encontrado:\n${columnsToExtract.map((col: string) => `- "${col}"`).join('\n')}`
        : `Analise todo o documento e identifique as colunas ideais para tabular os dados nele presentes de forma clara e padronizada.`;

      prompt = `
Você é um sistema de alta precisão especializado em OCR e extração estruturada de dados de documentos e relatórios oficiais em PDF para o software governamental GESTÃO 360.

${systemInstruction || ''}
${userInstructions ? `Instruções adicionais do usuário: ${userInstructions}` : ''}

REGRAS DE FORMATAÇÃO CRÍTICAS:
1. Retorne APENAS um objeto JSON válido (sem blocos markdown adicionais, sem texto antes ou depois).
2. O formato do JSON retornado DEVE ter a seguinte estrutura:
{
  "columns": ["Coluna 1", "Coluna 2"],
  "data": [
    { "Coluna 1": "Valor 1", "Coluna 2": "Valor 2" }
  ],
  "summary": "Breve resumo em 1 linha sobre o tipo de documento e quantidade de registros extraídos"
}
3. Certifique-se de que TODAS as linhas encontradas no documento sejam extraídas sem omitir dados ou tabelas.
4. Para valores monetários, mantenha no formato numérico ou "R$ 1.234,56".
5. Se uma informação não for encontrada em uma linha específica, use "" (string vazia).
6. Garanta que os nomes das propriedades no array "data" coincidam EXATAMENTE com os nomes presentes no array "columns".

CAMPOS SOLICITADOS:
${columnsPrompt}
`;
    } else {
      // Modo padrão: fiscal_reader (DANFE de NF-e e DANFSe de NFS-e com Reforma Tributária NT 2026.010)
      prompt = `
Você é um Auditor Fiscal Sênior e Perito Contábil especializado em leitura e conferência de DANFE de NF-e (Modelo 55 com Reforma Tributária NT 2026.010 - IBS/CBS/IS) e DANFSe de NFS-e (Padrão Nacional NT 008).

Analise o PDF da nota fiscal fornecido com máxima atenção aos detalhes e extraia com precisão cirúrgica todas as informações da nota.

REGRAS OBRIGATÓRIAS:
1. Retorne ESTRITAMENTE um objeto JSON válido (sem markdown adicional, sem texto antes ou depois).
2. Se a nota for tradicional (NF-e modelo 55 com ICMS/IPI/PIS/COFINS), extraia todos os itens reais, a chave de 44 dígitos, emitente, destinatário e valores totais reais da nota.
3. Se a nota já possuir os campos do IBS Estadual, IBS Municipal, CBS ou Imposto Seletivo impressos (Reforma Tributária), extraia as alíquotas e valores declarados. Se não possuir esses campos impressos por ser modelo tradicional, informe 0.05 para pIBSUF, 0.05 para pIBSMun e 0.90 para pCBS para efeito de simulação contábil da Reforma 2026.
4. Estrutura exata do JSON:
{
  "docType": "NFE_55" ou "NFSE_NACIONAL",
  "chNFe": "44 dígitos numéricos da chave de acesso",
  "chNFSe": "50 dígitos numéricos se for NFS-e Nacional",
  "nNF": "número da nota",
  "serie": "série da nota",
  "dhEmi": "data de emissão YYYY-MM-DD ou ISO",
  "natOp": "natureza da operação",
  "emitter": {
    "nome": "Razão Social do emitente",
    "cnpj": "CNPJ com 14 dígitos numéricos",
    "ie": "Inscrição Estadual se houver",
    "municipio": "Município do emitente",
    "uf": "UF (ex: SP, RJ, MT)"
  },
  "recipient": {
    "nome": "Razão Social ou Nome do destinatário/tomador",
    "cnpj": "CNPJ com 14 dígitos",
    "cpf": "CPF com 11 dígitos se pessoa física",
    "municipio": "Município",
    "uf": "UF"
  },
  "items": [
    {
      "nItem": 1,
      "xProd": "Descrição detalhada do produto ou serviço",
      "ncm": "código NCM com 8 dígitos",
      "cClassTrib": "classificação da reforma se houver ou 010101",
      "vProd": 100.00,
      "vBC": 100.00,
      "pIBSUF": 0.05,
      "vIBSUF": 0.05,
      "pIBSMun": 0.05,
      "vIBSMun": 0.05,
      "pCBS": 0.90,
      "vCBS": 0.90,
      "pIS": 0.0,
      "vIS": 0.0
    }
  ],
  "totals": {
    "vProd": 100.00,
    "vNF": 100.00,
    "vIBSUF": 0.05,
    "vIBSMun": 0.05,
    "vCBS": 0.90,
    "vIS": 0.0,
    "vISSQN": 0.0,
    "vServ": 100.00,
    "vDescIncond": 0.0,
    "vDed": 0.0,
    "vBCISS": 100.00,
    "pAliqISS": 3.0,
    "vLiq": 100.00
  }
}
`;
    }

    const genAI = new GoogleGenAI({ apiKey });
    let rawText = '';
    const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

    const mediaParts = (Array.isArray(pageImages) && pageImages.length > 0)
      ? pageImages.map((img: { mimeType?: string; data: string }) => ({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.data.includes(',') ? img.data.split(',')[1] : img.data
          }
        }))
      : [
          {
            inlineData: {
              mimeType: mimeType || 'application/pdf',
              data: cleanBase64
            }
          }
        ];

    for (const modelName of models) {
      try {
        const response = await genAI.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                ...mediaParts,
                {
                  text: prompt
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1
          }
        });
        if (response.text) {
          rawText = response.text;
          break;
        }
      } catch (e) {
        console.warn(`Tentativa com ${modelName} falhou em /api/extract-pdf:`, e);
      }
    }

    if (!rawText) {
      throw new Error('Nenhum modelo retornou resposta válida.');
    }
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }

    const parsed = JSON.parse(cleanJson);
    return res.status(200).json(parsed);

  } catch (error: any) {
    console.error("Erro na Serverless Function extract-pdf:", error);
    return res.status(500).json({ 
      error: error.message || 'Falha ao processar extração do PDF via servidor.' 
    });
  }
}
