import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Upload,
  FolderHeart,
  Search,
  Check,
  X,
  Trash2,
  ClipboardPaste,
  Loader2,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  EDU_DEFAULT_IMAGES,
  EduImageAsset,
  SUBJECT_PRESETS,
} from '../data/eduImageBank';

export interface CustomEduImage {
  id: string;
  title: string;
  subject: string;
  category: string;
  url: string;
  storagePath?: string;
  createdAt: string;
}

/**
 * Comprime qualquer imagem para WebP leve (máx. 1024px mantendo proporção)
 * Ideal para atividades escolares rápidas em celulares e computadores.
 */
export async function compressEduImageToWebP(
  file: File,
  maxWidth = 1024,
  maxHeight = 768,
  quality = 0.84
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao inicializar compressor de imagem'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('Falha ao converter imagem para WebP'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Arquivo de imagem inválido'));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

function getLocalStorageKey(institutionId?: string | null) {
  return `@gestao360:edu_media_${institutionId || 'default'}`;
}

export async function loadCustomEduImages(
  institutionId?: string | null
): Promise<CustomEduImage[]> {
  const localKey = getLocalStorageKey(institutionId);
  let localItems: CustomEduImage[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) localItems = JSON.parse(raw);
  } catch {
    localItems = [];
  }

  try {
    let query = supabase
      .from('edu_media_library')
      .select('id, title, subject, category, image_url, storage_path, created_at')
      .order('created_at', { ascending: false })
      .limit(60);

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query;
    if (!error && data) {
      const remoteItems: CustomEduImage[] = data.map((row: any) => ({
        id: String(row.id),
        title: row.title || 'Imagem da Escola',
        subject: row.subject || 'Geral',
        category: row.category || 'atividade',
        url: row.image_url,
        storagePath: row.storage_path || undefined,
        createdAt: row.created_at || new Date().toISOString(),
      }));
      // Mescla itens remotos com eventuais itens salvos localmente sem duplicar URL
      const seen = new Set(remoteItems.map((i) => i.url));
      const merged = [
        ...remoteItems,
        ...localItems.filter((l) => !seen.has(l.url)),
      ];
      localStorage.setItem(localKey, JSON.stringify(merged.slice(0, 60)));
      return merged;
    }
  } catch {
    // Tabela edu_media_library ainda não criada: usa acervo local normalmente
  }

  return localItems;
}

export async function uploadCustomEduImage(params: {
  file: File;
  title?: string;
  subject?: string;
  category?: 'capa' | 'atividade';
  institutionId?: string | null;
}): Promise<CustomEduImage> {
  const { blob, dataUrl } = await compressEduImageToWebP(params.file);
  const cleanTitle =
    params.title?.trim() ||
    params.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') ||
    'Imagem Personalizada';
  const subject = params.subject || 'Geral';
  const category = params.category || 'atividade';
  const instFolder = params.institutionId || 'rede-municipal';
  const storagePath = `edu-assets/${instFolder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.webp`;

  let finalUrl = dataUrl;
  let savedStoragePath: string | undefined;

  // Tenta enviar ao Supabase Storage (bucket certidoes já configurado no projeto)
  try {
    const { error: upErr } = await supabase.storage
      .from('certidoes')
      .upload(storagePath, blob, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (!upErr) {
      const { data: pub } = supabase.storage
        .from('certidoes')
        .getPublicUrl(storagePath);
      if (pub?.publicUrl) {
        finalUrl = pub.publicUrl;
        savedStoragePath = storagePath;
      }
    }
  } catch {
    // Fallback automático para dataUrl comprimido em WebP
  }

  let newId = `local-${Date.now()}`;
  try {
    const { data: inserted, error: dbErr } = await supabase
      .from('edu_media_library')
      .insert([
        {
          institution_id: params.institutionId || null,
          title: cleanTitle,
          subject,
          category,
          image_url: finalUrl,
          storage_path: savedStoragePath || null,
        },
      ])
      .select('id')
      .single();

    if (!dbErr && inserted?.id) {
      newId = String(inserted.id);
    }
  } catch {
    // Ignora caso a migração SQL v5 ainda não tenha sido executada
  }

  const created: CustomEduImage = {
    id: newId,
    title: cleanTitle,
    subject,
    category,
    url: finalUrl,
    storagePath: savedStoragePath,
    createdAt: new Date().toISOString(),
  };

  const localKey = getLocalStorageKey(params.institutionId);
  try {
    const prevRaw = localStorage.getItem(localKey);
    const prev: CustomEduImage[] = prevRaw ? JSON.parse(prevRaw) : [];
    const updated = [created, ...prev.filter((i) => i.url !== created.url)].slice(
      0,
      60
    );
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch {
    // Sem espaço no localStorage
  }

  return created;
}

export async function deleteCustomEduImage(
  image: CustomEduImage,
  institutionId?: string | null
): Promise<void> {
  const localKey = getLocalStorageKey(institutionId);
  try {
    const prevRaw = localStorage.getItem(localKey);
    if (prevRaw) {
      const prev: CustomEduImage[] = JSON.parse(prevRaw);
      localStorage.setItem(
        localKey,
        JSON.stringify(prev.filter((i) => i.id !== image.id && i.url !== image.url))
      );
    }
  } catch {}

  if (!image.id.startsWith('local-')) {
    try {
      await supabase.from('edu_media_library').delete().eq('id', image.id);
    } catch {}
  }

  if (image.storagePath) {
    try {
      await supabase.storage.from('certidoes').remove([image.storagePath]);
    } catch {}
  }
}

const SUBJECT_FILTERS = [
  'Todas',
  'Matemática',
  'Português',
  'Ciências',
  'História',
  'Geografia',
  'Artes',
  'Geral',
] as const;

interface PickerCoreProps {
  selectedUrl?: string;
  onSelect: (url: string, assetTitle?: string) => void;
  defaultSubject?: string;
  institutionId?: string | null;
  mode?: 'modal' | 'panel';
  onClose?: () => void;
}

export const EducationImageBankCore: React.FC<PickerCoreProps> = ({
  selectedUrl,
  onSelect,
  defaultSubject = 'Todas',
  institutionId,
  mode = 'modal',
  onClose,
}) => {
  const normalizedInitialSubject = SUBJECT_FILTERS.includes(defaultSubject as any)
    ? defaultSubject
    : defaultSubject === 'Língua Portuguesa'
    ? 'Português'
    : 'Todas';

  const [activeTab, setActiveTab] = useState<'ai-bank' | 'upload' | 'my-library'>('ai-bank');
  const [subjectFilter, setSubjectFilter] = useState<string>(normalizedInitialSubject);
  const [searchTerm, setSearchTerm] = useState('');
  const [customImages, setCustomImages] = useState<CustomEduImage[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);

  // Estado de Upload
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState<string>(
    normalizedInitialSubject === 'Todas' ? 'Matemática' : normalizedInitialSubject
  );
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshCustom = useCallback(async () => {
    setIsLoadingCustom(true);
    const list = await loadCustomEduImages(institutionId);
    setCustomImages(list);
    setIsLoadingCustom(false);
  }, [institutionId]);

  useEffect(() => {
    refreshCustom();
  }, [refreshCustom]);

  const handleFileProcess = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setFeedbackMsg('Selecione um arquivo de imagem válido (PNG, JPG ou WebP).');
        return;
      }
      setIsUploading(true);
      setFeedbackMsg(null);
      try {
        const saved = await uploadCustomEduImage({
          file,
          title: uploadTitle,
          subject: uploadSubject,
          institutionId,
        });
        setUploadTitle('');
        await refreshCustom();
        onSelect(saved.url, saved.title);
        if (mode === 'modal' && onClose) {
          onClose();
        } else {
          setActiveTab('my-library');
          setFeedbackMsg('Imagem otimizada e adicionada ao acervo da escola!');
        }
      } catch (err: any) {
        setFeedbackMsg(err?.message || 'Não foi possível processar a imagem.');
      } finally {
        setIsUploading(false);
      }
    },
    [uploadTitle, uploadSubject, institutionId, refreshCustom, onSelect, mode, onClose]
  );

  // Suporte a Ctrl+V (colar print de questão/livro direto da área de transferência)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== 'upload') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            e.preventDefault();
            handleFileProcess(pastedFile);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab, handleFileProcess]);

  const filteredDefaultImages = EDU_DEFAULT_IMAGES.filter((asset: EduImageAsset) => {
    const matchesSubject =
      subjectFilter === 'Todas' || asset.subject === subjectFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      asset.title.toLowerCase().includes(q) ||
      asset.subject.toLowerCase().includes(q) ||
      asset.tags.some((t) => t.toLowerCase().includes(q));
    return matchesSubject && matchesSearch;
  });

  const filteredCustomImages = customImages.filter((img) => {
    const matchesSubject =
      subjectFilter === 'Todas' || img.subject === subjectFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      img.title.toLowerCase().includes(q) ||
      img.subject.toLowerCase().includes(q);
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/70 via-white to-sky-50/70 dark:from-neutral-900 dark:via-neutral-900 dark:to-indigo-950/30">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white leading-tight">
              Banco de Imagens Pedagógicas
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Escolha ilustrações padrões geradas por IA para cada matéria ou envie suas próprias figuras
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors self-end sm:self-auto cursor-pointer"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Abas Principais */}
      <div className="px-6 pt-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-2 bg-neutral-50/60 dark:bg-neutral-950/40">
        <button
          type="button"
          onClick={() => setActiveTab('ai-bank')}
          className={`px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'ai-bank'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-neutral-900 shadow-sm'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Sparkles size={16} />
          Imagens Padrões & IA ({EDU_DEFAULT_IMAGES.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-neutral-900 shadow-sm'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Upload size={16} />
          Enviar ou Colar Nova Imagem
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-library')}
          className={`px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'my-library'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-neutral-900 shadow-sm'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <FolderHeart size={16} />
          Acervo da Escola ({customImages.length})
        </button>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Conteúdo das Abas */}
      <div className="p-6 flex-1 overflow-y-auto space-y-5">
        {(activeTab === 'ai-bank' || activeTab === 'my-library') && (
          <>
            {/* Barra de Busca + Filtro de Matérias */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por tema (ex: fração, pizza, planeta, planta, relógio...)"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_FILTERS.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSubjectFilter(subj)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      subjectFilter === subj
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'ai-bank' ? (
              filteredDefaultImages.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                  <ImageIcon size={36} className="mx-auto text-neutral-400 mb-2" />
                  <p className="font-bold text-neutral-700 dark:text-neutral-300 text-sm">
                    Nenhuma ilustração encontrada para esse filtro.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubjectFilter('Todas');
                      setSearchTerm('');
                    }}
                    className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredDefaultImages.map((asset) => {
                    const isSelected = selectedUrl === asset.url;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          onSelect(asset.url, asset.title);
                          if (mode === 'modal' && onClose) onClose();
                        }}
                        className={`group text-left rounded-2xl overflow-hidden border-2 transition-all flex flex-col bg-white dark:bg-neutral-800/80 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 ring-4 ring-indigo-500/20'
                            : 'border-neutral-200/80 dark:border-neutral-700/80 hover:border-indigo-400'
                        }`}
                      >
                        <div className="aspect-[16/10] w-full bg-neutral-100 dark:bg-neutral-900 relative overflow-hidden">
                          <img
                            src={asset.url}
                            alt={asset.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2 flex gap-1">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-black/65 text-white backdrop-blur-sm">
                              {asset.subject}
                            </span>
                            {asset.aiGenerated && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-indigo-600/90 text-white backdrop-blur-sm flex items-center gap-0.5">
                                <Sparkles size={10} /> IA
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                              <Check size={14} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <p className="font-bold text-xs text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                            {asset.title}
                          </p>
                          <span className="mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                            {mode === 'panel' ? 'Selecionar / Copiar' : 'Usar esta imagem →'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : isLoadingCustom ? (
              <div className="flex items-center justify-center py-14 text-neutral-400 gap-2">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-bold">Carregando acervo da escola...</span>
              </div>
            ) : filteredCustomImages.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 space-y-3">
                <FolderHeart size={40} className="mx-auto text-neutral-400" />
                <div>
                  <h4 className="font-bold text-neutral-800 dark:text-neutral-200">
                    Nenhuma imagem própria enviada ainda
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
                    Envie fotos de quadros, mapas locais, tirinhas ou figuras de atividades para reutilizar sempre que precisar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} /> Enviar Primeira Imagem
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredCustomImages.map((img) => {
                  const isSelected = selectedUrl === img.url;
                  return (
                    <div
                      key={img.id}
                      className={`group rounded-2xl overflow-hidden border-2 transition-all flex flex-col bg-white dark:bg-neutral-800/80 ${
                        isSelected
                          ? 'border-indigo-600 ring-4 ring-indigo-500/20'
                          : 'border-neutral-200/80 dark:border-neutral-700/80 hover:border-indigo-400'
                      }`}
                    >
                      <div
                        onClick={() => {
                          onSelect(img.url, img.title);
                          if (mode === 'modal' && onClose) onClose();
                        }}
                        className="aspect-[16/10] w-full bg-neutral-100 dark:bg-neutral-900 relative overflow-hidden cursor-pointer"
                      >
                        <img
                          src={img.url}
                          alt={img.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-black/65 text-white">
                          {img.subject}
                        </span>
                      </div>
                      <div className="p-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(img.url, img.title);
                            if (mode === 'modal' && onClose) onClose();
                          }}
                          className="text-left flex-1 min-w-0 cursor-pointer"
                        >
                          <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                            {img.title}
                          </p>
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            Usar imagem →
                          </span>
                        </button>
                        <button
                          type="button"
                          title="Excluir do acervo"
                          onClick={async () => {
                            await deleteCustomEduImage(img, institutionId);
                            refreshCustom();
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Aba de Upload / Colar Print */}
        {activeTab === 'upload' && (
          <div className="max-w-xl mx-auto space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">
                  Nome da Figura (Opcional)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ex: Mapa do Município / Tirinha Mafalda"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">
                  Matéria / Categoria
                </label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white outline-none focus:border-indigo-500"
                >
                  {SUBJECT_FILTERS.filter((s) => s !== 'Todas').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileProcess(file);
                e.target.value = '';
              }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileProcess(file);
              }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 bg-neutral-50/70 dark:bg-neutral-800/40'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 size={36} className="animate-spin text-indigo-600" />
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">
                    Otimizando imagem em WebP leve e salvando...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Upload size={30} />
                  </div>
                  <div>
                    <p className="font-black text-base text-neutral-900 dark:text-white">
                      Clique para escolher do computador/celular ou arraste aqui
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Aceita JPG, PNG ou WebP • Compressão automática para carregar rápido no celular dos alunos
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
                    <ClipboardPaste size={14} />
                    Dica rápida: Copie qualquer figura/print e aperte Ctrl + V nesta tela!
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface EducationImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUrl?: string;
  onSelect: (url: string, title?: string) => void;
  defaultSubject?: string;
  institutionId?: string | null;
}

export const EducationImagePickerModal: React.FC<EducationImagePickerModalProps> = ({
  isOpen,
  onClose,
  selectedUrl,
  onSelect,
  defaultSubject,
  institutionId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] shadow-2xl border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden">
        <EducationImageBankCore
          selectedUrl={selectedUrl}
          onSelect={onSelect}
          defaultSubject={defaultSubject}
          institutionId={institutionId}
          mode="modal"
          onClose={onClose}
        />
      </div>
    </div>
  );
};

interface EducationImageFieldProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  subject?: string;
  institutionId?: string | null;
  helperText?: string;
  compact?: boolean;
}

/**
 * Campo pronto de seleção de imagem para Capas de Trilhas, Leituras e Questões de Quiz.
 * Permite abrir o Banco de Imagens IA, usar imagem padrão da matéria em 1 clique ou remover.
 */
export const EducationImageField: React.FC<EducationImageFieldProps> = ({
  label = 'Ilustração da Atividade (Opcional)',
  value,
  onChange,
  subject = 'Todas',
  institutionId,
  helperText = 'Use uma ilustração gerada por IA da matéria ou envie sua própria figura',
  compact = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const presetCover = SUBJECT_PRESETS[subject]?.defaultCover;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon size={14} className="text-indigo-500" />
          {label}
        </label>

        <div className="flex items-center gap-2">
          {presetCover && value !== presetCover && (
            <button
              type="button"
              onClick={() => onChange(presetCover)}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles size={12} /> Usar Padrão de {subject}
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={11} /> Remover imagem
            </button>
          )}
        </div>
      </div>

      {value ? (
        <div
          className={`relative rounded-2xl overflow-hidden border-2 border-indigo-500/30 bg-neutral-100 dark:bg-neutral-900 group ${
            compact ? 'h-36' : 'h-44'
          }`}
        >
          <img
            src={value}
            alt="Ilustração selecionada"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent flex items-end justify-between p-3">
            <span className="text-white text-xs font-bold truncate max-w-[60%]">
              Imagem vinculada à atividade
            </span>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white text-neutral-900 hover:bg-indigo-50 font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Trocar Imagem
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`w-full border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl bg-white/70 dark:bg-neutral-900/60 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-all flex items-center justify-between px-4 ${
            compact ? 'py-3' : 'py-4'
          } text-left group cursor-pointer`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                Escolher do Banco de Imagens IA ou Enviar Figura
              </p>
              <p className="text-xs text-neutral-500">{helperText}</p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shrink-0 hidden sm:inline-block">
            Abrir Galeria
          </span>
        </button>
      )}

      <EducationImagePickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedUrl={value}
        onSelect={(url) => onChange(url)}
        defaultSubject={subject}
        institutionId={institutionId}
      />
    </div>
  );
};

