import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit2, 
  Trash2, 
  Sparkles, 
  ExternalLink, 
  Building2, 
  Calendar, 
  Clock, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  TrendingUp, 
  Star, 
  Layers, 
  Coins, 
  MessageCircle,
  Copy
} from 'lucide-react';
import { MunicipalNews, Institution, AdminUser, NewsCategory, NewsStatus } from '../../types';
import { CATEGORY_META_LIST, PROJECT_STATUS_META } from './types';
import { MOCK_MUNICIPAL_NEWS } from './mockNews';
import { NewsEditor } from './NewsEditor';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { WhatsNewBanner } from '../../components/ui/WhatsNewBanner';

interface NoticiasModuleProps {
  currentUser?: AdminUser | null;
  currentInstitution?: Institution | null;
}

export const NoticiasModule: React.FC<NoticiasModuleProps> = ({
  currentUser,
  currentInstitution
}) => {
  const [news, setNews] = useState<MunicipalNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Modais
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<MunicipalNews | null>(null);
  const [newsToDelete, setNewsToDelete] = useState<MunicipalNews | null>(null);

  // Carregar notícias
  useEffect(() => {
    fetchNews();
  }, [currentInstitution?.id]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('municipal_news')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentInstitution?.id) {
        query = query.eq('institution_id', currentInstitution.id);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        setNews(data as MunicipalNews[]);
      } else {
        const saved = localStorage.getItem('gestao360_municipal_news');
        if (saved) {
          setNews(JSON.parse(saved));
        } else {
          setNews(MOCK_MUNICIPAL_NEWS);
          localStorage.setItem('gestao360_municipal_news', JSON.stringify(MOCK_MUNICIPAL_NEWS));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar notícias:', err);
      setNews(MOCK_MUNICIPAL_NEWS);
    } finally {
      setLoading(false);
    }
  };

  // Salvar notícia (Criação ou Edição)
  const handleSaveNews = async (newsData: Partial<MunicipalNews>) => {
    try {
      if (editingNews) {
        // Atualização
        const updatedItem = {
          ...editingNews,
          ...newsData,
          updated_at: new Date().toISOString()
        } as MunicipalNews;

        const { error } = await supabase
          .from('municipal_news')
          .update({
            title: updatedItem.title,
            subtitle: updatedItem.subtitle,
            content: updatedItem.content,
            category: updatedItem.category,
            department: updatedItem.department,
            author_name: updatedItem.author_name,
            published_at: updatedItem.published_at,
            status: updatedItem.status,
            is_featured: updatedItem.is_featured,
            badge: updatedItem.badge,
            cover_image_url: updatedItem.cover_image_url,
            project_status: updatedItem.project_status,
            project_budget: updatedItem.project_budget,
            updated_at: updatedItem.updated_at
          })
          .eq('id', editingNews.id);

        if (error) {
          console.warn('Erro ao atualizar no Supabase, salvando localmente:', error);
        }

        const nextList = news.map(n => n.id === editingNews.id ? updatedItem : n);
        setNews(nextList);
        localStorage.setItem('gestao360_municipal_news', JSON.stringify(nextList));
        showToast('Notícia atualizada com sucesso!', 'success');
      } else {
        // Criação
        const newItem: MunicipalNews = {
          id: crypto.randomUUID(),
          title: newsData.title!,
          subtitle: newsData.subtitle,
          content: newsData.content!,
          category: newsData.category || 'Obras & Infraestrutura',
          department: newsData.department,
          author_name: newsData.author_name || currentUser?.name || 'Assessoria de Comunicação',
          published_at: newsData.published_at || new Date().toISOString(),
          status: newsData.status || 'published',
          is_featured: newsData.is_featured || false,
          badge: newsData.badge,
          cover_image_url: newsData.cover_image_url,
          project_status: newsData.project_status,
          project_budget: newsData.project_budget,
          institution_id: currentInstitution?.id,
          views_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('municipal_news')
          .insert({
            id: newItem.id,
            institution_id: newItem.institution_id,
            title: newItem.title,
            subtitle: newItem.subtitle,
            content: newItem.content,
            category: newItem.category,
            department: newItem.department,
            author_name: newItem.author_name,
            published_at: newItem.published_at,
            status: newItem.status,
            is_featured: newItem.is_featured,
            badge: newItem.badge,
            cover_image_url: newItem.cover_image_url,
            project_status: newItem.project_status,
            project_budget: newItem.project_budget,
            views_count: 0
          });

        if (error) {
          console.warn('Erro ao inserir no Supabase, salvando localmente:', error);
        }

        const nextList = [newItem, ...news];
        setNews(nextList);
        localStorage.setItem('gestao360_municipal_news', JSON.stringify(nextList));
        showToast('Notícia publicada com sucesso!', 'success');
      }

      setIsEditorOpen(false);
      setEditingNews(null);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar notícia', 'error');
    }
  };

  // Exclusão de notícia
  const handleDeleteNews = async (id: string) => {
    try {
      const { error } = await supabase.from('municipal_news').delete().eq('id', id);
      if (error) console.warn('Erro ao excluir no Supabase:', error);

      const nextList = news.filter(n => n.id !== id);
      setNews(nextList);
      localStorage.setItem('gestao360_municipal_news', JSON.stringify(nextList));
      showToast('Notícia excluída com sucesso!', 'success');
      setNewsToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir notícia', 'error');
    }
  };

  // Alternar Destaque
  const handleToggleFeatured = async (item: MunicipalNews) => {
    const nextState = !item.is_featured;
    const updated = { ...item, is_featured: nextState };
    
    // Se marcou como destaque, desmarca os outros para manter 1 principal
    const nextList = news.map(n => {
      if (n.id === item.id) return updated;
      if (nextState && n.is_featured) return { ...n, is_featured: false };
      return n;
    });

    setNews(nextList);
    localStorage.setItem('gestao360_municipal_news', JSON.stringify(nextList));

    await supabase
      .from('municipal_news')
      .update({ is_featured: nextState })
      .eq('id', item.id);

    showToast(nextState ? 'Notícia definida como destaque principal!' : 'Destaque removido.');
  };

  // Alternar Status (Publicado / Rascunho)
  const handleToggleStatus = async (item: MunicipalNews) => {
    const nextStatus: NewsStatus = item.status === 'published' ? 'draft' : 'published';
    const updated = { ...item, status: nextStatus };

    const nextList = news.map(n => n.id === item.id ? updated : n);
    setNews(nextList);
    localStorage.setItem('gestao360_municipal_news', JSON.stringify(nextList));

    await supabase
      .from('municipal_news')
      .update({ status: nextStatus })
      .eq('id', item.id);

    showToast(nextStatus === 'published' ? 'Notícia publicada no portal!' : 'Notícia movida para rascunho.');
  };

  // Métricas calculadas
  const stats = useMemo(() => {
    const totalPublished = news.filter(n => n.status === 'published').length;
    const totalViews = news.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
    const totalProjects = news.filter(n => n.project_status).length;
    const totalDrafts = news.filter(n => n.status === 'draft').length;

    return { totalPublished, totalViews, totalProjects, totalDrafts };
  }, [news]);

  // Filtros aplicados
  const filteredList = useMemo(() => {
    return news.filter(n => {
      const matchSearch = 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.subtitle && n.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (n.department && n.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'all' || n.status === statusFilter;
      const matchCat = categoryFilter === 'all' || n.category === categoryFilter;

      return matchSearch && matchStatus && matchCat;
    });
  }, [news, searchQuery, statusFilter, categoryFilter]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Banner de Novidade */}
      <WhatsNewBanner
        version="v2.5.0-noticias"
        title="Novo Portal Oficial de Notícias & Ações Municipais"
        features={[
          'Portal Público do Cidadão Integrado',
          'Acompanhamento de Obras & Projetos em tempo real',
          'Compartilhamento direto no WhatsApp',
          'Compressão automática de imagens para celular'
        ]}
      />

      {/* Header com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 sm:w-14 sm:h-14 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-2 flex items-center justify-center shadow-sm shrink-0">
            <img 
              src={currentInstitution?.logo_url || '/brasao-municipio.png'} 
              alt={currentInstitution?.name || 'Brasão do Município'}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/brasao-municipio.png';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                Notícias, Novidades & Projetos
              </h2>
              {currentInstitution && (
                <span className="hidden md:inline-block px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg">
                  {currentInstitution.name.replace('Prefeitura Municipal de ', '')}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Gestão da comunicação oficial do município com a população e acompanhamento de obras.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/noticias"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-sm"
          >
            <ExternalLink size={15} />
            <span>Ver Portal do Cidadão</span>
          </a>

          <button
            onClick={() => { setEditingNews(null); setIsEditorOpen(true); }}
            className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-neutral-900/10 flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Nova Matéria</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm">
          <div className="flex items-center justify-between text-emerald-500 mb-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
              <FileText size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Ativas</span>
          </div>
          <div className="text-3xl font-black text-neutral-900 dark:text-white">
            {stats.totalPublished}
          </div>
          <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-1">
            Notícias Publicadas
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm">
          <div className="flex items-center justify-between text-sky-500 mb-3">
            <div className="p-2.5 bg-sky-50 dark:bg-sky-500/10 rounded-2xl">
              <Eye size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Alcance</span>
          </div>
          <div className="text-3xl font-black text-neutral-900 dark:text-white">
            {stats.totalViews.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-1">
            Visualizações de Cidadãos
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm">
          <div className="flex items-center justify-between text-amber-500 mb-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
              <Building2 size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Transparência</span>
          </div>
          <div className="text-3xl font-black text-neutral-900 dark:text-white">
            {stats.totalProjects}
          </div>
          <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-1">
            Obras & Projetos Divulgados
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Pendente</span>
          </div>
          <div className="text-3xl font-black text-neutral-900 dark:text-white">
            {stats.totalDrafts}
          </div>
          <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-1">
            Matérias em Rascunho
          </div>
        </div>
      </div>

      {/* Barra de Filtro e Pesquisa */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Pesquisar por título, assunto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Status Tabs */}
          <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'all' 
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Todas ({news.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'published' 
                  ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Publicadas ({stats.totalPublished})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                statusFilter === 'draft' 
                  ? 'bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Rascunhos ({stats.totalDrafts})
            </button>
          </div>

          {/* Categoria Selector */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-2xl text-xs font-bold text-neutral-700 dark:text-neutral-300 border-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas as Categorias</option>
            {Object.keys(CATEGORY_META_LIST).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Notícias */}
      {filteredList.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-16 text-center border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
            <FileText size={28} />
          </div>
          <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
            Nenhuma matéria encontrada
          </h4>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Não foram encontradas notícias com os filtros atuais. Clique abaixo para redigir uma nova matéria.
          </p>
          <button
            onClick={() => { setEditingNews(null); setIsEditorOpen(true); }}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
          >
            Escrever Primeira Matéria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((item) => {
            const isPub = item.status === 'published';
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative h-44 w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    {item.cover_image_url ? (
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <FileText size={40} />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPub 
                          ? 'bg-emerald-500 text-white shadow-md' 
                          : 'bg-amber-500 text-white shadow-md'
                      }`}>
                        {isPub ? 'Publicada' : 'Rascunho'}
                      </span>

                      {item.is_featured && (
                        <span className="px-2.5 py-0.5 bg-amber-400 text-neutral-950 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <Star size={11} className="fill-neutral-950" /> Destaque
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleFeatured(item)}
                      className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-transform hover:scale-110 ${
                        item.is_featured 
                          ? 'bg-amber-400 text-neutral-950' 
                          : 'bg-neutral-900/60 text-white hover:bg-neutral-900'
                      }`}
                      title={item.is_featured ? 'Remover dos destaques' : 'Marcar como destaque principal'}
                    >
                      <Star size={14} className={item.is_featured ? 'fill-current' : ''} />
                    </button>
                  </div>

                  {/* Informações */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(item.published_at)}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-neutral-900 dark:text-white leading-snug line-clamp-2">
                      {item.title}
                    </h3>

                    {item.subtitle && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    )}

                    {/* Badge de Obra se aplicável */}
                    {item.project_status && (
                      <div className="pt-2 flex items-center justify-between text-xs">
                        <span className="px-2.5 py-0.5 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 rounded-md font-bold text-[10px]">
                          Projeto: {item.project_status}
                        </span>
                        {item.project_budget && (
                          <span className="font-bold text-emerald-600 text-xs">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.project_budget)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações Rápidas */}
                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                      <Eye size={13} />
                      <span>{item.views_count || 0} visualizações</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                          isPub 
                            ? 'text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' 
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        }`}
                        title={isPub ? 'Tornar rascunho' : 'Publicar agora'}
                      >
                        <CheckCircle2 size={16} />
                      </button>

                      <button
                        onClick={() => { setEditingNews(item); setIsEditorOpen(true); }}
                        className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Editar Matéria"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => setNewsToDelete(item)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Excluir Matéria"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <NewsEditor
            initialNews={editingNews}
            onSave={handleSaveNews}
            onClose={() => { setIsEditorOpen(false); setEditingNews(null); }}
            currentUserName={currentUser?.name}
            institutionId={currentInstitution?.id}
          />
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {newsToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Trash2 size={24} />
              </div>

              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                  Excluir matéria?
                </h3>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Você tem certeza que deseja excluir a notícia <strong>"{newsToDelete.title}"</strong>? Esta ação não poderá ser desfeita.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setNewsToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteNews(newsToDelete.id)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/20"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
