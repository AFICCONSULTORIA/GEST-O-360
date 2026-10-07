import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Filter, Edit3, Trash2, Eye, FileText, CheckCircle2, 
  AlertCircle, AlertTriangle, Clock, Building2, User, DollarSign, 
  Calendar, Printer, ShieldCheck, X, FileCheck, Scale, Award, 
  ArrowRight, CheckSquare, MessageSquare, Briefcase, Phone, Mail,
  RefreshCw, FileSpreadsheet, Paperclip, Upload, Download, ExternalLink,
  Calculator, Landmark, Shield, Copy, Check, FileDiff, Sparkles, UserCheck
} from 'lucide-react';
import { 
  AccountingChange, 
  AccountingChangeStatus, 
  AccountingChangeType,
  ACCOUNTING_CHANGE_TYPES,
  ACCOUNTING_STATUS_CONFIG,
  REQUESTER_ROLES,
  MUNICIPAL_DEPARTMENTS
} from '../types/accountingChanges';
import { accountingChangesService } from '../services/accountingChangesService';
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

  // Anexos (Antes e Depois)
  const [formAttachmentBeforeName, setFormAttachmentBeforeName] = useState('');
  const [formAttachmentBeforeUrl, setFormAttachmentBeforeUrl] = useState('');
  const [formAttachmentAfterName, setFormAttachmentAfterName] = useState('');
  const [formAttachmentAfterUrl, setFormAttachmentAfterUrl] = useState('');

  const fileBeforeInputRef = useRef<HTMLInputElement>(null);
  const fileAfterInputRef = useRef<HTMLInputElement>(null);

  // Formulário de Parecer Contábil
  const [reviewStatus, setReviewStatus] = useState<AccountingChangeStatus>('approved');
  const [reviewAccountantName, setReviewAccountantName] = useState('');
  const [reviewAccountantCrc, setReviewAccountantCrc] = useState('');
  const [reviewAccountantNotes, setReviewAccountantNotes] = useState('');

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

  // Upload de Arquivos Antes e Depois
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite de 10MB para o Data URL
    if (file.size > 10 * 1024 * 1024) {
      showToast('O arquivo deve ter no máximo 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'before') {
        setFormAttachmentBeforeName(file.name);
        setFormAttachmentBeforeUrl(result);
        showToast(`Documento Original (Antes) "${file.name}" anexado!`);
      } else {
        setFormAttachmentAfterName(file.name);
        setFormAttachmentAfterUrl(result);
        showToast(`Documento Retificado (Depois) "${file.name}" anexado!`);
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
      if (fileBeforeInputRef.current) fileBeforeInputRef.current.value = '';
    } else {
      setFormAttachmentAfterName('');
      setFormAttachmentAfterUrl('');
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
    setEditingChange(null);
    setFormRequesterName('');
    setFormRequesterRole(REQUESTER_ROLES[0]);
    setFormCustomRole('');
    setFormRequesterDepartment(MUNICIPAL_DEPARTMENTS[1]);
    setFormCustomDepartment('');
    setFormRequesterEmail('');
    setFormRequesterPhone('');
    setFormChangeType('retificacao_empenho');
    setFormReferenceDoc('');
    const today = new Date().toISOString().slice(0, 10);
    setFormChangeDate(today);
    const [y, m] = today.split('-');
    const yNum = parseInt(y, 10);
    const mIdx = parseInt(m, 10) - 1;
    setFormFiscalYear(yNum);
    setFormMonthRef(mIdx >= 0 && mIdx < 12 ? `${MONTH_NAMES[mIdx]} / ${y}` : today.slice(0, 7));
    setFormAmount('0');
    setFormReason('');
    setFormCurrentState('');
    setFormProposedState('');
    setFormAttachmentBeforeName('');
    setFormAttachmentBeforeUrl('');
    setFormAttachmentAfterName('');
    setFormAttachmentAfterUrl('');
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
    setFormChangeType(item.changeType);
    setFormReferenceDoc(item.referenceDoc);
    setFormFiscalYear(item.fiscalYear);
    setFormMonthRef(parseMonthToIso(item.monthRef));
    setFormAmount(String(item.amount || 0));
    setFormReason(item.reason);
    setFormCurrentState(item.currentState || '');
    setFormProposedState(item.proposedState || '');
    setFormAttachmentBeforeName(item.attachmentBeforeName || item.attachmentName || '');
    setFormAttachmentBeforeUrl(item.attachmentBeforeUrl || item.attachmentUrl || '');
    setFormAttachmentAfterName(item.attachmentAfterName || '');
    setFormAttachmentAfterUrl(item.attachmentAfterUrl || '');
    setIsNewModalOpen(true);
  };

  const openReviewModal = (item: AccountingChange) => {
    if (!canEdit) {
      showToast('Você não possui permissão para emitir pareceres contábeis.', 'error');
      return;
    }
    setReviewModalChange(item);
    setReviewStatus(item.status === 'pending' ? 'in_review' : item.status);
    // Usar dados reais do usuário logado se não houver responsável definido
    setReviewAccountantName(item.accountantName || currentUser?.name || '');
    setReviewAccountantCrc(item.accountantCrc || '');
    setReviewAccountantNotes(item.accountantNotes || '');
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

    const payload = {
      requesterName: formRequesterName.trim(),
      requesterRole: finalRole,
      requesterDepartment: finalDept,
      requesterEmail: formRequesterEmail.trim(),
      requesterPhone: formRequesterPhone.trim(),
      changeDate: formChangeDate,
      changeType: formChangeType,
      referenceDoc: formReferenceDoc.trim(),
      fiscalYear: formFiscalYear,
      monthRef: formatIsoToFriendlyMonth(formMonthRef),
      amount: parsedAmount,
      reason: formReason.trim(),
      currentState: formCurrentState.trim(),
      proposedState: formProposedState.trim(),
      attachmentName: formAttachmentBeforeName || formAttachmentAfterName || '',
      attachmentUrl: formAttachmentBeforeUrl || formAttachmentAfterUrl || '',
      attachmentBeforeName: formAttachmentBeforeName.trim(),
      attachmentBeforeUrl: formAttachmentBeforeUrl,
      attachmentAfterName: formAttachmentAfterName.trim(),
      attachmentAfterUrl: formAttachmentAfterUrl
    };

    if (editingChange) {
      await accountingChangesService.updateChange(editingChange.id, payload);
      showToast('Solicitação de alteração atualizada com sucesso!');
    } else {
      await accountingChangesService.createChange({
        ...payload,
        status: 'pending'
      });
      showToast('Solicitação de alteração registrada no controle contábil!');
    }

    setIsNewModalOpen(false);
    loadData();
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

    await accountingChangesService.reviewChange(reviewModalChange.id, {
      status: reviewStatus,
      accountantName: reviewAccountantName.trim(),
      accountantCrc: reviewAccountantCrc.trim(),
      accountantNotes: reviewAccountantNotes.trim()
    });

    showToast('Parecer contábil registrado com sucesso!');
    setReviewModalChange(null);
    loadData();
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
                          <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                            {typeObj?.label || item.changeType}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500 mt-0.5">
                            Doc: <strong className="text-neutral-800 dark:text-neutral-200">{item.referenceDoc}</strong>
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
                              title={`Baixar documento anterior: ${item.attachmentBeforeName}`}
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
                              title={`Baixar documento retificado: ${item.attachmentAfterName}`}
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

              {/* SEÇÃO 2: Dados da Alteração Contábil */}
              <div className="bg-neutral-50/70 dark:bg-neutral-950/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={16} /> 2. Dados da Alteração Contábil
                  </h4>
                  <span className="text-[11px] font-bold text-neutral-500">
                    Especificações técnicas e financeiras
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">Tipo de Alteração *</label>
                    <select
                      value={formChangeType}
                      onChange={(e) => setFormChangeType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                    >
                      {ACCOUNTING_CHANGE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">Documento de Referência *</label>
                    <input 
                      type="text" 
                      required
                      value={formReferenceDoc}
                      onChange={(e) => setFormReferenceDoc(e.target.value)}
                      placeholder="Ex: Empenho 2026/0542, Proc. Adm. 112/2026..."
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">Exercício Orçamentário</label>
                    <input 
                      type="number" 
                      value={formFiscalYear}
                      onChange={(e) => setFormFiscalYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 font-mono shadow-sm"
                    />
                  </div>

                  {/* Data Específica da Alteração (Dia, Mês e Ano completos) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                        <Calendar size={13} className="text-indigo-600 dark:text-indigo-400" />
                        Data da Alteração (Dia, Mês e Ano) *
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold">Data Específica</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="date" 
                        required
                        value={formChangeDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormChangeDate(val);
                          if (val) {
                            const [y, m] = val.split('-');
                            const yNum = parseInt(y, 10);
                            const mIdx = parseInt(m, 10) - 1;
                            if (yNum) setFormFiscalYear(yNum);
                            if (mIdx >= 0 && mIdx < 12) setFormMonthRef(`${MONTH_NAMES[mIdx]} / ${y}`);
                          }
                        }}
                        className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-bold text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] px-1 text-neutral-500">
                      <span>Data: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{formatFullDate(formChangeDate)}</strong> {formChangeDate ? `(${formatFullDateExtenso(formChangeDate)})` : ''}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().slice(0, 10);
                          setFormChangeDate(today);
                          const [y, m] = today.split('-');
                          const yNum = parseInt(y, 10);
                          const mIdx = parseInt(m, 10) - 1;
                          if (yNum) setFormFiscalYear(yNum);
                          if (mIdx >= 0 && mIdx < 12) setFormMonthRef(`${MONTH_NAMES[mIdx]} / ${y}`);
                        }}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                      >
                        Hoje
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">Valor Envolvido (R$)</label>
                    <input 
                      type="text" 
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 font-mono shadow-sm"
                    />
                  </div>
                </div>

                {/* Situação Atual vs Proposta (De / Para) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 space-y-2">
                    <label className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <AlertCircle size={14} /> Situação Anterior (Como está registrado no sistema - DE)
                    </label>
                    <textarea 
                      rows={3}
                      value={formCurrentState}
                      onChange={(e) => setFormCurrentState(e.target.value)}
                      placeholder="Ex: Empenho emitido no elemento 3.3.90.30 (Material de Consumo) para o Credor ABC Ltda..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/40 space-y-2">
                    <label className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Situação Proposta (Como deve ficar após a alteração - PARA)
                    </label>
                    <textarea 
                      rows={3}
                      value={formProposedState}
                      onChange={(e) => setFormProposedState(e.target.value)}
                      placeholder="Ex: Retificar elemento para 3.3.90.39 (Outros Serviços de Terceiros - PJ) mantendo o valor..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Justificativa Detalhada */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wider pl-1">Justificativa Circunstanciada do Pedido *</label>
                  <textarea 
                    rows={3}
                    required
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="Explique detalhadamente a motivação e a base legal desta alteração para fins de prestação de contas ao Tribunal de Contas..."
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
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

            <form onSubmit={handleSaveReview} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-wider pl-1">Decisão / Status Contábil *</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="in_review">Em Análise Técnica</option>
                  <option value="approved">Aprovada pela Contabilidade</option>
                  <option value="completed">Efetivada / Lançada nos Sistemas Contábeis</option>
                  <option value="rejected">Indeferida / Recusada</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-wider pl-1">Contador(a) / Técnico Responsável *</label>
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
                  <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-wider pl-1">Registro CRC</label>
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
                <label className="text-[11px] font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-wider pl-1">Parecer Técnico / Despacho da Contabilidade</label>
                <textarea 
                  rows={4}
                  value={reviewAccountantNotes}
                  onChange={(e) => setReviewAccountantNotes(e.target.value)}
                  placeholder="Registre as observações técnicas, embasamento na Lei 4.320/64, LRF ou motivo do indeferimento..."
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
                  <span>Gravar Parecer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualizar Ficha Completa / Termo de Auditoria */}
      {viewingChange && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/75 backdrop-blur-sm" />
          
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 w-full max-w-3xl relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Header da Ficha */}
            <div className="flex justify-between items-start border-b border-neutral-100 dark:border-neutral-800 pb-4 mb-6">
              <div>
                <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg">
                  {viewingChange.protocolNumber}
                </span>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-2">
                  Ficha de Controle de Alteração Contábil
                </h3>
                <p className="text-xs text-neutral-500">
                  Registrado no sistema em {formatDate(viewingChange.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintAudit}
                  className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                  title="Imprimir Ficha para Auditoria"
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

            <div className="space-y-6 text-xs">
              {/* Solicitante */}
              <div className="bg-neutral-50 dark:bg-neutral-950/60 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                <h4 className="font-black text-neutral-400 uppercase tracking-widest text-[10px]">Quem Solicitou a Alteração</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-neutral-800 dark:text-neutral-200">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Nome:</span>
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

              {/* Data Específica da Alteração Contábil */}
              <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-950/40 dark:to-blue-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl shadow-md flex items-center justify-center shrink-0">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                      Data Específica da Alteração (Dia, Mês e Ano)
                    </span>
                    <div className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2 mt-0.5">
                      <span>{formatFullDateExtenso(viewingChange.changeDate || viewingChange.createdAt)}</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200 rounded-md">
                        {formatFullDate(viewingChange.changeDate || viewingChange.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">
                  <div>Exercício Orçamentário: <strong className="text-neutral-900 dark:text-white font-bold">{viewingChange.fiscalYear}</strong></div>
                  <div>Mês de Competência: <strong className="text-neutral-900 dark:text-white font-bold">{viewingChange.monthRef || '-'}</strong></div>
                </div>
              </div>

              {/* Detalhes Técnicos */}
              <div className="bg-neutral-50 dark:bg-neutral-950/60 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                <h4 className="font-black text-neutral-400 uppercase tracking-widest text-[10px]">Objeto da Alteração</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-neutral-800 dark:text-neutral-200">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Data Específica:</span>
                    <strong className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                      {formatFullDate(viewingChange.changeDate || viewingChange.createdAt)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Tipo:</span>
                    <strong className="text-xs">
                      {ACCOUNTING_CHANGE_TYPES.find(t => t.value === viewingChange.changeType)?.label || viewingChange.changeType}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Doc de Referência:</span>
                    <span className="font-mono font-bold">{viewingChange.referenceDoc}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Exercício / Competência:</span>
                    <span>{viewingChange.fiscalYear} • {viewingChange.monthRef}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Valor da Operação:</span>
                    <strong className="text-emerald-600 font-mono text-sm">{formatCurrency(viewingChange.amount)}</strong>
                  </div>
                </div>
              </div>

              {/* De / Para (Situação Anterior vs Nova) */}
              {(viewingChange.currentState || viewingChange.proposedState) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-800/40">
                    <span className="text-amber-700 dark:text-amber-400 font-black text-[10px] uppercase block mb-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Situação Anterior (Como estava - DE)
                    </span>
                    <p className="text-neutral-700 dark:text-neutral-300 text-xs leading-relaxed">
                      {viewingChange.currentState || 'Não especificado'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40">
                    <span className="text-emerald-700 dark:text-emerald-400 font-black text-[10px] uppercase block mb-1 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Situação Proposta (Como ficou - PARA)
                    </span>
                    <p className="text-neutral-700 dark:text-neutral-300 text-xs leading-relaxed">
                      {viewingChange.proposedState || 'Não especificado'}
                    </p>
                  </div>
                </div>
              )}

              {/* Justificativa */}
              <div className="space-y-1">
                <span className="text-neutral-400 font-black text-[10px] uppercase tracking-wider block">Justificativa Circunstanciada</span>
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 leading-relaxed text-xs">
                  {viewingChange.reason}
                </div>
              </div>

              {/* Documentos Anexos (Antes e Depois) */}
              <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-3">
                <h4 className="font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                  <Paperclip size={14} /> Documentos Comprobatórios Anexados (Antes e Depois)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Doc Antes */}
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-[10px] font-black text-amber-600 block uppercase">Documento Antes (Original):</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                        {viewingChange.attachmentBeforeName || 'Nenhum anexo anterior'}
                      </span>
                    </div>
                    {viewingChange.attachmentBeforeUrl && (
                      <a
                        href={viewingChange.attachmentBeforeUrl}
                        download={viewingChange.attachmentBeforeName || 'documento_anterior'}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0"
                      >
                        <Download size={13} />
                        <span>Baixar</span>
                      </a>
                    )}
                  </div>

                  {/* Doc Depois */}
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-[10px] font-black text-emerald-600 block uppercase">Documento Depois (Retificado):</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                        {viewingChange.attachmentAfterName || 'Nenhum anexo retificado'}
                      </span>
                    </div>
                    {viewingChange.attachmentAfterUrl && (
                      <a
                        href={viewingChange.attachmentAfterUrl}
                        download={viewingChange.attachmentAfterName || 'documento_retificado'}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0"
                      >
                        <Download size={13} />
                        <span>Baixar</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Parecer do Contador */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-950/60 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-widest text-[10px]">
                    Despacho / Parecer do Setor Contábil
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${ACCOUNTING_STATUS_CONFIG[viewingChange.status].bg} ${ACCOUNTING_STATUS_CONFIG[viewingChange.status].text} ${ACCOUNTING_STATUS_CONFIG[viewingChange.status].border}`}>
                    {ACCOUNTING_STATUS_CONFIG[viewingChange.status].label}
                  </span>
                </div>

                {viewingChange.accountantName ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-neutral-600 dark:text-neutral-400 text-xs">
                      Responsável Técnico: <strong>{viewingChange.accountantName}</strong> {viewingChange.accountantCrc && `(${viewingChange.accountantCrc})`}
                    </p>
                    {viewingChange.accountantNotes ? (
                      <p className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs italic">
                        "{viewingChange.accountantNotes}"
                      </p>
                    ) : (
                      <p className="text-neutral-400 italic text-[11px]">Nenhuma observação adicional anotada.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-neutral-400 text-xs italic pt-1">
                    Ainda pendente de análise pelo setor contábil municipal.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
              {canEdit && (
                <button
                  onClick={() => {
                    setViewingChange(null);
                    openReviewModal(viewingChange);
                  }}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
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
    </div>
  );
};
