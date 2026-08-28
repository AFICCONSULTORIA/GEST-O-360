import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Eye, 
  Share2, 
  ChevronRight, 
  ArrowLeft, 
  Sun, 
  Moon, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  Coins, 
  X, 
  Copy, 
  ExternalLink,
  MessageCircle,
  Home,
  Layers,
  FileText,
  ChevronDown
} from 'lucide-react';
import { MunicipalNews, Institution, NewsCategory } from '../../types';
import { CATEGORY_META_LIST, PROJECT_STATUS_META } from './types';
import { MOCK_MUNICIPAL_NEWS } from './mockNews';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { LogoCompass } from '../../components/LogoCompass';

interface PublicNewsPortalProps {
  darkMode: boolean;
  setDarkMode?: (v: boolean) => void;
  currentInstitution?: Institution | null;
}

export const PublicNewsPortal: React.FC<PublicNewsPortalProps> = ({
  darkMode: initialDarkMode,
  currentInstitution
}) => {
  const [darkMode, setDarkMode] = useState(initialDarkMode);
  const [news, setNews] = useState<MunicipalNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedNews, setSelectedNews] = useState<MunicipalNews | null>(null);
  const [filterOnlyProjects, setFilterOnlyProjects] = useState(false);

  // Sincronizar dark mode com a classe html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Carregar notícias do Supabase ou Fallback
  useEffect(() => {
    fetchNews();
  }, [currentInstitution?.id]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('municipal_news')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (currentInstitution?.id) {
        query = query.eq('institution_id', currentInstitution.id);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        setNews(data as MunicipalNews[]);
      } else {
        // Fallback para localStorage ou Mocks locais
        const saved = localStorage.getItem('gestao360_municipal_news');
        if (saved) {
          const parsed = JSON.parse(saved);
          setNews(parsed.filter((n: MunicipalNews) => n.status === 'published'));
        } else {
          setNews(MOCK_MUNICIPAL_NEWS);
          localStorage.setItem('gestao360_municipal_news', JSON.stringify(MOCK_MUNICIPAL_NEWS));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar notícias:', err);
      setNews(MOCK_MUNICIPAL_NEWS);
    } finally {
      setLoading(false);
    }
  };

  // Carregar ID da URL (para link direto)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id && news.length > 0 && !selectedNews) {
      const article = news.find(n => n.id === id);
      if (article) {
        setSelectedNews(article);
        setNews(prev => prev.map(n => n.id === id ? { ...n, views_count: (n.views_count || 0) + 1 } : n));
        supabase.from('municipal_news').update({ views_count: (article.views_count || 0) + 1 }).eq('id', article.id).then(() => {});
      }
    }
  }, [news, selectedNews]);

  // Abrir matéria e registrar contagem de visualização
  const handleOpenArticle = (item: MunicipalNews) => {
    window.history.pushState({}, '', `/noticias?id=${item.id}`);
    setSelectedNews(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Atualiza contagem localmente
    setNews(prev => prev.map(n => n.id === item.id ? { ...n, views_count: (n.views_count || 0) + 1 } : n));

    // Atualiza no banco silenciosamente
    supabase
      .from('municipal_news')
      .update({ views_count: (item.views_count || 0) + 1 })
      .eq('id', item.id)
      .then(() => {});
  };

  const handleCloseArticle = () => {
    window.history.pushState({}, '', '/noticias');
    setSelectedNews(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Matéria em Destaque Principal (Hero)
  const featuredArticle = useMemo(() => {
    return news.find(n => n.is_featured) || news[0] || null;
  }, [news]);

  // Filtros aplicados
  const filteredNews = useMemo(() => {
    return news.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.department && item.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
      const matchesProjects = !filterOnlyProjects || !!item.project_status;

      return matchesSearch && matchesCategory && matchesProjects;
    });
  }, [news, searchQuery, selectedCategory, filterOnlyProjects]);

  // Lista de projetos / obras em andamento
  const ongoingProjects = useMemo(() => {
    return news.filter(n => n.project_status);
  }, [news]);

  // Compartilhar notícia
  const handleShareWhatsApp = (item: MunicipalNews) => {
    const text = encodeURIComponent(`📰 *${item.title}*\n\nConfira as ações da Prefeitura Municipal:\n${window.location.origin}/noticias?id=${item.id}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyLink = (item: MunicipalNews) => {
    const url = `${window.location.origin}/noticias?id=${item.id}`;
    navigator.clipboard.writeText(url);
    showToast('Link da notícia copiado para a área de transferência!', 'success');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val?: number) => {
    if (!val) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className={`min-h-[100dvh] bg-[#F8F9FA] dark:bg-neutral-950 font-sans transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      
      {/* Luzes de fundo decorativas */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-500/10 dark:bg-sky-500/5 blur-[140px] rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3.5 group">
              <div className="w-12 h-12 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img 
                  src={currentInstitution?.logo_url || '/brasao-municipio.png'} 
                  alt={`Brasão ${currentInstitution?.name || 'Municipal'}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/brasao-municipio.png';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-neutral-900 dark:text-white uppercase">
                    {currentInstitution ? currentInstitution.name.replace('Prefeitura Municipal de ', 'Prefeitura de ') : 'Prefeitura Municipal'}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-md">
                    Portal Oficial
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">
                  Notícias, Obras e Atos Oficiais do Município
                </p>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="/"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all"
            >
              <Home size={14} />
              <span>Portal do Cidadão</span>
            </a>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              title="Alternar tema"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Visualizador de Matéria Completa (Página) */}
      {selectedNews ? (
        <main className="relative z-10 w-full max-w-4xl lg:max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 py-2 sm:py-8 animate-in fade-in duration-500">
           
           {/* Barra de Retorno Superior */}
           <div className="px-4 sm:px-0 mb-4 sm:mb-6">
             <button
               onClick={handleCloseArticle}
               className="inline-flex items-center gap-2.5 px-5 py-3 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-2xl text-sm sm:text-base font-bold transition-all border border-neutral-200 dark:border-neutral-800 shadow-sm active:scale-95"
             >
               <ArrowLeft size={20} className="text-emerald-500" />
               <span>Voltar para todas as notícias</span>
             </button>
           </div>

           {/* Cartão / Artigo Principal */}
           <article className="bg-white dark:bg-neutral-900 w-full rounded-none sm:rounded-[32px] shadow-none sm:shadow-2xl border-y sm:border border-neutral-200/80 dark:border-neutral-800 overflow-hidden relative">

              {/* Capa da Notícia (Edge-to-Edge no celular) */}
              {selectedNews.cover_image_url && (
                <div className="relative w-full h-[280px] sm:h-[460px] md:h-[520px] overflow-hidden bg-neutral-900">
                  <img
                    src={selectedNews.cover_image_url}
                    alt={selectedNews.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/30 to-transparent" />
                  
                  <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 flex flex-wrap items-center gap-2 sm:gap-3">
                    {selectedNews.badge && (
                      <span className="px-3.5 py-1.5 bg-emerald-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-full shadow-lg">
                        {selectedNews.badge}
                      </span>
                    )}
                    <span className="px-3.5 py-1.5 bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-bold rounded-full">
                      {selectedNews.category}
                    </span>
                    {selectedNews.project_status && (
                      <span className="px-3.5 py-1.5 bg-sky-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-md">
                        {PROJECT_STATUS_META[selectedNews.project_status]?.label || selectedNews.project_status}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Conteúdo da Matéria com alta legibilidade */}
              <div className="p-5 sm:p-10 md:p-14 space-y-8 sm:space-y-10">
                <div className="space-y-4 sm:space-y-6">
                  {/* Metadados */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <span className="flex items-center gap-2 font-medium">
                        <Calendar size={18} className="text-emerald-500" />
                        {formatDate(selectedNews.published_at)}
                      </span>
                      {selectedNews.department && (
                        <span className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-200">
                          <Building2 size={18} className="text-emerald-500" />
                          {selectedNews.department}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-neutral-400 font-medium">
                        <Eye size={18} />
                        {selectedNews.views_count || 1} visualizações
                      </span>
                    </div>
                  </div>

                  {/* Título Grande e Impactante */}
                  <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black text-neutral-900 dark:text-white leading-[1.2] tracking-tight">
                    {selectedNews.title}
                  </h1>

                  {/* Subtítulo / Olho da Notícia */}
                  {selectedNews.subtitle && (
                    <p className="text-lg sm:text-2xl text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed italic border-l-4 border-emerald-500 pl-4 sm:pl-6 py-1">
                      {selectedNews.subtitle}
                    </p>
                  )}
                </div>

                {/* Card Especial de Acompanhamento de Obra/Projeto */}
                {selectedNews.project_status && (
                  <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-emerald-950/30 dark:to-sky-950/30 rounded-2xl sm:rounded-3xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                          <Building2 size={26} />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
                            Acompanhamento da Obra / Projeto
                          </h4>
                          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                            Dados oficiais de transparência e aplicação de recursos públicos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-black border ${PROJECT_STATUS_META[selectedNews.project_status]?.bg} ${PROJECT_STATUS_META[selectedNews.project_status]?.text}`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${PROJECT_STATUS_META[selectedNews.project_status]?.dot}`} />
                          {PROJECT_STATUS_META[selectedNews.project_status]?.label}
                        </span>
                      </div>
                    </div>

                    {selectedNews.project_budget && (
                      <div className="pt-4 mt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">
                          Investimento Estimado:
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(selectedNews.project_budget)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Texto Principal da Matéria (Tamanho aumentado para leitura no telefone e monitor) */}
                <div className="text-neutral-800 dark:text-neutral-200 text-lg sm:text-xl md:text-[21px] leading-[1.85] sm:leading-[1.95] whitespace-pre-line font-normal space-y-6">
                  {selectedNews.content}
                </div>

                {/* Galeria de Fotos Complementares */}
                {selectedNews.gallery_urls && selectedNews.gallery_urls.length > 0 && (
                  <div className="space-y-4 pt-8 border-t border-neutral-100 dark:border-neutral-800">
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-widest text-neutral-400">
                      Galeria de Fotos
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedNews.gallery_urls.map((img, idx) => (
                        <div key={idx} className="rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-52 sm:h-56 group shadow-sm">
                          <img 
                            src={img} 
                            alt={`Registro ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Barra de Compartilhamento no Rodapé com botões grandes para polegar */}
                <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      onClick={() => handleShareWhatsApp(selectedNews)}
                      className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-sm sm:text-base font-black shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
                    >
                      <MessageCircle size={20} />
                      <span>Compartilhar no WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleCopyLink(selectedNews)}
                      className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl text-sm sm:text-base font-bold transition-all active:scale-95"
                    >
                      <Copy size={18} />
                      <span>Copiar Link</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCloseArticle}
                    className="px-6 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs sm:text-sm font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-opacity text-center"
                  >
                    Voltar ao Portal
                  </button>
                </div>
              </div>
           </article>

           {/* Carrossel: Veja Também (Touch-friendly no celular) */}
           <div className="mt-12 sm:mt-16 pt-8 px-4 sm:px-0">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2.5">
                  <Layers className="text-emerald-500" size={24} />
                  <span>Veja também</span>
                </h3>
                <span className="text-xs sm:text-sm font-semibold text-neutral-400 hidden sm:inline">
                  Deslize para ver mais matérias
                </span>
              </div>

              {/* Trilho horizontal touch-swipe */}
              <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 snap-x snap-mandatory">
                {news.filter(n => n.id !== selectedNews.id).slice(0, 5).map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => handleOpenArticle(item)}
                    className="min-w-[82vw] sm:min-w-[320px] max-w-[88vw] sm:max-w-[340px] bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden cursor-pointer hover:shadow-xl transition-all snap-center sm:snap-start group flex flex-col shrink-0 shadow-sm active:scale-[0.98]"
                  >
                    <div className="h-44 sm:h-48 bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 relative">
                      {item.cover_image_url ? (
                        <img src={item.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 bg-neutral-100 dark:bg-neutral-800">
                          <LogoCompass size={40} />
                        </div>
                      )}
                      {item.category && (
                        <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-white text-xs font-bold rounded-lg shadow-sm">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h4 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors">
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                          {item.subtitle}
                        </p>
                      )}
                      <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs sm:text-sm text-neutral-400">
                        <span className="flex items-center gap-1.5"><Calendar size={14}/> {formatDate(item.published_at)}</span>
                        <span className="flex items-center gap-1.5"><Eye size={14}/> {item.views_count || 1}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 relative z-10">
        
        {/* Banner Hero / Destaque Principal */}
        {featuredArticle && !selectedNews && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-[36px] overflow-hidden bg-neutral-900 text-white shadow-2xl border border-neutral-800 group cursor-pointer"
            onClick={() => handleOpenArticle(featuredArticle)}
          >
            <div className="relative h-[380px] sm:h-[480px] w-full overflow-hidden">
              <img
                src={featuredArticle.cover_image_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=1200&q=80'}
                alt={featuredArticle.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

              <div className="absolute top-6 left-6 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl">
                  <Sparkles size={13} />
                  Destaque da Semana
                </span>
                {featuredArticle.badge && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full">
                    {featuredArticle.badge}
                  </span>
                )}
              </div>

              <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 space-y-3 max-w-3xl">
                <div className="flex items-center gap-3 text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  <span>{featuredArticle.category}</span>
                  <span>•</span>
                  <span>{formatDate(featuredArticle.published_at)}</span>
                  {featuredArticle.department && (
                    <>
                      <span>•</span>
                      <span>{featuredArticle.department}</span>
                    </>
                  )}
                </div>

                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  {featuredArticle.title}
                </h2>

                {featuredArticle.subtitle && (
                  <p className="text-sm sm:text-base text-neutral-300 font-medium line-clamp-2 sm:line-clamp-3 leading-relaxed">
                    {featuredArticle.subtitle}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                  <span>Ler Matéria Completa</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Seção de Obras & Projetos da Cidade (Transparência Ativa) */}
        {ongoingProjects.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-widest rounded-full border border-amber-200 dark:border-amber-500/20 mb-2">
                  <Building2 size={13} />
                  Transparência em Ação
                </div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Obras, Metas e Projetos Municipais
                </h3>
              </div>

              <button
                onClick={() => setFilterOnlyProjects(!filterOnlyProjects)}
                className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                  filterOnlyProjects 
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                    : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {filterOnlyProjects ? 'Ver Todas as Notícias' : 'Filtrar Somente Projetos'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ongoingProjects.slice(0, 3).map((proj) => {
                const statusMeta = proj.project_status ? PROJECT_STATUS_META[proj.project_status] : null;
                return (
                  <div
                    key={proj.id}
                    onClick={() => handleOpenArticle(proj)}
                    className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        {statusMeta && (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${statusMeta.bg} ${statusMeta.text}`}>
                            <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </span>
                        )}
                        {proj.project_budget && (
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(proj.project_budget)}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                          {proj.title}
                        </h4>
                        {proj.subtitle && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-2 leading-relaxed">
                            {proj.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                      <span>{proj.department || 'Gestão Municipal'}</span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        Acompanhar <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra de Busca e Filtros de Categorias */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar notícias, obras ou avisos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <span className="text-xs font-bold text-neutral-400">
              Mostrando {filteredNews.length} de {news.length} matérias oficiais
            </span>
          </div>

          {/* Categorias em Pílulas */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {['Todas', ...Object.keys(CATEGORY_META_LIST)].map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-105'
                      : 'bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade de Notícias */}
        {filteredNews.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-16 text-center border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
              <Search size={28} />
            </div>
            <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
              Nenhuma notícia encontrada
            </h4>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
              Tente buscar por outros termos ou selecione a categoria "Todas" para ver mais matérias.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('Todas'); setFilterOnlyProjects(false); }}
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredNews.map((item, index) => {
              const meta = CATEGORY_META_LIST[item.category];
              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  onClick={() => handleOpenArticle(item)}
                  className="group bg-white dark:bg-neutral-900 rounded-[32px] overflow-hidden border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem de Capa */}
                    <div className="relative h-56 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                      <img
                        src={item.cover_image_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=800&q=80'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 to-transparent" />

                      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        {item.badge && (
                          <span className="px-3 py-1 bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow-md">
                            {item.badge}
                          </span>
                        )}
                        <span className="px-3 py-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md text-neutral-800 dark:text-neutral-200 text-[11px] font-bold rounded-full shadow-sm">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {/* Conteúdo Textual */}
                    <div className="p-6 space-y-3">
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {formatDate(item.published_at)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye size={13} />
                          {item.views_count || 1}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-neutral-900 dark:text-white leading-snug tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {item.title}
                      </h3>

                      {item.subtitle && (
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="p-6 pt-0">
                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-600 dark:text-neutral-400 truncate max-w-[180px]">
                        {item.department || 'Prefeitura Municipal'}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
                        Ler notícia <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
        </main>
      )}

      {/* Footer com informações institucionais */}
      <footer className="relative z-10 mt-20 border-t border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md py-10 text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <img 
            src={currentInstitution?.logo_url || '/brasao-municipio.png'} 
            alt="Brasão Municipal"
            className="h-8 w-auto max-w-[40px] object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/brasao-municipio.png';
            }}
          />
          <span className="text-sm font-black tracking-tight text-neutral-900 dark:text-white">
            {currentInstitution ? currentInstitution.name : 'Prefeitura Municipal'} · Notícias Oficiais
          </span>
        </div>
        <p className="text-xs text-neutral-400 max-w-md mx-auto">
          Canal oficial de divulgação das ações, atos e projetos do município cliente do Gestão 360.
        </p>
        <div className="flex items-center justify-center gap-6 text-xs font-bold text-neutral-500">
          <a href="/servicos" className="hover:text-emerald-600">Serviços Públicos</a>
          <a href="/agendamento" className="hover:text-emerald-600">Agendamento SUS</a>
          <a href="/farmaciasus" className="hover:text-emerald-600">Farmácia</a>
          <a href="/educacao" className="hover:text-emerald-600">Educação</a>
          <a href="/servidores" className="hover:text-emerald-600">Acesso Restrito</a>
        </div>
      </footer>

    </div>
  );
};
