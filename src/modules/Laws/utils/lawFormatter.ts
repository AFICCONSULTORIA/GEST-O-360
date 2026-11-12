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

export interface DataTableBlock {
  type: 'data_table';
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
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

export type LawContentBlock = ArticleBlock | BudgetTableBlock | DataTableBlock | GenericBlock;

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
 * Extrai a data real de assinatura/publicação da norma (priorizando o Fecho "Gabinete do Prefeito... aos DD dias..."
 * ou a Epígrafe, NUNCA confundindo com datas de leis antigas citadas na Ementa ou no Art. 1º).
 */
export function extractRealLawDateAndYear(rawText: string, epigrafeLine?: string): {
  isoDate?: string;
  extensoDate?: string;
  year?: number;
} {
  const monthNames: Record<string, string> = {
    janeiro: '01', fevereiro: '02', marco: '03', março: '03', abril: '04',
    maio: '05', junho: '06', julho: '07', agosto: '08',
    setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
  };

  let detectedYear: number | undefined;
  let isoDate: string | undefined;
  let extensoDate: string | undefined;

  // 1. Verifica ano explícito na linha de epígrafe (ex: "LEI COMPLEMENTAR N.º 106/ 2026.")
  const epSource = epigrafeLine || rawText.slice(0, 350);
  const epSlashYear = epSource.match(/(?:LEI|DECRETO|PORTARIA|RESOLUÇÃO|COMPLEMENTAR)[^/\n]{1,35}\/\s*(\d[\d.]{3})\b/i);
  if (epSlashYear) {
    const y = parseInt(epSlashYear[1].replace(/\D/g, ''), 10);
    if (y >= 1990 && y <= 2100) detectedYear = y;
  }

  // 2. Verifica data completa na epígrafe (ex: "LEI Nº 1378 DE 13 DE OUTUBRO DE 2026")
  const epFullDate = epSource.match(/(?:LEI|DECRETO|PORTARIA|RESOLUÇÃO)[^\n]{1,35}?DE\s+(\d{1,2})\s+DE\s+([A-ZÇÃÕÁÉÍÓÚ]+)\s+DE\s+(\d[\d.]{3})/i);
  if (epFullDate) {
    const d = epFullDate[1].padStart(2, '0');
    const mName = epFullDate[2].toLowerCase();
    const m = monthNames[mName];
    const yStr = epFullDate[3].replace(/\D/g, '');
    if (m && yStr.length === 4) {
      detectedYear = parseInt(yStr, 10);
      isoDate = `${yStr}-${m}-${d}`;
      extensoDate = formatLegalDate(isoDate);
    }
  }

  // 3. Busca data no Fecho ("Gabinete do Prefeito...", "Paço...", "Torixoréu..., aos DD dias do mês de MM de YYYY")
  const fechoDateRegex = /(?:Gabinete|Paço|Sala\s+das\s+Sessões|Torixor[ée]u[^\n,.]{0,30},?\s+aos)\s*[^\n]{0,80}?(\d{1,2})\s*(?:º|o|°)?\s*(?:dias?\s+do\s+m[êe]s\s+de\s+|de\s+)([a-zA-ZçÇãõáéíóú]+)\s+(?:do\s+ano\s+)?de\s+(\d[\d.]{3})/gi;
  let fechoMatch: RegExpExecArray | null;
  while ((fechoMatch = fechoDateRegex.exec(rawText)) !== null) {
    const d = fechoMatch[1].padStart(2, '0');
    const mName = fechoMatch[2].toLowerCase();
    const m = monthNames[mName];
    const yStr = fechoMatch[3].replace(/\D/g, '');
    if (m && yStr.length === 4) {
      const yNum = parseInt(yStr, 10);
      detectedYear = yNum;
      isoDate = `${yStr}-${m}-${d}`;
      extensoDate = formatLegalDate(isoDate);
    }
  }

  // 4. Se ainda não achou data no fecho, busca a ÚLTIMA data por extenso do documento (desde que não faça parte de "Lei ... de DD de MM de YYYY")
  if (!isoDate) {
    const allDatesRegex = /(\d{1,2})\s*(?:º|o|°)?\s*(?:dias?\s+do\s+m[êe]s\s+de\s+|de\s+)([a-zA-ZçÇãõáéíóú]+)\s+(?:do\s+ano\s+)?de\s+(\d[\d.]{3})/gi;
    let m: RegExpExecArray | null;
    while ((m = allDatesRegex.exec(rawText)) !== null) {
      const prefixContext = rawText.slice(Math.max(0, m.index - 45), m.index);
      // Ignora datas que claramente pertencem a leis citadas (ex: "Lei Complementar Municipal nº 45, de 30 de dezembro de 2022")
      if (/(?:Lei|Decreto|Portaria)[^.;\n]{0,35}n[º°.]?\s*[\d.]+\s*,\s*de\s*$/i.test(prefixContext)) {
        continue;
      }
      const d = m[1].padStart(2, '0');
      const mCode = monthNames[m[2].toLowerCase()];
      const yStr = m[3].replace(/\D/g, '');
      if (mCode && yStr.length === 4) {
        const yNum = parseInt(yStr, 10);
        if (!detectedYear || yNum === detectedYear) {
          detectedYear = yNum;
          isoDate = `${yStr}-${mCode}-${d}`;
          extensoDate = formatLegalDate(isoDate);
        }
      }
    }
  }

  return { isoDate, extensoDate, year: detectedYear };
}

/**
 * Detecta se uma linha é ruído de OCR gerado por bordas de tabela ou brasão escaneado
 * (ex: "PE TT EL RE DERNENE Lo * EE", "NS E AAA Do RA Eos ES...", "TEEASSEM 7] OETIGENTE...")
 */
export function isOcrGibberishLine(rawLine: string): boolean {
  const l = (rawLine || '').trim();
  if (!l) return false;

  // Preserva linhas legítimas da estrutura da norma
  if (/^(?:Art\.|Artigo|§|Parágrafo|LEI|DECRETO|PORTARIA|RESOLUÇÃO|ANEXO|TABELA|QUADRO|Órgão|Unidade|Função|Subfunção|Programa|Projeto|Natureza|Fonte|Gabinete|Prefeito|THIAGO)/i.test(l)) {
    return false;
  }

  // Padrões conhecidos de alucinação do Tesseract sobre linhas de grade e brasão
  if (
    /\b(?:CSLL\s+ADA\s+CTT|PE\s+TT\s+EL\s+RE|DERNENE|PSA\s+ua\s+dia|NR\s+ALA\s+a\s+A\s+EL|NS\s+A\s+AL\s+MAL|NS\s+E\s+AAA\s+Do\s+RA|TEEASSEM|OETIGENTE|RESET\s+aa\s+Ea)\b/i.test(l) ||
    /^cr\s*[-–—]\s*1\s*\[ue\]/i.test(l) ||
    /^CLASSE\s*[-–—]\s*COEFICIENTE\]!/i.test(l)
  ) {
    return true;
  }

  // Verifica se a linha tem excesso de fragmentos curtos desconexos (1 a 3 letras) típicos de leitura de grade de tabela por OCR fraco
  const decimalNumbers = l.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || [];
  if (decimalNumbers.length >= 2) return false; // É linha numérica de tabela salarial

  const tokens = l.replace(/[|[\](){}=+*~^`´"“”'‘’.,;:!?/-]/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length >= 6) {
    const shortTokens = tokens.filter(t => t.length <= 3);
    const allCapsRandom = tokens.filter(t => /^[A-Z]{1,3}$/.test(t));
    if (shortTokens.length / tokens.length >= 0.72 && allCapsRandom.length >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Detecta se uma linha é timbre/cabeçalho institucional repetitivo de página
 * (incluindo variações com ruído de OCR sob o brasão municipal)
 */
export function isRepeatedHeaderNoiseLine(rawLine: string): boolean {
  const l = (rawLine || '').trim();
  if (!l) return false;

  // Nunca descarta preâmbulo, artigos ou fecho
  if (/(?:faz\s+saber\s+que|no\s+uso\s+de\s+suas\s+atribui|Gabinete\s+do\s+Prefeito|sanciono\s+a\s+seguinte|Art\.\s*\d)/i.test(l)) {
    return false;
  }

  return (
    /^(ESTADO\s+DE\s+MATO\s+GROSSO|MUNIC[IÍ]PIO\s+DE(\s+TORIXOR[EÉ]U)?|TORIXOR[EÉ]U(\s*[-–/]\s*MT)?|PREFEITURA\s+MUNICIPAL(\s+DE\s+TORIXOR[EÉ]U)?|C[AÂ]MARA\s+MUNICIPAL(\s+DE\s+TORIXOR[EÉ]U)?|PODER\s+(EXECUTIVO|LEGISLATIVO)(\s+MUNICIPAL)?|GABINETE\s+DO\s+(PREFEITO|PRESIDENTE)(\s+MUNICIPAL)?)$/i.test(l) ||
    /Responsabilidade\s*[•·«»\-–—\s]*Trabalho\s*[•·«»\-–—\s]*Transpar[êe]ncia/i.test(l) ||
    // Timbre escaneado com ruído de OCR ao redor de "Município de TORIXORÉU"
    (l.length < 115 && /(?:Munic[íi]pio\s+de.{0,18}TORIXOR[ÉE]U|^(?:Yy|YV|AB|No)\s+(?:Munic[íi]pio|TORIXOR[ÉE]U)|^Munic[íi]pio\s+de\s+[éaà]\s*$)/i.test(l)) ||
    /^ADM\.?\s*\d{4}(\s*[/\-–]\s*\d{4})?$/i.test(l) ||
    /^CNPJ\s*[:nº°.]*\s*\d{2}\.?\d{3}\.?\d{3}\/\d{4}-\d{2}/i.test(l) ||
    /Di[áa]rio\s+Oficial\s+dos\s+Munic[íi]pios\s+do\s+Estado\s+do\s+Mato\s+Grosso/i.test(l) ||
    /Associa[çc][ãa]o\s+Mato-grossense\s+dos\s+Munic[íi]pios/i.test(l) ||
    /^Mato\s+Grosso\s*,\s*\d{1,2}\s+de\s+[a-zA-ZçÇ]+\s+de\s+\d{4}\s*[•|·]/i.test(l) ||
    /^(?:www\.)?amm\.diariomunicipal\.org|diariomunicipal\.org\.br\/mt/i.test(l) ||
    /^(?:AMM-MT|Dispon[íi]vel\s+na\s+edi[çc][ãa]o\s+de\s+\d|Mato\s+Grosso)$/i.test(l)
  );
}

/**
 * Detecta se uma linha é rodapé de papel timbrado, endereço, telefone, paginação ou carimbo repetitivo
 */
export function isRepeatedFooterNoiseLine(rawLine: string): boolean {
  const l = (rawLine || '').trim();
  if (!l) return false;
  return (
    /(?:Rua\s+XV\s+de\s+Novembro|R\.\s*XV\s+de\s+Novembro|Setor\s+Aeroporto|CEP\s*:?\s*78\.?695|prefeitura@torixoreu|prefeituratorixoreu|www\.prefeituratorixoreu|torixoreu\.mt\.gov\.br|camaratorixoreu|Fone:\s*\(66\)|Tel(?:efone)?:\s*\(66\)|\(66\)\s*9?\s*\d{4}[-\s]\d{4})/i.test(l) ||
    /^(?:P[áa]gina|P[áa]g\.?|Fl\.?|Folha)\s*\d+\s*(?:de|\/)\s*\d+$/i.test(l) ||
    /^\d{1,2}\s*\/\s*\d{1,2}$/.test(l) ||
    /^(?:C[óo]digo\s+Identificador|C[óo]digo\s+Verificador|Hash|Chave\s+de\s+Valida[çc][ãa]o)\s*:/i.test(l) ||
    /Mat[ée]ria\s+publicada\s+no\s+Di[áa]rio\s+Oficial\s+dos\s+Munic[íi]pios/i.test(l) ||
    /^Documento\s+assinado\s+(?:digitalmente|eletronicamente)\s+(?:por|conforme)/i.test(l) ||
    /^A\s+autenticidade\s+deste\s+documento\s+pode\s+ser\s+conferida/i.test(l)
  );
}

/**
 * Higieniza o texto bruto de uma lei:
 * 1) Remove caracteres estranhos (glifo PUA \uE000-\uF8FF, \uFFFD, controles, hífens suaves).
 * 2) Corrige sequências de Mojibake UTF-8/ISO-8859-1 e ligaturas tipográficas.
 * 3) Remove cabeçalhos, rodapés institucionais repetidos e ruídos de borda de tabela.
 */
export function cleanAndNormalizeLawText(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText
    // Normaliza quebras de linha e espaços não-quebráveis
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F]/g, ' ')
    // Remove caracteres invisíveis, zero-width e soft-hyphens
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // Remove glifos de Private Use Area (comuns em fontes quebradas de PDF) e caractere de substituição
    .replace(/[\uE000-\uF8FF\uFFFD]/g, '')
    // Remove caracteres de controle ASCII (exceto \n e \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Expande ligaturas tipográficas
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    // Substitui marcadores estranhos de fontes Symbol/Wingdings por bullet padrão
    .replace(/[▪▫]/g, '•')
    // Corrige Mojibake comum em PDFs municipais (UTF-8 lido como Latin-1)
    .replace(/Ã£/g, 'ã')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã©/g, 'é')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã¡/g, 'á')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã­/g, 'í')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ã¢/g, 'â')
    .replace(/Ã€/g, 'À')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ãƒ/g, 'Ã')
    .replace(/Âº/g, 'º')
    .replace(/Â°/g, 'º')
    .replace(/Âª/g, 'ª')
    .replace(/Â§/g, '§')
    // Corrige erros comuns de OCR em títulos de tabelas (ex: "PROFISSIONALIDADO" -> "PROFISSIONALIZADO")
    .replace(/PROFISSIONALIDADO/gi, 'PROFISSIONALIZADO')
    // Remove sufixo de ruído de grade após "30 HORAS" ou "40 HORAS"
    .replace(/(\b\d+\s*HORAS)\s*(?:PE\s+TT\s+EL|\|\s*Se\s+ves|:\s*$).*$/gim, '$1')
    // Une palavras hifenizadas na quebra de linha de coluna (ex: "adminis-\ntração" -> "administração")
    .replace(/([a-zà-ú]{3,})-\s*\n\s*([a-zà-ú]{2,})/g, '$1$2');

  const rawLines = cleaned.split('\n');
  const filteredLines: string[] = [];

  for (let idx = 0; idx < rawLines.length; idx++) {
    let line = rawLines[idx].replace(/[ \t]{2,}/g, (m) => (m.includes('\t') ? '\t' : ' ')).trim();

    if (!line) {
      if (filteredLines.length > 0 && filteredLines[filteredLines.length - 1] !== '') {
        filteredLines.push('');
      }
      continue;
    }

    // Remove linhas de cabeçalho, rodapé repetitivos ou lixo de borda de tabela do OCR
    if (isRepeatedHeaderNoiseLine(line) || isRepeatedFooterNoiseLine(line) || isOcrGibberishLine(line)) {
      continue;
    }

    // Remove caracteres isolados órfãos gerados por sujeira de scanner ou borda de página
    if (/^[a-zA-Z~^`´|¦_.,;:*•°º-]$/.test(line) && line.toLowerCase() !== 'e') {
      continue;
    }

    // Limpa dois-pontos duplicados no fim do preâmbulo (": :" -> ":")
    line = line.replace(/:\s*:\s*$/, ':');

    filteredLines.push(line);
  }

  return filteredLines.join('\n').trim();
}

/**
 * Faz o parsing estruturado do texto de uma lei municipal
 */
export function parseLawDocument(
  fullText: string, 
  defaultEmenta?: string,
  meta?: LawMetadataFallback
): ParsedLawStructure {
  const sanitizedFullText = cleanAndNormalizeLawText(fullText || '');
  const lines = sanitizedFullText.split('\n').map(l => l.trim());
  const defaultEntidade = meta?.institution_name ? meta.institution_name.toUpperCase() : 'PREFEITURA MUNICIPAL';

  const structure: ParsedLawStructure = {
    diarioHeader: {
      diario: meta?.institution_name ? meta.institution_name.toUpperCase() : 'PORTAL DA LEGISLAÇÃO',
      edicaoData: meta?.publication_date ? `Publicação de ${formatLegalDate(meta.publication_date)}` : 'Texto Legislativo',
      estado: 'Transparência Municipal'
    },
    epigrafe: {
      tipoNumero: `${(meta?.type || 'LEI').toUpperCase()} Nº ${meta?.number || ''}`,
      data: formatLegalDate(meta?.publication_date),
      entidade: defaultEntidade
    },
    ementa: defaultEmenta ? cleanAndNormalizeLawText(defaultEmenta) : '',
    blocks: [],
    assinatura: {
      nome: meta?.author?.trim() || 'Conforme documento oficial assinado',
      cargo: 'Autoridade Signatária'
    }
  };

  let i = 0;
  const n = lines.length;

  const isEpigrafeLine = (l: string): boolean =>
    /^(?:PROJETO\s+DE\s+|AUTÓGRAFO\s+DE\s+|DE\s+)?(LEI\s+COMPLEMENTAR|LEI\s+ORGÂNICA|LEI\s+ORDINÁRIA|LEI\s+MUNICIPAL|LEI|DECRETO\s+LEGISLATIVO|DECRETO|PORTARIA|RESOLUÇÃO|EMENDA)\s*(?:MUNICIPAL\s+)?(?:Nº|N°|N\.º|N\.°|NUM|N)?\s*[\d.]+/i.test(l);

  const isHeaderNoiseLine = (l: string): boolean => isRepeatedHeaderNoiseLine(l);
  const isFooterContactLine = (l: string): boolean => isRepeatedFooterNoiseLine(l);

  // Detecta se uma linha faz parte de uma tabela em grade (separada por pipe "|", múltiplos tabs "\t" ou linha numérica salarial)
  const isPipeOrTabTableRow = (l: string): boolean => {
    if (!l || /AMM-MT|Disponível na edição/i.test(l)) return false;
    const pipeCount = (l.match(/\|/g) || []).length;
    if (pipeCount >= 2) return true;
    if (pipeCount === 1 && !/^https?:/i.test(l) && l.split('|').every(c => c.trim().length > 0 && c.trim().length < 120)) {
      return true;
    }
    const tabCount = (l.match(/\t/g) || []).length;
    if (tabCount >= 1 && l.split('\t').filter(c => c.trim().length > 0).length >= 2) {
      return true;
    }
    // Linha de tabela salarial / numérica com 3 ou mais valores decimais (ex: "1  1,03  3.963,40  5.945,10  6.737,78")
    if (!/^(?:Art\.|Artigo|§|Parágrafo)/i.test(l)) {
      const decimalMatches = l.match(/\d{1,3}(?:[.&-]\d{3})*,\d{2}/g) || [];
      if (decimalMatches.length >= 3) return true;
    }
    return false;
  };

  const isMarkdownTableDivider = (l: string): boolean =>
    /^\|?[\s:*-]+(\|[\s:*-]+)+\|?$/.test(l);

  const cleanTableCellText = (cell: string): string => {
    return cell
      .replace(/^\[+|\]+$/g, '')
      // Corrige artefatos de OCR em números de tabelas salariais (ex: "[8-006,06" -> "8.006,06", "8&111,51" -> "8.111,51")
      .replace(/(\d)[&-](\d{3},\d{2})\b/g, '$1.$2')
      .trim();
  };

  const splitTableCells = (l: string): string[] => {
    if (l.includes('|')) {
      const trimmed = l.replace(/^\|+|\|+$/g, '');
      return trimmed.split('|').map(cleanTableCellText);
    }
    if (l.includes('\t')) {
      return l.split('\t').map(cleanTableCellText);
    }
    return l.trim().split(/\s{2,}|\s+(?=\[?\d)/).map(cleanTableCellText);
  };

  const isBudgetRowLine = (l: string): boolean =>
    /^(Órgão|Unidade(\s+Orçamentária)?|Função|Subfunção|Programa|Projeto\/Atividade|Ação|Natureza\s+da\s+Despesa|Elemento\s+de\s+Despesa|Fonte\s+de\s+Recurso|Ficha|Dotação|Classificação\s+Funcional|Código\s+Reduzido|Reduzido|Total(\s+Geral)?)\s*:/i.test(l);

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

  // Pula linhas em branco ou timbres de cabeçalho institucional antes da Epígrafe
  while (i < n && (!lines[i] || ((isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i])) && !isEpigrafeLine(lines[i])))) {
    if (/CÂMARA\s+MUNICIPAL|PODER\s+LEGISLATIVO/i.test(lines[i])) {
      structure.epigrafe.entidade = 'CÂMARA MUNICIPAL';
    }
    i++;
  }

  // 2. Detecção de Epígrafe (LEI Nº ..., LEI COMPLEMENTAR N.º ..., DE LEI N° ...)
  if (i < n && isEpigrafeLine(lines[i])) {
    const rawEpigrafe = lines[i].replace(/^DE\s+(LEI|DECRETO)/i, '$1').trim();
    i++;
    while (i < n && (!lines[i] || isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i]))) i++;

    const realDateInfo = extractRealLawDateAndYear(sanitizedFullText, rawEpigrafe);
    let dataEpigrafe = formatLegalDate(meta?.publication_date) || realDateInfo.extensoDate || '';
    const inlineDateMatch = rawEpigrafe.match(/(\d{1,2}\s+DE\s+[A-ZÇÃÕÁÉÍÓÚ]+\s+DE\s+\d[\d.]{2,4})/i);
    if (inlineDateMatch) {
      dataEpigrafe = inlineDateMatch[1].replace(/\./g, '');
    } else if (
      i < n &&
      /^\d{1,2}\s+de\s+[a-zA-ZçÇ]+\s+de\s+\d[\d.]{2,4}$/i.test(lines[i])
    ) {
      dataEpigrafe = lines[i++].replace(/\./g, '');
    }

    if (!meta?.publication_date && realDateInfo.extensoDate) {
      structure.diarioHeader.edicaoData = `Disponível na edição de ${realDateInfo.extensoDate}`;
    }

    while (i < n && (!lines[i] || isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i]))) i++;
    const entidade = (i < n && /^(PREF|PREFEITURA|CÂMARA|CAMARA|MUNICÍPIO|MUNICIPIO)/i.test(lines[i]) && !/FAZ\s+SABER|uso\s+de\s+suas/i.test(lines[i]))
      ? lines[i++]
      : structure.epigrafe.entidade || defaultEntidade;
    
    structure.epigrafe = {
      tipoNumero: rawEpigrafe,
      data: dataEpigrafe,
      entidade: entidade || defaultEntidade
    };
  }

  while (i < n && (!lines[i] || isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i]))) i++;

  // Pula eventual repetição da epígrafe (comum no padrão AMM-MT antes da ementa)
  while (i < n && isEpigrafeLine(lines[i])) {
    i++;
    while (i < n && (!lines[i] || isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i]))) i++;
  }

  // 3. Detecção de Ementa (entre aspas ou iniciando com verbos legislativos clássicos, mesmo que dividida por linhas em branco no OCR)
  if (
    i < n &&
    (/^["“']/i.test(lines[i]) ||
      /^(dispõe|autoriza|institui|altera|cria|estabelece|regulamenta|fixa|aprova|declara|denomina|concede|abre|revoga|dá\s+nova)/i.test(lines[i]))
  ) {
    const ementaLines: string[] = [];
    while (
      i < n &&
      !/^(O\s+PREFEITO|A\s+PREFEITA|O\s+PRESIDENTE|A\s+MESA\s+DIRETORA|A\s+CÂMARA\s+MUNICIPAL|FAÇO\s+SABER|Nós,\s+os\s+representantes|Art\.|Artigo\s+\d)/i.test(lines[i])
    ) {
      const curEmentaLine = lines[i];
      if (!curEmentaLine) {
        // Se já fechou aspas ou ponto final após "providências", encerra a ementa
        const joinedSoFar = ementaLines.join(' ').trim();
        if (/["”']\s*$/.test(joinedSoFar) || /provid[êe]ncias\.?\s*["”']?$/i.test(joinedSoFar)) {
          i++;
          break;
        }
        i++;
        continue;
      }
      if (!isHeaderNoiseLine(curEmentaLine) && !isFooterContactLine(curEmentaLine) && !isOcrGibberishLine(curEmentaLine)) {
        ementaLines.push(curEmentaLine);
      }
      if (/["”']\s*$/.test(curEmentaLine) || /provid[êe]ncias\.?\s*["”']?$/i.test(curEmentaLine)) {
        i++;
        break;
      }
      i++;
    }
    const detectedEmenta = ementaLines.join(' ').replace(/^["“']+|["”']+$/g, '').replace(/\s+/g, ' ').trim();
    if (detectedEmenta) {
      structure.ementa = detectedEmenta;
    }
  }

  while (i < n && (!lines[i] || isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i]))) i++;

  // 4. Detecção de Preâmbulo ("O Prefeito do Município... faz saber...", "A MESA DIRETORA...")
  if (
    i < n &&
    /^(O\s+PREFEITO|A\s+PREFEITA|O\s+PRESIDENTE|A\s+MESA\s+DIRETORA|A\s+CÂMARA\s+MUNICIPAL|FAÇO\s+SABER|Nós,\s+os\s+representantes)/i.test(lines[i])
  ) {
    const preambuloLines: string[] = [];
    while (i < n && !/^(?:Art\.|ART\.|Artigo|ARTIGO)\s*[0-9]/.test(lines[i])) {
      if (lines[i] && !isHeaderNoiseLine(lines[i]) && !isFooterContactLine(lines[i])) {
        preambuloLines.push(lines[i]);
      }
      i++;
    }
    structure.preambulo = preambuloLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  // 5. Varredura do Corpo da Lei (Artigos, Parágrafos, Tabelas em Grade e Tabelas Orçamentárias)
  let currentBudgetRows: BudgetTableRow[] = [];
  let budgetEntity = '';
  let pendingTableTitle = '';

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

  const peekNextMeaningfulLine = (startIndex: number): string => {
    let k = startIndex;
    while (k < n && (!lines[k] || isHeaderNoiseLine(lines[k]) || isFooterContactLine(lines[k]))) {
      k++;
    }
    return k < n ? lines[k] : '';
  };

  const isStructuralStartLine = (l: string): boolean => {
    if (!l) return true;
    return (
      /^(?:Art\.|ART\.|Artigo|ARTIGO)\s*[0-9º°ªa-zA-Z.-]+/.test(l) ||
      /^(§\s*\d+|Parágrafo\s+único)/i.test(l) ||
      /^[IVXLCDM]+\s*[-–—.]/i.test(l) ||
      /^[a-z]\)\s+/i.test(l) ||
      /^(TÍTULO|CAPÍTULO|LIVRO|SEÇÃO|SUBSEÇÃO|ANEXO|TABELA|QUADRO)\s+/i.test(l) ||
      isBudgetRowLine(l) ||
      isPipeOrTabTableRow(l) ||
      /^(Prefeitura Municipal|Câmara Municipal|Fundo Municipal)/i.test(l) ||
      /^(Gabinete\s+do\s+(Prefeito|Presidente)|Paço\s+(Municipal|Legislativo)|Sala\s+das\s+Sessões)/i.test(l) ||
      /^[A-ZÀ-Ú\s]{4,}\s*\/\s*MT,\s*(?:aos\s+)?\d{1,2}\s+/i.test(l) ||
      /^THIAGO\s+(?:TIMO|PIMO)\s+OLIVEIRA/i.test(l) ||
      isHeaderNoiseLine(l) ||
      isFooterContactLine(l)
    );
  };

  while (i < n) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }

    // Ignora cabeçalhos/rodapés repetitivos de página ou caracteres órfãos de OCR
    if (
      isHeaderNoiseLine(line) ||
      isFooterContactLine(line) ||
      (isEpigrafeLine(line) && structure.blocks.length > 0) ||
      (/^[a-zA-Z~^`´|¦_.,;:*•°º-]$/.test(line) && line.toLowerCase() !== 'e')
    ) {
      i++;
      continue;
    }

    const nextMeaningful = peekNextMeaningfulLine(i + 1);

    // Subtítulo de Anexo / Quadro / Tabela imediatamente antes de uma tabela em grade
    if (/^(?:ANEXO|TABELA|QUADRO)\b/i.test(line) && isPipeOrTabTableRow(nextMeaningful)) {
      flushBudgetTable();
      pendingTableTitle = line;
      i++;
      continue;
    }

    // Bloco de Tabela em Grade (Markdown "| Col1 | Col2 |" ou Tabulado "Col1\tCol2")
    if (isPipeOrTabTableRow(line)) {
      flushBudgetTable();
      const rawTableLines: string[] = [];
      const tableStartIdx = i;

      while (i < n) {
        const cur = lines[i];
        if (!cur || isHeaderNoiseLine(cur) || isFooterContactLine(cur)) {
          // Verifica se a tabela continua logo após uma linha em branco ou quebra de página
          const afterGap = peekNextMeaningfulLine(i + 1);
          if (isPipeOrTabTableRow(afterGap)) {
            i++;
            continue;
          }
          break;
        }
        if (isPipeOrTabTableRow(cur) || isMarkdownTableDivider(cur)) {
          if (!isMarkdownTableDivider(cur)) {
            rawTableLines.push(cur);
          }
          i++;
        } else {
          break;
        }
      }

      if (rawTableLines.length >= 1) {
        const parsedRows = rawTableLines.map(splitTableCells).filter(r => r.some(c => c.length > 0));
        if (parsedRows.length >= 2) {
          const colCount = Math.max(...parsedRows.map(r => r.length));
          const normalizedRows = parsedRows.map(r => {
            const copy = [...r];
            while (copy.length < colCount) copy.push('');
            return copy;
          });
          structure.blocks.push({
            type: 'data_table',
            id: `sec-dtable-${tableStartIdx}`,
            title: pendingTableTitle || undefined,
            headers: normalizedRows[0],
            rows: normalizedRows.slice(1)
          });
          pendingTableTitle = '';
          continue;
        } else if (parsedRows.length === 1) {
          structure.blocks.push({
            type: 'paragrafo',
            id: `sec-p-${tableStartIdx}`,
            rawText: parsedRows[0].join(' — ')
          });
          pendingTableTitle = '';
          continue;
        }
      }
      pendingTableTitle = '';
    }

    // Linha de Cabeçalho / Subtítulo Institucional antes de tabela orçamentária (ex: "Prefeitura Municipal de Torixoréu")
    if (/^(Prefeitura Municipal|Câmara Municipal|Fundo Municipal)/i.test(line) && isBudgetRowLine(nextMeaningful)) {
      flushBudgetTable();
      budgetEntity = line;
      i++;
      continue;
    }

    // Linha de Dotação Orçamentária
    if (isBudgetRowLine(line)) {
      const colonIdx = line.indexOf(':');
      const label = line.slice(0, colonIdx + 1).trim();
      let val = line.slice(colonIdx + 1).trim();

      const isNatureza = /^(Natureza\s+da\s+Despesa|Elemento\s+de\s+Despesa):/i.test(label);
      const isOrgao = /^Órgão:/i.test(label);
      const isFonte = /^Fonte\s+de\s+Recurso:/i.test(label);
      const isProj = /^(Projeto\/Atividade|Ação):/i.test(label);

      if (isOrgao && currentBudgetRows.length > 0) {
        flushBudgetTable();
      }

      i++;

      // Une linhas de continuação da mesma célula orçamentária (ex: valor R$ na linha de baixo)
      while (i < n) {
        const contLine = lines[i];
        if (!contLine || isHeaderNoiseLine(contLine) || isFooterContactLine(contLine)) {
          // Se for ruído de cabeçalho/rodapé no meio do quadro orçamentário, pula sem quebrar a tabela!
          if (contLine && (isHeaderNoiseLine(contLine) || isFooterContactLine(contLine))) {
            i++;
            continue;
          }
          break;
        }
        if (!isStructuralStartLine(contLine)) {
          val = `${val} ${contLine}`.trim();
          i++;
        } else {
          break;
        }
      }

      let naturezaCodeDesc = '';
      let naturezaValor = '';

      if (isNatureza) {
        const match = val.match(/^(.*?)(?:\.{2,}|_{2,}|\s{2,}|…+)(R\$\s*[\d.,]+)/i);
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

      continue;
    }

    flushBudgetTable();

    // Título, Capítulo ou Anexo
    if (/^(TÍTULO|ANEXO)\s+/i.test(line)) {
      structure.blocks.push({
        type: 'heading_titulo',
        id: `sec-titulo-${i}`,
        rawText: line
      });
      i++;
      continue;
    }

    if (/^(CAPÍTULO|LIVRO|SEÇÃO|SUBSEÇÃO)\s+/i.test(line)) {
      structure.blocks.push({
        type: 'heading_capitulo',
        id: `sec-capitulo-${i}`,
        rawText: line
      });
      i++;
      continue;
    }

    // Artigo (Art. 1º, Artigo 2º...) — une linhas quebradas do mesmo caput ignorando cabeçalhos/rodapés de quebra de página
    if (/^(?:Art\.|ART\.|Artigo|ARTIGO)\s*([0-9º°ªa-zA-Z.-]+)/.test(line)) {
      const match = line.match(/^(?:Art\.|ART\.|Artigo|ARTIGO)\s*([0-9º°ªa-zA-Z.-]+)/);
      const cleanNum = match ? match[1].replace(/^[-–—.\s]+|[-–—.\s]+$/g, '') : '';
      const artLabel = cleanNum ? `Art. ${cleanNum}` : 'Artigo';

      const artLines = [line];
      const startIdx = i;
      i++;

      while (i < n && lines[i]) {
        if (isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i])) {
          i++;
          continue;
        }
        if (isStructuralStartLine(lines[i])) break;
        artLines.push(lines[i]);
        i++;
      }

      structure.blocks.push({
        type: 'article',
        id: `sec-art-${startIdx}`,
        articleLabel: artLabel,
        rawText: artLines.join(' ').replace(/\s+/g, ' ').trim()
      });
      continue;
    }

    // Fecho e Assinatura (suporta fecho em múltiplas linhas, ex: "...aos 31\ndias do mês de março de 2.026.")
    if (
      /^(Gabinete\s+do\s+(Prefeito|Presidente)|Paço\s+(Municipal|Legislativo)|Sala\s+das\s+Sessões)/i.test(line) ||
      /^[A-ZÀ-Ú\s]{4,}\s*\/\s*MT,\s*(?:aos\s+)?\d{1,2}\s+/i.test(line)
    ) {
      const fechoLines = [line];
      i++;
      while (
        i < n &&
        lines[i] &&
        !/^(THIAGO|PREFEITO|PRESIDENTE|VEREADOR|SECRETÁRI)/i.test(lines[i]) &&
        (/^(dias|de\s+|mês|ano|\d{4}|\d\.\d{3})/i.test(lines[i]) || !/\.\s*$/.test(fechoLines[fechoLines.length - 1]))
      ) {
        if (!isHeaderNoiseLine(lines[i]) && !isFooterContactLine(lines[i])) {
          fechoLines.push(lines[i]);
        }
        i++;
        if (/\.\s*$/.test(fechoLines[fechoLines.length - 1])) break;
      }

      structure.fecho = fechoLines.join(' ').replace(/(\d)\.(\d{3})\b/g, '$1$2').replace(/\s+/g, ' ').trim();

      while (i < n && (!lines[i] || isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i]))) i++;

      if (i < n && lines[i] && !/^(Art\.|§|Parágrafo)/i.test(lines[i]) && !isHeaderNoiseLine(lines[i]) && !isFooterContactLine(lines[i])) {
        const nomeSignatario = lines[i++].replace(/THIAGO\s+PIMO\s+OLIVEIRA/i, 'THIAGO TIMO OLIVEIRA');
        while (i < n && (!lines[i] || isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i]))) i++;
        const cargoSignatario = (i < n && /^(Prefeito|Presidente|Secretário|Vereador)/i.test(lines[i]))
          ? lines[i++]
          : 'Prefeito Municipal';
        structure.assinatura = {
          nome: nomeSignatario,
          cargo: cargoSignatario
        };
      }
      continue;
    }

    // Assinatura direta caso o fecho não tenha usado palavra-chave clássica
    if (/^THIAGO\s+(?:TIMO|PIMO)\s+OLIVEIRA$/i.test(line)) {
      structure.assinatura.nome = 'THIAGO TIMO OLIVEIRA';
      i++;
      while (i < n && !lines[i]) i++;
      if (i < n && /^(Prefeito|Presidente)/i.test(lines[i])) {
        structure.assinatura.cargo = lines[i++];
      }
      continue;
    }

    // Parágrafo (§, Parágrafo único, Incisos, Alíneas) — une linhas quebradas ignorando cabeçalho/rodapé de página
    const paraLines = [line];
    const pStartIdx = i;
    i++;
    while (i < n && lines[i]) {
      if (isHeaderNoiseLine(lines[i]) || isFooterContactLine(lines[i])) {
        i++;
        continue;
      }
      if (isStructuralStartLine(lines[i])) break;
      paraLines.push(lines[i]);
      i++;
    }

    structure.blocks.push({
      type: 'paragrafo',
      id: `sec-p-${pStartIdx}`,
      rawText: paraLines.join(' ').replace(/\s+/g, ' ').trim()
    });
  }

  flushBudgetTable();

  if (!structure.fecho && meta?.publication_date) {
    structure.fecho = `${meta?.institution_name || 'Município'}, ${formatLegalDate(meta.publication_date)}.`;
  }

  return structure;
}

/**
 * Paginador Automático de Leis Municipais em Folhas A4 Reais do Diário Oficial
 * Distribui o conteúdo em páginas delimitadas sem estourar e sem cortar o texto.
 */
export function paginateLawDocument(structure: ParsedLawStructure): ParsedLawPage[] {
  const pages: ParsedLawPage[] = [];

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
    if (block.type === 'data_table') {
      const dt = block as DataTableBlock;
      return 45 + dt.rows.length * 32;
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
    } else if (block.type === 'data_table') {
      const dTable = block as DataTableBlock;
      if (weight <= remainingBudget) {
        currentBlocks.push(dTable);
        remainingBudget -= weight;
      } else {
        let remainingRows = [...dTable.rows];
        let isCont = false;
        let partIdx = 0;

        while (remainingRows.length > 0) {
          const partWeight = 45 + remainingRows.length * 32;
          if (partWeight <= remainingBudget) {
            currentBlocks.push({
              type: 'data_table',
              id: `${dTable.id}-p${partIdx}`,
              title: isCont ? (dTable.title ? `${dTable.title} (Continuação)` : 'Tabela (Continuação)') : dTable.title,
              headers: dTable.headers,
              rows: remainingRows,
              isContinuation: isCont
            });
            remainingBudget -= partWeight;
            remainingRows = [];
          } else if (remainingBudget >= 160 && remainingRows.length > 2) {
            const rowsThatFit = Math.max(2, Math.floor((remainingBudget - 45) / 32));
            const chunk = remainingRows.slice(0, rowsThatFit);
            remainingRows = remainingRows.slice(rowsThatFit);

            currentBlocks.push({
              type: 'data_table',
              id: `${dTable.id}-p${partIdx}`,
              title: isCont ? (dTable.title ? `${dTable.title} (Continuação)` : 'Tabela (Continuação)') : dTable.title,
              headers: dTable.headers,
              rows: chunk,
              isContinuation: isCont
            });
            isCont = true;
            partIdx++;
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

  const total = pages.length;
  pages.forEach(p => {
    p.totalPages = total;
  });

  return pages;
}

/**
 * Converte um bloco de tabela em grade (DataTableBlock) em texto TSV para Excel
 */
export function dataTableToTSV(block: DataTableBlock): string {
  const lines: string[] = [];
  if (block.title) lines.push(block.title);
  if (block.headers.length > 0) lines.push(block.headers.join('\t'));
  block.rows.forEach(r => lines.push(r.join('\t')));
  return lines.join('\n');
}

/**
 * Converte um bloco de tabela em grade (DataTableBlock) em texto formatado
 */
export function dataTableToText(block: DataTableBlock): string {
  const lines: string[] = [];
  if (block.title) lines.push(block.title);
  if (block.headers.length > 0) lines.push(`| ${block.headers.join(' | ')} |`);
  block.rows.forEach(r => lines.push(`| ${r.join(' | ')} |`));
  return lines.join('\n');
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
 * Converte todas as tabelas (orçamentárias e em grade) de uma lei em um único TSV para Excel
 */
export function allBudgetTablesToTSV(lawTitle: string, blocks: LawContentBlock[]): string {
  const budgetTables = blocks.filter(b => b.type === 'budget_table') as BudgetTableBlock[];
  const dataTables = blocks.filter(b => b.type === 'data_table') as DataTableBlock[];
  const lines: string[] = [`TABELAS EXTRAÍDAS DA NORMA - ${lawTitle}\n`];
  
  budgetTables.forEach((t, idx) => {
    lines.push(`--- DOTAÇÃO ORÇAMENTÁRIA ${idx + 1} ${t.entity ? `(${t.entity})` : ''} ---`);
    lines.push(budgetTableToTSV(t));
    lines.push('');
  });

  dataTables.forEach((dt, idx) => {
    lines.push(`--- TABELA ${idx + 1} ${dt.title ? `(${dt.title})` : ''} ---`);
    lines.push(dataTableToTSV(dt));
    lines.push('');
  });

  return lines.join('\n');
}
