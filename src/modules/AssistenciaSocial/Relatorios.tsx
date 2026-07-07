import React, { useState } from 'react';
import { Plus, Search, FileText, User, Calendar, Clock, ChevronLeft, X, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../components/ui/Toast';
import { formatCPF, formatPhone } from '../../lib/masks';

export interface PsychologySession {
  id: string;
  date: string;
  type: string;
  summary: string;
}

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  startDate: string;
  sessions: PsychologySession[];
}

const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'Maria Silva',
    cpf: '123.456.789-00',
    phone: '(11) 98765-4321',
    startDate: '2026-06-15',
    sessions: [
      {
        id: 's2',
        date: '2026-07-01',
        type: 'Acompanhamento',
        summary: 'Sessão de acompanhamento semanal. Paciente apresentou melhora no quadro de ansiedade generalizada. Sugerida continuidade do tratamento quinzenal.'
      },
      {
        id: 's1',
        date: '2026-06-15',
        type: 'Avaliação',
        summary: 'Primeira sessão de avaliação psicológica. Realizada anamnese e identificados sintomas de ansiedade devido a estresse familiar.'
      }
    ]
  },
  {
    id: '2',
    name: 'João Souza',
    cpf: '987.654.321-11',
    phone: '(11) 91234-5678',
    startDate: '2026-07-05',
    sessions: [
      {
        id: 's3',
        date: '2026-07-05',
        type: 'Avaliação',
        summary: 'Sessão inicial para acolhimento de demandas. Paciente relata conflitos intensos no ambiente de trabalho.'
      }
    ]
  }
];

export const RelatoriosTab = () => {
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [search, setSearch] = useState('');
  
  // Views: 'list' -> 'dossier'
  const [activeView, setActiveView] = useState<'list' | 'dossier'>('list');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Modals
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PsychologySession | null>(null);

  // Form states
  const [patientForm, setPatientForm] = useState({ name: '', cpf: '', phone: '' });
  const [sessionForm, setSessionForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'Acompanhamento', summary: '' });

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.cpf.includes(search));

  const handleSavePatient = () => {
    if (!patientForm.name) {
      showToast('O nome do paciente é obrigatório', 'error');
      return;
    }
    
    if (editingPatient) {
      const updatedPatients = patients.map(p => p.id === editingPatient.id ? { ...p, name: patientForm.name, cpf: patientForm.cpf, phone: patientForm.phone } : p);
      MOCK_PATIENTS.length = 0;
      MOCK_PATIENTS.push(...updatedPatients);
      setPatients([...MOCK_PATIENTS]);
      if (selectedPatient?.id === editingPatient.id) {
        setSelectedPatient({ ...selectedPatient, name: patientForm.name, cpf: patientForm.cpf, phone: patientForm.phone });
      }
      showToast('Paciente atualizado!', 'success');
    } else {
      const newPatient: Patient = {
        id: crypto.randomUUID(),
        name: patientForm.name,
        cpf: patientForm.cpf,
        phone: patientForm.phone,
        startDate: new Date().toISOString().split('T')[0],
        sessions: []
      };
      MOCK_PATIENTS.unshift(newPatient);
      setPatients([...MOCK_PATIENTS]);
      showToast('Paciente cadastrado!', 'success');
    }
    
    setIsNewPatientModalOpen(false);
    setEditingPatient(null);
    setPatientForm({ name: '', cpf: '', phone: '' });
  };

  const handleDeletePatient = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este paciente e todo o seu dossiê?')) {
      const updatedPatients = patients.filter(p => p.id !== id);
      MOCK_PATIENTS.length = 0;
      MOCK_PATIENTS.push(...updatedPatients);
      setPatients([...MOCK_PATIENTS]);
      showToast('Paciente excluído', 'info');
    }
  };

  const handleSaveSession = () => {
    if (!selectedPatient) return;
    if (!sessionForm.date || !sessionForm.summary) {
      showToast('Data e resumo são obrigatórios', 'error');
      return;
    }

    const updatedPatients = patients.map(p => {
      if (p.id === selectedPatient.id) {
        let updatedSessions;
        if (editingSession) {
          updatedSessions = p.sessions.map(s => s.id === editingSession.id ? { ...s, ...sessionForm } : s);
        } else {
          updatedSessions = [{ id: crypto.randomUUID(), ...sessionForm }, ...p.sessions];
        }
        // Sort sessions by date descending
        updatedSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const updatedPatient = { ...p, sessions: updatedSessions };
        setSelectedPatient(updatedPatient);
        return updatedPatient;
      }
      return p;
    });

    MOCK_PATIENTS.length = 0;
    MOCK_PATIENTS.push(...updatedPatients);

    setPatients([...MOCK_PATIENTS]);
    setIsSessionModalOpen(false);
    setEditingSession(null);
    setSessionForm({ date: new Date().toISOString().split('T')[0], type: 'Acompanhamento', summary: '' });
    showToast(editingSession ? 'Sessão atualizada!' : 'Sessão registrada!', 'success');
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!selectedPatient) return;
    if (confirm('Excluir este registro de sessão?')) {
      const updatedPatients = patients.map(p => {
        if (p.id === selectedPatient.id) {
          const updatedPatient = { ...p, sessions: p.sessions.filter(s => s.id !== sessionId) };
          setSelectedPatient(updatedPatient);
          return updatedPatient;
        }
        return p;
      });
      
      MOCK_PATIENTS.length = 0;
      MOCK_PATIENTS.push(...updatedPatients);
      
      setPatients([...MOCK_PATIENTS]);
      showToast('Sessão excluída', 'info');
    }
  };

  if (activeView === 'dossier' && selectedPatient) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setActiveView('list'); setSelectedPatient(null); }}
            className="p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-500 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
              {selectedPatient.name}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              CPF: {selectedPatient.cpf || 'Não informado'} · Acompanhamento desde {new Date(selectedPatient.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Column: Timeline */}
          <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                <FileText className="text-rose-500" size={24} /> Histórico de Sessões
              </h3>
              <button
                onClick={() => {
                  setEditingSession(null);
                  setSessionForm({ date: new Date().toISOString().split('T')[0], type: 'Acompanhamento', summary: '' });
                  setIsSessionModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
              >
                <Plus size={16} /> Registrar Sessão
              </button>
            </div>

            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 dark:before:via-neutral-800 before:to-transparent">
              {selectedPatient.sessions.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 relative z-10 bg-white dark:bg-neutral-900">
                  Nenhuma sessão registrada. Comece adicionando o primeiro acompanhamento.
                </div>
              ) : (
                selectedPatient.sessions.map((session, idx) => (
                  <div key={session.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-neutral-900 bg-rose-100 dark:bg-rose-500/20 text-rose-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                      <Clock size={16} />
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow relative">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="px-2.5 py-1 bg-white dark:bg-neutral-900 text-[10px] font-black uppercase tracking-widest text-neutral-500 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm inline-block mb-2">
                            {session.type}
                          </span>
                          <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Calendar size={14} className="text-neutral-400" />
                            {new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </h4>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingSession(session); setSessionForm(session); setIsSessionModalOpen(true); }} className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteSession(session.id)} className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">
                        {session.summary}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Nova Sessão */}
        <AnimatePresence>
          {isSessionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[40px] p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
                      <Plus size={20} />
                    </div>
                    {editingSession ? 'Editar Sessão' : 'Registrar Sessão'}
                  </h3>
                  <button onClick={() => setIsSessionModalOpen(false)} className="p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Data da Sessão *</label>
                      <input
                        type="date"
                        value={sessionForm.date}
                        onChange={e => setSessionForm({ ...sessionForm, date: e.target.value })}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Tipo de Sessão</label>
                      <select
                        value={sessionForm.type}
                        onChange={e => setSessionForm({ ...sessionForm, type: e.target.value })}
                        className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                      >
                        <option value="Avaliação">Avaliação</option>
                        <option value="Acompanhamento">Acompanhamento</option>
                        <option value="Alta">Alta</option>
                        <option value="Encaminhamento">Encaminhamento</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Resumo / Evolução do Quadro *</label>
                    <textarea
                      rows={6}
                      value={sessionForm.summary}
                      onChange={e => setSessionForm({ ...sessionForm, summary: e.target.value })}
                      className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none custom-scrollbar"
                      placeholder="Descreva detalhadamente a evolução do paciente, temas abordados e próximos passos..."
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button onClick={() => setIsSessionModalOpen(false)} className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleSaveSession} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20">
                    {editingSession ? 'Salvar Edição' : 'Registrar Sessão'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            placeholder="Buscar paciente por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
        <button
          onClick={() => {
            setEditingPatient(null);
            setPatientForm({ name: '', cpf: '', phone: '' });
            setIsNewPatientModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
        >
          <Plus size={18} /> Iniciar Acompanhamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 flex flex-col hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-500/5 rounded-bl-[100px] -z-10 transition-transform duration-500 group-hover:scale-110" />
            
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-rose-50 dark:group-hover:bg-rose-500/10 group-hover:text-rose-500 transition-colors">
                <User size={28} />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-500 border border-neutral-100 dark:border-neutral-700">
                  {patient.sessions.length} {patient.sessions.length === 1 ? 'Sessão' : 'Sessões'}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingPatient(patient); setPatientForm({ name: patient.name, cpf: patient.cpf, phone: patient.phone }); setIsNewPatientModalOpen(true); }} className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg bg-neutral-50 dark:bg-neutral-800" title="Editar">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDeletePatient(patient.id)} className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg bg-neutral-50 dark:bg-neutral-800" title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            
            <h4 className="text-xl font-black text-neutral-900 dark:text-white mb-1 line-clamp-1">{patient.name}</h4>
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 space-y-1">
              <p>CPF: {patient.cpf || 'Não informado'}</p>
              <p>Último atend.: {patient.sessions.length > 0 ? new Date(patient.sessions[0].date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Nenhum'}</p>
            </div>
            
            <div className="mt-auto">
              <button 
                onClick={() => { setSelectedPatient(patient); setActiveView('dossier'); }} 
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-sm font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-md"
              >
                Acessar Dossiê <ChevronLeft size={16} className="rotate-180" />
              </button>
            </div>
          </div>
        ))}
        {filteredPatients.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 rounded-[24px] flex items-center justify-center mb-4">
              <User size={40} />
            </div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">Nenhum paciente encontrado</h3>
            <p className="text-neutral-500 text-sm max-w-sm">Comece clicando em "Iniciar Acompanhamento" para adicionar um novo paciente.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isNewPatientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-8 sm:p-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                  <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                    <User size={24} />
                  </div>
                  {editingPatient ? 'Editar Paciente' : 'Novo Acompanhamento'}
                </h3>
                <button onClick={() => setIsNewPatientModalOpen(false)} className="p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Nome do Paciente *</label>
                  <input
                    type="text"
                    value={patientForm.name}
                    onChange={e => setPatientForm({ ...patientForm, name: e.target.value })}
                    className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
                    placeholder="Nome completo"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">CPF</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={patientForm.cpf}
                      onChange={e => setPatientForm({ ...patientForm, cpf: formatCPF(e.target.value) })}
                      className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={patientForm.phone}
                      onChange={e => setPatientForm({ ...patientForm, phone: formatPhone(e.target.value) })}
                      className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-3">
                <button onClick={() => setIsNewPatientModalOpen(false)} className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSavePatient} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20">
                  {editingPatient ? 'Salvar Edição' : 'Cadastrar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
