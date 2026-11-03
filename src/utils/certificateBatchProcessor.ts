import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ParsedRecipient, CertificateRecipientRole } from '../modules/Education/types/certificates';
import { formatCPF } from '../lib/masks';

export interface ParseResult {
  recipients: ParsedRecipient[];
  totalRows: number;
  errors: string[];
}

/**
 * Normaliza cabeçalho para comparação case/accent-insensitive
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Identifica o papel/função do participante a partir de texto
 */
function normalizeRole(roleStr?: string): CertificateRecipientRole {
  if (!roleStr) return 'participante';
  const clean = normalizeHeader(roleStr);
  if (clean.includes('palestr') || clean.includes('orador') || clean.includes('instrutor')) {
    return 'palestrante';
  }
  if (clean.includes('monit') || clean.includes('apoio') || clean.includes('organizad')) {
    return 'monitor';
  }
  return 'participante';
}

/**
 * Lê e analisa planilhas Excel (.xlsx, .xls) ou CSV contendo participantes
 */
export async function parseRecipientsSpreadsheet(file: File): Promise<ParseResult> {
  const errors: string[] = [];
  const recipients: ParsedRecipient[] = [];

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return { recipients: [], totalRows: 0, errors: ['A planilha está vazia ou não contém abas válidas.'] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { recipients: [], totalRows: 0, errors: ['Nenhum registro encontrado na planilha.'] };
    }

    // Mapeamento dinâmico de colunas
    const sample = rawRows[0];
    const headers = Object.keys(sample);

    let nameKey = headers.find(h => {
      const n = normalizeHeader(h);
      return n === 'nome' || n === 'aluno' || n === 'participante' || n.includes('nome completo') || n.includes('participante');
    });

    let docKey = headers.find(h => {
      const n = normalizeHeader(h);
      return n === 'cpf' || n === 'documento' || n === 'matricula' || n === 'rg' || n.includes('cpf') || n.includes('documento');
    });

    let emailKey = headers.find(h => {
      const n = normalizeHeader(h);
      return n === 'email' || n === 'e-mail' || n.includes('email');
    });

    let roleKey = headers.find(h => {
      const n = normalizeHeader(h);
      return n === 'papel' || n === 'funcao' || n === 'cargo' || n === 'tipo' || n === 'role';
    });

    // Se não encontrou coluna exata de nome, usa a primeira coluna de texto
    if (!nameKey && headers.length > 0) {
      nameKey = headers[0];
    }

    // Se não encontrou documento, tenta a segunda coluna
    if (!docKey && headers.length > 1 && headers[1] !== emailKey) {
      docKey = headers[1];
    }

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // Cabeçalho está na linha 1
      const rawName = String(nameKey ? row[nameKey] : '').trim();
      const rawDoc = String(docKey ? row[docKey] : '').trim();
      const rawEmail = String(emailKey ? row[emailKey] : '').trim();
      const rawRole = String(roleKey ? row[roleKey] : '').trim();

      // Ignora linhas totalmente vazias
      if (!rawName && !rawDoc && !rawEmail) {
        return;
      }

      if (!rawName) {
        errors.push(`Linha ${rowNum}: Nome do participante está em branco.`);
        return;
      }

      // Se o documento for um CPF com 11 dígitos, aplica formatação automática
      let formattedDoc = rawDoc || 'Documento não informado';
      const cleanDigits = rawDoc.replace(/\D/g, '');
      if (cleanDigits.length === 11) {
        formattedDoc = formatCPF(cleanDigits);
      }

      recipients.push({
        name: rawName,
        document: formattedDoc,
        email: rawEmail || undefined,
        role: normalizeRole(rawRole)
      });
    });

    return {
      recipients,
      totalRows: rawRows.length,
      errors
    };
  } catch (err: any) {
    return {
      recipients: [],
      totalRows: 0,
      errors: ['Falha ao ler planilha: ' + (err?.message || 'Arquivo corrompido ou formato inválido.')]
    };
  }
}

/**
 * Gera hash único de autenticidade (Ex: CERT-2026-K9P2X4)
 */
export function generateValidationHash(year: number = new Date().getFullYear()): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sem caracteres ambíguos (0, O, 1, I)
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CERT-${year}-${randomPart}`;
}

/**
 * Retorna a URL pública de validação de autenticidade do documento
 */
export function getValidationUrl(hash: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gestao360.app';
  return `${baseUrl}/validar-documento?codigo=${encodeURIComponent(hash)}`;
}

/**
 * Empacota uma lista de arquivos PDF gerados em um arquivo .zip e dispara o download
 */
export async function generateBatchZip(
  certificates: Array<{ filename: string; pdfBlob: Blob }>,
  eventTitle: string = 'Lote_Certificados'
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('Certificados') || zip;

  certificates.forEach(cert => {
    folder.file(cert.filename, cert.pdfBlob);
  });

  const content = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const sanitizedTitle = eventTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const zipFilename = `Certificados_${sanitizedTitle}.zip`;

  saveAs(content, zipFilename);
}

