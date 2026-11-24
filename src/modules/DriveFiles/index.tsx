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
  Database,
  ArrowUpDown,
  FileCheck2,
  XCircle
} from 'lucide-react';
import { AdminUser, Institution } from '../../types';
import { showToast } from '../../components/ui/Toast';
import {
  DriveAccountInfo,
  DriveFileRecord,
  DriveQuotaInfo,
  MAX_DIRECT_UPLOAD_BYTES,
  MAX_DIRECT_UPLOAD_MB,
  deleteDriveFile,
  downloadDriveFile,
  fetchDriveFilePreviewUrl,
  listDriveFiles,
  uploadDriveFile
} from '../../lib/api/driveFiles';

interface DriveFilesModuleProps {
  currentUser?: AdminUser | null;
  currentInstitution?: Institution | null;
}

type ViewMode = 'list' | 'grid';
type SortOption = 'newest' | 'oldest' | 'largest' | 'name';
type FileTypeFilter = 'all' | 'pdf' | 'image' | 'sheet' | 'doc';

interface UploadQueueItem {
  id: string;
  file: File;
  category: string;
  description: string;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
}

const DRIVE_CATEGORIES = [
  'Todas',
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
  const [quota, setQuota] = useState<DriveQuotaInfo | null>(null);
  const [driveAccount, setDriveAccount] = useState<DriveAccountInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [dbTableMissing, setDbTableMissing] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');

  const [uploadCategory, setUploadCategory] = useState('Geral');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DriveFileRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DriveFileRecord | null>(null);
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
      setDbError(res.dbError || null);
      setFiles(res.files);
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

  const enqueueAndUploadFiles = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    if (fileArray.length === 0) return;

    if (!isConfigured) {
      showToast('Configure as credenciais OAuth do Google Drive na Vercel antes de enviar.', 'error');
      return;
    }

    const activeCategory = uploadCategory;
    const activeDescription = uploadDescription.trim();

    const newItems: UploadQueueItem[] = fileArray.map((file, idx) => {
      const tooLarge = file.size > MAX_DIRECT_UPLOAD_BYTES;
      return {
        id: `${Date.now()}_${idx}_${file.name}`,
        file,
        category: activeCategory,
        description: activeDescription,
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
          description: item.description,
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
      showToast(
        successCount === 1
          ? 'Arquivo enviado ao Google Drive com sucesso!'
          : `${successCount} arquivos enviados ao Google Drive!`,
        'success'
      );
      void loadFiles();
    }
  };

  const handleOpenPreview = async (item: DriveFileRecord) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewItem(item);
    if (!canPreviewInline(item.mime_type, item.file_name)) {
      return;
    }
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
      if (previewItem?.id === deleteTarget.id) {
        handleClosePreview();
      }
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

  const stats = useMemo(() => {
    const totalBytes = files.reduce((acc, f) => acc + (Number(f.size_bytes) || 0), 0);
    const byCategory = new Map<string, { count: number; bytes: number }>();

    for (const f of files) {
      const cat = f.folder_category || 'Geral';
      const current = byCategory.get(cat) || { count: 0, bytes: 0 };
      current.count += 1;
      current.bytes += Number(f.size_bytes) || 0;
      byCategory.set(cat, current);
    }

    const sortedCategories = Array.from(byCategory.entries())
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => b.bytes - a.bytes || b.count - a.count);

    const latestFile = files.length > 0 ? files[0] : null;

    return {
      totalFiles: files.length,
      totalBytes,
      byCategory,
      sortedCategories,
      latestFile
    };
  }, [files]);

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

  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = files.filter((f) => {
      if (selectedCategory !== 'Todas' && f.folder_category !== selectedCategory) return false;
      if (typeFilter !== 'all' && getFileTypeCategory(f.mime_type, f.file_name) !== typeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        f.file_name.toLowerCase().includes(q) ||
        f.folder_category.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q) ||
        (f.uploaded_by_name || '').toLowerCase().includes(q)
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
  }, [files, selectedCategory, typeFilter, searchTerm, sortBy]);

  const renderFileIcon = (mime?: string | null, name?: string, size: number = 20) => {
    const t = getFileTypeCategory(mime, name);
    if (t === 'image') return <ImageIcon size={size} className="text-blue-500" />;
    if (t === 'sheet') return <FileSpreadsheet size={size} className="text-emerald-500" />;
    if (t === 'pdf') return <FileText size={size} className="text-rose-500" />;
    if (t === 'doc') return <FileText size={size} className="text-indigo-500" />;
    return <FileIcon size={size} className="text-neutral-500" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Cabeçalho Institucional */}
      <div className="bg-white dark:bg-neutral-900 p-6 sm:p-7 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
            <HardDrive size={26} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Banco de Arquivos
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck size={12} /> Multi-Tenant Isolado
              </span>
              {isConfigured && driveAccount?.email && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/80 dark:border-blue-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {driveAccount.email}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Repositório conectado ao Google Drive • Pasta institucional:{' '}
              <strong className="text-neutral-800 dark:text-neutral-200">{institutionName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => void loadFiles()}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
          <button
            type="button"
            disabled={isProcessingQueue || !isConfigured}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 transition-all"
          >
            <Upload size={14} />
            <span>Enviar Arquivos</span>
          </button>
        </div>
      </div>

      {/* Alertas de Diagnóstico (OAuth ou Tabela SQL) */}
      {!isConfigured && (
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-sm">
            <AlertTriangle size={18} />
            <span>Configuração OAuth pendente no servidor (Vercel)</span>
          </div>
          <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
            {configMessage ||
              'Defina as variáveis GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_DRIVE_REFRESH_TOKEN nas Environment Variables da Vercel para ativar o envio direto ao Google Drive.'}
          </p>
        </div>
      )}

      {isConfigured && (dbTableMissing || dbError) && (
        <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 space-y-2">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-black text-sm">
            <Database size={18} />
            <span>
              {dbTableMissing
                ? 'Tabela do Banco de Arquivos ainda não criada no Supabase'
                : 'Aviso ao consultar índice de arquivos no Supabase'}
            </span>
          </div>
          <p className="text-xs text-rose-900/90 dark:text-rose-200/90 leading-relaxed">
            {dbError}
          </p>
          {dbTableMissing && (
            <p className="text-[11px] font-mono bg-white/80 dark:bg-neutral-900/80 px-3 py-2 rounded-xl text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900">
              Execute no SQL Editor do Supabase: supabase/migrations/20261124010000_institutional_drive_files.sql
            </p>
          )}
        </div>
      )}

      {/* Painel de Monitoramento de Espaço e Arquivos (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                Armazenamento Google Drive
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-neutral-900 dark:text-white">
                  {quota ? formatBytes(quota.usageBytes) : '—'}
                </span>
                <span className="text-xs font-bold text-neutral-500">
                  de {quota && quota.limitBytes > 0 ? formatBytes(quota.limitBytes) : '5.00 TB'}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-black">
              {usagePercent.toFixed(1)}% usado
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
              <div
                className={`h-full ${quotaBarColor} rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(quota && quota.usageBytes > 0 ? 2 : 0, usagePercent)}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
              <span>
                Livre: <strong className="text-emerald-600 dark:text-emerald-400">{quota ? formatBytes(freeBytes) : '—'}</strong>
              </span>
              {quota?.usageInDriveTrashBytes !== undefined && quota.usageInDriveTrashBytes > 0 && (
                <span>
                  Lixeira: <strong className="text-amber-600 dark:text-amber-400">{formatBytes(quota.usageInDriveTrashBytes)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Nesta Instituição
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileCheck2 size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-neutral-900 dark:text-white">
              {stats.totalFiles}{' '}
              <span className="text-xs font-bold text-neutral-500">
                {stats.totalFiles === 1 ? 'arquivo' : 'arquivos'}
              </span>
            </div>
            <p className="text-xs font-semibold text-neutral-500 mt-1">
              Total ocupado:{' '}
              <strong className="text-neutral-800 dark:text-neutral-200">
                {formatBytes(stats.totalBytes)}
              </strong>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              Último Envio
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          {stats.latestFile ? (
            <div className="mt-2 min-w-0">
              <p className="text-xs font-black text-neutral-900 dark:text-white truncate" title={stats.latestFile.file_name}>
                {stats.latestFile.file_name}
              </p>
              <p className="text-[11px] font-semibold text-neutral-500 mt-1 truncate">
                {new Date(stats.latestFile.created_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}{' '}
                • {stats.latestFile.folder_category}
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-xs font-bold text-neutral-400">Nenhum envio registrado</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {stats.sortedCategories.length} pastas ativas
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Distribuição de Espaço por Pasta / Secretaria */}
      {stats.sortedCategories.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <Folder size={14} className="text-blue-500" />
              <span>Acompanhamento por Pasta / Secretaria</span>
            </h3>
            <span className="text-[11px] font-semibold text-neutral-400">
              Clique em uma pasta para filtrar
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {stats.sortedCategories.map((cat) => {
              const pct = stats.totalBytes > 0 ? Math.round((cat.bytes / stats.totalBytes) * 100) : 0;
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? 'Todas' : cat.name)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400/40'
                      : 'bg-neutral-50/70 dark:bg-neutral-800/40 border-neutral-200/70 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-100 truncate">
                      {cat.name}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-500 shrink-0">
                      {cat.count} {cat.count === 1 ? 'arq.' : 'arqs.'}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-neutral-500">
                    <span>{formatBytes(cat.bytes)}</span>
                    <span>{pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Área de Upload com Drag & Drop + Múltiplos Arquivos */}
      <div className="bg-white dark:bg-neutral-900 p-5 sm:p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Pasta / Secretaria de Destino
            </label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            >
              {DRIVE_CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-8">
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Descrição / Referência (Aplicada ao envio)
            </label>
            <input
              type="text"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Ex: Contrato 042/2026, Nota Fiscal nº 1280, Ofício Circular..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (isConfigured) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (isConfigured && e.dataTransfer.files?.length) {
              void enqueueAndUploadFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => {
            if (isConfigured && !isProcessingQueue) fileInputRef.current?.click();
          }}
          className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
            !isConfigured
              ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 opacity-60 cursor-not-allowed'
              : isDragging
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[1.005] cursor-copy'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 cursor-pointer'
          }`}
        >
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
          <div className="flex flex-col items-center gap-2">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {isProcessingQueue ? (
                <RefreshCw size={22} className="animate-spin" />
              ) : (
                <CloudUpload size={22} />
              )}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-neutral-800 dark:text-neutral-100">
                {isProcessingQueue
                  ? 'Enviando arquivos para o Google Drive...'
                  : 'Arraste e solte arquivos aqui, ou clique para selecionar'}
              </p>
              <p className="text-[11px] font-medium text-neutral-500 mt-0.5">
                Suporta envio múltiplo (PDF, imagens, planilhas, documentos) • Até {MAX_DIRECT_UPLOAD_MB} MB por arquivo • Pasta:{' '}
                <strong>{uploadCategory}</strong>
              </p>
            </div>
          </div>
        </div>

        {uploadQueue.length > 0 && (
          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500">
                Fila de Envios ({uploadQueue.length})
              </span>
              {!isProcessingQueue && (
                <button
                  type="button"
                  onClick={() => setUploadQueue([])}
                  className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
                >
                  Limpar fila
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.status === 'uploading' && (
                      <RefreshCw size={14} className="animate-spin text-blue-500 shrink-0" />
                    )}
                    {item.status === 'queued' && (
                      <Clock size={14} className="text-neutral-400 shrink-0" />
                    )}
                    {item.status === 'done' && (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    )}
                    {item.status === 'error' && (
                      <XCircle size={14} className="text-rose-500 shrink-0" />
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
                  <span className="text-[11px] font-bold text-neutral-400 shrink-0">
                    {formatBytes(item.file.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barra de Filtros, Busca, Ordenação e Alternador Grade/Lista */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {DRIVE_CATEGORIES.map((cat) => {
            const count =
              cat === 'Todas' ? stats.totalFiles : stats.byCategory.get(cat)?.count || 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all inline-flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xs'
                    : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                      selectedCategory === cat
                        ? 'bg-white/20 dark:bg-neutral-900/15'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, descrição, secretaria ou servidor..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
            <div className="inline-flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0.5 text-[11px] font-bold">
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
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative inline-flex items-center">
              <ArrowUpDown size={13} className="absolute left-3 text-neutral-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="pl-8 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-bold text-neutral-700 dark:text-neutral-200 focus:outline-none cursor-pointer"
              >
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="largest">Maior tamanho</option>
                <option value="name">Nome (A–Z)</option>
              </select>
            </div>

            <div className="inline-flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="Visualização em lista"
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
                title="Visualização em grade"
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
      </div>

      {/* Lista ou Grade de Arquivos */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 animate-pulse"
              />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
              <FolderOpen size={30} />
            </div>
            <div>
              <p className="text-sm font-black text-neutral-700 dark:text-neutral-200">
                {files.length === 0
                  ? 'Seu Banco de Arquivos ainda está vazio'
                  : 'Nenhum arquivo encontrado com os filtros atuais'}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {files.length === 0
                  ? 'Arraste documentos para a área acima ou clique no botão abaixo para enviar ao Google Drive.'
                  : 'Tente limpar a busca ou selecionar outra pasta/tipo de arquivo.'}
              </p>
            </div>
            {files.length === 0 && isConfigured && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
              >
                <Upload size={14} />
                <span>Enviar Primeiro Arquivo</span>
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredFiles.map((item) => {
              const previewable = canPreviewInline(item.mime_type, item.file_name);
              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                      {renderFileIcon(item.mime_type, item.file_name, 20)}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => void handleOpenPreview(item)}
                        className="text-left text-xs sm:text-sm font-black text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block max-w-full cursor-pointer transition-colors"
                      >
                        {item.file_name}
                      </button>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold">
                          {item.folder_category}
                        </span>
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
                        <p className="text-[11px] text-neutral-400 mt-1 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleOpenPreview(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      title={previewable ? 'Visualizar arquivo' : 'Ver detalhes'}
                    >
                      <Eye size={13} />
                      <span className="hidden md:inline">{previewable ? 'Visualizar' : 'Detalhes'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={downloadingId === item.id}
                      onClick={() => void handleDownload(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Baixar arquivo"
                    >
                      {downloadingId === item.id ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Download size={13} />
                      )}
                      <span>Baixar</span>
                    </button>
                    {item.web_view_link && (
                      <a
                        href={item.web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                        title="Abrir no Google Drive"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
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
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-11 h-11 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-700 flex items-center justify-center shrink-0">
                      {renderFileIcon(item.mime_type, item.file_name, 22)}
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black">
                      {item.folder_category}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => void handleOpenPreview(item)}
                      className="text-left text-xs font-black text-neutral-900 dark:text-white hover:text-blue-600 truncate block w-full cursor-pointer"
                      title={item.file_name}
                    >
                      {item.file_name}
                    </button>
                    {item.description && (
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 mt-2">
                      <span>{formatBytes(item.size_bytes)}</span>
                      <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-neutral-200/60 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => void handleOpenPreview(item)}
                    className="flex-1 py-1.5 rounded-xl bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>Abrir</span>
                  </button>
                  <button
                    type="button"
                    disabled={downloadingId === item.id}
                    onClick={() => void handleDownload(item)}
                    className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Download size={12} />
                    <span>Baixar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Pré-visualização / Detalhes do Arquivo */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={handleClosePreview}
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
                onClick={handleClosePreview}
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
                {previewItem.description ? `Obs: ${previewItem.description}` : `Registrado em ${new Date(previewItem.created_at).toLocaleString('pt-BR')}`}
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
                  onClick={() => void handleDownload(previewItem)}
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

      {/* Modal de Confirmação de Exclusão */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
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
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting && <RefreshCw size={13} className="animate-spin" />}
                <span>{deleting ? 'Excluindo...' : 'Mover para Lixeira'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
