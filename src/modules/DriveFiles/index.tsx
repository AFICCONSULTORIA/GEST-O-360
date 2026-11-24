import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  File as FileIcon
} from 'lucide-react';
import { AdminUser, Institution } from '../../types';
import { showToast } from '../../components/ui/Toast';
import {
  DriveFileRecord,
  DriveQuotaInfo,
  deleteDriveFile,
  downloadDriveFile,
  listDriveFiles,
  uploadDriveFile
} from '../../lib/api/driveFiles';

interface DriveFilesModuleProps {
  currentUser?: AdminUser | null;
  currentInstitution?: Institution | null;
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
  if (!bytes || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : 1)} ${units[i]}`;
}

export const DriveFilesModule: React.FC<DriveFilesModuleProps> = ({
  currentUser,
  currentInstitution
}) => {
  const institutionId = currentInstitution?.id || currentUser?.institution_id || 'inst_1';
  const institutionName = currentInstitution?.name || 'Prefeitura Municipal';

  const [files, setFiles] = useState<DriveFileRecord[]>([]);
  const [quota, setQuota] = useState<DriveQuotaInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [uploadCategory, setUploadCategory] = useState('Geral');
  const [uploadDescription, setUploadDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await listDriveFiles({
        institutionId,
        category: selectedCategory,
        search: searchTerm
      });
      setIsConfigured(res.configured);
      setConfigMessage(res.message || null);
      setQuota(res.quota || null);
      setFiles(res.files);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao consultar Banco de Arquivos.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFiles();
  }, [institutionId, selectedCategory]);

  const handleUploadSelectedFile = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadDriveFile({
        file,
        institutionId,
        institutionName,
        category: uploadCategory,
        description: uploadDescription,
        uploadedByName: currentUser?.name || 'Servidor Público'
      });
      setFiles((prev) => [uploaded, ...prev]);
      setUploadDescription('');
      showToast(`Arquivo "${uploaded.file_name}" salvo no Google Drive!`, 'success');
      void loadFiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar arquivo.';
      showToast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (item: DriveFileRecord) => {
    if (!window.confirm(`Deseja mover "${item.file_name}" para a lixeira do Google Drive?`)) return;
    try {
      await deleteDriveFile(item.id, item.drive_file_id);
      setFiles((prev) => prev.filter((f) => f.id !== item.id));
      showToast('Arquivo removido do Banco de Arquivos.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir arquivo.';
      showToast(msg, 'error');
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return files;
    const q = searchTerm.toLowerCase();
    return files.filter(
      (f) =>
        f.file_name.toLowerCase().includes(q) ||
        f.folder_category.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q)
    );
  }, [files, searchTerm]);

  const usagePercent = useMemo(() => {
    if (!quota || !quota.limitBytes) return 0;
    return Math.min(100, Number(((quota.usageBytes / quota.limitBytes) * 100).toFixed(2)));
  }, [quota]);

  const renderFileIcon = (mime?: string | null) => {
    const m = (mime || '').toLowerCase();
    if (m.includes('image')) return <ImageIcon size={18} className="text-blue-500" />;
    if (m.includes('sheet') || m.includes('excel') || m.includes('csv')) {
      return <FileSpreadsheet size={18} className="text-emerald-500" />;
    }
    if (m.includes('pdf') || m.includes('word') || m.includes('document')) {
      return <FileText size={18} className="text-rose-500" />;
    }
    return <FileIcon size={18} className="text-neutral-500" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <HardDrive size={28} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                Banco de Arquivos (Google Drive)
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck size={12} /> Multi-Tenant Isolado
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Repositório institucional integrado ao Google Drive de 5 TB • Pasta: <strong>{institutionName}</strong>
            </p>
          </div>
        </div>

        {quota && quota.limitBytes > 0 && (
          <div className="w-full lg:w-72 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-between text-[11px] font-bold text-neutral-700 dark:text-neutral-200 mb-1.5">
              <span>Espaço no Google Drive</span>
              <span>
                {formatBytes(quota.usageBytes)} / {formatBytes(quota.limitBytes)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${Math.max(2, usagePercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Alerta caso OAuth ainda não configurado na Vercel */}
      {!isConfigured && (
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-sm">
            <AlertTriangle size={18} />
            <span>Configuração OAuth pendente no servidor (Vercel)</span>
          </div>
          <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
            {configMessage ||
              'Defina as variáveis GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_DRIVE_REFRESH_TOKEN nas Environment Variables da Vercel para ativar o envio direto ao seu Google Drive de 5 TB.'}
          </p>
        </div>
      )}

      {/* Barra de Upload */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-3">
          <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
            Pasta / Secretaria
          </label>
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
          >
            {DRIVE_CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
            Descrição / Referência (Opcional)
          </label>
          <input
            type="text"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            placeholder="Ex: Contrato 042/2026, Nota Fiscal, Ofício..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUploadSelectedFile(f);
            }}
          />
          <button
            type="button"
            disabled={uploading || !isConfigured}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 transition-all"
          >
            {uploading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
            <span>{uploading ? 'Enviando ao Drive...' : 'Enviar Arquivo'}</span>
          </button>

          <button
            type="button"
            onClick={() => void loadFiles()}
            title="Atualizar lista"
            className="p-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filtros & Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {DRIVE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                selectedCategory === cat
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xs'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72 shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar arquivo..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Lista de Arquivos */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-neutral-400">
            Carregando arquivos do Google Drive...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FolderOpen size={36} className="mx-auto text-neutral-300 dark:text-neutral-700" />
            <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
              Nenhum arquivo encontrado nesta pasta.
            </p>
            <p className="text-xs text-neutral-400">
              Envie documentos acima para armazená-los diretamente no Google Drive de 5 TB.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredFiles.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    {renderFileIcon(item.mime_type)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                      {item.file_name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold">
                        {item.folder_category}
                      </span>
                      <span>{formatBytes(item.size_bytes)}</span>
                      <span>• {item.uploaded_by_name}</span>
                      <span>• {new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.web_view_link && (
                    <a
                      href={item.web_view_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold inline-flex items-center gap-1"
                      title="Abrir no Google Drive"
                    >
                      <ExternalLink size={13} />
                      <span>Drive</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void downloadDriveFile(item.drive_file_id, item.file_name)}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    title="Baixar arquivo"
                  >
                    <Download size={13} />
                    <span>Baixar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                    title="Excluir arquivo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
