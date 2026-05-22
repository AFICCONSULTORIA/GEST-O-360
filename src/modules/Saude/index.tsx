import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Calendar, Clock, User, FileText, CheckCircle2, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';

export interface Appointment {
  id: string;
  patient_name: string;
  patient_cpf: string;
  patient_sus: string;
  patient_birth_date: string;
  is_pregnant: boolean;
  is_urgent: boolean;
  specialty: string;
  appointment_date: string;
  status: 'Agendado' | 'Atendido' | 'Cancelado' | 'Faltou';
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

export const SaudeModule = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAppointments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true });
    
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
    if (apt.is_urgent) return -1; // Urgência Máxima
    const age = getAge(apt.patient_birth_date);
    if (age >= 80) return 0; // Especial
    if (age >= 60 || apt.is_pregnant) return 1; // Prioridade
    return 2; // Normal
  };

  useEffect(() => {
    loadAppointments();
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

  const filtered = appointments.filter(a => {
    const matchSearch = a.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        a.patient_cpf.includes(searchQuery) ||
                        a.patient_sus.includes(searchQuery);
    const matchSpecialty = filterSpecialty === 'Todas' || a.specialty === filterSpecialty;
    return matchSearch && matchSpecialty;
  }).sort((a, b) => {
    // Sort by priority first (0 = Especial, 1 = Prioridade, 2 = Normal)
    const pA = getPriorityLevel(a);
    const pB = getPriorityLevel(b);
    if (pA !== pB) return pA - pB;
    // Then sort by date
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
          <div key={apt.id} className={`bg-white dark:bg-neutral-900 rounded-3xl p-6 border ${
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
                    <button onClick={() => updateStatus(apt.id, 'Atendido')} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100" title="Marcar como Atendido"><CheckCircle2 size={16} /></button>
                    <button onClick={() => updateStatus(apt.id, 'Faltou')} className="p-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100" title="Marcar como Falta"><AlertCircle size={16} /></button>
                    <button onClick={() => updateStatus(apt.id, 'Cancelado')} className="p-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100" title="Cancelar"><XCircle size={16} /></button>
                  </>
                ) : (
                  <button onClick={() => updateStatus(apt.id, 'Agendado')} className="p-1.5 text-neutral-600 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700" title="Desfazer ação (Reverter para Agendado)"><RotateCcw size={16} /></button>
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-1">{apt.patient_name}</h3>
            <div className="flex flex-col gap-1 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              <div className="flex items-center gap-2"><FileText size={14} /> <span className="font-mono text-xs">CPF: {apt.patient_cpf}</span></div>
              <div className="flex items-center gap-2"><FileText size={14} /> <span className="font-mono text-xs">SUS: {apt.patient_sus}</span></div>
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
            {apt.notes && (
              <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                <span className="font-bold">Obs:</span> {apt.notes}
              </p>
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
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const NewAppointmentModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_cpf: '',
    patient_sus: '',
    patient_birth_date: '',
    is_pregnant: false,
    is_urgent: false,
    specialty: COMMON_SPECIALTIES[0],
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
      status: 'Agendado'
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
      onClick={onClose}
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
                value={formData.patient_cpf} onChange={e => setFormData({...formData, patient_cpf: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Cartão do SUS *</label>
              <input 
                type="text" required
                value={formData.patient_sus} onChange={e => setFormData({...formData, patient_sus: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                placeholder="000 0000 0000 0000"
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

            <div className="space-y-2">
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
