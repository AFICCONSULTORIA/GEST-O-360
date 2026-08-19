import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, 
  XCircle, AlertCircle, Printer, RotateCcw, Building2, 
  Search, MessageCircle, MapPin, Stethoscope, ChevronRight,
  UserCheck, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { 
  Appointment, COMMON_SPECIALTIES, DEFAULT_HEALTH_UNITS, 
  formatPhone, formatCPF, formatSUS 
} from '../types';

interface SaudeAgendaProps {
  appointments: Appointment[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectAppointment: (apt: Appointment) => void;
  currentInstitution?: { id: string; name?: string } | null;
}

export const SaudeAgenda: React.FC<SaudeAgendaProps> = ({
  appointments,
  isLoading,
  onRefresh,
  onSelectAppointment,
  currentInstitution
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterUnit, setFilterUnit] = useState('Todas');
  const [filterSpecialty, setFilterSpecialty] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filter out items that are still in regulation queue
  const scheduledAppointments = appointments.filter(a => a.status !== 'Aguardando Regulação');

  const filteredAppointments = scheduledAppointments.filter(apt => {
    const matchDate = selectedDate ? apt.appointment_date === selectedDate : true;
    const matchUnit = filterUnit === 'Todas' || apt.unit_name === filterUnit || (!apt.unit_name && filterUnit === 'Todas');
    const matchSpecialty = filterSpecialty === 'Todas' || apt.specialty === filterSpecialty;
    const matchStatus = filterStatus === 'Todos' || apt.status === filterStatus;
    const matchSearch = 
      apt.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patient_cpf.includes(searchQuery) ||
      (apt.doctor_name && apt.doctor_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchDate && matchUnit && matchSpecialty && matchStatus && matchSearch;
  }).sort((a, b) => {
    const timeA = a.appointment_time || '00:00';
    const timeB = b.appointment_time || '00:00';
    return timeA.localeCompare(timeB);
  });

  const handleUpdateStatus = async (id: string, newStatus: Appointment['status'], extraFields: any = {}) => {
    try {
      const { error } = await supabase.from('appointments').update({
        status: newStatus,
        ...extraFields
      }).eq('id', id);

      if (error) throw error;

      showToast(`Status atualizado para: ${newStatus}`, 'success');
      onRefresh();
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      showToast('Erro ao atualizar: ' + err.message, 'error');
    }
  };

  const handleCheckIn = async (apt: Appointment) => {
    await handleUpdateStatus(apt.id, 'Agendado', {
      checked_in_at: new Date().toISOString()
    });
    showToast(`Check-in confirmado: ${apt.patient_name} está na sala de espera!`, 'info');
  };

  const handleSendReminderWhatsApp = (apt: Appointment) => {
    if (!apt.patient_phone) {
      showToast('Paciente não possui telefone registrado.', 'warning');
      return;
    }
    const phone = apt.patient_phone.replace(/\D/g, '');
    const dataStr = apt.appointment_date.split('-').reverse().join('/');
    const msg = `Olá, *${apt.patient_name}*!\n\nLembramos da sua consulta marcada para *${dataStr}* às *${apt.appointment_time || '08:00'}* na especialidade *${apt.specialty}*.\n\n🏥 Local: *${apt.unit_name || 'Unidade Básica de Saúde'}*\n${apt.doctor_name ? `👨‍⚕️ Profissional: *${apt.doctor_name}*\n` : ''}\nPor favor, responda *SIM* para confirmar sua presença ou nos avise caso precise desmarcar.`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  // KPIs for the selected date
  const totalOnDate = filteredAppointments.length;
  const attendedOnDate = filteredAppointments.filter(a => a.status === 'Atendido').length;
  const noShowOnDate = filteredAppointments.filter(a => a.status === 'Faltou').length;
  const waitingOnDate = filteredAppointments.filter(a => a.status === 'Agendado').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics of the Day */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total no Dia</p>
            <h4 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{totalOnDate}</h4>
          </div>
          <div className="w-12 h-12 bg-sky-50 dark:bg-sky-500/10 text-sky-600 rounded-2xl flex items-center justify-center">
            <CalendarIcon size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Atendidos</p>
            <h4 className="text-2xl font-black text-emerald-600 mt-1">{attendedOnDate}</h4>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Aguardando / Hoje</p>
            <h4 className="text-2xl font-black text-amber-600 mt-1">{waitingOnDate}</h4>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Faltas (No-Show)</p>
            <h4 className="text-2xl font-black text-rose-600 mt-1">{noShowOnDate}</h4>
          </div>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center">
            <AlertCircle size={22} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Ações */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <input 
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent px-3 py-1.5 text-xs font-bold outline-none dark:text-white"
            />
            <button 
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-1 bg-white dark:bg-neutral-700 shadow-sm rounded-xl text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
            >
              Hoje
            </button>
          </div>

          <select 
            value={filterUnit}
            onChange={e => setFilterUnit(e.target.value)}
            className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none dark:text-white"
          >
            <option value="Todas">Todas as Unidades (UBS)</option>
            {DEFAULT_HEALTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <select 
            value={filterSpecialty}
            onChange={e => setFilterSpecialty(e.target.value)}
            className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none dark:text-white"
          >
            <option value="Todas">Todas Especialidades</option>
            {COMMON_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none dark:text-white"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Agendado">Agendado</option>
            <option value="Atendido">Atendido</option>
            <option value="Faltou">Faltou (No-Show)</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar paciente ou médico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
            />
          </div>

          <button 
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-2"
          >
            <Printer size={16} /> Imprimir Lista do Dia
          </button>
        </div>
      </div>

      {/* Lista de Atendimentos Agendados */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center border border-neutral-100 dark:border-neutral-800">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon size={32} />
          </div>
          <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Nenhum agendamento para esta data/filtro</h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Selecione outro dia no calendário ou verifique as solicitações na aba "Fila de Regulação".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAppointments.map(apt => {
            const hasCheckedIn = !!apt.checked_in_at;
            const isAttended = apt.status === 'Atendido';
            const isMissed = apt.status === 'Faltou';
            const isCanceled = apt.status === 'Cancelado';

            return (
              <div 
                key={apt.id}
                onClick={() => onSelectAppointment(apt)}
                className={`bg-white dark:bg-neutral-900 rounded-3xl p-6 border transition-all cursor-pointer relative overflow-hidden group ${
                  hasCheckedIn && !isAttended && !isMissed
                    ? 'border-emerald-500 shadow-md shadow-emerald-500/10'
                    : 'border-neutral-100 dark:border-neutral-800 hover:shadow-lg'
                }`}
              >
                {/* Linha indicadora de status */}
                <div className={`absolute top-0 left-0 w-2 h-full ${
                  isAttended ? 'bg-emerald-500' :
                  isMissed ? 'bg-rose-500' :
                  isCanceled ? 'bg-neutral-400' :
                  hasCheckedIn ? 'bg-sky-500' : 'bg-amber-400'
                }`} />

                {/* Header do Card */}
                <div className="flex justify-between items-start mb-3 pl-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      isAttended ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      isMissed ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                      isCanceled ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800' :
                      hasCheckedIn ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 animate-pulse' :
                      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}>
                      {hasCheckedIn && !isAttended && !isMissed ? 'Na Recepção (Chegou)' : apt.status}
                    </span>

                    {apt.appointment_time && (
                      <span className="text-xs font-black text-neutral-900 dark:text-white flex items-center gap-1 bg-neutral-50 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                        <Clock size={12} className="text-emerald-500" />
                        {apt.appointment_time}
                      </span>
                    )}
                  </div>
                </div>

                {/* Informações do Paciente */}
                <div className="pl-2 space-y-2 mb-4">
                  <h4 className="text-lg font-black text-neutral-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    {apt.patient_name}
                  </h4>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono space-y-0.5">
                    <p>CPF: {apt.patient_cpf}</p>
                    <p>SUS: {apt.patient_sus}</p>
                    {apt.patient_phone && <p>Tel: {formatPhone(apt.patient_phone)}</p>}
                  </div>
                </div>

                {/* Local e Especialidade */}
                <div className="pl-2 space-y-2 mb-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    <Stethoscope size={14} className="text-emerald-500 shrink-0" />
                    <span>{apt.specialty}</span>
                  </div>
                  {apt.unit_name && (
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <Building2 size={14} className="text-sky-500 shrink-0" />
                      <span>{apt.unit_name}</span>
                    </div>
                  )}
                  {apt.doctor_name && (
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <User size={14} className="text-purple-500 shrink-0" />
                      <span>Profissional: {apt.doctor_name}</span>
                    </div>
                  )}
                </div>

                {/* Ações de Recepção e Atendimento */}
                <div className="pl-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    {!isAttended && !isMissed && !isCanceled && (
                      <>
                        {!hasCheckedIn ? (
                          <button 
                            onClick={() => handleCheckIn(apt)}
                            title="Marcar que o paciente chegou na recepção"
                            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 dark:text-sky-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <UserCheck size={14} /> Check-in
                          </button>
                        ) : null}

                        <button 
                          onClick={() => handleUpdateStatus(apt.id, 'Atendido', { attended_at: new Date().toISOString() })}
                          title="Marcar como Atendido"
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 size={14} /> Atendido
                        </button>

                        <button 
                          onClick={() => handleUpdateStatus(apt.id, 'Faltou')}
                          title="Registrar Falta"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl transition-colors"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}

                    {(isAttended || isMissed || isCanceled) && (
                      <button 
                        onClick={() => handleUpdateStatus(apt.id, 'Agendado')}
                        title="Reverter para Agendado"
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <RotateCcw size={14} /> Desfazer
                      </button>
                    )}

                    <button 
                      onClick={() => setReschedulingAppointment(apt)}
                      title="Reagendar Data/Hora"
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl text-xs font-bold transition-colors"
                    >
                      Reagendar
                    </button>
                  </div>

                  {apt.patient_phone && (
                    <button 
                      onClick={() => handleSendReminderWhatsApp(apt)}
                      title="Lembrete WhatsApp"
                      className="p-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl transition-colors"
                    >
                      <MessageCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Reagendamento */}
      <AnimatePresence>
        {reschedulingAppointment && (
          <RescheduleModal 
            appointment={reschedulingAppointment}
            onClose={() => setReschedulingAppointment(null)}
            onSuccess={() => {
              setReschedulingAppointment(null);
              onRefresh();
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de Impressão da Lista Diária */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <PrintDailyListModal 
            appointments={filteredAppointments}
            date={selectedDate}
            institutionName={currentInstitution?.name || 'Prefeitura Municipal'}
            onClose={() => setIsPrintModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Modal de Reagendamento
interface RescheduleModalProps {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({ appointment, onClose, onSuccess }) => {
  const [newDate, setNewDate] = useState(appointment.appointment_date);
  const [newTime, setNewTime] = useState(appointment.appointment_time || '08:00');
  const [newUnit, setNewUnit] = useState(appointment.unit_name || DEFAULT_HEALTH_UNITS[0]);
  const [newDoctor, setNewDoctor] = useState(appointment.doctor_name || '');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('appointments').update({
        appointment_date: newDate,
        appointment_time: newTime,
        unit_name: newUnit,
        doctor_name: newDoctor || null,
        status: 'Agendado'
      }).eq('id', appointment.id);

      if (error) throw error;

      showToast('Consulta reagendada com sucesso!', 'success');

      if (notifyWhatsApp && appointment.patient_phone) {
        const phone = appointment.patient_phone.replace(/\D/g, '');
        const dataStr = newDate.split('-').reverse().join('/');
        const msg = `Olá, *${appointment.patient_name}*!\n\nSua consulta com *${appointment.specialty}* foi *REAGENDADA*.\n\n📅 Nova Data: *${dataStr}*\n⏰ Horário: *${newTime}*\n🏥 Local: *${newUnit}*\n${newDoctor ? `👨‍⚕️ Profissional: *${newDoctor}*\n` : ''}\nPor favor, confirme sua presença!`;
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao reagendar: ' + err.message, 'error');
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
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800"
      >
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Reagendar Consulta</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Paciente: {appointment.patient_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Unidade de Atendimento</label>
            <select 
              value={newUnit} 
              onChange={e => setNewUnit(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
            >
              {DEFAULT_HEALTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Médico / Profissional</label>
            <input 
              type="text"
              value={newDoctor}
              onChange={e => setNewDoctor(e.target.value)}
              placeholder="Ex: Dr. Roberto"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nova Data *</label>
              <input 
                type="date"
                required
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Novo Horário *</label>
              <input 
                type="time"
                required
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>
          </div>

          {appointment.patient_phone && (
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input 
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={e => setNotifyWhatsApp(e.target.checked)}
                className="rounded text-emerald-600"
              />
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Avisar paciente via WhatsApp sobre a nova data
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Reagendamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Modal de Impressão da Lista Diária
interface PrintDailyListModalProps {
  appointments: Appointment[];
  date: string;
  institutionName: string;
  onClose: () => void;
}

const PrintDailyListModal: React.FC<PrintDailyListModalProps> = ({ appointments, date, institutionName, onClose }) => {
  const formattedDate = date ? date.split('-').reverse().join('/') : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-4xl max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center print:hidden">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Printer size={20} className="text-emerald-500" />
              Lista de Atendimentos do Dia - {formattedDate}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Total de {appointments.length} pacientes listados.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Printer size={16} /> Imprimir Agora (PDF)
            </button>
            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
              <XCircle size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível */}
        <div className="p-8 overflow-y-auto flex-1 bg-white text-neutral-900 print:p-0 print:m-0">
          <div className="border-b-2 border-neutral-900 pb-4 mb-6 text-center">
            <h2 className="text-xl font-black uppercase tracking-wider">{institutionName}</h2>
            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-600">Secretaria Municipal de Saúde</h3>
            <p className="text-xs font-semibold mt-1">Relação Diária de Pacientes Agendados · Data: <strong>{formattedDate}</strong></p>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-300 bg-neutral-50 text-[10px] font-black uppercase tracking-wider">
                <th className="py-2.5 px-3">Hora</th>
                <th className="py-2.5 px-3">Paciente</th>
                <th className="py-2.5 px-3">CPF</th>
                <th className="py-2.5 px-3">Cartão SUS</th>
                <th className="py-2.5 px-3">Especialidade / Profissional</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Assinatura / Visto</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt, idx) => (
                <tr key={apt.id} className={`border-b border-neutral-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}>
                  <td className="py-3 px-3 font-bold">{apt.appointment_time || '--:--'}</td>
                  <td className="py-3 px-3 font-bold text-sm">{apt.patient_name}</td>
                  <td className="py-3 px-3 font-mono text-[11px]">{apt.patient_cpf}</td>
                  <td className="py-3 px-3 font-mono text-[11px]">{apt.patient_sus}</td>
                  <td className="py-3 px-3">
                    <p className="font-bold">{apt.specialty}</p>
                    {apt.doctor_name && <p className="text-[10px] text-neutral-500">{apt.doctor_name}</p>}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-bold uppercase">
                      {apt.checked_in_at ? 'Na Recepção' : apt.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="border-b border-neutral-400 w-28 mx-auto mt-3"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 text-center text-[10px] text-neutral-400 flex justify-between">
            <span>Impresso pelo sistema GESTÃO 360 · {new Date().toLocaleString()}</span>
            <span>Secretaria de Saúde</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
