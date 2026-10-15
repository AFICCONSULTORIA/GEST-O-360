import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2, FileCode, Upload, 
  FileText, Sparkles, Copy, Check, Printer, RefreshCw, Calculator, 
  HelpCircle, ChevronRight, ArrowLeft, ArrowRight, Download, Eye, 
  Building2, Landmark, Scale, DollarSign, Layers, Info, Search, 
  Sliders, AlertCircle, Share2, CornerDownRight, BarChart3, Sun, Moon
} from 'lucide-react';
import { 
  auditFiscalDocument, 
  FiscalDiagnostic, 
  SAMPLE_DOCUMENTS, 
  roundCurrency, 
  validateChaveNFe, 
  validateChaveNFSeNacional 
} from '../utils/fiscalValidatorEngine';
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
  // Estados de entrada e auditoria
  const [activeTab, setActiveTab] = useState<'upload' | 'editor' | 'calculator'>('upload');
  const [xmlInput, setXmlInput] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [diagnostic, setDiagnostic] = useState<FiscalDiagnostic | null>(null);
  const [resultSubTab, setResultSubTab] = useState<'issues' | 'items' | 'danfe' | 'xml'>('issues');
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'erro' | 'aviso' | 'sucesso'>('all');

  // Estados do Simulador / Calculadora
  const [simDocType, setSimDocType] = useState<'NFE_55' | 'NFSE_NACIONAL'>('NFE_55');
  const [simBaseValue, setSimBaseValue] = useState<number>(10000);
  const [simIBSUFRate, setSimIBSUFRate] = useState<number>(0.05); // 0.05% teste 2026
  const [simIBSMunRate, setSimIBSMunRate] = useState<number>(0.05); // 0.05% teste 2026
  const [simCBSRate, setSimCBSRate] = useState<number>(0.90); // 0.90% teste 2026
  const [simHasIS, setSimHasIS] = useState<boolean>(false);
  const [simISRate, setSimISRate] = useState<number>(1.5);
  const [simISSQNRate, setSimISSQNRate] = useState<number>(3.0);

  // Execução da auditoria
  const handleRunAudit = (content: string, name?: string) => {
    setIsAuditing(true);
    if (name) setFileName(name);
    setXmlInput(content);

    // Simulação visual de alta performance
    setTimeout(() => {
      const res = auditFiscalDocument(content);
      setDiagnostic(res);
      setIsAuditing(false);
      setResultSubTab('issues');
    }, 280);
  };

  // Leitura de Arquivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleRunAudit(content, file.name);
    };
    reader.readAsText(file);
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

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleRunAudit(content, file.name);
    };
    reader.readAsText(file);
  };

  // Carregar exemplos pré-definidos
  const loadPreset = (type: 'nfeConforme' | 'nfeBlocoW' | 'nfseConforme') => {
    let sample = '';
    let label = '';
    if (type === 'nfeConforme') {
      sample = SAMPLE_DOCUMENTS.nfe2026Conforme;
      label = 'NF-e 55 Conforme (Reforma 2026)';
    } else if (type === 'nfeBlocoW') {
      sample = SAMPLE_DOCUMENTS.nfe2026ComDivergenciaBlocoW;
      label = 'NF-e 55 com Divergência no Bloco W';
    } else {
      sample = SAMPLE_DOCUMENTS.nfseNacionalConforme;
      label = 'NFS-e Padrão Nacional (NT 008)';
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
      handleRunAudit(xml, 'Simulação Personalizada da Reforma (NF-e 55)');
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
      handleRunAudit(xml, 'Simulação NFS-e NT 008 Padrão Nacional');
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
              Audite seus arquivos XML de NF-e (Modelo 55) e NFS-e (Padrão Nacional) antes do envio à SEFAZ ou Prefeitura. 
              Validação matemática rigorosa do <strong>Grupo UB (IBS UF, IBS Mun, CBS)</strong>, Imposto Seletivo (IS), ISSQN, 
              amarração com o Bloco W e regras de transição de 2026.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-neutral-300 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" /> 100% Processado no Navegador (Privacidade Total)
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-neutral-300 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" /> NT 2026.010 & NT 008 Homologadas
              </span>
            </div>
          </div>
        </div>

        {/* Seleção de Abas do Auditor */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-2 p-1.5 bg-neutral-200/60 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Upload size={16} /> Upload de XML
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <FileCode size={16} /> Colar XML / JSON
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'calculator'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Calculator size={16} /> Simulador Reforma 2026
            </button>
          </div>

          {/* Quick Presets de Teste */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap">Exemplos Rápidos:</span>
            <button
              onClick={() => loadPreset('nfeConforme')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold hover:bg-emerald-100 transition-all whitespace-nowrap cursor-pointer"
            >
              NF-e Conforme (2026)
            </button>
            <button
              onClick={() => loadPreset('nfeBlocoW')}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-bold hover:bg-rose-100 transition-all whitespace-nowrap cursor-pointer"
            >
              NF-e c/ Erro Bloco W
            </button>
            <button
              onClick={() => loadPreset('nfseConforme')}
              className="px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 text-xs font-bold hover:bg-cyan-100 transition-all whitespace-nowrap cursor-pointer"
            >
              NFS-e NT 008
            </button>
          </div>
        </div>

        {/* Área de Entrada: Upload */}
        {activeTab === 'upload' && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center transition-all duration-200 bg-white dark:bg-neutral-900/60 shadow-sm ${
              isDragging 
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]' 
                : 'border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
            }`}
          >
            <div className="w-20 h-20 mx-auto rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 mb-6 group-hover:scale-105 transition-transform">
              <Upload size={36} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 mb-2">
              Arraste e solte seu arquivo XML ou JSON aqui
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
              Suporta arquivos de NF-e (Modelo 55), NFS-e Nacional, DPS ou lotes em formato XML/JSON.
            </p>
            
            <label className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black text-xs uppercase tracking-wider shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <FileCode size={16} /> Selecionar Arquivo do Computador
              <input 
                type="file" 
                accept=".xml,.json,.txt" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          </div>
        )}

        {/* Área de Entrada: Editor Monospace */}
        {activeTab === 'editor' && (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100">
                  Colar Conteúdo XML ou Rascunho
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Cole o código fonte do documento fiscal para auditoria imediata.
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
              placeholder="Cole aqui seu XML (<NFe> ou <CompNFSe>) ou payload JSON..."
              rows={12}
              className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 font-mono text-xs text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all resize-y"
            />

            <div className="flex justify-end gap-3">
              <button
                disabled={!xmlInput.trim() || isAuditing}
                onClick={() => handleRunAudit(xmlInput, 'Documento Colado Manualmente')}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
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

              {/* Seletor NF-e vs NFS-e */}
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                <button
                  onClick={() => setSimDocType('NFE_55')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    simDocType === 'NFE_55' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-500'
                  }`}
                >
                  NF-e (Mercadorias/Modelo 55)
                </button>
                <button
                  onClick={() => setSimDocType('NFSE_NACIONAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    simDocType === 'NFSE_NACIONAL' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-500'
                  }`}
                >
                  NFS-e (Serviços/NT 008)
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
              Auditando Documento sob a NT 2026.010 & NT 008...
            </p>
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
                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                      {diagnostic.docType === 'NFE_55' ? 'NF-e Modelo 55 (DANFE Reforma)' : diagnostic.docType === 'NFSE_NACIONAL' ? 'NFS-e DANFSe Padrão Nacional' : 'Documento Fiscal'}
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

              {/* CONTEÚDO SUB-ABA 1: ISSUES */}
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
                          Documento Auxiliar da Nota Fiscal Eletrônica - Modelo {diagnostic.docType === 'NFE_55' ? '55' : 'NFS-e Nacional'}
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
                      <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center font-mono text-xs">
                        <span className="text-[9px] uppercase tracking-widest text-neutral-400 block font-bold mb-1">
                          Chave de Acesso
                        </span>
                        <span className="font-black tracking-widest text-neutral-800 dark:text-neutral-200">
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

        {/* Rodapé Informativo / Suporte da Reforma */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-8 pb-12 text-center space-y-3">
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
