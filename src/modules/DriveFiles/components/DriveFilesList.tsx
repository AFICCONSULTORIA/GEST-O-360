import React from 'react';
import {
  CheckSquare,
  Square,
  FolderOpen,
  Upload,
  GripVertical,
  Star,
  Eye,
  FolderInput,
  Pencil,
  RefreshCw,
  Download,
  Trash2
} from 'lucide-react';
import { DriveFileRecord, DriveFolderRecord } from '../../../lib/api/driveFiles';

interface DriveFilesListProps {
  loading: boolean;
  viewMode: 'list' | 'grid';
  filteredFiles: DriveFileRecord[];
  selectedIds: Set<string>;
  activeFiltersCount: number;
  activeFolder: DriveFolderRecord | null;
  currentDestinationLabel: string;
  isConfigured: boolean;
  downloadingId: string | null;
  formatBytes: (bytes: number) => string;
  canPreviewInline: (mime?: string | null, name?: string) => boolean;
  renderFileIcon: (mime?: string | null, name?: string, size?: number) => React.ReactNode;
  onToggleSelectAll: () => void;
  onToggleSelectFile: (id: string) => void;
  onClearAllFilters: () => void;
  onTriggerUpload: () => void;
  onDragStartFile: (id: string, e: React.DragEvent) => void;
  onDragEndFile: () => void;
  onToggleStar: (item: DriveFileRecord) => Promise<void>;
  onOpenPreview: (item: DriveFileRecord) => Promise<void>;
  onSelectTagFilter: (tag: string) => void;
  onMoveSingle: (item: DriveFileRecord) => void;
  onEditFile: (item: DriveFileRecord) => void;
  onDownload: (item: DriveFileRecord) => Promise<void>;
  onDeleteFile: (item: DriveFileRecord) => void;
}

export const DriveFilesList: React.FC<DriveFilesListProps> = ({
  loading,
  viewMode,
  filteredFiles,
  selectedIds,
  activeFiltersCount,
  activeFolder,
  currentDestinationLabel,
  isConfigured,
  downloadingId,
  formatBytes,
  canPreviewInline,
  renderFileIcon,
  onToggleSelectAll,
  onToggleSelectFile,
  onClearAllFilters,
  onTriggerUpload,
  onDragStartFile,
  onDragEndFile,
  onToggleStar,
  onOpenPreview,
  onSelectTagFilter,
  onMoveSingle,
  onEditFile,
  onDownload,
  onDeleteFile
}) => {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
      {!loading && filteredFiles.length > 0 && (
        <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] font-bold text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="inline-flex items-center gap-2 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            {selectedIds.size === filteredFiles.length ? (
              <CheckSquare size={14} className="text-blue-600" />
            ) : (
              <Square size={14} />
            )}
            <span>
              {filteredFiles.length} {filteredFiles.length === 1 ? 'arquivo' : 'arquivos'}
            </span>
          </button>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            Dica: arraste um arquivo para uma pasta na barra lateral para organizar
          </span>
        </div>
      )}

      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 animate-pulse" />
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="p-14 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
            <FolderOpen size={30} />
          </div>
          <div>
            <p className="text-sm font-black text-neutral-700 dark:text-neutral-200">
              {activeFiltersCount > 0
                ? 'Nenhum arquivo corresponde aos filtros aplicados'
                : activeFolder
                  ? `A pasta "${activeFolder.name}" está vazia`
                  : 'Nenhum arquivo encontrado aqui'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {activeFiltersCount > 0
                ? 'Tente ajustar ou limpar os filtros de busca.'
                : 'Arraste documentos do seu computador para esta janela ou clique em Enviar.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {activeFiltersCount > 0 ? (
              <button
                type="button"
                onClick={onClearAllFilters}
                className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black cursor-pointer"
              >
                Limpar Filtros
              </button>
            ) : (
              isConfigured && (
                <button
                  type="button"
                  onClick={onTriggerUpload}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Enviar para {currentDestinationLabel}</span>
                </button>
              )
            )}
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {filteredFiles.map((item) => {
            const previewable = canPreviewInline(item.mime_type, item.file_name);
            const isSelected = selectedIds.has(item.id);
            const itemTags = Array.isArray(item.tags) ? item.tags : [];
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => onDragStartFile(item.id, e)}
                onDragEnd={onDragEndFile}
                className={`px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isSelected
                    ? 'bg-blue-50/60 dark:bg-blue-950/25'
                    : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                    <GripVertical size={13} className="text-neutral-300 dark:text-neutral-700 cursor-grab hidden sm:block" />
                    <button
                      type="button"
                      onClick={() => onToggleSelectFile(item.id)}
                      className="text-neutral-400 hover:text-blue-600 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare size={15} className="text-blue-600" />
                      ) : (
                        <Square size={15} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onToggleStar(item)}
                      title={item.is_starred ? 'Remover dos favoritos' : 'Marcar como favorito'}
                      className="p-0.5 cursor-pointer"
                    >
                      <Star
                        size={14}
                        className={
                          item.is_starred
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-neutral-300 dark:text-neutral-700 hover:text-amber-400'
                        }
                      />
                    </button>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    {renderFileIcon(item.mime_type, item.file_name, 19)}
                  </div>

                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => void onOpenPreview(item)}
                      className="text-left text-xs sm:text-sm font-black text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block max-w-full cursor-pointer"
                    >
                      {item.file_name}
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                      <span className="px-2 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                        {item.folder_category}
                      </span>
                      {itemTags.slice(0, 3).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => onSelectTagFilter(tag)}
                          className="px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold text-[10px] hover:bg-blue-100 cursor-pointer"
                        >
                          #{tag}
                        </button>
                      ))}
                      <span className="font-bold text-neutral-700 dark:text-neutral-300">
                        {formatBytes(item.size_bytes)}
                      </span>
                      <span>• {item.uploaded_by_name}</span>
                      <span>
                        •{' '}
                        {new Date(item.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pl-8 sm:pl-0">
                  <button
                    type="button"
                    onClick={() => void onOpenPreview(item)}
                    className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                    title={previewable ? 'Visualizar' : 'Detalhes'}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveSingle(item)}
                    className="p-2 rounded-xl bg-neutral-100 hover:bg-indigo-50 dark:bg-neutral-800 dark:hover:bg-indigo-950/50 text-neutral-600 hover:text-indigo-600 dark:text-neutral-300 cursor-pointer"
                    title="Mover para pasta"
                  >
                    <FolderInput size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditFile(item)}
                    className="p-2 rounded-xl bg-neutral-100 hover:bg-amber-50 dark:bg-neutral-800 dark:hover:bg-amber-950/50 text-neutral-600 hover:text-amber-600 dark:text-neutral-300 cursor-pointer"
                    title="Renomear / Etiquetas"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={downloadingId === item.id}
                    onClick={() => void onDownload(item)}
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 cursor-pointer disabled:opacity-50"
                    title="Baixar"
                  >
                    {downloadingId === item.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteFile(item)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                    title="Mover para lixeira"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFiles.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const itemTags = Array.isArray(item.tags) ? item.tags : [];
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => onDragStartFile(item.id, e)}
                onDragEnd={onDragEndFile}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/25 ring-1 ring-blue-500/30'
                    : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/30 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleSelectFile(item.id)}
                        className="text-neutral-400 hover:text-blue-600 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare size={15} className="text-blue-600" />
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-700 flex items-center justify-center">
                        {renderFileIcon(item.mime_type, item.file_name, 20)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onToggleStar(item)}
                      className="p-1 cursor-pointer"
                      title="Favoritar"
                    >
                      <Star
                        size={15}
                        className={
                          item.is_starred
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-400'
                        }
                      />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => void onOpenPreview(item)}
                      className="text-left text-xs font-black text-neutral-900 dark:text-white hover:text-blue-600 truncate block w-full cursor-pointer"
                      title={item.file_name}
                    >
                      {item.file_name}
                    </button>
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                        {item.folder_category}
                      </span>
                      {itemTags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded-md bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-neutral-500 mt-1.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 mt-2">
                      <span>{formatBytes(item.size_bytes)}</span>
                      <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => void onOpenPreview(item)}
                    className="flex-1 py-1.5 rounded-xl bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>Abrir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveSingle(item)}
                    className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 hover:bg-indigo-50 border border-neutral-200/80 dark:border-neutral-700 text-neutral-600 hover:text-indigo-600 cursor-pointer"
                    title="Mover"
                  >
                    <FolderInput size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditFile(item)}
                    className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 hover:bg-amber-50 border border-neutral-200/80 dark:border-neutral-700 text-neutral-600 hover:text-amber-600 cursor-pointer"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={downloadingId === item.id}
                    onClick={() => void onDownload(item)}
                    className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:opacity-50"
                    title="Baixar"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteFile(item)}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
