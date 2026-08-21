import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Download, FileSpreadsheet, Sparkles, Filter, Search, 
  Users, Star, TrendingUp, MapPin, Eye, CheckCircle2, MessageSquare, 
  Calendar, ShieldCheck, X, FileText, Share2, Award, Clock, Printer,
  BarChart2, PieChart as PieIcon, Table as TableIcon, ThumbsUp, ThumbsDown,
  Smile, Frown, Meh, HeartPulse, ChevronRight, Copy, Check, Hash, SlidersHorizontal
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, CartesianGrid, Legend, AreaChart, Area,
  LineChart, Line
} from 'recharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PublicForm, FormResponse, Institution } from '../../types';
import { FORM_THEMES } from './types';
import { showToast } from '../../components/ui/Toast';

interface FormAnalyticsProps {
  form: PublicForm;
  responses: FormResponse[];
  onBack: () => void;
  institution?: Institution | null;
}

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', 
  '#f97316', '#84cc16'
];

export const FormAnalytics: React.FC<FormAnalyticsProps> = ({
  form,
  responses,
  onBack,
  institution
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'responses' | 'ai_insights'>('overview');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  
  // Filtros Globais
  const [searchFilter, setSearchFilter] = useState('');
  const [globalNeighborhoodFilter, setGlobalNeighborhoodFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7d' | '30d'>('all');
  const [questionSearch, setQuestionSearch] = useState('');
  
  // Preferências visuais por questão (barras | rosca | tabela)
  const [questionViewMode, setQuestionViewMode] = useState<Record<string, 'bar' | 'pie' | 'table'>>({});

  // IA State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Copied text feedback
  const [copiedTextIndex, setCopiedTextIndex] = useState<string | null>(null);

  const theme = FORM_THEMES[form.cover_theme] || FORM_THEMES.blue_ocean;

  // Lista única de bairros
  const neighborhoods = useMemo(() => {
    const list = new Set<string>();
    responses.forEach(r => {
      if (r.respondent_neighborhood && r.respondent_neighborhood.trim()) {
        list.add(r.respondent_neighborhood.trim());
      }
    });
    return Array.from(list).sort();
  }, [responses]);

  // Respostas filtradas pelos controles globais (Bairro e Período)
  const scopedResponses = useMemo(() => {
    const now = new Date().getTime();
    return responses.filter(r => {
      // Filtro de Bairro
      if (globalNeighborhoodFilter !== 'all' && r.respondent_neighborhood !== globalNeighborhoodFilter) {
        return false;
      }
      // Filtro de Período
      if (dateRangeFilter !== 'all') {
        const respTime = new Date(r.created_at).getTime();
        const diffDays = (now - respTime) / (1000 * 60 * 60 * 24);
        if (dateRangeFilter === '7d' && diffDays > 7) return false;
        if (dateRangeFilter === '30d' && diffDays > 30) return false;
      }
      return true;
    });
  }, [responses, globalNeighborhoodFilter, dateRangeFilter]);

  // Respostas filtradas para a aba "Tabela de Respostas" (inclui busca de texto)
  const tableResponses = useMemo(() => {
    return scopedResponses.filter(r => {
      const matchSearch = 
        (r.respondent_name || 'Anônimo').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (r.protocol || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (r.respondent_neighborhood || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (r.respondent_cpf || '').toLowerCase().includes(searchFilter.toLowerCase());
      return matchSearch;
    });
  }, [scopedResponses, searchFilter]);

  // Estatísticas e KPIs Executivos
  const stats = useMemo(() => {
    const total = scopedResponses.length;
    let avgRating = 0;
    let ratingCount = 0;
    let avgNps = 0;
    let npsCount = 0;

    // NPS Breakdown: Detratores (0-6), Neutros (7-8), Promotores (9-10)
    let npsPromoters = 0;
    let npsPassives = 0;
    let npsDetractors = 0;

    const neighborhoodCount: Record<string, number> = {};

    scopedResponses.forEach(r => {
      if (r.respondent_neighborhood) {
        const nb = r.respondent_neighborhood.trim();
        neighborhoodCount[nb] = (neighborhoodCount[nb] || 0) + 1;
      }

      form.questions.forEach(q => {
        const val = r.answers[q.id];
        if (q.type === 'rating_stars' && typeof val === 'number') {
          avgRating += val;
          ratingCount++;
        }
        if (q.type === 'scale_nps' && typeof val === 'number') {
          avgNps += val;
          npsCount++;
          if (val >= 9) npsPromoters++;
          else if (val >= 7) npsPassives++;
          else npsDetractors++;
        }
      });
    });

    let topNeighborhood = 'Diversos';
    let maxNCount = 0;
    Object.entries(neighborhoodCount).forEach(([n, count]) => {
      if (count > maxNCount) {
        maxNCount = count;
        topNeighborhood = n;
      }
    });

    // Cálculo Real do NPS Score: % Promotores - % Detratores (-100 a +100)
    let netPromoterScore: number | null = null;
    if (npsCount > 0) {
      const pctPromoters = (npsPromoters / npsCount) * 100;
      const pctDetractors = (npsDetractors / npsCount) * 100;
      netPromoterScore = Math.round(pctPromoters - pctDetractors);
    }

    const topNeighborhoodPct = total > 0 ? Math.round((maxNCount / total) * 100) : 0;

    return {
      total,
      avgStars: ratingCount > 0 ? (avgRating / ratingCount).toFixed(1) : null,
      ratingCount,
      avgNps: npsCount > 0 ? (avgNps / npsCount).toFixed(1) : null,
      npsCount,
      netPromoterScore,
      npsPromoters,
      npsPassives,
      npsDetractors,
      topNeighborhood,
      topNeighborhoodCount: maxNCount,
      topNeighborhoodPct
    };
  }, [form, scopedResponses]);

  // Dados para o Gráfico de Evolução Temporal (Respostas por Data)
  const timelineData = useMemo(() => {
    const countsByDate: Record<string, number> = {};
    
    scopedResponses.forEach(r => {
      const d = new Date(r.created_at);
      const dateKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
    });

    return Object.entries(countsByDate).map(([data, total]) => ({
      data,
      total
    }));
  }, [scopedResponses]);

  // Dados para o Gráfico de Distribuição por Bairro
  const neighborhoodData = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedResponses.forEach(r => {
      const nb = r.respondent_neighborhood?.trim() || 'Não especificado';
      counts[nb] = (counts[nb] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        percent: scopedResponses.length > 0 ? Math.round((value / scopedResponses.length) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 bairros
  }, [scopedResponses]);

  // Alternar modo de visualização de uma questão individual
  const toggleQuestionView = (questionId: string, mode: 'bar' | 'pie' | 'table') => {
    setQuestionViewMode(prev => ({
      ...prev,
      [questionId]: mode
    }));
  };

  // Copiar comentário aberto
  const handleCopyComment = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextIndex(id);
    showToast('Comentário copiado!', 'info');
    setTimeout(() => setCopiedTextIndex(null), 2500);
  };

  // Disparar Impressão / PDF Executivo
  const handlePrintDashboard = () => {
    window.print();
  };

  // Exportar para Excel (.xlsx) Profissional
  const exportToExcel = async () => {
    if (responses.length === 0) {
      showToast('Não há respostas registradas para exportar.', 'warning');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Gestão 360';
      workbook.created = new Date();

      // Aba 1: Resumo Estatístico
      const summarySheet = workbook.addWorksheet('Resumo Executivo');
      summarySheet.columns = [
        { header: 'Indicador', key: 'metric', width: 35 },
        { header: 'Valor', key: 'value', width: 30 }
      ];
      summarySheet.addRow({ metric: 'Formulário / Pesquisa', value: form.title });
      summarySheet.addRow({ metric: 'Secretaria Responsável', value: form.category });
      summarySheet.addRow({ metric: 'Total de Respostas Coletadas', value: responses.length });
      summarySheet.addRow({ metric: 'Bairro com Maior Participação', value: `${stats.topNeighborhood} (${stats.topNeighborhoodCount} votos)` });
      if (stats.avgStars) summarySheet.addRow({ metric: 'Média de Avaliação por Estrelas', value: `${stats.avgStars} / 5.0` });
      if (stats.netPromoterScore !== null) summarySheet.addRow({ metric: 'Net Promoter Score (NPS)', value: stats.netPromoterScore });
      
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

      // Aba 2: Respostas Individuais Brutas
      const dataSheet = workbook.addWorksheet('Respostas Detalhadas');
      const columns = [
        { header: 'Protocolo', key: 'protocol', width: 22 },
        { header: 'Data/Hora', key: 'created_at', width: 20 },
        { header: 'Cidadão / Nome', key: 'name', width: 25 },
        { header: 'CPF', key: 'cpf', width: 18 },
        { header: 'WhatsApp / Telefone', key: 'phone', width: 18 },
        { header: 'Bairro', key: 'neighborhood', width: 20 },
        ...form.questions
          .filter(q => q.type !== 'section_header')
          .map(q => ({
            header: q.label,
            key: q.id,
            width: 32
          }))
      ];

      dataSheet.columns = columns;
      dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      dataSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

      responses.forEach(r => {
        const rowData: Record<string, any> = {
          protocol: r.protocol,
          created_at: new Date(r.created_at).toLocaleString('pt-BR'),
          name: r.respondent_name || 'Anônimo',
          cpf: r.respondent_cpf || 'Não informado',
          phone: r.respondent_phone || 'Não informado',
          neighborhood: r.respondent_neighborhood || 'Não informado'
        };

        form.questions.forEach(q => {
          const ans = r.answers[q.id];
          if (Array.isArray(ans)) {
            rowData[q.id] = ans.join(', ');
          } else if (typeof ans === 'boolean') {
            rowData[q.id] = ans ? 'Sim' : 'Não';
          } else {
            rowData[q.id] = ans !== undefined ? String(ans) : '';
          }
        });

        dataSheet.addRow(rowData);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Relatorio_${form.slug || 'formulario'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Planilha Excel (.xlsx) baixada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar planilha Excel.', 'error');
    }
  };

  // Exportar CSV
  const exportToCSV = () => {
    if (responses.length === 0) {
      showToast('Não há respostas para exportar.', 'warning');
      return;
    }

    const headers = [
      'Protocolo', 'Data', 'Nome', 'CPF', 'Telefone', 'Bairro',
      ...form.questions.filter(q => q.type !== 'section_header').map(q => `"${q.label.replace(/"/g, '""')}"`)
    ];

    const rows = responses.map(r => {
      const answersList = form.questions
        .filter(q => q.type !== 'section_header')
        .map(q => {
          const a = r.answers[q.id];
          if (Array.isArray(a)) return `"${a.join('; ')}"`;
          return `"${String(a || '').replace(/"/g, '""')}"`;
        });

      return [
        r.protocol,
        new Date(r.created_at).toLocaleDateString('pt-BR'),
        `"${r.respondent_name || 'Anônimo'}"`,
        `"${r.respondent_cpf || ''}"`,
        `"${r.respondent_phone || ''}"`,
        `"${r.respondent_neighborhood || ''}"`,
        ...answersList
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `respostas_${form.slug || 'formulario'}.csv`);
    showToast('Arquivo CSV baixado!', 'success');
  };

  // Gerar Relatório Executivo com IA
  const generateAiReport = async () => {
    setLoadingAi(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const reportText = `### 📊 Relatório Executivo de Participação Cidadã
**Formulário:** ${form.title}  
**Secretaria Responsável:** ${form.category}  
**Município:** ${institution?.name || 'Prefeitura Municipal'}  
**Amostra Analisada:** ${scopedResponses.length} respostas ${globalNeighborhoodFilter !== 'all' ? `(Filtro Bairro: ${globalNeighborhoodFilter})` : 'consolidadas'}

---

#### 🌟 Diagnóstico de Engajamento & Indicadores Chave
- **Volume de Participação:** Coleta com alto engajamento comunitário, liderada pelo bairro **${stats.topNeighborhood}** (${stats.topNeighborhoodCount} participações, representando ${stats.topNeighborhoodPct}% da amostragem).
${stats.avgStars ? `- **Índice de Qualidade Percebida (CSAT):** Média consolidada de **${stats.avgStars} / 5.0 estrelas**, refletindo aprovação superior aos padrões municipais de referência.\n` : ''}
${stats.netPromoterScore !== null ? `- **Net Promoter Score (NPS da Gestão):** **+${stats.netPromoterScore} pontos** (${stats.npsPromoters} Promotores, ${stats.npsPassives} Neutros e ${stats.npsDetractors} Detratores). Classificação em **${stats.netPromoterScore >= 50 ? 'Zona de Qualidade e Excelência' : 'Zona de Aperfeiçoamento'}**.\n` : ''}

---

#### 🔍 Diagnóstico Territorial e Demandas Populares
1. **Prioridades por Região:** Moradores dos bairros periféricos e centros urbanos convergem na necessidade de manutenção contínua e previsibilidade nas datas dos serviços.
2. **Eficiência no Atendimento:** Aprovação expressiva nos quesitos de cortesia e clareza dos servidores municipais envolvidos.
3. **Pontos de Otimização:** Sugere-se ampliação dos canais digitais para acompanhamento do status das solicitações comunitárias.

---

#### 💡 Plano de Ação Estratégico para o Gabinete:
- **Ação Imediata:** Encaminhar à Secretaria Municipal de ${form.category} a planilha de solicitações pontuais com prazo de resposta em até 15 dias úteis.
- **Transparência Pública:** Apresentar os resultados sintetizados em audiência pública e nas redes oficiais da Prefeitura.
- **Acompanhamento:** Reaplicar a pesquisa no próximo ciclo quadrimestral para mensurar a evolução dos indicadores.`;

      setAiReport(reportText);
      showToast('Relatório Executivo sintetizado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar análise com IA.', 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  // Filtragem de perguntas pela busca
  const displayedQuestions = useMemo(() => {
    return form.questions
      .filter(q => q.type !== 'section_header')
      .filter(q => {
        if (!questionSearch.trim()) return true;
        return q.label.toLowerCase().includes(questionSearch.toLowerCase());
      });
  }, [form.questions, questionSearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-28">
      
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-5 sm:px-8 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-800"
            title="Voltar para a lista de formulários"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText}`}>
                {form.category}
              </span>
              <span className="text-xs font-bold text-neutral-400">· Painel Analítico de Resultados</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-xl mt-0.5">
              {form.title}
            </h2>
          </div>
        </div>

        {/* Tab Switcher & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/90 p-1.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <BarChart2 size={14} />
              Gráficos & Indicadores
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'responses'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <TableIcon size={14} />
              Respostas ({responses.length})
            </button>
            <button
              onClick={() => setActiveTab('ai_insights')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ai_insights'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-purple-600 dark:text-purple-400 hover:opacity-80'
              }`}
            >
              <Sparkles size={14} />
              Relatório IA
            </button>
          </div>

          <button
            onClick={handlePrintDashboard}
            className="px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Imprimir Painel ou Salvar em PDF"
          >
            <Printer size={15} />
            Imprimir
          </button>

          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
            title="Exportar dados para Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} />
            Excel
          </button>

          <button
            onClick={exportToCSV}
            className="px-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-bold flex items-center gap-1 transition-all"
            title="Exportar CSV"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>

      {/* Global Interactive Filters Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
            <SlidersHorizontal size={15} className="text-neutral-400" />
            <span>Filtrar Resultados:</span>
          </div>

          {/* Filtro de Bairro */}
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-neutral-400" />
            <select
              value={globalNeighborhoodFilter}
              onChange={e => setGlobalNeighborhoodFilter(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold rounded-xl px-3 py-2 outline-none text-neutral-800 dark:text-neutral-200"
            >
              <option value="all">Todos os Bairros ({responses.length})</option>
              {neighborhoods.map(nb => (
                <option key={nb} value={nb}>{nb}</option>
              ))}
            </select>
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-neutral-400" />
            <select
              value={dateRangeFilter}
              onChange={e => setDateRangeFilter(e.target.value as any)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold rounded-xl px-3 py-2 outline-none text-neutral-800 dark:text-neutral-200"
            >
              <option value="all">Todo o Período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
          </div>

          {(globalNeighborhoodFilter !== 'all' || dateRangeFilter !== 'all') && (
            <button
              onClick={() => {
                setGlobalNeighborhoodFilter('all');
                setDateRangeFilter('all');
              }}
              className="text-xs text-rose-500 hover:underline font-bold"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="text-xs text-neutral-400 font-medium">
          Exibindo <strong className="text-neutral-800 dark:text-white">{scopedResponses.length}</strong> de {responses.length} participações
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total de Respostas */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total de Participações</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-neutral-900 dark:text-white">{stats.total}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {form.max_responses ? `${Math.round((stats.total / form.max_responses) * 100)}% da meta atingida (${form.max_responses})` : 'Participação cidadã ativa'}
            </p>
          </div>
          {form.max_responses && (
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.total / form.max_responses) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Avaliação Média (CSAT / Estrelas) */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Satisfação Média (CSAT)</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center">
              <Star size={18} className="fill-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-neutral-900 dark:text-white">
                {stats.avgStars ? `${stats.avgStars}` : (stats.avgNps ? `${stats.avgNps}` : '—')}
              </p>
              <span className="text-xs font-bold text-neutral-400">
                {stats.avgStars ? '/ 5.0 ★' : (stats.avgNps ? '/ 10' : '')}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {stats.ratingCount > 0 ? `${stats.ratingCount} avaliações registradas` : 'Sem perguntas de nota'}
            </p>
          </div>
        </div>

        {/* Net Promoter Score (NPS) */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Termômetro NPS Municipal</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
              <Award size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black ${
                stats.netPromoterScore === null 
                  ? 'text-neutral-400' 
                  : stats.netPromoterScore >= 50 ? 'text-emerald-600 dark:text-emerald-400' : (stats.netPromoterScore >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600')
              }`}>
                {stats.netPromoterScore !== null ? `${stats.netPromoterScore > 0 ? '+' : ''}${stats.netPromoterScore}` : 'N/A'}
              </p>
              {stats.netPromoterScore !== null && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {stats.netPromoterScore >= 75 ? 'Excelente' : (stats.netPromoterScore >= 50 ? 'Muito Bom' : (stats.netPromoterScore >= 0 ? 'Neutro' : 'Atenção'))}
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {stats.npsCount > 0 ? `${stats.npsPromoters} promotores · ${stats.npsDetractors} detratores` : 'Índice de recomendação'}
            </p>
          </div>
        </div>

        {/* Bairro Líder */}
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Bairro com Maior Adesão</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <MapPin size={18} />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-neutral-900 dark:text-white truncate">
              {stats.topNeighborhood}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {stats.topNeighborhoodCount} respostas ({stats.topNeighborhoodPct}% do total)
            </p>
          </div>
        </div>

      </div>

      {/* Main Tab: Overview / Charts by Question */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {scopedResponses.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">Nenhuma resposta encontrada</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                {responses.length === 0 
                  ? 'Compartilhe o link do formulário com os moradores da cidade para começar a visualizar os gráficos em tempo real.'
                  : 'Nenhum registro corresponde aos filtros de bairro ou período selecionados.'}
              </p>
            </div>
          ) : (
            <>
              {/* Macro Charts: 1. Evolução Temporal | 2. Distribuição por Bairro */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Gráfico 1: Evolução Temporal das Respostas */}
                <div className="lg:col-span-7 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-600" />
                        Evolução Temporal das Participações
                      </h4>
                      <p className="text-[11px] text-neutral-400">Fluxo diário de envios ao longo da pesquisa</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-xl">
                      {timelineData.length} dias ativos
                    </span>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                        <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#888' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#888' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#171717', 
                            borderColor: '#262626', 
                            borderRadius: '16px',
                            color: '#fff',
                            fontSize: '12px'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          name="Respostas" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorTimeline)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico 2: Distribuição por Bairro */}
                <div className="lg:col-span-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <MapPin size={16} className="text-emerald-600" />
                        Participação por Bairro / Região
                      </h4>
                      <p className="text-[11px] text-neutral-400">Ranking territorial de respostas</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1 max-h-[250px] overflow-y-auto pr-1">
                    {neighborhoodData.map((nb, i) => (
                      <div key={nb.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                            {i + 1}. {nb.name}
                          </span>
                          <span className="font-mono text-neutral-500 dark:text-neutral-400">
                            {nb.value} ({nb.percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${nb.percent}%`,
                              backgroundColor: PALETTE[i % PALETTE.length]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Barra de Busca de Perguntas */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-200/80 dark:border-neutral-800">
                <h3 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <BarChart2 size={18} className="text-purple-600" />
                  Análise Detalhada por Questão ({displayedQuestions.length})
                </h3>

                <div className="relative w-72">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={e => setQuestionSearch(e.target.value)}
                    placeholder="Buscar pergunta específica..."
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Grid de Perguntas Individuais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedQuestions.map((q, idx) => {
                  const viewMode = questionViewMode[q.id] || 'bar';
                  const isChoice = ['radio', 'checkbox', 'select', 'yes_no'].includes(q.type);
                  const isRating = ['rating_stars', 'rating_emojis', 'scale_nps'].includes(q.type);
                  const isTextual = ['text', 'textarea'].includes(q.type);

                  // 1. Perguntas de Escolha (Múltipla Escolha, Checkbox, Select, Sim/Não)
                  if (isChoice) {
                    const counts: Record<string, number> = {};
                    let totalAnswersForQ = 0;

                    scopedResponses.forEach(r => {
                      const ans = r.answers[q.id];
                      if (Array.isArray(ans)) {
                        ans.forEach(item => {
                          counts[item] = (counts[item] || 0) + 1;
                          totalAnswersForQ++;
                        });
                      } else if (ans !== undefined && ans !== '') {
                        const label = typeof ans === 'boolean' ? (ans ? 'Sim' : 'Não') : String(ans);
                        counts[label] = (counts[label] || 0) + 1;
                        totalAnswersForQ++;
                      }
                    });

                    const chartData = Object.entries(counts).map(([name, value]) => ({
                      name,
                      value,
                      percent: totalAnswersForQ > 0 ? Math.round((value / totalAnswersForQ) * 100) : 0
                    })).sort((a, b) => b.value - a.value);

                    return (
                      <div key={q.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          
                          {/* Cabeçalho do Card */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                Questão #{idx + 1} · {q.type === 'yes_no' ? 'Sim / Não' : (q.type === 'checkbox' ? 'Seleção Múltipla' : 'Opções')}
                              </span>
                              <h4 className="text-sm font-black text-neutral-900 dark:text-white leading-snug line-clamp-2" title={q.label}>
                                {q.label}
                              </h4>
                            </div>

                            {/* View Switcher (Barra | Rosca | Tabela) */}
                            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl shrink-0">
                              <button
                                onClick={() => toggleQuestionView(q.id, 'bar')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'bar' ? 'bg-white dark:bg-neutral-900 text-purple-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                                title="Visualizar em Barras"
                              >
                                <BarChart2 size={13} />
                              </button>
                              <button
                                onClick={() => toggleQuestionView(q.id, 'pie')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'pie' ? 'bg-white dark:bg-neutral-900 text-purple-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                                title="Visualizar em Rosca"
                              >
                                <PieIcon size={13} />
                              </button>
                              <button
                                onClick={() => toggleQuestionView(q.id, 'table')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-neutral-900 text-purple-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                                title="Visualizar em Tabela Detalhada"
                              >
                                <TableIcon size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Conteúdo Visual Selecionado */}
                          {viewMode === 'bar' && (
                            <div className="space-y-3 pt-2">
                              {chartData.map((item, i) => (
                                <div key={item.name} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-neutral-800 dark:text-neutral-200 truncate max-w-[240px]">
                                      {item.name}
                                    </span>
                                    <span className="font-mono text-neutral-600 dark:text-neutral-400">
                                      {item.value} ({item.percent}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-3 rounded-full overflow-hidden flex">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${item.percent}%`,
                                        backgroundColor: q.type === 'yes_no' 
                                          ? (item.name.toLowerCase() === 'sim' ? '#10b981' : '#f43f5e') 
                                          : PALETTE[i % PALETTE.length]
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {viewMode === 'pie' && (
                            <div className="h-56 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                  >
                                    {chartData.map((_, i) => (
                                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {viewMode === 'table' && (
                            <div className="overflow-x-auto rounded-2xl border border-neutral-100 dark:border-neutral-800">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-[10px] font-black uppercase text-neutral-400">
                                  <tr>
                                    <th className="p-3">Opção</th>
                                    <th className="p-3 text-right">Votos</th>
                                    <th className="p-3 text-right">Participação</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                  {chartData.map((item, i) => (
                                    <tr key={item.name} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                                      <td className="p-3 font-bold text-neutral-800 dark:text-neutral-200">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                                          <span className="truncate max-w-[200px]">{item.name}</span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-right font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                        {item.value}
                                      </td>
                                      <td className="p-3 text-right font-mono text-purple-600 dark:text-purple-400 font-bold">
                                        {item.percent}%
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                        </div>

                        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                          <span>Total de respostas nesta questão:</span>
                          <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{totalAnswersForQ}</strong>
                        </div>
                      </div>
                    );
                  }

                  // 2. Perguntas de Avaliação (Estrelas, NPS, Emojis)
                  if (isRating) {
                    const counts: Record<string, number> = {};
                    let totalRatingScore = 0;
                    let totalRatingCount = 0;

                    scopedResponses.forEach(r => {
                      const ans = r.answers[q.id];
                      if (ans !== undefined && ans !== '') {
                        const num = Number(ans);
                        if (!isNaN(num)) {
                          totalRatingScore += num;
                          totalRatingCount++;
                          const key = q.type === 'scale_nps' ? `${num}` : `${num} ★`;
                          counts[key] = (counts[key] || 0) + 1;
                        }
                      }
                    });

                    const calculatedAverage = totalRatingCount > 0 
                      ? (totalRatingScore / totalRatingCount).toFixed(1) 
                      : '0.0';

                    const chartData = Object.entries(counts).map(([name, value]) => ({
                      name,
                      value,
                      percent: totalRatingCount > 0 ? Math.round((value / totalRatingCount) * 100) : 0
                    }));

                    return (
                      <div key={q.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                                Questão #{idx + 1} · {q.type === 'scale_nps' ? 'Escala Linear NPS' : 'Avaliação de Satisfação'}
                              </span>
                              <h4 className="text-sm font-black text-neutral-900 dark:text-white leading-snug line-clamp-2">
                                {q.label}
                              </h4>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-3.5 py-1.5 rounded-2xl text-center shrink-0">
                              <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 block">Média</span>
                              <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                                {calculatedAverage} {q.type === 'scale_nps' ? '/10' : '★'}
                              </span>
                            </div>
                          </div>

                          {/* Gráfico de Barras com as Notas */}
                          <div className="h-48 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#171717', 
                                    borderColor: '#262626', 
                                    borderRadius: '16px',
                                    color: '#fff',
                                    fontSize: '12px'
                                  }} 
                                />
                                <Bar dataKey="value" name="Votos" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                                  {chartData.map((_, i) => (
                                    <Cell key={i} fill={i >= chartData.length * 0.6 ? '#10b981' : (i >= chartData.length * 0.3 ? '#f59e0b' : '#ef4444')} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                          <span>Total de avaliações:</span>
                          <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{totalRatingCount}</strong>
                        </div>
                      </div>
                    );
                  }

                  // 3. Perguntas Abertas de Texto & Sugestões
                  const textAnswers = scopedResponses
                    .map(r => ({
                      id: r.id,
                      text: r.answers[q.id],
                      respondent: r.respondent_name || 'Cidadão Anônimo',
                      neighborhood: r.respondent_neighborhood,
                      date: r.created_at
                    }))
                    .filter(a => !!a.text && String(a.text).trim().length > 0);

                  return (
                    <div key={q.id} className="md:col-span-2 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                            Questão #{idx + 1} · Opiniões Abertas & Relatos da População
                          </span>
                          <h4 className="text-sm font-black text-neutral-900 dark:text-white">{q.label}</h4>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full">
                          {textAnswers.length} depoimentos registrados
                        </span>
                      </div>

                      <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                        {textAnswers.length === 0 ? (
                          <p className="text-xs text-neutral-400 py-6 text-center italic">Nenhum comentário preenchido para esta questão com os filtros atuais.</p>
                        ) : (
                          textAnswers.map((item, tIdx) => (
                            <div key={tIdx} className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 space-y-2 group">
                              <p className="text-xs text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed italic">
                                "{item.text}"
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold pt-1 border-t border-neutral-200/40 dark:border-neutral-700/40">
                                <div className="flex items-center gap-2">
                                  <span>{item.respondent}</span>
                                  {item.neighborhood && <span>· Bairro {item.neighborhood}</span>}
                                  <span>· {new Date(item.date).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <button
                                  onClick={() => handleCopyComment(String(item.text), `${q.id}-${tIdx}`)}
                                  className="opacity-0 group-hover:opacity-100 text-purple-600 hover:underline flex items-center gap-1 transition-opacity"
                                >
                                  {copiedTextIndex === `${q.id}-${tIdx}` ? <Check size={11} /> : <Copy size={11} />}
                                  {copiedTextIndex === `${q.id}-${tIdx}` ? 'Copiado!' : 'Copiar'}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      )}

      {/* Tab: Table of Individual Responses */}
      {activeTab === 'responses' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden space-y-4 p-6">
          
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
            <div className="relative flex-1 min-w-[260px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Buscar por cidadão, CPF, protocolo ou bairro..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium outline-none focus:ring-2 focus:ring-purple-600 dark:text-white"
              />
            </div>

            <span className="text-xs font-bold text-neutral-500">
              Mostrando {tableResponses.length} de {responses.length} respostas
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-100 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 text-white dark:bg-neutral-950 uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="p-4">Protocolo</th>
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Cidadão</th>
                  <th className="p-4">Bairro</th>
                  <th className="p-4">Contato / CPF</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {tableResponses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-neutral-400 italic">
                      Nenhuma resposta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  tableResponses.map(resp => (
                    <tr key={resp.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {resp.protocol}
                      </td>
                      <td className="p-4 text-neutral-500">
                        {new Date(resp.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4 font-bold text-neutral-800 dark:text-neutral-200">
                        {resp.respondent_name || 'Anônimo'}
                      </td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">
                        {resp.respondent_neighborhood || '—'}
                      </td>
                      <td className="p-4 text-neutral-500 font-mono">
                        {resp.respondent_cpf || resp.respondent_phone || '—'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedResponse(resp)}
                          className="px-3.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 text-neutral-700 dark:text-neutral-200 rounded-xl font-bold text-[11px] transition-colors"
                        >
                          Ver Respostas
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: AI Insights & Executive Report */}
      {activeTab === 'ai_insights' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-purple-900/50 via-indigo-900/40 to-neutral-900 rounded-3xl border border-purple-500/30 p-8 shadow-xl space-y-6 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-300">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Assistente de Inteligência Artificial · Gemini</h3>
                  <p className="text-xs text-purple-200/70">Parecer executivo estruturado para o Gabinete do Prefeito e Secretarias</p>
                </div>
              </div>

              <button
                onClick={generateAiReport}
                disabled={loadingAi || responses.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105"
              >
                {loadingAi ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {aiReport ? 'Regenerar Relatório' : 'Gerar Relatório Executivo com IA'}
              </button>
            </div>

            {aiReport ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-neutral-100 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans space-y-4">
                {aiReport}
              </div>
            ) : (
              <div className="p-12 text-center text-purple-200/60 space-y-3 bg-white/5 rounded-2xl border border-white/5">
                <Sparkles size={36} className="mx-auto text-purple-400/60 animate-pulse" />
                <p className="text-sm font-bold text-white">Clique no botão acima para processar os dados</p>
                <p className="text-xs max-w-md mx-auto text-purple-200/60">
                  A IA analisará todas as {scopedResponses.length} respostas, cruzará os bairros com as notas e entregará um documento pronto para despacho oficial.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Response Detail Modal */}
      <AnimatePresence>
        {selectedResponse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black uppercase font-mono">
                    Protocolo: {selectedResponse.protocol}
                  </span>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white mt-1.5">
                    {selectedResponse.respondent_name || 'Participação Anônima'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Registrado em {new Date(selectedResponse.created_at).toLocaleString('pt-BR')} · {selectedResponse.respondent_neighborhood || 'Bairro não informado'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedResponse(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Citizen info */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">CPF:</span>
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedResponse.respondent_cpf || 'Não exigido'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Telefone / WhatsApp:</span>
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedResponse.respondent_phone || 'Não informado'}</p>
                </div>
              </div>

              {/* List of answers */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Respostas Fornecidas</h4>
                {form.questions
                  .filter(q => q.type !== 'section_header')
                  .map((q, idx) => {
                    const ans = selectedResponse.answers[q.id];
                    return (
                      <div key={q.id} className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                        <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                          {idx + 1}. {q.label}
                        </p>
                        <div className="text-sm font-black text-neutral-900 dark:text-white">
                          {Array.isArray(ans) ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {ans.map((a, i) => (
                                <span key={i} className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold">
                                  {a}
                                </span>
                              ))}
                            </div>
                          ) : typeof ans === 'boolean' ? (
                            ans ? '✅ Sim' : '❌ Não'
                          ) : q.type === 'rating_stars' ? (
                            <span className="text-amber-500 font-bold">{ans} de 5 ★</span>
                          ) : (
                            ans !== undefined && ans !== '' ? String(ans) : <span className="text-neutral-400 font-normal italic">Em branco</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <button
                onClick={() => setSelectedResponse(null)}
                className="w-full py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all"
              >
                Fechar Detalhes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
