import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, Calendar, FileText, Printer, Trash2, Edit3, 
  Paperclip, Image, Download, X, CheckCircle2, AlertTriangle, 
  XCircle, Clock, MessageSquare, Mail, Building, User, DollarSign, 
  ExternalLink, RefreshCw, ShieldCheck, ChevronRight, Filter, Eye,
  Sparkles, Check, Copy
} from 'lucide-react';
import { 
  RegistroAlteracaoContabil, 
  CanalSolicitacao, 
  AcaoContadora, 
  CANAIS_SOLICITACAO, 
  ACOES_CONTADORA_CONFIG, 
  SETORES_SUGESTOES, 
  DOCUMENTOS_SUGESTOES 
} from '../types/livroContadora';
import { livroContadoraService } from '../services/livroContadoraService';
import { gerarFichaResguardoHtml } from './FichaResguardoPDF';

interface LivroAlteracoesContabeisProps {
  searchQuery?: string;
}

export const LivroAlteracoesContabeis: React.FC<LivroAlteracoesContabeisProps> = ({ 
  searchQuery = '' 
}) => {
  const [registros, setRegistros] = useState<RegistroAlteracaoContabil[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [canalFilter, setCanalFilter] = useState<string>('all');
  const [acaoFilter, setAcaoFilter] = useState<string>('all');
  const [mesFilter, setMesFilter] = useState<string>(''); // YYYY-MM

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<RegistroAlteracaoContabil | null>(null);
  const [viewingComprovante, setViewingComprovante] = useState<RegistroAlteracaoContabil | null>(null);

  // Formulário de Cadastro Rápido (Tela Única)
  const [formSolicitanteNome, setFormSolicitanteNome] = useState('');
  const [formSolicitanteSetorCargo, setFormSolicitanteSetorCargo] = useState('');
  const [formCanal, setFormCanal] = useState<CanalSolicitacao>('WhatsApp');
  const [formDocumentoAfetado, setFormDocumentoAfetado] = useState('');
  const [formDataPedido, setFormDataPedido] = useState(new Date().toISOString().slice(0, 10));
  const [formValor, setFormValor] = useState('');
  const [formOQueFoiPedido, setFormOQueFoiPedido] = useState('');
  const [formJustificativa, setFormJustificativa] = useState('');
  const [formAcao, setFormAcao] = useState<AcaoContadora>('Aprovado e Feito');
  const [formDataHoraExecucao, setFormDataHoraExecucao] = useState(new Date().toISOString().slice(0, 16));
  const [formObsTecnica, setFormObsTecnica] = useState('');
  
  // Anexo (Print ou PDF)
  const [formComprovanteNome, setFormComprovanteNome] = useState('');
  const [formComprovanteUrl, setFormComprovanteUrl] = useState('');
  const [formComprovanteTipo, setFormComprovanteTipo] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await livroContadoraService.getRegistros();
      setRegistros(data);
    } catch (err) {
      console.error('Erro ao carregar registros da contadora:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Abre modal para novo registro
  const openNewModal = () => {
    setEditingRegistro(null);
    setFormSolicitanteNome('');
    setFormSolicitanteSetorCargo('Sec. de Finanças / Fazenda');
    setFormCanal('WhatsApp');
    setFormDocumentoAfetado('');
    setFormDataPedido(new Date().toISOString().slice(0, 10));
    setFormValor('');
    setFormOQueFoiPedido('');
    setFormJustificativa('');
    setFormAcao('Aprovado e Feito');
    setFormDataHoraExecucao(new Date().toISOString().slice(0, 16));
    setFormObsTecnica('');
    setFormComprovanteNome('');
    setFormComprovanteUrl('');
    setFormComprovanteTipo('');
    setIsModalOpen(true);
  };

  // Abre modal para edição
  const openEditModal = (item: RegistroAlteracaoContabil) => {
    setEditingRegistro(item);
    setFormSolicitanteNome(item.solicitanteNome);
    setFormSolicitanteSetorCargo(item.solicitanteSetorCargo);
    setFormCanal(item.canalSolicitacao);
    setFormDocumentoAfetado(item.documentoAfetado);
    setFormDataPedido(item.dataPedido);
    setFormValor(item.valorEnvolvido ? String(item.valorEnvolvido) : '');
    setFormOQueFoiPedido(item.oQueFoiPedido);
    setFormJustificativa(item.justificativaAlegada || '');
    setFormAcao(item.acaoDaContadora);
    setFormDataHoraExecucao(item.dataHoraExecucao ? item.dataHoraExecucao.slice(0, 16) : '');
    setFormObsTecnica(item.observacaoTecnicaContadora || '');
    setFormComprovanteNome(item.comprovanteNome || '');
    setFormComprovanteUrl(item.comprovanteUrl || '');
    setFormComprovanteTipo(item.comprovanteTipo || '');
    setIsModalOpen(true);
  };

  // Leitura de Arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('O arquivo deve ter no máximo 15MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormComprovanteNome(file.name);
      setFormComprovanteUrl(reader.result as string);
      setFormComprovanteTipo(file.type || 'image/png');
      showToast(`Comprovante "${file.name}" anexado!`);
    };
    reader.onerror = () => showToast('Erro ao ler arquivo selecionado.', 'error');
    reader.readAsDataURL(file);
  };

  // Suporte a Colar Print direto da área de transferência (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const fileName = `print_whatsapp_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.png`;
            setFormComprovanteNome(fileName);
            setFormComprovanteUrl(reader.result as string);
            setFormComprovanteTipo('image/png');
            showToast('Print colado da área de transferência com sucesso!');
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const removeComprovante = () => {
    setFormComprovanteNome('');
    setFormComprovanteUrl('');
    setFormComprovanteTipo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Salvar Registro
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSolicitanteNome.trim()) {
      showToast('Informe quem solicitou a alteração!', 'error');
      return;
    }
    if (!formDocumentoAfetado.trim()) {
      showToast('Informe qual documento foi afetado (ex: Empenho 432/2026)!', 'error');
      return;
    }
    if (!formOQueFoiPedido.trim()) {
      showToast('Descreva o que o solicitante pediu para alterar!', 'error');
      return;
    }

    const parsedValor = parseFloat(formValor.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

    const payload: any = {
      solicitanteNome: formSolicitanteNome.trim(),
      solicitanteSetorCargo: formSolicitanteSetorCargo.trim() || 'Servidor Municipal',
      canalSolicitacao: formCanal,
      documentoAfetado: formDocumentoAfetado.trim(),
      dataPedido: formDataPedido,
      valorEnvolvido: parsedValor,
      oQueFoiPedido: formOQueFoiPedido.trim(),
      justificativaAlegada: formJustificativa.trim(),
      acaoDaContadora: formAcao,
      dataHoraExecucao: formDataHoraExecucao ? new Date(formDataHoraExecucao).toISOString() : undefined,
      observacaoTecnicaContadora: formObsTecnica.trim(),
      comprovanteNome: formComprovanteNome || undefined,
      comprovanteUrl: formComprovanteUrl || undefined,
      comprovanteTipo: formComprovanteTipo || undefined
    };

    try {
      if (editingRegistro) {
        await livroContadoraService.updateRegistro(editingRegistro.id, payload);
        showToast('Registro de alteração atualizado!');
      } else {
        await livroContadoraService.createRegistro(payload);
        showToast('Solicitação registrada com sucesso no Livro!');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao gravar registro.', 'error');
    }
  };

  // Excluir Registro
  const handleDelete = async (item: RegistroAlteracaoContabil) => {
    if (window.confirm(`Excluir o registro de "${item.documentoAfetado}" pedido por ${item.solicitanteNome}?`)) {
      await livroContadoraService.deleteRegistro(item.id);
      showToast('Registro removido do livro.');
      loadData();
    }
  };

  // Exportar Ficha em PDF A4
  const handlePrintFicha = (item: RegistroAlteracaoContabil) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = gerarFichaResguardoHtml(item, {
      municipioNome: 'Prefeitura Municipal',
      estadoNome: 'ESTADO DE MATO GROSSO',
      contadoraNome: 'Contadoria Geral Municipal',
      contadoraCrc: 'CRC/MT Ativo'
    });

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  // Filtragem
  const filteredRegistros = useMemo(() => {
    const term = (localSearch || searchQuery).toLowerCase().trim();

    return registros.filter(item => {
      const matchesSearch = 
        !term ||
        item.solicitanteNome.toLowerCase().includes(term) ||
        item.solicitanteSetorCargo.toLowerCase().includes(term) ||
        item.documentoAfetado.toLowerCase().includes(term) ||
        item.oQueFoiPedido.toLowerCase().includes(term) ||
        (item.justificativaAlegada && item.justificativaAlegada.toLowerCase().includes(term));

      const matchesCanal = canalFilter === 'all' || item.canalSolicitacao === canalFilter;
      const matchesAcao = acaoFilter === 'all' || item.acaoDaContadora === acaoFilter;
      const matchesMes = !mesFilter || item.dataPedido.startsWith(mesFilter);

      return matchesSearch && matchesCanal && matchesAcao && matchesMes;
    });
  }, [registros, localSearch, searchQuery, canalFilter, acaoFilter, mesFilter]);

  // Estatísticas Rápidas
  const totalCount = registros.length;
  const feitosCount = registros.filter(r => r.acaoDaContadora === 'Aprovado e Feito').length;
  const recusadosCount = registros.filter(r => r.acaoDaContadora === 'Recusado').length;
  const ressalvaCount = registros.filter(r => r.acaoDaContadora === 'Feito com Ressalva').length;

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200" onPaste={isModalOpen ? handlePaste : undefined}>
      {/* Toast de Feedback */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white animate-in slide-in-from-bottom-5 duration-150 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header do Módulo */}
      <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck size={13} />
            Livro Oficial de Resguardo da Contadora
          </div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            Registro de Alterações Contábeis
          </h2>
          <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
            Cadastre rapidamente pedidos de alteração em empenhos, liquidações e dotações solicitados por terceiros. Anexe os prints do WhatsApp, e-mails ou ofícios para provar que a alteração não foi por conta própria em auditorias do TCE.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
        >
          <Plus size={18} />
          <span>+ Novo Registro</span>
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <p className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">Total de Pedidos</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-neutral-900 dark:text-white">{totalCount}</span>
            <span className="text-[11px] font-bold text-neutral-500">no Livro</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
          <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Aprovados / Feitos</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{feitosCount}</span>
            <span className="text-[11px] font-bold text-emerald-600/70">Executados</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/40 shadow-sm">
          <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Com Ressalva</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{ressalvaCount}</span>
            <span className="text-[11px] font-bold text-amber-600/70">Alertados</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-rose-100 dark:border-rose-900/40 shadow-sm">
          <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Recusados</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{recusadosCount}</span>
            <span className="text-[11px] font-bold text-rose-600/70">Indeferidos</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca Rápida */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
            <input 
              type="text"
              placeholder="Buscar por empenho, nome do assessor/secretário, setor ou texto do pedido..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Filtro por Mês/Ano */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl" title="Filtrar por Mês">
              <Calendar size={13} className="text-indigo-600 shrink-0" />
              <input 
                type="month"
                value={mesFilter}
                onChange={(e) => setMesFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
              />
              {mesFilter && (
                <button
                  type="button"
                  onClick={() => setMesFilter('')}
                  className="text-neutral-400 hover:text-rose-500 cursor-pointer ml-1"
                  title="Limpar filtro de mês"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filtro por Canal */}
            <select
              value={canalFilter}
              onChange={(e) => setCanalFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Canais</option>
              {CANAIS_SOLICITACAO.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            {/* Filtro por Ação */}
            <select
              value={acaoFilter}
              onChange={(e) => setAcaoFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Decisões</option>
              <option value="Aprovado e Feito">Aprovado e Feito</option>
              <option value="Feito com Ressalva">Feito com Ressalva</option>
              <option value="Recusado">Recusado</option>
              <option value="Em Análise">Em Análise</option>
            </select>

            {/* Recarregar */}
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 transition-colors cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Registros */}
      <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        {filteredRegistros.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 dark:text-neutral-400 flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-3xl flex items-center justify-center mb-3">
              <FileText size={30} />
            </div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100">
              Nenhum registro de alteração encontrado
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-md">
              {localSearch || canalFilter !== 'all' || acaoFilter !== 'all' || mesFilter
                ? 'Ajuste os filtros de pesquisa para visualizar os registros arquivados.'
                : 'Cadastre aqui todos os pedidos recebidos de secretários e assessores para garantir prova documental formal.'}
            </p>
            <button
              onClick={openNewModal}
              className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              + Novo Registro
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/60">
                  <th className="px-5 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Data & Canal</th>
                  <th className="px-5 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Quem Solicitou</th>
                  <th className="px-5 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Documento Afetado</th>
                  <th className="px-5 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">O Que Foi Pedido</th>
                  <th className="px-5 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest">Ação da Contadora</th>
                  <th className="px-5 py-4 text-[11px] font-black text-neutral-400 uppercase tracking-widest text-right">Ações & Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {filteredRegistros.map(item => {
                  const canalConf = CANAIS_SOLICITACAO.find(c => c.value === item.canalSolicitacao);
                  const acaoConf = ACOES_CONTADORA_CONFIG[item.acaoDaContadora] || ACOES_CONTADORA_CONFIG['Aprovado e Feito'];

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors group">
                      {/* Data & Canal */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                            <Calendar size={13} className="text-indigo-600" />
                            {formatDateDisplay(item.dataPedido)}
                          </span>
                          <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider w-max border ${canalConf?.cor || 'bg-neutral-100 text-neutral-700'}`}>
                            {item.canalSolicitacao === 'WhatsApp' ? <MessageSquare size={10} /> : <Mail size={10} />}
                            {item.canalSolicitacao}
                          </span>
                        </div>
                      </td>

                      {/* Quem Solicitou */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-xs text-neutral-900 dark:text-white flex items-center gap-1">
                            <User size={13} className="text-neutral-400" />
                            {item.solicitanteNome}
                          </span>
                          <span className="text-[11px] text-neutral-500 font-semibold mt-0.5">
                            {item.solicitanteSetorCargo}
                          </span>
                        </div>
                      </td>

                      {/* Documento Afetado */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <strong className="text-xs font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-lg w-max">
                            {item.documentoAfetado}
                          </strong>
                          {item.valorEnvolvido && item.valorEnvolvido > 0 ? (
                            <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mt-1">
                              {formatCurrency(item.valorEnvolvido)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* O Que Foi Pedido */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex flex-col">
                          <p className="text-xs text-neutral-800 dark:text-neutral-200 font-medium line-clamp-2" title={item.oQueFoiPedido}>
                            {item.oQueFoiPedido}
                          </p>
                          {item.justificativaAlegada && (
                            <span className="text-[10px] text-neutral-400 italic line-clamp-1 mt-0.5" title={`Justificativa: ${item.justificativaAlegada}`}>
                              Motivo: "{item.justificativaAlegada}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ação da Contadora */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-max border ${acaoConf.bg} ${acaoConf.text} ${acaoConf.border}`}>
                            {item.acaoDaContadora === 'Aprovado e Feito' ? <CheckCircle2 size={11} /> :
                             item.acaoDaContadora === 'Recusado' ? <XCircle size={11} /> : <AlertTriangle size={11} />}
                            {acaoConf.label}
                          </span>
                          {item.dataHoraExecucao && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              Exec: {new Date(item.dataHoraExecucao).toLocaleDateString('pt-BR')} às {new Date(item.dataHoraExecucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações & Ficha */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botão Ficha de Resguardo PDF */}
                          <button
                            onClick={() => handlePrintFicha(item)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-black uppercase flex items-center gap-1 cursor-pointer transition-all"
                            title="Gerar Ficha de Resguardo e Prova para Auditoria (PDF)"
                          >
                            <Printer size={13} />
                            <span className="hidden sm:inline">Ficha PDF</span>
                          </button>

                          {/* Ver Comprovante (Print ou Arquivo) */}
                          {item.comprovanteUrl ? (
                            <button
                              onClick={() => setViewingComprovante(item)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                              title="Visualizar print do WhatsApp ou documento anexado"
                            >
                              <Paperclip size={16} />
                            </button>
                          ) : null}

                          {/* Editar */}
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Editar registro"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Excluir registro"
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* MODAL: Cadastro Rápido de Tela Única */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-6">
          <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm" />

          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 w-full max-w-4xl relative shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-150 max-h-[94vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 mb-5 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  {editingRegistro ? 'Editar Registro' : 'Novo Registro Rápido'}
                </span>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-1">
                  {editingRegistro ? 'Atualizar Pedido de Alteração' : 'Registrar Solicitação Recebida'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Preencha em menos de 30 segundos para garantir a prova material do pedido recebido.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* BLOCO 1: Quem pediu e canal */}
              <div className="p-5 bg-neutral-50/70 dark:bg-neutral-950/40 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-3">
                <h4 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300 tracking-wider flex items-center gap-1.5">
                  <User size={14} className="text-indigo-600" />
                  1. Quem Solicitou e Como Enviou?
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                      Nome do Assessor / Solicitante *
                    </label>
                    <input 
                      type="text"
                      required
                      value={formSolicitanteNome}
                      onChange={(e) => setFormSolicitanteNome(e.target.value)}
                      placeholder="Ex: João da Silva (Assessor)"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                      Cargo / Secretaria / Setor *
                    </label>
                    <input 
                      type="text"
                      required
                      value={formSolicitanteSetorCargo}
                      onChange={(e) => setFormSolicitanteSetorCargo(e.target.value)}
                      placeholder="Ex: Sec. de Obras"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                      Canal de Comunicação *
                    </label>
                    <select
                      value={formCanal}
                      onChange={(e) => setFormCanal(e.target.value as CanalSolicitacao)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {CANAIS_SOLICITACAO.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sugestões Rápidas de Setores */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Atalhos:</span>
                  {SETORES_SUGESTOES.slice(0, 5).map(setor => (
                    <button
                      key={setor}
                      type="button"
                      onClick={() => setFormSolicitanteSetorCargo(setor)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-neutral-900 hover:bg-indigo-50 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 border border-neutral-200 dark:border-neutral-800 cursor-pointer"
                    >
                      {setor}
                    </button>
                  ))}
                </div>
              </div>

              {/* BLOCO 2: Qual documento e o que pediu */}
              <div className="p-5 bg-neutral-50/70 dark:bg-neutral-950/40 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-3">
                <h4 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300 tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" />
                  2. Documento Afetado e Descrição do Pedido
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                      Documento Afetado *
                    </label>
                    <input 
                      type="text"
                      required
                      value={formDocumentoAfetado}
                      onChange={(e) => setFormDocumentoAfetado(e.target.value)}
                      placeholder="Ex: Empenho 432/2026..."
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                      Data da Solicitação Recebida *
                    </label>
                    <div className="flex gap-1.5">
                      <input 
                        type="date"
                        required
                        value={formDataPedido}
                        onChange={(e) => setFormDataPedido(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setFormDataPedido(new Date().toISOString().slice(0, 10))}
                        className="px-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-xl text-[10px] font-black hover:bg-neutral-300 cursor-pointer"
                        title="Hoje"
                      >
                        Hoje
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                      Valor Envolvido (R$) (Opcional)
                    </label>
                    <input 
                      type="text"
                      value={formValor}
                      onChange={(e) => setFormValor(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                    O Que o Assessor / Setor Pediu para Alterar? *
                  </label>
                  <textarea 
                    rows={2}
                    required
                    value={formOQueFoiPedido}
                    onChange={(e) => setFormOQueFoiPedido(e.target.value)}
                    placeholder="Ex: Pediu para alterar o elemento de despesa do empenho de 3.3.90.30 para 3.3.90.39 e retificar a dotação..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                    Justificativa Alegada pelo Solicitante
                  </label>
                  <input 
                    type="text"
                    value={formJustificativa}
                    onChange={(e) => setFormJustificativa(e.target.value)}
                    placeholder="Ex: Erro no momento do cadastro da requisição no compras..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* BLOCO 3: Comprovante (Print do WhatsApp ou PDF) */}
              <div className="p-5 bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-purple-900 dark:text-purple-300 tracking-wider flex items-center gap-1.5">
                    <Paperclip size={14} className="text-purple-600" />
                    3. Prova Material: Anexar Print do WhatsApp, E-mail ou Ofício
                  </h4>
                  <span className="text-[10px] text-purple-600 font-bold">
                    💡 Dica: Você pode dar Ctrl + V aqui para colar prints direto!
                  </span>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".png,.jpg,.jpeg,.webp,.pdf"
                  className="hidden"
                />

                {formComprovanteUrl ? (
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      {formComprovanteTipo.startsWith('image/') ? (
                        <img src={formComprovanteUrl} className="w-12 h-12 object-cover rounded-lg border border-neutral-200" alt="Preview" />
                      ) : (
                        <FileText size={24} className="text-purple-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block truncate">
                          {formComprovanteNome || 'Comprovante Anexado'}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <Check size={11} /> Pronto para a Ficha de Resguardo
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={removeComprovante}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 border-2 border-dashed border-purple-300 dark:border-purple-800 hover:border-purple-500 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white/60 dark:bg-neutral-900/60 hover:bg-purple-50/50 transition-colors"
                  >
                    <Image size={24} className="text-purple-500" />
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                      Clique para anexar print ou PDF (ou pressione Ctrl+V para colar imagem)
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      PNG, JPG ou PDF (Máximo 15MB)
                    </span>
                  </button>
                )}
              </div>

              {/* BLOCO 4: Decisão e Execução pela Contadora */}
              <div className="p-5 bg-neutral-50/70 dark:bg-neutral-950/40 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-3">
                <h4 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-indigo-600" />
                  4. Ação da Contadora no Sistema da Prefeitura
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                      Decisão / Ação *
                    </label>
                    <select
                      value={formAcao}
                      onChange={(e) => setFormAcao(e.target.value as AcaoContadora)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Aprovado e Feito">Aprovado e Feito no ERP Contábil</option>
                      <option value="Feito com Ressalva">Feito com Ressalva Técnica</option>
                      <option value="Recusado">Recusado / Não Realizado</option>
                      <option value="Em Análise">Em Análise Técnica</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                      Data e Hora da Execução no Sistema
                    </label>
                    <div className="flex gap-1.5">
                      <input 
                        type="datetime-local"
                        value={formDataHoraExecucao}
                        onChange={(e) => setFormDataHoraExecucao(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setFormDataHoraExecucao(new Date().toISOString().slice(0, 16))}
                        className="px-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-xl text-[10px] font-black hover:bg-neutral-300 cursor-pointer"
                        title="Agora"
                      >
                        Agora
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 uppercase">
                    Anotação Técnica / Resguardo da Contadora
                  </label>
                  <input 
                    type="text"
                    value={formObsTecnica}
                    onChange={(e) => setFormObsTecnica(e.target.value)}
                    placeholder="Ex: Alteração realizada com amparo no ofício anexado, sob responsabilidade do fiscal..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <CheckCircle2 size={16} />
                  <span>{editingRegistro ? 'Salvar Alterações' : 'Gravar no Livro de Registros'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualizar Comprovante / Print do WhatsApp */}
      {viewingComprovante && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm" onClick={() => setViewingComprovante(null)} />

          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 max-w-2xl w-full relative shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h4 className="text-base font-black text-neutral-900 dark:text-white">
                  Comprovante Anexado: {viewingComprovante.documentoAfetado}
                </h4>
                <p className="text-xs text-neutral-500">
                  Solicitante: <strong>{viewingComprovante.solicitanteNome}</strong> ({viewingComprovante.canalSolicitacao})
                </p>
              </div>
              <button onClick={() => setViewingComprovante(null)} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {viewingComprovante.comprovanteUrl ? (
              <div className="space-y-3">
                {viewingComprovante.comprovanteUrl.startsWith('data:image/') || viewingComprovante.comprovanteTipo?.startsWith('image/') ? (
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50 dark:bg-neutral-950 p-2 flex justify-center">
                    <img 
                      src={viewingComprovante.comprovanteUrl} 
                      alt="Print do WhatsApp" 
                      className="max-h-[60vh] object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                    <FileText size={40} className="mx-auto text-indigo-600" />
                    <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Documento PDF / Ofício: {viewingComprovante.comprovanteNome}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <a
                    href={viewingComprovante.comprovanteUrl}
                    download={viewingComprovante.comprovanteNome || 'comprovante'}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Baixar Arquivo Original</span>
                  </a>

                  <button
                    onClick={() => {
                      setViewingComprovante(null);
                      handlePrintFicha(viewingComprovante);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Printer size={14} />
                    <span>Imprimir Ficha Completa</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
