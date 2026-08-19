import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Calendar, Clock, User, FileText, AlertCircle, 
  CheckCircle2, XCircle, Phone, MessageCircle, Building2, 
  Filter, Sparkles, Stethoscope, ChevronRight, AlertTriangle, RefreshCw
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { 
  Appointment, COMMON_SPECIALTIES, DEFAULT_HEALTH_UNITS, 
  calculatePriority, getAge, formatPhone 
} from '../types';

interface SaudeQueueProps {
  appointments: Appointment[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectAppointment: (apt: Appointment) => void;
  currentInstitution?: { id: string } | null;
}

export const SaudeQueue: React.FC<SaudeQueueProps> = ({
  appointments,
  isLoading,
  onRefresh,
  onSelectAppointment,
  currentInstitution
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('Todas');
  const [filterPriority, setFilterPriority] = useState('Todas');
  const [regulatingAppointment, setRegulatingAppointment] = useState<Appointment | null>(null);

  // Filter only items in queue (Aguardando Regulação)
  const queueItems = appointments.filter(a => a.status === 'Aguardando Regulação');

  const filteredQueue = queueItems.filter(apt => {
    const matchSearch = 
      apt.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patient_cpf.includes(searchQuery) ||
      apt.patient_sus.includes(searchQuery);
    
    const matchSpecialty = filterSpecialty === 'Todas' || apt.specialty === filterSpecialty;

    const priorityInfo = calculatePriority(apt);
    const matchPriority = 
      filterPriority === 'Todas' ||
      (filterPriority === 'urgente' && priorityInfo.level === -1) ||
      (filterPriority === '80+' && priorityInfo.level === 0) ||
      (filterPriority === 'prioridade' && priorityInfo.level === 1) ||
      (filterPriority === 'geral' && priorityInfo.level === 2);

    return matchSearch && matchSpecialty && matchPriority;
  }).sort((a, b) => {
    const pA = calculatePriority(a).level;
    const pB = calculatePriority(b).level;
    if (pA !== pB) return pA - pB;
    // Fila cronológica por data de criação ou agendamento
    const dateA = new Date(a.created_at || a.appointment_date).getTime();
    const dateB = new Date(b.created_at || b.appointment_date).getTime();
    return dateA - dateB;
  });

  // Calculate stats
  const urgentCount = queueItems.filter(a => calculatePriority(a).level === -1).length;
  const p80Count = queueItems.filter(a => calculatePriority(a).level === 0).length;
  const priorityCount = queueItems.filter(a => calculatePriority(a).level === 1).length;
  const generalCount = queueItems.filter(a => calculatePriority(a).level === 2).length;

  const getDaysInQueue = (dateStr?: string) => {
    if (!dateStr) return 'Hoje';
    const created = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Há 1 dia';
    return `Há ${diffDays} dias`;
  };

  const handleSendWhatsAppNotice = (apt: Appointment, type: 'pendencia' | 'convocacao') => {
    if (!apt.patient_phone) {
      showToast('Paciente não possui telefone registrado.', 'warning');
      return;
    }
    const phone = apt.patient_phone.replace(/\D/g, '');
    let text = '';
    
    if (type === 'pendencia') {
      text = `Olá, ${apt.patient_name}!\n\nSomos da *Regulação Municipal de Saúde*.\nRecebemos sua solicitação para a especialidade *${apt.specialty}*.\n\nPara prosseguirmos com o seu agendamento, por favor envie uma foto legível do seu *Encaminhamento Médico / Guia do SUS* respondendo a esta mensagem.\n\nObrigado!`;
    } else {
      const dataStr = apt.appointment_date.split('-').reverse().join('/');
      text = `Olá, ${apt.patient_name}!\n\nSua consulta com *${apt.specialty}* foi *REGULADA E AGENDADA* com sucesso!\n\n📅 Data: *${dataStr}*\n⏰ Horário: *${apt.appointment_time || 'A definir'}*\n🏥 Local: *${apt.unit_name || 'Unidade Básica de Saúde'}*\n${apt.doctor_name ? `👨‍⚕️ Profissional: *${apt.doctor_name}*\n` : ''}\nPor favor, chegue com 15 minutos de antecedência munido de RG e Cartão do SUS.`;
    }

    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas da Fila */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total na Fila</p>
            <h4 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{queueItems.length}</h4>
          </div>
          <div className="w-12 h-12 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Urgência Médica</p>
            <h4 className="text-2xl font-black text-rose-600 mt-1">{urgentCount}</h4>
          </div>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Prioridades (80+ / Gestantes)</p>
            <h4 className="text-2xl font-black text-amber-600 mt-1">{p80Count + priorityCount}</h4>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center">
            <User size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Fila Cronológica</p>
            <h4 className="text-2xl font-black text-emerald-600 mt-1">{generalCount}</h4>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 rounded-2xl">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Fila de Regulação & Triagem</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Avalie as solicitações da população e defina o agendamento correto.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar paciente, CPF ou SUS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 transition-all dark:text-white"
            />
          </div>

          <select 
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none dark:text-white"
          >
            <option value="Todas">Todas as Especialidades</option>
            {COMMON_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none dark:text-white"
          >
            <option value="Todas">Todas as Prioridades</option>
            <option value="urgente">🚨 Urgência Médica</option>
            <option value="80+">🔴 Especial 80+</option>
            <option value="prioridade">🟡 Prioridade (60+ / Gestante)</option>
            <option value="geral">🟢 Fila Geral</option>
          </select>

          <button 
            onClick={onRefresh}
            className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Atualizar Fila"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Lista da Fila de Regulação */}
      {filteredQueue.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center border border-neutral-100 dark:border-neutral-800">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Fila de Regulação Vazia!</h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Não há solicitações pendentes para os filtros selecionados. Todas as consultas estão reguladas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQueue.map((apt, index) => {
            const priority = calculatePriority(apt);
            const age = getAge(apt.patient_birth_date);
            const daysInQueue = getDaysInQueue(apt.created_at);

            return (
              <motion.div 
                key={apt.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
                className={`bg-white dark:bg-neutral-900 rounded-3xl p-6 border transition-all ${
                  priority.level === -1 
                    ? 'border-red-400 dark:border-red-500/40 shadow-sm shadow-red-500/10' 
                    : priority.level === 0
                    ? 'border-purple-300 dark:border-purple-500/30'
                    : 'border-neutral-100 dark:border-neutral-800 hover:shadow-md'
                } flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden`}
              >
                {/* Indicador lateral de prioridade */}
                <div className={`absolute top-0 left-0 w-2 h-full ${
                  priority.level === -1 ? 'bg-red-500' :
                  priority.level === 0 ? 'bg-purple-500' :
                  priority.level === 1 ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />

                {/* Dados Principais do Paciente */}
                <div className="flex-1 space-y-3 pl-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      Posição #{index + 1}
                    </span>

                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      priority.level === -1 ? 'bg-red-500 text-white animate-pulse shadow-sm shadow-red-500/40' :
                      priority.level === 0 ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' :
                      priority.level === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    }`}>
                      {priority.label}
                    </span>

                    <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                      <Clock size={12} /> {daysInQueue}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      {apt.patient_name}
                      <span className="text-xs font-normal text-neutral-400">({age} anos)</span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-mono">
                      <span>CPF: {apt.patient_cpf}</span>
                      <span>SUS: {apt.patient_sus}</span>
                      {apt.patient_phone && <span>Tel: {formatPhone(apt.patient_phone)}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      <Stethoscope size={14} className="text-emerald-500" />
                      {apt.specialty}
                    </div>

                    {apt.referral_details && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                        <FileText size={14} className="text-amber-600" />
                        Guia: {apt.referral_details}
                      </div>
                    )}
                  </div>

                  {apt.notes && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <strong className="text-neutral-700 dark:text-neutral-300">Queixa / Sintomas:</strong> {apt.notes}
                    </p>
                  )}
                </div>

                {/* Ações da Regulação */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-neutral-100 dark:border-neutral-800">
                  <button 
                    onClick={() => setRegulatingAppointment(apt)}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Calendar size={16} /> Regular & Agendar
                  </button>

                  <div className="flex items-center gap-2">
                    {apt.patient_phone && (
                      <button 
                        onClick={() => handleSendWhatsAppNotice(apt, 'pendencia')}
                        title="Solicitar Documento via WhatsApp"
                        className="flex-1 lg:flex-initial px-3 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-[#25D366]/20"
                      >
                        <MessageCircle size={14} /> Solicitar Guia
                      </button>
                    )}

                    <button 
                      onClick={() => onSelectAppointment(apt)}
                      title="Ver todos os detalhes"
                      className="px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      Detalhes <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Regulação e Agendamento */}
      <AnimatePresence>
        {regulatingAppointment && (
          <RegulationModal 
            appointment={regulatingAppointment}
            onClose={() => setRegulatingAppointment(null)}
            onSuccess={() => {
              setRegulatingAppointment(null);
              onRefresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface RegulationModalProps {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}

const RegulationModal: React.FC<RegulationModalProps> = ({ appointment, onClose, onSuccess }) => {
  const [unitName, setUnitName] = useState(appointment.unit_name || DEFAULT_HEALTH_UNITS[0]);
  const [doctorName, setDoctorName] = useState(appointment.doctor_name || '');
  const [appointmentDate, setAppointmentDate] = useState(appointment.appointment_date || new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState(appointment.appointment_time || '08:00');
  const [triageNotes, setTriageNotes] = useState(appointment.triage_notes || '');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('appointments').update({
        status: 'Agendado',
        unit_name: unitName,
        doctor_name: doctorName || null,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        triage_notes: triageNotes || null
      }).eq('id', appointment.id);

      if (error) throw error;

      showToast('Consulta regulada e agendada com sucesso!', 'success');

      // Se marcado para enviar WhatsApp
      if (sendWhatsApp && appointment.patient_phone) {
        const phone = appointment.patient_phone.replace(/\D/g, '');
        const dataStr = appointmentDate.split('-').reverse().join('/');
        const msg = `Olá, *${appointment.patient_name}*!\n\nSua consulta com *${appointment.specialty}* foi confirmada!\n\n📅 Data: *${dataStr}*\n⏰ Horário: *${appointmentTime}*\n🏥 Local: *${unitName}*\n${doctorName ? `👨‍⚕️ Profissional: *${doctorName}*\n` : ''}\nPor favor, compareça com 15 minutos de antecedência com documento com foto e Cartão do SUS.`;
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Erro ao regular agendamento:', err);
      showToast('Erro ao regular agendamento: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800"
      >
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-900/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">Regular & Confirmar Agendamento</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Paciente: <strong className="text-neutral-900 dark:text-white">{appointment.patient_name}</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Unidade de Saúde (Local de Atendimento) *</label>
              <select 
                value={unitName}
                onChange={e => setUnitName(e.target.value)}
                required
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              >
                {DEFAULT_HEALTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Médico / Profissional de Saúde (Opcional)</label>
              <input 
                type="text"
                placeholder="Ex: Dra. Camila Rocha (CRM 12345)"
                value={doctorName}
                onChange={e => setDoctorName(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data da Consulta *</label>
              <input 
                type="date"
                required
                value={appointmentDate}
                onChange={e => setAppointmentDate(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Horário da Consulta *</label>
              <input 
                type="time"
                required
                value={appointmentTime}
                onChange={e => setAppointmentTime(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Parecer da Regulação / Instruções (Opcional)</label>
              <textarea 
                rows={2}
                placeholder="Ex: Trazer exames anteriores de sangue; jejum de 8h..."
                value={triageNotes}
                onChange={e => setTriageNotes(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none dark:text-white"
              />
            </div>

            {appointment.patient_phone && (
              <div className="md:col-span-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                  <input 
                    type="checkbox"
                    checked={sendWhatsApp}
                    onChange={e => setSendWhatsApp(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-[#25D366]" />
                    Disparar convocação e confirmação via WhatsApp para {formatPhone(appointment.patient_phone)}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Salvando...' : <><CheckCircle2 size={16} /> Confirmar Regulação</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
