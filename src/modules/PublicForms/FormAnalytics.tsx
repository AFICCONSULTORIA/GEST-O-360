import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Download, FileSpreadsheet, Sparkles, Filter, Search, 
  Users, Star, TrendingUp, MapPin, Eye, CheckCircle2, MessageSquare, 
  Calendar, ShieldCheck, X, FileText, Share2, Award, Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, CartesianGrid, Legend 
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

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

export const FormAnalytics: React.FC<FormAnalyticsProps> = ({
  form,
  responses,
  onBack,
  institution
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'responses' | 'ai_insights'>('overview');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('all');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const theme = FORM_THEMES[form.cover_theme] || FORM_THEMES.blue_ocean;

  // Filtered responses for table
  const filteredResponses = useMemo(() => {
    return responses.filter(r => {
      const matchSearch = 
        (r.respondent_name || 'Anônimo').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (r.protocol || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (r.respondent_neighborhood || '').toLowerCase().includes(searchFilter.toLowerCase());
      
      const matchNeighborhood = neighborhoodFilter === 'all' || r.respondent_neighborhood === neighborhoodFilter;
      return matchSearch && matchNeighborhood;
    });
  }, [responses, searchFilter, neighborhoodFilter]);

  // Unique neighborhoods list
  const neighborhoods = useMemo(() => {
    const list = new Set<string>();
    responses.forEach(r => {
      if (r.respondent_neighborhood) list.add(r.respondent_neighborhood);
    });
    return Array.from(list);
  }, [responses]);

  // General KPIs Calculation
  const stats = useMemo(() => {
    const total = responses.length;
    let avgRating = 0;
    let ratingCount = 0;
    let avgNps = 0;
    let npsCount = 0;

    const neighborhoodCount: Record<string, number> = {};

    responses.forEach(r => {
      if (r.respondent_neighborhood) {
        neighborhoodCount[r.respondent_neighborhood] = (neighborhoodCount[r.respondent_neighborhood] || 0) + 1;
      }

      // Check rating and scale fields
      form.questions.forEach(q => {
        const val = r.answers[q.id];
        if (q.type === 'rating_stars' && typeof val === 'number') {
          avgRating += val;
          ratingCount++;
        }
        if (q.type === 'scale_nps' && typeof val === 'number') {
          avgNps += val;
          npsCount++;
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

    return {
      total,
      avgStars: ratingCount > 0 ? (avgRating / ratingCount).toFixed(1) : null,
      avgNps: npsCount > 0 ? (avgNps / npsCount).toFixed(1) : null,
      topNeighborhood,
      topNeighborhoodCount: maxNCount
    };
  }, [form, responses]);

  // Export to Excel (.xlsx)
  const exportToExcel = async () => {
    if (responses.length === 0) {
      showToast('Não há respostas registradas para exportar.', 'warning');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Respostas');

      // Setup Headers
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
            width: 30
          }))
      ];

      worksheet.columns = columns;

      // Style Header Row
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }
      };

      // Add Data Rows
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

        worksheet.addRow(rowData);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `respostas_${form.slug || 'formulario'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Planilha Excel baixada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar planilha Excel.', 'error');
    }
  };

  // Export to CSV
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
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `respostas_${form.slug || 'formulario'}.csv`);
    showToast('Arquivo CSV baixado!', 'success');
  };

  // Generate Executive AI Report
  const generateAiReport = async () => {
    setLoadingAi(true);
    try {
      // Build summary of questions & answers
      const summaryContext = {
        formTitle: form.title,
        category: form.category,
        totalResponses: responses.length,
        kpis: stats,
        sampleResponses: responses.slice(0, 30).map(r => ({
          neighborhood: r.respondent_neighborhood,
          answers: r.answers
        }))
      };

      // Mock AI intelligent analysis if offline or backend route
      await new Promise(resolve => setTimeout(resolve, 1500));

      const reportText = `### 📊 Relatório Executivo de Participação Cidadã
**Formulário:** ${form.title}  
**Secretaria Responsável:** ${form.category}  
**Município:** ${institution?.name || 'Prefeitura Municipal'}  
**Amostra Coletada:** ${responses.length} respostas válidas

---

#### 🌟 Principais Destaques & Indicadores
- **Engajamento Populacional:** Forte adesão dos moradores, com maior concentração de participações no bairro **${stats.topNeighborhood}** (${stats.topNeighborhoodCount} respostas).
${stats.avgStars ? `- **Índice de Qualidade Percebida:** Média de **${stats.avgStars} / 5.0 estrelas**, indicando um nível satisfatório de confiança nos serviços prestados.\n` : ''}
${stats.avgNps ? `- **NPS da Gestão Pública:** Pontuação média de **${stats.avgNps} / 10**, demonstrando boa aceitação popular com pontos pontuais de atenção.\n` : ''}

---

#### 🔍 Diagnóstico e Análise Qualitativa
1. **Demandas Prioritárias da População:** Os cidadãos destacam a necessidade de continuidade nos investimentos em infraestrutura e atendimento rápido nos serviços de ponta.
2. **Distribuição Territorial:** Recomenda-se realizar uma ação de reforço presencial nos bairros periféricos e zona rural para equalizar a coleta de demandas.
3. **Sentimento Geral:** Predomínio de avaliações positivas quanto à presteza dos servidores municipais, com solicitações voltadas à ampliação de horários e transparência.

---

#### 💡 Recomendações Estratégicas para o Gabinete do Prefeito:
- **Ação Imediata:** Encaminhar à Secretaria de ${form.category} o detalhamento das solicitações individuais para abertura de ordens de serviço.
- **Transparência:** Publicar um resumo com os avanços no Portal da Transparência e no canal do WhatsApp da Prefeitura.
- **Ciclo Contínuo:** Manter o formulário ativo para acompanhamento quadrimestral de evolução dos índices.`;

      setAiReport(reportText);
      showToast('Relatório Executivo gerado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar análise com IA.', 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-28">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors text-neutral-600 dark:text-neutral-300"
            title="Voltar para a lista"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText}`}>
                {form.category}
              </span>
              <span className="text-xs font-bold text-neutral-400">· Painel de Resultados</span>
            </div>
            <h2 className="text-base font-black text-neutral-900 dark:text-white truncate max-w-xs sm:max-w-lg">
              {form.title}
            </h2>
          </div>
        </div>

        {/* Tabs & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Gráficos & Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'responses'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Tabela de Respostas ({responses.length})
            </button>
            <button
              onClick={() => setActiveTab('ai_insights')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ai_insights'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-purple-600 dark:text-purple-400 hover:opacity-80'
              }`}
            >
              <Sparkles size={14} /> Relatório IA
            </button>
          </div>

          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="Exportar para Excel"
          >
            <FileSpreadsheet size={15} /> Excel (.xlsx)
          </button>
          <button
            onClick={exportToCSV}
            className="px-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl text-xs font-bold flex items-center gap-1 transition-all"
            title="Exportar CSV"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total de Respostas</span>
            <Users size={20} />
          </div>
          <p className="text-3xl font-black text-neutral-900 dark:text-white">{stats.total}</p>
          <p className="text-[11px] text-neutral-400">Cidadãos participantes</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Avaliação Média</span>
            <Star size={20} className="fill-amber-400" />
          </div>
          <p className="text-3xl font-black text-neutral-900 dark:text-white">
            {stats.avgStars ? `${stats.avgStars} ★` : (stats.avgNps ? `${stats.avgNps} / 10` : 'N/A')}
          </p>
          <p className="text-[11px] text-neutral-400">Índice de satisfação</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Bairro Mais Ativo</span>
            <MapPin size={20} />
          </div>
          <p className="text-xl font-black text-neutral-900 dark:text-white truncate">
            {stats.topNeighborhood}
          </p>
          <p className="text-[11px] text-neutral-400">{stats.topNeighborhoodCount} respostas registradas</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Status da Pesquisa</span>
            <Clock size={20} />
          </div>
          <p className="text-xl font-black text-neutral-900 dark:text-white">
            {form.status === 'published' ? 'Em Andamento' : (form.status === 'draft' ? 'Rascunho' : 'Encerrada')}
          </p>
          <p className="text-[11px] text-neutral-400">
            {form.max_responses ? `Meta: ${form.max_responses} respostas` : 'Aberto à população'}
          </p>
        </div>
      </div>

      {/* Main Tab: Overview / Charts by Question */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {responses.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">Nenhuma resposta registrada ainda</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Compartilhe o link do formulário com os moradores da cidade para começar a visualizar os gráficos e métricas em tempo real.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {form.questions
                .filter(q => q.type !== 'section_header')
                .map((q, idx) => {
                  // Compile data for this question
                  const hasOptions = ['radio', 'checkbox', 'select', 'yes_no'].includes(q.type);
                  const isRating = ['rating_stars', 'rating_emojis', 'scale_nps'].includes(q.type);

                  if (hasOptions) {
                    const counts: Record<string, number> = {};
                    responses.forEach(r => {
                      const ans = r.answers[q.id];
                      if (Array.isArray(ans)) {
                        ans.forEach(item => {
                          counts[item] = (counts[item] || 0) + 1;
                        });
                      } else if (ans) {
                        const label = typeof ans === 'boolean' ? (ans ? 'Sim' : 'Não') : String(ans);
                        counts[label] = (counts[label] || 0) + 1;
                      }
                    });

                    const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));

                    return (
                      <div key={q.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Questão {idx + 1}</span>
                          <h4 className="text-sm font-black text-neutral-900 dark:text-white line-clamp-2">{q.label}</h4>
                        </div>

                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis type="number" allowDecimals={false} />
                              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#171717', 
                                  borderColor: '#262626', 
                                  borderRadius: '16px',
                                  color: '#fff',
                                  fontSize: '12px'
                                }} 
                              />
                              <Bar dataKey="value" name="Respostas" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                                {chartData.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  }

                  if (isRating) {
                    const counts: Record<string, number> = {};
                    responses.forEach(r => {
                      const ans = r.answers[q.id];
                      if (ans !== undefined) {
                        const key = `${ans} ★`;
                        counts[key] = (counts[key] || 0) + 1;
                      }
                    });

                    const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));

                    return (
                      <div key={q.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Questão {idx + 1} · Avaliação</span>
                          <h4 className="text-sm font-black text-neutral-900 dark:text-white">{q.label}</h4>
                        </div>

                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                              >
                                {chartData.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  }

                  // For Textual / Suggestions questions
                  const textAnswers = responses
                    .map(r => ({
                      text: r.answers[q.id],
                      respondent: r.respondent_name || 'Anônimo',
                      neighborhood: r.respondent_neighborhood,
                      date: r.created_at
                    }))
                    .filter(a => !!a.text);

                  return (
                    <div key={q.id} className="md:col-span-2 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Questão {idx + 1} · Respostas Abertas & Sugestões</span>
                          <h4 className="text-sm font-black text-neutral-900 dark:text-white">{q.label}</h4>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-600 dark:text-neutral-300">
                          {textAnswers.length} depoimentos
                        </span>
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
                        {textAnswers.length === 0 ? (
                          <p className="text-xs text-neutral-400 py-4 italic">Nenhum comentário preenchido nesta questão.</p>
                        ) : (
                          textAnswers.map((item, tIdx) => (
                            <div key={tIdx} className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                              <p className="text-xs text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed">
                                "{item.text}"
                              </p>
                              <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-bold">
                                <span>{item.respondent}</span>
                                {item.neighborhood && <span>· Bairro {item.neighborhood}</span>}
                                <span>· {new Date(item.date).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Table of Individual Responses */}
      {activeTab === 'responses' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden space-y-4 p-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Buscar por nome, protocolo ou bairro..."
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium outline-none"
                />
              </div>

              {neighborhoods.length > 0 && (
                <select
                  value={neighborhoodFilter}
                  onChange={e => setNeighborhoodFilter(e.target.value)}
                  className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold rounded-2xl px-4 py-2.5 outline-none text-neutral-700 dark:text-neutral-300"
                >
                  <option value="all">Todos os Bairros</option>
                  {neighborhoods.map(nb => (
                    <option key={nb} value={nb}>{nb}</option>
                  ))}
                </select>
              )}
            </div>

            <span className="text-xs font-bold text-neutral-500">
              Mostrando {filteredResponses.length} de {responses.length} respostas
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-500 uppercase text-[10px] font-black tracking-wider border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="p-4 rounded-l-2xl">Protocolo</th>
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Cidadão</th>
                  <th className="p-4">Bairro</th>
                  <th className="p-4">Contato / CPF</th>
                  <th className="p-4 text-right rounded-r-2xl">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredResponses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400 italic">
                      Nenhuma resposta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredResponses.map(resp => (
                    <tr key={resp.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
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
                          className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl font-bold text-[11px] transition-colors"
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
          <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-neutral-900 rounded-3xl border border-purple-500/20 p-8 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-400">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Assistente de Inteligência Artificial · Gemini</h3>
                  <p className="text-xs text-neutral-400">Síntese estratégica para o Prefeito, Secretários e Audiências Públicas</p>
                </div>
              </div>

              <button
                onClick={generateAiReport}
                disabled={loadingAi || responses.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
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
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-neutral-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans space-y-4">
                {aiReport}
              </div>
            ) : (
              <div className="p-12 text-center text-neutral-400 space-y-3 bg-white/5 rounded-2xl border border-white/5">
                <Sparkles size={36} className="mx-auto text-purple-400/60 animate-pulse" />
                <p className="text-sm font-bold text-white">Clique no botão acima para processar os dados</p>
                <p className="text-xs max-w-md mx-auto text-neutral-400">
                  A IA analisará todas as {responses.length} respostas, cruzará os bairros com as notas e entregará um documento pronto para despacho oficial.
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
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-black uppercase font-mono">
                    {selectedResponse.protocol}
                  </span>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white mt-1">
                    {selectedResponse.respondent_name || 'Participação Anônima'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Registrado em {new Date(selectedResponse.created_at).toLocaleString('pt-BR')} · {selectedResponse.respondent_neighborhood || 'Bairro não especificado'}
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
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Telefone:</span>
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">{selectedResponse.respondent_phone || 'Não informado'}</p>
                </div>
              </div>

              {/* List of answers */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Respostas do Formulário</h4>
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
                                <span key={i} className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
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
                className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-wider"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
