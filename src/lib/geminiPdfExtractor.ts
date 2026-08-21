
export interface ExtractionPreset {
  id: string;
  name: string;
  description: string;
  icon?: string;
  defaultColumns: string[];
  systemInstruction?: string;
}

export const EXTRACTION_PRESETS: ExtractionPreset[] = [
  {
    id: 'auto',
    name: 'IA Universal (Auto-Detect)',
    description: 'A IA analisa a estrutura do PDF e identifica automaticamente todas as colunas e registros tabulares.',
    defaultColumns: [],
    systemInstruction: 'Analise o documento PDF fornecido e extraia todos os dados tabulares ou itens listados de forma estruturada. Crie nomes de colunas claros, objetivos e em português brasileiro que representem com precisão cada campo do documento.'
  },
  {
    id: 'diario_oficial',
    name: 'Diário Oficial & Atos Normativos',
    description: 'Decretos, portarias, editais, avisos de licitação e publicações municipais.',
    defaultColumns: ['Nº do Ato', 'Tipo de Ato', 'Data', 'Órgão / Secretaria', 'Ementa / Resumo', 'Pessoas / Servidores Citados', 'Valor (R$)'],
    systemInstruction: 'Você é um especialista em Diários Oficiais e Legislação Municipal. Extraia cada ato normativo, decreto, portaria, aviso ou publicação como uma linha distinta com os campos solicitados.'
  },
  {
    id: 'notas_empenhos',
    name: 'Notas Fiscais, Empenhos & Faturas',
    description: 'Documentos fiscais, liquidações de despesas, ordens de pagamento e notas.',
    defaultColumns: ['Nº Documento / NF', 'Data Emissão', 'Fornecedor / Razão Social', 'CNPJ / CPF', 'Descrição dos Itens / Serviço', 'Valor Total (R$)', 'Data Vencimento'],
    systemInstruction: 'Extraia os dados de notas fiscais, empenhos ou faturas municipais detalhando número, fornecedor, CNPJ, itens e valores.'
  },
  {
    id: 'folha_pagamento',
    name: 'Folha de Pagamento & Contracheques',
    description: 'Holerites, relações de servidores públicos, proventos e descontos.',
    defaultColumns: ['Nome do Servidor', 'Matrícula', 'Cargo / Função', 'CPF', 'Secretaria / Lotação', 'Proventos Brutos (R$)', 'Descontos (R$)', 'Salário Líquido (R$)'],
    systemInstruction: 'Extraia a relação nominal de servidores públicos com matrículas, cargos, remunerações e valores da folha de pagamento.'
  },
  {
    id: 'contratos_licitacoes',
    name: 'Contratos & Licitações',
    description: 'Extratos de contratos públicos, pregões, termos aditivos e atas de registro de preços.',
    defaultColumns: ['Nº Contrato / Processo', 'Modalidade / Pregão', 'Empresa Contratada', 'CNPJ', 'Objeto do Contrato', 'Valor Global (R$)', 'Vigência Inicial', 'Vigência Final'],
    systemInstruction: 'Extraia os contratos administrativos e licitações identificando processo, contratada, objeto, valores e vigência.'
  },
  {
    id: 'patrimonio_inventario',
    name: 'Patrimônio & Tombamento',
    description: 'Relação de bens móveis, veículos, equipamentos e inventário municipal.',
    defaultColumns: ['Código / Tombamento', 'Descrição do Bem', 'Categoria / Tipo', 'Localização / Sala', 'Secretaria Responsável', 'Estado de Conservação', 'Valor Histórico / Estimado (R$)'],
    systemInstruction: 'Extraia os itens de inventário e tombamento de patrimônio público municipal com descrições, setores e conservação.'
  },
  {
    id: 'alunos_matriculas',
    name: 'Alunos & Matrículas Escolares',
    description: 'Listas de chamada, turmas, fichas de matrícula e cadastros da rede de ensino.',
    defaultColumns: ['Nome do Aluno', 'Data de Nascimento', 'CPF / RG', 'Nome do Responsável', 'Telefone de Contato', 'Escola / Unidade', 'Série / Turma / Turno'],
    systemInstruction: 'Extraia as informações de alunos e matrículas escolares preservando nomes completos, contatos e turmas.'
  },
  {
    id: 'custom',
    name: 'Personalizado (Colunas Sob Medida)',
    description: 'Defina exatamente os nomes dos campos e colunas que deseja extrair.',
    defaultColumns: ['Item', 'Descrição', 'Quantidade', 'Valor Unitário', 'Valor Total', 'Observações'],
    systemInstruction: 'Extraia estritamente os campos definidos pelo usuário a partir do conteúdo do PDF.'
  }
];

export interface ExtractionResult {
  columns: string[];
  data: Record<string, any>[];
  summary?: string;
  totalRows: number;
  fileName: string;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove prefix "data:application/pdf;base64,"
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

export async function extractDataFromPdfWithGemini(
  file: File,
  presetId: string,
  customColumns?: string[],
  userInstructions?: string,
  apiKeyOverride?: string
): Promise<ExtractionResult> {
  const apiKey = apiKeyOverride || (process.env.GEMINI_API_KEY as string) || '';

  if (!apiKey) {
    throw new Error('Chave de API do Gemini não configurada. Verifique as variáveis de ambiente ou informe uma chave válida.');
  }

  const base64Data = await fileToBase64(file);
  const preset = EXTRACTION_PRESETS.find(p => p.id === presetId) || EXTRACTION_PRESETS[0];

  const columnsToExtract = (customColumns && customColumns.length > 0) 
    ? customColumns 
    : (preset.defaultColumns.length > 0 ? preset.defaultColumns : []);

  const columnsPrompt = columnsToExtract.length > 0
    ? `Extraia EXCLUSIVAMENTE os seguintes campos para cada registro encontrado:\n${columnsToExtract.map(col => `- "${col}"`).join('\n')}`
    : `Analise todo o documento e identifique as colunas ideais para tabular os dados nele presentes de forma clara e padronizada.`;

  const systemPrompt = `
Você é um sistema de alta precisão especializado em OCR e extração estruturada de dados de documentos e relatórios oficiais em PDF para o software governamental GESTÃO 360.

${preset.systemInstruction || ''}
${userInstructions ? `Instruções adicionais do usuário: ${userInstructions}` : ''}

REGRAS DE FORMATAÇÃO CRÍTICAS:
1. Retorne APENAS um objeto JSON válido (sem blocos markdown adicionais, sem texto antes ou depois).
2. O formato do JSON retornado DEVE ter a seguinte estrutura:
{
  "columns": ["Coluna 1", "Coluna 2", ...],
  "data": [
    { "Coluna 1": "Valor 1", "Coluna 2": "Valor 2" },
    ...
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

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data
                }
              },
              {
                text: systemPrompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Gemini API Error:', errorData);
      throw new Error(`Erro na API do Gemini (${response.status}): ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let cleanJson = rawText.trim();

    // Se vier envelopado em ```json ```, limpa
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }

    const parsed = JSON.parse(cleanJson);

    let finalColumns: string[] = Array.isArray(parsed.columns) ? parsed.columns : [];
    const finalData: Record<string, any>[] = Array.isArray(parsed.data) ? parsed.data : [];

    // Se columns não veio preenchido, deriva das chaves do primeiro registro de data
    if (finalColumns.length === 0 && finalData.length > 0) {
      const keysSet = new Set<string>();
      finalData.forEach(row => {
        Object.keys(row).forEach(k => keysSet.add(k));
      });
      finalColumns = Array.from(keysSet);
    }

    return {
      columns: finalColumns,
      data: finalData,
      summary: parsed.summary || `Extraídos ${finalData.length} registros com sucesso do arquivo ${file.name}.`,
      totalRows: finalData.length,
      fileName: file.name
    };
  } catch (err: any) {
    console.error('Erro na extração de PDF via Gemini:', err);
    throw new Error(err.message || 'Falha ao processar e extrair dados do PDF com a IA Gemini.');
  }
}
