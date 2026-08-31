import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Upload, 
  Sparkles, 
  Building2, 
  Calendar, 
  Check, 
  Image as ImageIcon, 
  Eye, 
  FileText, 
  Layers, 
  Coins, 
  Tag, 
  Globe,
  Trash2,
  Plus
} from 'lucide-react';
import { MunicipalNews, NewsCategory, ProjectStatus, NewsStatus } from '../../types';
import { CATEGORY_META_LIST, POPULAR_BADGES, PROJECT_STATUS_META } from './types';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';

interface NewsEditorProps {
  initialNews?: MunicipalNews | null;
  onSave: (newsData: Partial<MunicipalNews>) => Promise<void>;
  onClose: () => void;
  currentUserName?: string;
  institutionId?: string;
}

// Compressão de imagem automática client-side
const compressImage = async (file: File): Promise<File> => {
  try {
    const bitmap = await createImageBitmap(file);
    const MAX_DIM = 1600;
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > height) {
      if (width > MAX_DIM) {
        height = Math.round(height * (MAX_DIM / width));
        width = MAX_DIM;
      }
    } else {
      if (height > MAX_DIM) {
        width = Math.round(width * (MAX_DIM / height));
        height = MAX_DIM;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(bitmap, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
            type: 'image/webp',
            lastModified: Date.now()
          });
          resolve(compressed);
        } else {
          resolve(file);
        }
      }, 'image/webp', 0.82);
    });
  } catch (err) {
    console.error('Falha na compressão, enviando original:', err);
    return file;
  }
};

export const NewsEditor: React.FC<NewsEditorProps> = ({
  initialNews,
  onSave,
  onClose,
  currentUserName,
  institutionId
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [title, setTitle] = useState(initialNews?.title || '');
  const [subtitle, setSubtitle] = useState(initialNews?.subtitle || '');
  const [content, setContent] = useState(initialNews?.content || '');
  const [category, setCategory] = useState<NewsCategory>(initialNews?.category || 'Obras & Infraestrutura');
  const [department, setDepartment] = useState(initialNews?.department || '');
  const [authorName, setAuthorName] = useState(initialNews?.author_name || currentUserName || 'Assessoria de Comunicação');
  const [publishedAt, setPublishedAt] = useState(
    initialNews?.published_at 
      ? new Date(initialNews.published_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<NewsStatus>(initialNews?.status || 'published');
  const [isFeatured, setIsFeatured] = useState(initialNews?.is_featured || false);
  const [badge, setBadge] = useState(initialNews?.badge || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initialNews?.cover_image_url || '');
  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialNews?.gallery_urls || []);
  const [galleryInput, setGalleryInput] = useState('');

  // Campos de Obra / Projeto
  const [isProject, setIsProject] = useState(!!initialNews?.project_status);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(initialNews?.project_status || 'Em Execução');
  const [projectBudget, setProjectBudget] = useState<string>(
    initialNews?.project_budget ? initialNews.project_budget.toString() : ''
  );

  // Upload da imagem de capa
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    showToast('Otimizando imagem de capa...', 'info');

    try {
      const compressed = await compressImage(file);
      const filename = `noticias/${Date.now()}-${compressed.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('certidoes')
        .upload(filename, compressed, { upsert: true });

      if (uploadError) {
        // Se houver restrição de storage, fazemos fallback para Data URL local
        const reader = new FileReader();
        reader.onloadend = () => {
          setCoverImageUrl(reader.result as string);
          showToast('Imagem carregada com sucesso!', 'success');
        };
        reader.readAsDataURL(compressed);
      } else {
        const { data: publicData } = supabase.storage.from('certidoes').getPublicUrl(filename);
        setCoverImageUrl(publicData.publicUrl);
        showToast('Foto de capa salva e otimizada!', 'success');
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      showToast('Erro ao processar imagem', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload da galeria de fotos
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    showToast(`Otimizando ${files.length} imagens...`, 'info');

    try {
      const newUrls = await Promise.all(files.map(async (file) => {
        const compressed = await compressImage(file);
        const filename = `noticias/galeria/${Date.now()}-${Math.random().toString(36).substring(7)}-${compressed.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('certidoes')
          .upload(filename, compressed, { upsert: true });

        if (uploadError) {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(compressed);
          });
        } else {
          const { data: publicData } = supabase.storage.from('certidoes').getPublicUrl(filename);
          return publicData.publicUrl;
        }
      }));

      setGalleryUrls(prev => [...prev, ...newUrls]);
      showToast('Imagens adicionadas à galeria!', 'success');
    } catch (err) {
      console.error('Erro no upload da galeria:', err);
      showToast('Erro ao processar imagens', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddGalleryUrl = () => {
    if (galleryInput.trim()) {
      setGalleryUrls([...galleryUrls, galleryInput.trim()]);
      setGalleryInput('');
    }
  };

  const handleRemoveGalleryUrl = (index: number) => {
    setGalleryUrls(galleryUrls.filter((_, i) => i !== index));
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('O título da notícia é obrigatório', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('O conteúdo da notícia é obrigatório', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<MunicipalNews> = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        content: content.trim(),
        category,
        department: department.trim() || undefined,
        author_name: authorName.trim() || 'Assessoria de Comunicação',
        published_at: new Date(publishedAt).toISOString(),
        status,
        is_featured: isFeatured,
        badge: badge.trim() || undefined,
        cover_image_url: coverImageUrl.trim() || undefined,
        gallery_urls: galleryUrls.length > 0 ? galleryUrls : undefined,
        institution_id: institutionId,
        project_status: isProject ? projectStatus : undefined,
        project_budget: isProject && projectBudget ? parseFloat(projectBudget) : undefined
      };

      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-[32px] shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                {initialNews ? 'Editar Notícia Municipal' : 'Nova Notícia / Ação Municipal'}
              </h3>
              <p className="text-xs text-neutral-500">
                Divulgue realizações, projetos, decretos e avisos para os cidadãos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Alternador Editor / Preview */}
            <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'editor'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Edição
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Pré-visualização
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {activeTab === 'editor' ? (
            <form id="news-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Título e Subtítulo */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Título Principal da Notícia *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prefeitura entrega nova creche municipal com capacidade para 200 crianças"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Subtítulo / Resumo (Lead da Notícia)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Espaço climatizado e moderno conta com berçário, lactário e parque infantil inclusivo."
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Grid: Categoria, Secretaria e Autor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Categoria Temática *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NewsCategory)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.keys(CATEGORY_META_LIST).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Secretaria / Órgão Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Secretaria de Obras"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Data da Publicação
                  </label>
                  <input
                    type="date"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Foto de Capa */}
              <div className="p-5 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-200/80 dark:border-neutral-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-emerald-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      Foto de Capa Principal
                    </span>
                  </div>
                  {coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl('')}
                      className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Remover imagem
                    </button>
                  )}
                </div>

                {coverImageUrl ? (
                  <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
                    <img src={coverImageUrl} alt="Capa" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <label className="flex-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl hover:border-emerald-500 cursor-pointer bg-white dark:bg-neutral-900/60 transition-colors">
                      <Upload size={24} className="text-neutral-400 mb-2" />
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        {isUploading ? 'Otimizando foto...' : 'Carregar foto do computador/celular'}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-1">
                        JPG, PNG ou WebP (compressão automática inclusa)
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleCoverUpload} 
                        disabled={isUploading}
                        className="hidden" 
                      />
                    </label>

                    <div className="text-xs text-neutral-400 font-bold">OU</div>

                    <div className="flex-1 w-full">
                      <input
                        type="url"
                        placeholder="Colar link de imagem da web (URL)..."
                        value={coverImageUrl}
                        onChange={(e) => setCoverImageUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Galeria de Fotos */}
              <div className="p-5 bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl border border-neutral-200/80 dark:border-neutral-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-emerald-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      Galeria de Fotos Adicionais
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <label className="flex-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl hover:border-emerald-500 cursor-pointer bg-white dark:bg-neutral-900/60 transition-colors">
                    <Upload size={24} className="text-neutral-400 mb-2" />
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 text-center">
                      {isUploading ? 'Otimizando fotos...' : 'Carregar fotos do computador/celular'}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      onChange={handleGalleryUpload} 
                      disabled={isUploading}
                      className="hidden" 
                    />
                  </label>

                  <div className="text-xs text-neutral-400 font-bold">OU</div>

                  <div className="flex-1 w-full flex gap-2">
                    <input
                      type="url"
                      placeholder="Colar link de imagem (URL)..."
                      value={galleryInput}
                      onChange={(e) => setGalleryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddGalleryUrl();
                        }
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddGalleryUrl}
                      className="px-4 py-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-colors shrink-0 flex items-center justify-center"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {galleryUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {galleryUrls.map((url, idx) => (
                      <div key={idx} className="relative h-24 rounded-xl overflow-hidden group border border-neutral-200 dark:border-neutral-700">
                        <img src={url} alt={`Galeria ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryUrl(idx)}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção Especial: É uma Obra / Projeto Municipal? */}
              <div className="p-5 bg-gradient-to-r from-emerald-50/50 to-sky-50/50 dark:from-emerald-950/20 dark:to-sky-950/20 rounded-3xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500 text-white rounded-xl">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                        Vincular a Obra ou Projeto da Gestão
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Ative para exibir status de evolução e valor investido à população.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isProject} 
                      onChange={(e) => setIsProject(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                </div>

                {isProject && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40"
                  >
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                        Status do Projeto
                      </label>
                      <select
                        value={projectStatus}
                        onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Planejamento">Em Planejamento</option>
                        <option value="Em Execução">Em Execução / Andamento</option>
                        <option value="Concluído">Obra / Projeto Entregue</option>
                        <option value="Contínuo">Programa Permanente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                        Investimento Estimado (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 1500000.00"
                        value={projectBudget}
                        onChange={(e) => setProjectBudget(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Conteúdo Completo da Matéria */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  Conteúdo da Matéria / Notícia *
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="Escreva aqui o texto completo da notícia. Você pode separar os parágrafos com quebras de linha normais."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Badges e Destaques */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Selo de Destaque (Badge)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-featured"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <label htmlFor="is-featured" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                      Destacar no Topo da Página Principal
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_BADGES.map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setBadge(badge === b ? '' : b)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        badge === b
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status de Publicação */}
              <div className="flex items-center gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
                  Status de Publicação:
                </span>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={status === 'published'}
                    onChange={() => setStatus('published')}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Publicar Imediatamente
                  </span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Salvar como Rascunho
                  </span>
                </label>
              </div>

            </form>
          ) : (
            /* Live Preview */
            <div className="space-y-6 p-4 bg-neutral-50 dark:bg-neutral-950 rounded-3xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                <Eye size={14} />
                Visualização de como o cidadão verá no portal
              </div>

              {coverImageUrl && (
                <div className="h-64 w-full rounded-2xl overflow-hidden bg-neutral-200">
                  <img src={coverImageUrl} alt={title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {badge && (
                    <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-black rounded-full">
                      {badge}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-neutral-200 dark:bg-neutral-800 text-xs font-bold rounded-full">
                    {category}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white leading-tight">
                  {title || 'Título da notícia aparecerá aqui...'}
                </h1>

                {subtitle && (
                  <p className="text-base text-neutral-600 dark:text-neutral-400 italic">
                    {subtitle}
                  </p>
                )}

                <div className="pt-4 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                  {content || 'Conteúdo da notícia...'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            form="news-form"
            disabled={isSaving}
            className="px-7 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <span>Salvando...</span>
            ) : (
              <>
                <Check size={16} />
                <span>{initialNews ? 'Salvar Alterações' : 'Publicar Notícia'}</span>
              </>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  );
};
