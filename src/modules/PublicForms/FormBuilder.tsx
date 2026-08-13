import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Save, Eye, Share2, Settings, Plus, Trash2, Copy, 
  ChevronUp, ChevronDown, CheckCircle2, AlignLeft, Type, CheckSquare, 
  ListOrdered, Star, Smile, Sliders, ShieldCheck, Phone, MapPin, 
  Calendar, Clock, Upload, Heading, ToggleRight, Sparkles, QrCode, 
  Download, ExternalLink, Link2, MessageSquare, Check, X, Layers,
  Lock, AlertCircle, HelpCircle, Palette
} from 'lucide-react';
import { PublicForm, FormField, FormFieldType, Institution } from '../../types';
import { FORM_THEMES, FIELD_TYPE_CONFIGS, FormTheme } from './types';
import { showToast } from '../../components/ui/Toast';

interface FormBuilderProps {
  initialForm?: PublicForm;
  onSave: (form: PublicForm) => Promise<void> | void;
  onBack: () => void;
  institution?: Institution | null;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  initialForm,
  onSave,
  onBack,
  institution
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'share' | 'settings'>('editor');
  const [saving, setSaving] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const [formData, setFormData] = useState<PublicForm>(() => {
    if (initialForm) return { ...initialForm };
    return {
      id: crypto.randomUUID(),
      title: 'Novo Formulário para a População',
      description: 'Preencha este formulário para nos ajudar a aprimorar os serviços públicos do nosso município.',
      category: 'Geral',
      slug: 'formulario-cidadao',
      cover_theme: 'blue_ocean',
      status: 'published',
      is_anonymous: false,
      require_cpf: false,
      thank_you_title: 'Obrigado pela sua resposta!',
      thank_you_message: 'Sua contribuição foi registrada com sucesso e faz a diferença para a nossa cidade.',
      questions: [
        {
          id: 'q_nome_1',
          type: 'text',
          label: 'Qual é o seu nome completo?',
          placeholder: 'Digite seu nome',
          required: true
        },
        {
          id: 'q_bairro_1',
          type: 'neighborhood',
          label: 'Em qual bairro você reside?',
          required: true
        },
        {
          id: 'q_estrelas_1',
          type: 'rating_stars',
          label: 'Como você avalia a qualidade geral dos serviços em sua região?',
          required: true,
          min: 1,
          max: 5
        },
        {
          id: 'q_sugestoes_1',
          type: 'textarea',
          label: 'Deixe aqui sua sugestão ou reivindicação prioritária:',
          placeholder: 'Escreva seus comentários...',
          required: false
        }
      ]
    };
  });

  const currentTheme: FormTheme = FORM_THEMES[formData.cover_theme] || FORM_THEMES.blue_ocean;
  const baseUrl = window.location.origin;
  const publicFormUrl = `${baseUrl}/formulario/${formData.id}`;

  const handleSave = async () => {
    if (!formData.title.trim()) {
      showToast('Por favor, informe um título para o formulário.', 'warning');
      return;
    }
    if (formData.questions.length === 0) {
      showToast('Adicione pelo menos uma pergunta ao formulário.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        updated_at: new Date().toISOString()
      });
      showToast('Formulário salvo com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar formulário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = (type: FormFieldType) => {
    const typeConfig = FIELD_TYPE_CONFIGS.find(c => c.type === type);
    const newField: FormField = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      label: typeConfig ? `Nova pergunta de ${typeConfig.label}` : 'Título da pergunta',
      placeholder: '',
      required: type !== 'section_header',
      options: ['radio', 'checkbox', 'select'].includes(type) 
        ? ['Opção 1', 'Opção 2', 'Opção 3'] 
        : undefined,
      min: type === 'rating_stars' ? 1 : (type === 'scale_nps' ? 0 : undefined),
      max: type === 'rating_stars' ? 5 : (type === 'scale_nps' ? 10 : undefined),
      allowOther: ['radio', 'checkbox'].includes(type)
    };

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newField]
    }));
    setSelectedFieldId(newField.id);
    setShowAddMenu(false);
    showToast(`Campo "${typeConfig?.label || type}" adicionado.`, 'info');
  };

  const updateQuestion = (id: string, patch: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, ...patch } : q)
    }));
  };

  const removeQuestion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
    showToast('Pergunta removida.', 'info');
  };

  const duplicateQuestion = (id: string) => {
    const qIndex = formData.questions.findIndex(q => q.id === id);
    if (qIndex === -1) return;
    const target = formData.questions[qIndex];
    const duplicated: FormField = {
      ...target,
      id: `q_${Date.now()}_dup`,
      label: `${target.label} (Cópia)`
    };
    const nextQuestions = [...formData.questions];
    nextQuestions.splice(qIndex + 1, 0, duplicated);
    setFormData(prev => ({ ...prev, questions: nextQuestions }));
    setSelectedFieldId(duplicated.id);
    showToast('Pergunta duplicada.', 'info');
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.questions.length) return;
    const list = [...formData.questions];
    const item = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = item;
    setFormData(prev => ({ ...prev, questions: list }));
  };

  const addOption = (questionId: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId) {
          const opts = q.options || [];
          return {
            ...q,
            options: [...opts, `Opção ${opts.length + 1}`]
          };
        }
        return q;
      })
    }));
  };

  const updateOption = (questionId: string, optIndex: number, val: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId && q.options) {
          const nextOpts = [...q.options];
          nextOpts[optIndex] = val;
          return { ...q, options: nextOpts };
        }
        return q;
      })
    }));
  };

  const removeOption = (questionId: string, optIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === questionId && q.options) {
          return {
            ...q,
            options: q.options.filter((_, idx) => idx !== optIndex)
          };
        }
        return q;
      })
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Link copiado para a área de transferência!', 'success');
  };

  const shareOnWhatsApp = () => {
    const msg = `📢 *${formData.title}*\n\nPrezado(a) cidadão(ã), sua opinião é muito importante para nossa cidade! Por favor, responda nosso formulário rápido através do link abaixo:\n\n👉 ${publicFormUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getFieldIcon = (type: FormFieldType) => {
    switch (type) {
      case 'text': return <Type size={18} className="text-blue-500" />;
      case 'textarea': return <AlignLeft size={18} className="text-indigo-500" />;
      case 'radio': return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'checkbox': return <CheckSquare size={18} className="text-teal-500" />;
      case 'select': return <ListOrdered size={18} className="text-purple-500" />;
      case 'yes_no': return <ToggleRight size={18} className="text-orange-500" />;
      case 'rating_stars': return <Star size={18} className="text-amber-500" />;
      case 'rating_emojis': return <Smile size={18} className="text-pink-500" />;
      case 'scale_nps': return <Sliders size={18} className="text-violet-500" />;
      case 'cpf': return <ShieldCheck size={18} className="text-sky-500" />;
      case 'phone': return <Phone size={18} className="text-green-500" />;
      case 'neighborhood': return <MapPin size={18} className="text-red-500" />;
      case 'date': return <Calendar size={18} className="text-amber-600" />;
      case 'time': return <Clock size={18} className="text-blue-400" />;
      case 'file_link': return <Upload size={18} className="text-neutral-500" />;
      case 'section_header': return <Heading size={18} className="text-purple-600" />;
      default: return <Type size={18} />;
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col space-y-6 animate-in fade-in duration-300">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 shadow-sm sticky top-2 z-30 backdrop-blur-md bg-white/90 dark:bg-neutral-900/90">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors text-neutral-600 dark:text-neutral-300"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${currentTheme.badgeBg} ${currentTheme.badgeText}`}>
                {formData.category || 'Geral'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${formData.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                {formData.status === 'published' ? 'Ativo / Publicado' : (formData.status === 'draft' ? 'Rascunho' : 'Encerrado')}
              </span>
            </div>
            <h2 className="text-base font-black text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-md">
              {formData.title || 'Formulário sem título'}
            </h2>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'editor'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Layers size={14} /> Construtor
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Eye size={14} /> Visualizar
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'share'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Share2 size={14} /> Divulgação & Links
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Settings size={14} /> Configurações
          </button>
        </div>

        {/* Save CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r ${currentTheme.gradient} hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Salvar Formulário
          </button>
        </div>
      </div>

      {/* Main Content by Tab */}
      {activeTab === 'editor' && (
        <div className="max-w-4xl mx-auto w-full space-y-6 pb-28">
          {/* Header Card / Cover Styling */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden transition-all">
            {/* Gradient Banner */}
            <div className={`h-24 bg-gradient-to-r ${currentTheme.gradient} p-6 flex items-center justify-between text-white relative`}>
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                  <Sparkles size={22} className="text-white" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Gestão Forms 360 · Prefeitura Municipal</p>
                  <p className="text-sm font-bold text-white">{institution?.name || 'Prefeitura Municipal'}</p>
                </div>
              </div>

              {/* Theme Selector Pill */}
              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
                <Palette size={14} className="text-white/80" />
                <span className="text-[11px] font-bold text-white mr-1 hidden sm:inline">Tema:</span>
                <div className="flex gap-1">
                  {Object.values(FORM_THEMES).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setFormData(prev => ({ ...prev, cover_theme: t.id }))}
                      title={t.name}
                      className={`w-5 h-5 rounded-full bg-gradient-to-r ${t.gradient} border-2 transition-transform ${
                        formData.cover_theme === t.id ? 'border-white scale-125 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Title & Description Fields */}
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  Título Principal do Formulário / Pesquisa
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Pesquisa de Satisfação · Saúde Municipal"
                  className="w-full text-2xl font-black text-neutral-900 dark:text-white bg-transparent border-b-2 border-neutral-200 dark:border-neutral-800 focus:border-blue-600 dark:focus:border-blue-500 outline-none pb-2 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  Descrição e Orientações para o Cidadão
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explique o objetivo deste formulário para a população..."
                  rows={3}
                  className="w-full text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 focus:border-blue-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Secretaria / Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none text-neutral-800 dark:text-neutral-200"
                  >
                    <option value="Geral">Geral / Gabinete</option>
                    <option value="Saúde">Secretaria de Saúde</option>
                    <option value="Educação">Secretaria de Educação</option>
                    <option value="Serviços Públicos">Serviços Públicos & Obras</option>
                    <option value="Finanças & Planejamento">Orçamento & Planejamento</option>
                    <option value="Assistência Social">Assistência Social</option>
                    <option value="Meio Ambiente">Meio Ambiente</option>
                    <option value="Cultura & Esporte">Cultura, Esporte e Turismo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Identificação do Respondente
                  </label>
                  <div className="mt-1.5 flex items-center gap-4 py-2.5 px-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formData.require_cpf}
                        onChange={e => setFormData({ ...formData, require_cpf: e.target.checked })}
                        className="rounded accent-blue-600"
                      />
                      <span className="font-bold text-neutral-700 dark:text-neutral-300">Exigir CPF</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer ml-auto">
                      <input 
                        type="checkbox"
                        checked={formData.is_anonymous}
                        onChange={e => setFormData({ ...formData, is_anonymous: e.target.checked })}
                        className="rounded accent-blue-600"
                      />
                      <span className="font-bold text-neutral-700 dark:text-neutral-300">Permitir Anonimato</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {formData.questions.map((question, index) => {
              const isSelected = selectedFieldId === question.id;
              const isSectionHeader = question.type === 'section_header';

              return (
                <motion.div
                  key={question.id}
                  layout
                  onClick={() => setSelectedFieldId(question.id)}
                  className={`bg-white dark:bg-neutral-900 rounded-[28px] border transition-all p-6 sm:p-8 space-y-6 relative ${
                    isSelected 
                      ? 'border-blue-500 shadow-xl ring-4 ring-blue-500/10' 
                      : 'border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  {/* Top Bar of Card */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-500">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
                        {getFieldIcon(question.type)}
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          {FIELD_TYPE_CONFIGS.find(c => c.type === question.type)?.label || question.type}
                        </span>
                      </div>
                    </div>

                    {/* Field Type Selector dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        value={question.type}
                        onChange={e => updateQuestion(question.id, { 
                          type: e.target.value as FormFieldType,
                          options: ['radio', 'checkbox', 'select'].includes(e.target.value) 
                            ? (question.options || ['Opção 1', 'Opção 2']) 
                            : undefined
                        })}
                        className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold rounded-xl px-3 py-1.5 outline-none text-neutral-700 dark:text-neutral-300"
                      >
                        {FIELD_TYPE_CONFIGS.map(cfg => (
                          <option key={cfg.type} value={cfg.type}>{cfg.label}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveQuestion(index, 'up'); }}
                          disabled={index === 0}
                          className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 text-neutral-500"
                          title="Mover para cima"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveQuestion(index, 'down'); }}
                          disabled={index === formData.questions.length - 1}
                          className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 text-neutral-500"
                          title="Mover para baixo"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Question Content Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                        {isSectionHeader ? 'Título da Seção' : 'Enunciado da Pergunta'}
                      </label>
                      <input
                        type="text"
                        value={question.label}
                        onChange={e => updateQuestion(question.id, { label: e.target.value })}
                        placeholder="Ex: Como você avalia o atendimento médico?"
                        className="w-full text-base font-bold text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                        Texto de Ajuda / Subtítulo (Opcional)
                      </label>
                      <input
                        type="text"
                        value={question.description || ''}
                        onChange={e => updateQuestion(question.id, { description: e.target.value })}
                        placeholder="Ex: Selecione apenas uma opção ou relate com detalhes..."
                        className="w-full text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 focus:border-blue-500 outline-none"
                      />
                    </div>

                    {/* Specific Field Controls for Options (Radio, Checkbox, Select) */}
                    {['radio', 'checkbox', 'select'].includes(question.type) && (
                      <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                          Alternativas de Resposta
                        </label>
                        <div className="space-y-2">
                          {(question.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-neutral-400">
                                {question.type === 'radio' && <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 inline-block" />}
                                {question.type === 'checkbox' && <span className="w-3.5 h-3.5 rounded border border-neutral-300 inline-block" />}
                                {question.type === 'select' && <span className="text-xs font-bold">{optIdx + 1}.</span>}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={e => updateOption(question.id, optIdx, e.target.value)}
                                className="flex-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:border-blue-500 outline-none"
                              />
                              {(question.options || []).length > 1 && (
                                <button
                                  onClick={() => removeOption(question.id, optIdx)}
                                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                                  title="Remover opção"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 pt-1">
                          <button
                            onClick={() => addOption(question.id)}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Plus size={14} /> Adicionar Opção
                          </button>
                          {['radio', 'checkbox'].includes(question.type) && (
                            <label className="text-xs font-bold text-neutral-500 flex items-center gap-1.5 cursor-pointer ml-auto">
                              <input
                                type="checkbox"
                                checked={question.allowOther || false}
                                onChange={e => updateQuestion(question.id, { allowOther: e.target.checked })}
                                className="rounded accent-blue-600"
                              />
                              Permitir campo "Outro (especifique)"
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preview indicator for special fields */}
                    {question.type === 'rating_stars' && (
                      <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Escala de 1 a 5 estrelas</span>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(st => (
                            <Star key={st} size={22} className="text-amber-400 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                    )}

                    {question.type === 'rating_emojis' && (
                      <div className="p-4 bg-pink-50/50 dark:bg-pink-950/20 rounded-2xl border border-pink-200/50 dark:border-pink-800/40 flex items-center justify-between">
                        <span className="text-xs font-bold text-pink-800 dark:text-pink-300">Escala de Emojis de Satisfação</span>
                        <div className="flex gap-3 text-2xl">
                          <span>😡</span>
                          <span>🙁</span>
                          <span>😐</span>
                          <span>😊</span>
                          <span>🤩</span>
                        </div>
                      </div>
                    )}

                    {question.type === 'scale_nps' && (
                      <div className="p-4 bg-violet-50/50 dark:bg-violet-950/20 rounded-2xl border border-violet-200/50 dark:border-violet-800/40 space-y-2">
                        <div className="flex justify-between text-[11px] font-bold text-violet-800 dark:text-violet-300">
                          <span>0 - Jamais recomendaria</span>
                          <span>10 - Altamente recomendado</span>
                        </div>
                        <div className="grid grid-cols-11 gap-1">
                          {Array.from({ length: 11 }).map((_, n) => (
                            <div key={n} className="py-2 bg-white dark:bg-neutral-800 rounded-lg text-center text-xs font-bold text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                              {n}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {question.type === 'neighborhood' && (
                      <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-200/40 dark:border-red-800/30 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                        <MapPin size={16} /> O cidadão selecionará o bairro ou digitará caso resida em zona rural/comunidade.
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer Actions of Question Card */}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
                    <div className="flex items-center gap-2">
                      {!isSectionHeader && (
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700 dark:text-neutral-300">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={e => updateQuestion(question.id, { required: e.target.checked })}
                            className="rounded accent-blue-600 w-4 h-4"
                          />
                          Campo Obrigatório
                        </label>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => duplicateQuestion(question.id)}
                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-500 transition-colors"
                        title="Duplicar pergunta"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => removeQuestion(question.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-red-500 transition-colors"
                        title="Excluir pergunta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </div>

            {/* Add Question Button / Floating Menu */}
            <div className="relative pt-4 flex flex-col items-center">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className={`px-8 py-4 rounded-3xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r ${currentTheme.gradient} hover:scale-105 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3`}
              >
                <Plus size={20} />
                Adicionar Nova Pergunta
              </button>

              <AnimatePresence>
                {showAddMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute bottom-20 w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[32px] p-6 shadow-2xl z-40 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-neutral-900 dark:text-white">Escolha o Tipo de Campo</h4>
                        <p className="text-xs text-neutral-500">Selecione o formato mais adequado para coletar os dados do cidadão</p>
                      </div>
                      <button 
                        onClick={() => setShowAddMenu(false)}
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                      {FIELD_TYPE_CONFIGS.map(cfg => (
                        <button
                          key={cfg.type}
                          onClick={() => addQuestion(cfg.type)}
                          className="flex items-start gap-3 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/80 border border-neutral-100 dark:border-neutral-800 text-left transition-all group"
                        >
                          <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 group-hover:scale-110 transition-transform">
                            {getFieldIcon(cfg.type)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-neutral-900 dark:text-white">{cfg.label}</p>
                            <p className="text-[10px] text-neutral-400 leading-tight mt-0.5 line-clamp-2">{cfg.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
      )}

      {/* Preview Tab (Live citizen simulator) */}
      {activeTab === 'preview' && (
        <div className="max-w-2xl mx-auto w-full space-y-6 pb-20">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
            <span className="flex items-center gap-2 font-bold">
              <Eye size={16} /> Modo de Visualização · Simulador para o Cidadão
            </span>
            <span className="text-[11px] bg-blue-200 dark:bg-blue-900/60 px-2.5 py-1 rounded-full font-black uppercase">
              Mobile & Desktop
            </span>
          </div>

          {/* Render form exactly as public */}
          <div className="bg-white dark:bg-neutral-900 rounded-[36px] border border-neutral-200/80 dark:border-neutral-800 shadow-2xl overflow-hidden">
            {/* Header Banner */}
            <div className={`p-8 bg-gradient-to-r ${currentTheme.gradient} text-white space-y-3 relative`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider">
                <ShieldCheck size={14} /> Formulário Oficial · {institution?.name || 'Prefeitura'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">{formData.title}</h1>
              {formData.description && (
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
                  {formData.description}
                </p>
              )}
            </div>

            {/* Form Fields Simulation */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* Optional Identification info box */}
              {formData.require_cpf && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Seu CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    disabled
                    className="w-full bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm opacity-80"
                  />
                </div>
              )}

              {formData.questions.map((q, idx) => (
                <div key={q.id} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <span>{idx + 1}. {q.label}</span>
                      {q.required && <span className="text-red-500">*</span>}
                    </label>
                    {q.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{q.description}</p>
                    )}
                  </div>

                  {/* Render based on type */}
                  {q.type === 'text' && (
                    <input
                      type="text"
                      placeholder={q.placeholder || 'Sua resposta'}
                      disabled
                      className="w-full bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm opacity-80"
                    />
                  )}

                  {q.type === 'textarea' && (
                    <textarea
                      placeholder={q.placeholder || 'Sua resposta detalhada...'}
                      rows={3}
                      disabled
                      className="w-full bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm opacity-80 resize-none"
                    />
                  )}

                  {q.type === 'radio' && (
                    <div className="space-y-2">
                      {(q.options || []).map((opt, i) => (
                        <div key={i} className="flex items-center gap-3 p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80">
                          <input type="radio" name={`prev_${q.id}`} disabled className="accent-blue-600 w-4 h-4" />
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'checkbox' && (
                    <div className="space-y-2">
                      {(q.options || []).map((opt, i) => (
                        <div key={i} className="flex items-center gap-3 p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80">
                          <input type="checkbox" disabled className="accent-blue-600 w-4 h-4 rounded" />
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'select' && (
                    <select disabled className="w-full bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold">
                      <option>Selecione uma opção...</option>
                      {(q.options || []).map((opt, i) => (
                        <option key={i}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {q.type === 'rating_stars' && (
                    <div className="flex gap-3 py-2">
                      {[1, 2, 3, 4, 5].map(st => (
                        <button key={st} className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-amber-400">
                          <Star size={26} className="fill-amber-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'rating_emojis' && (
                    <div className="flex justify-between gap-2 py-2">
                      {[
                        { e: '😡', l: 'Péssimo' },
                        { e: '🙁', l: 'Ruim' },
                        { e: '😐', l: 'Regular' },
                        { e: '😊', l: 'Bom' },
                        { e: '🤩', l: 'Excelente' }
                      ].map((item, i) => (
                        <div key={i} className="flex-1 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center space-y-1">
                          <div className="text-2xl">{item.e}</div>
                          <div className="text-[10px] font-bold text-neutral-500">{item.l}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'scale_nps' && (
                    <div className="grid grid-cols-11 gap-1 py-2">
                      {Array.from({ length: 11 }).map((_, n) => (
                        <div key={n} className="py-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-center text-xs font-black text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                          {n}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'yes_no' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="py-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center text-xs">
                        Sim
                      </div>
                      <div className="py-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-black rounded-2xl border border-red-200 dark:border-red-800 text-center text-xs">
                        Não
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                disabled
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white bg-gradient-to-r ${currentTheme.gradient} opacity-90 shadow-lg`}
              >
                Enviar Resposta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share & QR Code Tab */}
      {activeTab === 'share' && (
        <div className="max-w-4xl mx-auto w-full space-y-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Links & Quick Dissemination */}
            <div className="md:col-span-2 space-y-6">
              {/* Public Link Card */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="space-y-1">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Link Direto Oficial
                  </span>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">Compartilhe com a População</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Envie este link nas redes sociais da Prefeitura, grupos de WhatsApp dos bairros ou no site oficial.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                  <Link2 size={18} className="text-neutral-400 ml-2 shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={publicFormUrl}
                    className="w-full bg-transparent text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 outline-none truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(publicFormUrl)}
                    className="px-4 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity shrink-0 flex items-center gap-1.5"
                  >
                    <Copy size={13} /> Copiar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={shareOnWhatsApp}
                    className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <MessageSquare size={16} /> Disparar no WhatsApp
                  </button>

                  <a
                    href={publicFormUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all"
                  >
                    <ExternalLink size={16} /> Abrir Página Pública
                  </a>
                </div>
              </div>

              {/* Embed / Iframe Card */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-neutral-900 dark:text-white">Inserir no Portal da Prefeitura (Embed / Iframe)</h4>
                  <p className="text-xs text-neutral-500">Cole este código HTML para exibir o formulário diretamente dentro do site do município.</p>
                </div>

                <div className="bg-neutral-950 p-4 rounded-2xl font-mono text-[11px] text-emerald-400 overflow-x-auto relative">
                  <code>{`<iframe src="${publicFormUrl}" width="100%" height="800" frameborder="0"></iframe>`}</code>
                  <button
                    onClick={() => copyToClipboard(`<iframe src="${publicFormUrl}" width="100%" height="800" frameborder="0"></iframe>`)}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-[10px] font-bold"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>

            {/* Right: QR Code for Printing on Flyers / Posters */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm text-center space-y-4">
                <div className="space-y-1">
                  <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Cartazes & Murais
                  </span>
                  <h4 className="text-base font-black text-neutral-900 dark:text-white">QR Code para Impressão</h4>
                  <p className="text-[11px] text-neutral-500">Imprima em postos de saúde, escolas ou balcões da prefeitura.</p>
                </div>

                {/* Simulated High-Res QR Code */}
                <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-inner flex flex-col items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicFormUrl)}&color=0-0-0&bgcolor=255-255-255`}
                    alt="QR Code do Formulário"
                    className="w-44 h-44 rounded-xl"
                  />
                  <p className="text-[10px] font-mono text-neutral-400 mt-2 font-bold">Aponte a câmera do celular</p>
                </div>

                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicFormUrl)}`}
                  download={`qrcode-${formData.slug || 'formulario'}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Download size={14} /> Baixar QR Code (PNG)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl mx-auto w-full space-y-6 pb-20">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Regras e Vigência do Formulário</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Status de Publicação
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none text-neutral-800 dark:text-neutral-200"
                  >
                    <option value="published">🟢 Publicado (Recebendo respostas)</option>
                    <option value="draft">🟡 Rascunho (Privado / Em edição)</option>
                    <option value="closed">🔴 Encerrado (Prazo finalizado)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Limite Máximo de Respostas (Vagas)
                  </label>
                  <input
                    type="number"
                    value={formData.max_responses || ''}
                    onChange={e => setFormData({ ...formData, max_responses: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Ex: 500 (Vazio = Ilimitado)"
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Data de Abertura
                  </label>
                  <input
                    type="date"
                    value={formData.start_date || ''}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none text-neutral-800 dark:text-neutral-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Data de Encerramento (Prazo)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full mt-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Mensagem de Agradecimento (Tela de Sucesso)</h4>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Título de Sucesso</label>
                  <input
                    type="text"
                    value={formData.thank_you_title || ''}
                    onChange={e => setFormData({ ...formData, thank_you_title: e.target.value })}
                    placeholder="Ex: Obrigado pela sua participação!"
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none text-neutral-800 dark:text-neutral-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Mensagem de Confirmação</label>
                  <textarea
                    value={formData.thank_you_message || ''}
                    onChange={e => setFormData({ ...formData, thank_you_message: e.target.value })}
                    rows={2}
                    placeholder="Ex: Sua resposta foi registrada no banco oficial de consultas públicas..."
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl text-xs font-medium outline-none text-neutral-800 dark:text-neutral-200 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Link de Redirecionamento (Opcional)</label>
                  <input
                    type="text"
                    value={formData.redirect_url || ''}
                    onChange={e => setFormData({ ...formData, redirect_url: e.target.value })}
                    placeholder="https://prefeitura.gov.br ou link do canal do WhatsApp"
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
