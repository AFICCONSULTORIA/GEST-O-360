import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2, FileCode, Upload, 
  FileText, Sparkles, Copy, Check, Printer, RefreshCw, Calculator, 
  HelpCircle, ChevronRight, ArrowLeft, ArrowRight, Download, Eye, 
  Building2, Landmark, Scale, DollarSign, Layers, Info, Search, 
  Sliders, AlertCircle, Share2, CornerDownRight, BarChart3, Sun, Moon,
  ClipboardCheck, CheckSquare, Square, MessageSquare, Send, CheckCheck,
  FileCheck2, UserCheck, PenLine, FileSpreadsheet, ExternalLink, BookmarkCheck,
  KeyRound, Hash, ArrowRightLeft, ShoppingBag, Wrench
} from 'lucide-react';
import { 
  auditFiscalDocument, 
  FiscalDiagnostic, 
  SAMPLE_DOCUMENTS, 
  roundCurrency, 
  validateChaveNFe, 
  validateChaveNFSeNacional,
  generateXmlFromChave,
  UF_CODES,
  COMMON_IBGE_MUN,
  AccountantChecklistItem,
  generateAccountantChecklist
} from '../utils/fiscalValidatorEngine';
import { readFiscalPdf, ExtractedFiscalPdf } from '../utils/pdfFiscalReader';
import { SimpleNotaFiscalValidator } from '../components/SimpleNotaFiscalValidator';
import { Institution } from '../types';

interface PublicNotaFiscalAuditorProps {
  darkMode?: boolean;
  setDarkMode?: (val: boolean) => void;
  currentInstitution?: Institution | null;
  onNavigateHome?: () => void;
}

export const PublicNotaFiscalAuditor: React.FC<PublicNotaFiscalAuditorProps> = ({
  darkMode = false,
  setDarkMode,
  currentInstitution,
  onNavigateHome
}) => {
  // Modo de visualização: 'simple' (Padrão para Empresas e Contadores) ou 'advanced' (Auditoria Técnica)
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');

  // Categoria de Documento Fiscal (Consumo: 44 dígitos vs Serviço: 50 dígitos)
  const [docCategory, setDocCategory] = useState<'consumo' | 'servico'>('consumo');
  const [chaveInput, setChaveInput] = useState<string>('');

  // Estados de entrada e auditoria
  const [activeTab, setActiveTab] = useState<'chave' | 'upload' | 'editor' | 'calculator'>('chave');
  const [xmlInput, setXmlInput] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<FiscalDiagnostic | null>(null);
  const [resultSubTab, setResultSubTab] = useState<'checklist' | 'issues' | 'items' | 'danfe' | 'xml'>('checklist');
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'erro' | 'aviso' | 'sucesso'>('all');
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [pdfMetadata, setPdfMetadata] = useState<ExtractedFiscalPdf | null>(null);
  const [pdfReadError, setPdfReadError] = useState<string | null>(null);

  // Estados do Checklist do Contador
  const [checklist, setChecklist] = useState<AccountantChecklistItem[]>([]);
  const [checklistCategoryFilter, setChecklistCategoryFilter] = useState<'all' | 'validade' | 'classificacao' | 'calculos_reforma' | 'issqn_retencoes' | 'contabil_administrativo'>('all');
  const [checklistStatusFilter, setChecklistStatusFilter] = useState<'all' | 'conforme' | 'inconsistente' | 'aviso' | 'pendente_manual'>('all');
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});
  const [accountantNotes, setAccountantNotes] = useState<Record<string, string>>({});
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Estados do Simulador / Calculadora
  const [simDocType, setSimDocType] = useState<'NFE_55' | 'NFSE_NACIONAL'>('NFE_55');
  const [simBaseValue, setSimBaseValue] = useState<number>(10000);
  const [simIBSUFRate, setSimIBSUFRate] = useState<number>(0.05); // 0.05% teste 2026
  const [simIBSMunRate, setSimIBSMunRate] = useState<number>(0.05); // 0.05% teste 2026
  const [simCBSRate, setSimCBSRate] = useState<number>(0.90); // 0.90% teste 2026
  const [simHasIS, setSimHasIS] = useState<boolean>(false);
  const [simISRate, setSimISRate] = useState<number>(1.5);
  const [simISSQNRate, setSimISSQNRate] = useState<number>(3.0);

  // Análise da Chave de Acesso em Tempo Real (Atenção estrita aos 44 e 50 dígitos)
  const keyAnalysis = useMemo(() => {
    const clean = chaveInput.replace(/\D/g, '');
    const cleanLength = clean.length;
    const isServiceMode = docCategory === 'servico';
    const expectedDigits = isServiceMode ? 50 : 44;

    const isMismatchServiceInConsumo = !isServiceMode && cleanLength === 50;
    const isMismatchConsumoInService = isServiceMode && cleanLength === 44;

    let nfeData: ReturnType<typeof validateChaveNFe> | null = null;
    let nfseData: ReturnType<typeof validateChaveNFSeNacional> | null = null;

    if (!isServiceMode) {
      if (cleanLength > 0) {
        nfeData = validateChaveNFe(clean);
      }
    } else {
      if (cleanLength > 0) {
        nfseData = validateChaveNFSeNacional(clean);
      }
    }

    return {
      clean,
      cleanLength,
      expectedDigits,
      isMismatchServiceInConsumo,
      isMismatchConsumoInService,
      nfeData,
      nfseData,
      isComplete: cleanLength === expectedDigits,
      isValid: isServiceMode ? (nfseData?.valid ?? false) : (nfeData?.valid ?? false)
    };
  }, [chaveInput, docCategory]);

  // Auditoria direta a partir da Chave de Acesso digitada
  const handleAuditByChave = () => {
    const clean = chaveInput.replace(/\D/g, '');
    if (!clean) return;

    if (docCategory === 'consumo' && clean.length !== 44) {
      alert(`Atenção: A chave de acesso de Nota de Consumo deve possuir exatamente 44 dígitos. Atualmente possui ${clean.length} dígitos.`);
      return;
    }

    if (docCategory === 'servico' && clean.length !== 50) {
      alert(`Atenção: A chave de acesso de Nota de Serviço deve possuir exatamente 50 dígitos. Atualmente possui ${clean.length} dígitos.`);
      return;
    }

    const docLabel = docCategory === 'consumo' 
      ? `Nota de Consumo por Chave (${clean.length} dígitos)` 
      : `Nota de Serviço por Chave (${clean.length} dígitos)`;

    const xml = generateXmlFromChave(clean, docCategory === 'consumo' ? 'CONSUMO' : 'SERVICO');
    handleRunAudit(xml, docLabel);
  };

  const handleFillSampleKey = (type: 'consumo' | 'servico') => {
    if (type === 'consumo') {
      setDocCategory('consumo');
      setChaveInput('35260100000000000191550010000012341234567898');
    } else {
      setDocCategory('servico');
      setChaveInput('35503081000000000001910000100000000000010112345678');
    }
  };

  // Execução da auditoria
  const handleRunAudit = (content: string, name?: string) => {
    setIsAuditing(true);
    if (name) setFileName(name);
    setXmlInput(content);

    // Simulação visual de alta performance
    setTimeout(() => {
      const res = auditFiscalDocument(content);
      setDiagnostic(res);
      // Sincroniza docCategory com o diagnóstico detectado
      if (res.docType === 'NFSE_NACIONAL') {
        setDocCategory('servico');
        setSimDocType('NFSE_NACIONAL');
      } else {
        setDocCategory('consumo');
        setSimDocType('NFE_55');
      }
      const initialChecklist = generateAccountantChecklist(res);
      setChecklist(initialChecklist);
      setManualChecks({});
      setAccountantNotes({});
      setIsAuditing(false);
      setResultSubTab('checklist');
    }, 280);
  };

  // Processamento de Arquivos (XML, JSON, TXT ou PDF)
  const handleProcessFile = async (file: File) => {
    setFileName(file.name);
    setPdfReadError(null);

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    if (isPdf) {
      setIsReadingPdf(true);
      setIsAuditing(true);
      try {
        const extracted = await readFiscalPdf(file);
        setPdfMetadata(extracted);
        setXmlInput(extracted.xmlGenerated);
        const res = auditFiscalDocument(extracted.xmlGenerated);
        setDiagnostic(res);
        const initialChecklist = generateAccountantChecklist(res);
        setChecklist(initialChecklist);
        setManualChecks({});
        setAccountantNotes({});
        setResultSubTab('checklist');
      } catch (err: any) {
        console.error('Erro na leitura do PDF:', err);
        setPdfReadError(err.message || 'Não foi possível extrair os dados da nota fiscal a partir deste PDF.');
      } finally {
        setIsReadingPdf(false);
        setIsAuditing(false);
      }
      return;
    }

    // Se for XML, JSON ou TXT
    setPdfMetadata(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleRunAudit(content, file.name);
    };
    reader.readAsText(file);
  };

  // Leitura de Arquivo via Input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessFile(file);
  };

  // Drag and Drop
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleProcessFile(file);
  };

  // Carregar exemplos pré-definidos
  const loadPreset = (type: 'nfeConforme' | 'nfeBlocoW' | 'nfseConforme') => {
    let sample = '';
    let label = '';
    if (type === 'nfeConforme') {
      sample = SAMPLE_DOCUMENTS.nfe2026Conforme;
      label = 'Nota de Consumo - NF-e 55 Conforme (Chave de 44 dígitos)';
      setDocCategory('consumo');
      setChaveInput('35260100000000000191550010000012341234567898');
    } else if (type === 'nfeBlocoW') {
      sample = SAMPLE_DOCUMENTS.nfe2026ComDivergenciaBlocoW;
      label = 'Nota de Consumo - NF-e 55 c/ Divergência Bloco W (Chave de 44 dígitos)';
      setDocCategory('consumo');
      setChaveInput('35260100000000000191550010000099991234567897');
    } else {
      sample = SAMPLE_DOCUMENTS.nfseNacionalConforme;
      label = 'Nota de Serviço - NFS-e NT 008 Padrão Nacional (Chave de 50 dígitos)';
      setDocCategory('servico');
      setChaveInput('35503081000000000001910000100000000000010112345678');
    }
    handleRunAudit(sample, label);
  };

  // Cálculos do Simulador
  const simCalculated = useMemo(() => {
    const ibsUF = roundCurrency(simBaseValue * (simIBSUFRate / 100));
    const ibsMun = roundCurrency(simBaseValue * (simIBSMunRate / 100));
    const cbs = roundCurrency(simBaseValue * (simCBSRate / 100));
    const is = simHasIS ? roundCurrency(simBaseValue * (simISRate / 100)) : 0;
    const issqn = simDocType === 'NFSE_NACIONAL' ? roundCurrency(simBaseValue * (simISSQNRate / 100)) : 0;
    const totalReforma = roundCurrency(ibsUF + ibsMun + cbs + is);
    const cargaTotal = roundCurrency(totalReforma + issqn);

    return {
      ibsUF,
      ibsMun,
      cbs,
      is,
      issqn,
      totalReforma,
      cargaTotal
    };
  }, [simBaseValue, simIBSUFRate, simIBSMunRate, simCBSRate, simHasIS, simISRate, simISSQNRate, simDocType]);

  // Gerar XML a partir do simulador
  const handleGenerateFromSim = () => {
    if (simDocType === 'NFE_55') {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35260100000000000191550010000088881234567890" versao="5.00">
    <ide>
      <cUF>35</cUF>
      <natOp>SIMULACAO REFORMA 2026</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>8888</nNF>
      <dhEmi>2026-06-01T09:00:00-03:00</dhEmi>
    </ide>
    <emit>
      <CNPJ>00000000000191</CNPJ>
      <xNome>EMPRESA EXEMPLO S/A</xNome>
    </emit>
    <dest>
      <CNPJ>99999999000188</CNPJ>
      <xNome>CLIENTE CONSUMIDOR FINAL</xNome>
    </dest>
    <det nItem="1">
      <prod>
        <xProd>MERCADORIA / SERVICO AUDITADO</xProd>
        <vProd>${simBaseValue.toFixed(2)}</vProd>
      </prod>
      <imposto>
        <UB>
          <cClassTrib>010101</cClassTrib>
          <vBC>${simBaseValue.toFixed(2)}</vBC>
          <pIBSUF>${simIBSUFRate.toFixed(2)}</pIBSUF>
          <vIBSUF>${simCalculated.ibsUF.toFixed(2)}</vIBSUF>
          <pIBSMun>${simIBSMunRate.toFixed(2)}</pIBSMun>
          <vIBSMun>${simCalculated.ibsMun.toFixed(2)}</vIBSMun>
          <pCBS>${simCBSRate.toFixed(2)}</pCBS>
          <vCBS>${simCalculated.cbs.toFixed(2)}</vCBS>
        </UB>
        ${simHasIS ? `<IS>
          <vBCIS>${simBaseValue.toFixed(2)}</vBCIS>
          <pIS>${simISRate.toFixed(2)}</pIS>
          <vIS>${simCalculated.is.toFixed(2)}</vIS>
        </IS>` : ''}
      </imposto>
    </det>
    <total>
      <ICMSTot>
        <vProd>${simBaseValue.toFixed(2)}</vProd>
        <vNF>${simBaseValue.toFixed(2)}</vNF>
      </ICMSTot>
      <UBTot>
        <vIBSUF>${simCalculated.ibsUF.toFixed(2)}</vIBSUF>
        <vIBSMun>${simCalculated.ibsMun.toFixed(2)}</vIBSMun>
        <vCBS>${simCalculated.cbs.toFixed(2)}</vCBS>
        ${simHasIS ? `<vIS>${simCalculated.is.toFixed(2)}</vIS>` : ''}
      </UBTot>
    </total>
  </infNFe>
</NFe>`;
      handleRunAudit(xml, 'Simulação Nota de Consumo (NF-e 55 · Chave de 44 dígitos)');
    } else {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CompNFSe xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infNFSe Id="NFSe35503080000000000000000000000000000000000000000888">
    <nNFSe>888</nNFSe>
    <dhEmi>2026-06-01T09:00:00-03:00</dhEmi>
    <prest>
      <CNPJ>00000000000191</CNPJ>
      <xNome>PRESTADOR DE SERVICOS SA</xNome>
    </prest>
    <toma>
      <CNPJ>99999999000188</CNPJ>
      <xNome>TOMADOR DOS SERVICOS</xNome>
    </toma>
    <serv>
      <xDescServ>PRESTACAO DE SERVICOS SIMULADA NT 008</xDescServ>
      <valores>
        <vServ>${simBaseValue.toFixed(2)}</vServ>
        <vBCISS>${simBaseValue.toFixed(2)}</vBCISS>
        <pAliqISS>${simISSQNRate.toFixed(2)}</pAliqISS>
        <vISS>${simCalculated.issqn.toFixed(2)}</vISS>
        <vTotNF>${simBaseValue.toFixed(2)}</vTotNF>
        <vLiq>${simBaseValue.toFixed(2)}</vLiq>
      </valores>
      <tribReforma>
        <vBC>${simBaseValue.toFixed(2)}</vBC>
        <pAliqEfetMun>${simIBSMunRate.toFixed(2)}</pAliqEfetMun>
        <vIBSMun>${simCalculated.ibsMun.toFixed(2)}</vIBSMun>
        <pAliqEfetUF>${simIBSUFRate.toFixed(2)}</pAliqEfetUF>
        <vIBSUF>${simCalculated.ibsUF.toFixed(2)}</vIBSUF>
        <pAliqEfetCBS>${simCBSRate.toFixed(2)}</pAliqEfetCBS>
        <vCBS>${simCalculated.cbs.toFixed(2)}</vCBS>
      </tribReforma>
    </serv>
  </infNFSe>
</CompNFSe>`;
      handleRunAudit(xml, 'Simulação Nota de Serviço (NFS-e NT 008 · Chave de 50 dígitos)');
    }
  };

  // Cópia para Clipboard
  const handleCopyDiagnostic = () => {
    if (!diagnostic) return;
    navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Impressão do Laudo
  const handlePrint = () => {
    window.print();
  };

  // Estatísticas e Métricas do Checklist do Contador
  const checklistStats = useMemo(() => {
    if (!checklist || checklist.length === 0) {
      return { total: 0, passed: 0, failed: 0, warnings: 0, pending: 0, percent: 100 };
    }

    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let pending = 0;

    checklist.forEach(it => {
      const isChecked = manualChecks[it.id] !== undefined ? manualChecks[it.id] : (it.status === 'conforme');
      if (isChecked) {
        passed++;
      } else if (it.status === 'inconsistente') {
        failed++;
      } else if (it.status === 'aviso') {
        warnings++;
      } else if (it.status === 'pendente_manual') {
        pending++;
      }
    });

    const percent = Math.round((passed / checklist.length) * 100);

    return {
      total: checklist.length,
      passed,
      failed,
      warnings,
      pending,
      percent
    };
  }, [checklist, manualChecks]);

  // Lista Filtrada do Checklist
  const filteredChecklist = useMemo(() => {
    return checklist.filter(item => {
      const isChecked = manualChecks[item.id] !== undefined ? manualChecks[item.id] : (item.status === 'conforme');

      // Filtro de Categoria
      if (checklistCategoryFilter !== 'all' && item.category !== checklistCategoryFilter) {
        return false;
      }

      // Filtro de Status
      if (checklistStatusFilter === 'all') return true;
      if (checklistStatusFilter === 'conforme') return isChecked;
      if (checklistStatusFilter === 'inconsistente') return !isChecked && item.status === 'inconsistente';
      if (checklistStatusFilter === 'aviso') return !isChecked && item.status === 'aviso';
      if (checklistStatusFilter === 'pendente_manual') return !isChecked && item.status === 'pendente_manual';

      return true;
    });
  }, [checklist, manualChecks, checklistCategoryFilter, checklistStatusFilter]);

  // Alternar Check Individual
  const handleToggleCheck = (id: string) => {
    setManualChecks(prev => {
      const current = prev[id] !== undefined ? prev[id] : (checklist.find(i => i.id === id)?.status === 'conforme');
      return { ...prev, [id]: !current };
    });
  };

  // Atestar Todos os Controles Administrativos (Lei 4.320/64)
  const handleCheckAllAdministrative = () => {
    setManualChecks(prev => {
      const next = { ...prev };
      checklist.forEach(it => {
        if (it.category === 'contabil_administrativo') {
          next[it.id] = true;
        }
      });
      return next;
    });
  };

  // Atestar Todo o Checklist
  const handleCheckAll = () => {
    setManualChecks(prev => {
      const next = { ...prev };
      checklist.forEach(it => {
        next[it.id] = true;
      });
      return next;
    });
  };

  // Desmarcar Todos os Atestos Manuais
  const handleResetChecks = () => {
    setManualChecks({});
  };

  // Atualizar Observação do Contador
  const handleUpdateNote = (id: string, note: string) => {
    setAccountantNotes(prev => ({
      ...prev,
      [id]: note
    }));
  };

  // Gerador de Mensagem de Notificação para Fornecedor / Setor
  const generateSupplierNotificationText = () => {
    if (!diagnostic) return '';

    const failingItems = checklist.filter(it => {
      const isChecked = manualChecks[it.id] !== undefined ? manualChecks[it.id] : (it.status === 'conforme');
      return !isChecked && (it.status === 'inconsistente' || it.status === 'aviso');
    });

    const pendingManual = checklist.filter(it => {
      const isChecked = manualChecks[it.id] !== undefined ? manualChecks[it.id] : (it.status === 'conforme');
      return !isChecked && it.status === 'pendente_manual';
    });

    let text = `*NOTIFICAÇÃO DE AUDITORIA FISCAL E CONTÁBIL - GESTÃO 360*\n`;
    text += `==================================================\n`;
    text += `*Tipo de Documento:* ${diagnostic.docType === 'NFE_55' ? 'Nota de Consumo / Mercadorias (NF-e 55 / NFC-e 65 - Chave de 44 dígitos)' : 'Nota de Serviço (NFS-e Padrão Nacional NT 008 - Chave de 50 dígitos)'}\n`;
    if (diagnostic.extra?.rawKey) {
      text += `*Chave de Acesso (${diagnostic.docType === 'NFE_55' ? '44 dígitos' : '50 dígitos'}):* ${diagnostic.extra.rawKey.replace(/(\d{4})/g, '$1 ').trim()}\n`;
    }
    text += `*Número / Série:* ${diagnostic.summary.docNumber || 'S/N'}\n`;
    text += `*Emitente:* ${diagnostic.summary.emitter}\n`;
    text += `*Destinatário:* ${diagnostic.summary.recipient}\n`;
    text += `*Valor Total:* R$ ${diagnostic.summary.vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    text += `*Índice de Conformidade:* ${checklistStats.percent}% (${checklistStats.passed}/${checklistStats.total} itens aprovados)\n`;
    text += `*Resultado Preliminar:* ${diagnostic.status === 'conforme' ? 'APROVADO' : diagnostic.status === 'aviso' ? 'APROVADO COM RESSALVAS' : 'INCONSISTENTE / BLOQUEIO PARA LIQUIDAÇÃO'}\n`;
    text += `==================================================\n\n`;

    if (failingItems.length > 0) {
      text += `*APONTAMENTOS / EXIGÊNCIAS PARA REGULARIZAÇÃO FISCAL:*\n`;
      failingItems.forEach((it, idx) => {
        text += `\n${idx + 1}. *${it.title}* [${it.normaRef}]\n`;
        text += `   - Situação: ${it.status === 'inconsistente' ? 'DIVERGÊNCIA CRÍTICA' : 'RESSALVA / ALERTA'}\n`;
        text += `   - Detalhe: ${it.divergenceDetails || it.description}\n`;
        if (accountantNotes[it.id]) {
          text += `   - Despacho da Contabilidade: ${accountantNotes[it.id]}\n`;
        }
      });
      text += `\n*Recomendação:* Providenciar Carta de Correção Eletrônica (CC-e) ou substituição/reemissão do documento fiscal em estrita observância à NT 2026.010 da Reforma Tributária ou NT 008.\n`;
    } else {
      text += `Todos os parâmetros tributários, amarrações de Bloco W e alíquotas de IBS/CBS/ISSQN estão 100% regulares.\n`;
    }

    if (pendingManual.length > 0) {
      text += `\n*CONTROLES INTERNOS EM ANDAMENTO:*\n`;
      pendingManual.forEach(it => {
        text += `- ${it.title} (${it.normaRef})\n`;
      });
    }

    text += `\n_Relatório emitido pela Controladoria / Auditoria Fiscal do Gestão 360._`;
    return text;
  };

  const handleCopyNotification = () => {
    const text = generateSupplierNotificationText();
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  // Filtro de Inconsistências
  const filteredIssues = useMemo(() => {
    if (!diagnostic) return [];
    if (filterType === 'all') return diagnostic.issues;
    return diagnostic.issues.filter(i => i.type === filterType);
  }, [diagnostic, filterType]);

  const errorCount = diagnostic?.issues.filter(i => i.type === 'erro').length || 0;
  const warningCount = diagnostic?.issues.filter(i => i.type === 'aviso').length || 0;
  const successCount = diagnostic?.issues.filter(i => i.type === 'sucesso').length || 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F17] text-neutral-900 dark:text-neutral-100 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-300">
      
      {/* Barra Superior / Header Institucional */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#111622]/80 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onNavigateHome ? onNavigateHome : () => window.location.href = '/'}
              className="p-2.5 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-all group flex items-center gap-2"
              title="Voltar à Página Principal"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs font-bold hidden sm:inline uppercase tracking-wider">Início</span>
            </button>
            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800" />
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Scale size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-neutral-900 dark:text-white">
                    GESTÃO 360
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    Audit Fiscal 2026
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden md:block">
                  {currentInstitution ? currentInstitution.name : 'Portal de Auditoria e Pré-Validação da Reforma Tributária'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60 px-3 py-1.5 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50">
              <Landmark size={14} className="text-emerald-500" />
              <span>NT 2026.010 (NF-e 55) & NT 008 (NFS-e Nacional)</span>
            </div>

            {/* Seletor de Modo: Simples vs Avançado */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'simple' ? 'advanced' : 'simple')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                viewMode === 'simple'
                  ? 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
              }`}
              title={viewMode === 'simple' ? 'Alternar para Modo Avançado / Checklist' : 'Alternar para Modo Simples'}
            >
              {viewMode === 'simple' ? (
                <>
                  <Sliders size={15} className="text-emerald-500" />
                  <span className="hidden sm:inline">Modo Avançado / Checklist</span>
                  <span className="sm:hidden">Avançado</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span className="hidden sm:inline">Modo Simples (Recomendado)</span>
                  <span className="sm:hidden">Simples</span>
                </>
              )}
            </button>

            {setDarkMode && (
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer"
                title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {viewMode === 'simple' ? (
          <SimpleNotaFiscalValidator 
            darkMode={darkMode}
            currentInstitution={currentInstitution}
            onSwitchToAdvanced={() => setViewMode('advanced')}
            onRunAdvancedAudit={(content, name) => handleRunAudit(content, name)}
          />
        ) : (
          <div className="space-y-8">
            {/* Barra de retorno ao Modo Simples */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <Sliders size={16} className="text-emerald-500 shrink-0" />
                Você está no <strong>Modo Avançado de Perícia Fiscal</strong> (Checklist do Contador, Nós XML, Bloco W e Espelho DANFE).
              </span>
              <button
                type="button"
                onClick={() => setViewMode('simple')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <Sparkles size={13} /> Voltar ao Modo Simples
              </button>
            </div>
        
        {/* Hero Banner Informativo */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white p-8 md:p-10 shadow-2xl border border-neutral-800">
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/4 -top-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> Balcão de Conformidade e Pré-Envio
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Auditor Fiscal da <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Reforma Tributária</span>
            </h1>
            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
              Auditoria de conformidade com diferenciação técnica entre <strong>Nota de Consumo / Mercadorias</strong> (NF-e 55 / NFC-e 65 com chave de <strong>44 dígitos</strong>) e <strong>Nota de Serviço</strong> (NFS-e Padrão Nacional com chave de <strong>50 dígitos</strong>). 
              Validação matemática rigorosa do <strong>Grupo UB (IBS UF, IBS Mun, CBS)</strong>, Imposto Seletivo (IS), ISSQN e regras de transição de 2026.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={13} className="text-emerald-400" /> Nota de Consumo: Chave de 44 dígitos (NF-e 55 / NFC-e 65)
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={13} className="text-cyan-400" /> Nota de Serviço: Chave de 50 dígitos (NFS-e Nacional NT 008)
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-neutral-300 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" /> 100% Processado no Navegador (Privacidade Total)
              </span>
            </div>
          </div>
        </div>

        {/* 1. SELETOR PRINCIPAL DE ENTRADA: NOTA DE CONSUMO (44 DÍGITOS) vs NOTA DE SERVIÇO (50 DÍGITOS) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-500" />
              1. Selecione o Tipo de Documento Fiscal para Auditoria:
            </span>
            <span className="text-[11px] text-neutral-400 font-bold">
              Atenção ao tamanho da Chave de Acesso: Consumo (44 dígitos) e Serviço (50 dígitos)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Nota de Consumo / Mercadorias */}
            <button
              type="button"
              onClick={() => {
                setDocCategory('consumo');
                setSimDocType('NFE_55');
              }}
              className={`p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden cursor-pointer group ${
                docCategory === 'consumo'
                  ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:to-neutral-900 border-emerald-500 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:border-emerald-300 dark:hover:border-emerald-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    docCategory === 'consumo'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 group-hover:text-emerald-600'
                  }`}>
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      Nota de Consumo / Mercadorias
                    </h3>
                    <p className="text-xs text-neutral-500">
                      NF-e Modelo 55 & NFC-e Modelo 65
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-xl font-mono text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  44 DÍGITOS
                </span>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                Auditoria de produtos, atacado e consumo final. Validação das amarrações do <strong>Bloco W</strong> (ICMSTot & UBTot), Grupo UB da Reforma Tributária (IBS/CBS/IS) e cálculo do Dígito Verificador pelo Módulo 11.
              </p>

              <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between text-[11px]">
                <span className="font-bold text-neutral-500">Chave de Acesso:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Exatamente 44 dígitos numéricos
                </span>
              </div>
            </button>

            {/* Card 2: Nota de Serviço */}
            <button
              type="button"
              onClick={() => {
                setDocCategory('servico');
                setSimDocType('NFSE_NACIONAL');
              }}
              className={`p-5 rounded-3xl border-2 text-left transition-all relative overflow-hidden cursor-pointer group ${
                docCategory === 'servico'
                  ? 'bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-white dark:to-neutral-900 border-cyan-500 shadow-lg shadow-cyan-500/15 ring-2 ring-cyan-500/20'
                  : 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:border-cyan-300 dark:hover:border-cyan-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    docCategory === 'servico'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 group-hover:text-cyan-600'
                  }`}>
                    <Wrench size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                      Nota de Serviço (NFS-e Nacional)
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Padrão Nacional CGSN · NT 008 / DANFSe
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-xl font-mono text-xs font-black uppercase tracking-wider bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                  50 DÍGITOS
                </span>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                Auditoria de prestação de serviços municipais. Validação do subgrupo <strong>tribReforma</strong> (alíquotas efetivas de IBS Municipal/Estadual e CBS), retenções municipais e conciliação com ISSQN.
              </p>

              <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between text-[11px]">
                <span className="font-bold text-neutral-500">Chave de Acesso:</span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  Exatamente 50 dígitos numéricos
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. SELEÇÃO DE ABAS DO AUDITOR (MODALIDADE DE INSERÇÃO) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-2 p-1.5 bg-neutral-200/60 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('chave')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'chave'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <KeyRound size={16} /> Digitar Chave ({docCategory === 'consumo' ? '44' : '50'} dígitos)
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Upload size={16} /> Upload XML / PDF
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <FileCode size={16} /> Colar XML / JSON
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'calculator'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Calculator size={16} /> Simulador Reforma 2026
            </button>
          </div>

          {/* Quick Presets de Teste com destaque para os dígitos */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap">Exemplos Rápidos:</span>
            <button
              onClick={() => loadPreset('nfeConforme')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold hover:bg-emerald-100 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-200 dark:bg-emerald-900 font-mono font-black">44</span>
              Consumo Conforme
            </button>
            <button
              onClick={() => loadPreset('nfeBlocoW')}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-bold hover:bg-rose-100 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-200 dark:bg-rose-900 font-mono font-black">44</span>
              Consumo c/ Erro Bloco W
            </button>
            <button
              onClick={() => loadPreset('nfseConforme')}
              className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 text-xs font-bold hover:bg-cyan-100 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-200 dark:bg-cyan-900 font-mono font-black">50</span>
              Serviço NT 008
            </button>
          </div>
        </div>

        {/* ÁREA DE ENTRADA: DIGITAR CHAVE DE ACESSO */}
        {activeTab === 'chave' && (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    docCategory === 'consumo'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                  }`}>
                    {docCategory === 'consumo' ? 'Chave de 44 Dígitos · Consumo / Mercadorias' : 'Chave de 50 Dígitos · Serviço Padrão Nacional'}
                  </span>
                  <span className="text-xs text-neutral-400">Reforma Tributária 2026</span>
                </div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <KeyRound size={20} className={docCategory === 'consumo' ? 'text-emerald-500' : 'text-cyan-500'} />
                  {docCategory === 'consumo' 
                    ? 'Auditar Nota de Consumo por Chave de Acesso (44 dígitos)' 
                    : 'Auditar Nota de Serviço por Chave de Acesso (50 dígitos)'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {docCategory === 'consumo'
                    ? 'Informe a chave de 44 dígitos da NF-e (Modelo 55) ou NFC-e (Modelo 65). O validador calculará o dígito verificador pelo Módulo 11.'
                    : 'Informe a chave de 50 dígitos da NFS-e Nacional (Resolução CGSN 169/2022). O validador decodificará município, prestador e número.'}
                </p>
              </div>

              {/* Botões de Preenchimento Rápido de Teste */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFillSampleKey(docCategory)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={13} className="text-amber-500" />
                  Preencher Exemplo ({docCategory === 'consumo' ? '44 dígitos' : '50 dígitos'})
                </button>
                {chaveInput && (
                  <button
                    type="button"
                    onClick={() => setChaveInput('')}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer px-2"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Alertas Inteligentes de Inversão de Chave (50 dígitos em consumo ou 44 dígitos em serviço) */}
            {keyAnalysis.isMismatchServiceInConsumo && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm animate-pulse">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" size={20} />
                  <div className="text-xs">
                    <strong className="block font-black text-sm text-amber-950 dark:text-amber-100 mb-0.5">
                      Atenção: Chave de 50 dígitos detectada!
                    </strong>
                    Você está no modo <strong>Nota de Consumo (esperado 44 dígitos)</strong>, mas a chave informada possui <strong>50 dígitos</strong>, característica exclusiva de <strong>Nota de Serviço (NFS-e Padrão Nacional)</strong>.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDocCategory('servico');
                    setSimDocType('NFSE_NACIONAL');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  <ArrowRightLeft size={14} /> Alternar para Nota de Serviço
                </button>
              </div>
            )}

            {keyAnalysis.isMismatchConsumoInService && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-sm animate-pulse">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" size={20} />
                  <div className="text-xs">
                    <strong className="block font-black text-sm text-amber-950 dark:text-amber-100 mb-0.5">
                      Atenção: Chave de 44 dígitos detectada!
                    </strong>
                    Você está no modo <strong>Nota de Serviço (esperado 50 dígitos)</strong>, mas a chave informada possui <strong>44 dígitos</strong>, característica de <strong>Nota de Consumo (NF-e 55 ou NFC-e 65)</strong>.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDocCategory('consumo');
                    setSimDocType('NFE_55');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-all shadow-md flex items-center gap-1.5"
                >
                  <ArrowRightLeft size={14} /> Alternar para Nota de Consumo
                </button>
              </div>
            )}

            {/* Campo Principal de Entrada da Chave */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                  <span>Chave de Acesso</span>
                  <span className="font-mono text-neutral-400">({docCategory === 'consumo' ? '44' : '50'} dígitos)</span>
                </label>

                {/* Contador de Dígitos com Feedback de Cor */}
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                    keyAnalysis.isComplete
                      ? (keyAnalysis.isValid ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800')
                      : keyAnalysis.cleanLength > keyAnalysis.expectedDigits
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      : keyAnalysis.cleanLength > 0
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                  }`}>
                    {keyAnalysis.cleanLength} / {keyAnalysis.expectedDigits} dígitos
                    {keyAnalysis.isComplete && (keyAnalysis.isValid ? ' ✓ Válida' : ' ✗ Inconsistente')}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Visual de Dígitos */}
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    keyAnalysis.isComplete
                      ? (keyAnalysis.isValid ? 'bg-emerald-500' : 'bg-rose-500')
                      : keyAnalysis.cleanLength > keyAnalysis.expectedDigits
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  }`}
                  style={{ width: `${Math.min(100, (keyAnalysis.cleanLength / keyAnalysis.expectedDigits) * 100)}%` }}
                />
              </div>

              {/* Input Monospace Grande */}
              <div className="relative">
                <textarea
                  rows={2}
                  value={chaveInput}
                  onChange={(e) => setChaveInput(e.target.value)}
                  placeholder={
                    docCategory === 'consumo'
                      ? 'Cole aqui a chave de 44 dígitos da Nota de Consumo (ex: 3526 0100 0000 0000 0191 5500 1000 0012 3412 3456 7890)'
                      : 'Cole aqui a chave de 50 dígitos da Nota de Serviço (ex: 3550 3081 0000 0000 0191 0000 1000 0000 0000 0101 1234 5678)'
                  }
                  className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 font-mono text-sm sm:text-base text-neutral-800 dark:text-neutral-200 border-2 border-neutral-200 dark:border-neutral-800 focus:outline-hidden focus:border-emerald-500 dark:focus:border-emerald-500 transition-all resize-none tracking-wider"
                />
              </div>

              {/* Orientação sobre a estrutura */}
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {docCategory === 'consumo'
                  ? 'Estrutura da Chave (44 dígitos): UF (2) + AAMM (4) + CNPJ (14) + Modelo 55/65 (2) + Série (3) + Número (9) + Tipo Emissão (1) + Código (8) + Dígito Verificador Módulo 11 (1).'
                  : 'Estrutura da Chave (50 dígitos): Cód. Município IBGE (7) + Tipo Inscrição (1) + CNPJ/CPF (14) + Série (5) + Número da NFS-e (15) + Cód. Verificação/Segurança (8).'}
              </p>
            </div>

            {/* Painel de Decodificação e Inspeção da Chave em Tempo Real */}
            {keyAnalysis.cleanLength >= 10 && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100/60 dark:from-neutral-950 dark:to-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    <Hash size={14} className="text-emerald-500" />
                    Inspeção Estrutural da Chave em Tempo Real
                  </span>
                  <span className="text-[11px] font-bold text-neutral-400">
                    {docCategory === 'consumo' ? 'Modelo 55/65 (44 dígitos)' : 'NFS-e Padrão Nacional (50 dígitos)'}
                  </span>
                </div>

                {docCategory === 'consumo' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block">UF Emissora</span>
                      <span className="text-xs font-black text-neutral-900 dark:text-white block truncate" title={keyAnalysis.nfeData?.ufNome}>
                        {keyAnalysis.nfeData?.ufNome || 'Aguardando...'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block">Mês/Ano</span>
                      <span className="text-xs font-black text-neutral-900 dark:text-white block">
                        {keyAnalysis.nfeData?.mesAnoFormatado || 'Aguardando...'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 col-span-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block">CNPJ do Emitente</span>
                      <span className="text-xs font-black text-neutral-900 dark:text-white block font-mono truncate" title={keyAnalysis.nfeData?.cnpjFormatado}>
                        {keyAnalysis.nfeData?.cnpjFormatado || 'Aguardando dígitos...'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block">Modelo Fiscal</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block truncate" title={keyAnalysis.nfeData?.modeloNome}>
                        {keyAnalysis.nfeData?.mod ? `Mod ${keyAnalysis.nfeData.mod}` : 'Aguardando...'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block">Dígito Verificador</span>
                      {keyAnalysis.cleanLength === 44 ? (
                        keyAnalysis.nfeData?.valid ? (
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={12} /> DV {keyAnalysis.nfeData.cDV} Válido
                          </span>
                        ) : (
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1" title={keyAnalysis.nfeData?.reason}>
                            <XCircle size={12} /> DV Inválido
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-neutral-400">Aguardando 44 dígitos</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 col-span-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block">Município IBGE</span>
                      <span className="text-xs font-black text-neutral-900 dark:text-white block truncate" title={keyAnalysis.nfseData?.munNome}>
                        {keyAnalysis.nfseData?.munNome || 'Aguardando...'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 col-span-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                        Inscrição Prestador ({keyAnalysis.nfseData?.tipoInscricaoNome || 'CNPJ'})
                      </span>
                      <span className="text-xs font-black text-neutral-900 dark:text-white block font-mono truncate" title={keyAnalysis.nfseData?.inscFormatada}>
                        {keyAnalysis.nfseData?.inscFormatada || 'Aguardando dígitos...'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block">Série / Número</span>
                      <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 block truncate">
                        {keyAnalysis.nfseData?.nNFSe ? `Nº ${keyAnalysis.nfseData.nNFSe}` : 'Aguardando...'}
                      </span>
                    </div>

                    <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase block">Código Verificação</span>
                      <span className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 block truncate">
                        {keyAnalysis.nfseData?.cVerif || (keyAnalysis.cleanLength === 50 ? 'Identificado' : 'Aguardando 50 dígitos')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botão Principal de Auditoria da Chave */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <span className="text-xs text-neutral-500">
                {keyAnalysis.isComplete
                  ? `Pronto para auditar a ${docCategory === 'consumo' ? 'Nota de Consumo (44 dígitos)' : 'Nota de Serviço (50 dígitos)'}.`
                  : `Digite todos os ${keyAnalysis.expectedDigits} dígitos da chave para iniciar a conferência.`}
              </span>

              <button
                disabled={!keyAnalysis.isComplete || isAuditing}
                onClick={handleAuditByChave}
                className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                  keyAnalysis.isComplete
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 hover:scale-105 active:scale-95'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-60'
                }`}
              >
                {isAuditing ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Auditar Documento por Chave de Acesso
              </button>
            </div>
          </div>
        )}

        {/* ÁREA DE ENTRADA: UPLOAD */}
        {activeTab === 'upload' && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4 ${
              isDragging 
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]' 
                : 'border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
            }`}
          >
            {/* Indicador do Modo Selecionado na Aba de Upload */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs">
              <span className="font-bold text-neutral-500">Modo Selecionado:</span>
              <span className={`font-black ${docCategory === 'consumo' ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                {docCategory === 'consumo' ? 'Nota de Consumo / Mercadorias (44 dígitos)' : 'Nota de Serviço (50 dígitos)'}
              </span>
              <button
                type="button"
                onClick={() => setDocCategory(docCategory === 'consumo' ? 'servico' : 'consumo')}
                className="ml-2 text-[10px] font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline cursor-pointer"
              >
                Mudar para {docCategory === 'consumo' ? 'Nota de Serviço (50 dígitos)' : 'Nota de Consumo (44 dígitos)'}
              </button>
            </div>

            <div className="w-16 h-16 mx-auto rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 group-hover:scale-105 transition-transform">
              <Upload size={32} className={docCategory === 'consumo' ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'} />
            </div>

            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 mb-1">
                Arraste e solte seu arquivo XML, JSON ou PDF (DANFE) aqui
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
                {docCategory === 'consumo'
                  ? 'Compatível com XML e PDF de NF-e (Modelo 55) e NFC-e (Modelo 65) contendo chave de 44 dígitos.'
                  : 'Compatível com XML e PDF de NFS-e (Padrão Nacional NT 008) contendo chave de 50 dígitos.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black text-xs uppercase tracking-wider shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer">
                <FileCode size={16} /> Selecionar Arquivo ({docCategory === 'consumo' ? 'NF-e/NFC-e' : 'NFS-e'})
                <input 
                  type="file" 
                  accept=".xml,.json,.txt,.pdf,application/pdf" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>
            </div>

            {pdfReadError && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs text-left max-w-md mx-auto flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Falha ao processar PDF:</span>
                  {pdfReadError}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Área de Entrada: Editor Monospace */}
        {activeTab === 'editor' && (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <FileCode size={18} className="text-emerald-500" />
                  Colar Conteúdo XML, JSON ou Chave de Acesso
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Cole o código fonte completo do documento fiscal ou diretamente a Chave de Acesso (44 dígitos para Nota de Consumo ou 50 dígitos para Nota de Serviço).
                </p>
              </div>
              {xmlInput && (
                <button
                  onClick={() => { setXmlInput(''); setDiagnostic(null); setFileName(''); }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                >
                  Limpar Editor
                </button>
              )}
            </div>

            <textarea
              value={xmlInput}
              onChange={(e) => setXmlInput(e.target.value)}
              placeholder="Cole aqui seu XML (<NFe> ou <CompNFSe>), payload JSON ou Chave de Acesso pura (44 dígitos de Consumo ou 50 dígitos de Serviço)..."
              rows={12}
              className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 font-mono text-xs text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all resize-y"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-neutral-400">
                Se você colar apenas os números da chave (44 ou 50 dígitos), o validador reconstruirá a estrutura fiscal para pré-auditoria automaticamente.
              </span>
              <button
                disabled={!xmlInput.trim() || isAuditing}
                onClick={() => handleRunAudit(xmlInput, 'Documento Colado Manualmente')}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                {isAuditing ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Auditar Documento
              </button>
            </div>
          </div>
        )}

        {/* Área de Entrada: Simulador Interativo */}
        {activeTab === 'calculator' && (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
            <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Calculator size={20} className="text-emerald-500" />
                  Simulador e Calculadora da Reforma Tributária (2026)
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Calcule a incidência exata do IBS Estadual, IBS Municipal, CBS e ISSQN de acordo com as regras de transição.
                </p>
              </div>

              {/* Seletor Nota de Consumo vs Nota de Serviço */}
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSimDocType('NFE_55');
                    setDocCategory('consumo');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    simDocType === 'NFE_55' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-black' : 'text-neutral-500'
                  }`}
                >
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">44 dig</span>
                  Nota de Consumo (NF-e 55)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimDocType('NFSE_NACIONAL');
                    setDocCategory('servico');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    simDocType === 'NFSE_NACIONAL' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-black' : 'text-neutral-500'
                  }`}
                >
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-mono font-bold">50 dig</span>
                  Nota de Serviço (NFS-e Nacional)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Valor Base */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Valor da Operação / Base (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={simBaseValue}
                  onChange={(e) => setSimBaseValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 font-bold text-base border border-neutral-200 dark:border-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Alíquota IBS Estadual */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                  <span>IBS Estadual (UF) %</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">2026: 0.05%</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={simIBSUFRate}
                  onChange={(e) => setSimIBSUFRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 font-bold text-base border border-neutral-200 dark:border-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Alíquota IBS Municipal */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                  <span>IBS Municipal %</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">2026: 0.05%</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={simIBSMunRate}
                  onChange={(e) => setSimIBSMunRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 font-bold text-base border border-neutral-200 dark:border-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Alíquota CBS Federal */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                  <span>CBS Federal %</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">2026: 0.90%</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={simCBSRate}
                  onChange={(e) => setSimCBSRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 font-bold text-base border border-neutral-200 dark:border-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Configurações extras de tributos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {simDocType === 'NFSE_NACIONAL' ? (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Alíquota de ISSQN Municipal</h4>
                    <p className="text-[11px] text-neutral-500">LC 116/2003 (mínimo 2%, máximo 5%)</p>
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      step="0.1"
                      min="2"
                      max="5"
                      value={simISSQNRate}
                      onChange={(e) => setSimISSQNRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 font-bold text-sm text-right border border-neutral-200 dark:border-neutral-800"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="simISCheck"
                      checked={simHasIS}
                      onChange={(e) => setSimHasIS(e.target.checked)}
                      className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="simISCheck" className="text-xs font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer">
                      Incidência de Imposto Seletivo (IS)
                      <span className="block text-[11px] text-neutral-500 font-normal">Aplicável a bens prejudiciais à saúde/ambiente</span>
                    </label>
                  </div>
                  {simHasIS && (
                    <div className="w-24">
                      <input
                        type="number"
                        step="0.1"
                        value={simISRate}
                        onChange={(e) => setSimISRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 font-bold text-sm text-right border border-neutral-200 dark:border-neutral-800"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Botão de Geração de XML Automático */}
              <div className="flex items-center justify-end">
                <button
                  onClick={handleGenerateFromSim}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={16} /> Gerar e Auditar Rascunho com Estes Valores
                </button>
              </div>
            </div>

            {/* Painel de Resultados do Simulador */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-950 dark:to-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">IBS Estadual</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  R$ {simCalculated.ibsUF.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-neutral-400 block">{simIBSUFRate}%</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">IBS Municipal</span>
                <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                  R$ {simCalculated.ibsMun.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-neutral-400 block">{simIBSMunRate}%</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">CBS Federal</span>
                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                  R$ {simCalculated.cbs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-neutral-400 block">{simCBSRate}%</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                  {simDocType === 'NFSE_NACIONAL' ? 'ISSQN Municipal' : (simHasIS ? 'Imposto Seletivo' : 'Total Reforma')}
                </span>
                <span className="text-lg font-black text-neutral-900 dark:text-neutral-100">
                  R$ {(simDocType === 'NFSE_NACIONAL' ? simCalculated.issqn : (simHasIS ? simCalculated.is : simCalculated.totalReforma)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-neutral-400 block">
                  {simDocType === 'NFSE_NACIONAL' ? `${simISSQNRate}%` : (simHasIS ? `${simISRate}%` : '1.00% Transição')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* LOADING INDICATOR */}
        {isAuditing && (
          <div className="p-12 text-center space-y-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm animate-pulse">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
              {isReadingPdf 
                ? 'Lendo PDF e Extraindo Dados da Nota Fiscal com IA...' 
                : 'Auditando Documento sob a NT 2026.010 & NT 008...'}
            </p>
            {isReadingPdf && (
              <p className="text-[11px] text-neutral-400 max-w-md mx-auto">
                Reconhecendo chaves de acesso, itens, alíquotas do IBS/CBS e amarrações fiscais.
              </p>
            )}
          </div>
        )}

        {/* RESULTADO DA AUDITORIA */}
        {diagnostic && !isAuditing && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Banner de Status Geral */}
            <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 ${
              diagnostic.status === 'conforme'
                ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-emerald-500/30'
                : diagnostic.status === 'aviso'
                ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 border-amber-500/30'
                : 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-red-500/10 border-rose-500/30'
            }`}>
              <div className="flex items-start sm:items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  diagnostic.status === 'conforme'
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : diagnostic.status === 'aviso'
                    ? 'bg-amber-500 text-white shadow-amber-500/30'
                    : 'bg-rose-500 text-white shadow-rose-500/30'
                }`}>
                  {diagnostic.status === 'conforme' && <ShieldCheck size={36} />}
                  {diagnostic.status === 'aviso' && <AlertTriangle size={36} />}
                  {diagnostic.status === 'erro' && <XCircle size={36} />}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      diagnostic.status === 'conforme'
                        ? 'bg-emerald-500 text-white'
                        : diagnostic.status === 'aviso'
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}>
                      {diagnostic.status === 'conforme' ? 'Documento Conforme' : diagnostic.status === 'aviso' ? 'Ressalvas / Avisos' : 'Inconsistência Crítica'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      diagnostic.docType === 'NFE_55'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                    }`}>
                      {diagnostic.docType === 'NFE_55' ? 'Nota de Consumo (NF-e 55 / 44 dígitos)' : 'Nota de Serviço (NFS-e Nacional / 50 dígitos)'}
                    </span>
                    {fileName && (
                      <span className="text-xs font-medium text-neutral-400 truncate max-w-xs">
                        · {fileName}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-black text-neutral-900 dark:text-white">
                    {diagnostic.status === 'conforme' && 'Aprovado para Envio e Homologação'}
                    {diagnostic.status === 'aviso' && 'Atenção aos Parâmetros de Transição'}
                    {diagnostic.status === 'erro' && 'Risco de Rejeição Imediata na SEFAZ/Prefeitura'}
                  </h2>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                    {diagnostic.status === 'conforme' && 'Todos os cálculos matemáticos de IBS, CBS e amarração com o Bloco W conferem com as normas técnicas.'}
                    {diagnostic.status === 'aviso' && 'O documento possui apontamentos que merecem verificação antes da transmissão definitiva.'}
                    {diagnostic.status === 'erro' && 'Foram identificadas divergências matemáticas ou ausência de tags obrigatórias que resultarão em rejeição.'}
                  </p>
                </div>
              </div>

              {/* Ações do Relatório */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {pdfMetadata && (
                  <button
                    onClick={() => {
                      if (!xmlInput) return;
                      const blob = new Blob([xmlInput], { type: 'application/xml;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fileName ? `${fileName.replace(/\.[^/.]+$/, '')}_auditado.xml` : 'nota_fiscal_auditada.xml';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                    title="Baixar o arquivo XML gerado a partir da leitura do PDF"
                  >
                    <Download size={14} /> Baixar XML do PDF
                  </button>
                )}
                <button
                  onClick={handleCopyDiagnostic}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-50 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar Laudo'}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:bg-neutral-800 transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer size={14} /> Imprimir Laudo
                </button>
              </div>
            </div>

            {/* Sumário em Cards (KPIs Fiscais) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Valor Total
                </span>
                <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                  R$ {diagnostic.summary.vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-neutral-500 block truncate">
                  Doc nº {diagnostic.summary.docNumber}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  IBS Total (UF + Mun)
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                  R$ {diagnostic.summary.vIBS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  Reforma Tributária
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  CBS Total
                </span>
                <span className="text-base sm:text-lg font-black text-cyan-600 dark:text-cyan-400">
                  R$ {diagnostic.summary.vCBS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  Federal
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  {diagnostic.summary.vISSQN !== undefined ? 'ISSQN Municipal' : 'Imposto Seletivo'}
                </span>
                <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                  R$ {((diagnostic.summary.vISSQN ?? diagnostic.summary.vIS) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  {diagnostic.summary.vISSQN !== undefined ? 'Tributo Municipal' : 'Tributação Especial'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs col-span-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Partes Envolvidas
                </span>
                <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate" title={diagnostic.summary.emitter}>
                  <span className="text-neutral-400">Emit:</span> {diagnostic.summary.emitter}
                </div>
                <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate" title={diagnostic.summary.recipient}>
                  <span className="text-neutral-400">Dest:</span> {diagnostic.summary.recipient}
                </div>
              </div>
            </div>

            {/* Sub-abas de Detalhamento */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 px-6 pt-4 gap-4 overflow-x-auto">
                <button
                  onClick={() => setResultSubTab('checklist')}
                  className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    resultSubTab === 'checklist'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <ClipboardCheck size={16} /> Checklist do Contador
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    checklistStats.percent >= 90
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : checklistStats.percent >= 70
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {checklistStats.passed}/{checklistStats.total} ({checklistStats.percent}%)
                  </span>
                </button>

                <button
                  onClick={() => setResultSubTab('issues')}
                  className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    resultSubTab === 'issues'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <AlertCircle size={15} /> Diagnóstico e Inconsistências
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {diagnostic.issues.length}
                  </span>
                </button>

                <button
                  onClick={() => setResultSubTab('items')}
                  className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    resultSubTab === 'items'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Layers size={15} /> Itens e Grupo UB
                  {diagnostic.extra?.itemsCount ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {diagnostic.extra.itemsCount}
                    </span>
                  ) : null}
                </button>

                <button
                  onClick={() => setResultSubTab('danfe')}
                  className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    resultSubTab === 'danfe'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <FileText size={15} /> Prévia Visual do Documento
                </button>

                <button
                  onClick={() => setResultSubTab('xml')}
                  className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    resultSubTab === 'xml'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <FileCode size={15} /> XML Auditado
                </button>
              </div>

              {/* CONTEÚDO SUB-ABA NO RISK: CHECKLIST DO CONTADOR */}
              {resultSubTab === 'checklist' && (
                <div className="p-6 space-y-6">
                  {/* Painel Superior: Progresso de Conformidade & Ações Rápidas */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100/60 dark:from-neutral-950 dark:to-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs">
                    {/* Barra de Progresso e Métricas */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <ClipboardCheck size={20} />
                          </span>
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                              Roteiro Oficial de Conferência Contábil & Fiscal
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Validações automáticas da NT 2026.010 / NT 008 + Controles de Liquidação da Lei 4.320/64
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-neutral-900 dark:text-white">
                            {checklistStats.percent}%
                          </span>
                          <span className="text-xs font-bold text-neutral-500">
                            Conformidade ({checklistStats.passed} de {checklistStats.total})
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso Visual */}
                      <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            checklistStats.percent >= 90 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                              : checklistStats.percent >= 70 
                              ? 'bg-gradient-to-r from-amber-500 to-emerald-500' 
                              : 'bg-gradient-to-r from-rose-500 to-amber-500'
                          }`}
                          style={{ width: `${checklistStats.percent}%` }}
                        />
                      </div>

                      {/* Pílulas de Totais por Status */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={13} /> {checklistStats.passed} Conformes / Atestados
                        </span>
                        {checklistStats.failed > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-100/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                            <XCircle size={13} /> {checklistStats.failed} Inconsistências
                          </span>
                        )}
                        {checklistStats.warnings > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle size={13} /> {checklistStats.warnings} Alertas
                          </span>
                        )}
                        {checklistStats.pending > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-100/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                            <UserCheck size={13} /> {checklistStats.pending} Pendentes de Atesto
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação do Contador */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={handleCheckAllAdministrative}
                        className="px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Marca Empenho, Atesto do Fiscal, CNDs e Duplicidade como conferidos"
                      >
                        <CheckCheck size={14} className="text-indigo-500" /> Atestar Administrativos
                      </button>

                      <button
                        onClick={() => setShowNotificationModal(true)}
                        className="px-3.5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Gera mensagem formal para WhatsApp ou E-mail com as exigências identificadas"
                      >
                        <MessageSquare size={14} /> Notificar Fornecedor
                      </button>

                      <button
                        onClick={handlePrint}
                        className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 text-xs font-bold hover:bg-neutral-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer size={14} /> Imprimir Laudo
                      </button>

                      <button
                        onClick={handleCheckAll}
                        className="px-2.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold hover:bg-neutral-200 transition-all cursor-pointer"
                        title="Aprovar todos os pontos do checklist"
                      >
                        Aprovar Todos
                      </button>

                      {Object.keys(manualChecks).length > 0 && (
                        <button
                          onClick={handleResetChecks}
                          className="px-2.5 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all cursor-pointer"
                          title="Restaurar estado original das validações"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Barra de Filtros por Categoria e Status */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                    {/* Filtro de Categoria */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                        Dimensões:
                      </span>
                      {[
                        { id: 'all', label: 'Todas as Áreas' },
                        { id: 'validade', label: '1. Validade Cadastral' },
                        { id: 'classificacao', label: '2. NCM & Itens' },
                        { id: 'calculos_reforma', label: '3. Reforma IBS/CBS' },
                        { id: 'issqn_retencoes', label: '4. ISSQN & Retenções' },
                        { id: 'contabil_administrativo', label: '5. Empenho / Lei 4.320' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setChecklistCategoryFilter(cat.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            checklistCategoryFilter === cat.id
                              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Filtro de Status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                        Status:
                      </span>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'conforme', label: 'Aprovados' },
                        { id: 'inconsistente', label: 'Erros' },
                        { id: 'aviso', label: 'Alertas' },
                        { id: 'pendente_manual', label: 'Pendentes' }
                      ].map(st => (
                        <button
                          key={st.id}
                          onClick={() => setChecklistStatusFilter(st.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            checklistStatusFilter === st.id
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Listagem dos Itens do Checklist */}
                  <div className="space-y-3.5">
                    {filteredChecklist.length === 0 ? (
                      <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs">
                        Nenhum item do checklist corresponde aos filtros selecionados.
                      </div>
                    ) : (
                      filteredChecklist.map((item, idx) => {
                        const isChecked = manualChecks[item.id] !== undefined ? manualChecks[item.id] : (item.status === 'conforme');
                        const isManuallyOverridden = manualChecks[item.id] !== undefined;

                        return (
                          <div 
                            key={item.id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                              isChecked
                                ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-900/30'
                                : item.status === 'inconsistente'
                                ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 shadow-xs'
                                : item.status === 'aviso'
                                ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xs'
                            }`}
                          >
                            <div className="flex items-start gap-3.5">
                              {/* Botão de Checkbox Interativo */}
                              <button
                                onClick={() => handleToggleCheck(item.id)}
                                className="mt-0.5 shrink-0 transition-transform active:scale-90 cursor-pointer"
                                title={isChecked ? 'Clique para desmarcar conferência' : 'Clique para marcar como atestado e conforme'}
                              >
                                {isChecked ? (
                                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                    <Check size={16} strokeWidth={3} />
                                  </div>
                                ) : item.status === 'inconsistente' ? (
                                  <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-500 flex items-center justify-center">
                                    <XCircle size={14} />
                                  </div>
                                ) : item.status === 'aviso' ? (
                                  <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500 text-amber-600 flex items-center justify-center">
                                    <AlertTriangle size={14} />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-600 flex items-center justify-center hover:border-neutral-400">
                                    <Square size={14} className="text-neutral-400" />
                                  </div>
                                )}
                              </button>

                              {/* Conteúdo Principal do Item */}
                              <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                      {item.categoryTitle.split('.')[1]?.trim() || item.category}
                                    </span>

                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 border border-neutral-200 dark:border-neutral-700">
                                      {item.normaRef}
                                    </span>

                                    {isManuallyOverridden && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                                        Atesto Manual do Contador
                                      </span>
                                    )}
                                  </div>

                                  {/* Badge de Status Oficial */}
                                  <div>
                                    {isChecked ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Conforme
                                      </span>
                                    ) : item.status === 'inconsistente' ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                        <XCircle size={12} /> Inconsistência Crítica
                                      </span>
                                    ) : item.status === 'aviso' ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <AlertTriangle size={12} /> Alerta / Ressalva
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        <UserCheck size={12} /> Atesto Pendente
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Título e Descrição */}
                                <div>
                                  <h4 className="text-sm font-black text-neutral-900 dark:text-neutral-100">
                                    {item.title}
                                  </h4>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                                    {item.description}
                                  </p>
                                </div>

                                {/* Caixa de Diagnóstico / Detalhes de Auditoria */}
                                {item.divergenceDetails && (
                                  <div className={`p-3 rounded-xl text-xs font-mono border ${
                                    isChecked
                                      ? 'bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
                                      : item.status === 'inconsistente'
                                      ? 'bg-rose-100/60 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-900/60 font-bold'
                                      : 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-900/60'
                                  }`}>
                                    <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                                      Constatação Técnica:
                                    </span>
                                    {item.divergenceDetails}
                                  </div>
                                )}

                                {/* Campo de Anotações do Contador / Número do Empenho */}
                                <div className="pt-1">
                                  <div className="flex items-center gap-2">
                                    <PenLine size={13} className="text-neutral-400 shrink-0" />
                                    <input
                                      type="text"
                                      value={accountantNotes[item.id] || ''}
                                      onChange={(e) => handleUpdateNote(item.id, e.target.value)}
                                      placeholder="Anotação do contador / Nº do empenho / processo de pagamento..."
                                      className="w-full text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* CONTEÚDO SUB-ABA 2: ISSUES (DIAGNÓSTICO E INCONSISTÊNCIAS) */}
              {resultSubTab === 'issues' && (
                <div className="p-6 space-y-6">
                  {/* Filtro de severidade */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          filterType === 'all'
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        Todos ({diagnostic.issues.length})
                      </button>
                      <button
                        onClick={() => setFilterType('erro')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          filterType === 'erro'
                            ? 'bg-rose-500 text-white'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        Erros ({errorCount})
                      </button>
                      <button
                        onClick={() => setFilterType('aviso')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          filterType === 'aviso'
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        Avisos ({warningCount})
                      </button>
                      <button
                        onClick={() => setFilterType('sucesso')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          filterType === 'sucesso'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        Conformes ({successCount})
                      </button>
                    </div>

                    {diagnostic.extra?.rawKey && (
                      <div className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-xl text-neutral-600 dark:text-neutral-300">
                        Chave: {diagnostic.extra.rawKey}
                      </div>
                    )}
                  </div>

                  {/* Lista de Issues */}
                  <div className="space-y-3">
                    {filteredIssues.map((issue, idx) => (
                      <div 
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          issue.type === 'erro'
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                            : issue.type === 'aviso'
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                            : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {issue.type === 'erro' && <XCircle size={18} className="text-rose-500" />}
                              {issue.type === 'aviso' && <AlertTriangle size={18} className="text-amber-500" />}
                              {issue.type === 'sucesso' && <CheckCircle2 size={18} className="text-emerald-500" />}
                            </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                  {issue.tagOrField}
                                </span>
                                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                  {issue.title}
                                </h4>
                              </div>
                              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                                {issue.description}
                              </p>
                            </div>
                          </div>

                          {/* Comparação Esperado vs Encontrado */}
                          {(issue.expected !== undefined || issue.found !== undefined) && (
                            <div className="shrink-0 flex items-center gap-2 text-xs font-mono bg-white dark:bg-neutral-800/80 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700">
                              {issue.expected !== undefined && (
                                <div className="text-right">
                                  <span className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block font-bold">Esperado</span>
                                  <span className="font-bold text-neutral-800 dark:text-neutral-200">{issue.expected}</span>
                                </div>
                              )}
                              {issue.expected !== undefined && issue.found !== undefined && (
                                <div className="text-neutral-300 dark:text-neutral-600">|</div>
                              )}
                              {issue.found !== undefined && (
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider text-rose-600 dark:text-rose-400 block font-bold">Encontrado</span>
                                  <span className="font-bold text-neutral-800 dark:text-neutral-200">{issue.found}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CONTEÚDO SUB-ABA 2: ITENS & GRUPO UB */}
              {resultSubTab === 'items' && (
                <div className="p-6 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase tracking-wider font-bold">
                          <th className="py-3 px-3">#</th>
                          <th className="py-3 px-3">Descrição do Item</th>
                          <th className="py-3 px-3">Valor / Base</th>
                          <th className="py-3 px-3">IBS Estadual</th>
                          <th className="py-3 px-3">IBS Municipal</th>
                          <th className="py-3 px-3">CBS Federal</th>
                          <th className="py-3 px-3">IS / ISSQN</th>
                          <th className="py-3 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {diagnostic.extra?.items && diagnostic.extra.items.length > 0 ? (
                          diagnostic.extra.items.map((it) => (
                            <tr key={it.itemNumber} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                              <td className="py-3.5 px-3 font-mono font-bold text-neutral-500">
                                {it.itemNumber}
                              </td>
                              <td className="py-3.5 px-3">
                                <span className="font-bold text-neutral-900 dark:text-white block">
                                  {it.description}
                                </span>
                                {it.cClassTrib && (
                                  <span className="text-[10px] text-neutral-400 font-mono">
                                    cClassTrib: {it.cClassTrib} {it.ncm ? `| NCM: ${it.ncm}` : ''}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 font-mono font-medium">
                                R$ {it.vBC.toFixed(2)}
                              </td>
                              <td className="py-3.5 px-3 font-mono">
                                <span className="block font-bold text-emerald-600 dark:text-emerald-400">
                                  R$ {it.vIBSUF.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-neutral-400">({it.pIBSUF}%)</span>
                              </td>
                              <td className="py-3.5 px-3 font-mono">
                                <span className="block font-bold text-teal-600 dark:text-teal-400">
                                  R$ {it.vIBSMun.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-neutral-400">({it.pIBSMun}%)</span>
                              </td>
                              <td className="py-3.5 px-3 font-mono">
                                <span className="block font-bold text-cyan-600 dark:text-cyan-400">
                                  R$ {it.vCBS.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-neutral-400">({it.pCBS}%)</span>
                              </td>
                              <td className="py-3.5 px-3 font-mono">
                                {it.vIS ? (
                                  <div>
                                    <span className="font-bold text-indigo-500">R$ {it.vIS.toFixed(2)}</span>
                                    <span className="text-[10px] text-neutral-400 block">IS ({it.pIS}%)</span>
                                  </div>
                                ) : (
                                  <span className="text-neutral-400">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                {it.hasErrors ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                                    <XCircle size={11} /> Erro de Cálculo
                                  </span>
                                ) : it.hasWarnings ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                                    <AlertTriangle size={11} /> Aviso 2026
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 size={11} /> Conforme
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-neutral-400">
                              Nenhum item com grupo UB identificado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CONTEÚDO SUB-ABA 3: PRÉVIA VISUAL DANFE/DANFSe */}
              {resultSubTab === 'danfe' && (
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Prévia do DANFE / DANFSe estilizado */}
                  <div className="max-w-4xl mx-auto bg-white dark:bg-neutral-950 p-6 sm:p-8 rounded-2xl border-2 border-neutral-300 dark:border-neutral-800 shadow-md font-sans space-y-6 text-neutral-900 dark:text-neutral-100">
                    
                    {/* Cabeçalho do DANFE */}
                    <div className="border-b-2 border-neutral-900 dark:border-neutral-700 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                          DANFE - REFORMA TRIBUTÁRIA NT 2026.010
                        </span>
                        <h3 className="text-xl font-black">
                          {diagnostic.summary.emitter}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {diagnostic.docType === 'NFE_55' 
                            ? 'Documento Auxiliar da Nota Fiscal de Consumo (Modelo 55/65 · Chave de 44 dígitos)' 
                            : 'Documento Auxiliar da Nota Fiscal de Serviço (DANFSe Padrão Nacional · Chave de 50 dígitos)'}
                        </p>
                      </div>

                      <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl text-right">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">Número da Nota</span>
                        <span className="text-lg font-black">{diagnostic.summary.docNumber}</span>
                        {diagnostic.extra?.emissionDate && (
                          <span className="text-[10px] text-neutral-400 block">
                            Emissão: {new Date(diagnostic.extra.emissionDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bloco de Chave de Acesso */}
                    {diagnostic.extra?.rawKey && (
                      <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center font-mono text-xs space-y-1">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">
                            Chave de Acesso
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            diagnostic.docType === 'NFE_55'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                          }`}>
                            {diagnostic.docType === 'NFE_55' ? '44 Dígitos · Nota de Consumo' : '50 Dígitos · Nota de Serviço'}
                          </span>
                        </div>
                        <span className="font-black tracking-widest text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm block">
                          {diagnostic.extra.rawKey.replace(/(\d{4})/g, '$1 ').trim()}
                        </span>
                      </div>
                    )}

                    {/* Bloco Destinatário */}
                    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Destinatário / Tomador
                      </span>
                      <div className="text-sm font-bold">{diagnostic.summary.recipient}</div>
                    </div>

                    {/* NOVO BLOCO DA REFORMA TRIBUTÁRIA NO DANFE */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 border-2 border-emerald-500/30 space-y-4">
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                          <Landmark size={15} /> Quadro da Reforma Tributária (IBS / CBS / IS)
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          NT 2026.010
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase block">Base IBS/CBS</span>
                          <span className="text-sm font-black text-neutral-900 dark:text-white">
                            R$ {diagnostic.summary.vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase block">Total IBS Estadual</span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                            R$ {(diagnostic.extra?.totals.declared.vIBSUF || (diagnostic.summary.vIBS / 2)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase block">Total IBS Municipal</span>
                          <span className="text-sm font-black text-teal-600 dark:text-teal-400">
                            R$ {(diagnostic.extra?.totals.declared.vIBSMun || (diagnostic.summary.vIBS / 2)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase block">Total CBS</span>
                          <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                            R$ {diagnostic.summary.vCBS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Total Geral da Nota */}
                    <div className="flex items-center justify-between p-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl font-bold">
                      <span className="text-xs uppercase tracking-wider">Valor Total da Nota Fiscal</span>
                      <span className="text-xl font-black">
                        R$ {diagnostic.summary.vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO SUB-ABA 4: XML AUDITADO */}
              {resultSubTab === 'xml' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      Código Fonte do Documento
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(xmlInput);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copiado!' : 'Copiar XML'}
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-neutral-950 text-neutral-200 font-mono text-xs overflow-x-auto max-h-96 border border-neutral-800">
                    {xmlInput}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* MODAL DE NOTIFICAÇÃO AO FORNECEDOR / PRESTADOR */}
        {showNotificationModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-2xl w-full p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Notificação Formal de Exigências / Reprovação
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Mensagem formatada para envio direto via WhatsApp, E-mail ou Ofício ao Fornecedor
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                  <span>Texto da Notificação Gerado:</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Pronto para Envio</span>
                </label>
                <textarea
                  readOnly
                  rows={12}
                  value={generateSupplierNotificationText()}
                  className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 font-mono text-xs text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 focus:outline-hidden resize-none select-all leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs text-neutral-400">
                  {checklistStats.failed > 0 
                    ? `Contém ${checklistStats.failed} inconsistência(s) fiscal(is) detalhada(s).`
                    : 'Documento conforme. Notificação de aprovação contábil.'}
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      const text = generateSupplierNotificationText();
                      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Send size={14} /> Abrir WhatsApp Web
                  </button>

                  <button
                    onClick={handleCopyNotification}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copiedNotification ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copiedNotification ? 'Copiado!' : 'Copiar Texto'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* LAUDO OFICIAL DE IMPRESSÃO (EXIBIDO APENAS NO PRINT) */}
        {diagnostic && (
          <div className="hidden print:block text-black bg-white p-8 font-serif text-xs space-y-6">
            {/* Cabeçalho do Laudo */}
            <div className="text-center border-b-2 border-black pb-4 space-y-1">
              <h1 className="text-lg font-black uppercase tracking-wider">
                GESTÃO 360 · CONTROLE INTERNO & AUDITORIA FISCAL
              </h1>
              <h2 className="text-sm font-bold uppercase">
                LAUDO TÉCNICO DE CONFERÊNCIA FISCAL E LIQUIDAÇÃO CONTÁBIL
              </h2>
              <p className="text-[10px] text-neutral-600">
                Auditoria de Conformidade sob a NT 2026.010 (Reforma Tributária IBS/CBS), NT 008 e Art. 63 da Lei 4.320/1964
              </p>
            </div>

            {/* Dados de Identificação */}
            <div className="grid grid-cols-2 gap-4 border p-3 rounded-sm text-xs">
              <div>
                <p><strong>Documento:</strong> {diagnostic.docType === 'NFE_55' ? 'NF-e Modelo 55 (DANFE Reforma)' : 'NFS-e Padrão Nacional'} nº {diagnostic.summary.docNumber}</p>
                <p><strong>Emitente:</strong> {diagnostic.summary.emitter}</p>
                <p><strong>Destinatário / Órgão:</strong> {diagnostic.summary.recipient}</p>
                {diagnostic.extra?.emissionDate && (
                  <p><strong>Data de Emissão:</strong> {new Date(diagnostic.extra.emissionDate).toLocaleDateString('pt-BR')}</p>
                )}
              </div>
              <div>
                <p><strong>Valor Total da Nota:</strong> R$ {diagnostic.summary.vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>IBS Total (UF + Mun):</strong> R$ {diagnostic.summary.vIBS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>CBS Federal Total:</strong> R$ {diagnostic.summary.vCBS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>Índice de Conformidade:</strong> {checklistStats.percent}% ({checklistStats.passed} de {checklistStats.total} itens aprovados)</p>
              </div>
            </div>

            {/* Tabela do Checklist dos 22 Pontos */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider border-b pb-1">
                Quadro Demonstrativo dos 22 Pontos de Controle Auditados
              </h3>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b-2 border-black bg-neutral-100">
                    <th className="p-1.5 w-8">#</th>
                    <th className="p-1.5">Ponto de Auditoria</th>
                    <th className="p-1.5">Base Legal</th>
                    <th className="p-1.5 w-24">Status Oficial</th>
                    <th className="p-1.5">Anotações do Contador / Processo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-300">
                  {checklist.map((item, idx) => {
                    const isChecked = manualChecks[item.id] !== undefined ? manualChecks[item.id] : (item.status === 'conforme');
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="p-1.5 font-mono">{idx + 1}</td>
                        <td className="p-1.5">
                          <strong>{item.title}</strong>
                          <div className="text-neutral-600">{item.description}</div>
                        </td>
                        <td className="p-1.5 text-neutral-600">{item.normaRef}</td>
                        <td className="p-1.5 font-bold">
                          {isChecked ? 'CONFORME' : item.status === 'inconsistente' ? 'INCONSISTENTE' : item.status === 'aviso' ? 'RESSALVA' : 'PENDENTE'}
                        </td>
                        <td className="p-1.5 italic text-neutral-800">
                          {accountantNotes[item.id] || item.divergenceDetails || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Termo de Atesto e Assinatura */}
            <div className="pt-6 space-y-8">
              <div className="p-3 border text-justify text-[11px] leading-relaxed">
                <strong>DESPACHO CONTÁBIL:</strong> Certifico para os devidos fins de liquidação e pagamento da despesa pública, 
                nos termos dos Artigos 62 e 63 da Lei Federal nº 4.320/1964, que o documento fiscal retroidentificado foi submetido 
                à conferência eletrônica de integridade cadastral, classificação tributária, alíquotas do IBS/CBS da Reforma Tributária 
                (NT 2026.010) e amarrações com a Nota de Empenho e atesto de recebimento, encontrando-se com índice de conformidade de <strong>{checklistStats.percent}%</strong>.
              </div>

              <div className="grid grid-cols-2 gap-8 text-center pt-8">
                <div className="space-y-1">
                  <div className="border-b border-black w-3/4 mx-auto pb-6" />
                  <p className="font-bold">Contador(a) / Auditor(a) Responsável</p>
                  <p className="text-[10px] text-neutral-500">CRC / Matrícula Funcional</p>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-black w-3/4 mx-auto pb-6" />
                  <p className="font-bold">Ordenador de Despesas / Fiscal de Contrato</p>
                  <p className="text-[10px] text-neutral-500">Secretaria / Unidade Orçamentária</p>
                </div>
              </div>

              <div className="text-center text-[9px] text-neutral-400 pt-4">
                Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} via Portal Gestão 360 · Hash de Autenticidade: {diagnostic.summary.docNumber}-{Date.now().toString(36).toUpperCase()}
              </div>
            </div>
          </div>
        )}

          </div>
        )}

        {/* Rodapé Informativo / Suporte da Reforma */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8 pb-12 text-center space-y-3 print:hidden">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            GESTÃO 360 · Motor de Inteligência e Conformidade Tributária
          </p>
          <p className="text-xs text-neutral-500 max-w-xl mx-auto">
            Este validador executa regras estritas da NT 2026.010 (NF-e Modelo 55) e NT 008 (NFS-e Padrão Nacional). 
            Em caso de dúvidas sobre classificação fiscal ou divergência de alíquotas, consulte a assessoria contábil do seu município ou órgão fazendário.
          </p>
        </div>
      </main>
    </div>
  );
};
