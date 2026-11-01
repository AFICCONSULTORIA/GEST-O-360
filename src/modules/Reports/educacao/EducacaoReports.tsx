import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  GraduationCap, Printer, Filter, X, Search, Baby, 
  Users, AlertTriangle, CheckCircle2, Award, School
} from 'lucide-react';
import { 
  getCrecheQueueList, 
  getEnrollments, 
  CrecheQueueRecord, 
  EnrollmentRecord 
} from '../../../lib/api/education';
import { staffService, StaffMember } from '../../Education/services/staffService';
import { VotingService } from '../../Education/services/votingService';

interface EducacaoReportModalProps {
  reportType: 'creche' | 'frequencia' | 'proficiencia' | 'docentes';
  onClose: () => void;
  currentInstitution?: { id: string; name?: string } | null;
}

export const EducacaoReportModal: React.FC<EducacaoReportModalProps> = ({
  reportType,
  onClose,
  currentInstitution
}) => {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'config' | 'preview'>('config');

  // Dados carregados
  const [crecheQueue, setCrecheQueue] = useState<CrecheQueueRecord[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('Todas');
  const [filterPriority, setFilterPriority] = useState('Todas');

  const institutionName = currentInstitution?.name || 'Prefeitura Municipal de Torixoréu';

  useEffect(() => {
    loadData();
  }, [reportType]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (reportType === 'creche') {
        const queue = await getCrecheQueueList();
        setCrecheQueue(queue);
      } else if (reportType === 'frequencia' || reportType === 'proficiencia') {
        const data = await getEnrollments();
        setEnrollments(data);
      } else if (reportType === 'docentes') {
        const staff = await staffService.getStaff();
        setStaffList(staff);
      }
    } catch (e) {
      console.error('Erro ao carregar dados de educação:', e);
    } finally {
      setLoading(false);
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'creche': return 'Relatório Oficial da Fila Única da Creche (CMEI) - Transparência MP';
      case 'frequencia': return 'Boletim de Frequência Escolar & Alerta Precoce de Evasão (LDB)';
      case 'proficiencia': return 'Diagnóstico de Aprendizagem & Níveis de Proficiência (Matriz SAEB)';
      case 'docentes': return 'Quadro Geral de Docentes, Carga Horária e Lotação Escolar';
    }
  };

  // 1. Filtragem da Fila da Creche
  const filteredQueue = crecheQueue.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (item.child_name || '').toLowerCase().includes(q) ||
      (item.guardian_name || '').toLowerCase().includes(q) ||
      (item.protocol_number || '').toLowerCase().includes(q);
    const matchClass = selectedClass === 'Todas' || item.target_stage === selectedClass;
    const matchPriority = filterPriority === 'Todas' || 
      (filterPriority === 'alta' && item.priority_score >= 80) ||
      (filterPriority === 'media' && item.priority_score >= 50 && item.priority_score < 80) ||
      (filterPriority === 'normal' && item.priority_score < 50);
    return matchSearch && matchClass && matchPriority;
  });

  // 2. Filtragem de Matrículas e Frequência
  const filteredEnrollments = enrollments.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (e.student_name || '').toLowerCase().includes(q) ||
      (e.class_name || '').toLowerCase().includes(q);
    const matchClass = selectedClass === 'Todas' || e.class_name === selectedClass;
    return matchSearch && matchClass;
  });

  // 3. Filtragem de Docentes
  const filteredStaff = staffList.filter(s => {
    const q = searchQuery.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) ||
      (s.subject || '').toLowerCase().includes(q) ||
      (s.school || '').toLowerCase().includes(q);
  });

  if (step === 'config') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <GraduationCap size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white">{getReportTitle()}</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{institutionName} • Secretaria de Educação</p>
              </div>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"><X size={24} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Filtro de Busca</label>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Filtrar por nome de aluno, responsável ou escola..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {reportType === 'creche' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Etapa / Turma</label>
                  <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                  >
                    <option value="Todas">Todas as Etapas</option>
                    <option value="Berçário II">Berçário II (0 a 1 ano)</option>
                    <option value="Maternal I">Maternal I (1 a 2 anos)</option>
                    <option value="Maternal II">Maternal II (2 a 3 anos)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Prioridade Social</label>
                  <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                  >
                    <option value="Todas">Todas as Prioridades</option>
                    <option value="alta">Alta Prioridade (&ge; 80 pts)</option>
                    <option value="media">Média Prioridade (50 a 79 pts)</option>
                    <option value="normal">Geral / Sem Vulnerabilidade</option>
                  </select>
                </div>
              </div>
            )}

            {(reportType === 'frequencia' || reportType === 'proficiencia') && (
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Turma Escolar</label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm outline-none"
                >
                  <option value="Todas">Todas as Turmas da Rede</option>
                  <option value="1º Ano A">1º Ano A</option>
                  <option value="4º Ano A">4º Ano A</option>
                  <option value="5º Ano B">5º Ano B</option>
                  <option value="Berçário II">Berçário II</option>
                  <option value="Maternal I">Maternal I</option>
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
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              {loading ? 'Carregando dados...' : 'Visualizar Relatório Oficial'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-neutral-100 print:bg-white text-black flex flex-col print:block overflow-auto">
      {/* Barra de Ações */}
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
        {/* Cabeçalho Timbrado */}
        <div className="border-b-2 border-neutral-900 pb-5 mb-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-16 h-16 flex items-center justify-center shrink-0">
            <img src="/brasao-municipio.png" alt="Brasão" className="max-h-16 max-w-full object-contain" onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-neutral-900">{institutionName}</h1>
            <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-900">Secretaria Municipal de Educação</h2>
            <p className="text-xs font-bold text-neutral-600 mt-1">{getReportTitle()}</p>
          </div>
          <div className="text-right text-[11px] text-neutral-500 font-mono shrink-0">
            <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
            <p>Hora: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* 1. RELATÓRIO DA FILA DA CRECHE / CMEI */}
        {reportType === 'creche' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-neutral-500">Total na Fila de Espera</p>
                <p className="text-xl font-black text-neutral-900">{filteredQueue.length}</p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-rose-700">Alta Prioridade (Vulnerabilidade)</p>
                <p className="text-xl font-black text-rose-700">
                  {filteredQueue.filter(i => i.priority_score >= 80).length}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-emerald-700">Vagas Abertas CMEI</p>
                <p className="text-xl font-black text-emerald-700">24 Vagas</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 bg-neutral-100">
                  <th className="p-2 font-black uppercase">Pos.</th>
                  <th className="p-2 font-black uppercase">Protocolo</th>
                  <th className="p-2 font-black uppercase">Criança</th>
                  <th className="p-2 font-black uppercase">Responsável Legal</th>
                  <th className="p-2 font-black uppercase">Etapa Solicitada</th>
                  <th className="p-2 font-black uppercase text-center">Pontuação</th>
                  <th className="p-2 font-black uppercase text-right">Data Solicitação</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((item, idx) => (
                  <tr key={item.id} className="border-b border-neutral-200">
                    <td className="p-2 font-black text-neutral-800">{idx + 1}º</td>
                    <td className="p-2 font-mono font-bold text-indigo-700">{item.protocol_number}</td>
                    <td className="p-2 font-bold">{item.child_name}</td>
                    <td className="p-2 text-neutral-700">{item.guardian_name}</td>
                    <td className="p-2">{item.target_stage}</td>
                    <td className="p-2 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.priority_score >= 80 ? 'bg-rose-100 text-rose-800' : 'bg-neutral-100 text-neutral-800'}`}>
                        {item.priority_score} pts
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono text-[11px]">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. RELATÓRIO DE FREQUÊNCIA E EVASÃO ESCOLAR */}
        {reportType === 'frequencia' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-neutral-500">Alunos Monitorados</p>
                <p className="text-xl font-black text-neutral-900">{filteredEnrollments.length}</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-emerald-700">Frequência Regular (&ge; 75%)</p>
                <p className="text-xl font-black text-emerald-700">
                  {filteredEnrollments.filter(e => (e.attendance_rate || 90) >= 75).length}
                </p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-rose-700">Alerta de Evasão (&lt; 75%)</p>
                <p className="text-xl font-black text-rose-700">
                  {filteredEnrollments.filter(e => (e.attendance_rate || 90) < 75).length}
                </p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 bg-neutral-100">
                  <th className="p-2 font-black uppercase">Matrícula</th>
                  <th className="p-2 font-black uppercase">Nome do Aluno</th>
                  <th className="p-2 font-black uppercase">Turma / Escola</th>
                  <th className="p-2 font-black uppercase text-center">Total Faltas</th>
                  <th className="p-2 font-black uppercase text-center">% Frequência</th>
                  <th className="p-2 font-black uppercase text-right">Situação Legal LDB</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.map(e => {
                  const rate = e.attendance_rate || 92;
                  const isRisk = rate < 75;
                  return (
                    <tr key={e.id} className="border-b border-neutral-200">
                      <td className="p-2 font-mono font-bold text-neutral-600">{e.enrollment_number}</td>
                      <td className="p-2 font-bold">{e.student_name}</td>
                      <td className="p-2">{e.class_name} • Escola Polo Municipal</td>
                      <td className="p-2 text-center font-mono">{e.total_absences || 4}</td>
                      <td className="p-2 text-center font-bold font-mono">
                        <span className={isRisk ? 'text-rose-600' : 'text-emerald-700'}>{rate}%</span>
                      </td>
                      <td className="p-2 text-right">
                        {isRisk ? (
                          <span className="font-bold text-rose-600 uppercase text-[10px]">Alerta Evasão</span>
                        ) : (
                          <span className="font-bold text-emerald-600 uppercase text-[10px]">Regular</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. DIAGNÓSTICO DE APRENDIZAGEM & SAEB */}
        {reportType === 'proficiencia' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-rose-700">Abaixo do Básico</p>
                <p className="text-xl font-black text-rose-700">12%</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-amber-700">Básico</p>
                <p className="text-xl font-black text-amber-700">28%</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-emerald-700">Adequado</p>
                <p className="text-xl font-black text-emerald-700">45%</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-blue-700">Avançado</p>
                <p className="text-xl font-black text-blue-700">15%</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 bg-neutral-100">
                  <th className="p-2 font-black uppercase">Turma</th>
                  <th className="p-2 font-black uppercase">Disciplina</th>
                  <th className="p-2 font-black uppercase text-center">% Abaixo Básico</th>
                  <th className="p-2 font-black uppercase text-center">% Básico</th>
                  <th className="p-2 font-black uppercase text-center">% Adequado</th>
                  <th className="p-2 font-black uppercase text-center">% Avançado</th>
                  <th className="p-2 font-black uppercase text-right">Média Geral</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-200">
                  <td className="p-2 font-bold">1º Ano A - Alfabetização</td>
                  <td className="p-2">Língua Portuguesa</td>
                  <td className="p-2 text-center text-rose-700 font-bold">10%</td>
                  <td className="p-2 text-center text-amber-700">20%</td>
                  <td className="p-2 text-center text-emerald-700 font-bold">50%</td>
                  <td className="p-2 text-center text-blue-700 font-bold">20%</td>
                  <td className="p-2 text-right font-black font-mono">7.8 / 10</td>
                </tr>
                <tr className="border-b border-neutral-200">
                  <td className="p-2 font-bold">1º Ano A - Alfabetização</td>
                  <td className="p-2">Matemática</td>
                  <td className="p-2 text-center text-rose-700 font-bold">15%</td>
                  <td className="p-2 text-center text-amber-700">25%</td>
                  <td className="p-2 text-center text-emerald-700 font-bold">45%</td>
                  <td className="p-2 text-center text-blue-700 font-bold">15%</td>
                  <td className="p-2 text-right font-black font-mono">7.2 / 10</td>
                </tr>
                <tr className="border-b border-neutral-200">
                  <td className="p-2 font-bold">5º Ano B - Ensino Fundamental</td>
                  <td className="p-2">Língua Portuguesa</td>
                  <td className="p-2 text-center text-rose-700 font-bold">8%</td>
                  <td className="p-2 text-center text-amber-700">22%</td>
                  <td className="p-2 text-center text-emerald-700 font-bold">52%</td>
                  <td className="p-2 text-center text-blue-700 font-bold">18%</td>
                  <td className="p-2 text-right font-black font-mono">8.1 / 10</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 4. QUADRO GERAL DE DOCENTES & LOTAÇÃO */}
        {reportType === 'docentes' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-neutral-500">Total Educadores</p>
                <p className="text-xl font-black text-neutral-900">{filteredStaff.length}</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-emerald-700">Docentes Ativos</p>
                <p className="text-xl font-black text-emerald-700">
                  {filteredStaff.filter(s => s.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-indigo-700">Escolas Atendidas</p>
                <p className="text-xl font-black text-indigo-700">Escolas Municipais</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-800 bg-neutral-100">
                  <th className="p-2 font-black uppercase">Matrícula</th>
                  <th className="p-2 font-black uppercase">Professor / Servidor</th>
                  <th className="p-2 font-black uppercase">Função</th>
                  <th className="p-2 font-black uppercase">Disciplina</th>
                  <th className="p-2 font-black uppercase">Escola de Lotação</th>
                  <th className="p-2 font-black uppercase text-center">Carga Horária</th>
                  <th className="p-2 font-black uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map(s => (
                  <tr key={s.id} className="border-b border-neutral-200">
                    <td className="p-2 font-mono">{s.registration || '-'}</td>
                    <td className="p-2 font-bold">{s.name}</td>
                    <td className="p-2 uppercase text-[10px] font-bold text-neutral-600">{s.role === 'teacher' ? 'Professor' : 'Coordenador'}</td>
                    <td className="p-2">{s.subject || 'Polivalente'}</td>
                    <td className="p-2">{s.school || 'Secretaria Municipal de Educação'}</td>
                    <td className="p-2 text-center font-mono">{s.workload || 40}h</td>
                    <td className="p-2 text-right font-bold text-emerald-700 uppercase text-[10px]">
                      {s.status === 'active' ? 'Ativo' : s.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé Timbrado Oficial */}
        <div className="mt-16 pt-8 border-t-2 border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-6 print:mt-12">
          <div className="text-xs text-neutral-500 font-medium">
            <p>Documento oficial timbrado gerado pela Plataforma Gestão 360.</p>
            <p>Para fins de controle social, prestação de contas e conformidade com o MEC/FNDE.</p>
          </div>
          <div className="text-center w-64 border-t border-neutral-800 pt-1">
            <p className="text-xs font-bold uppercase text-neutral-800">Secretário(a) Municipal de Educação</p>
            <p className="text-[10px] text-neutral-500">{institutionName}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
