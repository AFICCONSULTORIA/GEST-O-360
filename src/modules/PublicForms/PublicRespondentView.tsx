import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, CheckCircle2, Star, Smile, AlertCircle, Copy, 
  Send, Sparkles, Building2, MapPin, Phone, User, ExternalLink, 
  Sun, Moon, ArrowRight, RotateCcw, Check, Clock
} from 'lucide-react';
import { PublicForm, FormResponse, Institution } from '../../types';
import { FORM_THEMES, COMMON_MUNICIPAL_NEIGHBORHOODS, generateProtocol, FormTheme } from './types';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';

interface PublicRespondentViewProps {
  form: PublicForm;
  institution?: Institution | null;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onSubmitSuccess?: (response: FormResponse) => void;
}

export const PublicRespondentView: React.FC<PublicRespondentViewProps> = ({
  form,
  institution,
  darkMode = false,
  onToggleDarkMode,
  onSubmitSuccess
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentCpf, setRespondentCpf] = useState('');
  const [respondentPhone, setRespondentPhone] = useState('');
  const [respondentNeighborhood, setRespondentNeighborhood] = useState('');
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(form.is_anonymous);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedResponse, setSubmittedResponse] = useState<FormResponse | null>(null);

  const theme: FormTheme = FORM_THEMES[form.cover_theme] || FORM_THEMES.blue_ocean;

  // Mask Helpers
  const formatCPF = (val: string) => {
    let v = val.replace(/\D/g, '').substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v;
  };

  const formatPhone = (val: string) => {
    let v = val.replace(/\D/g, '').substring(0, 11);
    if (v.length > 10) {
      return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (v.length > 5) {
      return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (v.length > 2) {
      return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    }
    return v;
  };

  // Progress Calculation
  const progressPercent = useMemo(() => {
    const requiredQuestions = form.questions.filter(q => q.required && q.type !== 'section_header');
    if (requiredQuestions.length === 0) return 100;

    let filledCount = 0;
    requiredQuestions.forEach(q => {
      const val = answers[q.id];
      if (val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        filledCount++;
      }
    });

    return Math.round((filledCount / requiredQuestions.length) * 100);
  }, [form, answers]);

  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: val }));
    if (errors[questionId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (questionId: string, option: string) => {
    setAnswers(prev => {
      const currentList: string[] = prev[questionId] || [];
      if (currentList.includes(option)) {
        return { ...prev, [questionId]: currentList.filter(item => item !== option) };
      } else {
        return { ...prev, [questionId]: [...currentList, option] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate Identification if required
    if (form.require_cpf && !isAnonymous) {
      if (!respondentCpf || respondentCpf.replace(/\D/g, '').length !== 11) {
        newErrors['cpf'] = 'Por favor, informe um CPF válido com 11 dígitos.';
      }
    }

    // Validate Required Questions
    form.questions.forEach(q => {
      if (q.required && q.type !== 'section_header') {
        const val = answers[q.id];
        if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[q.id] = 'Esta pergunta é de preenchimento obrigatório.';
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Por favor, preencha todos os campos obrigatórios destacados.', 'warning');
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.getElementById(`field_${firstErrorKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    const protocol = generateProtocol();
    const resolvedNeighborhood = respondentNeighborhood === 'Outro' ? customNeighborhood : respondentNeighborhood;

    const responsePayload: FormResponse = {
      id: crypto.randomUUID(),
      form_id: form.id,
      institution_id: institution?.id,
      respondent_name: isAnonymous ? 'Anônimo' : (respondentName || 'Cidadão'),
      respondent_cpf: isAnonymous ? undefined : respondentCpf,
      respondent_phone: isAnonymous ? undefined : respondentPhone,
      respondent_neighborhood: resolvedNeighborhood || undefined,
      answers,
      protocol,
      created_at: new Date().toISOString()
    };

    try {
      // 1. Try Supabase insert
      const { error } = await supabase.from('public_form_responses').insert({
        id: responsePayload.id,
        form_id: responsePayload.form_id,
        institution_id: responsePayload.institution_id || null,
        respondent_name: responsePayload.respondent_name,
        respondent_cpf: responsePayload.respondent_cpf || null,
        respondent_phone: responsePayload.respondent_phone || null,
        respondent_neighborhood: responsePayload.respondent_neighborhood || null,
        answers: responsePayload.answers,
        protocol: responsePayload.protocol
      });

      if (error) {
        console.warn('Erro ao salvar no Supabase, mantendo persistência local:', error);
      }

      // 2. LocalStorage backup
      const localKey = `gestao360_form_responses_${form.id}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      localStorage.setItem(localKey, JSON.stringify([responsePayload, ...existing]));

      setSubmittedResponse(responsePayload);
      if (onSubmitSuccess) onSubmitSuccess(responsePayload);
      showToast('Sua resposta foi enviada com sucesso!', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      showToast('Ocorreu um erro ao enviar sua resposta. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyProtocol = () => {
    if (submittedResponse?.protocol) {
      navigator.clipboard.writeText(submittedResponse.protocol);
      showToast('Número do Protocolo copiado!', 'success');
    }
  };

  // Check if form is closed
  if (form.status === 'closed') {
    return (
      <div className={`min-h-dvh flex items-center justify-center p-4 ${darkMode ? 'dark bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-900'}`}>
        <div className="bg-white dark:bg-neutral-900 max-w-lg w-full p-8 sm:p-10 rounded-[32px] border border-neutral-200 dark:border-neutral-800 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
            <Clock size={32} />
          </div>
          <h2 className="text-2xl font-black">Formulário Encerrado</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            O período de participação desta consulta pública já foi concluído. Agradecemos o interesse em colaborar com nossa cidade!
          </p>
          <div className="pt-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Voltar ao Portal Principal
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Thank You / Success Screen
  if (submittedResponse) {
    return (
      <div className={`min-h-dvh flex items-center justify-center p-4 ${darkMode ? 'dark bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-neutral-900 max-w-xl w-full p-8 sm:p-12 rounded-[40px] border border-neutral-200/80 dark:border-neutral-800 shadow-2xl text-center space-y-8"
        >
          {/* Animated Success Badge */}
          <div className="relative w-24 h-24 mx-auto">
            <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} rounded-full blur-xl opacity-40 animate-pulse`} />
            <div className={`relative w-24 h-24 bg-gradient-to-r ${theme.gradient} rounded-full flex items-center justify-center text-white shadow-xl`}>
              <CheckCircle2 size={48} className="stroke-[2.5]" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
              Participação Confirmada
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {form.thank_you_title || 'Obrigado pela sua resposta!'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-md mx-auto">
              {form.thank_you_message || 'Sua contribuição foi registrada com sucesso e ajudará a aprimorar as ações da Prefeitura.'}
            </p>
          </div>

          {/* Official Receipt Card */}
          <div className="p-6 bg-neutral-50 dark:bg-neutral-800/60 rounded-3xl border border-neutral-200/80 dark:border-neutral-700/80 space-y-3 text-left">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-bold border-b border-neutral-200 dark:border-neutral-700/60 pb-2">
              <span>COMPROVANTE OFICIAL</span>
              <span>{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-neutral-400">Protocolo da Resposta</p>
                <p className="text-base sm:text-lg font-mono font-black text-blue-600 dark:text-blue-400">
                  {submittedResponse.protocol}
                </p>
              </div>
              <button
                onClick={copyProtocol}
                className="px-3.5 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Copy size={13} /> Copiar
              </button>
            </div>

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Guarde este protocolo para acompanhar audiências públicas e consultas da gestão municipal.
            </p>
          </div>

          {/* Next Steps / Redirection Buttons */}
          <div className="space-y-3 pt-2">
            {form.redirect_url ? (
              <a
                href={form.redirect_url}
                className={`w-full py-4 bg-gradient-to-r ${theme.gradient} text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:opacity-95 transition-opacity`}
              >
                Continuar para o Portal <ArrowRight size={16} />
              </a>
            ) : null}

            <button
              onClick={() => {
                setSubmittedResponse(null);
                setAnswers({});
                setRespondentName('');
                setRespondentCpf('');
                setRespondentPhone('');
                setRespondentNeighborhood('');
              }}
              className="w-full py-3.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Enviar Outra Resposta
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-dvh ${darkMode ? 'dark bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'} selection:bg-blue-500/30 transition-colors duration-300 font-sans pb-24`}>
      {/* Top Navbar */}
      <nav className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/60 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {institution?.logo_url ? (
              <img src={institution.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl flex items-center justify-center font-black text-xs shadow-md">
                <Building2 size={16} />
              </div>
            )}
            <div>
              <h1 className="text-xs font-black tracking-tight leading-none text-neutral-900 dark:text-white">
                {institution?.name || 'Prefeitura Municipal'}
              </h1>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-bold">Portal de Consultas & Formulários Populares</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-500 transition-colors"
                title="Alternar Tema"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 relative overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
            className={`h-full bg-gradient-to-r ${theme.gradient}`}
          />
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Header Hero Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200/80 dark:border-neutral-800 shadow-xl overflow-hidden">
          <div className={`p-6 sm:p-10 bg-gradient-to-r ${theme.gradient} text-white space-y-3 relative`}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider">
                <ShieldCheck size={14} /> Consulta Oficial · {form.category}
              </span>
              <span className="text-[11px] font-bold text-white/80">
                Progresso: {progressPercent}%
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {form.title}
            </h1>

            {form.description && (
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium pt-1">
                {form.description}
              </p>
            )}
          </div>
        </div>

        {/* Identification Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200/80 dark:border-neutral-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <User size={16} className="text-blue-500" /> Identificação do Cidadão
              </h3>
              <p className="text-xs text-neutral-500">
                {form.is_anonymous ? 'Você pode responder de forma identificada ou anônima.' : 'Suas informações são protegidas e utilizadas apenas para fins estatísticos.'}
              </p>
            </div>

            {form.is_anonymous && (
              <label className="flex items-center gap-2 cursor-pointer bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  className="rounded accent-blue-600"
                />
                Responder Anonimamente
              </label>
            )}
          </div>

          {!isAnonymous && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={respondentName}
                  onChange={e => setRespondentName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                />
              </div>

              <div id="field_cpf" className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center justify-between">
                  <span>CPF {form.require_cpf && <span className="text-red-500">*</span>}</span>
                  {errors['cpf'] && <span className="text-red-500 font-bold lowercase">{errors['cpf']}</span>}
                </label>
                <input
                  type="text"
                  value={respondentCpf}
                  onChange={e => {
                    setRespondentCpf(formatCPF(e.target.value));
                    if (errors['cpf']) setErrors(prev => { const next = { ...prev }; delete next['cpf']; return next; });
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`w-full bg-neutral-50 dark:bg-neutral-800 border px-4 py-3 rounded-2xl text-xs font-mono font-bold outline-none dark:text-white ${
                    errors['cpf'] ? 'border-red-500 ring-2 ring-red-500/20' : 'border-neutral-200 dark:border-neutral-700 focus:border-blue-500'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  WhatsApp / Telefone (Opcional)
                </label>
                <input
                  type="text"
                  value={respondentPhone}
                  onChange={e => setRespondentPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono font-bold outline-none focus:border-blue-500 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Bairro ou Região de Moradia
                </label>
                <select
                  value={respondentNeighborhood}
                  onChange={e => setRespondentNeighborhood(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                >
                  <option value="">Selecione seu bairro...</option>
                  {COMMON_MUNICIPAL_NEIGHBORHOODS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {respondentNeighborhood === 'Outro' && (
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Especifique sua Comunidade / Assentamento / Bairro
                  </label>
                  <input
                    type="text"
                    value={customNeighborhood}
                    onChange={e => setCustomNeighborhood(e.target.value)}
                    placeholder="Ex: Comunidade São João"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.questions.map((question, idx) => {
            const hasError = !!errors[question.id];
            const currentAnswer = answers[question.id];

            if (question.type === 'section_header') {
              return (
                <div key={question.id} className="pt-6 pb-2">
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white border-b-2 border-neutral-200 dark:border-neutral-800 pb-2">
                    {question.label}
                  </h3>
                  {question.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{question.description}</p>
                  )}
                </div>
              );
            }

            return (
              <motion.div
                key={question.id}
                id={`field_${question.id}`}
                layout
                className={`bg-white dark:bg-neutral-900 rounded-[28px] border p-6 sm:p-8 space-y-4 shadow-sm transition-all ${
                  hasError 
                    ? 'border-red-500 ring-4 ring-red-500/10' 
                    : 'border-neutral-200/80 dark:border-neutral-800'
                }`}
              >
                {/* Question Label */}
                <div className="space-y-1">
                  <label className="text-sm sm:text-base font-black text-neutral-900 dark:text-white flex items-start gap-2">
                    <span className="text-neutral-400 font-mono text-xs mt-0.5">{idx + 1}.</span>
                    <span>{question.label}</span>
                    {question.required && <span className="text-red-500 text-sm">*</span>}
                  </label>
                  {question.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 pl-5">
                      {question.description}
                    </p>
                  )}
                  {hasError && (
                    <p className="text-xs font-bold text-red-500 pl-5 flex items-center gap-1">
                      <AlertCircle size={13} /> {errors[question.id]}
                    </p>
                  )}
                </div>

                {/* Question Input Controls */}
                <div className="pt-2 pl-0 sm:pl-5 space-y-3">
                  {/* Text Input */}
                  {question.type === 'text' && (
                    <input
                      type="text"
                      value={currentAnswer || ''}
                      onChange={e => handleAnswerChange(question.id, e.target.value)}
                      placeholder={question.placeholder || 'Sua resposta...'}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-medium outline-none focus:border-blue-500 dark:text-white"
                    />
                  )}

                  {/* Textarea */}
                  {question.type === 'textarea' && (
                    <textarea
                      value={currentAnswer || ''}
                      onChange={e => handleAnswerChange(question.id, e.target.value)}
                      placeholder={question.placeholder || 'Descreva com detalhes sua opinião ou solicitação...'}
                      rows={4}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl text-xs sm:text-sm font-medium outline-none focus:border-blue-500 dark:text-white resize-none"
                    />
                  )}

                  {/* Radio Choice */}
                  {question.type === 'radio' && (
                    <div className="space-y-2.5">
                      {(question.options || []).map((opt, i) => {
                        const isSelected = currentAnswer === opt;
                        return (
                          <label
                            key={i}
                            onClick={() => handleAnswerChange(question.id, opt)}
                            className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                                : 'bg-neutral-50/50 dark:bg-neutral-800/40 border-neutral-200/80 dark:border-neutral-700/80 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-blue-600 bg-blue-600' : 'border-neutral-300 dark:border-neutral-600'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Checkbox Multiple */}
                  {question.type === 'checkbox' && (
                    <div className="space-y-2.5">
                      {(question.options || []).map((opt, i) => {
                        const isSelected = (currentAnswer || []).includes(opt);
                        return (
                          <label
                            key={i}
                            onClick={() => handleCheckboxToggle(question.id, opt)}
                            className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                                : 'bg-neutral-50/50 dark:bg-neutral-800/40 border-neutral-200/80 dark:border-neutral-700/80 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-neutral-300 dark:border-neutral-600'
                            }`}>
                              {isSelected && <Check size={14} className="stroke-[3]" />}
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Dropdown Select */}
                  {question.type === 'select' && (
                    <select
                      value={currentAnswer || ''}
                      onChange={e => handleAnswerChange(question.id, e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold outline-none focus:border-blue-500 dark:text-white"
                    >
                      <option value="">Selecione uma opção...</option>
                      {(question.options || []).map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {/* Yes or No Buttons */}
                  {question.type === 'yes_no' && (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(question.id, true)}
                        className={`py-4 rounded-2xl text-sm font-black transition-all border ${
                          currentAnswer === true
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 scale-[1.02]'
                            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(question.id, false)}
                        className={`py-4 rounded-2xl text-sm font-black transition-all border ${
                          currentAnswer === false
                            ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20 scale-[1.02]'
                            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-red-50 dark:hover:bg-red-950/30'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  )}

                  {/* Star Rating (1 to 5) */}
                  {question.type === 'rating_stars' && (
                    <div className="flex items-center justify-around py-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80">
                      {[1, 2, 3, 4, 5].map(st => {
                        const isFilled = (currentAnswer || 0) >= st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleAnswerChange(question.id, st)}
                            className="p-3 hover:scale-125 transition-transform flex flex-col items-center gap-1"
                          >
                            <Star
                              size={32}
                              className={`transition-colors ${
                                isFilled ? 'text-amber-400 fill-amber-400' : 'text-neutral-300 dark:text-neutral-600'
                              }`}
                            />
                            <span className="text-[11px] font-bold text-neutral-500">{st}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Emoji Rating */}
                  {question.type === 'rating_emojis' && (
                    <div className="grid grid-cols-5 gap-2 py-2">
                      {[
                        { e: '😡', l: 'Péssimo', v: 1 },
                        { e: '🙁', l: 'Ruim', v: 2 },
                        { e: '😐', l: 'Regular', v: 3 },
                        { e: '😊', l: 'Bom', v: 4 },
                        { e: '🤩', l: 'Excelente', v: 5 }
                      ].map(item => {
                        const isSelected = currentAnswer === item.v;
                        return (
                          <button
                            key={item.v}
                            type="button"
                            onClick={() => handleAnswerChange(question.id, item.v)}
                            className={`p-3 sm:p-4 rounded-2xl border text-center transition-all ${
                              isSelected
                                ? 'bg-pink-50 dark:bg-pink-950/50 border-pink-500 ring-2 ring-pink-500/20 scale-105 shadow-md'
                                : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                            }`}
                          >
                            <div className="text-3xl sm:text-4xl">{item.e}</div>
                            <p className="text-[10px] sm:text-xs font-bold text-neutral-600 dark:text-neutral-300 mt-1">{item.l}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Scale NPS (0 to 10) */}
                  {question.type === 'scale_nps' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                        {Array.from({ length: 11 }).map((_, n) => {
                          const isSelected = currentAnswer === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => handleAnswerChange(question.id, n)}
                              className={`py-3 rounded-xl text-xs sm:text-sm font-black transition-all border ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-110'
                                  : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                              }`}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-neutral-400 px-1">
                        <span>0 - Não recomendaria</span>
                        <span>10 - Altamente recomendado</span>
                      </div>
                    </div>
                  )}

                  {/* Date Input */}
                  {question.type === 'date' && (
                    <input
                      type="date"
                      value={currentAnswer || ''}
                      onChange={e => handleAnswerChange(question.id, e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                    />
                  )}

                  {/* Neighborhood Selector inside question */}
                  {question.type === 'neighborhood' && (
                    <select
                      value={currentAnswer || ''}
                      onChange={e => handleAnswerChange(question.id, e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 dark:text-white"
                    >
                      <option value="">Selecione o bairro...</option>
                      {COMMON_MUNICIPAL_NEIGHBORHOODS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Submit Button */}
          <div className="pt-4 sticky bottom-4 z-30">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-5 rounded-[24px] font-black text-sm sm:text-base uppercase tracking-widest text-white bg-gradient-to-r ${theme.gradient} hover:scale-[1.01] active:scale-[0.99] transition-all shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 disabled:opacity-50`}
            >
              {submitting ? (
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
              Enviar Resposta Oficial
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
