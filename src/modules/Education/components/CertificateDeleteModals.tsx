import React from 'react';
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { IssuedCertificate } from '../types/certificates';

interface CertificateDeleteModalsProps {
  certToDelete: IssuedCertificate | null;
  showBatchDeleteModal: boolean;
  selectedCount: number;
  isDeleting: boolean;
  onCancelSingle: () => void;
  onConfirmSingle: () => void;
  onCancelBatch: () => void;
  onConfirmBatch: () => void;
}

export const CertificateDeleteModals: React.FC<CertificateDeleteModalsProps> = ({
  certToDelete,
  showBatchDeleteModal,
  selectedCount,
  isDeleting,
  onCancelSingle,
  onConfirmSingle,
  onCancelBatch,
  onConfirmBatch
}) => {
  return (
    <>
      {certToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Excluir Certificado Oficial?
              </h3>
              <p className="text-xs text-neutral-500">
                Esta ação é definitiva e removerá o certificado do banco e do validador público de autenticidade (QR Code).
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
              <p className="font-bold text-neutral-800 dark:text-neutral-200">
                {certToDelete.recipient_name}
              </p>
              <p className="text-[11px] font-mono text-neutral-500">
                Doc: {certToDelete.recipient_document} · Chave: {certToDelete.validation_hash}
              </p>
              <p className="text-[11px] text-neutral-500">
                Atividade: {certToDelete.template?.title || 'Curso'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onCancelSingle}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmSingle}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Excluir {selectedCount} Certificados?
              </h3>
              <p className="text-xs text-neutral-500">
                Você está prestes a excluir permanentemente {selectedCount} certificados selecionados do banco de dados. Essa ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onCancelBatch}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmBatch}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir {selectedCount} Itens</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
