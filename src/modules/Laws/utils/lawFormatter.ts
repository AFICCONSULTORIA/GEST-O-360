/**
 * Formatador, Parser Técnico-Legislativo e Paginador para Leis Municipais e Diários Oficiais (Padrão LC 95/98 e AMM-MT)
 */

export interface BudgetTableRow {
  label: string;
  value: string;
  isNaturezaDespesa?: boolean;
  naturezaCodeDesc?: string;
  naturezaValor?: string;
  isOrgao?: boolean;
  isFonteRecurso?: boolean;
  isProjetoAtividade?: boolean;
}

export interface BudgetTableBlock {
  type: 'budget_table';
  entity?: string;
  rows: BudgetTableRow[];
  totalValue?: string;
  isContinuation?: boolean;
}

export interface ArticleBlock {
  type: 'article';
  id: string;
  articleLabel: string;
  rawText: string;
}

export interface GenericBlock {
  type: 'heading_titulo' | 'heading_capitulo' | 'preambulo' | 'paragrafo' | 'fecho' | 'assinatura';
  id: string;
  rawText: string;
}

export type LawContentBlock = ArticleBlock | BudgetTableBlock | GenericBlock;

export interface ParsedLawStructure {
  diarioHeader: {
    diario: string;
    edicaoData: string;
    estado: string;
  };
  epigrafe: {
    tipoNumero: string;
    data: string;
    entidade: string;
  };
  ementa: string;
  preambulo?: string;
  blocks: LawContentBlock[];
  fecho?: string;
  assinatura: {
    nome: string;
    cargo: string;
  };
}

export interface ParsedLawPage {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  blocks: LawContentBlock[];
  includeEpigraph?: boolean;
  includeEmenta?: boolean;
  includePreambulo?: boolean;
  includeFechoAssinatura?: boolean;
}

export interface LawMetadataFallback {
  type?: string;
  number?: string;
  publication_date?: string;
  author?: string;
  institution_name?: string;
}

/**
 * Formata data ISO para escrita formal em extenso (ex: "23 de janeiro de 2026")
 */
export function formatLegalDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${day} de ${meses[monthIndex]} de ${year}`;
  }
  return d.toLocaleDateString('pt-BR');
}

/**
 * Faz o parsing estruturado do texto de uma lei municipal
 */
export function parseLawDocument(
  fullText: string, 
  defaultEmenta?: string,
  meta?: LawMetadataFallback
): ParsedLawStructure {
  const lines = (fullText || '').split('\n').map(l => l.trim());
  
  const structure: ParsedLawStructure = {
    diarioHeader: {
      diario: 'AMM-MT',
      edicaoData: meta?.publication_date ? `Disponível na edição de ${formatLegalDate(meta.publication_date)}` : 'Edição Oficial',
      estado: 'Mato Grosso'
    },
    epigrafe: {
      tipoNumero: `${(meta?.type || 'LEI').toUpperCase()} Nº ${meta?.number || ''}`,
      data: formatLegalDate(meta?.publication_date),
      entidade: 'PREF. TORIXORÉU'
    },
    ementa: defaultEmenta || '',
    blocks: [],
    assinatura: {
      nome: 'THIAGO TIMO OLIVEIRA',
      cargo: 'Prefeito Municipal'
    }
  };

  let i = 0;
  const n = lines.length;

  // 1. Detecção de Cabeçalho do Diário (ex: AMM-MT | Disponível na edição de... | Mato Grosso)
  if (i < n && /AMM-MT|Diário Oficial|Disponível na edição/i.test(lines[i])) {
    const parts = lines[i].split('|').map(p => p.trim());
    structure.diarioHeader = {
      diario: parts[0] || 'AMM-MT',
      edicaoData: parts[1] || `Disponível na edição de ${formatLegalDate(meta?.publication_date)}`,
      estado: parts[2] || 'Mato Grosso'
    };
    i++;
  }

  while (i < n && !lines[i]) i++;

  // 2. Detecção de Epígrafe (LEI Nº ..., Data, PREF. ...)
  if (i < n && /^(LEI|DECRETO|PORTARIA|LEI COMPLEMENTAR|RESOLUÇÃO|EMENDA)\s+(MUNICIPAL\s+)?(Nº|N°|N\.º|NUM)?\s*\d+/i.test(lines[i])) {
    const tipoNumero = lines[i];
    i++;
    while (i < n && !lines[i]) i++;
    const dataEpigrafe = (i < n && /\d{1,2}\s+de\s+[a-zA-ZçÇ]+\s+de\s+\d{4}/i.test(lines[i])) ? lines[i++] : formatLegalDate(meta?.publication_date);
    while (i < n && !lines[i]) i++;
    const entidade = (i < n && /^(PREF|PREFEITURA|CÂMARA|CAMARA|MUNICÍPIO|MUNICIPIO)/i.test(lines[i])) ? lines[i++] : 'PREF. TORIXORÉU';
    
    structure.epigrafe = {
      tipoNumero,
      data: dataEpigrafe,
      entidade: entidade || 'PREF. TORIXORÉU'
    };
  }

  while (i < n && !lines[i]) i++;

  // Pula eventual repetição da epígrafe (comum no padrão AMM-MT antes da ementa)
  while (i < n && /^(LEI|DECRETO|PORTARIA|LEI COMPLEMENTAR|RESOLUÇÃO)\s+(MUNICIPAL\s+)?(Nº|N°|N\.º|NUM)?\s*\d+/i.test(lines[i])) {
    i++;
    while (i < n && !lines[i]) i++;
  }

  // 3. Detecção de Ementa (entre aspas ou iniciando com verbos legislativos clássicos)
  if (
    i < n &&
    (/^["“']/i.test(lines[i]) ||
      /^(dispõe|autoriza|institui|altera|cria|estabelece|regulamenta|fixa|aprova|declara|denomina|concede|abre|dá\s+nova)/i.test(lines[i]))
  ) {
    let ementaLines: string[] = [];
    while (i < n && lines[i] && !/^(O PREFEITO|A PREFEITA|O PRESIDENTE|FAZ SABER|Art\.|Artigo\s+\d)/i.test(lines[i])) {
      ementaLines.push(lines[i]);
      if (/["”']\s*$/.test(lines[i])) {
        i++;
        break;
      }
      i++;
    }
    const detectedEmenta = ementaLines.join(' ').replace(/^["“']+|["”']+$/g, '').trim();
    if (detectedEmenta) {
      structure.ementa = detectedEmenta;
    }
  }

  while (i < n && !lines[i]) i++;

  // 4. Detecção de Preâmbulo ("O PREFEITO DO MUNICÍPIO... FAZ SABER...")
  if (i < n && /^(O PREFEITO|A PREFEITA|O PRESIDENTE DA CÂMARA|A MESA DIRETORA|Nós,\s+os\s+representantes)/i.test(lines[i])) {
    let preambuloLines: string[] = [];
    while (i < n && !/^(Art\.|Artigo)\s*[0-9]/i.test(lines[i])) {
      if (lines[i]) preambuloLines.push(lines[i]);
      i++;
    }
    structure.preambulo = preambuloLines.join(' ').trim();
  }

  // 5. Varredura do Corpo da Lei (Artigos, Parágrafos e Tabelas Orçamentárias)
  let currentBudgetRows: BudgetTableRow[] = [];
  let budgetEntity = '';

  const flushBudgetTable = () => {
    if (currentBudgetRows.length > 0) {
      structure.blocks.push({
        type: 'budget_table',
        entity: budgetEntity || undefined,
        rows: [...currentBudgetRows]
      });
      currentBudgetRows = [];
      budgetEntity = '';
    }
  };

  const peekNextNonEmptyLine = (startIndex: number): string => {
    let k = startIndex;
    while (k < n && !lines[k]) k++;
    return k < n ? lines[k] : '';
  };

  while (i < n) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }

    // Linha de Cabeçalho / Subtítulo Institucional antes de tabela (ex: "Prefeitura Municipal de Torixoréu")
    const nextNonEmpty = peekNextNonEmptyLine(i + 1);
    if (/^(Prefeitura Municipal|Câmara Municipal|Fundo Municipal)/i.test(line) && /^(Órgão|Unidade|Função|Projeto)/i.test(nextNonEmpty)) {
      flushBudgetTable();
      budgetEntity = line;
      i++;
      continue;
    }

    // Linha de Dotação Orçamentária
    const isBudgetRow = /^(Órgão|Unidade|Função|Subfunção|Programa|Projeto\/Atividade|Ação|Natureza da Despesa|Elemento de Despesa|Fonte de Recurso|Ficha):/i.test(line);

    if (isBudgetRow) {
      const colonIdx = line.indexOf(':');
      const label = line.slice(0, colonIdx + 1).trim();
      const val = line.slice(colonIdx + 1).trim();

      const isNatureza = /^(Natureza da Despesa|Elemento de Despesa):/i.test(label);
      const isOrgao = /^Órgão:/i.test(label);
      const isFonte = /^Fonte de Recurso:/i.test(label);
      const isProj = /^(Projeto\/Atividade|Ação):/i.test(label);

      // Se encontrou um novo "Órgão:" e a tabela atual já possui linhas completas (ex: já fechou uma Fonte de Recurso ou outro Órgão),
      // separa em um novo bloco de tabela orçamentária para manter o layout idêntico ao Diário Oficial!
      if (isOrgao && currentBudgetRows.length > 0) {
        flushBudgetTable();
      }

      let naturezaCodeDesc = '';
      let naturezaValor = '';

      if (isNatureza) {
        const match = val.match(/^(.*?)(?:\.{3,}|_{3,}|\s{3,}|…+)(R\$\s*[\d.,]+)/i);
        if (match) {
          naturezaCodeDesc = match[1].trim();
          naturezaValor = match[2].trim();
        } else {
          const valMatch = val.match(/^(.*?)(R\$\s*[\d.,]+)$/i);
          if (valMatch) {
            naturezaCodeDesc = valMatch[1].trim();
            naturezaValor = valMatch[2].trim();
          } else {
            naturezaCodeDesc = val;
          }
        }
      }

      currentBudgetRows.push({
        label,
        value: val,
        isNaturezaDespesa: isNatureza,
        naturezaCodeDesc: isNatureza ? naturezaCodeDesc : undefined,
        naturezaValor: isNatureza ? naturezaValor : undefined,
        isOrgao,
        isFonteRecurso: isFonte,
        isProjetoAtividade: isProj
      });

      i++;
      continue;
    }

    flushBudgetTable();

    // Título ou Capítulo
    if (/^TÍTULO\s+/i.test(line)) {
      structure.blocks.push({
        type: 'heading_titulo',
        id: `sec-titulo-${i}`,
        rawText: line
      });
      i++;
      continue;
    }

    if (/^CAPÍTULO\s+/i.test(line) || /^LIVRO\s+/i.test(line)) {
      structure.blocks.push({
        type: 'heading_capitulo',
        id: `sec-capitulo-${i}`,
        rawText: line
      });
      i++;
      continue;
    }

    // Artigo (Art. 1º, Artigo 2º...)
    if (/^(Art\.|Artigo)\s*([0-9ºººªa-zA-Z.-]+)/i.test(line)) {
      const match = line.match(/^(Art\.|Artigo)\s*([0-9ºººªa-zA-Z.-]+)/i);
      const artLabel = match ? `Art. ${match[2]}` : 'Artigo';

      structure.blocks.push({
        type: 'article',
        id: `sec-art-${i}`,
        articleLabel: artLabel,
        rawText: line
      });
      i++;
      continue;
    }

    // Fecho e Assinatura
    if (/^Gabinete do (Prefeito|Presidente)/i.test(line) || /^[A-Z\s]{4,}\/MT,\s+\d{1,2}\s+de\s+/i.test(line)) {
      structure.fecho = line;
      i++;
      while (i < n && !lines[i]) i++;

      if (i < n && lines[i] && !/^(Art\.|§|Parágrafo)/i.test(lines[i])) {
        const nomeSignatario = lines[i++];
        while (i < n && !lines[i]) i++;
        const cargoSignatario = (i < n && /^(Prefeito|Presidente|Secretário)/i.test(lines[i])) ? lines[i++] : 'Prefeito Municipal';
        structure.assinatura = {
          nome: nomeSignatario,
          cargo: cargoSignatario
        };
      }
      continue;
    }

    // Parágrafo comum
    structure.blocks.push({
      type: 'paragrafo',
      id: `sec-p-${i}`,
      rawText: line
    });
    i++;
  }

  flushBudgetTable();

  if (!structure.fecho && meta?.publication_date) {
    structure.fecho = `Gabinete do Prefeito Municipal de Torixoréu/MT, ${formatLegalDate(meta.publication_date)}.`;
  }

  return structure;
}

/**
 * Paginador Automático de Leis Municipais em Folhas A4 Reais do Diário Oficial
 * Distribui o conteúdo em páginas delimitadas sem estourar e sem cortar o texto.
 */
export function paginateLawDocument(structure: ParsedLawStructure): ParsedLawPage[] {
  const pages: ParsedLawPage[] = [];

  // Orçamento vertical em unidades aproximadas por página A4
  // Page 1: cabeçalho (70), epígrafe (140), ementa (120), preâmbulo (100) -> sobra ~450
  // Páginas seguintes: cabeçalho (70), rodapé (50) -> sobra ~780
  const FIRST_PAGE_BUDGET = 480;
  const SUBSEQUENT_PAGE_BUDGET = 780;

  let currentPageNum = 1;
  let currentBlocks: LawContentBlock[] = [];
  let remainingBudget = FIRST_PAGE_BUDGET;

  const startNewPage = () => {
    pages.push({
      pageNumber: currentPageNum,
      totalPages: 0,
      isFirstPage: currentPageNum === 1,
      isLastPage: false,
      blocks: [...currentBlocks],
      includeEpigraph: currentPageNum === 1,
      includeEmenta: currentPageNum === 1,
      includePreambulo: currentPageNum === 1 && !!structure.preambulo,
      includeFechoAssinatura: false
    });

    currentPageNum++;
    currentBlocks = [];
    remainingBudget = SUBSEQUENT_PAGE_BUDGET;
  };

  const getBlockWeight = (block: LawContentBlock): number => {
    if (block.type === 'budget_table') {
      const t = block as BudgetTableBlock;
      return 35 + t.rows.length * 42;
    }
    if (block.type === 'article') {
      return 60 + Math.ceil(block.rawText.length / 90) * 16;
    }
    if (block.type === 'heading_titulo') return 70;
    if (block.type === 'heading_capitulo') return 55;
    return 40 + Math.ceil((block.rawText || '').length / 90) * 16;
  };

  for (const block of structure.blocks) {
    const weight = getBlockWeight(block);

    if (block.type === 'budget_table') {
      const bTable = block as BudgetTableBlock;
      
      // Se cabe inteiro na página atual
      if (weight <= remainingBudget) {
        currentBlocks.push(bTable);
        remainingBudget -= weight;
      } else {
        let remainingRows = [...bTable.rows];
        let isCont = false;

        while (remainingRows.length > 0) {
          const partWeight = 35 + remainingRows.length * 42;
          if (partWeight <= remainingBudget) {
            currentBlocks.push({
              type: 'budget_table',
              entity: isCont ? (bTable.entity ? `${bTable.entity} (Continuação)` : undefined) : bTable.entity,
              rows: remainingRows,
              isContinuation: isCont
            });
            remainingBudget -= partWeight;
            remainingRows = [];
          } else if (remainingBudget >= 180 && remainingRows.length > 2) {
            const rowsThatFit = Math.max(2, Math.floor((remainingBudget - 35) / 42));
            const chunk = remainingRows.slice(0, rowsThatFit);
            remainingRows = remainingRows.slice(rowsThatFit);

            currentBlocks.push({
              type: 'budget_table',
              entity: isCont ? (bTable.entity ? `${bTable.entity} (Continuação)` : undefined) : bTable.entity,
              rows: chunk,
              isContinuation: isCont
            });
            isCont = true;
            startNewPage();
          } else {
            startNewPage();
          }
        }
      }
    } else {
      // Artigos, títulos ou parágrafos
      if (weight <= remainingBudget) {
        currentBlocks.push(block);
        remainingBudget -= weight;
      } else {
        startNewPage();
        currentBlocks.push(block);
        remainingBudget -= weight;
      }
    }
  }

  // Verifica se o fecho e a assinatura cabem na página atual
  const fechoWeight = 190;
  if (remainingBudget >= fechoWeight) {
    // Cabe na página atual
    pages.push({
      pageNumber: currentPageNum,
      totalPages: 0,
      isFirstPage: currentPageNum === 1,
      isLastPage: true,
      blocks: [...currentBlocks],
      includeEpigraph: currentPageNum === 1,
      includeEmenta: currentPageNum === 1,
      includePreambulo: currentPageNum === 1 && !!structure.preambulo,
      includeFechoAssinatura: true
    });
  } else {
    // Fecha a página de conteúdo e cria uma folha final com o fecho
    if (currentBlocks.length > 0) {
      pages.push({
        pageNumber: currentPageNum,
        totalPages: 0,
        isFirstPage: currentPageNum === 1,
        isLastPage: false,
        blocks: [...currentBlocks],
        includeEpigraph: currentPageNum === 1,
        includeEmenta: currentPageNum === 1,
        includePreambulo: currentPageNum === 1 && !!structure.preambulo,
        includeFechoAssinatura: false
      });
      currentPageNum++;
    }

    pages.push({
      pageNumber: currentPageNum,
      totalPages: 0,
      isFirstPage: false,
      isLastPage: true,
      blocks: [],
      includeEpigraph: false,
      includeEmenta: false,
      includePreambulo: false,
      includeFechoAssinatura: true
    });
  }

  // Atualiza totalPages em todas as páginas geradas
  const total = pages.length;
  pages.forEach(p => {
    p.totalPages = total;
  });

  return pages;
}

/**
 * Converte um bloco de tabela orçamentária em texto TSV para colar direto no Excel / Sheets
 */
export function budgetTableToTSV(block: BudgetTableBlock): string {
  const lines: string[] = [];
  if (block.entity) lines.push(`${block.entity}\t`);
  
  block.rows.forEach(r => {
    if (r.isNaturezaDespesa && r.naturezaValor) {
      lines.push(`${r.label}\t${r.naturezaCodeDesc || ''}\t${r.naturezaValor}`);
    } else {
      lines.push(`${r.label}\t${r.value}`);
    }
  });
  return lines.join('\n');
}

/**
 * Converte um bloco de tabela orçamentária em texto formatado para ofício
 */
export function budgetTableToText(block: BudgetTableBlock): string {
  const lines: string[] = [];
  if (block.entity) lines.push(block.entity + '\n');
  
  block.rows.forEach(r => {
    if (r.isNaturezaDespesa && r.naturezaValor) {
      lines.push(`${r.label.padEnd(24, ' ')} ${r.naturezaCodeDesc || ''} ....... ${r.naturezaValor}`);
    } else {
      lines.push(`${r.label.padEnd(24, ' ')} ${r.value}`);
    }
  });
  return lines.join('\n');
}

/**
 * Converte todas as tabelas orçamentárias de uma lei em um único TSV para Excel
 */
export function allBudgetTablesToTSV(lawTitle: string, blocks: LawContentBlock[]): string {
  const tables = blocks.filter(b => b.type === 'budget_table') as BudgetTableBlock[];
  const lines: string[] = [`TABELAS DE DOTAÇÃO ORÇAMENTÁRIA - ${lawTitle}\n`];
  
  tables.forEach((t, idx) => {
    lines.push(`--- TABELA ${idx + 1} ${t.entity ? `(${t.entity})` : ''} ---`);
    lines.push(budgetTableToTSV(t));
    lines.push('');
  });
  return lines.join('\n');
}
