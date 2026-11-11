import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite resolves ?url imports to local static asset path
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractLawFromPdf, buildDescriptiveLawTitle } from './lawOcrService';
import {
  parseLawDocument,
  ParsedLawStructure,
  cleanAndNormalizeLawText,
  isRepeatedHeaderNoiseLine,
  isRepeatedFooterNoiseLine,
  extractRealLawDateAndYear
} from '../utils/lawFormatter';
import { LawCategory } from '../../../types';

// Configura o worker do PDF.js de forma resiliente
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorkerUrl ||
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.5.438'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.5.438'}/build/pdf.worker.min.mjs`;
  }
}

export interface ExtractedLawResult {
  source: 'native_pdf' | 'ai_ocr';
  rawText: string;
  pageCount: number;
  structuredData: {
    type: string;
    number: string;
    year: number;
    title: string;
    category: LawCategory;
    ementa: string;
    preambulo?: string;
    publication_date: string;
    author?: string;
    origin_power: 'executivo' | 'legislativo';
    materia_numero?: string;
    tags?: string[];
    valor_total_credito?: string;
    full_text: string;
    budget_tables?: any[];
  };
  parsedDoc: ParsedLawStructure;
}

/**
 * Classifica automaticamente a categoria temática da norma pelo texto e ementa
 */
function inferCategoryFromText(text: string): LawCategory {
  const lower = text.toLowerCase();
  if (/crédito\s+adicional|orçamento|superávit|tribut|iptu|issqn|itbi|ppa|ldo|loa|dotação\s+orçamentária/i.test(lower)) {
    return 'Finanças e Tributos';
  }
  if (/saúde|hospital|ubs|atenção\s+primária|sus|vigilância\s+sanitária|medicamento/i.test(lower)) {
    return 'Saúde';
  }
  if (/educação|escola|fundeb|ensino|creche|magistério|professor/i.test(lower)) {
    return 'Educação';
  }
  if (/servidor|cargo|vencimento|estatuto|remuneração|concurso|diária|gratificação/i.test(lower)) {
    return 'Servidores e RH';
  }
  if (/assistência\s+social|cras|creas|benefício\s+eventual|conselho\s+tutelar/i.test(lower)) {
    return 'Assistência Social';
  }
  if (/obra|viação|ponte|pavimentação|estrada|transporte|frota/i.test(lower)) {
    return 'Viação e Obras';
  }
  if (/loteamento|zoneamento|plano\s+diretor|desapropriação|imóvel\s+urbano|denominação\s+de\s+rua/i.test(lower)) {
    return 'Urbanismo e Patrimônio';
  }
  if (/meio\s+ambiente|ambiental|resíduo|saneamento|água|árvore/i.test(lower)) {
    return 'Meio Ambiente';
  }
  return 'Administração Geral';
}

/**
 * Extrai tags automáticas relevantes do texto da norma
 */
function inferTagsFromText(text: string, type: string, category: string): string[] {
  const tags = new Set<string>([type, category]);
  if (/crédito\s+adicional\s+especial/i.test(text)) tags.add('Crédito Adicional Especial');
  if (/crédito\s+adicional\s+suplementar/i.test(text)) tags.add('Crédito Suplementar');
  if (/superávit\s+financeiro/i.test(text)) tags.add('Superávit Financeiro');
  if (/fundeb/i.test(text)) tags.add('FUNDEB');
  if (/hospital/i.test(text)) tags.add('Hospital Municipal');
  if (/cras|assistência\s+social/i.test(text)) tags.add('Assistência Social');
  if (/habitação/i.test(text)) tags.add('Habitação');
  if (/lei\s+nº\s*4\.?320/i.test(text)) tags.add('Lei 4.320/64');
  return Array.from(tags).slice(0, 6);
}

/**
 * Renderiza as páginas de um documento PDF em imagens JPEG otimizadas (escala 1.55x)
 * sem cortar conteúdo útil nas margens (usado sob demanda como contingência de OCR).
 */
async function renderPdfPagesToImages(
  pdfDoc: any,
  maxPages = 12,
  onProgress?: (status: string) => void
): Promise<Array<{ mimeType: string; data: string }>> {
  const images: Array<{ mimeType: string; data: string }> = [];
  if (typeof document === 'undefined' || !pdfDoc) return images;

  const totalToRender = Math.min(pdfDoc.numPages || 1, maxPages);

  for (let pageNum = 1; pageNum <= totalToRender; pageNum++) {
    try {
      onProgress?.(`Renderizando página ${pageNum}/${totalToRender} para leitura óptica...`);
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.55 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Fundo branco puro para maximizar contraste de textos escaneados
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64Clean = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      if (base64Clean) {
        images.push({
          mimeType: 'image/jpeg',
          data: base64Clean
        });
      }
    } catch (renderErr) {
      console.warn(`Aviso ao renderizar página ${pageNum} para imagem:`, renderErr);
    }
  }

  return images;
}

/**
 * Detecta se a camada de texto nativa do PDF possui fontes corrompidas (CMap ToUnicode quebrado,
 * glifos na Private Use Area \uE000-\uF8FF, caracteres de substituição \uFFFD ou excesso de lixo)
 */
function hasCorruptedFontCharacters(raw: string): boolean {
  if (!raw || raw.length === 0) return false;

  // Glifos PUA (Private Use Area) ou Replacement Character são sinal inequívoco de fonte PDF corrompida
  const puaOrReplacementMatches = raw.match(/[\uE000-\uF8FF\uFFFD]/g);
  if (puaOrReplacementMatches && puaOrReplacementMatches.length >= 3) {
    return true;
  }

  // Verifica proporção de caracteres legíveis (letras latinas, números, pontuação e símbolos jurídicos comuns)
  const nonWhitespace = raw.replace(/\s+/g, '');
  if (nonWhitespace.length < 30) return false;

  const weirdChars = nonWhitespace.replace(
    /[a-zA-Z0-9À-ÿ.,;:!?()"“”'‘’\-–—/$%ºª°§|\[\]{}+=*&@#ºª]/g,
    ''
  );
  if (weirdChars.length / nonWhitespace.length > 0.06) {
    return true;
  }

  return false;
}

/**
 * Extrai texto completo de um arquivo PDF:
 * 1) Tenta extração nativa ultrarrápida (< 0.5s) com ordenação geométrica (Y/X), reconstrução de tabelas
 *    e remoção automática de cabeçalhos/rodapés repetidos entre páginas.
 * 2) Para PDFs escaneados (imagem/assinatura física), fontes corrompidas ou Diário Oficial vetorizado,
 *    renderiza as páginas em alta definição e aciona transcrição multimodal (Gemini Vision / OCR Local).
 */
export async function extractLawTextFromPdf(
  file: File,
  onProgress?: (status: string) => void,
  institutionContext?: { municipio?: string; estado?: string } | string
): Promise<ExtractedLawResult> {
  onProgress?.('Inspecionando camadas do arquivo PDF...');

  const contextObj = typeof institutionContext === 'string'
    ? { municipio: institutionContext }
    : institutionContext;

  const arrayBuffer = await file.arrayBuffer();

  let rawNativeBeforeClean = '';
  let nativeText = '';
  let pageCount = 0;
  let hasImageOnlyPages = false;
  let loadedPdfDoc: any = null;

  const extractFromDoc = async (pdfDoc: any) => {
    loadedPdfDoc = pdfDoc;
    pageCount = pdfDoc.numPages;
    hasImageOnlyPages = false;

    interface ExtractedPageLine {
      y: number;
      text: string;
      hasMultiColumns: boolean;
      columnCells: string[];
      isTopMargin: boolean;
      isBottomMargin: boolean;
      normSignature: string;
    }

    const allPagesLines: ExtractedPageLine[][] = [];
    const marginFrequency = new Map<string, number>();

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageHeight = viewport.height || 842;
      const textContent = await page.getTextContent();

      interface RawItem {
        str: string;
        x: number;
        y: number;
        width: number;
      }

      const rawItems: RawItem[] = [];
      for (const item of textContent.items as any[]) {
        if ('str' in item && typeof item.str === 'string' && item.str.length > 0) {
          const x = item.transform ? Number(item.transform[4]) || 0 : 0;
          const y = item.transform ? Number(item.transform[5]) || 0 : 0;
          const width = typeof item.width === 'number' ? item.width : item.str.length * 4.8;
          rawItems.push({ str: item.str, x, y, width });
        }
      }

      const rawPageChars = rawItems.map(i => i.str).join('').replace(/\s+/g, '');
      if (rawPageChars.length < 35) {
        hasImageOnlyPages = true;
      }
      rawNativeBeforeClean += rawItems.map(i => i.str).join(' ') + '\n';

      // Agrupa itens por coordenada Y (tolerância de 3.5pt para itens na mesma linha horizontal)
      const lineGroups: Array<{ y: number; items: RawItem[] }> = [];
      for (const item of rawItems) {
        let foundGroup = lineGroups.find(g => Math.abs(g.y - item.y) <= 3.5);
        if (!foundGroup) {
          foundGroup = { y: item.y, items: [] };
          lineGroups.push(foundGroup);
        }
        foundGroup.items.push(item);
      }

      // Ordena linhas do topo para a base da página (Y decrescente no sistema de coordenadas PDF)
      lineGroups.sort((a, b) => b.y - a.y);

      const pageLines: ExtractedPageLine[] = [];

      for (const group of lineGroups) {
        // Ordena fragmentos da esquerda para a direita (X crescente)
        group.items.sort((a, b) => a.x - b.x);

        const cells: string[] = [];
        let currentCell = '';
        let plainLine = '';
        let prevRight: number | null = null;

        for (const item of group.items) {
          const piece = item.str;
          if (!piece.trim() && currentCell.length === 0) continue;

          if (prevRight === null) {
            currentCell = piece;
            plainLine = piece;
          } else {
            const gap = item.x - prevRight;
            // Se houver espaçamento horizontal tabular (> 12pt), representa outra coluna de tabela
            if (gap > 12 && currentCell.trim().length > 0 && piece.trim().length > 0) {
              cells.push(currentCell.trim());
              currentCell = piece;
              plainLine += '   ' + piece;
            } else if (gap < 1.3) {
              // Letras coladas da mesma palavra
              currentCell += piece;
              plainLine += piece;
            } else {
              // Espaço normal entre palavras
              const needsSpace = !currentCell.endsWith(' ') && !piece.startsWith(' ');
              currentCell += (needsSpace ? ' ' : '') + piece;
              plainLine += (needsSpace ? ' ' : '') + piece;
            }
          }
          prevRight = Math.max(prevRight ?? 0, item.x + Math.max(item.width, 0));
        }

        if (currentCell.trim().length > 0) {
          cells.push(currentCell.trim());
        }

        const cleanLineText = plainLine.replace(/\s+/g, ' ').trim();
        if (!cleanLineText) continue;

        const isTopMargin = group.y >= pageHeight * 0.86;
        const isBottomMargin = group.y <= pageHeight * 0.13;
        const normSignature = cleanLineText
          .toLowerCase()
          .replace(/\d+/g, '#')
          .replace(/\s+/g, ' ')
          .trim();

        if ((isTopMargin || isBottomMargin) && normSignature.length >= 4) {
          marginFrequency.set(normSignature, (marginFrequency.get(normSignature) || 0) + 1);
        }

        pageLines.push({
          y: group.y,
          text: cleanLineText,
          hasMultiColumns: cells.length >= 2,
          columnCells: cells,
          isTopMargin,
          isBottomMargin,
          normSignature
        });
      }

      allPagesLines.push(pageLines);
    }

    // Reconstrói o texto de cada página filtrando cabeçalhos/rodapés repetidos e preservando tabelas
    const renderedPages: string[] = [];

    for (let pageIdx = 0; pageIdx < allPagesLines.length; pageIdx++) {
      const pLines = allPagesLines[pageIdx];
      const filteredLines: ExtractedPageLine[] = [];

      for (const line of pLines) {
        // Remove qualquer linha de cabeçalho ou rodapé institucional/endereço/paginação
        if (isRepeatedHeaderNoiseLine(line.text) || isRepeatedFooterNoiseLine(line.text)) {
          continue;
        }

        // Se o documento tem 2+ páginas e a linha está na margem superior/inferior repetindo entre páginas, descarta
        if (
          pageCount > 1 &&
          (line.isTopMargin || line.isBottomMargin) &&
          (marginFrequency.get(line.normSignature) || 0) >= 2 &&
          !/^(?:LEI|DECRETO|PORTARIA|RESOLUÇÃO|EMENDA|Art\.|Artigo|§|Parágrafo)/i.test(line.text)
        ) {
          continue;
        }

        filteredLines.push(line);
      }

      // Converte linhas com múltiplas colunas alinhadas em formato de tabela Markdown (Col 1 | Col 2 | Col 3)
      const outputLines: string[] = [];
      for (let i = 0; i < filteredLines.length; i++) {
        const curr = filteredLines[i];
        const prev = i > 0 ? filteredLines[i - 1] : null;
        const next = i < filteredLines.length - 1 ? filteredLines[i + 1] : null;

        const isArticleOrClause = /^(?:Art\.|Artigo|§|Parágrafo|[IVXLCDM]+\s*[-–—]|[a-z]\)|LEI\s+|DECRETO\s+|PORTARIA\s+)/i.test(curr.text);
        const isBudgetKeyValue = /^(?:Órgão|Orgao|Unidade|Função|Funcao|Subfunção|Subfuncao|Programa|Projeto|Atividade|Elemento|Natureza|Fonte|Ficha)\s*[:.-]/i.test(curr.text);
        const isBudgetNaturezaDots = /\.{3,}\s*R\$\s*[\d.,]+/i.test(curr.text);

        const adjacentMultiColumn = (prev && prev.hasMultiColumns) || (next && next.hasMultiColumns);

        if (
          curr.hasMultiColumns &&
          !isArticleOrClause &&
          !isBudgetKeyValue &&
          !isBudgetNaturezaDots &&
          (curr.columnCells.length >= 3 || adjacentMultiColumn)
        ) {
          outputLines.push(curr.columnCells.join(' | '));
        } else {
          outputLines.push(curr.text);
        }
      }

      if (outputLines.length > 0) {
        renderedPages.push(outputLines.join('\n'));
      }
    }

    nativeText = cleanAndNormalizeLawText(renderedPages.join('\n\n'));
  };

  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.5.438'}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0)),
      useSystemFonts: true
    });

    const pdfDoc = await loadingTask.promise;
    await extractFromDoc(pdfDoc);
  } catch (nativeErr) {
    console.warn('Tentativa com worker local falhou, tentando fallback com CDN:', nativeErr);
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.5.438'}/build/pdf.worker.min.mjs`;
      const fallbackTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer.slice(0)),
        useSystemFonts: true
      });
      const pdfDoc = await fallbackTask.promise;
      await extractFromDoc(pdfDoc);
    } catch (cdnErr) {
      console.warn('Camada nativa indisponível, prosseguindo para transcrição via IA:', cdnErr);
    }
  }

  const cleanNative = nativeText.trim();
  const isCorruptedFont = hasCorruptedFontCharacters(rawNativeBeforeClean);

  // Verifica se o texto nativo realmente contém o corpo normativo íntegro, sem páginas escaneadas/imagem e sem fontes corrompidas
  const hasSubstantiveLegalBody =
    !isCorruptedFont &&
    !hasImageOnlyPages &&
    cleanNative.length >= 180 &&
    /(?:\bArt\.\s*1|\bART\.\s*1|\bArtigo\s*1|\b(?:DECRETA|RESOLVE|SANCIONA)\b)/.test(cleanNative);

  // Caso 1: O PDF possui camada de texto selecionável real, limpa e íntegra em todas as páginas
  if (hasSubstantiveLegalBody) {
    onProgress?.('Estruturando técnica legislativa, artigos e tabelas...');
    return buildResultFromRawText(cleanNative, 'native_pdf', pageCount || 1, file.name);
  }

  // Caso 2: PDF escaneado (imagem), híbrido (páginas de tabela em imagem), fonte corrompida (PUA) ou vetorizado em curvas
  const ensurePageImages = () =>
    loadedPdfDoc ? renderPdfPagesToImages(loadedPdfDoc, 12, onProgress) : Promise.resolve([]);

  onProgress?.(`Transcrevendo ${pageCount || 1} página(s) do documento via leitura óptica...`);
  const aiResult = await extractLawFromPdf(file, contextObj, {
    ensurePageImages,
    nativeTextHint: isCorruptedFont ? '' : cleanNative,
    onProgress
  });

  const cleanAiText = cleanAndNormalizeLawText(aiResult.texto_integral || '');
  const cleanAiEmenta = cleanAndNormalizeLawText(aiResult.ementa || '');

  const parsedAI = parseLawDocument(cleanAiText, cleanAiEmenta, {
    type: aiResult.tipo,
    number: aiResult.numero,
    publication_date: aiResult.data_publicacao,
    author: aiResult.autor
  });

  const budgetTables = parsedAI.blocks.filter(b => b.type === 'budget_table');
  const yearNum = parseInt(aiResult.ano || aiResult.data_publicacao?.split('-')[0] || String(new Date().getFullYear()), 10);

  return {
    source: 'ai_ocr',
    rawText: cleanAiText,
    pageCount: pageCount || 1,
    structuredData: {
      type: aiResult.tipo || 'Lei Ordinária',
      number: aiResult.numero || `1/${yearNum}`,
      year: yearNum,
      title: aiResult.titulo,
      category: aiResult.categoria || inferCategoryFromText(cleanAiText + ' ' + cleanAiEmenta),
      ementa: cleanAiEmenta || parsedAI.ementa,
      preambulo: parsedAI.preambulo,
      publication_date: aiResult.data_publicacao,
      author: aiResult.autor,
      origin_power: aiResult.origem_poder === 'legislativo' ? 'legislativo' : 'executivo',
      materia_numero: aiResult.materia_numero,
      tags: aiResult.tags,
      valor_total_credito: aiResult.valor_total_credito,
      full_text: cleanAiText,
      budget_tables: budgetTables.length > 0 ? budgetTables : aiResult.tabelas_orcamento
    },
    parsedDoc: parsedAI
  };
}

/**
 * Constrói um ExtractedLawResult completo a partir de texto bruto (extração nativa ou Ctrl+V)
 */
function buildResultFromRawText(
  rawText: string,
  source: 'native_pdf' | 'ai_ocr',
  pageCount: number,
  fileNameFallback?: string
): ExtractedLawResult {
  const clean = cleanAndNormalizeLawText(rawText).trim();
  const parsed = parseLawDocument(clean, '', {
    author: 'Prefeito Municipal'
  });

  const tipoNumero = parsed.epigrafe.tipoNumero || fileNameFallback || '';
  let type = 'Lei Ordinária';
  let numOnly = '';
  let year = new Date().getFullYear();

  if (/decreto/i.test(tipoNumero) || /^decreto/i.test(clean)) type = 'Decreto';
  else if (/complementar|\blc\b/i.test(tipoNumero) || /LEI\s+COMPLEMENTAR/i.test(clean)) type = 'Lei Complementar';
  else if (/portaria/i.test(tipoNumero)) type = 'Portaria';
  else if (/resolu/i.test(tipoNumero)) type = 'Resolução';
  else if (/emenda/i.test(tipoNumero)) type = 'Emenda à LOM';

  // Extrai número e ano da epígrafe (ex: "LEI COMPLEMENTAR N.º 107/2026" ou "LEI Nº 1.378 DE 13 DE OUTUBRO DE 2026")
  const slashMatch = tipoNumero.match(/([\d.]+)\s*[/]\s*(\d{2,4})/);
  if (slashMatch) {
    numOnly = slashMatch[1].replace(/\./g, '');
    const y = parseInt(slashMatch[2].replace(/\./g, ''), 10);
    year = y < 100 ? (y > 50 ? 1900 + y : 2000 + y) : y;
  } else {
    const epNumMatch = tipoNumero.match(/(?:Nº|N°|N\.º|N\.°|NUM|LEI|DECRETO|PORTARIA|COMPLEMENTAR)\s*([\d.]+)/i);
    if (epNumMatch) {
      numOnly = epNumMatch[1].replace(/\./g, '');
    } else {
      const singleNum = tipoNumero.match(/(\d+)/);
      if (singleNum) numOnly = singleNum[1];
    }
    const yearInText = clean.replace(/(\d)\.(\d{3})\b/g, '$1$2').match(/\b(19\d\d|20\d\d)\b/);
    if (yearInText) year = parseInt(yearInText[1], 10);
  }

  const realDateInfo = extractRealLawDateAndYear(clean, tipoNumero);
  let pubDate = realDateInfo.isoDate || `${year}-01-01`;
  if (realDateInfo.year && (!slashMatch || year === realDateInfo.year)) {
    year = realDateInfo.year;
    if (!realDateInfo.isoDate) {
      pubDate = `${year}-01-01`;
    }
  }

  const numberFormatted = `${numOnly || '1'}/${year}`;
  const ementa = parsed.ementa || 'Dispõe sobre ato normativo municipal e dá outras providências.';
  const category = inferCategoryFromText(clean + ' ' + ementa);
  const title = buildDescriptiveLawTitle('', ementa, type, numOnly || '1', String(year));
  const tags = inferTagsFromText(clean, type, category);
  const budgetTables = parsed.blocks.filter(b => b.type === 'budget_table');

  const valMatch = clean.match(/no\s+valor\s+de\s+(R\$\s*[\d.,]+)/i);
  const valorTotalCredito = valMatch ? valMatch[1] : undefined;

  const isLegislativo =
    /câmara|legislativ|resolução/i.test(tipoNumero) ||
    /MESA\s+DIRETORA\s+DA\s+CÂMARA|CÂMARA\s+MUNICIPAL[^.]*FAZ\s+SABER/i.test(clean);

  return {
    source,
    rawText: clean,
    pageCount,
    structuredData: {
      type,
      number: numberFormatted,
      year,
      title,
      category,
      ementa,
      preambulo: parsed.preambulo,
      publication_date: pubDate,
      author: parsed.assinatura?.nome || 'Thiago Timo Oliveira - Prefeito Municipal',
      origin_power: isLegislativo ? 'legislativo' : 'executivo',
      tags,
      valor_total_credito: valorTotalCredito,
      full_text: clean,
      budget_tables: budgetTables
    },
    parsedDoc: parsed
  };
}

/**
 * Estrutura instantaneamente um texto colado bruto via Ctrl+V
 */
export function extractLawFromPastedText(rawText: string, _institutionContext?: string): ExtractedLawResult {
  return buildResultFromRawText(rawText, 'native_pdf', 1);
}
