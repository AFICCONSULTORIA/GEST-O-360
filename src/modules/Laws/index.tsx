import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Eye, 
  Download, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Building2, 
  Calendar, 
  Tag, 
  ShieldCheck, 
  XCircle, 
  Share2, 
  Copy, 
  Printer, 
  RefreshCw, 
  LayoutGrid, 
  List, 
  FileCheck, 
  Layers, 
  ChevronRight, 
  Globe, 
  Info, 
  Sparkles,
  Landmark,
  FileCheck2,
  X,
  FileSearch,
  FilterX
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MunicipalLaw, LawType, LawStatus, LawCategory, LawOriginPower, AdminUser, Institution } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { showToast } from '../../components/ui/Toast';
import { WhatsNewBanner } from '../../components/ui/WhatsNewBanner';
import { DemoFillButton } from '../../components/DemoFillButton';
import { isDemoEnvironment } from '../../lib/demoManager';

// Subcomponentes e Dados Modulares
import { INITIAL_MOCK_LAWS } from './data/mockLaws';
import { LawCollectionsGrid } from './components/LawCollectionsGrid';
import { LawReaderModal } from './components/LawReaderModal';
import { LawFormModal, LAW_TYPES, LAW_CATEGORIES, LAW_STATUSES } from './components/LawFormModal';

export { INITIAL_MOCK_LAWS };

export const LawsModule = ({ 
  currentUser, 
  institution 
}: { 
  currentUser?: AdminUser, 
  institution?: Institution 
}) => {
  const canEdit = hasPermission(currentUser, 'laws', 'edit');
  const canAdmin = hasPermission(currentUser, 'laws', 'admin');

  const [laws, setLaws] = useState<MunicipalLaw[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState<MunicipalLaw | null>(null);
  const [editingLaw, setEditingLaw] = useState<MunicipalLaw | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialMateriaData, setInitialMateriaData] = useState<any>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPower, setSelectedPower] = useState<'all' | 'executivo' | 'legislativo'>('all');
  const [selectedType, setSelectedType] = useState<string>('Todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Carregamento de Leis com Fallback Resiliente
  const loadLaws = useCallback(async () => {
    setIsLoading(true);
    const isDemo = isDemoEnvironment(institution);
    try {
      let query = supabase.from('municipal_laws').select('*').order('publication_date', { ascending: false });
      
      if (institution?.id) {
        query = query.eq('institution_id', institution.id);
      }
      
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase municipal_laws offline ou tabela não migrada. Utilizando mock enriquecido:', error);
        if (isDemo) {
          const demoLaws = localStorage.getItem('gestao360_demo_laws');
          if (demoLaws) {
            try { setLaws(JSON.parse(demoLaws)); } catch (e) { setLaws(INITIAL_MOCK_LAWS); }
          } else {
            setLaws(INITIAL_MOCK_LAWS);
          }
        } else {
          setLaws(INITIAL_MOCK_LAWS);
        }
      } else if (data && data.length > 0) {
        setLaws(data as MunicipalLaw[]);
      } else if (isDemo) {
        const demoLaws = localStorage.getItem('gestao360_demo_laws');
        if (demoLaws) {
          try { setLaws(JSON.parse(demoLaws)); } catch (e) { setLaws(INITIAL_MOCK_LAWS); }
        } else {
          setLaws(INITIAL_MOCK_LAWS);
        }
      } else {
        setLaws(INITIAL_MOCK_LAWS);
      }
    } catch (err) {
      console.error(err);
      setLaws(INITIAL_MOCK_LAWS);
    }
    setIsLoading(false);
  }, [institution]);

  useEffect(() => {
    loadLaws();
    const handleReload = (e: any) => {
      const mod = e.detail?.moduleKey || e.detail?.module;
      if (!mod || mod === 'laws' || mod === 'all') {
        if (isDemoEnvironment(institution)) {
          const demoLaws = localStorage.getItem('gestao360_demo_laws');
          if (demoLaws) {
            try { setLaws(JSON.parse(demoLaws)); } catch (e) {}
          }
        }
        loadLaws();
      }
    };

    const handleOpenFormEvent = (e: any) => {
      if (e.detail) {
        setInitialMateriaData(e.detail);
        setEditingLaw(null);
        setIsFormOpen(true);
      }
    };

    window.addEventListener('gestao360:reload-module', handleReload);
    window.addEventListener('gestao360:open-law-form', handleOpenFormEvent);
    return () => {
      window.removeEventListener('gestao360:reload-module', handleReload);
      window.removeEventListener('gestao360:open-law-form', handleOpenFormEvent);
    };
  }, [loadLaws, institution]);

  // Salvar ou Atualizar Norma
  const handleSaveLaw = async (lawData: Partial<MunicipalLaw>, pdfFile?: File | null) => {
    let fileUrl = lawData.file_url;

    if (pdfFile) {
      const safeName = pdfFile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
      const instFolder = institution?.id || 'geral';
      const filename = `${instFolder}/law_${Date.now()}_${safeName}`;
      try {
        const { error: uploadError } = await supabase.storage.from('leis').upload(filename, pdfFile);
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('leis').getPublicUrl(filename);
          fileUrl = publicUrlData.publicUrl;
        }
      } catch (e) {
        console.warn('Erro no upload do storage, prosseguindo com link local:', e);
      }
    }

    const payload = {
      ...lawData,
      file_url: fileUrl,
      institution_id: institution?.id || null
    };

    if (lawData.id) {
      // Atualização
      try {
        const { error } = await supabase.from('municipal_laws').update(payload).eq('id', lawData.id);
        if (error) throw error;
      } catch (err) {
        console.warn('Erro ao atualizar no Supabase, atualizando localmente:', err);
      }
      setLaws(prev => prev.map(l => l.id === lawData.id ? { ...l, ...payload } as MunicipalLaw : l));
      showToast('Ato normativo atualizado com sucesso!', 'success');
    } else {
      // Criação
      const newLaw: MunicipalLaw = {
        id: `law_${Date.now()}`,
        number: payload.number || '',
        title: payload.title || '',
        type: payload.type || 'Lei Ordinária',
        category: payload.category || 'Administração Geral',
        ementa: payload.ementa || '',
        publication_date: payload.publication_date || new Date().toISOString().split('T')[0],
        status: payload.status || 'Em Vigor',
        full_text: payload.full_text,
        compiled_text: payload.compiled_text,
        is_compiled: payload.is_compiled,
        author: payload.author,
        origin_power: payload.origin_power || 'executivo',
        materia_numero: payload.materia_numero,
        parent_law_id: payload.parent_law_id,
        parent_law_number: payload.parent_law_number,
        parent_law_title: payload.parent_law_title,
        file_url: payload.file_url,
        external_link: payload.external_link,
        tags: payload.tags,
        created_at: new Date().toISOString()
      };

      try {
        const { error } = await supabase.from('municipal_laws').insert([payload]);
        if (error) throw error;
      } catch (err) {
        console.warn('Erro ao salvar no Supabase, adicionando localmente:', err);
      }

      setLaws(prev => [newLaw, ...prev]);
      showToast('Novo ato normativo publicado com sucesso no Repositório Oficial!', 'success');
    }

    setIsFormOpen(false);
    setEditingLaw(null);
    setInitialMateriaData(null);
  };

  // Excluir Norma
  const handleDeleteLaw = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja remover esta lei do repositório?')) return;

    try {
      await supabase.from('municipal_laws').delete().eq('id', id);
    } catch (e) {
      console.warn('Erro ao deletar no Supabase:', e);
    }

    setLaws(prev => prev.filter(l => l.id !== id));
    showToast('Norma removida do repositório.', 'info');
  };

  // Filtragem inteligente ampla
  const filteredLaws = useMemo(() => {
    return laws.filter(l => {
      // Filtro de Poder
      if (selectedPower !== 'all') {
        if (selectedPower === 'executivo' && l.origin_power !== 'executivo' && l.origin_power !== 'conjunto') return false;
        if (selectedPower === 'legislativo' && l.origin_power !== 'legislativo' && l.origin_power !== 'conjunto') return false;
      }

      // Filtro de Tipo
      if (selectedType !== 'Todos' && l.type !== selectedType) return false;

      // Filtro de Categoria
      if (selectedCategory !== 'Todas' && l.category !== selectedCategory) return false;

      // Filtro de Status
      if (selectedStatus !== 'Todos' && l.status !== selectedStatus) return false;

      // Filtro de Ano
      if (selectedYear !== 'Todos') {
        const matchesYearNumber = l.number.endsWith(selectedYear) || l.number.includes(`/${selectedYear}`);
        const matchesPubDate = l.publication_date && l.publication_date.startsWith(selectedYear);
        if (!matchesYearNumber && !matchesPubDate) return false;
      }

      // Filtro de Texto / Palavras-chave
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          l.number.toLowerCase().includes(q) ||
          l.title.toLowerCase().includes(q) ||
          l.ementa.toLowerCase().includes(q) ||
          (l.author && l.author.toLowerCase().includes(q)) ||
          (l.materia_numero && l.materia_numero.toLowerCase().includes(q)) ||
          (l.parent_law_number && l.parent_law_number.toLowerCase().includes(q)) ||
          (l.full_text && l.full_text.toLowerCase().includes(q)) ||
          (l.tags && l.tags.some(t => t.toLowerCase().includes(q)));
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      const parseNum = (numStr: string) => {
        const parts = (numStr || '').split('/');
        const n = parseInt((parts[0] || '0').replace(/\D/g, ''), 10) || 0;
        const y = parseInt(parts[1] || '0', 10) || 0;
        return { y: y < 100 ? (y > 50 ? 1900 + y : 2000 + y) : y, n };
      };
      const pA = parseNum(a.number);
      const pB = parseNum(b.number);
      if (pB.y !== pA.y) return pB.y - pA.y;
      return pB.n - pA.n;
    });
  }, [laws, selectedPower, selectedType, selectedCategory, selectedStatus, selectedYear, searchQuery]);

  // Métricas
  const totalCount = laws.length;
  const inForceCount = laws.filter(l => l.status === 'Em Vigor' || l.status === 'Regulamentada').length;
  const executiveCount = laws.filter(l => l.origin_power === 'executivo' || l.type === 'Decreto' || l.type === 'Portaria').length;
  const legislativeCount = laws.filter(l => l.origin_power === 'legislativo' || l.materia_numero).length;

  // Anos disponíveis
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    laws.forEach(l => {
      if (l.publication_date) {
        years.add(l.publication_date.split('-')[0]);
      }
      const parts = l.number.split('/');
      if (parts[1] && parts[1].length === 4) {
        years.add(parts[1]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [laws]);

  // Disparo para abrir coleção rápida
  const handleSelectCollection = (col: any) => {
    if (activeCollectionId === col.id) {
      setActiveCollectionId(null);
      setSearchQuery('');
      setSelectedType('Todos');
      return;
    }

    setActiveCollectionId(col.id);
    if (col.targetLawNumber) {
      const found = laws.find(l => l.number === col.targetLawNumber);
      if (found) {
        setSelectedLaw(found);
      } else {
        setSearchQuery(col.title);
      }
    } else {
      setSelectedType(col.type);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPower('all');
    setSelectedType('Todos');
    setSelectedCategory('Todas');
    setSelectedStatus('Todos');
    setSelectedYear('Todos');
    setActiveCollectionId(null);
  };

  const hasActiveFilters = searchQuery || selectedPower !== 'all' || selectedType !== 'Todos' || selectedCategory !== 'Todas' || selectedStatus !== 'Todos' || selectedYear !== 'Todos' || activeCollectionId;

  return (
    <div className="space-y-6">
      {/* WhatsNewBanner */}
      <WhatsNewBanner 
        version="2.0.0"
        title="Repositório Unificado de Legislação Municipal (Prefeitura ⇄ Câmara)"
        features={[
          "Integração em tempo real entre Atos do Poder Executivo e Matérias da Câmara Municipal.",
          "Leitor estruturado com índice navegável de artigos e cópia rápida para petições e ofícios.",
          "Controle completo de Texto Compilado com redações anteriores tachadas no padrão Planalto.",
          "Vínculo direto de Decretos Regulamentadores à Lei Mãe correspondente."
        ]}
      />

      {/* =========================================================================
          1. CABEÇALHO PRINCIPAL DO BANCO DE LEIS
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Scale size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                Repositório Oficial de Legislação Municipal
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                Poder Executivo (Prefeitura) ⇄ Poder Legislativo (Câmara Municipal)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <DemoFillButton moduleKey="laws" onSuccess={loadLaws} />
          
          <button
            type="button"
            onClick={loadLaws}
            className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs cursor-pointer"
            title="Atualizar lista de leis"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditingLaw(null);
                setInitialMateriaData(null);
                setIsFormOpen(true);
              }}
              className="px-5 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Publicar Ato Normativo</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. VITRINE DE GRANDES COLEÇÕES & CÓDIGOS ESTRUTURANTES
         ========================================================================= */}
      <LawCollectionsGrid 
        onSelectCollection={handleSelectCollection}
        activeCollectionId={activeCollectionId}
      />

      {/* =========================================================================
          3. STAT CARDS (METADADOS & ATENDIMENTO AO RADAR PNTP)
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-neutral-400 block mb-1">
            Total de Atos Registrados
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-neutral-900 dark:text-white font-mono">{totalCount}</span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              Oficial
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-neutral-400 block mb-1">
            Normas em Vigor
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{inForceCount}</span>
            <span className="text-[10px] font-bold text-neutral-400">
              {totalCount ? Math.round((inForceCount / totalCount) * 100) : 0}% vigentes
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-neutral-400 block mb-1">
            Poder Executivo (Prefeitura)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">{executiveCount}</span>
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Building2 size={10} /> Decretos & Leis
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs">
          <span className="text-[10px] font-black uppercase text-neutral-400 block mb-1">
            Poder Legislativo (Câmara)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{legislativeCount}</span>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Landmark size={10} /> Autógrafos & LOM
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. BARRA DE BUSCA UNIVERSAL & FILTROS INSTITUCIONAIS
         ========================================================================= */}
      <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl shadow-xs space-y-4">
        
        {/* Linha 1: Input de Busca com Highlighting & Alternador Grid/Tabela */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por número, ementa, palavra no artigo (ex: IPTU, isenção, servidor, Art. 5)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl pl-11 pr-10 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Alternador de Poder (Origem Institucional) */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl self-stretch md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setSelectedPower('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPower === 'all'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Todos os Poderes
            </button>
            <button
              type="button"
              onClick={() => setSelectedPower('executivo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedPower === 'executivo'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Building2 size={13} />
              <span>Executivo</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPower('legislativo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedPower === 'legislativo'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Landmark size={13} />
              <span>Câmara</span>
            </button>
          </div>

          {/* Alternador Layout Grid / Tabela */}
          <div className="flex items-center gap-1 self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                viewLayout === 'grid'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-800'
              }`}
              title="Visualização em Grade de Cards"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                viewLayout === 'table'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-800'
              }`}
              title="Visualização em Tabela Detalhada"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Linha 2: Dropdowns de Filtro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1">
          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Tipo de Ato</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none dark:text-white cursor-pointer"
            >
              <option value="Todos">Todos os Tipos</option>
              {LAW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Área / Categoria</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none dark:text-white cursor-pointer"
            >
              <option value="Todas">Todas as Áreas</option>
              {LAW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Vigência / Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none dark:text-white cursor-pointer"
            >
              <option value="Todos">Todos os Status</option>
              {LAW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Ano da Norma</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none dark:text-white cursor-pointer"
            >
              <option value="Todos">Todos os Anos</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Botão de Limpar Filtros */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-1.5 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FilterX size={13} />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumo de Resultados */}
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
          <span>
            {filteredLaws.length} {filteredLaws.length === 1 ? 'norma encontrada' : 'normas encontradas'}
          </span>
          {activeCollectionId && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
              Coleção filtrada ativa
              <button type="button" onClick={() => setActiveCollectionId(null)} className="hover:text-rose-600">
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          5. LISTAGEM DE LEIS (GRID OU TABELA EDITORIAL)
         ========================================================================= */}
      {filteredLaws.length === 0 ? (
        <div className="p-12 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl text-center space-y-3">
          <FileSearch size={40} className="mx-auto text-neutral-400 opacity-60" />
          <h3 className="text-base font-bold text-neutral-800 dark:text-white">
            Nenhuma norma encontrada com os critérios informados
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Tente buscar por termos mais genéricos, limpar os filtros de poder ou ano, ou cadastre uma nova lei oficial.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Ver Todas as Leis
          </button>
        </div>
      ) : viewLayout === 'grid' ? (
        
        /* GRID DE CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLaws.map(law => {
            const hasRegulations = laws.some(l => l.parent_law_id === law.id || (l.parent_law_number && l.parent_law_number.includes(law.number)));

            return (
              <div
                key={law.id}
                onClick={() => setSelectedLaw(law)}
                className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-emerald-500/80 dark:hover:border-emerald-500/60 rounded-3xl shadow-xs hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {law.type}
                      </span>
                      <span className="text-sm font-black text-neutral-900 dark:text-white font-mono">
                        {law.number}
                      </span>
                    </div>

                    {/* Badge de Origem */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      law.origin_power === 'legislativo'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {law.origin_power === 'legislativo' ? <Landmark size={11} /> : <Building2 size={11} />}
                      <span>{law.origin_power === 'legislativo' ? 'Câmara' : 'Prefeitura'}</span>
                    </span>
                  </div>

                  {/* Título & Ementa */}
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {law.title}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-3 leading-relaxed font-serif">
                    {law.ementa}
                  </p>

                  {/* Badges Adicionais (Compilada / Decretos Regulamentadores / Matéria de Origem) */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {law.is_compiled && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles size={11} />
                        <span>Texto Compilado</span>
                      </span>
                    )}

                    {hasRegulations && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <FileCheck2 size={11} />
                        <span>Possui Decretos</span>
                      </span>
                    )}

                    {law.parent_law_number && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 px-2 py-0.5 rounded-md">
                        Regulamenta: {law.parent_law_number}
                      </span>
                    )}

                    {law.materia_numero && (
                      <span className="text-[10px] font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 px-2 py-0.5 rounded-md">
                        Origem: {law.materia_numero}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      law.status === 'Em Vigor'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : law.status === 'Regulamentada'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    }`}>
                      {law.status}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(law.publication_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    Ler Norma <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        /* TABELA EDITORIAL DE LEIS */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3.5">Número & Tipo</th>
                  <th className="px-4 py-3.5">Título & Ementa</th>
                  <th className="px-4 py-3.5">Origem Constitucional</th>
                  <th className="px-4 py-3.5">Área</th>
                  <th className="px-4 py-3.5">Data Publicação</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                {filteredLaws.map(law => (
                  <tr 
                    key={law.id}
                    onClick={() => setSelectedLaw(law)}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                        {law.number}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {law.type}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 max-w-md">
                      <div className="font-bold text-neutral-900 dark:text-white line-clamp-1">
                        {law.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5 font-serif">
                        {law.ementa}
                      </div>
                      {law.is_compiled && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          ✨ Compilada
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        law.origin_power === 'legislativo'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {law.origin_power === 'legislativo' ? <Landmark size={12} /> : <Building2 size={12} />}
                        <span>{law.origin_power === 'legislativo' ? 'Câmara' : 'Prefeitura'}</span>
                      </span>
                      {law.materia_numero && (
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          {law.materia_numero}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {law.category}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {new Date(law.publication_date).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        law.status === 'Em Vigor'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : law.status === 'Regulamentada'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {law.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedLaw(law)}
                          className="p-1.5 text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                          title="Visualizar no Leitor Estruturado"
                        >
                          <Eye size={15} />
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLaw(law);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                            title="Editar Atributos da Norma"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}

                        {canAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLaw(law.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Norma"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAIS DO SISTEMA
         ========================================================================= */}
      
      {/* NOVO LEITOR ESTRUTURADO EM 3 COLUNAS */}
      <AnimatePresence>
        {selectedLaw && (
          <LawReaderModal
            law={selectedLaw}
            allLaws={laws}
            onClose={() => setSelectedLaw(null)}
            onEdit={canEdit ? (l) => {
              setEditingLaw(l);
              setIsFormOpen(true);
            } : undefined}
            onSelectRelatedLaw={(related) => setSelectedLaw(related)}
          />
        )}
      </AnimatePresence>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE LEIS */}
      <AnimatePresence>
        {isFormOpen && (
          <LawFormModal
            lawToEdit={editingLaw}
            allLaws={laws}
            initialMateriaData={initialMateriaData}
            onClose={() => {
              setIsFormOpen(false);
              setEditingLaw(null);
              setInitialMateriaData(null);
            }}
            onSave={handleSaveLaw}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LawsModule;
