import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HardDrive,
  Upload,
  Search,
  FolderOpen,
  FileText,
  Download,
  ExternalLink,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Image as ImageIcon,
  File as FileIcon,
  Eye,
  X,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  Clock,
  CloudUpload,
  Folder,
  FolderPlus,
  FolderInput,
  Database,
  ArrowUpDown,
  XCircle,
  Star,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Tag,
  CheckSquare,
  Square,
  Sparkles,
  GripVertical
} from 'lucide-react';
import { AdminUser, Institution } from '../../types';
import { showToast } from '../../components/ui/Toast';
import {
  DriveAccountInfo,
  DriveFileRecord,
  DriveFolderRecord,
  DriveQuotaInfo,
  MAX_DIRECT_UPLOAD_BYTES,
  MAX_DIRECT_UPLOAD_MB,
  createDriveFolder,
  deleteDriveFile,
  deleteDriveFolder,
  downloadDriveFile,
  fetchDriveFilePreviewUrl,
  listDriveFiles,
  updateDriveFile,
  updateDriveFolder,
  uploadDriveFile
} from '../../lib/api/driveFiles';
import {
  DeleteFolderModal,
  EditFileModal,
  FolderFormModal,
  MoveFilesModal,
  getFolderColorStyle
} from './components/DriveModals';
import { DriveSidebar, QuickNavFilter } from './components/DriveSidebar';
import { DriveFilesList } from './components/DriveFilesList';
import { DrivePreviewModals } from './components/DrivePreviewModals';
import { DriveSubfoldersGrid } from './components/DriveSubfoldersGrid';

interface DriveFilesModuleProps {
  currentUser?: AdminUser | null;
  currentInstitution?: Institution | null;
}

type ViewMode = 'list' | 'grid';
type SortOption = 'newest' | 'oldest' | 'largest' | 'name';
type FileTypeFilter = 'all' | 'pdf' | 'image' | 'sheet' | 'doc';
type DateRangeFilter = 'all' | 'today' | '7d' | '30d' | 'year';

interface UploadQueueItem {
  id: string;
  file: File;
  category: string;
  folderId: string | null;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
}

const DEFAULT_CATEGORIES = [
  'Geral',
  'Frotas & Abastecimento',
  'Educação',
  'Saúde',
  'Contabilidade & Finanças',
  'Licitações & Contratos',
  'Leis & Decretos',
  'RH & Servidores'
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : i === 0 ? 0 : 1)} ${units[i]}`;
}

function getFileTypeCategory(mime?: string | null, name?: string): Exclude<FileTypeFilter, 'all'> | 'other' {
  const m = (mime || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
  if (m.includes('image') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return 'image';
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv') || /\.(xlsx?|csv|ods)$/.test(n)) {
    return 'sheet';
  }
  if (m.includes('word') || m.includes('document') || m.includes('text') || /\.(docx?|odt|txt|rtf)$/.test(n)) {
    return 'doc';
  }
  return 'other';
}

function canPreviewInline(mime?: string | null, name?: string): boolean {
  const t = getFileTypeCategory(mime, name);
  return t === 'pdf' || t === 'image';
}

export const DriveFilesModule: React.FC<DriveFilesModuleProps> = ({
  currentUser,
  currentInstitution
}) => {
  const institutionId = currentInstitution?.id || currentUser?.institution_id || 'inst_1';
  const institutionName = currentInstitution?.name || 'Prefeitura Municipal';

  const [files, setFiles] = useState<DriveFileRecord[]>([]);
  const [folders, setFolders] = useState<DriveFolderRecord[]>([]);
  const [quota, setQuota] = useState<DriveQuotaInfo | null>(null);
  const [driveAccount, setDriveAccount] = useState<DriveAccountInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [dbTableMissing, setDbTableMissing] = useState<boolean>(false);
  const [foldersTableMissing, setFoldersTableMissing] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Navegação e Localização Atual
  const [quickNav, setQuickNav] = useState<QuickNavFilter>('all');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filtros e Visualização
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [uploaderFilter, setUploaderFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Seleção em Lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Upload & Drag-and-Drop
  const [uploadDescription, setUploadDescription] = useState('');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isExternalDragging, setIsExternalDragging] = useState(false);
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modais & Ações
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<DriveFolderRecord | null>(null);
  const [savingFolder, setSavingFolder] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<DriveFolderRecord | null>(null);
  const [deletingFolderBusy, setDeletingFolderBusy] = useState(false);

  const [moveTargets, setMoveTargets] = useState<DriveFileRecord[]>([]);
  const [movingFiles, setMovingFiles] = useState(false);
  const [editingFile, setEditingFile] = useState<DriveFileRecord | null>(null);
  const [savingFile, setSavingFile] = useState(false);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DriveFileRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DriveFileRecord | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDriveFiles({ institutionId });
      setIsConfigured(res.configured);
      setConfigMessage(res.message || null);
      setQuota(res.quota || null);
      setDriveAccount(res.driveAccount || null);
      setDbTableMissing(Boolean(res.dbTableMissing));
      setFoldersTableMissing(Boolean(res.foldersTableMissing));
      setDbError(res.dbError || null);
      setFolders(res.folders || []);
      setFiles(res.files || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao consultar Banco de Arquivos.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Limpa seleção ao trocar de pasta/filtro principal
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeFolderId, activeCategory, quickNav]);

  const activeFolder = useMemo(
    () => (activeFolderId ? folders.find((f) => f.id === activeFolderId) || null : null),
    [activeFolderId, folders]
  );

  // Trilha de Breadcrumb para pastas hierárquicas
  const breadcrumbs = useMemo(() => {
    const chain: DriveFolderRecord[] = [];
    let current = activeFolder;
    let guard = 0;
    while (current && guard < 8) {
      chain.unshift(current);
      current = current.parent_id ? folders.find((f) => f.id === current?.parent_id) || null : null;
      guard += 1;
    }
    return chain;
  }, [activeFolder, folders]);

  // Subpastas visíveis no nível atual (apenas quando não está filtrando por Secretaria fixa ou Favoritos/Recentes)
  const visibleSubfolders = useMemo(() => {
    if (activeCategory || quickNav !== 'all') return [];
    const q = searchTerm.trim().toLowerCase();
    return folders
      .filter((f) => (activeFolderId ? f.parent_id === activeFolderId : !f.parent_id))
      .filter((f) => (!q ? true : f.name.toLowerCase().includes(q)));
  }, [folders, activeFolderId, activeCategory, quickNav, searchTerm]);

  // Contagens por pasta personalizada, secretaria, favoritos e recentes
  const counts = useMemo(() => {
    const byFolderId = new Map<string, number>();
    const byCategory = new Map<string, { count: number; bytes: number }>();
    const uploaders = new Set<string>();
    const tagsSet = new Set<string>();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let starred = 0;
    let recent = 0;
    let totalBytes = 0;

    for (const f of files) {
      totalBytes += Number(f.size_bytes) || 0;
      if (f.is_starred) starred += 1;
      if (new Date(f.created_at).getTime() >= sevenDaysAgo) recent += 1;
      if (f.folder_id) {
        byFolderId.set(f.folder_id, (byFolderId.get(f.folder_id) || 0) + 1);
      }
      const cat = f.folder_category || 'Geral';
      const prev = byCategory.get(cat) || { count: 0, bytes: 0 };
      prev.count += 1;
      prev.bytes += Number(f.size_bytes) || 0;
      byCategory.set(cat, prev);

      if (f.uploaded_by_name) uploaders.add(f.uploaded_by_name);
      if (Array.isArray(f.tags)) {
        for (const t of f.tags) {
          if (t) tagsSet.add(t);
        }
      }
    }

    return {
      totalFiles: files.length,
      totalBytes,
      starred,
      recent,
      byFolderId,
      byCategory,
      uploaders: Array.from(uploaders).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      allTags: Array.from(tagsSet).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    };
  }, [files]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (typeFilter !== 'all') n += 1;
    if (dateFilter !== 'all') n += 1;
    if (uploaderFilter !== 'all') n += 1;
    if (tagFilter) n += 1;
    if (searchTerm.trim()) n += 1;
    return n;
  }, [typeFilter, dateFilter, uploaderFilter, tagFilter, searchTerm]);

  const clearAllFilters = () => {
    setTypeFilter('all');
    setDateFilter('all');
    setUploaderFilter('all');
    setTagFilter('');
    setSearchTerm('');
  };

  // Lista filtrada e ordenada de arquivos
  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();

    const list = files.filter((f) => {
      if (quickNav === 'starred' && !f.is_starred) return false;
      if (quickNav === 'recent' && new Date(f.created_at).getTime() < now - 7 * 24 * 60 * 60 * 1000) {
        return false;
      }

      if (activeFolderId) {
        if (f.folder_id !== activeFolderId) return false;
      } else if (activeCategory) {
        if (f.folder_category !== activeCategory) return false;
      }

      if (typeFilter !== 'all' && getFileTypeCategory(f.mime_type, f.file_name) !== typeFilter) {
        return false;
      }

      if (dateFilter !== 'all') {
        const ts = new Date(f.created_at).getTime();
        if (dateFilter === 'today' && ts < startOfToday.getTime()) return false;
        if (dateFilter === '7d' && ts < now - 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '30d' && ts < now - 30 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === 'year' && ts < startOfYear) return false;
      }

      if (uploaderFilter !== 'all' && f.uploaded_by_name !== uploaderFilter) return false;

      if (tagFilter) {
        const tags = Array.isArray(f.tags) ? f.tags : [];
        if (!tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())) return false;
      }

      if (!q) return true;
      const tagsText = Array.isArray(f.tags) ? f.tags.join(' ').toLowerCase() : '';
      return (
        f.file_name.toLowerCase().includes(q) ||
        f.folder_category.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q) ||
        (f.uploaded_by_name || '').toLowerCase().includes(q) ||
        tagsText.includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'largest') {
        return (Number(b.size_bytes) || 0) - (Number(a.size_bytes) || 0);
      }
      if (sortBy === 'name') {
        return a.file_name.localeCompare(b.file_name, 'pt-BR');
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [
    files,
    quickNav,
    activeFolderId,
    activeCategory,
    typeFilter,
    dateFilter,
    uploaderFilter,
    tagFilter,
    searchTerm,
    sortBy
  ]);

  const currentDestinationLabel = activeFolder
    ? activeFolder.name
    : activeCategory || 'Geral';

  // Upload para o contexto atual (pasta aberta ou secretaria selecionada)
  const enqueueAndUploadFiles = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    if (fileArray.length === 0) return;

    if (!isConfigured) {
      showToast('Configure as credenciais OAuth do Google Drive na Vercel antes de enviar.', 'error');
      return;
    }

    const targetCategory = activeFolder ? activeFolder.name : activeCategory || 'Geral';
    const targetFolderId = activeFolder ? activeFolder.id : null;
    const targetDriveFolderId = activeFolder?.drive_folder_id || null;
    const activeDescription = uploadDescription.trim();

    const newItems: UploadQueueItem[] = fileArray.map((file, idx) => {
      const tooLarge = file.size > MAX_DIRECT_UPLOAD_BYTES;
      return {
        id: `${Date.now()}_${idx}_${file.name}`,
        file,
        category: targetCategory,
        folderId: targetFolderId,
        status: tooLarge ? 'error' : 'queued',
        error: tooLarge
          ? `Excede o limite de ${MAX_DIRECT_UPLOAD_MB} MB (${formatBytes(file.size)})`
          : undefined
      };
    });

    setUploadQueue((prev) => [...newItems, ...prev].slice(0, 20));
    setIsProcessingQueue(true);

    let successCount = 0;
    for (const item of newItems) {
      if (item.status === 'error') continue;

      setUploadQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q))
      );

      try {
        const uploaded = await uploadDriveFile({
          file: item.file,
          institutionId,
          institutionName,
          category: item.category,
          folderId: item.folderId,
          targetDriveFolderId,
          description: activeDescription,
          uploadedByName: currentUser?.name || 'Servidor Público'
        });

        successCount += 1;
        setFiles((prev) => [uploaded, ...prev]);
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'done' } : q))
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao enviar arquivo.';
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'error', error: msg } : q))
        );
      }
    }

    setIsProcessingQueue(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (successCount > 0) {
      setUploadDescription('');
      setShowUploadPanel(false);
      showToast(
        successCount === 1
          ? `Arquivo enviado para "${targetCategory}"!`
          : `${successCount} arquivos enviados para "${targetCategory}"!`,
        'success'
      );
      void loadFiles();
    }
  };

  // Criar ou Editar Pasta
  const handleSubmitFolder = async (payload: { name: string; color: string }) => {
    setSavingFolder(true);
    try {
      if (editingFolder) {
        const updated = await updateDriveFolder({
          id: editingFolder.id,
          name: payload.name,
          color: payload.color
        });
        setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        showToast(`Pasta "${updated.name}" atualizada!`, 'success');
      } else {
        const created = await createDriveFolder({
          institutionId,
          institutionName,
          name: payload.name,
          parentId: activeFolder?.id || null,
          parentDriveFolderId: activeFolder?.drive_folder_id || null,
          color: payload.color,
          createdByName: currentUser?.name || 'Servidor Público'
        });
        setFolders((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        );
        showToast(`Pasta "${created.name}" criada com sucesso!`, 'success');
      }
      setFolderModalOpen(false);
      setEditingFolder(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar a pasta.';
      showToast(msg, 'error');
    } finally {
      setSavingFolder(false);
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deletingFolder) return;
    setDeletingFolderBusy(true);
    try {
      await deleteDriveFolder(deletingFolder.id);
      if (activeFolderId === deletingFolder.id) {
        setActiveFolderId(deletingFolder.parent_id || null);
      }
      setFolders((prev) => prev.filter((f) => f.id !== deletingFolder.id));
      setFiles((prev) =>
        prev.map((file) => (file.folder_id === deletingFolder.id ? { ...file, folder_id: null } : file))
      );
      showToast(`Pasta "${deletingFolder.name}" excluída.`, 'info');
      setDeletingFolder(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível excluir a pasta.';
      showToast(msg, 'error');
    } finally {
      setDeletingFolderBusy(false);
    }
  };

  // Favoritar com 1 clique (otimista)
  const handleToggleStar = async (item: DriveFileRecord) => {
    const nextStar = !item.is_starred;
    setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, is_starred: nextStar } : f)));
    try {
      await updateDriveFile({ id: item.id, isStarred: nextStar });
    } catch (err: unknown) {
      setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, is_starred: !nextStar } : f)));
      const msg = err instanceof Error ? err.message : 'Não foi possível atualizar favorito.';
      showToast(msg, 'error');
    }
  };

  // Mover 1 ou mais arquivos para pasta/secretaria
  const handleMoveFilesTo = async (
    targetList: DriveFileRecord[],
    destination: { folderId: string | null; folderCategory: string; driveFolderId?: string | null }
  ) => {
    if (targetList.length === 0) return;
    setMovingFiles(true);
    let movedCount = 0;
    try {
      for (const file of targetList) {
        const updated = await updateDriveFile({
          id: file.id,
          driveFileId: file.drive_file_id,
          folderId: destination.folderId,
          folderCategory: destination.folderCategory,
          targetDriveFolderId: destination.driveFolderId || null,
          previousDriveFolderId: file.drive_folder_id || null
        });
        setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        movedCount += 1;
      }
      showToast(
        movedCount === 1
          ? `Arquivo movido para "${destination.folderCategory}".`
          : `${movedCount} arquivos movidos para "${destination.folderCategory}".`,
        'success'
      );
      setMoveTargets([]);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível mover o(s) arquivo(s).';
      showToast(msg, 'error');
    } finally {
      setMovingFiles(false);
    }
  };

  // Editar nome, descrição e tags do arquivo
  const handleSaveFileEdit = async (payload: { fileName: string; description: string; tags: string[] }) => {
    if (!editingFile) return;
    setSavingFile(true);
    try {
      const updated = await updateDriveFile({
        id: editingFile.id,
        driveFileId: editingFile.drive_file_id,
        fileName: payload.fileName,
        description: payload.description,
        tags: payload.tags
      });
      setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      showToast('Detalhes do arquivo atualizados!', 'success');
      setEditingFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível atualizar o arquivo.';
      showToast(msg, 'error');
    } finally {
      setSavingFile(false);
    }
  };

  // Ações em lote
  const selectedFiles = useMemo(
    () => filteredFiles.filter((f) => selectedIds.has(f.id)),
    [filteredFiles, selectedIds]
  );

  const toggleSelectFile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (selectedIds.size === filteredFiles.length && filteredFiles.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleBulkStar = async () => {
    if (selectedFiles.length === 0) return;
    const allStarred = selectedFiles.every((f) => f.is_starred);
    const nextVal = !allStarred;
    try {
      for (const f of selectedFiles) {
        await updateDriveFile({ id: f.id, isStarred: nextVal });
      }
      setFiles((prev) =>
        prev.map((f) => (selectedIds.has(f.id) ? { ...f, is_starred: nextVal } : f))
      );
      showToast(
        nextVal
          ? `${selectedFiles.length} arquivo(s) marcados como favoritos.`
          : `${selectedFiles.length} arquivo(s) removidos dos favoritos.`,
        'success'
      );
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar favoritos em lote.';
      showToast(msg, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    setBulkDeleting(true);
    let removed = 0;
    try {
      for (const f of selectedFiles) {
        await deleteDriveFile(f.id, f.drive_file_id);
        removed += 1;
      }
      setFiles((prev) => prev.filter((f) => !selectedIds.has(f.id)));
      setSelectedIds(new Set());
      showToast(`${removed} arquivo(s) movidos para a lixeira do Google Drive.`, 'info');
      void loadFiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir arquivos selecionados.';
      showToast(msg, 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Drag & Drop interno (arrastar arquivo para uma pasta)
  const handleDropOnFolder = async (
    e: React.DragEvent,
    destination: { folderId: string | null; folderCategory: string; driveFolderId?: string | null }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetKey(null);
    const draggedId = e.dataTransfer.getData('application/x-gestao360-file-id') || draggingFileId;
    setDraggingFileId(null);
    if (!draggedId) return;

    const toMove =
      selectedIds.has(draggedId) && selectedFiles.length > 1
        ? selectedFiles
        : files.filter((f) => f.id === draggedId);

    if (toMove.length > 0) {
      await handleMoveFilesTo(toMove, destination);
    }
  };

  // Preview, Download e Exclusão Individual
  const handleOpenPreview = async (item: DriveFileRecord) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewItem(item);
    if (!canPreviewInline(item.mime_type, item.file_name)) return;
    setPreviewLoading(true);
    try {
      const url = await fetchDriveFilePreviewUrl(item.drive_file_id);
      setPreviewUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível abrir a pré-visualização.';
      showToast(msg, 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewItem(null);
  };

  const handleDownload = async (item: DriveFileRecord) => {
    setDownloadingId(item.id);
    try {
      await downloadDriveFile(item.drive_file_id, item.file_name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao baixar arquivo.';
      showToast(msg, 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDriveFile(deleteTarget.id, deleteTarget.drive_file_id);
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      if (previewItem?.id === deleteTarget.id) handleClosePreview();
      showToast(`"${deleteTarget.file_name}" movido para a lixeira do Google Drive.`, 'info');
      setDeleteTarget(null);
      void loadFiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir arquivo.';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const usagePercent = useMemo(() => {
    if (!quota || !quota.limitBytes) return 0;
    return Math.min(100, Number(((quota.usageBytes / quota.limitBytes) * 100).toFixed(2)));
  }, [quota]);

  const freeBytes = useMemo(() => {
    if (!quota || !quota.limitBytes) return 0;
    return Math.max(0, quota.limitBytes - quota.usageBytes);
  }, [quota]);

  const quotaBarColor =
    usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-blue-600';

  const renderFileIcon = (mime?: string | null, name?: string, size: number = 19) => {
    const t = getFileTypeCategory(mime, name);
    if (t === 'image') return <ImageIcon size={size} className="text-blue-500" />;
    if (t === 'sheet') return <FileSpreadsheet size={size} className="text-emerald-500" />;
    if (t === 'pdf') return <FileText size={size} className="text-rose-500" />;
    if (t === 'doc') return <FileText size={size} className="text-indigo-500" />;
    return <FileIcon size={size} className="text-neutral-500" />;
  };

  const rootCustomFolders = useMemo(() => folders.filter((f) => !f.parent_id), [folders]);

  return (
    <div
      className="max-w-7xl mx-auto pb-16 space-y-5 relative"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files') && isConfigured) {
          e.preventDefault();
          setIsExternalDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setIsExternalDragging(false);
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files?.length && isConfigured) {
          e.preventDefault();
          setIsExternalDragging(false);
          void enqueueAndUploadFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Overlay de Drag & Drop Global */}
      {isExternalDragging && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setIsExternalDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsExternalDragging(false);
            if (e.dataTransfer.files?.length) {
              void enqueueAndUploadFiles(e.dataTransfer.files);
            }
          }}
          className="fixed inset-0 z-40 bg-blue-600/15 dark:bg-blue-950/50 backdrop-blur-xs flex items-center justify-center p-6"
        >
          <div className="bg-white dark:bg-neutral-900 border-2 border-dashed border-blue-500 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CloudUpload size={32} />
            </div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">
              Solte os arquivos para enviar
            </h3>
            <p className="text-xs font-semibold text-neutral-500">
              Destino: <strong className="text-blue-600 dark:text-blue-400">{currentDestinationLabel}</strong> • Até{' '}
              {MAX_DIRECT_UPLOAD_MB} MB por arquivo
            </p>
          </div>
        </div>
      )}

      {/* Input oculto de arquivos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            void enqueueAndUploadFiles(e.target.files);
          }
        }}
      />

      {/* Alertas de Diagnóstico (OAuth ou Migração SQL) */}
      {!isConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-black">Configuração OAuth pendente no servidor (Vercel)</p>
            <p>{configMessage || 'Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_DRIVE_REFRESH_TOKEN na Vercel.'}</p>
          </div>
        </div>
      )}

      {isConfigured && (dbTableMissing || dbError) && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 flex items-start gap-3">
          <Database size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <p className="font-black">
              {dbTableMissing ? 'Tabela do Banco de Arquivos não encontrada' : 'Aviso ao consultar Supabase'}
            </p>
            <p>{dbError}</p>
          </div>
        </div>
      )}

      {isConfigured && !dbTableMissing && foldersTableMissing && (
        <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-blue-600 shrink-0" />
            <span>
              Para ativar <strong>pastas personalizadas, subpastas, favoritos e tags</strong>, execute a migração{' '}
              <code className="font-mono bg-white/80 dark:bg-neutral-900 px-1.5 py-0.5 rounded-md text-[11px]">
                20261127010000_drive_folders_and_file_organization.sql
              </code>{' '}
              no Supabase.
            </span>
          </div>
        </div>
      )}

      {/* Layout Principal em 2 Colunas (Sidebar + Explorer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* SIDEBAR ESQUERDA: Ações, Atalhos, Árvore de Pastas e Cota */}
        <DriveSidebar
          institutionName={institutionName}
          isConfigured={isConfigured}
          isProcessingQueue={isProcessingQueue}
          quickNav={quickNav}
          activeFolderId={activeFolderId}
          activeCategory={activeCategory}
          folders={folders}
          rootCustomFolders={rootCustomFolders}
          defaultCategories={DEFAULT_CATEGORIES}
          counts={counts}
          quota={quota}
          driveAccount={driveAccount}
          usagePercent={usagePercent}
          freeBytes={freeBytes}
          quotaBarColor={quotaBarColor}
          draggingFileId={draggingFileId}
          dropTargetKey={dropTargetKey}
          formatBytes={formatBytes}
          onTriggerUpload={() => fileInputRef.current?.click()}
          onNewFolder={() => {
            setEditingFolder(null);
            setFolderModalOpen(true);
          }}
          onSelectQuickNav={(nav) => {
            setQuickNav(nav);
            setActiveFolderId(null);
            setActiveCategory(null);
          }}
          onSelectFolder={(folderId) => {
            setQuickNav('all');
            setActiveCategory(null);
            setActiveFolderId(folderId);
          }}
          onSelectCategory={(cat) => {
            setQuickNav('all');
            setActiveFolderId(null);
            setActiveCategory(cat);
          }}
          onSetDropTargetKey={setDropTargetKey}
          onDropOnFolder={handleDropOnFolder}
        />

        {/* ÁREA PRINCIPAL (EXPLORER DE ARQUIVOS E PASTAS) */}
        <section className="lg:col-span-9 space-y-4 min-w-0">
          {/* Topo: Breadcrumb + Ações da Pasta Atual */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Breadcrumb Navegável */}
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {(activeFolder || activeCategory || quickNav !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFolder?.parent_id) {
                        setActiveFolderId(activeFolder.parent_id);
                      } else {
                        setActiveFolderId(null);
                        setActiveCategory(null);
                        setQuickNav('all');
                      }
                    }}
                    title="Voltar um nível"
                    className="p-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer mr-1"
                  >
                    <ChevronLeft size={15} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setQuickNav('all');
                    setActiveFolderId(null);
                    setActiveCategory(null);
                  }}
                  className={`text-sm font-black tracking-tight cursor-pointer transition-colors ${
                    !activeFolder && !activeCategory && quickNav === 'all'
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-400 hover:text-blue-600'
                  }`}
                >
                  Meu Repositório
                </button>

                {quickNav === 'starred' && (
                  <>
                    <ChevronRight size={14} className="text-neutral-400" />
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                      <Star size={14} /> Favoritos
                    </span>
                  </>
                )}

                {quickNav === 'recent' && (
                  <>
                    <ChevronRight size={14} className="text-neutral-400" />
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      Recentes (7 dias)
                    </span>
                  </>
                )}

                {activeCategory && !activeFolder && (
                  <>
                    <ChevronRight size={14} className="text-neutral-400" />
                    <span className="text-sm font-black text-neutral-900 dark:text-white">
                      {activeCategory}
                    </span>
                  </>
                )}

                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.id}>
                      <ChevronRight size={14} className="text-neutral-400" />
                      <button
                        type="button"
                        onClick={() => setActiveFolderId(crumb.id)}
                        className={`text-sm font-black truncate max-w-[180px] cursor-pointer ${
                          isLast
                            ? 'text-neutral-900 dark:text-white'
                            : 'text-neutral-400 hover:text-blue-600'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  );
                })}

                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-200/70 dark:border-emerald-800 hidden sm:inline-flex items-center gap-1">
                  <ShieldCheck size={11} /> Isolado
                </span>
              </div>

              {/* Ações de Barra Superior */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowUploadPanel((v) => !v)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    showUploadPanel
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  <CloudUpload size={14} />
                  <span className="hidden sm:inline">Upload com Descrição</span>
                </button>
                <button
                  type="button"
                  onClick={() => void loadFiles()}
                  disabled={loading}
                  title="Atualizar listagem"
                  className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Painel de Upload Sob Demanda (limpo e colapsável) */}
            {(showUploadPanel || uploadQueue.length > 0) && (
              <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 p-4 space-y-3">
                {showUploadPanel && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <input
                      type="text"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder={`Descrição opcional para os arquivos enviados em "${currentDestinationLabel}"...`}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      type="button"
                      disabled={isProcessingQueue || !isConfigured}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Upload size={14} />
                      <span>Selecionar Arquivos</span>
                    </button>
                  </div>
                )}

                {uploadQueue.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                        Fila de Envio ({uploadQueue.length})
                      </span>
                      {!isProcessingQueue && (
                        <button
                          type="button"
                          onClick={() => setUploadQueue([])}
                          className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {uploadQueue.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.status === 'uploading' && (
                              <RefreshCw size={13} className="animate-spin text-blue-500 shrink-0" />
                            )}
                            {item.status === 'queued' && (
                              <Clock size={13} className="text-neutral-400 shrink-0" />
                            )}
                            {item.status === 'done' && (
                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                            )}
                            {item.status === 'error' && (
                              <XCircle size={13} className="text-rose-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-neutral-800 dark:text-neutral-100 truncate">
                                {item.file.name}
                              </p>
                              {item.error && (
                                <p className="text-[10px] font-semibold text-rose-500 truncate">{item.error}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-neutral-400 shrink-0">
                            {formatBytes(item.file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Barra de Busca, Tipos, Filtros Avançados e Alternador Lista/Grade */}
            <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, #etiqueta, descrição ou servidor..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 p-0.5 text-[11px] font-bold">
                  {(
                    [
                      { id: 'all', label: 'Todos' },
                      { id: 'pdf', label: 'PDF' },
                      { id: 'image', label: 'Imagens' },
                      { id: 'sheet', label: 'Planilhas' },
                      { id: 'doc', label: 'Docs' }
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTypeFilter(t.id)}
                      className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        typeFilter === t.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((v) => !v)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    showAdvancedFilters || activeFiltersCount > 0
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <SlidersHorizontal size={13} />
                  <span>Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md bg-blue-600 text-white text-[10px] font-black">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                <div className="inline-flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    title="Lista"
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      viewMode === 'list'
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <ListIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="Grade"
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Painel de Filtros Avançados Expansível */}
            {showAdvancedFilters && (
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Período de Envio
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateRangeFilter)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-100 cursor-pointer"
                  >
                    <option value="all">Qualquer data</option>
                    <option value="today">Hoje</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="year">Este ano</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Enviado por
                  </label>
                  <select
                    value={uploaderFilter}
                    onChange={(e) => setUploaderFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-100 cursor-pointer"
                  >
                    <option value="all">Todos os servidores</option>
                    {counts.uploaders.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Ordenação
                  </label>
                  <div className="relative">
                    <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-100 cursor-pointer"
                    >
                      <option value="newest">Mais recentes</option>
                      <option value="oldest">Mais antigos</option>
                      <option value="largest">Maior tamanho</option>
                      <option value="name">Nome (A–Z)</option>
                    </select>
                  </div>
                </div>

                {counts.allTags.length > 0 && (
                  <div className="sm:col-span-3 flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 inline-flex items-center gap-1 mr-1">
                      <Tag size={11} /> Etiquetas:
                    </span>
                    {counts.allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          tagFilter === tag
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {activeFiltersCount > 0 && (
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
                    >
                      Limpar todos os filtros ({activeFiltersCount})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra Contextual de Seleção em Lote */}
          {selectedIds.size > 0 && (
            <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-lg shadow-blue-600/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs font-black">
                <CheckSquare size={16} />
                <span>
                  {selectedIds.size} {selectedIds.size === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMoveTargets(selectedFiles)}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FolderInput size={13} />
                  <span>Mover para pasta</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkStar()}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Star size={13} />
                  <span>Favoritar</span>
                </button>
                <button
                  type="button"
                  disabled={bulkDeleting}
                  onClick={() => void handleBulkDelete()}
                  className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-colors"
                >
                  {bulkDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  <span>Excluir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1.5 rounded-xl hover:bg-white/15 cursor-pointer"
                  title="Limpar seleção"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Grade de Subpastas no Diretório Atual */}
          <DriveSubfoldersGrid
            visibleSubfolders={visibleSubfolders}
            allFolders={folders}
            byFolderId={counts.byFolderId}
            draggingFileId={draggingFileId}
            dropTargetKey={dropTargetKey}
            onSetDropTargetKey={setDropTargetKey}
            onDropOnFolder={handleDropOnFolder}
            onOpenFolder={(folderId) => setActiveFolderId(folderId)}
            onEditFolder={(folder) => {
              setEditingFolder(folder);
              setFolderModalOpen(true);
            }}
            onDeleteFolder={(folder) => setDeletingFolder(folder)}
          />

          {/* Lista ou Grade de Arquivos */}
          <DriveFilesList
            loading={loading}
            viewMode={viewMode}
            filteredFiles={filteredFiles}
            selectedIds={selectedIds}
            activeFiltersCount={activeFiltersCount}
            activeFolder={activeFolder}
            currentDestinationLabel={currentDestinationLabel}
            isConfigured={isConfigured}
            downloadingId={downloadingId}
            formatBytes={formatBytes}
            canPreviewInline={canPreviewInline}
            renderFileIcon={renderFileIcon}
            onToggleSelectAll={toggleSelectAllVisible}
            onToggleSelectFile={toggleSelectFile}
            onClearAllFilters={clearAllFilters}
            onTriggerUpload={() => fileInputRef.current?.click()}
            onDragStartFile={(id, e) => {
              setDraggingFileId(id);
              e.dataTransfer.setData('application/x-gestao360-file-id', id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEndFile={() => {
              setDraggingFileId(null);
              setDropTargetKey(null);
            }}
            onToggleStar={handleToggleStar}
            onOpenPreview={handleOpenPreview}
            onSelectTagFilter={(tag) => setTagFilter(tag)}
            onMoveSingle={(item) => setMoveTargets([item])}
            onEditFile={(item) => setEditingFile(item)}
            onDownload={handleDownload}
            onDeleteFile={(item) => setDeleteTarget(item)}
          />
        </section>
      </div>

      {/* Modais de Organização */}
      <FolderFormModal
        open={folderModalOpen}
        editingFolder={editingFolder}
        parentFolderName={editingFolder ? null : activeFolder?.name || null}
        saving={savingFolder}
        onClose={() => {
          setFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSubmit={handleSubmitFolder}
      />

      <MoveFilesModal
        open={moveTargets.length > 0}
        filesCount={moveTargets.length}
        singleFileName={moveTargets.length === 1 ? moveTargets[0].file_name : undefined}
        folders={folders}
        defaultCategories={DEFAULT_CATEGORIES}
        saving={movingFiles}
        onClose={() => setMoveTargets([])}
        onMove={(dest) => handleMoveFilesTo(moveTargets, dest)}
      />

      <EditFileModal
        file={editingFile}
        saving={savingFile}
        onClose={() => setEditingFile(null)}
        onSave={handleSaveFileEdit}
      />

      <DeleteFolderModal
        folder={deletingFolder}
        deleting={deletingFolderBusy}
        onClose={() => setDeletingFolder(null)}
        onConfirm={handleConfirmDeleteFolder}
      />

      {/* Modal de Pré-visualização e Exclusão */}
      <DrivePreviewModals
        previewItem={previewItem}
        previewUrl={previewUrl}
        previewLoading={previewLoading}
        deleteTarget={deleteTarget}
        deleting={deleting}
        formatBytes={formatBytes}
        getFileTypeCategory={getFileTypeCategory}
        renderFileIcon={renderFileIcon}
        onClosePreview={handleClosePreview}
        onDownload={handleDownload}
        onCloseDelete={() => setDeleteTarget(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};
