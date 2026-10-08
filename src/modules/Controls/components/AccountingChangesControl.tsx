import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Filter, Edit3, Trash2, Eye, FileText, CheckCircle2, 
  AlertCircle, AlertTriangle, Clock, Building2, User, DollarSign, 
  Calendar, Printer, ShieldCheck, X, FileCheck, Scale, Award, 
  ArrowRight, CheckSquare, MessageSquare, Briefcase, Phone, Mail,
  RefreshCw, FileSpreadsheet, Paperclip, Upload, Download, ExternalLink,
  Calculator, Landmark, Shield, Copy, Check, FileDiff, Sparkles, UserCheck,
  Lock, GitBranch, Layers, ShieldAlert, FileSignature, BookOpen
} from 'lucide-react';
import { 
  AccountingChange, 
  AccountingChangeStatus, 
  AccountingChangeType,
  ACCOUNTING_CHANGE_TYPES,
  ACCOUNTING_STATUS_CONFIG,
  REQUESTER_ROLES,
  MUNICIPAL_DEPARTMENTS,
  TIPOS_DOCUMENTOS_CONTABEIS,
  TIPOS_AJUSTES_CONTABEIS,
  BASES_LEGAIS_MCASP,
  STATUS_SRC_CONFIG,
  TipoDocumentoContabil,
  TipoAjusteContabil,
  StatusSRC,
  PartidaContabil
} from '../types/accountingChanges';
import { 
  accountingChangesService, 
  computeSha256, 
  generateHistoricoRazao, 
  validateSRCDates, 
  checkSegregationOfDuties 
} from '../services/accountingChangesService';
import { SRCPartidasComparativo } from './SRCPartidasComparativo';
import { SRCTimelineAuditoria } from './SRCTimelineAuditoria';
import { generateSRCDossierHtml } from './SRCDossierImpressao';
import { LivroAlteracoesContabeis } from './LivroAlteracoesContabeis';
import { AdminUser } from '../../../types';
import { hasPermission } from '../../../lib/permissions';

interface AccountingChangesControlProps {
  searchQuery?: string;
  currentUser?: AdminUser | null;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Utilitário para converter string de mês para YYYY-MM (formato aceito pelo <input type="month">)
const parseMonthToIso = (val?: string): string => {
  if (!val) return new Date().toISOString().slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(val)) return val;
  const parts = val.split(/[\/\- ]+/);
  if (parts.length >= 2) {
    const monthName = parts[0].toLowerCase();
    const year = parts[parts.length - 1];
    const idx = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(monthName.slice(0, 3)));
    if (idx !== -1 && year.length === 4) {
      return `${year}-${String(idx + 1).padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().slice(0, 7);
};

// Utilitário para converter YYYY-MM em formato amigável para relatórios e exibição (ex: "Outubro / 2026")
const formatIsoToFriendlyMonth = (iso?: string): string => {
  if (!iso) return '';
  if (/^\d{4}-\d{2}$/.test(iso)) {
    const [year, month] = iso.split('-');
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_NAMES[mIdx]} / ${year}`;
    }
  }
  return iso;
};

// Formatação de data completa (Dia, Mês e Ano - ex: 07/10/2026)
const formatFullDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const [y, m, d] = clean.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  } catch {}
  return clean;
};

// Formatação de data por extenso (ex: "07 de Outubro de 2026")
const formatFullDateExtenso = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const clean = dateStr.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const [y, m, d] = clean.split('-');
      const mIdx = parseInt(m, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${d} de ${MONTH_NAMES[mIdx]} de ${y}`;
      }
    }
  } catch {}
  return formatFullDate(dateStr);
};

export const AccountingChangesControl: React.FC<AccountingChangesControlProps> = ({ 
  searchQuery = '',
  currentUser
}) => {
  const canView = !currentUser || hasPermission(currentUser, 'accounting_changes', 'view');
  const canEdit = !currentUser || hasPermission(currentUser, 'accounting_changes', 'edit');
  const canAdmin = !currentUser || hasPermission(currentUser, 'accounting_changes', 'admin');
  const [changes, setChanges] = useState<AccountingChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountingChangeStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | AccountingChangeType>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // Filtro por data específica (dia, mês e ano)
  const [accountingMode, setAccountingMode] = useState<'livro' | 'src'>('livro');

  // Modais
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingChange, setEditingChange] = useState<AccountingChange | null>(null);
  const [viewingChange, setViewingChange] = useState<AccountingChange | null>(null);
  const [reviewModalChange, setReviewModalChange] = useState<AccountingChange | null>(null);

  // Modal de Relatório e Filtros de Impressão
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | AccountingChangeStatus>('all');
  const [reportDepartmentFilter, setReportDepartmentFilter] = useState<string>('all');
  const [reportRoleFilter, setReportRoleFilter] = useState<string>('all');
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | AccountingChangeType>('all');
  const [reportYearFilter, setReportYearFilter] = useState<string>('all');
  const [reportMonthFilter, setReportMonthFilter] = useState<string>('');
  const [reportDateFilter, setReportDateFilter] = useState<string>(''); // Filtro por data específica no relatório

  // Formulário de Cadastro / Edição
  const [formRequesterName, setFormRequesterName] = useState('');
  const [formRequesterRole, setFormRequesterRole] = useState(REQUESTER_ROLES[0]);
  const [formCustomRole, setFormCustomRole] = useState('');
  const [formRequesterDepartment, setFormRequesterDepartment] = useState(MUNICIPAL_DEPARTMENTS[1]); // Finanças
  const [formCustomDepartment, setFormCustomDepartment] = useState('');
  const [formRequesterEmail, setFormRequesterEmail] = useState('');
  const [formRequesterPhone, setFormRequesterPhone] = useState('');
  const [formChangeDate, setFormChangeDate] = useState<string>(new Date().toISOString().slice(0, 10)); // Data específica (Dia, Mês e Ano)
  const [formChangeType, setFormChangeType] = useState<AccountingChangeType>('retificacao_empenho');
  const [formReferenceDoc, setFormReferenceDoc] = useState('');
  const [formFiscalYear, setFormFiscalYear] = useState<number>(new Date().getFullYear());
  const [formMonthRef, setFormMonthRef] = useState<string>(new Date().toISOString().slice(0, 7));
  const [formAmount, setFormAmount] = useState<string>('0');
  const [formReason, setFormReason] = useState('');
  const [formCurrentState, setFormCurrentState] = useState('');
  const [formProposedState, setFormProposedState] = useState('');

  // Estados Especializados de Retificação Contábil (SRC - MCASP)
  const [formTipoDocumentoSRC, setFormTipoDocumentoSRC] = useState<TipoDocumentoContabil>('EMPENHO');
  const [formTipoAjusteSRC, setFormTipoAjusteSRC] = useState<TipoAjusteContabil>('ESTORNO_PARCIAL');
  const [formDataFatoGerador, setFormDataFatoGerador] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formDataDocumentoOrigem, setFormDataDocumentoOrigem] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formDataLancamentoEfetivo, setFormDataLancamentoEfetivo] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formBaseLegalMcasp, setFormBaseLegalMcasp] = useState<string>(BASES_LEGAIS_MCASP[0]);
  const [formValorOriginal, setFormValorOriginal] = useState<string>('0');

  // Partidas Contábeis (PCASP) - Lançamento Primitivo vs Retificador
  const [formOrigDebitoCod, setFormOrigDebitoCod] = useState('3.3.9.0.30.00');
  const [formOrigDebitoNome, setFormOrigDebitoNome] = useState('Material de Consumo');
  const [formOrigCreditoCod, setFormOrigCreditoCod] = useState('1.1.1.1.1.00');
  const [formOrigCreditoNome, setFormOrigCreditoNome] = useState('Caixa e Equivalentes de Caixa');
  const [formOrigFonte, setFormOrigFonte] = useState('1.500.0000 - Recursos Ordinários');
  const [formOrigElemento, setFormOrigElemento] = useState('3.3.90.30 - Material de Consumo');

  const [formPropDebitoCod, setFormPropDebitoCod] = useState('3.3.9.0.39.00');
  const [formPropDebitoNome, setFormPropDebitoNome] = useState('Outros Serviços de Terceiros - PJ');
  const [formPropCreditoCod, setFormPropCreditoCod] = useState('1.1.1.1.1.00');
  const [formPropCreditoNome, setFormPropCreditoNome] = useState('Caixa e Equivalentes de Caixa');
  const [formPropFonte, setFormPropFonte] = useState('1.500.0000 - Recursos Ordinários');
  const [formPropElemento, setFormPropElemento] = useState('3.3.90.39 - Outros Serviços de Terceiros');

  // Anexos (Antes e Depois) com Hashes SHA-256
  const [formAttachmentBeforeName, setFormAttachmentBeforeName] = useState('');
  const [formAttachmentBeforeUrl, setFormAttachmentBeforeUrl] = useState('');
  const [formAttachmentBeforeHash, setFormAttachmentBeforeHash] = useState('');
  const [formAttachmentAfterName, setFormAttachmentAfterName] = useState('');
  const [formAttachmentAfterUrl, setFormAttachmentAfterUrl] = useState('');
  const [formAttachmentAfterHash, setFormAttachmentAfterHash] = useState('');

  // Aba ativa no modal de visualização detalhada
  const [viewingTab, setViewingTab] = useState<'identificacao' | 'partidas' | 'timeline' | 'historico'>('identificacao');

  const fileBeforeInputRef = useRef<HTMLInputElement>(null);
  const fileAfterInputRef = useRef<HTMLInputElement>(null);

  // Formulário de Parecer Contábil e Homologação
  const [reviewStatus, setReviewStatus] = useState<AccountingChangeStatus>('approved');
  const [reviewAccountantName, setReviewAccountantName] = useState('');
  const [reviewAccountantCrc, setReviewAccountantCrc] = useState('');
  const [reviewAccountantNotes, setReviewAccountantNotes] = useState('');
  const [reviewDataLancamentoEfetivo, setReviewDataLancamentoEfetivo] = useState(new Date().toISOString().slice(0, 10));

  // Feedback Toast & Copied state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedProtocol, setCopiedProtocol] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyProtocol = (protocol: string) => {
    navigator.clipboard.writeText(protocol);
    setCopiedProtocol(protocol);
    showToast(`Protocolo ${protocol} copiado!`);
    setTimeout(() => setCopiedProtocol(null), 2000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await accountingChangesService.getChanges();
      setChanges(data);
    } catch (err) {
      console.error('Erro ao carregar alterações contábeis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdated = () => {
      loadData();
    };

    window.addEventListener('accounting-changes-updated', handleUpdated);
    return () => window.removeEventListener('accounting-changes-updated', handleUpdated);
  }, []);

  // Upload de Arquivos Antes e Depois com cálculo de integridade SHA-256
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('O arquivo deve ter no máximo 15MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const fileHash = await computeSha256(result);

      if (target === 'before') {
        setFormAttachmentBeforeName(file.name);
        setFormAttachmentBeforeUrl(result);
        setFormAttachmentBeforeHash(fileHash);
        showToast(`Doc Primitivo "${file.name}" anexado (Hash SHA-256 gerado)!`);
      } else {
        setFormAttachmentAfterName(file.name);
        setFormAttachmentAfterUrl(result);
        setFormAttachmentAfterHash(fileHash);
        showToast(`Doc Retificado "${file.name}" anexado (Hash SHA-256 gerado)!`);
      }
    };
    reader.onerror = () => {
      showToast('Erro ao ler o arquivo selecionado.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (target: 'before' | 'after') => {
    if (target === 'before') {
      setFormAttachmentBeforeName('');
      setFormAttachmentBeforeUrl('');
      setFormAttachmentBeforeHash('');
      if (fileBeforeInputRef.current) fileBeforeInputRef.current.value = '';
    } else {
      setFormAttachmentAfterName('');
      setFormAttachmentAfterUrl('');
      setFormAttachmentAfterHash('');
      if (fileAfterInputRef.current) fileAfterInputRef.current.value = '';
    }
  };

  // Ícone por Cargo do Solicitante
  const getRoleIcon = (roleStr: string) => {
    const lower = (roleStr || '').toLowerCase();
    // Assessor Contábil / Setor de Assessoria Contábil
    if (lower.includes('assessor') && (lower.includes('contabil') || lower.includes('contábil'))) {
      return <Calculator size={14} className="text-teal-600 dark:text-teal-400" />;
    }
    if (lower.includes('secretár') || lower.includes('secretar')) return <Award size={14} className="text-indigo-500" />;
    if (lower.includes('contador') || lower.includes('contabil') || lower.includes('contábil')) return <Calculator size={14} className="text-emerald-500" />;
    if (lower.includes('controle') || lower.includes('auditor')) return <ShieldCheck size={14} className="text-sky-500" />;
    if (lower.includes('assessor') || lower.includes('procurador') || lower.includes('jurídic')) return <Scale size={14} className="text-purple-500" />;
    if (lower.includes('prefeito') || lower.includes('gabinete')) return <Landmark size={14} className="text-amber-500" />;
    return <UserCheck size={14} className="text-neutral-500" />;
  };

  // Estatísticas e KPIs
  const totalCount = changes.length;
  const pendingCount = changes.filter(c => c.status === 'pending').length;
  const inReviewCount = changes.filter(c => c.status === 'in_review').length;
  const approvedCount = changes.filter(c => c.status === 'approved' || c.status === 'completed').length;
  const totalAmount = changes.reduce((acc, c) => acc + (c.amount || 0), 0);

  // Filtragem
  const filteredChanges = useMemo(() => {
    const term = (localSearch || searchQuery).toLowerCase().trim();

    return changes.filter(item => {
      const matchesSearch = 
        !term ||
        item.protocolNumber.toLowerCase().includes(term) ||
        item.requesterName.toLowerCase().includes(term) ||
        item.requesterRole.toLowerCase().includes(term) ||
        item.requesterDepartment.toLowerCase().includes(term) ||
        item.referenceDoc.toLowerCase().includes(term) ||
        item.reason.toLowerCase().includes(term) ||
        (item.accountantName && item.accountantName.toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.changeType === typeFilter;
      const matchesDept = departmentFilter === 'all' || item.requesterDepartment === departmentFilter;
      const matchesRole = roleFilter === 'all' || item.requesterRole === roleFilter;
      const matchesDate = !dateFilter || 
        (item.changeDate && item.changeDate.slice(0, 10) === dateFilter) || 
        (item.createdAt && item.createdAt.slice(0, 10) === dateFilter);

      return matchesSearch && matchesStatus && matchesType && matchesDept && matchesRole && matchesDate;
    });
  }, [changes, localSearch, searchQuery, statusFilter, typeFilter, departmentFilter, roleFilter, dateFilter]);

  // Dados Filtrados para o Relatório Geral de Alterações
  const reportFilteredChanges = useMemo(() => {
    return changes.filter(item => {
      const term = reportSearch.toLowerCase().trim();
      const matchesSearch = 
        !term ||
        item.protocolNumber.toLowerCase().includes(term) ||
        item.requesterName.toLowerCase().includes(term) ||
        item.requesterRole.toLowerCase().includes(term) ||
        item.requesterDepartment.toLowerCase().includes(term) ||
        item.referenceDoc.toLowerCase().includes(term) ||
        item.reason.toLowerCase().includes(term);

      const matchesStatus = reportStatusFilter === 'all' || item.status === reportStatusFilter;
      const matchesDept = reportDepartmentFilter === 'all' || item.requesterDepartment === reportDepartmentFilter;
      const matchesRole = reportRoleFilter === 'all' || item.requesterRole === reportRoleFilter;
      const matchesType = reportTypeFilter === 'all' || item.changeType === reportTypeFilter;
      const matchesYear = reportYearFilter === 'all' || String(item.fiscalYear) === reportYearFilter;
      const matchesMonth = !reportMonthFilter || parseMonthToIso(item.monthRef) === reportMonthFilter;
      const matchesDate = !reportDateFilter || 
        (item.changeDate && item.changeDate.slice(0, 10) === reportDateFilter) || 
        (item.createdAt && item.createdAt.slice(0, 10) === reportDateFilter);

      return matchesSearch && matchesStatus && matchesDept && matchesRole && matchesType && matchesYear && matchesMonth && matchesDate;
    });
  }, [changes, reportSearch, reportStatusFilter, reportDepartmentFilter, reportRoleFilter, reportTypeFilter, reportYearFilter, reportMonthFilter, reportDateFilter]);

  const reportTotalCount = reportFilteredChanges.length;
  const reportTotalAmount = reportFilteredChanges.reduce((acc, c) => acc + (c.amount || 0), 0);
  const reportApprovedCount = reportFilteredChanges.filter(c => c.status === 'approved' || c.status === 'completed').length;
  const reportPendingCount = reportFilteredChanges.filter(c => c.status === 'pending').length;

  const openNewModal = () => {
    if (!canEdit) {
      showToast('Você não possui permissão para registrar novas solicitações.', 'error');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    setEditingChange(null);
    setFormRequesterName(currentUser?.name || '');
    setFormRequesterRole(REQUESTER_ROLES[0]);
    setFormCustomRole('');
    setFormRequesterDepartment(MUNICIPAL_DEPARTMENTS[1]);
    setFormCustomDepartment('');
    setFormRequesterEmail(currentUser?.email || '');
    setFormRequesterPhone('');
    setFormChangeType('retificacao_empenho');
    setFormTipoDocumentoSRC('EMPENHO');
    setFormTipoAjusteSRC('ESTORNO_PARCIAL');
    setFormReferenceDoc('');
    setFormChangeDate(today);
    setFormDataFatoGerador(today);
    setFormDataDocumentoOrigem(today);
    setFormDataLancamentoEfetivo(today);
    setFormBaseLegalMcasp(BASES_LEGAIS_MCASP[0]);
    const [y, m] = today.split('-');
    const yNum = parseInt(y, 10);
    const mIdx = parseInt(m, 10) - 1;
    setFormFiscalYear(yNum);
    setFormMonthRef(mIdx >= 0 && mIdx < 12 ? `${MONTH_NAMES[mIdx]} / ${y}` : today.slice(0, 7));
    setFormAmount('0');
    setFormValorOriginal('0');
    setFormReason('');
    setFormCurrentState('');
    setFormProposedState('');
    setFormAttachmentBeforeName('');
    setFormAttachmentBeforeUrl('');
    setFormAttachmentBeforeHash('');
    setFormAttachmentAfterName('');
    setFormAttachmentAfterUrl('');
    setFormAttachmentAfterHash('');
    setIsNewModalOpen(true);
  };

  const openEditModal = (item: AccountingChange) => {
    if (!canEdit) {
      showToast('Você não possui permissão para editar solicitações.', 'error');
      return;
    }
    setEditingChange(item);
    setFormRequesterName(item.requesterName);
    
    if (REQUESTER_ROLES.includes(item.requesterRole)) {
      setFormRequesterRole(item.requesterRole);
      setFormCustomRole('');
    } else {
      setFormRequesterRole('Outro Cargo / Função');
      setFormCustomRole(item.requesterRole);
    }

    if (MUNICIPAL_DEPARTMENTS.includes(item.requesterDepartment)) {
      setFormRequesterDepartment(item.requesterDepartment);
      setFormCustomDepartment('');
    } else {
      setFormRequesterDepartment('Outro Órgão / Autarquia');
      setFormCustomDepartment(item.requesterDepartment);
    }

    setFormRequesterEmail(item.requesterEmail || '');
    setFormRequesterPhone(item.requesterPhone || '');
    const initialDate = item.changeDate 
      ? item.changeDate.slice(0, 10) 
      : (item.createdAt ? item.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setFormChangeDate(initialDate);
    setFormDataFatoGerador(item.dataFatoGerador || initialDate);
    setFormDataDocumentoOrigem(item.dataDocumentoOrigem || initialDate);
    setFormDataLancamentoEfetivo(item.dataLancamentoEfetivo || initialDate);
    setFormChangeType(item.changeType);
    setFormTipoDocumentoSRC(item.tipoDocumentoSRC || 'EMPENHO');
    setFormTipoAjusteSRC(item.tipoAjusteSRC || 'ESTORNO_PARCIAL');
    setFormBaseLegalMcasp(item.baseLegalMcasp || BASES_LEGAIS_MCASP[0]);
    setFormReferenceDoc(item.referenceDoc);
    setFormFiscalYear(item.fiscalYear);
    setFormMonthRef(parseMonthToIso(item.monthRef));
    setFormAmount(String(item.amount || 0));
    setFormValorOriginal(String(item.valorOriginal || item.amount || 0));
    setFormReason(item.reason);
    setFormCurrentState(item.currentState || '');
    setFormProposedState(item.proposedState || '');

    if (item.partidaOriginal) {
      setFormOrigDebitoCod(item.partidaOriginal.contaDebitoCodigo || '3.3.9.0.30.00');
      setFormOrigDebitoNome(item.partidaOriginal.contaDebitoNome || 'Material de Consumo');
      setFormOrigCreditoCod(item.partidaOriginal.contaCreditoCodigo || '1.1.1.1.1.00');
      setFormOrigCreditoNome(item.partidaOriginal.contaCreditoNome || 'Caixa');
      setFormOrigFonte(item.partidaOriginal.fonteRecursoCodigo || '1.500.0000');
      setFormOrigElemento(item.partidaOriginal.elementoDespesaCodigo || '3.3.90.30');
    }

    if (item.partidaProposta) {
      setFormPropDebitoCod(item.partidaProposta.contaDebitoCodigo || '3.3.9.0.39.00');
      setFormPropDebitoNome(item.partidaProposta.contaDebitoNome || 'Serviços de Terceiros');
      setFormPropCreditoCod(item.partidaProposta.contaCreditoCodigo || '1.1.1.1.1.00');
      setFormPropCreditoNome(item.partidaProposta.contaCreditoNome || 'Caixa');
      setFormPropFonte(item.partidaProposta.fonteRecursoCodigo || '1.500.0000');
      setFormPropElemento(item.partidaProposta.elementoDespesaCodigo || '3.3.90.39');
    }

    setFormAttachmentBeforeName(item.attachmentBeforeName || item.attachmentName || '');
    setFormAttachmentBeforeUrl(item.attachmentBeforeUrl || item.attachmentUrl || '');
    setFormAttachmentBeforeHash(item.attachmentBeforeHash || '');
    setFormAttachmentAfterName(item.attachmentAfterName || '');
    setFormAttachmentAfterUrl(item.attachmentAfterUrl || '');
    setFormAttachmentAfterHash(item.attachmentAfterHash || '');
    setIsNewModalOpen(true);
  };

  const openReviewModal = (item: AccountingChange) => {
    if (!canEdit) {
      showToast('Você não possui permissão para emitir pareceres contábeis.', 'error');
      return;
    }
    setReviewModalChange(item);
    setReviewStatus(item.status === 'pending' ? 'in_review' : item.status);
    setReviewAccountantName(item.accountantName || currentUser?.name || '');
    setReviewAccountantCrc(item.accountantCrc || '');
    setReviewAccountantNotes(item.accountantNotes || '');
    setReviewDataLancamentoEfetivo(item.dataLancamentoEfetivo || new Date().toISOString().slice(0, 10));
  };

  const handleSaveChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showToast('Você não possui permissão para registrar ou editar solicitações.', 'error');
      return;
    }

    if (!formRequesterName.trim()) {
      showToast('Informe o nome de quem solicitou a alteração!', 'error');
      return;
    }

    const finalRole = formRequesterRole === 'Outro Cargo / Função' 
      ? (formCustomRole.trim() || 'Servidor(a)')
      : formRequesterRole;

    const finalDept = formRequesterDepartment === 'Outro Órgão / Autarquia'
      ? (formCustomDepartment.trim() || 'Órgão Municipal')
      : formRequesterDepartment;

    if (!formReferenceDoc.trim()) {
      showToast('Informe o documento de referência (ex: Empenho, Processo)!', 'error');
      return;
    }

    if (!formReason.trim()) {
      showToast('Descreva a justificativa da alteração contábil!', 'error');
      return;
    }

    const parsedAmount = parseFloat(formAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const parsedValorOriginal = parseFloat(formValorOriginal.replace(/[^\d.,]/g, '').replace(',', '.')) || parsedAmount;

    // Validação de Temporalidade Conforme Lei 4.320/64 & TCE
    const valCheck = validateSRCDates(formDataFatoGerador, formDataDocumentoOrigem, formFiscalYear);
    if (!valCheck.valid) {
      showToast(valCheck.error || 'Datas inconsistentes.', 'error');
      return;
    }

    const partidaOriginal: PartidaContabil = {
      contaDebitoCodigo: formOrigDebitoCod.trim(),
      contaDebitoNome: formOrigDebitoNome.trim(),
      contaCreditoCodigo: formOrigCreditoCod.trim(),
      contaCreditoNome: formOrigCreditoNome.trim(),
      fonteRecursoCodigo: formOrigFonte.trim(),
      fonteRecursoNome: '',
      elementoDespesaCodigo: formOrigElemento.trim(),
      valor: parsedValorOriginal,
      descricao: formCurrentState.trim()
    };

    const partidaProposta: PartidaContabil = {
      contaDebitoCodigo: formPropDebitoCod.trim(),
      contaDebitoNome: formPropDebitoNome.trim(),
      contaCreditoCodigo: formPropCreditoCod.trim(),
      contaCreditoNome: formPropCreditoNome.trim(),
      fonteRecursoCodigo: formPropFonte.trim(),
      fonteRecursoNome: '',
      elementoDespesaCodigo: formPropElemento.trim(),
      valor: parsedAmount,
      descricao: formProposedState.trim()
    };

    const payload: any = {
      requesterName: formRequesterName.trim(),
      requesterRole: finalRole,
      requesterDepartment: finalDept,
      requesterEmail: formRequesterEmail.trim(),
      requesterPhone: formRequesterPhone.trim(),
      changeDate: formChangeDate,
      dataFatoGerador: formDataFatoGerador,
      dataDocumentoOrigem: formDataDocumentoOrigem,
      dataLancamentoEfetivo: formDataLancamentoEfetivo,
      changeType: formChangeType,
      tipoDocumentoSRC: formTipoDocumentoSRC,
      tipoAjusteSRC: formTipoAjusteSRC,
      referenceDoc: formReferenceDoc.trim(),
      fiscalYear: formFiscalYear,
      monthRef: formatIsoToFriendlyMonth(formMonthRef),
      amount: parsedAmount,
      valorOriginal: parsedValorOriginal,
      reason: formReason.trim(),
      baseLegalMcasp: formBaseLegalMcasp.trim(),
      currentState: formCurrentState.trim(),
      proposedState: formProposedState.trim(),
      partidaOriginal,
      partidaProposta,
      attachmentName: formAttachmentBeforeName || formAttachmentAfterName || '',
      attachmentUrl: formAttachmentBeforeUrl || formAttachmentAfterUrl || '',
      attachmentBeforeName: formAttachmentBeforeName.trim(),
      attachmentBeforeUrl: formAttachmentBeforeUrl,
      attachmentBeforeHash: formAttachmentBeforeHash,
      attachmentAfterName: formAttachmentAfterName.trim(),
      attachmentAfterUrl: formAttachmentAfterUrl,
      attachmentAfterHash: formAttachmentAfterHash
    };

    try {
      if (editingChange) {
        await accountingChangesService.updateChange(editingChange.id, payload);
        showToast('Solicitação de retificação atualizada com sucesso!');
      } else {
        await accountingChangesService.createChange({
          ...payload,
          status: 'pending',
          statusSRC: 'AGUARDANDO_PARECER'
        });
        showToast('Solicitação de retificação contábil autuada com sucesso!');
      }

      setIsNewModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao gravar retificação contábil.', 'error');
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showToast('Você não possui permissão para emitir pareceres contábeis.', 'error');
      return;
    }
    if (!reviewModalChange) return;

    if (!reviewAccountantName.trim()) {
      showToast('Informe o nome do contador ou técnico responsável!', 'error');
      return;
    }

    // Segregação de Funções: Solicitante não pode homologar
    if (reviewStatus === 'approved' || reviewStatus === 'completed') {
      const segCheck = checkSegregationOfDuties(reviewModalChange.requesterName, reviewAccountantName, 'homologacao');
      if (!segCheck.allowed) {
        showToast(segCheck.reason || 'Violação do Princípio da Segregação de Funções!', 'error');
        return;
      }
    }

    try {
      const etapa: any = 
        reviewStatus === 'completed' ? 'EXECUCAO_LANCAMENTO' :
        reviewStatus === 'approved' ? 'HOMOLOGACAO_CONTADOR_GERAL' :
        reviewStatus === 'rejected' ? 'RECUSA' : 'PARECER_CONTABIL';

      const statusSRC: any = 
        reviewStatus === 'completed' ? 'APROVADO_EXECUTADO' :
        reviewStatus === 'approved' ? 'AGUARDANDO_HOMOLOGACAO' :
        reviewStatus === 'rejected' ? 'INDEFERIDO' : 'AGUARDANDO_PARECER';

      await accountingChangesService.tramitarSRC(reviewModalChange.id, etapa, {
        responsavelNome: reviewAccountantName.trim(),
        responsavelCargo: 'Responsável Técnico Contábil',
        responsavelCrc: reviewAccountantCrc.trim(),
        despacho: reviewAccountantNotes.trim(),
        dataEfetivaRazao: reviewDataLancamentoEfetivo,
        status: reviewStatus,
        statusSRC
      });

      showToast('Despacho e tramitação contábil gravados na trilha de auditoria!');
      setReviewModalChange(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar tramitação.', 'error');
    }
  };

  const handlePrintDossier = (item: AccountingChange) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const html = generateSRCDossierHtml(item, {
      municipioNome: 'Prefeitura Municipal',
      estadoNome: 'ESTADO DE MATO GROSSO'
    });
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  const handleDelete = async (item: AccountingChange) => {
    if (!canAdmin) {
      showToast('Apenas administradores podem excluir registros contábeis.', 'error');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir o registro "${item.protocolNumber}" solicitado por ${item.requesterName}?`)) {
      await accountingChangesService.deleteChange(item.id);
      showToast('Registro de alteração removido com sucesso!');
      loadData();
    }
  };

  const handlePrintAudit = () => {
    window.print();
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Função para Impressão do Relatório Completo em Janela Dedicada
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const todayStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const rowsHtml = reportFilteredChanges.map((item, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 7px 8px; font-family: monospace; font-size: 9.5px; color: #1e293b; vertical-align: top;">
          <strong style="color: #0f172a; font-size: 10px;">${item.protocolNumber}</strong><br/>
          <span style="display: inline-block; margin-top: 2px; font-size: 9px; color: #4338ca; font-weight: bold;">
            📅 ${formatFullDate(item.changeDate || item.createdAt)}
          </span>
        </td>
        <td style="padding: 7px 8px; font-size: 10px; color: #0f172a; vertical-align: top;">
          <strong>${item.requesterName}</strong><br/>
          <span style="color: #475569; font-size: 9px; font-weight: 600;">${item.requesterRole}</span><br/>
          <span style="color: #64748b; font-size: 8.5px;">${item.requesterDepartment}</span>
        </td>
        <td style="padding: 7px 8px; font-size: 10px; color: #334155; vertical-align: top;">
          <strong>${ACCOUNTING_CHANGE_TYPES.find(t => t.value === item.changeType)?.label || item.changeType}</strong><br/>
          <span style="font-family: monospace; font-size: 9.5px; color: #4338ca;">Doc: ${item.referenceDoc}</span>
        </td>
        <td style="padding: 7px 8px; font-size: 9.5px; color: #334155; vertical-align: top; text-align: center;">
          <strong>${item.monthRef || '-'}</strong><br/>
          <span style="color: #64748b; font-size: 9px;">Ex: ${item.fiscalYear}</span>
        </td>
        <td style="padding: 7px 8px; font-size: 9px; color: #334155; vertical-align: top; max-width: 220px;">
          ${item.currentState ? `<div style="color: #b45309; margin-bottom: 2px;"><strong>DE:</strong> ${item.currentState}</div>` : ''}
          ${item.proposedState ? `<div style="color: #047857; margin-bottom: 2px;"><strong>PARA:</strong> ${item.proposedState}</div>` : ''}
          <div style="color: #64748b; font-size: 8.5px; margin-top: 3px;"><em>Justif: ${item.reason.slice(0, 90)}${item.reason.length > 90 ? '...' : ''}</em></div>
        </td>
        <td style="padding: 7px 8px; font-family: monospace; font-weight: bold; font-size: 10px; text-align: right; color: #0f172a; vertical-align: top; white-space: nowrap;">
          ${formatCurrency(item.amount)}
        </td>
        <td style="padding: 7px 8px; font-size: 9px; text-align: center; vertical-align: top;">
          <span style="display: inline-block; padding: 2px 5px; border-radius: 4px; font-weight: bold; font-size: 8.5px; text-transform: uppercase; background: ${
            item.status === 'approved' || item.status === 'completed' ? '#dcfce7; color: #15803d; border: 1px solid #86efac;' :
            item.status === 'in_review' ? '#e0f2fe; color: #0369a1; border: 1px solid #7dd3fc;' :
            item.status === 'rejected' ? '#fee2e2; color: #b91c1c; border: 1px solid #fca5a5;' :
            '#fef3c7; color: #b45309; border: 1px solid #fde68a;'
          }">
            ${ACCOUNTING_STATUS_CONFIG[item.status].label}
          </span>
          ${item.accountantName ? `<div style="font-size: 8px; color: #64748b; margin-top: 2px;">${item.accountantName}</div>` : ''}
        </td>
        <td style="padding: 7px 8px; font-size: 8.5px; text-align: center; color: #475569; vertical-align: top; white-space: nowrap;">
          ${(item.attachmentBeforeName || item.attachmentBeforeUrl) ? '<span style="color:#b45309; font-weight:bold;">[Antes]</span>' : '-'}
          ${(item.attachmentAfterName || item.attachmentAfterUrl) ? '<br/><span style="color:#047857; font-weight:bold;">[Depois]</span>' : ''}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Geral de Alterações Contábeis - ${todayStr}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; font-size: 10px; line-height: 1.3; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 10px; }
          .header .republic { font-size: 9px; letter-spacing: 1.5px; font-weight: bold; margin-bottom: 2px; color: #475569; }
          .header h1 { margin: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
          .header h2 { margin: 2px 0; font-size: 12px; font-weight: 600; color: #334155; }
          .header .doc-title { margin: 4px 0 2px 0; font-size: 13px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px; }
          .header p { margin: 1px 0; font-size: 9px; color: #64748b; }
          .kpi-bar { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 6px; margin-bottom: 10px; font-size: 9.5px; }
          .kpi-item { display: flex; gap: 4px; }
          .kpi-item strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          th { background-color: #0f172a; color: #ffffff; text-align: left; padding: 6px 8px; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 35px; page-break-inside: avoid; }
          .sig-box { width: 30%; text-align: center; border-top: 1px solid #475569; padding-top: 5px; font-size: 9.5px; }
          .sig-box strong { display: block; font-size: 10.5px; color: #0f172a; }
          .sig-box span { color: #64748b; font-size: 8.5px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="republic">REPÚBLICA FEDERATIVA DO BRASIL • ESTADO DE MATO GROSSO</div>
          <h1>Prefeitura Municipal • Secretaria Municipal de Finanças</h1>
          <h2>Setor Contábil & Unidade de Controle Interno</h2>
          <div class="doc-title">Relatório Geral de Controle e Trilha de Auditoria de Alterações Contábeis</div>
          <p>Emitido em: ${todayStr} • Em conformidade com a LRF (LC 101/2000), Lei 4.320/64 e Instruções Normativas do TCE</p>
        </div>

        <div class="kpi-bar">
          <div class="kpi-item"><span>Total de Registros:</span> <strong>${reportTotalCount}</strong></div>
          <div class="kpi-item"><span>Aprovadas / Concluídas:</span> <strong>${reportApprovedCount}</strong></div>
          <div class="kpi-item"><span>Pendentes de Parecer:</span> <strong>${reportPendingCount}</strong></div>
          <div class="kpi-item"><span>Volume Financeiro Total:</span> <strong>${formatCurrency(reportTotalAmount)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 12%;">Protocolo & Data (Dia/Mês/Ano)</th>
              <th style="width: 17%;">Quem Solicitou</th>
              <th style="width: 14%;">Tipo / Documento</th>
              <th style="width: 10%; text-align: center;">Competência</th>
              <th style="width: 21%;">De / Para / Justificativa</th>
              <th style="width: 11%; text-align: right;">Valor</th>
              <th style="width: 9%; text-align: center;">Status</th>
              <th style="width: 6%; text-align: center;">Anexos</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum registro encontrado para os filtros selecionados.</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <strong>Contador(a) Geral do Município</strong>
            <span>Responsável Técnico Contábil • CRC</span>
          </div>
          <div class="sig-box">
            <strong>Controlador(a) Geral do Município</strong>
            <span>Unidade Central de Controle Interno</span>
          </div>
          <div class="sig-box">
            <strong>Secretário(a) Municipal de Finanças</strong>
            <span>Ordenador de Despesas / Fazenda</span>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  if (!canView) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 border border-neutral-100 dark:border-neutral-800 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <Scale size={32} />
        </div>
        <h3 className="text-xl font-black text-neutral-900 dark:text-white">Acesso Restrito</h3>
        <p className="text-sm text-neutral-500 max-w-md mx-auto">
          Você não possui permissão para visualizar o módulo de Alterações na Contabilidade. Solicite autorização a um Administrador nas Configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Seletor de Modo: Livro da Contadora vs Processos SRC TCE */}
      <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setAccountingMode('livro')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              accountingMode === 'livro'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <BookOpen size={16} />
            <span>Livro da Contadora (WhatsApp & Resguardo)</span>
          </button>

          <button
            type="button"
            onClick={() => setAccountingMode('src')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              accountingMode === 'src'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Scale size={16} />
            <span>Processos SRC (Tribunal de Contas / PCASP)</span>
          </button>
        </div>

        <span className="text-[11px] font-bold text-neutral-400 px-3 hidden md:inline">
          {accountingMode === 'livro' 
            ? 'Uso diário e ágil da Contadora para resguardo de pedidos' 
            : 'Auditoria formal com partidas dobradas e dossiê do TCE'}
        </span>
      </div>

      {accountingMode === 'livro' ? (
        <LivroAlteracoesContabeis searchQuery={searchQuery} />
      ) : (
        <>
          {/* Toast Notificação */}
      {toastMessage && (
        <div className={`fixed top-8 right-8 z-[200] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold text-white transition-all animate-in slide-in-from-top-4 ${
          toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          <CheckCircle2 size={18} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-neutral-900 via-indigo-950 to-neutral-900 text-white p-7 md:p-9 rounded-[32px] border border-neutral-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl backdrop-blur-md border border-indigo-500/30">
              <Scale size={24} />
            </span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/10 text-indigo-300 backdrop-blur-md border border-white/10">
              <Sparkles size={12} />
              Controle & Trilha de Auditoria Contábil
            </div>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-white mt-1">
            Alterações na Contabilidade
          </h2>
          <p className="text-neutral-300 text-xs md:text-sm leading-relaxed">
            Controle rigoroso de <strong>quem solicitou</strong> retificações de empenho, remanejamentos orçamentários e ajustes contábeis, com anexos <strong>Antes / Depois</strong> da alteração e despacho formal do contador.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3 w-full md:w-auto">
          {/* Botão de Imprimir Relatório de Auditoria com Filtros */}
          <button 
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex-1 md:flex-none bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider backdrop-blur-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/20"
            title="Abrir e imprimir relatório geral com filtros"
          >
            <Printer size={18} />
            <span>Imprimir Relatório</span>
          </button>

          {canEdit && (
            <button 
              type="button"
              onClick={openNewModal}
              className="flex-1 md:flex-none bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={18} />
              <span>Nova Solicitação</span>
            </button>
          )}
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Total de Alterações</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white">{totalCount}</h3>
            <span className="p-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl">
              <FileSpreadsheet size={18} />
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/40 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Aguardando Análise</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</h3>
            <span className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Clock size={18} />
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-sky-100 dark:border-sky-900/40 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">Em Análise Técnica</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-black text-sky-600 dark:text-sky-400">{inReviewCount}</h3>
            <span className="p-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-2xl">
              <FileCheck size={18} />
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Aprovadas / Efetivadas</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{approvedCount}</h3>
            <span className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <CheckCircle2 size={18} />
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Volume Financeiro</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-xl font-black text-indigo-700 dark:text-indigo-300 truncate" title={formatCurrency(totalAmount)}>
              {formatCurrency(totalAmount)}
            </h3>
            <span className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <DollarSign size={18} />
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome do solicitante, protocolo, processo, justificativa ou secretaria..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Filtro por Cargo */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Cargos</option>
              {REQUESTER_ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Filtro por Secretaria */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Secretarias</option>
              {MUNICIPAL_DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Filtro por Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Tipos de Alteração</option>
              {ACCOUNTING_CHANGE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Filtro por Data Específica (Dia, Mês e Ano) */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl" title="Filtrar por data específica da alteração (dia, mês e ano)">
              <Calendar size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-neutral-400 hover:text-rose-500 cursor-pointer ml-1"
                  title="Limpar filtro de data"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Botão Sincronizar Dados Reais */}
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 transition-colors cursor-pointer"
              title="Sincronizar dados reais com o banco de dados"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
            </button>
          </div>
        </div>

        {/* Abas Rápidas de Status */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          {[
            { id: 'all', label: 'Todas as Solicitações', count: totalCount },
            { id: 'pending', label: 'Pendentes de Análise', count: pendingCount },
            { id: 'in_review', label: 'Em Análise Contábil', count: inReviewCount },
            { id: 'approved', label: 'Aprovadas', count: changes.filter(c => c.status === 'approved').length },
            { id: 'completed', label: 'Efetivadas nos Sistemas', count: changes.filter(c => c.status === 'completed').length },
            { id: 'rejected', label: 'Indeferidas', count: changes.filter(c => c.status === 'rejected').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Solicitações */}
      <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        {filteredChanges.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 dark:text-neutral-400 flex flex-col items-center">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-3xl flex items-center justify-center mb-4">
              <Scale size={36} />
            </div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100">
              Nenhuma alteração contábil encontrada
            </h3>
            <p className="text-sm mt-1 max-w-md">
              {localSearch || statusFilter !== 'all' || typeFilter !== 'all' || departmentFilter !== 'all' || roleFilter !== 'all'
                ? 'Ajuste os filtros de busca para visualizar os registros cadastrados.'
                : 'Todas as alterações de contabilidade ficam registradas aqui com o nome de quem solicitou, anexos Antes/Depois e parecer do contador.'}
            </p>
            {canEdit && (
              <div className="mt-6">
                <button
                  onClick={openNewModal}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
                >
                  + Registrar Solicitação
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/60">
                  <th className="px-6 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Protocolo & Data (Dia/Mês/Ano)</th>
                  <th className="px-6 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Quem Solicitou</th>
                  <th className="px-6 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Tipo & Documento</th>
                  <th className="px-6 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Valor (R$)</th>
                  <th className="px-6 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Documentos Anexos</th>
                  <th className="px-6 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Status / Parecer</th>
                  <th className="px-6 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {filteredChanges.map(item => {
                  const statusConf = ACCOUNTING_STATUS_CONFIG[item.status] || ACCOUNTING_STATUS_CONFIG.pending;
                  const typeObj = ACCOUNTING_CHANGE_TYPES.find(t => t.value === item.changeType);

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors group">
                      {/* Protocolo & Data Específica (Dia, Mês e Ano) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                              {item.protocolNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyProtocol(item.protocolNumber)}
                              className="text-neutral-400 hover:text-indigo-600 transition-colors p-1 cursor-pointer"
                              title="Copiar Protocolo"
                            >
                              {copiedProtocol === item.protocolNumber ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                          </div>
                          
                          {/* Data Específica da Alteração: Dia, Mês e Ano */}
                          <div className="mt-1 flex items-center gap-1 text-xs font-black text-neutral-900 dark:text-white">
                            <Calendar size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>{formatFullDate(item.changeDate || item.createdAt)}</span>
                          </div>

                          <span className="text-[10px] text-neutral-400 font-medium mt-0.5">
                            Exercício {item.fiscalYear} • {item.monthRef || formatIsoToFriendlyMonth(item.changeDate?.slice(0, 7))}
                          </span>
                        </div>
                      </td>

                      {/* Quem Solicitou */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                              {getRoleIcon(item.requesterRole)}
                            </span>
                            <span className="font-black text-sm text-neutral-900 dark:text-white">
                              {item.requesterName}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold mt-0.5 pl-6">
                            {item.requesterRole}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 pl-6">
                            <Building2 size={11} className="shrink-0" />
                            {item.requesterDepartment}
                          </span>
                        </div>
                      </td>

                      {/* Tipo da Alteração & Doc */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {item.tipoDocumentoSRC || 'EMPENHO'}
                            </span>
                            {item.tipoAjusteSRC && (
                              <span className="text-[9px] font-bold uppercase text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                {item.tipoAjusteSRC.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                            {typeObj?.label || item.changeType}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500 mt-0.5">
                            Doc: <strong className="text-neutral-800 dark:text-neutral-200">{item.referenceDoc}</strong>
                          </span>
                          <span className="text-[10px] text-neutral-400 mt-0.5">
                            Fato Gerador: <strong className="text-neutral-600 dark:text-neutral-300 font-mono">{formatFullDate(item.dataFatoGerador || item.changeDate || item.createdAt)}</strong>
                          </span>
                          <p className="text-[11px] text-neutral-400 line-clamp-1 mt-1 italic" title={item.reason}>
                            "{item.reason}"
                          </p>
                        </div>
                      </td>

                      {/* Valor (R$) */}
                      <td className="px-6 py-4">
                        <span className="font-mono font-black text-xs text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800/80 px-2.5 py-1 rounded-xl">
                          {formatCurrency(item.amount)}
                        </span>
                      </td>

                      {/* Documentos Anexos (Antes e Depois) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {item.attachmentBeforeName ? (
                            <a
                              href={item.attachmentBeforeUrl || '#'}
                              download={item.attachmentBeforeName}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10px] font-black hover:scale-105 transition-transform w-max cursor-pointer"
                              title={`Baixar documento anterior: ${item.attachmentBeforeName}${item.attachmentBeforeHash ? ` (SHA-256: ${item.attachmentBeforeHash})` : ''}`}
                            >
                              <Paperclip size={11} />
                              <span className="truncate max-w-[110px]">Antes: {item.attachmentBeforeName}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">Sem doc anterior</span>
                          )}

                          {item.attachmentAfterName ? (
                            <a
                              href={item.attachmentAfterUrl || '#'}
                              download={item.attachmentAfterName}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black hover:scale-105 transition-transform w-max cursor-pointer"
                              title={`Baixar documento retificado: ${item.attachmentAfterName}${item.attachmentAfterHash ? ` (SHA-256: ${item.attachmentAfterHash})` : ''}`}
                            >
                              <Paperclip size={11} />
                              <span className="truncate max-w-[110px]">Depois: {item.attachmentAfterName}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">Sem doc retificado</span>
                          )}
                        </div>
                      </td>

                      {/* Status / Parecer */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-max border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}>
                            {item.status === 'completed' || item.status === 'approved' ? (
                              <CheckCircle2 size={12} />
                            ) : item.status === 'rejected' ? (
                              <AlertCircle size={12} />
                            ) : (
                              <Clock size={12} />
                            )}
                            {statusConf.label}
                          </span>
                          {item.accountantName && (
                            <span className="text-[10px] text-neutral-400 truncate max-w-[150px] font-medium" title={`Analisado por: ${item.accountantName}`}>
                              Resp: {item.accountantName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handlePrintDossier(item)}
                            className="p-2 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Gerar Dossiê Oficial de Auditoria TCE (PDF)"
                          >
                            <FileText size={16} />
                          </button>

                          <button
                            onClick={() => setViewingChange(item)}
                            className="p-2 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Visualizar ficha completa e auditoria"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {canEdit && (
                            <button
                              onClick={() => openReviewModal(item)}
                              className="p-2 text-neutral-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors cursor-pointer"
                              title="Emitir Parecer / Despacho Contábil"
                            >
                              <ShieldCheck size={16} />
                            </button>
                          )}

                          {canEdit && (
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
                              title="Editar solicitação"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}

                          {canAdmin && (
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                              title="Excluir solicitação"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Nova Solicitação ou Edição */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-6">
          {/* Backdrop Fixo: NÃO fecha ao clicar fora, para evitar perda acidental dos dados */}
          <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" />
          
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-10 w-full max-w-5xl xl:max-w-6xl relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-200 max-h-[94vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
                  <ShieldCheck size={13} />
                  Controle & Auditoria Contábil
                </div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Scale size={24} className="text-indigo-600" />
                  {editingChange ? 'Editar Solicitação de Alteração Contábil' : 'Nova Solicitação de Alteração Contábil'}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                  Identifique quem solicitou a alteração (Secretário, Contador, <strong>Assessor Contábil</strong>, etc.), anexe os documentos comprobatórios <strong>Antes e Depois</strong> e informe a justificativa detalhada.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-2xl cursor-pointer hover:scale-105 transition-all"
                title="Fechar formulário"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveChange} className="space-y-6">
              {/* SEÇÃO 1: Identificação de Quem Solicitou */}
              <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-100/70 dark:border-indigo-900/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                    <User size={16} /> 1. Identificação de Quem Solicitou a Alteração
                  </h4>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    Obrigatório para trilha de responsabilidade
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">Nome do Solicitante *</label>
                    <input 
                      type="text" 
                      required
                      value={formRequesterName}
                      onChange={(e) => setFormRequesterName(e.target.value)}
                      placeholder="Ex: Carlos Andrade da Silva"
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  {/* Cargo do Solicitante (Inclui Assessor(a) Contábil) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Briefcase size={13} className="text-indigo-500" /> Cargo / Função do Solicitante *
                    </label>
                    <select
                      value={formRequesterRole}
                      onChange={(e) => setFormRequesterRole(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                    >
                      {REQUESTER_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>

                    {formRequesterRole === 'Outro Cargo / Função' && (
                      <input 
                        type="text" 
                        required
                        value={formCustomRole}
                        onChange={(e) => setFormCustomRole(e.target.value)}
                        placeholder="Especifique o cargo / função..."
                        className="w-full mt-2 px-4 py-2.5 bg-white dark:bg-neutral-950 border border-indigo-300 dark:border-indigo-700 rounded-2xl text-xs font-semibold focus:outline-none"
                      />
                    )}
                  </div>

                  {/* Secretaria / Órgão Solicitante */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Building2 size={13} className="text-indigo-500" /> Secretaria / Órgão Solicitante *
                    </label>
                    <select
                      value={formRequesterDepartment}
                      onChange={(e) => setFormRequesterDepartment(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                    >
                      {MUNICIPAL_DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    {formRequesterDepartment === 'Outro Órgão / Autarquia' && (
                      <input 
                        type="text" 
                        required
                        value={formCustomDepartment}
                        onChange={(e) => setFormCustomDepartment(e.target.value)}
                        placeholder="Especifique o órgão / autarquia..."
                        className="w-full mt-2 px-4 py-2.5 bg-white dark:bg-neutral-950 border border-indigo-300 dark:border-indigo-700 rounded-2xl text-xs font-semibold focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Mail size={13} className="text-neutral-400" /> E-mail para Contato
                    </label>
                    <input 
                      type="email" 
                      value={formRequesterEmail}
                      onChange={(e) => setFormRequesterEmail(e.target.value)}
                      placeholder="solicitante@municipio.gov.br"
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Phone size={13} className="text-neutral-400" /> Telefone / WhatsApp
                    </label>
                    <input 
                      type="text" 
                      value={formRequesterPhone}
                      onChange={(e) => setFormRequesterPhone(e.target.value)}
                      placeholder="(66) 99999-0000"
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: Dados da Retificação Contábil (SRC - MCASP / Lei 4.320/64) */}
              <div className="bg-neutral-50/70 dark:bg-neutral-950/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/60 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      <FileSignature size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-widest">
                        2. Dados da Retificação Contábil (SRC)
                      </h4>
                      <p className="text-[10px] text-neutral-500">
                        Classificação orçamentária e patrimonial conforme MCASP e Lei Federal nº 4.320/1964
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Módulo Auditável TCE-MT / MPC
                  </span>
                </div>

                {/* Linha 1: Tipo de Documento, Tipo de Ajuste e Número */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <FileText size={13} className="text-indigo-600" />
                      Tipo de Documento *
                    </label>
                    <select
                      value={formTipoDocumentoSRC}
                      onChange={(e) => {
                        const val = e.target.value as TipoDocumentoContabil;
                        setFormTipoDocumentoSRC(val);
                        // Sincronizar com o tipo legado
                        if (val === 'EMPENHO') setFormChangeType('retificacao_empenho');
                        else if (val === 'LIQUIDACAO') setFormChangeType('estorno_liquidacao');
                        else if (val === 'PAGAMENTO') setFormChangeType('estorno_pagamento');
                        else if (val === 'RESTOS_A_PAGAR') setFormChangeType('cancelamento_restos_a_pagar');
                        else setFormChangeType('reclassificacao_contabil');
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                    >
                      {TIPOS_DOCUMENTOS_CONTABEIS.map(t => (
                        <option key={t.value} value={t.value}>{t.sigla} - {t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <GitBranch size={13} className="text-indigo-600" />
                      Tipo de Ajuste Contábil *
                    </label>
                    <select
                      value={formTipoAjusteSRC}
                      onChange={(e) => setFormTipoAjusteSRC(e.target.value as TipoAjusteContabil)}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                    >
                      {TIPOS_AJUSTES_CONTABEIS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">
                      Nº Documento de Origem *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={formReferenceDoc}
                      onChange={(e) => setFormReferenceDoc(e.target.value)}
                      placeholder="Ex: Empenho nº 1245/2026..."
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>

                {/* Linha 2: RIGOR TEMPORAL - As 3 Datas Exatas Obrigatórias */}
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-600" />
                      Rigor Temporal Obrigatório (Tribunal de Contas)
                    </span>
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold">
                      Exigência de Auditoria Externa
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                        1. Data do Fato Gerador Original *
                      </label>
                      <input 
                        type="date" 
                        required
                        value={formDataFatoGerador}
                        onChange={(e) => setFormDataFatoGerador(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                      />
                      <span className="text-[10px] text-neutral-500 block">
                        Fato administrativo ({formatFullDate(formDataFatoGerador)})
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                        2. Data do Documento de Origem *
                      </label>
                      <input 
                        type="date" 
                        required
                        value={formDataDocumentoOrigem}
                        onChange={(e) => setFormDataDocumentoOrigem(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                      />
                      <span className="text-[10px] text-neutral-500 block">
                        Emissão do empenho/nota ({formatFullDate(formDataDocumentoOrigem)})
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase">
                        3. Data Efetiva de Lançamento (Razão) *
                      </label>
                      <input 
                        type="date" 
                        required
                        value={formDataLancamentoEfetivo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormDataLancamentoEfetivo(val);
                          setFormChangeDate(val);
                          if (val) {
                            const [y, m] = val.split('-');
                            const yNum = parseInt(y, 10);
                            const mIdx = parseInt(m, 10) - 1;
                            if (yNum) setFormFiscalYear(yNum);
                            if (mIdx >= 0 && mIdx < 12) setFormMonthRef(`${MONTH_NAMES[mIdx]} / ${y}`);
                          }
                        }}
                        className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-black text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                      />
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">
                        Ingresso no balancete ({formatFullDate(formDataLancamentoEfetivo)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha 3: Exercício, Base Legal MCASP e Valores */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">
                      Exercício Financeiro
                    </label>
                    <input 
                      type="number" 
                      value={formFiscalYear}
                      onChange={(e) => setFormFiscalYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 font-mono shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">
                      Valor Original (R$)
                    </label>
                    <input 
                      type="text" 
                      value={formValorOriginal}
                      onChange={(e) => setFormValorOriginal(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 font-mono shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">
                      Valor do Ajuste (R$) *
                    </label>
                    <input 
                      type="text" 
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 font-mono shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">
                      Base Legal MCASP / Lei *
                    </label>
                    <select
                      value={formBaseLegalMcasp}
                      onChange={(e) => setFormBaseLegalMcasp(e.target.value)}
                      className="w-full px-3 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-[11px] font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm truncate"
                    >
                      {BASES_LEGAIS_MCASP.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Linha 4: Partidas Contábeis (PCASP) - Primitiva vs Proposta */}
                <div className="p-4 bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={15} className="text-indigo-600" />
                      Partidas Dobradas no PCASP (Lançamento Primitivo vs Retificador Proposto)
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Contas Contábeis de Débito e Crédito
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Partida Primitiva (Como Está - DE) */}
                    <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-800/50 space-y-2.5">
                      <div className="flex items-center justify-between text-amber-800 dark:text-amber-400 font-black text-xs uppercase">
                        <span className="flex items-center gap-1">
                          <AlertCircle size={13} /> Partida Primitiva (DE - Como Está)
                        </span>
                        <span className="text-[10px]">Lançamento a Ajustar</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Conta Débito (PCASP)</label>
                          <input 
                            type="text" 
                            value={formOrigDebitoCod}
                            onChange={(e) => setFormOrigDebitoCod(e.target.value)}
                            placeholder="3.3.9.0.30.00"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Título Conta Débito</label>
                          <input 
                            type="text" 
                            value={formOrigDebitoNome}
                            onChange={(e) => setFormOrigDebitoNome(e.target.value)}
                            placeholder="Material de Consumo"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Conta Crédito (PCASP)</label>
                          <input 
                            type="text" 
                            value={formOrigCreditoCod}
                            onChange={(e) => setFormOrigCreditoCod(e.target.value)}
                            placeholder="1.1.1.1.1.00"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Título Conta Crédito</label>
                          <input 
                            type="text" 
                            value={formOrigCreditoNome}
                            onChange={(e) => setFormOrigCreditoNome(e.target.value)}
                            placeholder="Caixa / Bancos"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Fonte de Recursos</label>
                          <input 
                            type="text" 
                            value={formOrigFonte}
                            onChange={(e) => setFormOrigFonte(e.target.value)}
                            placeholder="1.500.0000"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Elemento de Despesa</label>
                          <input 
                            type="text" 
                            value={formOrigElemento}
                            onChange={(e) => setFormOrigElemento(e.target.value)}
                            placeholder="3.3.90.30"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[11px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Partida Proposta (Como Fica - PARA) */}
                    <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-2.5">
                      <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-400 font-black text-xs uppercase">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={13} /> Partida Retificadora (PARA - Como Fica)
                        </span>
                        <span className="text-[10px]">Lançamento Corretivo</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Nova Conta Débito</label>
                          <input 
                            type="text" 
                            value={formPropDebitoCod}
                            onChange={(e) => setFormPropDebitoCod(e.target.value)}
                            placeholder="3.3.9.0.39.00"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Título Nova Conta</label>
                          <input 
                            type="text" 
                            value={formPropDebitoNome}
                            onChange={(e) => setFormPropDebitoNome(e.target.value)}
                            placeholder="Serviços Terceiros PJ"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Nova Conta Crédito</label>
                          <input 
                            type="text" 
                            value={formPropCreditoCod}
                            onChange={(e) => setFormPropCreditoCod(e.target.value)}
                            placeholder="1.1.1.1.1.00"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Título Nova Conta</label>
                          <input 
                            type="text" 
                            value={formPropCreditoNome}
                            onChange={(e) => setFormPropCreditoNome(e.target.value)}
                            placeholder="Caixa / Bancos"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Nova Fonte</label>
                          <input 
                            type="text" 
                            value={formPropFonte}
                            onChange={(e) => setFormPropFonte(e.target.value)}
                            placeholder="1.500.0000"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Novo Elemento</label>
                          <input 
                            type="text" 
                            value={formPropElemento}
                            onChange={(e) => setFormPropElemento(e.target.value)}
                            placeholder="3.3.90.39"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Justificativa Circunstanciada */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">
                    Justificativa Circunstanciada do Fato Contábil *
                  </label>
                  <textarea 
                    rows={3}
                    required
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="Explique detalhadamente a motivação e a base legal desta retificação para fins de prestação de contas ao Tribunal de Contas..."
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>

                {/* Live Preview do Histórico Padrão para o Razão/Diário */}
                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-black text-emerald-400 flex items-center gap-1.5">
                      <FileText size={13} />
                      HISTÓRICO PADRÃO PARA O DIÁRIO / RAZÃO DA PREFEITURA
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Sintaxe Normativa TCE-MT
                    </span>
                  </div>
                  <p className="font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    {generateHistoricoRazao(
                      formTipoDocumentoSRC,
                      formReferenceDoc || 'N/I',
                      formFiscalYear,
                      editingChange?.protocolNumber || 'SRC-2026-XXXXX',
                      formDataLancamentoEfetivo,
                      formReason || 'Ajuste conforme processo de retificação contábil.'
                    )}
                  </p>
                </div>
              </div>

              {/* SEÇÃO 3: Anexos de Auditoria (Documento Antes e Depois) */}
              <div className="bg-purple-50/30 dark:bg-purple-950/20 p-6 rounded-3xl border border-purple-100/70 dark:border-purple-900/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest flex items-center gap-2">
                    <Paperclip size={16} /> 3. Documentos Anexos: Antes e Depois da Alteração
                  </h4>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                    Auditoria TCE / Comprovação Documental
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ANEXO 1: Documento ANTES */}
                  <div className="p-5 bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileDiff size={15} /> Documento Original (Antes)
                      </span>
                      {formAttachmentBeforeName && (
                        <button
                          type="button"
                          onClick={() => removeAttachment('before')}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <input 
                      type="file" 
                      ref={fileBeforeInputRef}
                      onChange={(e) => handleFileUpload(e, 'before')}
                      className="hidden" 
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    />

                    {formAttachmentBeforeName ? (
                      <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip size={14} className="text-amber-600 shrink-0" />
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                            {formAttachmentBeforeName}
                          </span>
                        </div>
                        <a
                          href={formAttachmentBeforeUrl}
                          download={formAttachmentBeforeName}
                          className="p-1.5 bg-white dark:bg-neutral-900 rounded-lg text-amber-600 hover:text-amber-700 shrink-0"
                          title="Baixar arquivo"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileBeforeInputRef.current?.click()}
                        className="w-full py-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-xl text-neutral-500 hover:text-amber-600 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer bg-neutral-50/50 dark:bg-neutral-900/50"
                      >
                        <Upload size={18} />
                        <span className="text-xs font-bold">Anexar Documento Antes</span>
                        <span className="text-[10px] text-neutral-400">PDF, imagem ou documento original</span>
                      </button>
                    )}
                  </div>

                  {/* ANEXO 2: Documento DEPOIS */}
                  <div className="p-5 bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck size={15} /> Documento Retificado (Depois)
                      </span>
                      {formAttachmentAfterName && (
                        <button
                          type="button"
                          onClick={() => removeAttachment('after')}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <input 
                      type="file" 
                      ref={fileAfterInputRef}
                      onChange={(e) => handleFileUpload(e, 'after')}
                      className="hidden" 
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    />

                    {formAttachmentAfterName ? (
                      <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                            {formAttachmentAfterName}
                          </span>
                        </div>
                        <a
                          href={formAttachmentAfterUrl}
                          download={formAttachmentAfterName}
                          className="p-1.5 bg-white dark:bg-neutral-900 rounded-lg text-emerald-600 hover:text-emerald-700 shrink-0"
                          title="Baixar arquivo"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileAfterInputRef.current?.click()}
                        className="w-full py-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-xl text-neutral-500 hover:text-emerald-600 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer bg-neutral-50/50 dark:bg-neutral-900/50"
                      >
                        <Upload size={18} />
                        <span className="text-xs font-bold">Anexar Documento Depois</span>
                        <span className="text-[10px] text-neutral-400">PDF, espelho ou nota retificada</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-6 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/25 cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <CheckCircle2 size={16} />
                  <span>{editingChange ? 'Salvar Alterações' : 'Gravar Solicitação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Parecer e Despacho do Contador */}
      {reviewModalChange && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" />
          
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 w-full max-w-xl relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck size={22} className="text-purple-600" />
                  Parecer do Setor Contábil
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Protocolo: <strong className="font-mono text-indigo-600">{reviewModalChange.protocolNumber}</strong> • Solicitante: <strong>{reviewModalChange.requesterName} ({reviewModalChange.requesterRole})</strong>
                </p>
              </div>
              <button onClick={() => setReviewModalChange(null)} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Alerta de Segregação de Funções */}
            {currentUser?.name && reviewModalChange.requesterName.trim().toLowerCase() === currentUser.name.trim().toLowerCase() && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200">
                <ShieldAlert size={18} className="shrink-0 text-rose-600 mt-0.5" />
                <div className="text-xs">
                  <strong className="block font-black uppercase text-[10px] tracking-wider">Atenção: Segregação de Funções (NBC TSP / MCASP)</strong>
                  Você é o servidor solicitante desta SRC. Conforme as normas de auditoria e controle interno, o solicitante está vedado de homologar ou deferir o próprio pedido.
                </div>
              </div>
            )}

            <form onSubmit={handleSaveReview} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-wider pl-1">
                    Decisão / Status Contábil *
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="in_review">Em Análise Técnica (AGUARDANDO_PARECER)</option>
                    <option value="approved">Homologado pelo Contador-Geral (AGUARDANDO_HOMOLOGACAO)</option>
                    <option value="completed">Efetivado e Lançado no Razão (APROVADO_EXECUTADO)</option>
                    <option value="rejected">Indeferido / Recusado (INDEFERIDO)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-purple-600" />
                    Data Contábil Efetiva no Razão *
                  </label>
                  <input 
                    type="date" 
                    required
                    value={reviewDataLancamentoEfetivo}
                    onChange={(e) => setReviewDataLancamentoEfetivo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-wider pl-1">
                    Contador(a) / Técnico Responsável *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={reviewAccountantName}
                    onChange={(e) => setReviewAccountantName(e.target.value)}
                    placeholder="Ex: Maria Clara Souza"
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-wider pl-1">
                    Registro CRC
                  </label>
                  <input 
                    type="text" 
                    value={reviewAccountantCrc}
                    onChange={(e) => setReviewAccountantCrc(e.target.value)}
                    placeholder="Ex: CRC/MT 012345/O"
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-wider pl-1">
                  Parecer Técnico / Despacho da Contabilidade *
                </label>
                <textarea 
                  rows={4}
                  required
                  value={reviewAccountantNotes}
                  onChange={(e) => setReviewAccountantNotes(e.target.value)}
                  placeholder="Registre as observações técnicas, embasamento na Lei 4.320/64, MCASP ou motivação expressa para deferimento/indeferimento..."
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setReviewModalChange(null)}
                  className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  <span>Gravar Parecer e Tramitar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualizar Ficha Completa / Dossiê de Auditoria da Retificação Contábil */}
      {viewingChange && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-6">
          <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm" />
          
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 w-full max-w-5xl relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-200 max-h-[94vh] overflow-y-auto flex flex-col">
            {/* Header da Ficha */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-100 dark:border-neutral-800 pb-5 mb-5 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-xl">
                    {viewingChange.protocolNumber}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {viewingChange.tipoDocumentoSRC || 'EMPENHO'} • {viewingChange.tipoAjusteSRC || 'ESTORNO_PARCIAL'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${ACCOUNTING_STATUS_CONFIG[viewingChange.status].bg} ${ACCOUNTING_STATUS_CONFIG[viewingChange.status].text} ${ACCOUNTING_STATUS_CONFIG[viewingChange.status].border}`}>
                    {ACCOUNTING_STATUS_CONFIG[viewingChange.status].label}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white mt-2">
                  Dossiê de Retificação Contábil (SRC)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Autuado em {formatDate(viewingChange.createdAt)} • Exercício {viewingChange.fiscalYear} • Ref: <strong>{viewingChange.referenceDoc}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => handlePrintDossier(viewingChange)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105"
                  title="Imprimir Dossiê Completo para Tribunal de Contas (PDF)"
                >
                  <FileText size={15} />
                  <span>Dossiê Oficial (PDF / TCE)</span>
                </button>
                <button
                  onClick={handlePrintAudit}
                  className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                  title="Imprimir visualização de tela"
                >
                  <Printer size={18} />
                </button>
                <button 
                  onClick={() => setViewingChange(null)} 
                  className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Abas de Navegação do Dossiê */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-6 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setViewingTab('identificacao')}
                className={`pb-3 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
                  viewingTab === 'identificacao'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <FileSignature size={15} />
                <span>1. Identificação & Prazos</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingTab('partidas')}
                className={`pb-3 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
                  viewingTab === 'partidas'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <Layers size={15} />
                <span>2. Partidas Dobradas (PCASP)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingTab('timeline')}
                className={`pb-3 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
                  viewingTab === 'timeline'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <Clock size={15} />
                <span>3. Trilha de Auditoria (Timeline)</span>
                {viewingChange.trilhaAuditoria && viewingChange.trilhaAuditoria.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                    {viewingChange.trilhaAuditoria.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewingTab('historico')}
                className={`pb-3 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
                  viewingTab === 'historico'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <ShieldCheck size={15} />
                <span>4. Razão & Base Legal MCASP</span>
              </button>
            </div>

            {/* Conteúdo da Aba 1: IDENTIFICAÇÃO & RIGOR TEMPORAL */}
            {viewingTab === 'identificacao' && (
              <div className="space-y-6 text-xs animate-in fade-in-50 duration-150">
                {/* Quadro de Datas Exatas do Processo (Rigor Temporal Lei 4.320/64) */}
                <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/40 dark:to-blue-950/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-600" />
                      Rigor Temporal: Datas Exatas Obrigatórias para Auditoria
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      Conforme MCASP & Resoluções TCE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-neutral-400 block text-[10px] font-black uppercase">1. Fato Gerador Original:</span>
                      <strong className="text-sm text-neutral-800 dark:text-neutral-100 block mt-0.5">
                        {formatFullDate(viewingChange.dataFatoGerador || viewingChange.changeDate || viewingChange.createdAt)}
                      </strong>
                      <span className="text-[10px] text-neutral-400">Ocorrência econômica</span>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-neutral-400 block text-[10px] font-black uppercase">2. Documento de Origem:</span>
                      <strong className="text-sm text-neutral-800 dark:text-neutral-100 block mt-0.5">
                        {formatFullDate(viewingChange.dataDocumentoOrigem || viewingChange.changeDate || viewingChange.createdAt)}
                      </strong>
                      <span className="text-[10px] text-neutral-400">Emissão da NE/NL/OP</span>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-neutral-400 block text-[10px] font-black uppercase">3. Abertura do Pedido:</span>
                      <strong className="text-sm text-neutral-800 dark:text-neutral-100 block mt-0.5">
                        {formatDate(viewingChange.createdAt)}
                      </strong>
                      <span className="text-[10px] text-neutral-400">Data e hora exatas</span>
                    </div>

                    <div className="p-3 bg-indigo-50/80 dark:bg-indigo-900/40 rounded-xl border border-indigo-200 dark:border-indigo-700">
                      <span className="text-indigo-700 dark:text-indigo-300 block text-[10px] font-black uppercase">4. Lançamento no Razão:</span>
                      <strong className="text-sm text-indigo-700 dark:text-indigo-300 block mt-0.5">
                        {formatFullDate(viewingChange.dataLancamentoEfetivo || viewingChange.changeDate || viewingChange.createdAt)}
                      </strong>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Data Efetiva Balancete</span>
                    </div>
                  </div>
                </div>

                {/* Solicitante */}
                <div className="bg-neutral-50 dark:bg-neutral-950/60 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <h4 className="font-black text-neutral-400 uppercase tracking-widest text-[10px]">Servidor Solicitante & Órgão</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-neutral-800 dark:text-neutral-200">
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Nome Completo:</span>
                      <strong className="text-sm">{viewingChange.requesterName}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Cargo / Função:</span>
                      <span className="font-bold text-neutral-700 dark:text-neutral-300">{viewingChange.requesterRole}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Secretaria / Órgão:</span>
                      <span className="font-bold text-indigo-600">{viewingChange.requesterDepartment}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Contato:</span>
                      <span>{viewingChange.requesterPhone || viewingChange.requesterEmail || 'Não informado'}</span>
                    </div>
                  </div>
                </div>

                {/* Detalhes Técnicos e Valores */}
                <div className="bg-neutral-50 dark:bg-neutral-950/60 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <h4 className="font-black text-neutral-400 uppercase tracking-widest text-[10px]">Especificações Financeiras e Legais</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-neutral-800 dark:text-neutral-200">
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Documento Origem:</span>
                      <strong className="text-xs font-mono">{viewingChange.referenceDoc}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Valor Original:</span>
                      <span className="font-mono text-xs">{formatCurrency(viewingChange.valorOriginal || viewingChange.amount)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Valor do Ajuste:</span>
                      <strong className="text-emerald-600 font-mono text-sm">{formatCurrency(viewingChange.amount)}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px]">Base Legal MCASP:</span>
                      <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block truncate" title={viewingChange.baseLegalMcasp}>
                        {viewingChange.baseLegalMcasp || 'MCASP Parte II'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Justificativa */}
                <div className="space-y-1">
                  <span className="text-neutral-400 font-black text-[10px] uppercase tracking-wider block">Justificativa Circunstanciada do Pedido</span>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 leading-relaxed text-xs">
                    {viewingChange.reason}
                  </div>
                </div>

                {/* Documentos Anexos com Hashes SHA-256 */}
                <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                      <Paperclip size={14} /> Documentos Comprobatórios Anexados (Antes e Depois com Integridade SHA-256)
                    </h4>
                    <span className="text-[10px] text-purple-600 font-mono">
                      Criptografia de Auditoria
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Doc Antes */}
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate">
                          <span className="text-[10px] font-black text-amber-600 block uppercase">Documento Primitivo (Antes):</span>
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                            {viewingChange.attachmentBeforeName || 'Nenhum anexo primitivo'}
                          </span>
                        </div>
                        {viewingChange.attachmentBeforeUrl && (
                          <a
                            href={viewingChange.attachmentBeforeUrl}
                            download={viewingChange.attachmentBeforeName || 'doc_primitivo'}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <Download size={13} />
                            <span>Baixar</span>
                          </a>
                        )}
                      </div>
                      {viewingChange.attachmentBeforeHash && (
                        <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                          <span className="text-[9px] text-neutral-400 block uppercase font-mono">Hash SHA-256:</span>
                          <code className="text-[9px] font-mono text-neutral-600 dark:text-neutral-400 break-all select-all block bg-neutral-50 dark:bg-neutral-950 p-1 rounded">
                            {viewingChange.attachmentBeforeHash}
                          </code>
                        </div>
                      )}
                    </div>

                    {/* Doc Depois */}
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate">
                          <span className="text-[10px] font-black text-emerald-600 block uppercase">Documento Retificado (Depois):</span>
                          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                            {viewingChange.attachmentAfterName || 'Nenhum anexo retificado'}
                          </span>
                        </div>
                        {viewingChange.attachmentAfterUrl && (
                          <a
                            href={viewingChange.attachmentAfterUrl}
                            download={viewingChange.attachmentAfterName || 'doc_retificado'}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <Download size={13} />
                            <span>Baixar</span>
                          </a>
                        )}
                      </div>
                      {viewingChange.attachmentAfterHash && (
                        <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                          <span className="text-[9px] text-neutral-400 block uppercase font-mono">Hash SHA-256:</span>
                          <code className="text-[9px] font-mono text-neutral-600 dark:text-neutral-400 break-all select-all block bg-neutral-50 dark:bg-neutral-950 p-1 rounded">
                            {viewingChange.attachmentAfterHash}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo da Aba 2: PARTIDAS DOBRADAS (PCASP) */}
            {viewingTab === 'partidas' && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <SRCPartidasComparativo 
                  partidaOriginal={viewingChange.partidaOriginal}
                  partidaProposta={viewingChange.partidaProposta}
                  valorOriginal={viewingChange.valorOriginal || viewingChange.amount}
                  valorAjuste={viewingChange.amount}
                />
              </div>
            )}

            {/* Conteúdo da Aba 3: TRILHA DE AUDITORIA & TIMELINE */}
            {viewingTab === 'timeline' && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <SRCTimelineAuditoria 
                  solicitacaoId={viewingChange.id}
                  trilha={viewingChange.trilhaAuditoria}
                  dataAbertura={viewingChange.createdAt}
                  solicitanteNome={viewingChange.requesterName}
                  solicitanteCargo={viewingChange.requesterRole}
                />
              </div>
            )}

            {/* Conteúdo da Aba 4: RAZÃO & BASE LEGAL MCASP */}
            {viewingTab === 'historico' && (
              <div className="space-y-5 animate-in fade-in-50 duration-150 text-xs">
                {/* Histórico Sintaxe Oficial */}
                <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                      <FileText size={15} />
                      Histórico Obrigatório para o Diário / Razão (TCE-MT)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const hist = generateHistoricoRazao(
                          viewingChange.tipoDocumentoSRC,
                          viewingChange.referenceDoc,
                          viewingChange.fiscalYear,
                          viewingChange.protocolNumber,
                          viewingChange.dataLancamentoEfetivo || viewingChange.changeDate || viewingChange.createdAt,
                          viewingChange.reason
                        );
                        navigator.clipboard.writeText(hist);
                        showToast('Histórico contábil copiado para a área de transferência!');
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={12} />
                      Copiar Histórico
                    </button>
                  </div>

                  <p className="font-mono text-xs text-slate-200 leading-relaxed bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                    {generateHistoricoRazao(
                      viewingChange.tipoDocumentoSRC,
                      viewingChange.referenceDoc,
                      viewingChange.fiscalYear,
                      viewingChange.protocolNumber,
                      viewingChange.dataLancamentoEfetivo || viewingChange.changeDate || viewingChange.createdAt,
                      viewingChange.reason
                    )}
                  </p>
                </div>

                {/* Base Legal e Conformidade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-950/60 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <h5 className="font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-widest text-[11px] flex items-center gap-1.5">
                      <Scale size={15} className="text-indigo-600" />
                      Fundamento Legal Aplicado
                    </h5>
                    <p className="text-neutral-600 dark:text-neutral-400 text-xs">
                      {viewingChange.baseLegalMcasp || 'Manual de Contabilidade Aplicada ao Setor Público (MCASP) - 10ª Edição e Lei Federal nº 4.320/1964.'}
                    </p>
                    <p className="text-[11px] text-neutral-500 italic pt-1">
                      Em obediência ao princípio da competência e tempestividade contábil na administração pública municipal.
                    </p>
                  </div>

                  <div className="p-4 bg-neutral-50 dark:bg-neutral-950/60 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                    <h5 className="font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-widest text-[11px] flex items-center gap-1.5">
                      <Lock size={15} className="text-emerald-600" />
                      Regra de Imutabilidade do TCE
                    </h5>
                    <p className="text-neutral-600 dark:text-neutral-400 text-xs">
                      Este processo contábil não sobrescreve registros anteriores. Os ajustes são consolidados por meio de lançamentos autônomos de estorno e retificação com estrita segregação de funções.
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                      Integridade e trilha de auditoria ativadas.
                    </p>
                  </div>
                </div>

                {/* Despacho do Contador Registrado */}
                {viewingChange.accountantName && (
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-purple-900 dark:text-purple-300 uppercase tracking-widest text-[11px]">
                        Parecer Técnico Homologado
                      </span>
                      <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400">
                        {viewingChange.accountantCrc || 'CRC Registrado'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-800 dark:text-neutral-200">
                      Responsável: <strong>{viewingChange.accountantName}</strong>
                    </p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 italic bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      "{viewingChange.accountantNotes || 'Sem anotações complementares.'}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Rodapé do Modal */}
            <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => handlePrintDossier(viewingChange)}
                className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
              >
                <Printer size={15} />
                <span>Gerar Dossiê Oficial para Auditoria</span>
              </button>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    onClick={() => {
                      setViewingChange(null);
                      openReviewModal(viewingChange);
                    }}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Emitir / Editar Parecer
                  </button>
                )}
                <button
                  onClick={() => setViewingChange(null)}
                  className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Relatório Geral de Alterações Contábeis (Com Filtros e Impressão) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-6">
          {/* Backdrop fixo: não fecha ao clicar fora */}
          <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm" />

          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 w-full max-w-6xl xl:max-w-7xl relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-200 max-h-[94vh] overflow-y-auto space-y-6">
            {/* Header do Relatório */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
                  <Printer size={13} />
                  Relatório Oficial & Auditoria
                </div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <FileText size={24} className="text-indigo-600" />
                  Relatório Geral de Alterações na Contabilidade
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Filtre os dados por status, secretaria, cargo (incluindo <strong>Assessor Contábil</strong>), tipo de alteração ou mês para emissão e impressão oficial.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/25 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                  title="Imprimir relatório em formato oficial A4"
                >
                  <Printer size={16} />
                  <span>Imprimir Relatório</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-3 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-2xl cursor-pointer hover:scale-105 transition-all"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* BARRA DE FILTROS DO RELATÓRIO */}
            <div className="bg-neutral-50 dark:bg-neutral-950/50 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Filter size={14} className="text-indigo-600" /> Filtros do Relatório
                </h4>
                {(reportStatusFilter !== 'all' || reportDepartmentFilter !== 'all' || reportRoleFilter !== 'all' || reportTypeFilter !== 'all' || reportYearFilter !== 'all' || reportMonthFilter || reportDateFilter || reportSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportStatusFilter('all');
                      setReportDepartmentFilter('all');
                      setReportRoleFilter('all');
                      setReportTypeFilter('all');
                      setReportYearFilter('all');
                      setReportMonthFilter('');
                      setReportDateFilter('');
                      setReportSearch('');
                    }}
                    className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Limpar Filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider pl-1">Status Contábil</label>
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => setReportStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="pending">Pendentes de Análise</option>
                    <option value="in_review">Em Análise Técnica</option>
                    <option value="approved">Aprovadas</option>
                    <option value="completed">Efetivadas nos Sistemas</option>
                    <option value="rejected">Indeferidas / Rejeitadas</option>
                  </select>
                </div>

                {/* Secretaria / Órgão */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider pl-1">Secretaria / Órgão</label>
                  <select
                    value={reportDepartmentFilter}
                    onChange={(e) => setReportDepartmentFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todas as Secretarias</option>
                    {MUNICIPAL_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Cargo do Solicitante (Com destaque para Assessor Contábil) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider pl-1">Cargo / Função</label>
                  <select
                    value={reportRoleFilter}
                    onChange={(e) => setReportRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todos os Cargos</option>
                    {REQUESTER_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Alteração */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider pl-1">Tipo de Alteração</label>
                  <select
                    value={reportTypeFilter}
                    onChange={(e) => setReportTypeFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todos os Tipos</option>
                    {ACCOUNTING_CHANGE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* Exercício */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider pl-1">Exercício Orçamentário</label>
                  <select
                    value={reportYearFilter}
                    onChange={(e) => setReportYearFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos os Exercícios</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>

                {/* Mês de Competência com Calendário */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider pl-1 flex items-center justify-between">
                    <span>Mês de Competência</span>
                    {reportMonthFilter && (
                      <button
                        type="button"
                        onClick={() => setReportMonthFilter('')}
                        className="text-[9px] text-rose-500 hover:underline"
                      >
                        Limpar mês
                      </button>
                    )}
                  </label>
                  <input
                    type="month"
                    value={reportMonthFilter}
                    onChange={(e) => setReportMonthFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Data Específica da Alteração (Dia, Mês e Ano) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider pl-1 flex items-center justify-between">
                    <span>Data Específica (Dia/Mês/Ano)</span>
                    {reportDateFilter && (
                      <button
                        type="button"
                        onClick={() => setReportDateFilter('')}
                        className="text-[9px] text-rose-500 hover:underline"
                      >
                        Limpar data
                      </button>
                    )}
                  </label>
                  <input
                    type="date"
                    value={reportDateFilter}
                    onChange={(e) => setReportDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Busca textual */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider pl-1">Busca por Termo</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Protocolo, solicitante, doc..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* KPIS DO RELATÓRIO FILTRADO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block">Registros Selecionados</span>
                <span className="text-2xl font-black text-neutral-900 dark:text-white mt-1 block">{reportTotalCount}</span>
              </div>
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">Aprovadas / Efetivadas</span>
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">{reportApprovedCount}</span>
              </div>
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider block">Pendentes de Análise</span>
                <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block">{reportPendingCount}</span>
              </div>
              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider block">Volume Financeiro Total</span>
                <span className="text-xl font-black text-purple-700 dark:text-purple-300 mt-1 block truncate" title={formatCurrency(reportTotalAmount)}>
                  {formatCurrency(reportTotalAmount)}
                </span>
              </div>
            </div>

            {/* PRÉVIA OFICIAL DO DOCUMENTO DE IMPRESSÃO */}
            <div className="bg-white dark:bg-neutral-950 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 md:p-8 space-y-6 shadow-sm overflow-x-auto">
              {/* Cabeçalho Municipal Oficial */}
              <div className="text-center border-b-2 border-neutral-900 dark:border-neutral-200 pb-5 space-y-1">
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                  REPÚBLICA FEDERATIVA DO BRASIL • ESTADO DE MATO GROSSO
                </p>
                <h2 className="text-lg font-black uppercase text-neutral-900 dark:text-white tracking-wide">
                  Prefeitura Municipal • Secretaria Municipal de Finanças
                </h2>
                <h3 className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                  Setor Contábil & Unidade Central de Controle Interno
                </h3>
                <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase pt-1 tracking-wider">
                  RELATÓRIO OFICIAL DE CONTROLE E TRILHA DE AUDITORIA DE ALTERAÇÕES CONTÁBEIS
                </p>
                <p className="text-[10px] text-neutral-400 pt-0.5">
                  Atendimento à Lei Complementar 101/2000 (LRF), Lei Federal 4.320/64 e Resoluções Normativas do TCE
                </p>
              </div>

              {/* Tabela do Relatório */}
              {reportFilteredChanges.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">
                  <AlertCircle size={32} className="mx-auto mb-2 text-neutral-300" />
                  <p className="text-sm font-bold">Nenhuma alteração contábil corresponde aos filtros selecionados.</p>
                  <p className="text-xs mt-1">Experimente alterar os critérios de busca ou limpar os filtros.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-neutral-900 dark:border-neutral-200 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      <th className="p-3 text-[10px] font-black uppercase tracking-wider">Protocolo & Data (Dia/Mês/Ano)</th>
                      <th className="p-3 text-[10px] font-black uppercase tracking-wider">Quem Solicitou</th>
                      <th className="p-3 text-[10px] font-black uppercase tracking-wider">Tipo & Documento</th>
                      <th className="p-3 text-[10px] font-black uppercase tracking-wider text-center">Competência</th>
                      <th className="p-3 text-[10px] font-black uppercase tracking-wider">Situação De / Para</th>
                      <th className="p-3 text-[10px] font-black uppercase tracking-wider text-right">Valor (R$)</th>
                      <th className="p-3 text-[10px] font-black uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportFilteredChanges.map((item, idx) => (
                      <tr key={item.id} className={`border-b border-neutral-100 dark:border-neutral-800 ${idx % 2 === 0 ? 'bg-white dark:bg-neutral-950' : 'bg-neutral-50/60 dark:bg-neutral-900/40'}`}>
                        <td className="p-3 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                          <span className="block text-neutral-900 dark:text-white">{item.protocolNumber}</span>
                          <span className="inline-flex items-center gap-1 font-sans text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                            <Calendar size={12} className="shrink-0" />
                            {formatFullDate(item.changeDate || item.createdAt)}
                          </span>
                        </td>
                        <td className="p-3">
                          <strong className="text-neutral-900 dark:text-white block">{item.requesterName}</strong>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[11px] block">{item.requesterRole}</span>
                          <span className="text-neutral-500 text-[10px] block">{item.requesterDepartment}</span>
                        </td>
                        <td className="p-3">
                          <strong className="text-neutral-800 dark:text-neutral-200 block">
                            {ACCOUNTING_CHANGE_TYPES.find(t => t.value === item.changeType)?.label || item.changeType}
                          </strong>
                          <span className="font-mono text-neutral-500 text-[11px]">Doc: {item.referenceDoc}</span>
                        </td>
                        <td className="p-3 text-center">
                          <strong className="block text-neutral-800 dark:text-neutral-200">{item.monthRef || '-'}</strong>
                          <span className="text-neutral-400 text-[10px]">Ex: {item.fiscalYear}</span>
                        </td>
                        <td className="p-3 max-w-xs space-y-1">
                          {item.currentState && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              <strong>DE:</strong> {item.currentState}
                            </div>
                          )}
                          {item.proposedState && (
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                              <strong>PARA:</strong> {item.proposedState}
                            </div>
                          )}
                          <p className="text-[10px] text-neutral-500 italic truncate" title={item.reason}>
                            Justif: {item.reason}
                          </p>
                        </td>
                        <td className="p-3 font-mono font-bold text-right text-neutral-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${ACCOUNTING_STATUS_CONFIG[item.status].bg} ${ACCOUNTING_STATUS_CONFIG[item.status].text} ${ACCOUNTING_STATUS_CONFIG[item.status].border}`}>
                            {ACCOUNTING_STATUS_CONFIG[item.status].label}
                          </span>
                          {item.accountantName && (
                            <span className="block text-[9px] text-neutral-400 mt-1 truncate" title={item.accountantName}>
                              {item.accountantName}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Bloco Oficial de Assinaturas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-neutral-200 dark:border-neutral-800">
                <div className="text-center space-y-1">
                  <div className="border-t border-neutral-400 dark:border-neutral-600 pt-2 mx-6">
                    <strong className="block text-xs text-neutral-800 dark:text-neutral-200">Contador(a) Geral do Município</strong>
                    <span className="text-[10px] text-neutral-400">Responsável Técnico Contábil • CRC</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="border-t border-neutral-400 dark:border-neutral-600 pt-2 mx-6">
                    <strong className="block text-xs text-neutral-800 dark:text-neutral-200">Controlador(a) Geral do Município</strong>
                    <span className="text-[10px] text-neutral-400">Unidade Central de Controle Interno</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="border-t border-neutral-400 dark:border-neutral-600 pt-2 mx-6">
                    <strong className="block text-xs text-neutral-800 dark:text-neutral-200">Secretário(a) Municipal de Finanças</strong>
                    <span className="text-[10px] text-neutral-400">Ordenador de Despesas / Fazenda</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex justify-between items-center pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-xs text-neutral-400">
                Exibindo {reportTotalCount} registro(s) no relatório
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-6 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 cursor-pointer flex items-center gap-2"
                >
                  <Printer size={16} />
                  <span>Imprimir Relatório</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
