import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  HeartPulse, Printer, Filter, X, Search, Calendar, 
  Building2, UserCheck, AlertTriangle, Pill, Activity, Download
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Appointment, ExamRequest, Patient } from '../../Saude/types';
import { Medication } from '../../Saude/Farmacia';
import { DEFAULT_MEDICATIONS } from '../../Saude/index';

interface SaudeReportModalProps {
  reportType: 'producao' | 'farmacia' | 'exames' | 'cronicos';
  onClose: () => void;
  currentInstitution?: { id: string; name?: string } | null;
}

export const SaudeReportModal: React.FC<SaudeReportModalProps> = ({
  reportType,
  onClose,
  currentInstitution
}) => {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'config' | 'preview'>('config');

  // Dados carregados
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Filtros gerais
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUnit, setFilterUnit] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const institutionName = currentInstitution?.name || 'Prefeitura Municipal de Torixoréu';

  useEffect(() => {
    loadData();
  }, [reportType]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (reportType === 'producao') {
        let q = supabase.from('appointments').select('*');
        if (currentInstitution?.id) q = q.eq('institution_id', currentInstitution.id);
        const { data, error } = await q.order('appointment_date', { ascending: false });
        if (!error && data && data.length > 0) {
          setAppointments(data as Appointment[]);
        } else {
          const local = localStorage.getItem('gestao360_demo_saude_appointments');
          if (local) setAppointments(JSON.parse(local));
          else setAppointments([]);
        }
      } else if (reportType === 'farmacia') {
        let q = supabase.from('medications').select('*');
        if (currentInstitution?.id) q = q.eq('institution_id', currentInstitution.id);
        const { data, error } = await q.order('name');
        if (!error && data && data.length > 0) {
          setMedications(data as Medication[]);
        } else {
          const local = localStorage.getItem('gestao360_demo_saude_medications');
          if (local) setMedications(JSON.parse(local));
          else setMedications(DEFAULT_MEDICATIONS);
        }
      } else if (reportType === 'exames') {
        let q = supabase.from('exam_requests').select('*');
        if (currentInstitution?.id) q = q.eq('institution_id', currentInstitution.id);
        const { data, error } = await q.order('requested_date', { ascending: false });
        if (!error && data && data.length > 0) {
          setExams(data as ExamRequest[]);
        } else {
          const local = localStorage.getItem('gestao360_demo_saude_exams');
          if (local) setExams(JSON.parse(local));
          else setExams([]);
        }
      } else if (reportType === 'cronicos') {
        let q = supabase.from('patients').select('*');
        if (currentInstitution?.id) q = q.eq('institution_id', currentInstitution.id);
        const { data, error } = await q.order('name');
        if (!error && data && data.length > 0) {
          setPatients(data as Patient[]);
        } else {
          const local = localStorage.getItem('gestao360_demo_saude_patients');
          if (local) setPatients(JSON.parse(local));
          else setPatients([]);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar dados do relatório:', e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Filtragem de Produção da Atenção Básica
  const filteredAppointments = appointments.filter(a => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (a.patient_name || '').toLowerCase().includes(q) ||
      (a.patient_cpf || '').includes(q) ||
      (a.doctor_name || '').toLowerCase().includes(q) ||
      (a.specialty || '').toLowerCase().includes(q);

    const matchUnit = filterUnit === 'Todas' || a.unit_name === filterUnit;
    const matchStatus = filterStatus === 'Todos' || a.status === filterStatus;
    const matchStart = startDate ? (a.appointment_date >= startDate) : true;
    const matchEnd = endDate ? (a.appointment_date <= endDate) : true;

    return matchSearch && matchUnit && matchStatus && matchStart && matchEnd;
  });

  // 2. Filtragem de Medicamentos
  const filteredMeds = medications.filter(m => {
    const q = searchQuery.toLowerCase();
    return (m.name || '').toLowerCase().includes(q) || (m.active_ingredient || '').toLowerCase().includes(q);
  });

  // 3. Filtragem de Exames
  const filteredExams = exams.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (e.patient_name || '').toLowerCase().includes(q) ||
      (e.patient_cpf || '').includes(q) ||
      (e.exam_name || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'Todos' || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // 4. Filtragem de Pacientes Crônicos
  const filteredPatients = patients.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (p.name || '').toLowerCase().includes(q) ||
      (p.cpf || '').includes(q) ||
      (p.conditions || '').toLowerCase().includes(q);
    const matchUnit = filterUnit === 'Todas' || p.ubs_reference === filterUnit;
    return matchSearch && matchUnit;
  });

  const getReportTitle = () => {
    switch (reportType) {
      case 'producao': return 'Boletim Mensal de Produção da Atenção Básica';
      case 'farmacia': return 'Relatório de Estoque e Consumo da Farmácia SUS';
      case 'exames': return 'Relatório de Regulação de Exames & Custos Estimados';
      case 'cronicos': return 'Painel Epidemiológico de Pacientes Crônicos e Gestantes';
    }
  };

  if (step === 'config') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <HeartPulse size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white">{getReportTitle()}</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{institutionName} • Secretaria de Saúde</p>
              </div>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"><X size={24} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Filtro de Busca Rápida</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Filtrar por nome, CPF, especialidade..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {reportType === 'producao' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Período Inicial (De)</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Período Final (Até)</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Unidade de Atendimento</label>
                    <select
                      value={filterUnit}
                      onChange={e => setFilterUnit(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                    >
                      <option value="Todas">Todas as Unidades</option>
                      <option value="UBS Central">UBS Central</option>
                      <option value="ESF Zona Rural">ESF Zona Rural</option>
                      <option value="Centro Integrado de Saúde">Centro Integrado de Saúde</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Situação do Atendimento</label>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                    >
                      <option value="Todos">Todos os Status</option>
                      <option value="Atendido">Atendidos (Concluídos)</option>
                      <option value="Agendado">Agendados</option>
                      <option value="Aguardando Regulação">Fila / Regulação</option>
                      <option value="Faltou">Faltou (Absenteísmo)</option>
                      <option value="Cancelado">Cancelados</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {reportType === 'exames' && (
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Situação dos Exames</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                >
                  <option value="Todos">Todos os Exames</option>
                  <option value="Solicitado">Aguardando Regulação</option>
                  <option value="Aprovado">Aprovados</option>
                  <option value="Agendado">Agendados</option>
                  <option value="Realizado">Realizados</option>
                  <option value="Bloqueado por Duplicidade">Bloqueados por Duplicidade</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <button onClick={onClose} className="px-5 py-2.5 font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-xs">
              Cancelar
            </button>
            <button
              onClick={() => setStep('preview')}
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              {loading ? 'Carregando dados...' : 'Visualizar Relatório Oficial'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Visualização e Impressão Timbrada Oficial
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-neutral-100 print:bg-white text-black flex flex-col print:block overflow-auto">
      {/* Barra de Ações (Oculta na impressão) */}
      <div className="sticky top-0 bg-white border-b border-neutral-300 p-4 flex items-center justify-between shadow-md print:hidden z-50">
        <div>
          <h3 className="font-black text-sm text-neutral-900">{getReportTitle()}</h3>
          <p className="text-xs text-neutral-500">{institutionName} • Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} /> Imprimir / Salvar PDF
          </button>
          <button
            onClick={() => setStep('config')}
            className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Filter size={16} /> Filtros
          </button>
          <button
            onClick={onClose}
            className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <X size={16} /> Fechar
          </button>
        </div>
      </div>

      {/* Folha do Relatório Timbrada */}
      <div className="max-w-5xl mx-auto my-6 p-8 sm:p-12 bg-white shadow-2xl print:shadow-none print:m-0 print:p-0 min-h-[297mm]">
        {/* Cabeçalho Oficial */}
        <div className="border-b-2 border-neutral-900 pb-5 mb-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-16 h-16 flex items-center justify-center shrink-0">
            <img src="/brasao-municipio.png" alt="Brasão" className="max-h-16 max-w-full object-contain" onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-neutral-900">{institutionName}</h1>
            <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-800">Secretaria Municipal de Saúde • SUS</h2>
            <p className="text-xs font-bold text-neutral-600 mt-1">{getReportTitle()}</p>
          </div>
          <div className="text-right text-[11px] text-neutral-500 font-mono shrink-0">
            <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
            <p>Hora: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* CONTEÚDO 1: PRODUÇÃO DA ATENÇÃO BÁSICA */}
        {reportType === 'producao' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-neutral-500">Total Consultas</p>
                <p className="text-xl font-black text-neutral-900">{filteredAppointments.length}</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-emerald-700">Atendidos</p>
                <p className="text-xl font-black text-emerald-700">
                  {filteredAppointments.filter(a => a.status === 'Atendido').length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-amber-700">Na Fila (Regulação)</p>
                <p className="text-xl font-black text-amber-700">
                  {filteredAppointments.filter(a => a.status === 'Aguardando Regulação').length}
                </p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-rose-700">Faltas (No-Show)</p>
                <p className="text-xl font-black text-rose-700">
                  {filteredAppointments.filter(a => a.status === 'Faltou').length}
                </p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 bg-neutral-100">
                  <th className="p-2 font-black uppercase">Data/Hora</th>
                  <th className="p-2 font-black uppercase">Paciente</th>
                  <th className="p-2 font-black uppercase">CPF / SUS</th>
                  <th className="p-2 font-black uppercase">Unidade</th>
                  <th className="p-2 font-black uppercase">Especialidade / Médico</th>
                  <th className="p-2 font-black uppercase text-right">Situação</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(a => (
                  <tr key={a.id} className="border-b border-neutral-200">
                    <td className="p-2 font-mono whitespace-nowrap">
                      {a.appointment_date ? a.appointment_date.split('-').reverse().join('/') : '-'}
                      {a.appointment_time ? ` ${a.appointment_time}` : ''}
                    </td>
                    <td className="p-2 font-bold">{a.patient_name}</td>
                    <td className="p-2 font-mono text-[11px]">{a.patient_cpf || '-'}</td>
                    <td className="p-2">{a.unit_name || 'UBS Central'}</td>
                    <td className="p-2">{a.specialty} {a.doctor_name ? `• ${a.doctor_name}` : ''}</td>
                    <td className="p-2 text-right font-bold">{a.status}</td>
                  </tr>
                ))}
                {filteredAppointments.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-neutral-400 italic">Nenhum agendamento encontrado no período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTEÚDO 2: FARMÁCIA SUS & ESTOQUE CRÍTICO */}
        {reportType === 'farmacia' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-neutral-500">Itens Cadastrados</p>
                <p className="text-xl font-black text-neutral-900">{filteredMeds.length}</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-emerald-700">Estoque Regular</p>
                <p className="text-xl font-black text-emerald-700">
                  {filteredMeds.filter(m => m.quantity > 50).length}
                </p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-rose-700">Estoque Crítico (Abaixo de 50)</p>
                <p className="text-xl font-black text-rose-700">
                  {filteredMeds.filter(m => m.quantity <= 50).length}
                </p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 bg-neutral-100">
                  <th className="p-2 font-black uppercase">Medicamento</th>
                  <th className="p-2 font-black uppercase">Princípio Ativo</th>
                  <th className="p-2 font-black uppercase">Forma / Dosagem</th>
                  <th className="p-2 font-black uppercase">Lote / Validade</th>
                  <th className="p-2 font-black uppercase text-right">Saldo Atual</th>
                  <th className="p-2 font-black uppercase text-right">Alerta</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeds.map(m => (
                  <tr key={m.id} className="border-b border-neutral-200">
                    <td className="p-2 font-bold">{m.name}</td>
                    <td className="p-2 text-neutral-600">{m.active_ingredient}</td>
                    <td className="p-2">{m.form} • {m.dosage}</td>
                    <td className="p-2 font-mono text-[11px]">{m.batch_number || 'S/L'} • {m.expiration_date || 'N/I'}</td>
                    <td className="p-2 text-right font-mono font-bold">{m.quantity} un</td>
                    <td className="p-2 text-right">
                      {m.quantity <= 50 ? (
                        <span className="font-bold text-rose-600 uppercase text-[10px]">Crítico</span>
                      ) : (
                        <span className="font-bold text-emerald-600 uppercase text-[10px]">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTEÚDO 3: REGULAÇÃO DE EXAMES */}
        {reportType === 'exames' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-neutral-500">Total Solicitado</p>
                <p className="text-xl font-black text-neutral-900">{filteredExams.length}</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-amber-700">Fila de Espera</p>
                <p className="text-xl font-black text-amber-700">
                  {filteredExams.filter(e => e.status === 'Solicitado' || e.status === 'Aprovado').length}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-emerald-700">Exames Realizados</p>
                <p className="text-xl font-black text-emerald-700">
                  {filteredExams.filter(e => e.status === 'Realizado').length}
                </p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 bg-neutral-100">
                  <th className="p-2 font-black uppercase">Data</th>
                  <th className="p-2 font-black uppercase">Paciente</th>
                  <th className="p-2 font-black uppercase">CPF</th>
                  <th className="p-2 font-black uppercase">Exame Solicitado</th>
                  <th className="p-2 font-black uppercase">Médico Solicitante</th>
                  <th className="p-2 font-black uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map(e => (
                  <tr key={e.id} className="border-b border-neutral-200">
                    <td className="p-2 font-mono whitespace-nowrap">{e.requested_date ? e.requested_date.split('-').reverse().join('/') : '-'}</td>
                    <td className="p-2 font-bold">{e.patient_name}</td>
                    <td className="p-2 font-mono">{e.patient_cpf || '-'}</td>
                    <td className="p-2 font-semibold text-emerald-800">{e.exam_name}</td>
                    <td className="p-2">{e.doctor_name || 'Dr(a). Clínico Geral'}</td>
                    <td className="p-2 text-right font-bold">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTEÚDO 4: CRÔNICOS & GESTANTES */}
        {reportType === 'cronicos' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-neutral-500">Total Pacientes</p>
                <p className="text-xl font-black text-neutral-900">{filteredPatients.length}</p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-rose-700">Gestantes Ativas</p>
                <p className="text-xl font-black text-rose-700">
                  {filteredPatients.filter(p => p.is_pregnant).length}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-indigo-700">PCD Cadastrados</p>
                <p className="text-xl font-black text-indigo-700">
                  {filteredPatients.filter(p => p.is_pcd).length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-amber-700">Comorbidades / Crônicos</p>
                <p className="text-xl font-black text-amber-700">
                  {filteredPatients.filter(p => p.conditions && p.conditions.trim().length > 0).length}
                </p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 bg-neutral-100">
                  <th className="p-2 font-black uppercase">Nome do Munícipe</th>
                  <th className="p-2 font-black uppercase">CPF / SUS</th>
                  <th className="p-2 font-black uppercase">Bairro / UBS</th>
                  <th className="p-2 font-black uppercase">Condição / Comorbidade</th>
                  <th className="p-2 font-black uppercase text-right">Prioridade</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => (
                  <tr key={p.id} className="border-b border-neutral-200">
                    <td className="p-2 font-bold">{p.name}</td>
                    <td className="p-2 font-mono text-[11px]">{p.cpf || '-'} • SUS: {p.sus_number || '-'}</td>
                    <td className="p-2">{p.neighborhood || '-'} • {p.ubs_reference || 'UBS Central'}</td>
                    <td className="p-2 text-neutral-700">{p.conditions || (p.is_pregnant ? 'Gestante' : 'Hipertensão/Diabetes')}</td>
                    <td className="p-2 text-right font-bold text-emerald-700">
                      {p.is_pregnant ? 'Gestante' : p.is_pcd ? 'PCD' : 'Acompanhamento'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé Institucional com Assinatura */}
        <div className="mt-16 pt-8 border-t-2 border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-6 print:mt-12">
          <div className="text-xs text-neutral-500 font-medium">
            <p>Documento oficial emitido pela Plataforma Gestão 360.</p>
            <p>Conforme diretrizes do SUS e Lei de Responsabilidade Fiscal.</p>
          </div>
          <div className="text-center w-64 border-t border-neutral-800 pt-1">
            <p className="text-xs font-bold uppercase text-neutral-800">Secretário(a) Municipal de Saúde</p>
            <p className="text-[10px] text-neutral-500">{institutionName}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

