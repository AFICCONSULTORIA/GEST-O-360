import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Baby, Search, Filter, Printer, 
  FileText, ArrowRight, CheckCircle2, AlertTriangle, 
  Plus, RefreshCw, ChevronRight, School, Sparkles, FileSpreadsheet
} from 'lucide-react';
import { 
  EnrollmentRecord, 
  CrecheQueueRecord,
  StudentReportCardData,
  ClassAttendanceSheetData,
  getEnrollments, 
  getCrecheQueueList, 
  promoteFromCrecheQueue, 
  updateEnrollmentStatus,
  getStudentReportCardData,
  getClassAttendanceSheetData
} from '../../../lib/api/education';
import { BoletimEscolarPDF } from './BoletimEscolarPDF';
import { DiarioOficialPDF } from './DiarioOficialPDF';

export const EducationEnrollmentManager: React.FC = () => {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [crecheQueue, setCrecheQueue] = useState<CrecheQueueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('Todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [activeTab, setActiveTab] = useState<'matriculas' | 'fila_creche'>('matriculas');

  // Modals for PDF Printing
  const [selectedReportCard, setSelectedReportCard] = useState<StudentReportCardData | null>(null);
  const [selectedAttendanceSheet, setSelectedAttendanceSheet] = useState<ClassAttendanceSheetData | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Modal Promote from Creche
  const [promotingChild, setPromotingChild] = useState<CrecheQueueRecord | null>(null);
  const [targetClassForPromotion, setTargetClassForPromotion] = useState('Berçário II');
  const [isPromoting, setIsPromoting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [enrollmentsData, queueData] = await Promise.all([
        getEnrollments({ class_name: selectedClass, status: selectedStatus }),
        getCrecheQueueList()
      ]);
      setEnrollments(enrollmentsData);
      setCrecheQueue(queueData);
    } catch (err) {
      console.error('Erro ao carregar dados de matrículas e creche:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedStatus]);

  const handleOpenBoletim = async (studentId: string) => {
    setIsLoadingReport(true);
    try {
      const data = await getStudentReportCardData(studentId, 2026);
      setSelectedReportCard(data);
    } catch (err) {
      console.error('Erro ao gerar dados do boletim:', err);
      showToast('Erro ao carregar boletim escolar.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleOpenDiarioTurma = async (className: string) => {
    setIsLoadingReport(true);
    try {
      const data = await getClassAttendanceSheetData(className, 10, 2026);
      setSelectedAttendanceSheet(data);
    } catch (err) {
      console.error('Erro ao gerar diário oficial:', err);
      showToast('Erro ao carregar diário da turma.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handlePromoteChild = async () => {
    if (!promotingChild) return;
    setIsPromoting(true);
    try {
      await promoteFromCrecheQueue(promotingChild.id, targetClassForPromotion);
      showToast(`Matrícula efetuada com sucesso para ${promotingChild.child_name} na turma ${targetClassForPromotion}!`);
      setPromotingChild(null);
      await loadData();
    } catch (err) {
      console.error('Erro ao matricular criança:', err);
      showToast('Erro ao realizar matrícula.');
    } finally {
      setIsPromoting(false);
    }
  };

  const filteredEnrollments = enrollments.filter(e => {
    const matchesSearch = 
      e.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.class_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const availableClasses = ['Todas', '1º Ano A', '4º Ano A', '5º Ano B', 'Berçário II', 'Maternal I', 'Maternal II'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* Top Banner / Hero */}
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 md:p-8 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner shrink-0">
            <School size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                Secretaria Escolar & Gestão de Matrículas
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={12} /> Ano Letivo 2026
              </span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 max-w-2xl">
              Emissão de Boletins Oficiais, Diário Eletrônico de Frequência e integração contínua com a fila de vagas dos CMEIs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => handleOpenDiarioTurma(selectedClass !== 'Todas' ? selectedClass : '4º Ano A')}
            className="flex-1 md:flex-none px-4 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>Diário Oficial ({selectedClass !== 'Todas' ? selectedClass : '4º Ano A'})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-neutral-900/80 p-5 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Matrículas Ativas</span>
            <p className="text-2xl font-black text-neutral-900 dark:text-white">{enrollments.length}</p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-neutral-900/80 p-5 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Baby size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Fila CMEI Espera</span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {crecheQueue.filter(q => q.status === 'aguardando').length}
            </p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-neutral-900/80 p-5 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Presença Média</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">96.4%</p>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-neutral-900/80 p-5 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <School size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Turmas Homologadas</span>
            <p className="text-2xl font-black text-neutral-900 dark:text-white">6 Turmas</p>
          </div>
        </div>
      </div>

      {/* Navegação entre Matrículas e Fila de Creche */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-4">
        <button
          onClick={() => setActiveTab('matriculas')}
          className={`pb-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'matriculas'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Users size={16} />
          <span>Matrículas da Rede ({filteredEnrollments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fila_creche')}
          className={`pb-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'fila_creche'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Baby size={16} />
          <span>Integrar Fila CMEI ({crecheQueue.filter(q => q.status === 'aguardando').length})</span>
        </button>
      </div>

      {/* Conteúdo: Aba Matrículas */}
      {activeTab === 'matriculas' && (
        <div className="space-y-4">
          
          {/* Barra de Filtros */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text"
                placeholder="Buscar por nome do estudante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 text-neutral-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none focus:border-indigo-500"
              >
                {availableClasses.map(c => (
                  <option key={c} value={c}>{c === 'Todas' ? 'Todas as Turmas' : `Turma: ${c}`}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none focus:border-indigo-500"
              >
                <option value="Todos">Status: Todos</option>
                <option value="matriculado">Matriculado</option>
                <option value="transferido">Transferido</option>
                <option value="evadido">Evadido</option>
              </select>
            </div>
          </div>

          {/* Tabela de Matrículas */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-black uppercase tracking-wider text-neutral-500">
                    <th className="p-4">Estudante</th>
                    <th className="p-4">Turma & Turno</th>
                    <th className="p-4">Unidade Escolar</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Ações Oficiais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-400">
                        Nenhuma matrícula encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredEnrollments.map(student => (
                      <tr key={student.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="p-4">
                          <strong className="text-neutral-900 dark:text-white font-bold block">{student.student_name}</strong>
                          <span className="text-xs text-neutral-400 font-mono">ID: {student.student_id.substring(0, 8)}</span>
                        </td>
                        <td className="p-4 font-semibold text-neutral-700 dark:text-neutral-300">
                          {student.class_name} • <span className="text-xs text-neutral-400">{student.shift || 'Matutino'}</span>
                        </td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400 text-xs truncate max-w-[220px]">
                          {student.school_name || 'Escola Municipal Monteiro Lobato'}
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            {student.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenBoletim(student.student_id)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <FileText size={14} />
                              <span>Boletim Oficial</span>
                            </button>
                            <button
                              onClick={() => handleOpenDiarioTurma(student.class_name)}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Printer size={14} />
                              <span>Diário</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo: Aba Fila CMEI */}
      {activeTab === 'fila_creche' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle size={18} className="shrink-0 text-amber-600" />
            <span>
              <strong>Integração CMEI x Secretaria:</strong> Crianças inscritas na fila de espera com documentação validada podem ser promovidas imediatamente para uma turma oficial da rede.
            </span>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-black uppercase tracking-wider text-neutral-500">
                    <th className="p-4 text-center">Posição</th>
                    <th className="p-4">Criança / Responsável</th>
                    <th className="p-4">Nível Solicitado</th>
                    <th className="p-4 text-center">Pontuação Social</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Ação de Matrícula</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {crecheQueue.map(item => (
                    <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="p-4 text-center font-black text-indigo-600 dark:text-indigo-400">
                        #{item.queue_position}
                      </td>
                      <td className="p-4">
                        <strong className="text-neutral-900 dark:text-white font-bold block">{item.child_name}</strong>
                        <span className="text-xs text-neutral-400">Resp: {item.guardian_name} • {item.guardian_phone}</span>
                      </td>
                      <td className="p-4 font-semibold text-neutral-700 dark:text-neutral-300 text-xs">
                        {item.requested_level}
                      </td>
                      <td className="p-4 text-center font-bold text-neutral-800 dark:text-neutral-200">
                        {item.score_social.toFixed(1)} pts
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.status === 'matriculado' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {item.status === 'matriculado' ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                            <CheckCircle2 size={14} /> Matriculado
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setPromotingChild(item);
                              setTargetClassForPromotion(item.requested_level);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <span>Matricular</span>
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Matrícula da Fila de Creche */}
      {promotingChild && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 max-w-md w-full rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Baby size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">Confirmar Matrícula Oficial</h3>
                <p className="text-xs text-neutral-500">Alocação de vaga definitiva na rede</p>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <p><strong>Criança:</strong> {promotingChild.child_name}</p>
              <p><strong>Responsável:</strong> {promotingChild.guardian_name}</p>
              <p><strong>Posição na Fila:</strong> #{promotingChild.queue_position} ({promotingChild.score_social} pontos)</p>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-neutral-500 block mb-1">
                Turma de Destino
              </label>
              <select
                value={targetClassForPromotion}
                onChange={(e) => setTargetClassForPromotion(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Berçário I">Berçário I (CMEI)</option>
                <option value="Berçário II">Berçário II (CMEI)</option>
                <option value="Maternal I">Maternal I (CMEI)</option>
                <option value="Maternal II">Maternal II (CMEI)</option>
                <option value="1º Ano A">1º Ano A (Ensino Fundamental)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPromotingChild(null)}
                className="px-4 py-2.5 text-xs font-bold text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePromoteChild}
                disabled={isPromoting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                {isPromoting ? 'Matriculando...' : 'Confirmar Matrícula'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Boletim Escolar Oficial em PDF */}
      {selectedReportCard && (
        <BoletimEscolarPDF
          reportCard={selectedReportCard}
          onClose={() => setSelectedReportCard(null)}
        />
      )}

      {/* Modal: Diário Oficial de Classe em PDF */}
      {selectedAttendanceSheet && (
        <DiarioOficialPDF
          sheetData={selectedAttendanceSheet}
          onClose={() => setSelectedAttendanceSheet(null)}
        />
      )}

    </div>
  );
};
