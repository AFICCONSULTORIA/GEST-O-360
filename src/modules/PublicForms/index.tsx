import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, Share2, Eye, Edit2, Trash2, Copy, 
  BarChart3, Users, Clock, CheckCircle2, AlertCircle, FileText, 
  Sparkles, ExternalLink, QrCode, Layers, ShieldCheck, Download,
  HeartPulse, Landmark, Wrench, GraduationCap, Trophy, Link2, MessageSquare
} from 'lucide-react';
import { PublicForm, FormResponse, Institution, AdminUser } from '../../types';
import { MOCK_DEFAULT_FORMS, TEMPLATE_PRESETS } from './templates';
import { FORM_THEMES, FormTheme } from './types';
import { FormBuilder } from './FormBuilder';
import { FormAnalytics } from './FormAnalytics';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { WhatsNewBanner } from '../../components/ui/WhatsNewBanner';

interface PublicFormsModuleProps {
  currentUser?: AdminUser | null;
  institution?: Institution | null;
}

export const PublicFormsModule: React.FC<PublicFormsModuleProps> = ({
  currentUser,
  institution
}) => {
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [allResponses, setAllResponses] = useState<Record<string, FormResponse[]>>({});
  const [loading, setLoading] = useState(true);

  const [activeViewMode, setActiveViewMode] = useState<'list' | 'builder' | 'analytics'>('list');
  const [selectedForm, setSelectedForm] = useState<PublicForm | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [shareModalForm, setShareModalForm] = useState<PublicForm | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Load Forms and Responses
  useEffect(() => {
    fetchFormsData();
  }, [institution?.id]);

  const fetchFormsData = async () => {
    setLoading(true);
    try {
      // 1. Try Supabase
      const { data: dbForms, error: formsError } = await supabase
        .from('public_forms')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: dbResponses, error: respError } = await supabase
        .from('public_form_responses')
        .select('*');

      let resolvedForms: PublicForm[] = [];
      const responsesMap: Record<string, FormResponse[]> = {};

      if (!formsError && dbForms && dbForms.length > 0) {
        resolvedForms = dbForms.map((f: any) => ({
          ...f,
          questions: typeof f.questions === 'string' ? JSON.parse(f.questions) : f.questions
        }));
      } else {
        // Fallback to local storage or defaults
        const saved = localStorage.getItem('gestao360_public_forms');
        if (saved) {
          resolvedForms = JSON.parse(saved);
        } else {
          resolvedForms = [...MOCK_DEFAULT_FORMS];
          localStorage.setItem('gestao360_public_forms', JSON.stringify(resolvedForms));
        }
      }

      // Group responses by form_id
      if (!respError && dbResponses) {
        dbResponses.forEach((r: any) => {
          if (!responsesMap[r.form_id]) responsesMap[r.form_id] = [];
          responsesMap[r.form_id].push({
            ...r,
            answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers
          });
        });
      }

      // Check local storage responses
      resolvedForms.forEach(f => {
        const localResp = JSON.parse(localStorage.getItem(`gestao360_form_responses_${f.id}`) || '[]');
        if (!responsesMap[f.id] || responsesMap[f.id].length === 0) {
          responsesMap[f.id] = localResp;
        }
        f.response_count = responsesMap[f.id]?.length || f.response_count || 0;
      });

      setForms(resolvedForms);
      setAllResponses(responsesMap);
    } catch (err) {
      console.error('Erro ao carregar formulários:', err);
      setForms(MOCK_DEFAULT_FORMS);
    } finally {
      setLoading(false);
    }
  };

  // Save / Update Form
  const handleSaveForm = async (formToSave: PublicForm) => {
    try {
      const existingIdx = forms.findIndex(f => f.id === formToSave.id);
      let updatedForms: PublicForm[] = [];

      if (existingIdx >= 0) {
        updatedForms = forms.map(f => f.id === formToSave.id ? formToSave : f);
      } else {
        updatedForms = [formToSave, ...forms];
      }

      setForms(updatedForms);
      localStorage.setItem('gestao360_public_forms', JSON.stringify(updatedForms));

      // Sync Supabase
      const { error } = await supabase.from('public_forms').upsert({
        id: formToSave.id,
        institution_id: institution?.id || null,
        title: formToSave.title,
        description: formToSave.description,
        category: formToSave.category,
        slug: formToSave.slug,
        cover_theme: formToSave.cover_theme,
        cover_image_url: formToSave.cover_image_url,
        status: formToSave.status,
        is_anonymous: formToSave.is_anonymous,
        require_cpf: formToSave.require_cpf,
        max_responses: formToSave.max_responses,
        start_date: formToSave.start_date || null,
        end_date: formToSave.end_date || null,
        thank_you_title: formToSave.thank_you_title,
        thank_you_message: formToSave.thank_you_message,
        redirect_url: formToSave.redirect_url,
        questions: formToSave.questions,
        created_by: currentUser?.name || 'Administrador',
        updated_at: new Date().toISOString()
      });

      if (error) console.warn('Aviso Supabase upsert:', error);

      setActiveViewMode('list');
      setSelectedForm(null);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Delete Form
  const handleDeleteForm = async (formId: string) => {
    if (confirm('Tem certeza que deseja excluir este formulário? Todas as respostas associadas serão removidas.')) {
      const updated = forms.filter(f => f.id !== formId);
      setForms(updated);
      localStorage.setItem('gestao360_public_forms', JSON.stringify(updated));

      await supabase.from('public_forms').delete().eq('id', formId);
      showToast('Formulário removido com sucesso!', 'info');
    }
  };

  // Duplicate Form
  const handleDuplicateForm = (targetForm: PublicForm) => {
    const duplicated: PublicForm = {
      ...targetForm,
      id: crypto.randomUUID(),
      title: `${targetForm.title} (Cópia)`,
      slug: `${targetForm.slug || 'form'}-copia`,
      status: 'draft',
      response_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const next = [duplicated, ...forms];
    setForms(next);
    localStorage.setItem('gestao360_public_forms', JSON.stringify(next));
    showToast('Formulário duplicado como rascunho.', 'success');
  };

  // Create from Template Preset
  const handleCreateFromTemplate = (templateId: string) => {
    let baseForm = MOCK_DEFAULT_FORMS[0];
    if (templateId === 'tpl_orcamento') baseForm = MOCK_DEFAULT_FORMS[1] || MOCK_DEFAULT_FORMS[0];
    if (templateId === 'tpl_servicos') baseForm = MOCK_DEFAULT_FORMS[2] || MOCK_DEFAULT_FORMS[0];
    if (templateId === 'tpl_educacao') baseForm = MOCK_DEFAULT_FORMS[3] || MOCK_DEFAULT_FORMS[0];

    const newForm: PublicForm = {
      ...baseForm,
      id: crypto.randomUUID(),
      title: baseForm.title,
      status: 'published',
      response_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setShowTemplateModal(false);
    setSelectedForm(newForm);
    setActiveViewMode('builder');
    showToast('Modelo carregado no construtor!', 'success');
  };

  // Filtered forms list
  const filteredForms = forms.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (f.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (f.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchCategory = categoryFilter === 'all' || f.category === categoryFilter;

    return matchSearch && matchStatus && matchCategory;
  });

  const categories = Array.from(new Set(forms.map(f => f.category || 'Geral')));

  // Overall Stats
  const totalPublished = forms.filter(f => f.status === 'published').length;
  const totalResponses = Object.values(allResponses).reduce((acc: number, curr: FormResponse[]) => acc + (curr?.length || 0), 0);

  // If in Builder Mode
  if (activeViewMode === 'builder') {
    return (
      <FormBuilder
        initialForm={selectedForm || undefined}
        onSave={handleSaveForm}
        onBack={() => { setActiveViewMode('list'); setSelectedForm(null); }}
        institution={institution}
      />
    );
  }

  // If in Analytics Mode
  if (activeViewMode === 'analytics' && selectedForm) {
    return (
      <FormAnalytics
        form={selectedForm}
        responses={allResponses[selectedForm.id] || []}
        onBack={() => { setActiveViewMode('list'); setSelectedForm(null); }}
        institution={institution}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-28">
      {/* What's New Feature Banner */}
      <WhatsNewBanner 
        version="v1.8"
        title="Novo Módulo: Formulários & Consultas Populares (Gestão Forms 360)"
        features={[
          "Crie enquetes, pesquisas de satisfação de postos de saúde e consultas de orçamento.",
          "Compartilhe links com a população e gere QR Codes para impressão.",
          "Visualize gráficos em tempo real com inteligência artificial."
        ]}
      />

      {/* Main Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-black uppercase tracking-wider">
              Participação Cidadã 360
            </span>
            <span className="text-xs font-bold text-neutral-400">· {institution?.name || 'Prefeitura'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Formulários & Consultas Públicas
          </h2>
          <p className="text-xs text-neutral-500 max-w-xl">
            Crie formulários oficiais para a população responder via celular ou computador, com emissão de protocolo e dashboards analíticos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-5 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <Sparkles size={16} className="text-amber-500" />
            Modelos de Secretarias
          </button>

          <button
            onClick={() => {
              setSelectedForm(null);
              setActiveViewMode('builder');
            }}
            className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10 dark:shadow-white/10"
          >
            <Plus size={16} />
            Criar Formulário
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Formulários Ativos</span>
          <p className="text-3xl font-black text-neutral-900 dark:text-white">{totalPublished}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 size={12} /> Abertos para respostas
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total de Respostas</span>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{totalResponses}</p>
          <p className="text-[11px] text-neutral-400 font-medium">Coletadas da população</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Criados</span>
          <p className="text-3xl font-black text-neutral-900 dark:text-white">{forms.length}</p>
          <p className="text-[11px] text-neutral-400 font-medium">Em todas as secretarias</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Canais de Resposta</span>
          <p className="text-xl font-black text-neutral-900 dark:text-white mt-1">Link & QR Code</p>
          <p className="text-[11px] text-neutral-400 font-medium">100% otimizado para celular</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por título, secretaria ou descrição..."
              className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium outline-none focus:border-neutral-900 dark:focus:border-white"
            />
          </div>

          {categories.length > 1 && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold rounded-2xl px-4 py-2.5 outline-none text-neutral-700 dark:text-neutral-300"
            >
              <option value="all">Todas as Secretarias</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-2xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Todos ({forms.length})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'published'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Ativos ({forms.filter(f => f.status === 'published').length})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'draft'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Rascunhos ({forms.filter(f => f.status === 'draft').length})
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'closed'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Encerrados ({forms.filter(f => f.status === 'closed').length})
          </button>
        </div>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-neutral-900/10 dark:border-white/10 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
          <p className="text-xs font-bold text-neutral-400">Carregando formulários...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200 dark:border-neutral-800 p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white">Nenhum formulário encontrado</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Crie um novo formulário personalizado ou utilize um dos nossos modelos prontos para coletar a opinião dos cidadãos.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Explorar Modelos Prontos
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map(form => {
            const theme: FormTheme = FORM_THEMES[form.cover_theme] || FORM_THEMES.blue_ocean;
            const respCount = allResponses[form.id]?.length || form.response_count || 0;
            const publicUrl = `${window.location.origin}/formulario/${form.id}`;

            return (
              <motion.div
                key={form.id}
                layout
                className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Card Cover Banner */}
                  <div className={`h-24 bg-gradient-to-r ${theme.gradient} p-5 flex items-start justify-between text-white relative`}>
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider">
                      {form.category}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      form.status === 'published' ? 'bg-emerald-500 text-white' : (form.status === 'draft' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white')
                    }`}>
                      {form.status === 'published' ? 'Ativo' : (form.status === 'draft' ? 'Rascunho' : 'Encerrado')}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-neutral-900 dark:text-white line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {form.title}
                      </h3>
                      {form.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                          {form.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        <Layers size={14} />
                        <span>{form.questions.length} questões</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full">
                        <Users size={14} />
                        <span>{respCount} respostas</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-6 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedForm(form);
                        setActiveViewMode('analytics');
                      }}
                      className="py-2.5 px-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity shadow-sm"
                    >
                      <BarChart3 size={14} /> Resultados
                    </button>

                    <button
                      onClick={() => {
                        setSelectedForm(form);
                        setActiveViewMode('builder');
                      }}
                      className="py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShareModalForm(form)}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="Divulgar Link & QR Code"
                      >
                        <Share2 size={15} />
                      </button>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="Abrir como População"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <button
                        onClick={() => handleDuplicateForm(form)}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="Duplicar formulário"
                      >
                        <Copy size={15} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteForm(form.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-red-500 transition-colors"
                      title="Excluir formulário"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Share / QR Code Quick Modal */}
      <AnimatePresence>
        {shareModalForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6"
            >
              <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div className="space-y-1">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-black uppercase">
                    Central de Divulgação
                  </span>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                    {shareModalForm.title}
                  </h3>
                </div>
                <button
                  onClick={() => setShareModalForm(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400"
                >
                  <AlertCircle size={20} className="hidden" />
                  ✕
                </button>
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex flex-col items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/formulario/${shareModalForm.id}`)}&color=0-0-0&bgcolor=255-255-255`}
                  alt="QR Code"
                  className="w-40 h-40 rounded-lg"
                />
                <p className="text-[10px] font-mono text-neutral-400 mt-2 font-bold">QR Code para cartazes e postos</p>
              </div>

              {/* Link Box */}
              <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <Link2 size={16} className="text-neutral-400 ml-2 shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/formulario/${shareModalForm.id}`}
                  className="w-full bg-transparent text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 outline-none truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/formulario/${shareModalForm.id}`);
                    showToast('Link copiado!', 'success');
                  }}
                  className="px-3.5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-black uppercase tracking-wider shrink-0"
                >
                  Copiar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    const msg = `📢 *${shareModalForm.title}*\n\nPrezado(a) cidadão(ã), sua opinião é muito importante! Responda o formulário oficial da Prefeitura pelo link:\n\n👉 ${window.location.origin}/formulario/${shareModalForm.id}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} /> Disparar WhatsApp
                </button>

                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${window.location.origin}/formulario/${shareModalForm.id}`)}`}
                  download="qrcode-formulario.png"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Baixar QR Code
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Municipal Templates Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-3xl p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full text-[10px] font-black uppercase">
                    Modelos Pré-configurados
                  </span>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-1">
                    Modelos Oficiais de Secretarias
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Selecione um modelo pronto para acelerar a criação do formulário municipal.
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TEMPLATE_PRESETS.map(tpl => (
                  <div
                    key={tpl.id}
                    className="p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-3 flex flex-col justify-between transition-all group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full">
                          {tpl.category}
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          {tpl.badge}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {tpl.title}
                      </h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCreateFromTemplate(tpl.id)}
                      className="w-full py-2.5 bg-white dark:bg-neutral-900 hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-950 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Usar este Modelo
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
