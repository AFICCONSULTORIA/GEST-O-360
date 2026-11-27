import React from 'react';
import {
  X,
  RefreshCw,
  ExternalLink,
  Download,
  Trash2
} from 'lucide-react';
import { DriveFileRecord } from '../../../lib/api/driveFiles';

interface DrivePreviewModalsProps {
  previewItem: DriveFileRecord | null;
  previewUrl: string | null;
  previewLoading: boolean;
  deleteTarget: DriveFileRecord | null;
  deleting: boolean;
  formatBytes: (bytes: number) => string;
  getFileTypeCategory: (mime?: string | null, name?: string) => string;
  renderFileIcon: (mime?: string | null, name?: string, size?: number) => React.ReactNode;
  onClosePreview: () => void;
  onDownload: (item: DriveFileRecord) => Promise<void>;
  onCloseDelete: () => void;
  onConfirmDelete: () => Promise<void>;
}

export const DrivePreviewModals: React.FC<DrivePreviewModalsProps> = ({
  previewItem,
  previewUrl,
  previewLoading,
  deleteTarget,
  deleting,
  formatBytes,
  getFileTypeCategory,
  renderFileIcon,
  onClosePreview,
  onDownload,
  onCloseDelete,
  onConfirmDelete
}) => {
  return (
    <>
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={onClosePreview}
        >
          <div
            className="bg-white dark:bg-neutral-900 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  {renderFileIcon(previewItem.mime_type, previewItem.file_name, 20)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white truncate">
                    {previewItem.file_name}
                  </h3>
                  <p className="text-[11px] font-semibold text-neutral-500">
                    {previewItem.folder_category} • {formatBytes(previewItem.size_bytes)} • Enviado por{' '}
                    {previewItem.uploaded_by_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClosePreview}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950 p-4 flex items-center justify-center min-h-[320px]">
              {previewLoading ? (
                <div className="flex flex-col items-center gap-2 text-xs font-bold text-neutral-500">
                  <RefreshCw size={24} className="animate-spin text-blue-500" />
                  <span>Carregando pré-visualização segura...</span>
                </div>
              ) : previewUrl && getFileTypeCategory(previewItem.mime_type, previewItem.file_name) === 'image' ? (
                <img
                  src={previewUrl}
                  alt={previewItem.file_name}
                  className="max-h-[62vh] max-w-full rounded-xl object-contain shadow-md"
                />
              ) : previewUrl && getFileTypeCategory(previewItem.mime_type, previewItem.file_name) === 'pdf' ? (
                <iframe
                  src={previewUrl}
                  title={previewItem.file_name}
                  className="w-full h-[62vh] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white"
                />
              ) : (
                <div className="text-center space-y-2 max-w-md p-6">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-200/70 dark:bg-neutral-800 flex items-center justify-center">
                    {renderFileIcon(previewItem.mime_type, previewItem.file_name, 26)}
                  </div>
                  <p className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                    Pré-visualização não disponível para este formato
                  </p>
                  <p className="text-xs text-neutral-500">
                    {previewItem.description || 'Faça o download ou abra diretamente no Google Drive para visualizar este arquivo.'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-neutral-900">
              <span className="text-[11px] font-semibold text-neutral-500">
                {previewItem.description
                  ? `Obs: ${previewItem.description}`
                  : `Registrado em ${new Date(previewItem.created_at).toLocaleString('pt-BR')}`}
              </span>
              <div className="flex items-center gap-2">
                {previewItem.web_view_link && (
                  <a
                    href={previewItem.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} />
                    <span>Abrir no Drive</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void onDownload(previewItem)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Baixar Arquivo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !deleting && onCloseDelete()}
        >
          <div
            className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Excluir arquivo?
                </h3>
                <p className="text-xs text-neutral-500">
                  Ele será removido do sistema e movido para a lixeira do Google Drive.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/70 dark:border-neutral-700">
              <p className="text-xs font-black text-neutral-900 dark:text-white truncate">
                {deleteTarget.file_name}
              </p>
              <p className="text-[11px] font-semibold text-neutral-500 mt-0.5">
                {deleteTarget.folder_category} • {formatBytes(deleteTarget.size_bytes)}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={onCloseDelete}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void onConfirmDelete()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting && <RefreshCw size={13} className="animate-spin" />}
                <span>{deleting ? 'Excluindo...' : 'Mover para Lixeira'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
