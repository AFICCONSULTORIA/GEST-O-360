import React, { useState } from 'react';
import { Search, ClipboardList, User, ChevronLeft, Save, Edit2, AlertCircle, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../components/ui/Toast';
import { formatCPF, formatPhone, formatNIS } from '../../lib/masks';

export interface MedicalRecord {
  id: string;
  patientName: string;
  cpf: string;
  nis: string;
  birthDate: string;
  gender: string;
  address: string;
  phone: string;
  emergencyContact: string;
  emergencyPhone: string;
  anamnesis: string;
  psychiatricHistory: string;
  medications: string;
  diagnosis: string; // CID
}

const MOCK_RECORDS: MedicalRecord[] = [
  {
    id: '1',
    patientName: 'Maria Silva',
    cpf: '123.456.789-00',
    nis: '12345678901',
    birthDate: '1985-04-12',
    gender: 'Feminino',
    address: 'Rua das Flores, 123 - Centro',
    phone: '(11) 98765-4321',
    emergencyContact: 'José Silva (Irmão)',
    emergencyPhone: '(11) 91111-2222',
    anamnesis: 'Paciente relata episódios frequentes de taquicardia, sudorese e medo irracional relacionados a problemas familiares e sobrecarga no trabalho. Queixa principal: "Não consigo dormir e sinto que vou ter um infarto".',
    psychiatricHistory: 'Transtorno de Ansiedade Generalizada (TAG) diagnosticado há 2 anos. Avó materna com histórico de depressão.',
    medications: 'Sertralina 50mg/dia, Alprazolam 0.5mg (SOS)',
    diagnosis: 'F41.1 - Transtorno de ansiedade generalizada'
  },
  {
    id: '2',
    patientName: 'João Souza',
    cpf: '987.654.321-11',
    nis: '98765432101',
    birthDate: '2001-08-25',
    gender: 'Masculino',
    address: 'Av. Brasil, 456 - Bairro Novo',
    phone: '(11) 91234-5678',
    emergencyContact: 'Ana Souza (Mãe)',
    emergencyPhone: '(11) 93333-4444',
    anamnesis: 'Paciente trazido pela mãe devido a isolamento social severo, perda de interesse em atividades e queda no rendimento escolar.',
    psychiatricHistory: 'Sem histórico prévio de internações ou acompanhamento psicológico.',
    medications: 'Nenhuma medicação em uso no momento.',
    diagnosis: 'F32 - Episódios depressivos (em investigação)'
  }
];

export const ProntuariosTab = () => {
  const [records, setRecords] = useState<MedicalRecord[]>(MOCK_RECORDS);
  const [search, setSearch] = useState('');
  
  // Views: 'list' -> 'record'
  const [activeView, setActiveView] = useState<'list' | 'record'>('list');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<MedicalRecord>>({});

  const filteredRecords = records.filter(r => 
    r.patientName.toLowerCase().includes(search.toLowerCase()) || 
    r.cpf.includes(search) ||
    r.nis.includes(search)
  );

  const openRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setIsEditing(false);
    setActiveView('record');
  };

  const handleSave = () => {
    if (!formData.patientName) {
      showToast('O nome do paciente é obrigatório.', 'error');
      return;
    }
    
    const updatedRecords = records.map(r => r.id === selectedRecord?.id ? { ...r, ...formData } as MedicalRecord : r);
    MOCK_RECORDS.length = 0;
    MOCK_RECORDS.push(...updatedRecords);
    
    setRecords([...MOCK_RECORDS]);
    setSelectedRecord({ ...selectedRecord, ...formData } as MedicalRecord);
    setIsEditing(false);
    showToast('Prontuário atualizado com sucesso!', 'success');
  };

  if (activeView === 'record' && selectedRecord) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setActiveView('list'); setSelectedRecord(null); }}
              className="p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-500 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                {selectedRecord.patientName}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Prontuário Eletrônico · {isEditing ? 'Modo de Edição' : 'Modo de Visualização'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isEditing ? (
              <>
                <button 
                  onClick={() => showToast('Baixando PDF...')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Download size={16} /> Exportar
                </button>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                >
                  <Edit2 size={16} /> Editar Prontuário
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { setIsEditing(false); setFormData(selectedRecord); }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
                >
                  <Save size={16} /> Salvar Alterações
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm">
          <div className="space-y-8">
            
            {/* Secão 1: Dados Pessoais */}
            <section>
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={16} /> Dados Pessoais e Socioeconômicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Nome Completo</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.patientName || ''}
                    onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">CPF</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    maxLength={14}
                    value={formData.cpf || ''}
                    onChange={e => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Data de Nascimento</label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={formData.birthDate || ''}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Gênero</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.gender || ''}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Endereço Completo</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.address || ''}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Telefone</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    maxLength={15}
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">NIS / CadÚnico</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    maxLength={14}
                    value={formData.nis || ''}
                    onChange={e => setFormData({ ...formData, nis: formatNIS(e.target.value) })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                  />
                </div>
              </div>
            </section>

            <hr className="border-neutral-100 dark:border-neutral-800" />

            {/* Secão 2: Emergência */}
            <section>
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertCircle size={16} /> Contato de Emergência
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Nome / Parentesco</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.emergencyContact || ''}
                    onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Telefone de Emergência</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    maxLength={15}
                    value={formData.emergencyPhone || ''}
                    onChange={e => setFormData({ ...formData, emergencyPhone: formatPhone(e.target.value) })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                  />
                </div>
              </div>
            </section>

            <hr className="border-neutral-100 dark:border-neutral-800" />

            {/* Secão 3: Clínico */}
            <section>
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ClipboardList size={16} /> Dados Clínicos e Anamnese
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Anamnese / Queixa Principal</label>
                  <textarea
                    rows={4}
                    disabled={!isEditing}
                    value={formData.anamnesis || ''}
                    onChange={e => setFormData({ ...formData, anamnesis: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none custom-scrollbar disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                    placeholder="Descrição detalhada do motivo da consulta..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Histórico Médico/Psiquiátrico e Familiar</label>
                    <textarea
                      rows={3}
                      disabled={!isEditing}
                      value={formData.psychiatricHistory || ''}
                      onChange={e => setFormData({ ...formData, psychiatricHistory: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none custom-scrollbar disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Medicamentos em Uso</label>
                    <textarea
                      rows={3}
                      disabled={!isEditing}
                      value={formData.medications || ''}
                      onChange={e => setFormData({ ...formData, medications: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none custom-scrollbar disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Diagnóstico (CID / DSM)</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.diagnosis || ''}
                    onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-neutral-900 dark:text-white"
                    placeholder="Ex: F41.1 - Transtorno de ansiedade generalizada"
                  />
                </div>
              </div>
            </section>

          </div>
        </div>
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
            placeholder="Buscar prontuário por nome, CPF ou NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords.map(record => (
          <div key={record.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 flex flex-col hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-500/5 rounded-bl-[100px] -z-10 transition-transform duration-500 group-hover:scale-110" />
            
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-rose-50 dark:group-hover:bg-rose-500/10 group-hover:text-rose-500 transition-colors">
                <FileText size={28} />
              </div>
            </div>
            
            <h4 className="text-xl font-black text-neutral-900 dark:text-white mb-1 line-clamp-1">{record.patientName}</h4>
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 space-y-1">
              <p>CPF: {record.cpf || 'Não informado'}</p>
              <p>NIS: {record.nis || 'Não informado'}</p>
            </div>
            
            <div className="mt-auto">
              <button 
                onClick={() => openRecord(record)} 
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-sm font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-md"
              >
                Abrir Prontuário
              </button>
            </div>
          </div>
        ))}
        {filteredRecords.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 rounded-[24px] flex items-center justify-center mb-4">
              <ClipboardList size={40} />
            </div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">Nenhum prontuário encontrado</h3>
            <p className="text-neutral-500 text-sm max-w-sm">Tente buscar por outro nome ou documento.</p>
          </div>
        )}
      </div>
    </div>
  );
};
