import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Calendar, Clock, User, FileText, CheckCircle2, XCircle, AlertCircle, RotateCcw, Trash2, Phone, MessageCircle, LayoutGrid, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { FarmaciaModule } from './Farmacia';

export interface Appointment {
  id: string;
  patient_name: string;
  patient_cpf: string;
  patient_sus: string;
  patient_phone?: string;
  whatsapp_sent?: boolean;
  patient_birth_date: string;
  is_pregnant: boolean;
  is_urgent: boolean;
  specialty: string;
  referral_details?: string;
  appointment_date: string;
  appointment_time?: string;
  status: 'Aguardando Regulação' | 'Agendado' | 'Atendido' | 'Cancelado' | 'Faltou';
  notes?: string;
  created_at?: string;
}

const COMMON_SPECIALTIES = [
  'Clínico Geral',
  'Pediatria',
  'Ginecologia',
  'Odontologia',
  'Fisioterapia',
  'Ortopedia',
  'Psicologia',
  'Enfermagem'
];

const formatCPF = (value: string) => {
  let v = value.replace(/\D/g, '').substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1-$2');
  return v;
};

const formatSUS = (value: string) => {
  let v = value.replace(/\D/g, '').substring(0, 15);
  v = v.replace(/(\d{3})(\d)/, '$1 $2');
  v = v.replace(/(\d{4})(\d)/, '$1 $2');
  v = v.replace(/(\d{4})(\d)/, '$1 $2');
  return v;
};

const formatPhone = (value: string) => {
  let v = value.replace(/\D/g, '').substring(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (v.length > 5) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else {
    v = v.replace(/^(\d*)/, '($1');
  }
  return v;
};

const AgendamentosModule = ({ currentInstitution }: { currentInstitution?: { id: string } | null }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const loadAppointments = async () => {
    setIsLoading(true);
    let query = supabase.from('appointments').select('*');
    if (currentInstitution?.id) query = query.eq('institution_id', currentInstitution.id);
    const { data, error } = await query.order('appointment_date', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar agendamentos:', error);
      showToast('Erro ao carregar agendamentos', 'error');
    } else if (data) {
      setAppointments(data as Appointment[]);
    }
    setIsLoading(false);
  };

  const getAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getPriorityLevel = (apt: Appointment) => {
    if (apt.is_urgent) return -1;
    const age = getAge(apt.patient_birth_date);
    if (age >= 80) return 0;
    if (age >= 60 || apt.is_pregnant) return 1;
    return 2;
  };

  useEffect(() => {
    loadAppointments();

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (error) {
      showToast('Erro ao atualizar status', 'error');
    } else {
      setAppointments(appointments.map(a => a.id === id ? { ...a, status: newStatus as any } : a));
      showToast('Status atualizado!', 'success');
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento permanentemente?')) return;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir agendamento', 'error');
    } else {
      setAppointments(appointments.filter(a => a.id !== id));
      showToast('Agendamento excluído com sucesso!', 'success');
    }
  };

  const getWhatsAppLink = (apt: Appointment) => {
    if (!apt.patient_phone) return '#';
    const phone = apt.patient_phone.replace(/\D/g, '');
    
    let text = '';
    
    if (apt.appointment_time) {
      const dataStr = apt.appointment_date.split('-').reverse().join('/');
      text = `Sua consulta para *${apt.specialty}* está confirmada para o dia *${dataStr}* às *${apt.appointment_time}*.\nPor favor, confirme sua presença.`;
    } else {
      text = `Olá, ${apt.patient_name}! Somos da Secretaria de Saúde.\n\nInformamos que a sua solicitação de consulta para *${apt.specialty}* foi recebida com sucesso!\n\nEm breve entraremos em contato para informar o horário e o dia da sua consulta.`;
      
      if (apt.specialty !== 'Clínico Geral') {
        text += `\n\nPara agilizarmos o seu atendimento, por favor, nos envie uma foto ou o arquivo em PDF do seu encaminhamento médico por aqui mesmo.`;
      }
    }
    
    return `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
  };

  const handleWhatsAppClick = async (apt: Appointment) => {
    // Simula o envio via servidor (Central de Comunicação)
    showToast(`Enviando notificação via Central para ${apt.patient_name}...`, 'info');
    
    setTimeout(async () => {
      showToast('Notificação enviada com sucesso!', 'success');
      if (!apt.whatsapp_sent) {
        setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, whatsapp_sent: true } : a));
        await supabase.from('appointments').update({ whatsapp_sent: true }).eq('id', apt.id);
      }
    }, 1500);
  };

  const handleSaveDateTime = async (aptId: string, newDate: string, newTime: string) => {
    const { error } = await supabase.from('appointments').update({ 
      appointment_date: newDate, 
      appointment_time: newTime,
      status: 'Agendado' 
    }).eq('id', aptId);
    
    if (error) {
      showToast('Erro ao salvar data e horário.', 'error');
    } else {
      showToast('Agendamento confirmado com sucesso!', 'success');
      setSelectedAppointment(null);
    }
  };

  const filtered = appointments.filter(a => {
    const matchSearch = a.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        a.patient_cpf.includes(searchQuery) ||
                        a.patient_sus.includes(searchQuery);
    const matchSpecialty = filterSpecialty === 'Todas' || a.specialty === filterSpecialty;
    return matchSearch && matchSpecialty;
  }).sort((a, b) => {
    const pA = getPriorityLevel(a);
    const pB = getPriorityLevel(b);
    if (pA !== pB) return pA - pB;
    return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-6">
        <div>
          <h2 className="text-2xl font-bold italic tracking-tight uppercase dark:text-neutral-100 flex items-center gap-3">
            <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 p-2 rounded-xl">
              <Plus size={24} />
            </span>
            Secretaria de Saúde
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">Agendamento e controle de consultas para a população.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar paciente ou CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all min-w-[250px] dark:text-white"
            />
          </div>
          
          <select 
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm font-bold outline-none dark:text-white"
          >
            <option value="Todas">Todas as Especialidades</option>
            {COMMON_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
          >
            <Calendar size={18} /> Novo Agendamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(apt => {
          const priority = getPriorityLevel(apt);
          const isUrgent = priority === -1;
          
          return (
          <div key={apt.id} onClick={() => setSelectedAppointment(apt)} className={`bg-white dark:bg-neutral-900 rounded-[32px] p-8 border cursor-pointer ${
            isUrgent ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-[pulse_2s_ease-in-out_infinite]' : 'border-neutral-100 dark:border-neutral-800 hover:shadow-md'
          } transition-all relative overflow-hidden group`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full ${
              isUrgent ? 'bg-red-600' :
              apt.status === 'Agendado' ? 'bg-sky-500' :
              apt.status === 'Atendido' ? 'bg-emerald-500' :
              apt.status === 'Faltou' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  apt.status === 'Agendado' ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' :
                  apt.status === 'Atendido' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  apt.status === 'Faltou' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 
                  'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                }`}>{apt.status}</span>
                
                {priority === -1 && (
                  <span title="Atendimento imediato necessário" className="cursor-help text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-red-600 text-white shadow-sm shadow-red-500/40">URGÊNCIA MÉDICA</span>
                )}
                {priority === 0 && (
                  <span title="Paciente com 80 anos ou mais" className="cursor-help text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/30">Prioridade Especial</span>
                )}
                {priority === 1 && (
                  <span title="Paciente com 60 a 79 anos ou gestante" className="cursor-help text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">Prioridade</span>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {apt.status === 'Agendado' ? (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); updateStatus(apt.id, 'Atendido'); }} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100" title="Marcar como Atendido"><CheckCircle2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); updateStatus(apt.id, 'Faltou'); }} className="p-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100" title="Marcar como Falta"><AlertCircle size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); updateStatus(apt.id, 'Cancelado'); }} className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100" title="Cancelar"><XCircle size={16} /></button>
                  </>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); updateStatus(apt.id, 'Agendado'); }} className="p-1.5 text-neutral-600 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Desfazer ação (Reverter para Agendado)"><RotateCcw size={16} /></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); deleteAppointment(apt.id); }} className="p-1.5 text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 ml-1" title="Excluir Permanentemente"><Trash2 size={16} /></button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">{apt.patient_name}</h3>
            <div className="flex flex-col gap-1 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              <div className="flex items-center gap-2"><FileText size={14} /> <span className="font-mono text-xs">CPF: {apt.patient_cpf}</span></div>
              <div className="flex items-center gap-2"><FileText size={14} /> <span className="font-mono text-xs">SUS: {apt.patient_sus}</span></div>
              {apt.patient_phone ? (
                <div className="flex items-center gap-2"><Phone size={14} /> <span className="font-mono text-xs">Tel: {apt.patient_phone}</span></div>
              ) : (
                <div className="flex items-center gap-2 opacity-50"><Phone size={14} /> <span className="text-xs italic">Sem telefone registrado</span></div>
              )}
              <div className="flex items-center gap-2"><Calendar size={14} /> <span className="text-xs">Nasc: {apt.patient_birth_date.split('-').reverse().join('/')}</span></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl">
                <User size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold dark:text-neutral-200">{apt.specialty}</span>
              </div>
              <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl">
                <Calendar size={16} className="text-sky-600 dark:text-sky-400" />
                <span className="text-sm font-bold dark:text-neutral-200">
                  {apt.appointment_date.split('-').reverse().join('/')}
                </span>
              </div>
            </div>
            {apt.referral_details && (
              <div className="mt-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-3 rounded-xl flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/70 dark:text-amber-500/70">Encaminhamento</p>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-300">{apt.referral_details}</p>
                </div>
              </div>
            )}
            {apt.notes && (
              <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                <span className="font-bold">Obs:</span> {apt.notes}
              </p>
            )}

            {apt.patient_phone && (
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-4">
                {apt.whatsapp_sent ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} /> Mensagem Enviada
                  </div>
                ) : (
                  <div></div>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleWhatsAppClick(apt); }}
                  className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-sm border ${
                    apt.whatsapp_sent 
                      ? 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700' 
                      : 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 hover:bg-[#25D366]/20 dark:bg-[#25D366]/20 dark:text-[#25D366] dark:hover:bg-[#25D366]/30'
                  }`}
                >
                  <MessageCircle size={16} /> {apt.whatsapp_sent ? 'Reenviar' : 'WhatsApp'}
                </button>
              </div>
            )}
          </div>
        )})}

        {filtered.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center text-neutral-400">
            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">Nenhum agendamento encontrado.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewAppointmentModal 
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => { loadAppointments(); setIsModalOpen(false); }}
            currentInstitution={currentInstitution}
          />
        )}
        {selectedAppointment && (
          <AppointmentDetailsModal
            apt={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            onSave={(d, t) => handleSaveDateTime(selectedAppointment.id, d, t)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const AppointmentDetailsModal = ({ apt, onClose, onSave }: { apt: Appointment, onClose: () => void, onSave: (d: string, t: string) => void }) => {
  const [editDate, setEditDate] = useState(apt.appointment_date);
  const [editTime, setEditTime] = useState(apt.appointment_time || '');
  const isEditable = apt.status === 'Aguardando Regulação' || apt.status === 'Agendado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800"
      >
        <div className="p-8 pb-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Detalhes do Agendamento</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">ID: {apt.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500 dark:text-neutral-400">
            <XCircle size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Paciente</p>
              <p className="font-bold text-neutral-900 dark:text-white">{apt.patient_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Especialidade</p>
              <div className="flex items-center gap-2">
                <User size={16} className="text-emerald-500" />
                <p className="font-bold text-neutral-900 dark:text-white">{apt.specialty}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Status do Agendamento</p>
              <p className="font-bold text-neutral-900 dark:text-white">{apt.status}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Data de Nascimento</p>
              <p className="font-bold text-neutral-900 dark:text-white">{apt.patient_birth_date.split('-').reverse().join('/')}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">CPF</p>
              <p className="font-mono text-neutral-900 dark:text-white">{apt.patient_cpf}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Cartão do SUS</p>
              <p className="font-mono text-neutral-900 dark:text-white">{apt.patient_sus}</p>
            </div>
            {apt.patient_phone && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Telefone / WhatsApp</p>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-neutral-500" />
                  <p className="font-mono text-neutral-900 dark:text-white">{apt.patient_phone}</p>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-4">Definição de Data e Horário</p>
            {isEditable ? (
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Data da Consulta</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-white" />
                </div>
                <div className="flex-1 w-full space-y-1">
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Horário</label>
                  <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all dark:text-white" />
                </div>
                <button onClick={() => onSave(editDate, editTime)} className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20">
                  Confirmar Agendamento
                </button>
              </div>
            ) : (
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Data</p>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-sky-500" />
                    <p className="font-bold text-neutral-900 dark:text-white">{apt.appointment_date.split('-').reverse().join('/')}</p>
                  </div>
                </div>
                {apt.appointment_time && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Horário</p>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-emerald-500" />
                      <p className="font-bold text-neutral-900 dark:text-white">{apt.appointment_time}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {(apt.is_pregnant || apt.is_urgent) && (
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6 flex gap-4">
              {apt.is_pregnant && (
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 text-xs font-bold uppercase tracking-widest border border-amber-200 dark:border-amber-500/30">
                  Gestante
                </span>
              )}
              {apt.is_urgent && (
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-xs font-bold uppercase tracking-widest border border-red-200 dark:border-red-500/30">
                  Urgência Médica
                </span>
              )}
            </div>
          )}

          {apt.referral_details && (
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">Detalhes do Encaminhamento</p>
              <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-300">{apt.referral_details}</p>
              </div>
            </div>
          )}

          {apt.notes && (
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">Observações / Sintomas / Motivo</p>
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{apt.notes}</p>
              </div>
            </div>
          )}
        </div>
        <div className="p-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-lg shadow-neutral-900/20"
          >
            Fechar Janela
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const NewAppointmentModal = ({ onClose, onSuccess, currentInstitution }: { onClose: () => void, onSuccess: () => void, currentInstitution?: { id: string } | null }) => {
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_cpf: '',
    patient_sus: '',
    patient_phone: '',
    patient_birth_date: '',
    is_pregnant: false,
    is_urgent: false,
    specialty: COMMON_SPECIALTIES[0],
    referral_details: '',
    appointment_date: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newAppointment = {
      id: Math.random().toString(36).substring(2, 10),
      ...formData,
      referral_details: formData.specialty === 'Clínico Geral' ? null : formData.referral_details,
      status: 'Agendado',
      institution_id: currentInstitution?.id || null
    };

    const { error } = await supabase.from('appointments').insert(newAppointment);

    if (error) {
      showToast('Erro ao agendar consulta: ' + error.message, 'error');
      console.error(error);
    } else {
      showToast('Consulta agendada com sucesso!', 'success');
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20">
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
            <Calendar size={24} className="text-emerald-600 dark:text-emerald-400" /> 
            Novo Agendamento
          </h3>
          <button onClick={onClose} className="p-2 bg-white dark:bg-neutral-800 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <XCircle size={20} className="text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Nome Completo do Paciente *</label>
              <input 
                type="text" required
                value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                placeholder="Ex: João da Silva Santos"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">CPF *</label>
              <input 
                type="text" required
                value={formData.patient_cpf} onChange={e => setFormData({...formData, patient_cpf: formatCPF(e.target.value)})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Cartão do SUS *</label>
              <input 
                type="text" required
                value={formData.patient_sus} onChange={e => setFormData({...formData, patient_sus: formatSUS(e.target.value)})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                placeholder="000 0000 0000 0000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Telefone / WhatsApp *</label>
              <input 
                type="text" required
                value={formData.patient_phone} onChange={e => setFormData({...formData, patient_phone: formatPhone(e.target.value)})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Data de Nascimento *</label>
              <input 
                type="date" required
                value={formData.patient_birth_date} onChange={e => setFormData({...formData, patient_birth_date: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
              />
            </div>

            <div className="space-y-2 flex items-end pb-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  formData.is_pregnant 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 group-hover:border-emerald-500'
                }`}>
                  {formData.is_pregnant && <CheckCircle2 size={16} />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={formData.is_pregnant}
                  onChange={(e) => setFormData({...formData, is_pregnant: e.target.checked})}
                />
                <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                  Paciente Gestante
                </span>
              </label>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle size={16} /> Atendimento de Urgência
                  </h4>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">Marque apenas em casos de risco imediato. Paciente será colocado no topo absoluto da fila.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={formData.is_urgent} onChange={(e) => setFormData({...formData, is_urgent: e.target.checked})} />
                  <div className="w-11 h-6 bg-red-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Especialidade / Médico *</label>
              <select 
                required
                value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
              >
                {COMMON_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {formData.specialty !== 'Clínico Geral' && (
              <div className="space-y-2 md:col-span-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl animate-in fade-in">
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-800/70 dark:text-amber-500 ml-1">Médico Solicitante / CRM / Nº da Guia *</label>
                <input 
                  type="text" required
                  value={formData.referral_details} onChange={e => setFormData({...formData, referral_details: e.target.value})}
                  className="w-full bg-white dark:bg-neutral-950 border border-amber-200 dark:border-amber-800 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-amber-500/10 outline-none transition-all dark:text-white"
                  placeholder="Ex: Dr. Carlos CRM: 12345"
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Data da Consulta *</label>
              <input 
                type="date" required
                value={formData.appointment_date} onChange={e => setFormData({...formData, appointment_date: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Observações / Sintomas</label>
              <textarea 
                rows={3}
                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                placeholder="Detalhes adicionais sobre o agendamento..."
              />
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export const SaudeModule = ({ currentInstitution }: { currentInstitution?: { id: string } | null }) => {
  const [activeTab, setActiveTab] = useState<'agendamentos' | 'farmacia'>('agendamentos');

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-neutral-900 p-2 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex gap-2 w-fit">
        <button
          onClick={() => setActiveTab('agendamentos')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'agendamentos'
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
              : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <LayoutGrid size={18} />
          Agendamentos
        </button>
        <button
          onClick={() => setActiveTab('farmacia')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'farmacia'
              ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400'
              : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Package size={18} />
          Farmácia SUS
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'agendamentos' ? <AgendamentosModule currentInstitution={currentInstitution} /> : <FarmaciaModule currentInstitution={currentInstitution} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
