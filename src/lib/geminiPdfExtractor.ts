
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
  _apiKeyOverride?: string
): Promise<ExtractionResult> {
  const base64Data = await fileToBase64(file);
  const preset = EXTRACTION_PRESETS.find(p => p.id === presetId) || EXTRACTION_PRESETS[0];

  try {
    const response = await fetch('/api/extract-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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

