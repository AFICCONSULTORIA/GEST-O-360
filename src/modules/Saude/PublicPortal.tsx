import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartPulse, Calendar, CheckCircle2, AlertTriangle, FileText, 
  XCircle, Search, Clock, Activity, CalendarCheck2, Home,
  Building2, User, Phone, MapPin, AlertCircle, Sparkles,
  Info, ShieldCheck, Check, Stethoscope
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  COMMON_SPECIALTIES, DEFAULT_HEALTH_UNITS, 
  formatCPF, formatSUS, formatPhone 
} from './types';

// Simple date formatter
const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length < 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const PublicSaudePortal = ({ darkMode, currentInstitution }: { darkMode: boolean; currentInstitution?: any }) => {
  const [activeTab, setActiveTab] = useState<'agendar' | 'acompanhar'>('agendar');

  // AGENDAR STATE
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_cpf: '',
    patient_sus: '',
    patient_phone: '',
    patient_birth_date: '',
    neighborhood: '',
    is_pregnant: false,
    is_pcd: false,
    specialty: COMMON_SPECIALTIES[0],
    referral_details: '',
    has_referral: false,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProtocol, setCreatedProtocol] = useState<string | null>(null);
  const [error, setError] = useState('');

  // ACOMPANHAR STATE
  const [trackData, setTrackData] = useState({
    cpf: '',
    birth_date: ''
  });
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [trackResults, setTrackResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);

  const handleSubmitAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const institutionId = currentInstitution?.id || null;

      // 1. Tentar salvar/atualizar o paciente no banco
      let patientId: string | null = null;
      try {
        const { data: existingPatient } = await supabase
          .from('patients')
          .select('id')
          .eq('cpf', formData.patient_cpf)
          .maybeSingle();

        if (existingPatient) {
          patientId = existingPatient.id;
          await supabase.from('patients').update({
            name: formData.patient_name,
            sus_number: formData.patient_sus,
            birth_date: formData.patient_birth_date,
            phone: formData.patient_phone,
            neighborhood: formData.neighborhood || null,
            is_pregnant: formData.is_pregnant,
            is_pcd: formData.is_pcd
          }).eq('id', existingPatient.id);
        } else {
          const { data: newPat } = await supabase.from('patients').insert([{
            name: formData.patient_name,
            cpf: formData.patient_cpf,
            sus_number: formData.patient_sus,
            birth_date: formData.patient_birth_date,
            phone: formData.patient_phone,
            neighborhood: formData.neighborhood || null,
            is_pregnant: formData.is_pregnant,
            is_pcd: formData.is_pcd,
            institution_id: institutionId
          }]).select('id').maybeSingle();

          if (newPat) patientId = newPat.id;
        }
      } catch (err) {
        console.warn('Registro de paciente ignorado (tabela pode estar em migração):', err);
      }

      // 2. Criar a solicitação na Fila de Regulação
      const newAppointment = {
        id: generatedId,
        patient_id: patientId,
        patient_name: formData.patient_name,
        patient_cpf: formData.patient_cpf,
        patient_sus: formData.patient_sus,
        patient_phone: formData.patient_phone,
        patient_birth_date: formData.patient_birth_date,
        is_pregnant: formData.is_pregnant,
        is_urgent: false,
        specialty: formData.specialty,
        referral_details: formData.specialty === 'Clínico Geral' ? null : formData.referral_details,
        appointment_date: new Date().toISOString().split('T')[0],
        status: 'Aguardando Regulação',
        notes: formData.notes || null,
        institution_id: institutionId
      };

      const { error: dbError } = await supabase.from('appointments').insert(newAppointment);

      if (dbError) throw dbError;

      setCreatedProtocol(generatedId);
    } catch (err: any) {
      console.error(err);
      setError('Ocorreu um erro ao registrar sua solicitação. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsTrackLoading(true);
    setTrackError('');
    setHasSearched(false);

    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('patient_cpf', trackData.cpf)
        .eq('patient_birth_date', trackData.birth_date);

      if (currentInstitution?.id) {
        query = query.eq('institution_id', currentInstitution.id);
      }

      const { data, error: dbError } = await query.order('created_at', { ascending: false });

      if (dbError) throw dbError;

      setTrackResults(data || []);
    } catch (err: any) {
      console.error(err);
      setTrackError('Erro ao consultar seus agendamentos. Verifique seus dados.');
    } finally {
      setIsTrackLoading(false);
      setHasSearched(true);
    }
  };

  const handleCancelRequestByCitizen = async (appointmentId: string) => {
    if (!window.confirm('Tem certeza de que deseja cancelar esta solicitação e liberar a vaga?')) return;

    try {
      const { error: cancelError } = await supabase.from('appointments').update({
        status: 'Cancelado',
        cancellation_reason: 'Cancelamento voluntário solicitado pelo munícipe pelo Portal da Saúde.'
      }).eq('id', appointmentId);

      if (cancelError) throw cancelError;

      alert('Sua solicitação foi cancelada com sucesso. Agradecemos pelo aviso, isso ajuda a liberar a vaga para outra pessoa que precisa!');
      handleTrackSearch();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao cancelar: ' + err.message);
    }
  };

  return (
    <div className={`min-h-screen py-12 px-4 flex flex-col items-center font-sans ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* Botão Voltar */}
      <div className="w-full max-w-3xl flex justify-end mb-4">
        <a
          href="/"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            darkMode 
              ? 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 border-neutral-700' 
              : 'bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 border-neutral-200'
          } border shadow-sm`}
          title="Voltar à Página Inicial"
        >
          <Home size={14} />
          Página Inicial
        </a>
      </div>

      {/* Banner Informativo de Urgência e Regulação */}
      <div className="w-full max-w-3xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-5 mb-6 flex items-start gap-4 shadow-sm">
        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={24} />
        <div className="space-y-1">
          <h4 className="font-black text-amber-900 dark:text-amber-300 text-sm">
            Portal Oficial de Agendamentos Eletivos do SUS
          </h4>
          <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
            Este sistema organiza a <strong>Fila de Regulação Municipal</strong>. As solicitações são triadas e alocadas pelos profissionais de saúde de acordo com a prioridade clínica. Em casos de <strong>emergência ou pronto-atendimento</strong>, dirija-se imediatamente à UBS ou Pronto Socorro mais próximo.
          </p>
        </div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden ${darkMode ? 'bg-neutral-900' : 'bg-white'}`}
      >
        {/* Header Visual */}
        <div className="bg-emerald-600 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <HeartPulse size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            {currentInstitution ? `Portal da Saúde · ${currentInstitution.name.replace("Prefeitura Municipal de ", "")}` : 'Portal da Saúde'}
          </h1>
          <p className="text-emerald-100 font-medium text-sm">
            Solicite consultas especializadas e acompanhe sua posição na fila do SUS
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center p-6 md:p-8 pb-0">
          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl w-full max-w-md">
            <button
              onClick={() => setActiveTab('agendar')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'agendar' 
                  ? 'bg-white dark:bg-neutral-900 text-emerald-600 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              Nova Solicitação
            </button>
            <button
              onClick={() => setActiveTab('acompanhar')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'acompanhar' 
                  ? 'bg-white dark:bg-neutral-900 text-emerald-600 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              Acompanhar Fila
            </button>
          </div>
        </div>

        {/* Conteúdo das Tabs */}
        <div className="p-6 md:p-10 pt-6">
          <AnimatePresence mode="wait">
            {activeTab === 'agendar' ? (
              createdProtocol ? (
                /* Tela de Sucesso */
                <motion.div 
                  key="sucesso"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-6 space-y-6"
                >
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={44} />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">Solicitação Enviada para a Fila!</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                      Seu pedido de consulta para <strong className="text-emerald-600 dark:text-emerald-400">{formData.specialty}</strong> foi registrado na Fila de Regulação da Secretaria de Saúde.
                    </p>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-3xl p-6 max-w-md mx-auto text-left space-y-3">
                    <div className="flex justify-between items-center border-b border-emerald-200/60 dark:border-emerald-500/20 pb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Número do Protocolo</span>
                      <span className="font-mono font-black text-lg text-emerald-800 dark:text-emerald-200">{createdProtocol}</span>
                    </div>

                    <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                      <p className="font-bold">O que acontece agora?</p>
                      <p className="text-neutral-600 dark:text-neutral-400">
                        1. A equipe médica da regulação analisa a documentação e prioridade.<br />
                        2. O horário, data e a Unidade de Saúde (UBS) são definidos.<br />
                        3. Você pode consultar o andamento na aba <strong>"Acompanhar Fila"</strong> a qualquer momento.
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setCreatedProtocol(null);
                      setTrackData({ cpf: formData.patient_cpf, birth_date: formData.patient_birth_date });
                      setActiveTab('acompanhar');
                    }}
                    className="w-full max-w-md mx-auto bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Search size={18} /> Acompanhar Esta Solicitação
                  </button>
                </motion.div>
              ) : (
                /* Formulário de Agendamento */
                <motion.form 
                  key="form-agendamento"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleSubmitAgendamento}
                  className="space-y-6"
                >
                  {error && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                      <XCircle size={18} /> {error}
                    </div>
                  )}

                  <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                      <User size={16} className="text-emerald-500" />
                      1. Identificação do Paciente
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Nome Completo *</label>
                        <input 
                          type="text" required
                          value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})}
                          placeholder="Ex: Maria dos Santos Ferreira"
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">CPF *</label>
                        <input 
                          type="text" required
                          value={formData.patient_cpf} onChange={e => setFormData({...formData, patient_cpf: formatCPF(e.target.value)})}
                          placeholder="000.000.000-00"
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Cartão do SUS *</label>
                        <input 
                          type="text" required
                          value={formData.patient_sus} onChange={e => setFormData({...formData, patient_sus: formatSUS(e.target.value)})}
                          placeholder="000 0000 0000 0000"
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Data de Nascimento *</label>
                        <input 
                          type="date" required
                          value={formData.patient_birth_date} onChange={e => setFormData({...formData, patient_birth_date: e.target.value})}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Telefone / WhatsApp *</label>
                        <input 
                          type="text" required
                          value={formData.patient_phone} onChange={e => setFormData({...formData, patient_phone: formatPhone(e.target.value)})}
                          placeholder="(00) 00000-0000"
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Bairro / Localidade</label>
                        <input 
                          type="text"
                          value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                          placeholder="Ex: Centro, Bairro São José..."
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                        />
                      </div>

                      {/* Prioridades Legais */}
                      <div className="flex flex-wrap items-center gap-6 md:col-span-2 pt-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={formData.is_pregnant}
                            onChange={e => setFormData({...formData, is_pregnant: e.target.checked})}
                            className="w-4 h-4 text-amber-500 rounded"
                          />
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">A paciente é Gestante</span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={formData.is_pcd}
                            onChange={e => setFormData({...formData, is_pcd: e.target.checked})}
                            className="w-4 h-4 text-purple-500 rounded"
                          />
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Pessoa com Deficiência (PCD)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Especialidade e Encaminhamento */}
                  <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                      <Stethoscope size={16} className="text-emerald-500" />
                      2. Especialidade Médica Desejada
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Selecione a Especialidade *</label>
                        <select 
                          value={formData.specialty}
                          onChange={e => setFormData({...formData, specialty: e.target.value})}
                          required
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3.5 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                        >
                          {COMMON_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {formData.specialty !== 'Clínico Geral' && (
                        <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-3">
                          <div className="flex items-start gap-3">
                            <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">Encaminhamento Médico Obrigatório</h4>
                              <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80">
                                Para especialidades, informe os dados da guia fornecida pelo Clínico Geral da sua UBS.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-400">
                              Médico Solicitante / CRM / Nº da Guia *
                            </label>
                            <input 
                              type="text" required
                              value={formData.referral_details} onChange={e => setFormData({...formData, referral_details: e.target.value})}
                              placeholder="Ex: Dr. Carlos (UBS Central) - CRM 12345"
                              className="w-full bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 px-4 py-3 rounded-xl text-xs outline-none dark:text-white"
                            />
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input 
                              type="checkbox" required
                              checked={formData.has_referral}
                              onChange={e => setFormData({...formData, has_referral: e.target.checked})}
                              className="w-4 h-4 text-amber-600 rounded"
                            />
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                              Declaro que possuo o encaminhamento físico em mãos para apresentar na consulta. *
                            </span>
                          </label>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Motivo / Principais Sintomas (Opcional)</label>
                        <textarea 
                          rows={3}
                          value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                          placeholder="Descreva brevemente o que está sentindo..."
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black text-base shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Enviando Solicitação...' : <><Calendar size={20} /> Enviar para a Fila de Regulação</>}
                    </button>
                    <p className="text-center text-xs text-neutral-400 mt-3">
                      Sua solicitação será analisada com base na prioridade do SUS municipal.
                    </p>
                  </div>
                </motion.form>
              )
            ) : (
              /* Acompanhar Fila */
              <motion.div 
                key="acompanhar-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <form onSubmit={handleTrackSearch} className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">Consultar Minha Posição e Status</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Informe seu CPF e Data de Nascimento para localizar seus agendamentos.</p>
                  </div>

                  {trackError && (
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                      <XCircle size={16} /> {trackError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">CPF</label>
                      <input 
                        type="text" required
                        value={trackData.cpf} onChange={e => setTrackData({...trackData, cpf: formatCPF(e.target.value)})}
                        placeholder="000.000.000-00"
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Data de Nascimento</label>
                      <input 
                        type="date" required
                        value={trackData.birth_date} onChange={e => setTrackData({...trackData, birth_date: e.target.value})}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isTrackLoading}
                    className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-3.5 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isTrackLoading ? 'Consultando...' : <><Search size={16} /> Consultar Minhas Consultas</>}
                  </button>
                </form>

                {/* Resultados da Busca */}
                {hasSearched && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                      <Activity size={16} className="text-emerald-500" />
                      Consultas Encontradas ({trackResults.length})
                    </h4>

                    {trackResults.length === 0 ? (
                      <div className="text-center p-12 bg-neutral-50 dark:bg-neutral-800/20 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-700">
                        <CalendarCheck2 size={36} className="mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                        <h5 className="font-bold text-sm text-neutral-900 dark:text-white">Nenhum agendamento localizado</h5>
                        <p className="text-xs text-neutral-500 mt-1">Verifique se o CPF e a data de nascimento foram digitados corretamente.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {trackResults.map(req => {
                          const isRegulated = req.status === 'Agendado';
                          const isAttended = req.status === 'Atendido';
                          const isPending = req.status === 'Aguardando Regulação';
                          const isCanceled = req.status === 'Cancelado';

                          return (
                            <div key={req.id} className="bg-white dark:bg-neutral-800 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-700 shadow-md space-y-4">
                              {/* Header do Card */}
                              <div className="flex flex-wrap justify-between items-start gap-2">
                                <div>
                                  <span className="text-[10px] font-mono font-black uppercase text-neutral-400">
                                    Protocolo: {req.id}
                                  </span>
                                  <h4 className="text-lg font-black text-neutral-900 dark:text-white">{req.specialty}</h4>
                                  <p className="text-xs text-neutral-500">Paciente: {req.patient_name}</p>
                                </div>

                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                  isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 animate-pulse' :
                                  isRegulated ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' :
                                  isAttended ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' :
                                  'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                                }`}>
                                  {req.status}
                                </span>
                              </div>

                              {/* Linha do Tempo Visual */}
                              <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Linha do Tempo</p>
                                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                                  <div className={`p-2 rounded-xl border ${
                                    !isCanceled ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-700 dark:text-emerald-300 font-bold' : 'border-neutral-200 opacity-40'
                                  }`}>
                                    1. Na Fila
                                  </div>
                                  <div className={`p-2 rounded-xl border ${
                                    isRegulated || isAttended ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-700 dark:text-emerald-300 font-bold' : 'border-neutral-200 text-neutral-400'
                                  }`}>
                                    2. Regulado
                                  </div>
                                  <div className={`p-2 rounded-xl border ${
                                    isAttended ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-700 dark:text-emerald-300 font-bold' : 'border-neutral-200 text-neutral-400'
                                  }`}>
                                    3. Atendido
                                  </div>
                                </div>
                              </div>

                              {/* Detalhes do Local e Horário */}
                              {isRegulated && (
                                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl space-y-2">
                                  <h5 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                    <CheckCircle2 size={16} /> Consulta Confirmada!
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-950 dark:text-emerald-100">
                                    <p><strong>📅 Data:</strong> {formatDate(req.appointment_date)}</p>
                                    <p><strong>⏰ Horário:</strong> {req.appointment_time || 'A definir na recepção'}</p>
                                    <p><strong>🏥 Local:</strong> {req.unit_name || 'UBS de Referência'}</p>
                                    {req.doctor_name && <p><strong>👨‍⚕️ Profissional:</strong> {req.doctor_name}</p>}
                                  </div>
                                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pt-1">
                                    * Chegue com 15 minutos de antecedência munido de RG, CPF e Cartão do SUS.
                                  </p>
                                </div>
                              )}

                              {/* Ação de Cancelamento Cidadão */}
                              {(isPending || isRegulated) && (
                                <div className="pt-2 flex justify-end">
                                  <button 
                                    type="button"
                                    onClick={() => handleCancelRequestByCitizen(req.id)}
                                    className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
                                  >
                                    Não poderei comparecer / Liberar minha vaga
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
