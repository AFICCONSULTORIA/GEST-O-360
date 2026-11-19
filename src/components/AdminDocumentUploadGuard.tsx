import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { AlertTriangle, CheckCircle2, FileSearch, ShieldAlert, X } from 'lucide-react';

// Configura worker do pdfjs-dist compatível com Vite
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export interface PdfValidationResult {
  valid: boolean;
  extractedLength: number;
  errorMessage?: string;
}

/**
 * Extrai texto das primeiras páginas de um PDF via pdfjs-dist.
 * Se o texto extraído tiver menos de 20 caracteres, bloqueia por ausência de camada OCR (eMAG/PNTP).
 */
export async function validateSearchablePdf(file: File): Promise<PdfValidationResult> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: true, extractedLength: 0 };
  }

  try {
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const pagesToScan = Math.min(pdf.numPages, 3);
    let combinedText = '';

    for (let i = 1; i <= pagesToScan; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();
      combinedText += ' ' + pageText;
      if (combinedText.trim().length >= 20) break;
    }

    const cleanLength = combinedText.replace(/\s+/g, ' ').trim().length;
    if (cleanLength < 20) {
      return {
        valid: false,
        extractedLength: cleanLength,
        errorMessage:
          'Este PDF é apenas uma imagem escaneada. Converta-o para PDF pesquisável (com camada de texto/OCR) antes de publicar (requisito eMAG/PNTP).',
      };
    }

    return { valid: true, extractedLength: cleanLength };
  } catch {
    return {
      valid: false,
      extractedLength: 0,
      errorMessage:
        'Não foi possível validar a camada de texto pesquisável (OCR) do PDF selecionado. Verifique se o arquivo não está corrompido ou protegido por senha.',
    };
  }
}

export interface AdminDocumentUploadGuardProps {
  file: File | null;
  isOpen: boolean;
  ocrError: string | null;
  onCancel: () => void;
  onConfirmPublish: () => void;
}

/**
 * Trava obrigatória de publicação oficial:
 * 1) Bloqueia PDFs sem OCR (< 20 caracteres extraídos)
 * 2) Exige confirmação do Checklist de Anonimização LGPD antes de publicar
 */
export const AdminDocumentUploadGuard: React.FC<AdminDocumentUploadGuardProps> = ({
  file,
  isOpen,
  ocrError,
  onCancel,
  onConfirmPublish,
}) => {
  const [checks, setChecks] = useState({
    cpf: false,
    address: false,
    bank: false,
    health: false,
  });

  if (!isOpen) return null;

  const allChecked = checks.cpf && checks.address && checks.bank && checks.health;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-guard-title"
    >
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {ocrError ? (
              <AlertTriangle size={20} className="text-red-600" />
            ) : (
              <ShieldAlert size={20} className="text-amber-600" />
            )}
            <h2 id="doc-guard-title" className="text-base font-bold text-slate-900 dark:text-white">
              {ocrError ? 'Upload Bloqueado — Acessibilidade eMAG / PNTP' : 'Checklist Obrigatório de Anonimização (LGPD)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar verificação de documento"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {file && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs">
              <FileSearch size={16} className="text-slate-600 dark:text-neutral-300 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-neutral-200 truncate">{file.name}</span>
            </div>
          )}

          {ocrError ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200 leading-relaxed">
              <p className="font-bold mb-1">Documento sem camada de texto pesquisável (OCR)</p>
              <p>{ocrError}</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                Antes de publicar este documento no Portal Público (Lei nº 13.709/2018 — LGPD e matriz PNTP), confirme que os dados pessoais sensíveis foram devidamente tarjados/anonimizados:
              </p>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-neutral-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/60">
                  <input
                    type="checkbox"
                    checked={checks.cpf}
                    onChange={(e) => setChecks((p) => ({ ...p, cpf: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 accent-slate-900"
                  />
                  <span className="text-slate-800 dark:text-neutral-200">
                    <strong>CPF / RG completo tarjado:</strong> Números completos de CPF/RG de pessoas físicas foram ocultados ou mascarados (ex.: ***.456.789-**).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-neutral-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/60">
                  <input
                    type="checkbox"
                    checked={checks.address}
                    onChange={(e) => setChecks((p) => ({ ...p, address: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 accent-slate-900"
                  />
                  <span className="text-slate-800 dark:text-neutral-200">
                    <strong>Endereço residencial e contatos pessoais:</strong> Logradouros residenciais, telefones e e-mails particulares foram removidos.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-neutral-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/60">
                  <input
                    type="checkbox"
                    checked={checks.bank}
                    onChange={(e) => setChecks((p) => ({ ...p, bank: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 accent-slate-900"
                  />
                  <span className="text-slate-800 dark:text-neutral-200">
                    <strong>Dados bancários privados:</strong> Agência, conta corrente e chaves PIX pessoais foram ocultadas.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-neutral-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800/60">
                  <input
                    type="checkbox"
                    checked={checks.health}
                    onChange={(e) => setChecks((p) => ({ ...p, health: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 accent-slate-900"
                  />
                  <span className="text-slate-800 dark:text-neutral-200">
                    <strong>Dados sensíveis de saúde / menores:</strong> CIDs, prontuários, laudos médicos e nomes de menores de idade foram preservados sob sigilo.
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-neutral-800/50 border-t border-slate-200 dark:border-neutral-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 cursor-pointer"
          >
            {ocrError ? 'Entendido, substituir arquivo' : 'Cancelar'}
          </button>
          {!ocrError && (
            <button
              type="button"
              disabled={!allChecked}
              onClick={onConfirmPublish}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
            >
              <CheckCircle2 size={14} />
              Confirmar Anonimização e Publicar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDocumentUploadGuard;
