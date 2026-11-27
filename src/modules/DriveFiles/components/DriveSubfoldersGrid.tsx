import React from 'react';
import { Folder, Pencil, Trash2 } from 'lucide-react';
import { DriveFolderRecord } from '../../../lib/api/driveFiles';
import { getFolderColorStyle } from './DriveModals';

interface DriveSubfoldersGridProps {
  visibleSubfolders: DriveFolderRecord[];
  allFolders: DriveFolderRecord[];
  byFolderId: Map<string, number>;
  draggingFileId: string | null;
  dropTargetKey: string | null;
  onSetDropTargetKey: (key: string | null) => void;
  onDropOnFolder: (
    e: React.DragEvent,
    destination: { folderId: string | null; folderCategory: string; driveFolderId?: string | null }
  ) => Promise<void>;
  onOpenFolder: (folderId: string) => void;
  onEditFolder: (folder: DriveFolderRecord) => void;
  onDeleteFolder: (folder: DriveFolderRecord) => void;
}

export const DriveSubfoldersGrid: React.FC<DriveSubfoldersGridProps> = ({
  visibleSubfolders,
  allFolders,
  byFolderId,
  draggingFileId,
  dropTargetKey,
  onSetDropTargetKey,
  onDropOnFolder,
  onOpenFolder,
  onEditFolder,
  onDeleteFolder
}) => {
  if (visibleSubfolders.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
          Pastas ({visibleSubfolders.length})
        </h3>
        <span className="text-[11px] font-semibold text-neutral-400">
          Arraste arquivos sobre uma pasta para mover
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {visibleSubfolders.map((folder) => {
          const style = getFolderColorStyle(folder.color);
          const fileCount = byFolderId.get(folder.id) || 0;
          const subCount = allFolders.filter((f) => f.parent_id === folder.id).length;
          const isDropOver = dropTargetKey === `card:${folder.id}`;
          return (
            <div
              key={folder.id}
              onDragOver={(e) => {
                if (draggingFileId) {
                  e.preventDefault();
                  onSetDropTargetKey(`card:${folder.id}`);
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
              onClick={() => onOpenFolder(folder.id)}
              className={`group p-3.5 rounded-2xl border bg-white dark:bg-neutral-900 flex items-center justify-between gap-2 transition-all cursor-pointer ${
                isDropOver
                  ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01]'
                  : 'border-neutral-200/80 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl ${style.bg} ${style.text} flex items-center justify-center shrink-0`}>
                  <Folder size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-neutral-900 dark:text-white truncate">
                    {folder.name}
                  </p>
                  <p className="text-[10px] font-semibold text-neutral-400">
                    {fileCount} {fileCount === 1 ? 'arquivo' : 'arquivos'}
                    {subCount > 0 ? ` • ${subCount} ${subCount === 1 ? 'subpasta' : 'subpastas'}` : ''}
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  title="Editar pasta"
                  onClick={() => onEditFolder(folder)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  title="Excluir pasta"
                  onClick={() => onDeleteFolder(folder)}
                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
