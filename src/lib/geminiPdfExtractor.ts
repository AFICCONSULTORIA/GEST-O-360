
import { getApiAuthHeaders } from './supabase';

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
    id: 'tabelas_vencimentos',
    name: 'Tabelas de Vencimentos (Plano de Cargos)',
    description: 'Anexos de leis municipais com matrizes de Nível x Classe (A a H) por cargo.',
    defaultColumns: ['Tabela', 'Cargo', 'Nível', 'Por%', 'Classe A', 'Classe B', 'Classe C', 'Classe D', 'Classe E', 'Classe F', 'Classe G', 'Classe H'],
    systemInstruction: 'Extraia todas as tabelas de vencimentos por cargo, listando uma linha para cada nível (REF., I, II, III, IV, V, VI) com os respectivos valores das classes A até H.'
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
  _apiKeyOverride?: string
): Promise<ExtractionResult> {
  const base64Data = await fileToBase64(file);
  const preset = EXTRACTION_PRESETS.find(p => p.id === presetId) || EXTRACTION_PRESETS[0];

  try {
    const authHeaders = await getApiAuthHeaders();
    const response = await fetch('/api/extract-pdf', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        mode: 'table_extractor',
        base64Data,
        presetId,
        customColumns,
        userInstructions,
        systemInstruction: preset.systemInstruction
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Erro no servidor de extração (${response.status}): ${response.statusText}`);
    }

    const parsed = await response.json();

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
    console.error('Erro na extração de PDF via servidor:', err);
    throw new Error(err.message || 'Falha ao processar e extrair dados do PDF com o serviço de IA.');
  }
}

export interface SalaryClassMeta {
  code: string;
  percent: string;
  years: string;
}

export interface ExtractedSalaryRow {
  levelCode: string;
  levelPercent: string;
  values: Record<string, number | null>;
}

export interface ExtractedSalaryTable {
  tableRoman: string;
  roleName: string;
  classes: SalaryClassMeta[];
  rows: ExtractedSalaryRow[];
}

export interface ExtractedSalaryLaw {
  lawNumber: string;
  annexName: string;
  title: string;
  sourceFileName: string;
  tables: ExtractedSalaryTable[];
}

function parseBrazilianNumeric(val: unknown): number | null {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val !== 'string') return null;
  const cleaned = val.replace(/[R$\s*]/g, '').trim();
  if (!cleaned) return null;
  // Se tiver vírgula decimal (ex: "1.980,00"), remove pontos de milhar e troca vírgula por ponto
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const SALARY_TABLE_PROMPT = (userInstructions?: string) => `
Você é um especialista sênior em legislação de pessoal, planos de cargos e salários e tabelas de vencimentos municipais brasileiras.
Analise todas as páginas do PDF anexo (Anexo de Lei Municipal com Tabelas de Vencimentos) e extraia TODAS as tabelas sem omitir nenhuma tabela, nenhum nível e nenhuma classe.
${userInstructions ? `Instruções adicionais do usuário: ${userInstructions}` : ''}

REGRAS OBRIGATÓRIAS:
1. Retorne ESTRITAMENTE um objeto JSON válido (sem blocos markdown, sem texto antes ou depois).
2. Converta todos os valores monetários brasileiros (ex: "1.980,00*" ou "2.079,00") para números decimais JSON (ex: 1980.00, 2079.00). Remova asteriscos (*) dos números.
3. Preserve exatamente o número romano da tabela (ex: "I", "II", ..., "XXVII"), o nome do cargo (ex: "ALMOXARIFE", "ASSISTENTE SOCIAL") e todos os níveis (ex: "REF.", "I", "II", "III", "IV", "V", "VI").
4. Estrutura exata do JSON:
{
  "lawNumber": "44/2022",
  "annexName": "ANEXO IV",
  "title": "Tabelas de Vencimentos - Lei Municipal nº 44/2022",
  "tables": [
    {
      "tableRoman": "I",
      "roleName": "ALMOXARIFE",
      "classes": [
        { "code": "A", "percent": "0%", "years": "0 a 5" },
        { "code": "B", "percent": "5%", "years": "05 a 10" },
        { "code": "C", "percent": "10%", "years": "10 a 15" },
        { "code": "D", "percent": "15%", "years": "15 a 20" },
        { "code": "E", "percent": "20%", "years": "20 a 25" },
        { "code": "F", "percent": "25%", "years": "25 a 30" },
        { "code": "G", "percent": "30%", "years": "30 a 35" },
        { "code": "H", "percent": "35%", "years": "acima de 35" }
      ],
      "rows": [
        {
          "levelCode": "REF.",
          "levelPercent": "SB*",
          "values": {
            "A": 1980.00,
            "B": 2079.00,
            "C": 2182.95,
            "D": 2292.09,
            "E": 2406.69,
            "F": 2527.02,
            "G": 2653.37,
            "H": 2786.03
          }
        }
      ]
    }
  ]
}
`;

async function runClientGeminiPdfExtraction(_base64Data: string, _prompt: string): Promise<any> {
  // Segurança: chaves da API Gemini nunca são expostas no bundle do navegador.
  throw new Error(
    'A extração de PDF via IA opera exclusivamente pelo servidor seguro (/api/extract-pdf).'
  );
}

export async function extractSalaryTablesFromPdf(
  file: File,
  userInstructions?: string
): Promise<ExtractedSalaryLaw> {
  const base64Data = await fileToBase64(file);
  let parsed: any = null;

  try {
    const authHeaders = await getApiAuthHeaders();
    const response = await fetch('/api/extract-pdf', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        mode: 'salary_table_extractor',
        base64Data,
        userInstructions
      })
    });

    if (response.ok) {
      parsed = await response.json();
    } else if (response.status === 404) {
      // Ambiente local (Vite dev) não serve /api/*: usa SDK Gemini direto no cliente
      parsed = await runClientGeminiPdfExtraction(base64Data, SALARY_TABLE_PROMPT(userInstructions));
    } else {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Erro no servidor de extração (${response.status}): ${response.statusText}`);
    }
  } catch (err: any) {
    // Se falhou por rede ou 404, tenta fallback direto via SDK se ainda não tentou
    if (!parsed && (err?.message?.includes('404') || err?.name === 'TypeError')) {
      parsed = await runClientGeminiPdfExtraction(base64Data, SALARY_TABLE_PROMPT(userInstructions));
    } else if (!parsed) {
      throw err;
    }
  }
  const rawTables: any[] = Array.isArray(parsed.tables) ? parsed.tables : [];

  const tables: ExtractedSalaryTable[] = rawTables.map((t, idx) => {
    const rawRows: any[] = Array.isArray(t.rows) ? t.rows : [];
    const rows: ExtractedSalaryRow[] = rawRows.map((r) => {
      const normalizedValues: Record<string, number | null> = {};
      const rawVals = r.values && typeof r.values === 'object' ? r.values : {};
      for (const [k, v] of Object.entries(rawVals)) {
        normalizedValues[k.toUpperCase()] = parseBrazilianNumeric(v);
      }
      return {
        levelCode: String(r.levelCode || '').trim(),
        levelPercent: String(r.levelPercent || '').trim(),
        values: normalizedValues
      };
    });

    const classes: SalaryClassMeta[] = Array.isArray(t.classes) && t.classes.length > 0
      ? t.classes.map((c: any) => ({
          code: String(c.code || '').toUpperCase().trim(),
          percent: String(c.percent || '').trim(),
          years: String(c.years || '').trim()
        }))
      : [
          { code: 'A', percent: '0%', years: '0 a 5' },
          { code: 'B', percent: '5%', years: '05 a 10' },
          { code: 'C', percent: '10%', years: '10 a 15' },
          { code: 'D', percent: '15%', years: '15 a 20' },
          { code: 'E', percent: '20%', years: '20 a 25' },
          { code: 'F', percent: '25%', years: '25 a 30' },
          { code: 'G', percent: '30%', years: '30 a 35' },
          { code: 'H', percent: '35%', years: 'acima de 35' }
        ];

    return {
      tableRoman: String(t.tableRoman || `${idx + 1}`).trim(),
      roleName: String(t.roleName || 'CARGO NÃO IDENTIFICADO').trim(),
      classes,
      rows
    };
  });

  return {
    lawNumber: String(parsed.lawNumber || '').trim() || 'S/N',
    annexName: String(parsed.annexName || '').trim(),
    title: String(parsed.title || `Tabelas de Vencimentos - ${file.name}`).trim(),
    sourceFileName: file.name,
    tables
  };
}

