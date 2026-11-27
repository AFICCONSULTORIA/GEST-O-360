import React from 'react';
import {
  HardDrive,
  Upload,
  FolderPlus,
  Star,
  Clock,
  Folder
} from 'lucide-react';
import { DriveAccountInfo, DriveFolderRecord, DriveQuotaInfo } from '../../../lib/api/driveFiles';
import { getFolderColorStyle } from './DriveModals';

export type QuickNavFilter = 'all' | 'starred' | 'recent';

interface DriveSidebarProps {
  institutionName: string;
  isConfigured: boolean;
  isProcessingQueue: boolean;
  quickNav: QuickNavFilter;
  activeFolderId: string | null;
  activeCategory: string | null;
  folders: DriveFolderRecord[];
  rootCustomFolders: DriveFolderRecord[];
  defaultCategories: string[];
  counts: {
    totalFiles: number;
    starred: number;
    recent: number;
    byFolderId: Map<string, number>;
    byCategory: Map<string, { count: number; bytes: number }>;
  };
  quota: DriveQuotaInfo | null;
  driveAccount: DriveAccountInfo | null;
  usagePercent: number;
  freeBytes: number;
  quotaBarColor: string;
  draggingFileId: string | null;
  dropTargetKey: string | null;
  formatBytes: (bytes: number) => string;
  onTriggerUpload: () => void;
  onNewFolder: () => void;
  onSelectQuickNav: (nav: QuickNavFilter) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectCategory: (category: string | null) => void;
  onSetDropTargetKey: (key: string | null) => void;
  onDropOnFolder: (
    e: React.DragEvent,
    destination: { folderId: string | null; folderCategory: string; driveFolderId?: string | null }
  ) => Promise<void>;
}

export const DriveSidebar: React.FC<DriveSidebarProps> = ({
  institutionName,
  isConfigured,
  isProcessingQueue,
  quickNav,
  activeFolderId,
  activeCategory,
  folders,
  rootCustomFolders,
  defaultCategories,
  counts,
  quota,
  driveAccount,
  usagePercent,
  freeBytes,
  quotaBarColor,
  draggingFileId,
  dropTargetKey,
  formatBytes,
  onTriggerUpload,
  onNewFolder,
  onSelectQuickNav,
  onSelectFolder,
  onSelectCategory,
  onSetDropTargetKey,
  onDropOnFolder
}) => {
  return (
    <aside className="lg:col-span-3 space-y-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
            <HardDrive size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-neutral-900 dark:text-white truncate">
              Banco de Arquivos
            </h2>
            <p className="text-[11px] font-semibold text-neutral-500 truncate" title={institutionName}>
              {institutionName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isProcessingQueue || !isConfigured}
            onClick={onTriggerUpload}
            className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-600/20 transition-all"
          >
            <Upload size={14} />
            <span>Enviar</span>
          </button>
          <button
            type="button"
            disabled={!isConfigured}
            onClick={onNewFolder}
            className="px-3 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 disabled:opacity-50 text-neutral-800 dark:text-neutral-100 text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <FolderPlus size={14} />
            <span>Pasta</span>
          </button>
        </div>

        <nav className="space-y-1">
          <p className="px-2 text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Acesso Rápido
          </p>
          <button
            type="button"
            onClick={() => onSelectQuickNav('all')}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
              quickNav === 'all' && !activeFolderId && !activeCategory
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <HardDrive size={14} />
              <span>Todos os Arquivos</span>
            </span>
            <span className="text-[10px] font-black opacity-75">{counts.totalFiles}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectQuickNav('starred')}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
              quickNav === 'starred'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Star size={14} className={counts.starred > 0 ? 'text-amber-500' : ''} />
              <span>Favoritos</span>
            </span>
            {counts.starred > 0 && (
              <span className="text-[10px] font-black opacity-75">{counts.starred}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectQuickNav('recent')}
            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
              quickNav === 'recent'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Clock size={14} />
              <span>Recentes (7 dias)</span>
            </span>
            {counts.recent > 0 && (
              <span className="text-[10px] font-black opacity-75">{counts.recent}</span>
            )}
          </button>
        </nav>

        <div className="space-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="px-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Minhas Pastas ({folders.length})
            </p>
            <button
              type="button"
              title="Criar nova pasta"
              onClick={onNewFolder}
              className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-blue-600 cursor-pointer"
            >
              <FolderPlus size={13} />
            </button>
          </div>

          {rootCustomFolders.length === 0 ? (
            <button
              type="button"
              onClick={onNewFolder}
              className="w-full px-3 py-2.5 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold text-neutral-400 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer text-left"
            >
              + Criar primeira pasta personalizada
            </button>
          ) : (
            <div className="space-y-0.5 max-h-52 overflow-y-auto pr-0.5">
              {rootCustomFolders.map((folder) => {
                const style = getFolderColorStyle(folder.color);
                const isSelected = activeFolderId === folder.id;
                const isDropOver = dropTargetKey === `folder:${folder.id}`;
                const fileCount = counts.byFolderId.get(folder.id) || 0;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onDragOver={(e) => {
                      if (draggingFileId) {
                        e.preventDefault();
                        onSetDropTargetKey(`folder:${folder.id}`);
                      }
                    }}
                    onDragLeave={() => onSetDropTargetKey(null)}
                    onDrop={(e) =>
                      void onDropOnFolder(e, {
                        folderId: folder.id,
                        folderCategory: folder.name,
                        driveFolderId: folder.drive_folder_id || null
                      })
                    }
                    onClick={() => onSelectFolder(folder.id)}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isDropOver
                        ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500 text-blue-800 dark:text-blue-200'
                        : isSelected
                          ? `${style.bg} ${style.text}`
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <Folder size={14} className={`${style.text} shrink-0`} />
                      <span className="truncate">{folder.name}</span>
                    </span>
                    {fileCount > 0 && (
                      <span className="text-[10px] font-black opacity-75 shrink-0">{fileCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <p className="px-2 text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Secretarias
          </p>
          <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5">
            {defaultCategories.map((cat) => {
              const isSelected = activeCategory === cat && !activeFolderId;
              const isDropOver = dropTargetKey === `cat:${cat}`;
              const count = counts.byCategory.get(cat)?.count || 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onDragOver={(e) => {
                    if (draggingFileId) {
                      e.preventDefault();
                      onSetDropTargetKey(`cat:${cat}`);
                    }
                  }}
                  onDragLeave={() => onSetDropTargetKey(null)}
                  onDrop={(e) =>
                    void onDropOnFolder(e, {
                      folderId: null,
                      folderCategory: cat,
                      driveFolderId: null
                    })
                  }
                  onClick={() => onSelectCategory(isSelected ? null : cat)}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isDropOver
                      ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500 text-blue-800 dark:text-blue-200'
                      : isSelected
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-black opacity-70 shrink-0">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-black text-neutral-500 uppercase tracking-wider text-[10px]">
              Google Drive
            </span>
            <span className="font-black text-blue-600 dark:text-blue-400">
              {usagePercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className={`h-full ${quotaBarColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.max(quota && quota.usageBytes > 0 ? 3 : 0, usagePercent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-500">
            <span>{quota ? formatBytes(quota.usageBytes) : '—'} usados</span>
            <span>{quota ? formatBytes(freeBytes) : '5 TB'} livre</span>
          </div>
          {driveAccount?.email && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 truncate pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">{driveAccount.email}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
