import React, { useEffect, useState } from 'react';
import { Download, Trash2, FileText, RotateCw } from 'lucide-react';
import { CertificateTemplate, IssuedCertificate } from '../types/certificates';
import { Institution } from '../../../types';
import { CertificateDocumentPDF } from './CertificateDocumentPDF';

interface CertificatePreviewModalProps {
  certificate: IssuedCertificate | null;
  fallbackTemplate?: CertificateTemplate;
  currentInstitution?: Institution | null;
  isSuperAdmin: boolean;
  isDraftPreview?: boolean;
  onClose: () => void;
  onDownloadPdf?: (cert: IssuedCertificate) => void;
  onDelete?: (cert: IssuedCertificate) => void;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  certificate,
  fallbackTemplate,
  currentInstitution,
  isSuperAdmin,
  isDraftPreview = false,
  onClose,
  onDownloadPdf,
  onDelete
}) => {
  const [side, setSide] = useState<'front' | 'back'>('front');

  useEffect(() => {
    setSide('front');
  }, [certificate?.id]);

  if (!certificate) return null;

  const resolvedTemplate: CertificateTemplate = certificate.template || fallbackTemplate || {
    id: certificate.template_id,
    institution_id: certificate.institution_id,
    title: 'Curso de Formação',
    event_type: 'curso',
    workload_hours: 40,
    event_date_start: certificate.created_at.split('T')[0],
    issuer_name: 'Secretaria Municipal de Educação',
    issuer_role: 'Direção Geral',
    background_mode: 'preset',
    preset_theme: 'classico_azul'
  };

  const isDeclaration =
    resolvedTemplate.document_kind === 'declaracao' ||
    certificate.document_kind === 'declaracao' ||
    (certificate.validation_hash || '').toUpperCase().startsWith('DECL-');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-5xl w-full shadow-2xl relative space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              {isDraftPreview ? 'Pré-visualização do Modelo (Antes de Emitir)' : 'Visualização do Certificado Oficial'}
            </h3>
            <p className="text-xs text-neutral-500 font-mono">
              {certificate.validation_hash} · {certificate.recipient_name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isDeclaration && (
              <div className="inline-flex items-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSide('front')}
                  className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition ${
                    side === 'front'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Frente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSide('back')}
                  className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition ${
                    side === 'back'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Verso</span>
                </button>
              </div>
            )}

            {!isDraftPreview && isSuperAdmin && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(certificate)}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="Excluir do Banco de Certificados"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            )}

            {!isDraftPreview && onDownloadPdf && (
              <button
                type="button"
                onClick={() => onDownloadPdf(certificate)}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Baixar PDF (Frente e Verso)
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-x-auto flex justify-center p-2 bg-neutral-100 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div style={{ width: '840px', height: '595px', overflow: 'hidden' }} className="relative shadow-xl">
            <CertificateDocumentPDF
              certificate={certificate}
              template={resolvedTemplate}
              institution={currentInstitution}
              scale={0.75}
              side={isDeclaration ? 'front' : side}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
