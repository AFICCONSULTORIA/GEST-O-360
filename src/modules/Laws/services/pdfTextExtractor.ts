import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite resolves ?url imports to local static asset path
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractLawFromPdf, buildDescriptiveLawTitle } from './lawOcrService';
import { parseLawDocument, ParsedLawStructure } from '../utils/lawFormatter';
import { LawCategory } from '../../../types';

// Configura o worker local do PDF.js empacotado pelo Vite (sem erro de CORS!)
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch (e) {
    console.warn('Erro ao configurar worker local do PDF.js:', e);
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
 * Extrai texto completo de um arquivo PDF:
 * 1) Tenta extração nativa ultrarrápida (< 0.5s) para PDFs com camada de texto selecionável.
 * 2) Para PDFs de Diário Oficial vetorizados/rasterizados (ex: AMM-MT) ou digitalizados,
 *    aciona automaticamente o motor Gemini 3.5 Flash Lite (~4-5s) com transcrição integral.
 */
export async function extractLawTextFromPdf(
  file: File,
  onProgress?: (status: string) => void,
  institutionContext?: { municipio?: string; estado?: string }
): Promise<ExtractedLawResult> {
  onProgress?.('Inspecionando camadas do arquivo PDF...');

  const arrayBuffer = await file.arrayBuffer();

  let nativeText = '';
  let pageCount = 0;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true
    });

    const pdfDoc = await loadingTask.promise;
    pageCount = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      let lastY: number | null = null;
      let pageText = '';

      for (const item of textContent.items as any[]) {
        if ('str' in item) {
          const currentY = item.transform ? item.transform[5] : null;
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
          pageText += item.str;
          lastY = currentY;
        }
      }

      if (pageText.trim()) {
        nativeText += pageText.trim() + '\n\n';
      }
    }
  } catch (nativeErr) {
    console.warn('Camada de texto nativa indisponível, prosseguindo com transcrição IA:', nativeErr);
  }

  const cleanNative = nativeText.trim();

  // Caso 1: O PDF possui camada de texto selecionável real (>= 80 caracteres)
  if (cleanNative.length >= 80) {
    onProgress?.('Estruturando técnica legislativa, artigos e tabelas...');
    return buildResultFromRawText(cleanNative, 'native_pdf', pageCount || 1, file.name);
  }

  // Caso 2: PDF de Diário Oficial vetorizado em curvas (ex: AMM-MT) ou documento escaneado
  onProgress?.(`Transcrevendo ${pageCount || ''} página(s) do Diário Oficial com IA rápida (~5s)...`);
  const aiResult = await extractLawFromPdf(file, institutionContext);

  const parsedAI = parseLawDocument(aiResult.texto_integral, aiResult.ementa, {
    type: aiResult.tipo,
    number: aiResult.numero,
    publication_date: aiResult.data_publicacao,
    author: aiResult.autor
  });

  const budgetTables = parsedAI.blocks.filter(b => b.type === 'budget_table');
  const yearNum = parseInt(aiResult.ano || aiResult.data_publicacao?.split('-')[0] || String(new Date().getFullYear()), 10);

  return {
    source: 'ai_ocr',
    rawText: aiResult.texto_integral,
    pageCount: pageCount || 1,
    structuredData: {
      type: aiResult.tipo || 'Lei Ordinária',
      number: aiResult.numero || `1/${yearNum}`,
      year: yearNum,
      title: aiResult.titulo,
      category: aiResult.categoria || inferCategoryFromText(aiResult.texto_integral + ' ' + aiResult.ementa),
      ementa: aiResult.ementa || parsedAI.ementa,
      preambulo: parsedAI.preambulo,
      publication_date: aiResult.data_publicacao,
      author: aiResult.autor,
      origin_power: aiResult.origem_poder === 'legislativo' ? 'legislativo' : 'executivo',
      materia_numero: aiResult.materia_numero,
      tags: aiResult.tags,
      valor_total_credito: aiResult.valor_total_credito,
      full_text: aiResult.texto_integral,
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
  const clean = rawText.trim();
  const parsed = parseLawDocument(clean, '', {
    author: 'Prefeito Municipal'
  });

  const tipoNumero = parsed.epigrafe.tipoNumero || fileNameFallback || '';
  let type = 'Lei Ordinária';
  let numOnly = '';
  let year = new Date().getFullYear();

  if (/decreto/i.test(tipoNumero)) type = 'Decreto';
  else if (/complementar|\blc\b/i.test(tipoNumero)) type = 'Lei Complementar';
  else if (/portaria/i.test(tipoNumero)) type = 'Portaria';
  else if (/resolu/i.test(tipoNumero)) type = 'Resolução';
  else if (/emenda/i.test(tipoNumero)) type = 'Emenda à LOM';

  const numMatch = tipoNumero.match(/(\d+)\s*[/_.-]\s*(\d{2,4})/);
  if (numMatch) {
    numOnly = numMatch[1];
    const y = parseInt(numMatch[2], 10);
    year = y < 100 ? (y > 50 ? 1900 + y : 2000 + y) : y;
  } else {
    const singleNum = tipoNumero.match(/(\d+)/);
    if (singleNum) numOnly = singleNum[1];
    const yearInText = clean.match(/\b(19\d\d|20\d\d)\b/);
    if (yearInText) year = parseInt(yearInText[1], 10);
  }

  let pubDate = `${year}-01-01`;
  const dateMatch = clean.match(/(\d{1,2})\s+de\s+([a-zA-ZçÇ]+)\s+de\s+(\d{4})/i);
  if (dateMatch) {
    const monthNames: Record<string, string> = {
      janeiro: '01', fevereiro: '02', marco: '03', março: '03', abril: '04',
      maio: '05', junho: '06', julho: '07', agosto: '08',
      setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
    };
    const m = monthNames[dateMatch[2].toLowerCase()] || '01';
    const d = dateMatch[1].padStart(2, '0');
    const y = dateMatch[3];
    pubDate = `${y}-${m}-${d}`;
    year = parseInt(y, 10);
  }

  const numberFormatted = `${numOnly || '1'}/${year}`;
  const ementa = parsed.ementa || 'Dispõe sobre ato normativo municipal e dá outras providências.';
  const category = inferCategoryFromText(clean + ' ' + ementa);
  const title = buildDescriptiveLawTitle('', ementa, type, numOnly || '1', String(year));
  const tags = inferTagsFromText(clean, type, category);
  const budgetTables = parsed.blocks.filter(b => b.type === 'budget_table');

  const valMatch = clean.match(/no\s+valor\s+de\s+(R\$\s*[\d.,]+)/i);
  const valorTotalCredito = valMatch ? valMatch[1] : undefined;

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
      author: parsed.assinatura?.nome || 'Poder Executivo Municipal',
      origin_power: /câmara|legislativ|resolução/i.test(tipoNumero) ? 'legislativo' : 'executivo',
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
