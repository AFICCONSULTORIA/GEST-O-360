import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, MessageSquare, Lightbulb, ThumbsUp, HelpCircle, 
  AlertTriangle, ShieldAlert, CheckCircle2, Clock, Search, 
  Filter, ArrowRight, ArrowUpRight, Send, Check, AlertCircle, 
  Printer, Download, ShieldCheck, Eye, EyeOff, User, Phone, 
  Mail, MapPin, Calendar, FileText, ChevronRight, X, ExternalLink,
  RefreshCw, CornerDownRight, PlusCircle, CheckCircle, Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OuvidoriaManifestacao, OuvidoriaStatus, OuvidoriaTipo, AdminUser, Institution } from '../../types';
import { DEMO_OUVIDORIA_MANIFESTACOES } from './demoData';
import { showToast } from '../../components/ui/Toast';
import { DemoFillButton } from '../../components/DemoFillButton';

interface OuvidoriaModuleProps {
  currentInstitution?: Institution | null;
  currentUser?: AdminUser | null;
}

const SECRETARIAS_OPCOES = [
  'Secretaria de Obras e Serviços Urbanos',
  'Secretaria Municipal de Saúde',
  'Secretaria de Educação e Cultura',
  'Secretaria de Meio Ambiente e Posturas',
  'Secretaria de Assistência Social',
  'Secretaria de Finanças e Tributação',
  'Secretaria de Trânsito e Mobilidade',
  'Gabinete do Prefeito',
  'Procuradoria Geral do Município'
];

const MODELOS_RESPOSTA = [
  {
    titulo: 'Providência Adotada (Obras/Serviços)',
    texto: 'Prezado(a) cidadão(ã), informamos que a equipe técnica realizou a vistoria e executou o serviço solicitado na localidade indicada. Agradecemos sua colaboração na melhoria dos serviços públicos do nosso município.'
  },
  {
    titulo: 'Em Cronograma de Execução',
    texto: 'Prezado(a) cidadão(ã), sua demanda foi analisada e incluída no cronograma de obras e manutenção do setor responsável, com previsão de atendimento nos próximos dias. Você pode acompanhar a atualização por este protocolo.'
  },
  {
    titulo: 'Agradecimento por Elogio',
    texto: 'Prezado(a) cidadão(ã), a Administração Municipal agradece imensamente seu reconhecimento. Seu elogio foi registrado formalmente e encaminhado à chefia e à equipe elogiada para anotação em elogio funcional.'
  },
  {
    titulo: 'Denúncia em Apuração pela Fiscalização',
    texto: 'Informamos que a denúncia foi acolhida sob protocolo sigiloso e encaminhada ao corpo de fiscais competentes para realização de diligência in loco e lavratura das medidas legais pertinentes.'
  }
];

export function OuvidoriaModule({ currentInstitution, currentUser }: OuvidoriaModuleProps) {
  const [manifestacoes, setManifestacoes] = useState<OuvidoriaManifestacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterSecretaria, setFilterSecretaria] = useState<string>('Todas');
  const [filterPrazo, setFilterPrazo] = useState<'Todos' | 'No Prazo' | 'Vencendo' | 'Vencidos'>('Todos');

  // Modal de Detalhes / Despacho
  const [selectedItem, setSelectedItem] = useState<OuvidoriaManifestacao | null>(null);
  const [activeActionTab, setActiveActionTab] = useState<'resposta' | 'encaminhar' | 'prorrogar'>('resposta');

  // Formulário de Resposta / Encaminhamento
  const [respostaTexto, setRespostaTexto] = useState('');
  const [novaSecretariaDestino, setNovaSecretariaDestino] = useState('');
  const [despachoNota, setDespachoNota] = useState('');
  const [justificativaProrrogacao, setJustificativaProrrogacao] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Busca dados
  const fetchManifestacoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ouvidoria_manifestacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        // Fallback para localStorage ou dados de demonstração
        const local = localStorage.getItem('gestao360_ouvidoria_manifestacoes');
        if (local) {
          try {
            setManifestacoes(JSON.parse(local));
            return;
          } catch (e) {
            console.error('Erro ao ler ouvidoria local:', e);
          }
        }
        // Se ainda não tiver nada, carrega mock demo inicial
        setManifestacoes(DEMO_OUVIDORIA_MANIFESTACOES);
        localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(DEMO_OUVIDORIA_MANIFESTACOES));
        return;
      }

      setManifestacoes(data as OuvidoriaManifestacao[]);
    } catch (err) {
      console.error(err);
      setManifestacoes(DEMO_OUVIDORIA_MANIFESTACOES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManifestacoes();
  }, [currentInstitution?.id]);

  // Cálculos do Semáforo de Prazos (SLA)
  const getSlaStatus = (prazoIso: string, status: OuvidoriaStatus) => {
    if (status === 'Respondida' || status === 'Arquivada') {
      return { label: 'Concluído', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', days: 0 };
    }
    const now = new Date().getTime();
    const deadline = new Date(prazoIso).getTime();
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Atrasada (${Math.abs(diffDays)}d)`, color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800', days: diffDays };
    }
    if (diffDays <= 5) {
      return { label: `Vence em ${diffDays}d`, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', days: diffDays };
    }
    return { label: `${diffDays} dias restantes`, color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', days: diffDays };
  };

  // KPIs
  const totalManifestacoes = manifestacoes.length;
  const totalNovas = manifestacoes.filter(m => m.status === 'Nova').length;
  const totalEmAnalise = manifestacoes.filter(m => m.status === 'Em Analise' || m.status === 'Encaminhada' || m.status === 'Prorrogada').length;
  const totalRespondidas = manifestacoes.filter(m => m.status === 'Respondida').length;
  const totalAtrasadas = manifestacoes.filter(m => {
    if (m.status === 'Respondida' || m.status === 'Arquivada') return false;
    return new Date(m.prazo_limite).getTime() < Date.now();
  }).length;

  // Filtragem da Lista
  const manifestacoesFiltradas = manifestacoes.filter((item) => {
    // Busca textual
    const matchesSearch = 
      item.protocolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.assunto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.bairro && item.bairro.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.cidadao_nome && item.cidadao_nome.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filtro por Tipo
    if (filterTipo !== 'Todos' && item.tipo !== filterTipo) return false;

    // Filtro por Status
    if (filterStatus !== 'Todos' && item.status !== filterStatus) return false;

    // Filtro por Secretaria
    if (filterSecretaria !== 'Todas' && item.secretaria_destino !== filterSecretaria && item.secretaria_sugerida !== filterSecretaria) {
      return false;
    }

    // Filtro por Prazo SLA
    if (filterPrazo !== 'Todos') {
      const isConcluido = item.status === 'Respondida' || item.status === 'Arquivada';
      const diffDays = Math.ceil((new Date(item.prazo_limite).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (filterPrazo === 'Vencidos') {
        if (isConcluido || diffDays >= 0) return false;
      } else if (filterPrazo === 'Vencendo') {
        if (isConcluido || diffDays < 0 || diffDays > 5) return false;
      } else if (filterPrazo === 'No Prazo') {
        if (!isConcluido && diffDays < 0) return false;
      }
    }

    return true;
  });

  // Ação: Responder Manifestação
  const handleSaveResposta = async () => {
    if (!selectedItem || !respostaTexto.trim()) {
      showToast('Por favor, escreva a resposta oficial antes de salvar.', 'warning');
      return;
    }

    setIsProcessing(true);
    const nowIso = new Date().toISOString();
    const updatedItem: OuvidoriaManifestacao = {
      ...selectedItem,
      resposta_oficial: respostaTexto.trim(),
      respondido_por: currentUser?.name || 'Ouvidoria Geral',
      respondido_em: nowIso,
      status: 'Respondida',
      updated_at: nowIso
    };

    try {
      await supabase
        .from('ouvidoria_manifestacoes')
        .update({
          resposta_oficial: updatedItem.resposta_oficial,
          respondido_por: updatedItem.respondido_por,
          respondido_em: updatedItem.respondido_em,
          status: 'Respondida',
          updated_at: nowIso
        })
        .eq('id', selectedItem.id);

      // Atualiza lista local
      const updatedList = manifestacoes.map(m => m.id === selectedItem.id ? updatedItem : m);
      setManifestacoes(updatedList);
      localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(updatedList));

      setSelectedItem(updatedItem);
      showToast('Resposta oficial registrada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gravar resposta. Verifique a conexão.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Ação: Encaminhar para Secretaria
  const handleEncaminhar = async () => {
    if (!selectedItem || !novaSecretariaDestino) {
      showToast('Selecione a secretaria de destino.', 'warning');
      return;
    }

    setIsProcessing(true);
    const nowIso = new Date().toISOString();
    const updatedItem: OuvidoriaManifestacao = {
      ...selectedItem,
      secretaria_destino: novaSecretariaDestino,
      status: 'Encaminhada',
      updated_at: nowIso
    };

    try {
      await supabase
        .from('ouvidoria_manifestacoes')
        .update({
          secretaria_destino: novaSecretariaDestino,
          status: 'Encaminhada',
          updated_at: nowIso
        })
        .eq('id', selectedItem.id);

      const updatedList = manifestacoes.map(m => m.id === selectedItem.id ? updatedItem : m);
      setManifestacoes(updatedList);
      localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(updatedList));

      setSelectedItem(updatedItem);
      showToast(`Manifestação encaminhada com sucesso para ${novaSecretariaDestino}!`, 'success');
      setNovaSecretariaDestino('');
      setDespachoNota('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao encaminhar.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Ação: Prorrogar Prazo (+10 dias)
  const handleProrrogarPrazo = async () => {
    if (!selectedItem || !justificativaProrrogacao.trim()) {
      showToast('Informe a justificativa legal para prorrogação do prazo.', 'warning');
      return;
    }

    setIsProcessing(true);
    const prazoAtual = new Date(selectedItem.prazo_limite);
    prazoAtual.setDate(prazoAtual.getDate() + 10);
    const novoPrazoIso = prazoAtual.toISOString();
    const nowIso = new Date().toISOString();

    const updatedItem: OuvidoriaManifestacao = {
      ...selectedItem,
      prazo_limite: novoPrazoIso,
      prorrogado: true,
      justificativa_prorrogacao: justificativaProrrogacao.trim(),
      status: 'Prorrogada',
      updated_at: nowIso
    };

    try {
      await supabase
        .from('ouvidoria_manifestacoes')
        .update({
          prazo_limite: novoPrazoIso,
          prorrogado: true,
          justificativa_prorrogacao: justificativaProrrogacao.trim(),
          status: 'Prorrogada',
          updated_at: nowIso
        })
        .eq('id', selectedItem.id);

      const updatedList = manifestacoes.map(m => m.id === selectedItem.id ? updatedItem : m);
      setManifestacoes(updatedList);
      localStorage.setItem('gestao360_ouvidoria_manifestacoes', JSON.stringify(updatedList));

      setSelectedItem(updatedItem);
      showToast('Prazo prorrogado por +10 dias conforme Lei 13.460/2017.', 'success');
      setJustificativaProrrogacao('');
    } catch (err) {
      console.error(err);
      showToast('Erro ao prorrogar prazo.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getTipoBadge = (tipo: OuvidoriaTipo) => {
    switch (tipo) {
      case 'Elogio':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"><ThumbsUp size={12} /> Elogio</span>;
      case 'Sugestao':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"><Lightbulb size={12} /> Sugestão</span>;
      case 'Solicitacao':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400"><HelpCircle size={12} /> Solicitação</span>;
      case 'Reclamacao':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400"><AlertTriangle size={12} /> Reclamação</span>;
      case 'Denuncia':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"><ShieldAlert size={12} /> Denúncia</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">{tipo}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* ================= HEADER DO MÓDULO ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck size={14} />
            <span>Gestão das Secretarias · Lei Federal nº 13.460/2017</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Ouvidoria Municipal Geral
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Painel unificado para triagem, tramitação entre secretarias, controle de prazos legais e resposta aos cidadãos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DemoFillButton moduleKey="ouvidoria" onSuccess={fetchManifestacoes} />

          <a
            href="/ouvidoria"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            title="Acessar o portal como o munícipe vê"
          >
            <ExternalLink size={14} />
            <span>Abrir Portal do Cidadão (/ouvidoria)</span>
          </a>

          <button
            onClick={() => window.print()}
            className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl transition-all shadow-sm"
            title="Imprimir Relatório Geral"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* ================= CARDS DE INDICADORES (KPIS) ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Total Recebidas
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-neutral-900 dark:text-white">
              {totalManifestacoes}
            </span>
            <MessageSquare size={20} className="text-neutral-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Novas / Triagem
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {totalNovas}
            </span>
            <AlertCircle size={20} className="text-amber-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Em Análise Setorial
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-sky-600 dark:text-sky-400">
              {totalEmAnalise}
            </span>
            <Clock size={20} className="text-sky-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Respondidas
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {totalRespondidas}
            </span>
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Atrasadas (SLA)
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {totalAtrasadas}
            </span>
            <ShieldAlert size={20} className="text-rose-500" />
          </div>
        </div>
      </div>

      {/* ================= BARRA DE FILTROS PRÁTICOS ================= */}
      <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por protocolo, cidadão, assunto ou bairro..."
              className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filtro Tipo */}
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="Reclamacao">Reclamações</option>
            <option value="Solicitacao">Solicitações</option>
            <option value="Denuncia">Denúncias</option>
            <option value="Sugestao">Sugestões</option>
            <option value="Elogio">Elogios</option>
          </select>

          {/* Filtro Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Nova">Novas</option>
            <option value="Em Analise">Em Análise</option>
            <option value="Encaminhada">Encaminhadas</option>
            <option value="Prorrogada">Prorrogadas</option>
            <option value="Respondida">Respondidas</option>
          </select>

          {/* Filtro Prazo SLA */}
          <select
            value={filterPrazo}
            onChange={(e) => setFilterPrazo(e.target.value as any)}
            className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Todos">Todos os Prazos</option>
            <option value="No Prazo">No Prazo Legal</option>
            <option value="Vencendo">Vencendo (&le; 5 dias)</option>
            <option value="Vencidos">Vencidos (Atrasados)</option>
          </select>
        </div>
      </div>

      {/* ================= TABELA / LISTA DE MANIFESTAÇÕES ================= */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-neutral-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-emerald-500" />
            <p className="text-xs font-bold uppercase tracking-wider">Carregando Ouvidoria...</p>
          </div>
        ) : manifestacoesFiltradas.length === 0 ? (
          <div className="p-16 text-center text-neutral-400">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <h4 className="text-base font-bold text-neutral-700 dark:text-neutral-300">Nenhuma manifestação encontrada</h4>
            <p className="text-xs text-neutral-400 mt-1">Tente ajustar os filtros ou a busca acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-black uppercase tracking-wider text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="px-6 py-4">Protocolo / Data</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Assunto & Local</th>
                  <th className="px-6 py-4">Cidadão / Sigilo</th>
                  <th className="px-6 py-4">Status & Secretaria</th>
                  <th className="px-6 py-4">SLA Prazo</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {manifestacoesFiltradas.map((item) => {
                  const sla = getSlaStatus(item.prazo_limite, item.status);
                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedItem(item);
                        setRespostaTexto(item.resposta_oficial || '');
                        setActiveActionTab(item.status === 'Respondida' ? 'resposta' : 'resposta');
                      }}
                    >
                      {/* Protocolo */}
                      <td className="px-6 py-4">
                        <span className="font-mono font-black text-xs text-neutral-900 dark:text-white block group-hover:text-emerald-600 transition-colors">
                          {item.protocolo}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-6 py-4">
                        {getTipoBadge(item.tipo)}
                      </td>

                      {/* Assunto & Local */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-bold text-neutral-900 dark:text-white truncate">
                          {item.assunto}
                        </div>
                        <div className="text-xs text-neutral-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={12} />
                          <span>{item.bairro ? `${item.bairro}${item.logradouro ? ` - ${item.logradouro}` : ''}` : 'Local não especificado'}</span>
                        </div>
                      </td>

                      {/* Cidadão & Sigilo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          {item.privacidade === 'anonima' ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <EyeOff size={13} /> Anônimo
                            </span>
                          ) : item.privacidade === 'sigilosa' ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold" title="Identidade protegida">
                              <ShieldCheck size={13} /> {item.cidadao_nome} (Sigiloso)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-neutral-800 dark:text-neutral-200">
                              <User size={13} /> {item.cidadao_nome}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status & Secretaria */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.status === 'Respondida' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          item.status === 'Nova' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse' :
                          item.status === 'Encaminhada' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' :
                          'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                        }`}>
                          {item.status}
                        </span>
                        <span className="block text-[11px] text-neutral-400 mt-1 truncate max-w-[160px]">
                          {item.secretaria_destino || item.secretaria_sugerida || 'Triagem geral'}
                        </span>
                      </td>

                      {/* SLA Prazo */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${sla.color}`}>
                          <Clock size={12} />
                          <span>{sla.label}</span>
                        </span>
                      </td>

                      {/* Botão Ação */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="px-3.5 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 ml-auto"
                        >
                          <span>Atender</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL / DRAWER DE GESTÃO DA MANIFESTAÇÃO ================= */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8"
            >
              {/* Header do Modal */}
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-neutral-900 dark:text-white">
                        {selectedItem.protocolo}
                      </span>
                      {getTipoBadge(selectedItem.tipo)}
                    </div>
                    <span className="text-xs text-neutral-400">
                      Aberta em {new Date(selectedItem.created_at).toLocaleDateString('pt-BR')} às {new Date(selectedItem.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Corpo com Rolagem */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                
                {/* Banner de Sigilo (se aplicável) */}
                {selectedItem.privacidade === 'sigilosa' && (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
                    <ShieldCheck size={20} className="shrink-0 text-indigo-600 mt-0.5" />
                    <div>
                      <strong>Manifestação com Sigilo Requerido:</strong> Os dados do manifestante (Nome: {selectedItem.cidadao_nome}, Tel: {selectedItem.cidadao_telefone || 'N/I'}) são confidenciais e NÃO devem constar em eventuais despachos externos com os servidores ou órgãos denunciados.
                    </div>
                  </div>
                )}

                {/* Conteúdo da Manifestação */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Assunto:</span>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                      {selectedItem.assunto}
                    </h3>
                  </div>

                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Relato do Cidadão:</span>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1 whitespace-pre-line leading-relaxed">
                      {selectedItem.descricao}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                    <div>
                      <span className="text-neutral-400 block">Localidade:</span>
                      <strong className="text-neutral-800 dark:text-neutral-200">
                        {selectedItem.bairro ? `${selectedItem.bairro} - ${selectedItem.logradouro || ''}` : 'Não especificado'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-neutral-400 block">Secretaria Competente:</span>
                      <strong className="text-neutral-800 dark:text-neutral-200">
                        {selectedItem.secretaria_destino || selectedItem.secretaria_sugerida || 'A definir'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Resposta Atual (se já existir) */}
                {selectedItem.resposta_oficial && (
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 size={16} /> Resposta Oficial Emitida
                      </span>
                      {selectedItem.respondido_em && (
                        <span className="text-[11px] text-neutral-400">
                          {new Date(selectedItem.respondido_em).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-line leading-relaxed bg-white/60 dark:bg-neutral-900/60 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      {selectedItem.resposta_oficial}
                    </p>
                  </div>
                )}

                {/* Abas de Ação Interna */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 mb-4 pb-2">
                    <button
                      type="button"
                      onClick={() => setActiveActionTab('resposta')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeActionTab === 'resposta'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      Responder ao Munícipe
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveActionTab('encaminhar')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeActionTab === 'encaminhar'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      Encaminhar para Secretaria
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveActionTab('prorrogar')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeActionTab === 'prorrogar'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      Prorrogar Prazo (+10 dias)
                    </button>
                  </div>

                  {/* ABA: RESPONDER */}
                  {activeActionTab === 'resposta' && (
                    <div className="space-y-4">
                      {/* Modelos Prontos */}
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400 block mb-2">
                          Inserir Modelo de Resposta Rápida:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {MODELOS_RESPOSTA.map((mod, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setRespostaTexto(mod.texto)}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-all border border-neutral-200 dark:border-neutral-700"
                            >
                              + {mod.titulo}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Texto da Resposta Oficial (Visível para o Cidadão no Portal e Protocolo):
                        </label>
                        <textarea
                          rows={4}
                          value={respostaTexto}
                          onChange={(e) => setRespostaTexto(e.target.value)}
                          placeholder="Digite o parecer, despacho final ou esclarecimento para o munícipe..."
                          className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveResposta}
                          disabled={isProcessing || !respostaTexto.trim()}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
                        >
                          <Send size={15} />
                          <span>{isProcessing ? 'Publicando...' : 'Publicar Resposta ao Cidadão'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ABA: ENCAMINHAR */}
                  {activeActionTab === 'encaminhar' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Secretaria Responsável pelo Atendimento:
                        </label>
                        <select
                          value={novaSecretariaDestino}
                          onChange={(e) => setNovaSecretariaDestino(e.target.value)}
                          className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium"
                        >
                          <option value="">Selecione a Secretaria...</option>
                          {SECRETARIAS_OPCOES.map((sec) => (
                            <option key={sec} value={sec}>{sec}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Despacho / Instrução Interna para a Secretaria:
                        </label>
                        <textarea
                          rows={3}
                          value={despachoNota}
                          onChange={(e) => setDespachoNota(e.target.value)}
                          placeholder="Instrua a secretaria quanto às providências necessárias, prazos e laudos técnicos requeridos..."
                          className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleEncaminhar}
                          disabled={isProcessing || !novaSecretariaDestino}
                          className="px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-600/20 flex items-center gap-2 transition-all"
                        >
                          <CornerDownRight size={15} />
                          <span>{isProcessing ? 'Encaminhando...' : 'Despachar para Secretaria'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ABA: PRORROGAR */}
                  {activeActionTab === 'prorrogar' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <strong>Previsão da Lei nº 13.460/2017 (Art. 10):</strong> O prazo inicial de 20 dias pode ser prorrogado de forma justificada por mais 10 dias quando a complexidade da matéria exigir diligências aprofundadas.
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          Justificativa Formal da Prorrogação *
                        </label>
                        <textarea
                          rows={3}
                          value={justificativaProrrogacao}
                          onChange={(e) => setJustificativaProrrogacao(e.target.value)}
                          placeholder="Ex: Prorrogação de 10 dias necessária para conclusão de laudo de vistoria pela equipe de engenharia..."
                          className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleProrrogarPrazo}
                          disabled={isProcessing || !justificativaProrrogacao.trim()}
                          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all"
                        >
                          <Clock size={15} />
                          <span>{isProcessing ? 'Prorrogando...' : 'Confirmar Prorrogação (+10 dias)'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
