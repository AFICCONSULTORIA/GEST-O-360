import React, { useEffect, useState } from 'react';
import {
  FolderPlus,
  Folder,
  FolderInput,
  Pencil,
  Tag,
  X,
  RefreshCw,
  Check,
  Plus,
  Trash2
} from 'lucide-react';
import { DriveFileRecord, DriveFolderRecord } from '../../../lib/api/driveFiles';

export interface FolderColorOption {
  id: string;
  label: string;
  bg: string;
  text: string;
  dot: string;
  border: string;
}

export const FOLDER_COLORS: FolderColorOption[] = [
  {
    id: 'blue',
    label: 'Azul',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-800'
  },
  {
    id: 'emerald',
    label: 'Esmeralda',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  {
    id: 'amber',
    label: 'Âmbar',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-800'
  },
  {
    id: 'violet',
    label: 'Roxo',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    border: 'border-violet-200 dark:border-violet-800'
  },
  {
    id: 'rose',
    label: 'Rosa',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    border: 'border-rose-200 dark:border-rose-800'
  },
  {
    id: 'cyan',
    label: 'Ciano',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-600 dark:text-cyan-400',
    dot: 'bg-cyan-500',
    border: 'border-cyan-200 dark:border-cyan-800'
  },
  {
    id: 'slate',
    label: 'Grafite',
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-600 dark:text-neutral-300',
    dot: 'bg-neutral-500',
    border: 'border-neutral-200 dark:border-neutral-700'
  }
];

export function getFolderColorStyle(colorId?: string | null): FolderColorOption {
  return FOLDER_COLORS.find((c) => c.id === colorId) || FOLDER_COLORS[0];
}

// ============================================================================
// MODAL: CRIAR / EDITAR PASTA
// ============================================================================
interface FolderModalProps {
  open: boolean;
  editingFolder: DriveFolderRecord | null;
  parentFolderName: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; color: string }) => Promise<void>;
}

export const FolderFormModal: React.FC<FolderModalProps> = ({
  open,
  editingFolder,
  parentFolderName,
  saving,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');

  useEffect(() => {
    if (open) {
      setName(editingFolder?.name || '');
      setColor(editingFolder?.color || 'blue');
    }
  }, [open, editingFolder]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({ name: name.trim(), color });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !saving && onClose()}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                {editingFolder ? 'Editar Pasta' : 'Nova Pasta'}
              </h3>
              <p className="text-xs text-neutral-500">
                {parentFolderName
                  ? `Dentro de: ${parentFolderName}`
                  : 'Na raiz do Banco de Arquivos'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Nome da Pasta
            </label>
            <input
              type="text"
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Licitações 2026, Notas Fiscais, Convênios..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-2">
              Cor de Identificação
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  title={c.label}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    color === c.id
                      ? `${c.bg} ${c.text} ${c.border} ring-2 ring-offset-1 ring-blue-500/40 dark:ring-offset-neutral-900`
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            <span>{saving ? 'Salvando...' : editingFolder ? 'Salvar Alterações' : 'Criar Pasta'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// MODAL: MOVER ARQUIVO(S) PARA PASTA
// ============================================================================
interface MoveFilesModalProps {
  open: boolean;
  filesCount: number;
  singleFileName?: string;
  folders: DriveFolderRecord[];
  defaultCategories: string[];
  saving: boolean;
  onClose: () => void;
  onMove: (target: { folderId: string | null; folderCategory: string; driveFolderId?: string | null }) => Promise<void>;
}

export const MoveFilesModal: React.FC<MoveFilesModalProps> = ({
  open,
  filesCount,
  singleFileName,
  folders,
  defaultCategories,
  saving,
  onClose,
  onMove
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Geral');

  useEffect(() => {
    if (open) {
      setSelectedFolderId(null);
      setSelectedCategory('Geral');
    }
  }, [open]);

  if (!open) return null;

  const getFolderPathLabel = (folder: DriveFolderRecord): string => {
    const parts: string[] = [folder.name];
    let currentParent = folder.parent_id;
    let depth = 0;
    while (currentParent && depth < 6) {
      const parent = folders.find((f) => f.id === currentParent);
      if (!parent) break;
      parts.unshift(parent.name);
      currentParent = parent.parent_id;
      depth += 1;
    }
    return parts.join(' / ');
  };

  const handleConfirm = async () => {
    if (selectedFolderId) {
      const targetFolder = folders.find((f) => f.id === selectedFolderId);
      if (targetFolder) {
        await onMove({
          folderId: targetFolder.id,
          folderCategory: targetFolder.name,
          driveFolderId: targetFolder.drive_folder_id || null
        });
        return;
      }
    }
    await onMove({
      folderId: null,
      folderCategory: selectedCategory,
      driveFolderId: null
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FolderInput size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                {filesCount === 1 ? 'Mover Arquivo' : `Mover ${filesCount} Arquivos`}
              </h3>
              <p className="text-xs text-neutral-500 truncate">
                {singleFileName || 'Escolha a pasta ou secretaria de destino'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
          {folders.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Pastas Personalizadas
              </p>
              <div className="space-y-1">
                {folders.map((folder) => {
                  const style = getFolderColorStyle(folder.color);
                  const active = selectedFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setSelectedCategory(folder.name);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600'
                          : 'bg-neutral-50/70 dark:bg-neutral-800/40 border-neutral-200/70 dark:border-neutral-800 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder size={16} className={`${style.text} shrink-0`} />
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate">
                          {getFolderPathLabel(folder)}
                        </span>
                      </div>
                      {active && <Check size={14} className="text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Secretarias / Pastas Padrão
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {defaultCategories.map((cat) => {
                const active = selectedFolderId === null && selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedFolderId(null);
                      setSelectedCategory(cat);
                    }}
                    className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600'
                        : 'bg-neutral-50/70 dark:bg-neutral-800/40 border-neutral-200/70 dark:border-neutral-800 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate">
                      {cat}
                    </span>
                    {active && <Check size={13} className="text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleConfirm()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <FolderInput size={13} />}
            <span>{saving ? 'Movendo...' : 'Mover para Destino'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: EDITAR DETALHES DO ARQUIVO (NOME, DESCRIÇÃO E TAGS)
// ============================================================================
interface EditFileModalProps {
  file: DriveFileRecord | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { fileName: string; description: string; tags: string[] }) => Promise<void>;
}

export const EditFileModal: React.FC<EditFileModalProps> = ({ file, saving, onClose, onSave }) => {
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (file) {
      setFileName(file.file_name);
      setDescription(file.description || '');
      setTags(Array.isArray(file.tags) ? file.tags : []);
      setTagInput('');
    }
  }, [file]);

  if (!file) return null;

  const addTag = () => {
    const clean = tagInput.trim().slice(0, 32);
    if (!clean) return;
    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase()) && tags.length < 10) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;
    await onSave({ fileName: fileName.trim(), description: description.trim(), tags });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !saving && onClose()}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Pencil size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                Organizar e Editar Arquivo
              </h3>
              <p className="text-xs text-neutral-500">
                Renomeie, adicione referência ou etiquetas de busca rápida
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Nome do Arquivo
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Descrição / Observação
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pregão 014/2026 — homologado pelo prefeito em março"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Etiquetas (Tags)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  maxLength={32}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Ex: urgente, assinado, 2026..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Adicionar</span>
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200/70 dark:border-blue-800"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((item) => item !== t))}
                      className="hover:text-rose-500 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !fileName.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// MODAL: CONFIRMAR EXCLUSÃO DE PASTA
// ============================================================================
interface DeleteFolderModalProps {
  folder: DriveFolderRecord | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({
  folder,
  deleting,
  onClose,
  onConfirm
}) => {
  if (!folder) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !deleting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-neutral-900 dark:text-white">
              Excluir pasta "{folder.name}"?
            </h3>
            <p className="text-xs text-neutral-500">
              Os arquivos dentro dela não serão apagados — eles continuarão disponíveis na raiz.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void onConfirm()}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {deleting && <RefreshCw size={13} className="animate-spin" />}
            <span>{deleting ? 'Excluindo...' : 'Excluir Pasta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
