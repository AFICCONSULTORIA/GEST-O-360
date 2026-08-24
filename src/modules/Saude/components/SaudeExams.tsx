import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, Plus, Search, AlertTriangle, CheckCircle2, Clock, 
  Calendar, User, Stethoscope, AlertCircle, XCircle, ShieldAlert, 
  Printer, ArrowRight, Activity, Filter, FileText, Check, Ban,
  Building2, Sparkles, DollarSign, RefreshCw, ChevronRight, Eye
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { 
  Patient, HealthUnit, HealthProfessional, ExamType, ExamRequest, ExamStatus, ExamCategory,
  COMMON_EXAM_CATEGORIES, DEFAULT_EXAM_TYPES, DEFAULT_HEALTH_UNITS,
  formatCPF, formatSUS, formatPhone, getAge, checkExamDuplicity, DuplicityCheckResult,
  generateUUID, isValidUUID
} from '../types';
import { printExamGuide } from '../utils/printReceipt';

interface SaudeExamsProps {
  requests: ExamRequest[];
  examTypes: ExamType[];
  patients: Patient[];
  units: HealthUnit[];
  professionals: HealthProfessional[];
  isLoading: boolean;
  onRefresh: () => void;
  currentInstitution?: { id: string; name?: string } | null;
  onNewRequestPrefilled?: Patient | null;
}

export const SaudeExams: React.FC<SaudeExamsProps> = ({
  requests,
  examTypes,
  patients,
  units,
  professionals,
  isLoading,
  onRefresh,
  currentInstitution,
  onNewRequestPrefilled
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<ExamRequest | null>(null);
  const [selectedRequestForPrint, setSelectedRequestForPrint] = useState<ExamRequest | null>(null);
  const [selectedRequestForComplete, setSelectedRequestForComplete] = useState<ExamRequest | null>(null);
  const [selectedRequestForSchedule, setSelectedRequestForSchedule] = useState<ExamRequest | null>(null);

  // KPIs
  const totalRequests = requests.length;
  const performedCount = requests.filter(r => r.status === 'Realizado').length;
  const pendingCount = requests.filter(r => r.status === 'Solicitado' || r.status === 'Aprovado').length;
  const scheduledCount = requests.filter(r => r.status === 'Agendado').length;
  const blockedDuplicatesCount = requests.filter(r => r.status === 'Bloqueado por Duplicidade' || (r.is_duplicate_warning && r.status === 'Cancelado')).length;
  
  // Estimativa de economia evitada em duplicidades (soma dos custos estimados ou R$ 45 média)
  const estimatedSavings = requests
    .filter(r => r.status === 'Bloqueado por Duplicidade' || (r.is_duplicate_warning && r.status === 'Cancelado'))
    .reduce((acc, curr) => {
      const type = examTypes.find(t => t.name.toLowerCase() === curr.exam_name.toLowerCase());
      return acc + (type?.estimated_cost || 45.00);
    }, 0);

  const filteredRequests = requests.filter(req => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      req.patient_name.toLowerCase().includes(query) ||
      req.patient_cpf.includes(query) ||
      req.patient_sus.includes(query) ||
      req.exam_name.toLowerCase().includes(query) ||
      req.doctor_name.toLowerCase().includes(query);

    const matchesStatus = 
      selectedStatus === 'todos' ||
      (selectedStatus === 'pendentes' && (req.status === 'Solicitado' || req.status === 'Aprovado')) ||
      (selectedStatus === 'agendados' && req.status === 'Agendado') ||
      (selectedStatus === 'realizados' && req.status === 'Realizado') ||
      (selectedStatus === 'duplicados' && (req.status === 'Bloqueado por Duplicidade' || req.is_duplicate_warning));

    const matchesCategory = 
      selectedCategory === 'todas' || req.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner de Métricas e KPIs de Controle de Exames */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Total Prescrito pelos Médicos */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Exames Prescritos / Solicitados</p>
              <h3 className="text-3xl font-black text-neutral-900 dark:text-white mt-1.5">{totalRequests}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                {pendingCount} aguardando regulação
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Stethoscope size={24} />
            </div>
          </div>
        </div>

        {/* KPI 2: Total Realizados / Concluídos */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Exames Efetivamente Realizados</p>
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{performedCount}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                {totalRequests > 0 ? `${Math.round((performedCount / totalRequests) * 100)}% de taxa de conclusão` : 'Nenhum exame'}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        {/* KPI 3: Duplicidades Bloqueadas (<30 dias) */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-rose-100 dark:border-rose-950/30 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-rose-50/30 dark:from-neutral-900 dark:to-rose-950/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Duplicidades Bloqueadas (&lt;30d)</p>
              <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1.5">{blockedDuplicatesCount}</h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1 font-medium">
                Repetições desnecessárias evitadas
              </p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl shadow-sm">
              <ShieldAlert size={24} />
            </div>
          </div>
        </div>

        {/* KPI 4: Economia de Recursos Públicos */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-amber-100 dark:border-amber-950/30 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-amber-50/30 dark:from-neutral-900 dark:to-amber-950/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Economia Gerada aos Cofres</p>
              <h3 className="text-3xl font-black text-neutral-900 dark:text-white mt-1.5">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedSavings)}
              </h3>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 font-medium">
                Verba preservada para novas vagas
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl shadow-sm">
              <DollarSign size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Pesquisa e Ação de Nova Solicitação */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-2xl">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Controle e Regulação de Exames</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Rastreamento de prescrições, bloqueio de repetições em menos de 30 dias e laudos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar por paciente, CPF, exame ou médico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
            />
          </div>

          {/* Filtro por Categoria */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none dark:text-white"
          >
            <option value="todas">Todas as Categorias</option>
            {COMMON_EXAM_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Botão de Nova Solicitação */}
          <button 
            onClick={() => setIsNewRequestModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
          >
            <Plus size={16} /> Nova Solicitação de Exame
          </button>
        </div>
      </div>

      {/* Tabs de Status */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedStatus('todos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedStatus === 'todos'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-100 dark:border-neutral-800'
          }`}
        >
          Todos ({requests.length})
        </button>

        <button
          onClick={() => setSelectedStatus('pendentes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            selectedStatus === 'pendentes'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-blue-600 hover:bg-blue-50 dark:hover:bg-neutral-800 border border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <Clock size={14} /> Solicitados / Fila ({pendingCount})
        </button>

        <button
          onClick={() => setSelectedStatus('agendados')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            selectedStatus === 'agendados'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-purple-600 hover:bg-purple-50 dark:hover:bg-neutral-800 border border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <Calendar size={14} /> Agendados ({scheduledCount})
        </button>

        <button
          onClick={() => setSelectedStatus('realizados')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            selectedStatus === 'realizados'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-neutral-800 border border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <CheckCircle2 size={14} /> Realizados / Concluídos ({performedCount})
        </button>

        <button
          onClick={() => setSelectedStatus('duplicados')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            selectedStatus === 'duplicados'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white dark:bg-neutral-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-neutral-800 border border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <ShieldAlert size={14} /> Bloqueados por Duplicidade ({blockedDuplicatesCount})
        </button>
      </div>

      {/* Lista / Tabela de Solicitações de Exames */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity size={32} />
          </div>
          <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Nenhum exame encontrado</h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
            Não há solicitações correspondentes aos filtros selecionados. Clique em "Nova Solicitação de Exame" para cadastrar.
          </p>
          <button 
            onClick={() => setIsNewRequestModalOpen(true)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20"
          >
            Cadastrar Solicitação
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  <th className="p-4">Paciente & Documentos</th>
                  <th className="p-4">Exame Solicitado</th>
                  <th className="p-4">Médico & Unidade</th>
                  <th className="p-4">Datas (Prescrito / Realizado)</th>
                  <th className="p-4">Status & Anti-Duplicidade</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredRequests.map(req => {
                  const isBlocked = req.status === 'Bloqueado por Duplicidade';
                  const isRealized = req.status === 'Realizado';
                  const isScheduled = req.status === 'Agendado';

                  return (
                    <tr key={req.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      {/* Paciente */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-black">
                            {req.patient_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                              {req.patient_name}
                              {req.is_urgent && (
                                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                                  Urgente
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                              CPF: {req.patient_cpf || '---'} · SUS: {req.patient_sus || '---'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Exame */}
                      <td className="p-4">
                        <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          {req.exam_name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                            {req.category}
                          </span>
                          {req.clinical_indication && (
                            <span className="text-[11px] text-neutral-500 truncate max-w-[180px]" title={req.clinical_indication}>
                              Ind: {req.clinical_indication}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Médico Solicitante */}
                      <td className="p-4">
                        <div className="font-bold text-neutral-800 dark:text-neutral-200">
                          {req.doctor_name}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {req.doctor_crm ? req.doctor_crm : 'CRM da rede'} · {req.requesting_unit || 'UBS Central'}
                        </div>
                      </td>

                      {/* Datas */}
                      <td className="p-4">
                        <div className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                          <Calendar size={13} className="text-neutral-400" />
                          <span>Pedido: <strong className="font-mono">{req.requested_date ? req.requested_date.split('-').reverse().join('/') : '---'}</strong></span>
                        </div>
                        {req.performed_date ? (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Feito em: {req.performed_date.split('-').reverse().join('/')}
                          </div>
                        ) : req.scheduled_date ? (
                          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-1 flex items-center gap-1">
                            <Clock size={12} /> Agendado p/: {req.scheduled_date.split('-').reverse().join('/')}
                          </div>
                        ) : (
                          <div className="text-[11px] text-neutral-400 mt-1 italic">
                            Aguardando agendamento
                          </div>
                        )}
                      </td>

                      {/* Status & Anti-Duplicidade */}
                      <td className="p-4">
                        <div className="space-y-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                            isRealized 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                              : isScheduled
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
                              : isBlocked
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                          }`}>
                            {req.status}
                          </span>

                          {/* Badge de Alerta Anti-Duplicidade */}
                          {req.is_duplicate_warning && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-500/20 w-fit">
                              <ShieldAlert size={12} />
                              {req.is_duplicate_override ? 'Liberado c/ Justificativa' : 'Repetição < 30 dias'}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Agendamento (se ainda não agendado nem realizado) */}
                          {!isRealized && !isBlocked && (
                            <button
                              onClick={() => setSelectedRequestForSchedule(req)}
                              title="Agendar data do exame"
                              className="p-2 text-neutral-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-xl transition-colors"
                            >
                              <Calendar size={16} />
                            </button>
                          )}

                          {/* Botão de Concluir / Marcar como Realizado */}
                          {!isRealized && !isBlocked && (
                            <button
                              onClick={() => setSelectedRequestForComplete(req)}
                              title="Registrar Realização / Laudo"
                              className="p-2 text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-colors"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}

                          {/* Botão de Imprimir Guia */}
                          <button
                            onClick={() => setSelectedRequestForPrint(req)}
                            title="Imprimir Guia de Exame Municipal"
                            className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors"
                          >
                            <Printer size={16} />
                          </button>

                          {/* Botão de Detalhes */}
                          <button
                            onClick={() => setSelectedRequestForDetails(req)}
                            title="Ver detalhes completos"
                            className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: NOVA SOLICITAÇÃO COM TRAVA ANTI-DUPLICIDADE      */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isNewRequestModalOpen && (
          <NewExamRequestModal 
            examTypes={examTypes.length > 0 ? examTypes : DEFAULT_EXAM_TYPES.map((t, idx) => ({ ...t, id: `def_${idx}` }))}
            patients={patients}
            units={units}
            professionals={professionals}
            allRequests={requests}
            prefilledPatient={onNewRequestPrefilled}
            onClose={() => setIsNewRequestModalOpen(false)}
            onSuccess={() => {
              setIsNewRequestModalOpen(false);
              onRefresh();
            }}
            currentInstitution={currentInstitution}
          />
        )}

        {/* MODAL 2: DETALHES DO EXAME */}
        {selectedRequestForDetails && (
          <ExamDetailsModal 
            req={selectedRequestForDetails}
            onClose={() => setSelectedRequestForDetails(null)}
          />
        )}

        {/* MODAL 3: AGENDAMENTO */}
        {selectedRequestForSchedule && (
          <ScheduleExamModal 
            req={selectedRequestForSchedule}
            units={units}
            onClose={() => setSelectedRequestForSchedule(null)}
            onSuccess={() => {
              setSelectedRequestForSchedule(null);
              onRefresh();
            }}
          />
        )}

        {/* MODAL 4: CONCLUSÃO / LAUDO */}
        {selectedRequestForComplete && (
          <CompleteExamModal 
            req={selectedRequestForComplete}
            onClose={() => setSelectedRequestForComplete(null)}
            onSuccess={() => {
              setSelectedRequestForComplete(null);
              onRefresh();
            }}
          />
        )}

        {/* MODAL 5: IMPRESSÃO DE GUIA MUNICIPAL */}
        {selectedRequestForPrint && (
          <PrintExamGuideModal 
            req={selectedRequestForPrint}
            currentInstitution={currentInstitution}
            onClose={() => setSelectedRequestForPrint(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// =========================================================
// SUBCOMPONENTE: MODAL DE NOVA SOLICITAÇÃO COM DETECTOR ANTI-DUPLICIDADE
// =========================================================
interface NewExamRequestModalProps {
  examTypes: ExamType[];
  patients: Patient[];
  units: HealthUnit[];
  professionals: HealthProfessional[];
  allRequests: ExamRequest[];
  prefilledPatient?: Patient | null;
  onClose: () => void;
  onSuccess: () => void;
  currentInstitution?: { id: string } | null;
}

const NewExamRequestModal: React.FC<NewExamRequestModalProps> = ({
  examTypes,
  patients,
  units,
  professionals,
  allRequests,
  prefilledPatient,
  onClose,
  onSuccess,
  currentInstitution
}) => {
  const [patientSearch, setPatientSearch] = useState(prefilledPatient ? prefilledPatient.name : '');
  const [showPatientResults, setShowPatientResults] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: prefilledPatient?.id || '',
    patient_name: prefilledPatient?.name || '',
    patient_cpf: prefilledPatient?.cpf || '',
    patient_sus: prefilledPatient?.sus_number || '',
    patient_phone: prefilledPatient?.phone || '',
    patient_birth_date: prefilledPatient?.birth_date || '',
    exam_name: examTypes.length > 0 ? examTypes[0].name : 'Hemograma Completo',
    category: (examTypes.length > 0 ? examTypes[0].category : 'Laboratorial') as ExamCategory,
    doctor_name: professionals.length > 0 ? professionals[0].name : 'Dr. Médico da Rede',
    doctor_crm: professionals.length > 0 ? professionals[0].crm_coren || '' : '',
    requesting_unit: units.length > 0 ? units[0].name : DEFAULT_HEALTH_UNITS[0],
    requested_date: new Date().toISOString().split('T')[0],
    clinical_indication: '',
    is_urgent: false,
    notes: '',
    // Campos de Override de Duplicidade
    is_duplicate_override: false,
    duplicate_override_reason: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selecionar Tipo de Exame e atualizar categoria
  const handleSelectExamType = (name: string) => {
    const found = examTypes.find(t => t.name === name);
    setFormData(prev => ({
      ...prev,
      exam_name: name,
      category: found ? found.category : 'Laboratorial'
    }));
  };

  // Autocomplete de Paciente
  const matchedPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.cpf.includes(patientSearch) ||
    p.sus_number.includes(patientSearch)
  ).slice(0, 5);

  const handleSelectPatient = (p: Patient) => {
    setFormData(prev => ({
      ...prev,
      patient_id: p.id,
      patient_name: p.name,
      patient_cpf: p.cpf,
      patient_sus: p.sus_number,
      patient_phone: p.phone || '',
      patient_birth_date: p.birth_date || '',
      requesting_unit: p.ubs_reference || prev.requesting_unit
    }));
    setPatientSearch(p.name);
    setShowPatientResults(false);
  };

  // Executar a checagem inteligente de duplicidade em tempo real
  const selectedExamType = examTypes.find(t => t.name === formData.exam_name);
  const minInterval = selectedExamType ? selectedExamType.min_interval_days : 30;
  
  const duplicityCheck: DuplicityCheckResult = checkExamDuplicity(
    formData.patient_cpf,
    formData.exam_name,
    allRequests,
    formData.requested_date,
    minInterval
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_name || !formData.exam_name) {
      showToast('Preencha os campos obrigatórios do paciente e exame.', 'error');
      return;
    }

    // Se houver duplicidade e o usuário NÃO marcou justificativa de override, bloqueia o envio
    if (duplicityCheck.isDuplicate && !formData.is_duplicate_override) {
      showToast('Exame bloqueado por repetição em menos de 30 dias. Justificativa médica exigida para liberação.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<ExamRequest> = {
        id: generateUUID(),
        patient_id: isValidUUID(formData.patient_id) ? formData.patient_id : null,
        patient_name: formData.patient_name,
        patient_cpf: formData.patient_cpf,
        patient_sus: formData.patient_sus,
        patient_phone: formData.patient_phone || null,
        patient_birth_date: formData.patient_birth_date || null,
        exam_name: formData.exam_name,
        category: formData.category,
        doctor_name: formData.doctor_name,
        doctor_crm: formData.doctor_crm || null,
        requesting_unit: formData.requesting_unit || null,
        requested_date: formData.requested_date,
        status: 'Solicitado',
        clinical_indication: formData.clinical_indication || null,
        is_urgent: formData.is_urgent,
        is_duplicate_warning: duplicityCheck.isDuplicate,
        is_duplicate_override: formData.is_duplicate_override,
        duplicate_override_reason: formData.is_duplicate_override ? formData.duplicate_override_reason : null,
        days_since_last_exam: duplicityCheck.isDuplicate ? duplicityCheck.daysSince : null,
        last_exam_date: duplicityCheck.isDuplicate && duplicityCheck.lastExam ? (duplicityCheck.lastExam.performed_date || duplicityCheck.lastExam.requested_date) : null,
        notes: formData.notes || null,
        institution_id: currentInstitution?.id || null
      };

      const { error } = await supabase.from('exam_requests').insert([payload]);
      if (error) throw error;

      showToast(
        duplicityCheck.isDuplicate 
          ? 'Solicitação registrada com justificativa de exceção auditada!'
          : 'Solicitação de exame enviada para a regulação com sucesso!', 
        'success'
      );
      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao registrar solicitação: ' + err.message, 'error');
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
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-900/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md">
              <Activity size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">Nova Solicitação de Exame</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Prescrição médica com validação de carência mínima e controle de duplicidade.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
            <XCircle size={20} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Autocomplete de Paciente */}
          <div className="relative space-y-1 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Buscar Paciente Cadastrado (Auto-Preenchimento)
            </label>
            <div className="relative">
              <input 
                type="text"
                value={patientSearch}
                onChange={e => {
                  setPatientSearch(e.target.value);
                  setShowPatientResults(true);
                }}
                onFocus={() => setShowPatientResults(true)}
                placeholder="Digite o Nome, CPF ou Cartão SUS..."
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            {showPatientResults && patientSearch && matchedPatients.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-30 overflow-hidden">
                {matchedPatients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-left p-3 hover:bg-emerald-50 dark:hover:bg-neutral-800 flex justify-between items-center text-xs border-b last:border-0 border-neutral-100 dark:border-neutral-800"
                  >
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{p.name}</p>
                      <p className="text-[11px] text-neutral-400 font-mono">CPF: {p.cpf} · SUS: {p.sus_number}</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">Selecionar</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dados do Paciente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome do Paciente *</label>
              <input 
                type="text" required
                value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})}
                placeholder="Nome completo do cidadão"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">CPF *</label>
              <input 
                type="text" required
                value={formData.patient_cpf} onChange={e => setFormData({...formData, patient_cpf: formatCPF(e.target.value)})}
                placeholder="000.000.000-00"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cartão do SUS *</label>
              <input 
                type="text" required
                value={formData.patient_sus} onChange={e => setFormData({...formData, patient_sus: formatSUS(e.target.value)})}
                placeholder="000 0000 0000 0000"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>

            {/* Seleção do Exame */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Procedimento / Exame Solicitado *
              </label>
              <select 
                value={formData.exam_name}
                onChange={e => handleSelectExamType(e.target.value)}
                required
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              >
                {examTypes.map(t => (
                  <option key={t.id || t.name} value={t.name}>
                    {t.name} ({t.category}) — Carência: {t.min_interval_days} dias
                  </option>
                ))}
              </select>
            </div>

            {/* ========================================================= */}
            {/* 🛑 ALERTA INTELIGENTE ANTI-DUPLICIDADE (< 30 DIAS)       */}
            {/* ========================================================= */}
            {duplicityCheck.isDuplicate && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:col-span-2 p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-rose-800 dark:text-rose-300">
                      ALERTA DE REPETIÇÃO: EXAME SOLICITADO/REALIZADO HÁ MENOS DE {duplicityCheck.minInterval} DIAS!
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-1 leading-relaxed">
                      {duplicityCheck.message}
                    </p>
                    {duplicityCheck.lastExam && (
                      <div className="mt-2 p-3 bg-white/80 dark:bg-neutral-900/60 rounded-xl text-[11px] font-mono border border-rose-200 dark:border-rose-800/50">
                        <p><strong>Último Pedido:</strong> {duplicityCheck.lastExam.requested_date?.split('-').reverse().join('/')}</p>
                        <p><strong>Médico Anterior:</strong> {duplicityCheck.lastExam.doctor_name || 'Rede Municipal'}</p>
                        <p><strong>Status Anterior:</strong> {duplicityCheck.lastExam.status}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-rose-200 dark:border-rose-800 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-rose-900 dark:text-rose-200">
                    <input 
                      type="checkbox"
                      checked={formData.is_duplicate_override}
                      onChange={e => setFormData({...formData, is_duplicate_override: e.target.checked})}
                      className="rounded text-rose-600"
                    />
                    <span>Liberar com Justificativa Médica Excepcional (Auditoria)</span>
                  </label>

                  {formData.is_duplicate_override && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">
                        Justificativa Clínica Formal *
                      </label>
                      <textarea 
                        rows={2} required
                        value={formData.duplicate_override_reason}
                        onChange={e => setFormData({...formData, duplicate_override_reason: e.target.value})}
                        placeholder="Ex: Piora súbita do quadro clínico / suspeita de complicação aguda / parecer pré-operatório urgente..."
                        className="w-full bg-white dark:bg-neutral-900 border border-rose-300 dark:border-rose-700 px-4 py-2.5 rounded-xl text-xs outline-none dark:text-white resize-none"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Médico Solicitante */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Médico Solicitante *</label>
              <input 
                type="text" required
                value={formData.doctor_name} onChange={e => setFormData({...formData, doctor_name: e.target.value})}
                placeholder="Ex: Dr. Carlos Silveira"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">CRM do Médico</label>
              <input 
                type="text"
                value={formData.doctor_crm} onChange={e => setFormData({...formData, doctor_crm: e.target.value})}
                placeholder="Ex: CRM 12345/MG"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">UBS Solicitante</label>
              <select 
                value={formData.requesting_unit} onChange={e => setFormData({...formData, requesting_unit: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
              >
                {units.length > 0 ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>) : DEFAULT_HEALTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data da Prescrição *</label>
              <input 
                type="date" required
                value={formData.requested_date} onChange={e => setFormData({...formData, requested_date: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Hipótese Diagnóstica / Indicação Clínica</label>
              <input 
                type="text"
                value={formData.clinical_indication} onChange={e => setFormData({...formData, clinical_indication: e.target.value})}
                placeholder="Ex: Investigação de anemia, dor abdominal em QID, controle semestral..."
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
              />
            </div>

            <div className="flex items-center gap-6 md:col-span-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.is_urgent}
                  onChange={e => setFormData({...formData, is_urgent: e.target.checked})}
                  className="rounded text-rose-600"
                />
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">🚨 Exame com Prioridade de Urgência</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || (duplicityCheck.isDuplicate && !formData.is_duplicate_override)}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Gravando...' : 'Salvar Solicitação de Exame'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// =========================================================
// SUBCOMPONENTE: MODAL DE DETALHES COMPLETOS DO EXAME
// =========================================================
const ExamDetailsModal: React.FC<{ req: ExamRequest; onClose: () => void }> = ({ req, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800"
      >
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">Ficha de Regulação do Exame</h3>
            <p className="text-xs text-neutral-400 font-mono">Protocolo: {req.id}</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white">
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-black rounded-full uppercase">
              Status: {req.status}
            </span>
            {req.is_urgent && (
              <span className="px-3 py-1 bg-rose-50 text-rose-700 font-black rounded-full uppercase">
                Urgência
              </span>
            )}
            {req.is_duplicate_warning && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 font-black rounded-full uppercase">
                Repetição &lt; 30d
              </span>
            )}
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl space-y-2">
            <h4 className="font-black text-[10px] uppercase text-neutral-400">Dados do Paciente</h4>
            <p className="font-bold text-sm text-neutral-900 dark:text-white">{req.patient_name}</p>
            <p className="text-neutral-500 font-mono">CPF: {req.patient_cpf} · SUS: {req.patient_sus}</p>
            {req.patient_phone && <p className="text-neutral-500 font-mono">Tel: {formatPhone(req.patient_phone)}</p>}
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl space-y-2">
            <h4 className="font-black text-[10px] uppercase text-neutral-400">Informações do Exame</h4>
            <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">{req.exam_name} ({req.category})</p>
            <p><strong>Médico Solicitante:</strong> {req.doctor_name} {req.doctor_crm ? `(${req.doctor_crm})` : ''}</p>
            <p><strong>UBS Solicitante:</strong> {req.requesting_unit || 'UBS Central'}</p>
            <p><strong>Data do Pedido:</strong> {req.requested_date ? req.requested_date.split('-').reverse().join('/') : '---'}</p>
            {req.scheduled_date && <p><strong>Data Agendada:</strong> {req.scheduled_date.split('-').reverse().join('/')}</p>}
            {req.performed_date && <p><strong>Data Realizada:</strong> {req.performed_date.split('-').reverse().join('/')}</p>}
            {req.executing_unit && <p><strong>Local de Execução:</strong> {req.executing_unit}</p>}
          </div>

          {req.duplicate_override_reason && (
            <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-300 space-y-1">
              <p className="font-black text-[10px] uppercase">Justificativa Médica de Liberação Excepcional</p>
              <p>{req.duplicate_override_reason}</p>
            </div>
          )}

          {req.result_notes && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 space-y-1">
              <p className="font-black text-[10px] uppercase">Laudo / Resumo do Resultado</p>
              <p className="whitespace-pre-wrap">{req.result_notes}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
          <button onClick={onClose} className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-xs">
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// =========================================================
// SUBCOMPONENTE: MODAL DE AGENDAMENTO
// =========================================================
const ScheduleExamModal: React.FC<{
  req: ExamRequest;
  units: HealthUnit[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ req, units, onClose, onSuccess }) => {
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [executingUnit, setExecutingUnit] = useState(units.length > 0 ? units[0].name : 'Laboratório Central Municipal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('exam_requests')
        .update({
          scheduled_date: scheduledDate,
          executing_unit: executingUnit,
          status: 'Agendado'
        })
        .eq('id', req.id);

      if (error) throw error;
      showToast('Exame agendado com sucesso!', 'success');
      onSuccess();
    } catch (err: any) {
      showToast('Erro ao agendar exame: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800"
      >
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-purple-50 dark:bg-purple-900/20 flex justify-between items-center">
          <h3 className="text-base font-black text-purple-950 dark:text-purple-100 flex items-center gap-2">
            <Calendar size={18} className="text-purple-600" /> Agendar Realização do Exame
          </h3>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white">
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <p className="text-xs font-bold text-neutral-900 dark:text-white">{req.exam_name}</p>
            <p className="text-xs text-neutral-400">Paciente: {req.patient_name}</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data Agendada para Coleta / Exame *</label>
            <input 
              type="date" required
              value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Local / Laboratório Executor *</label>
            <input 
              type="text" required
              value={executingUnit} onChange={e => setExecutingUnit(e.target.value)}
              placeholder="Ex: Laboratório Central Municipal, Policlínica"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-xs">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-500/20 disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// =========================================================
// SUBCOMPONENTE: MODAL DE CONCLUSÃO / LAUDO DO EXAME
// =========================================================
const CompleteExamModal: React.FC<{
  req: ExamRequest;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ req, onClose, onSuccess }) => {
  const [performedDate, setPerformedDate] = useState(new Date().toISOString().split('T')[0]);
  const [resultNotes, setResultNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('exam_requests')
        .update({
          performed_date: performedDate,
          result_notes: resultNotes || 'Exame realizado e laudo entregue ao paciente.',
          status: 'Realizado'
        })
        .eq('id', req.id);

      if (error) throw error;
      showToast('Exame marcado como Realizado com sucesso!', 'success');
      onSuccess();
    } catch (err: any) {
      showToast('Erro ao concluir exame: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800"
      >
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-900/20 flex justify-between items-center">
          <h3 className="text-base font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" /> Registrar Realização do Exame
          </h3>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white">
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <p className="text-xs font-bold text-neutral-900 dark:text-white">{req.exam_name}</p>
            <p className="text-xs text-neutral-400">Paciente: {req.patient_name}</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data em que o Exame Foi Feito *</label>
            <input 
              type="date" required
              value={performedDate} onChange={e => setPerformedDate(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Resumo do Laudo / Observações</label>
            <textarea 
              rows={3}
              value={resultNotes} onChange={e => setResultNotes(e.target.value)}
              placeholder="Ex: Laudo normal emitido, arquivado no prontuário; valores normais de hemoglobina..."
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 rounded-xl text-xs outline-none dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-xs">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : 'Confirmar Realização'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// =========================================================
// SUBCOMPONENTE: MODAL DE GUIA DE EXAME MUNICIPAL (IMPRESSÃO)
// =========================================================
const PrintExamGuideModal: React.FC<{
  req: ExamRequest;
  currentInstitution?: { id: string; name?: string } | null;
  onClose: () => void;
}> = ({ req, currentInstitution, onClose }) => {
  const handlePrint = () => {
    printExamGuide(req, currentInstitution?.name || 'Prefeitura Municipal');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]"
      >
        <div className="p-5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm text-neutral-900 dark:text-white">Guia de Encaminhamento / Autorização</h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Emissão Oficial para Procedimentos e Exames</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint} 
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer size={15} /> Imprimir Guia
            </button>
            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-xl">
              <XCircle size={20} />
            </button>
          </div>
        </div>

        {/* Pré-visualização na tela */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="border border-neutral-200 dark:border-neutral-700 p-6 rounded-2xl bg-neutral-50/50 dark:bg-neutral-800/40 space-y-4">
            <div className="border-b border-neutral-200 dark:border-neutral-700 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black uppercase text-neutral-900 dark:text-white">{currentInstitution?.name || 'Prefeitura Municipal - Secretaria de Saúde'}</h2>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Central de Regulação Municipal de Saúde</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-neutral-400">Protocolo</p>
                <p className="text-sm font-mono font-black text-neutral-900 dark:text-white">{req.id.substring(0, 13).toUpperCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase block">Paciente</span>
                <span className="font-bold text-sm text-neutral-900 dark:text-white">{req.patient_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase block">CPF / Cartão SUS</span>
                <span className="font-mono text-neutral-700 dark:text-neutral-300">{req.patient_cpf} · {req.patient_sus}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase block">Médico Solicitante</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">{req.doctor_name} {req.doctor_crm ? `(${req.doctor_crm})` : ''}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase block">Unidade de Origem</span>
                <span className="text-neutral-800 dark:text-neutral-200">{req.requesting_unit || 'UBS Central'}</span>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/50 space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 block">Exame Autorizado</span>
              <p className="text-base font-black text-blue-950 dark:text-blue-100">{req.exam_name}</p>
              <p className="text-neutral-600 dark:text-neutral-300">Categoria: {req.category} · Prioridade: {req.is_urgent ? '🚨 URGÊNCIA' : 'Eletivo'}</p>
              {req.scheduled_date && (
                <p className="font-bold text-purple-700 dark:text-purple-300 pt-1">
                  📅 Data Agendada: {req.scheduled_date.split('-').reverse().join('/')} ({req.executing_unit || 'Laboratório Central'})
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-white rounded-xl font-bold text-xs"
          >
            Fechar
          </button>
          <button 
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Printer size={15} /> Imprimir Guia
          </button>
        </div>
      </motion.div>
    </div>
  );
};
