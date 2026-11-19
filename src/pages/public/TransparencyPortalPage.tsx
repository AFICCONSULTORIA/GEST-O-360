import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileBadge,
  FileText,
  HardHat,
  Landmark,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Institution } from '../../types';
import { PublicInstitutionalLayout } from '../../layouts/PublicInstitutionalLayout';
import {
  INITIAL_TRANSPARENCY_FILTERS,
  TransparencyFilterBar,
  TransparencyFilterState,
} from '../../components/TransparencyFilterBar';
import { OpenDataExportBar } from '../../components/OpenDataExportBar';
import {
  fetchNonOccurrenceDeclarations,
  fetchPublicTransparencyRecords,
  maskCpfClient,
  NonOccurrenceDeclaration,
  PublicTransparencyRecord,
  TransparencyModuleKey,
} from '../../lib/api/pntpPortal';

export interface TransparencyPortalPageProps {
  institution: Institution;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

type MainTab = 'orcamento' | 'licitacoes' | 'rh' | 'repasses';

const TAB_CONFIG: {
  key: MainTab;
  label: string;
  icon: React.FC<{ size?: number }>;
  modules: TransparencyModuleKey[];
}[] = [
  {
    key: 'orcamento',
    label: 'Execução Orçamentária e Fiscal',
    icon: Wallet,
    modules: ['revenues', 'expenses', 'fiscal_reports'],
  },
  {
    key: 'licitacoes',
    label: 'Licitações, Contratos e Obras',
    icon: HardHat,
    modules: ['biddings', 'contracts', 'public_works'],
  },
  {
    key: 'rh',
    label: 'Recursos Humanos',
    icon: Users,
    modules: ['payroll', 'per_diems', 'interns', 'outsourced'],
  },
  {
    key: 'repasses',
    label: 'Repasses, Emendas e Setoriais',
    icon: Landmark,
    modules: ['agreements', 'amendments', 'sectoral', 'councils'],
  },
];

const MODULE_LABELS: Record<TransparencyModuleKey, string> = {
  revenues: 'Receitas',
  expenses: 'Despesas',
  fiscal_reports: 'PPA / LDO / LOA / RREO / RGF / TCE',
  biddings: 'Licitações, Dispensas e PCA',
  contracts: 'Contratos e Aditivos',
  public_works: 'Obras Públicas',
  payroll: 'Folha de Pagamento Nominal',
  per_diems: 'Diárias e Passagens',
  interns: 'Estagiários',
  outsourced: 'Terceirizados',
  agreements: 'Convênios e Repasses',
  amendments: 'Emendas Parlamentares',
  sectoral: 'Saúde / Educação (FUNDEB) / Assistência',
  councils: 'Conselhos Municipais (Atas e Composição)',
};

function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function buildBaselineRecords(institutionId: string, year: number): PublicTransparencyRecord[] {
  return [
    {
      id: 'base-rev-1',
      institution_id: institutionId,
      module_key: 'revenues',
      fiscal_year: year,
      record_date: `${year}-03-15`,
      department_name: 'Secretaria Municipal de Finanças',
      process_number: `REC-001/${year}`,
      creditor_or_subject: 'FPM — Fundo de Participação dos Municípios',
      document_number: null,
      title: 'Cota-Parte do Fundo de Participação dos Municípios (FPM)',
      description: 'Transferência constitucional da União — arrecadação corrente.',
      amount_planned: 18500000,
      amount_executed: 6420500,
      status: 'published',
      metadata: { fonte: '1.500.0000', categoria: 'Transferências Correntes' },
      file_url: null,
    },
    {
      id: 'base-exp-1',
      institution_id: institutionId,
      module_key: 'expenses',
      fiscal_year: year,
      record_date: `${year}-04-10`,
      department_name: 'Secretaria Municipal de Saúde',
      process_number: `EMP-102/${year}`,
      creditor_or_subject: 'Distribuidora Hospitalar Central Ltda',
      document_number: '12.345.678/0001-90',
      title: 'Aquisição de medicamentos da Atenção Básica (RENAME)',
      description: 'Empenho nº 102 — Liquidação e pagamento integral realizados.',
      amount_planned: 320000,
      amount_executed: 320000,
      status: 'published',
      metadata: { empenho: 320000, liquidacao: 320000, pagamento: 320000 },
      file_url: null,
    },
    {
      id: 'base-fisc-1',
      institution_id: institutionId,
      module_key: 'fiscal_reports',
      fiscal_year: year,
      record_date: `${year}-05-30`,
      department_name: 'Controladoria Geral / Contabilidade',
      process_number: `LRF-RREO-2B/${year}`,
      creditor_or_subject: 'RREO / RGF / PPA / LDO / LOA / Balanço Anual / Parecer TCE',
      document_number: null,
      title: `Relatório Resumido da Execução Orçamentária (RREO) — 2º Bimestre/${year}`,
      description: 'Publicação bimestral exigida pela Lei Complementar nº 101/2000 (LRF).',
      amount_planned: 0,
      amount_executed: 0,
      status: 'published',
      metadata: { instrumento: 'RREO', orgao_controle: 'TCE' },
      file_url: null,
    },
    {
      id: 'base-bid-1',
      institution_id: institutionId,
      module_key: 'biddings',
      fiscal_year: year,
      record_date: `${year}-02-20`,
      department_name: 'Comissão Permanente de Contratação',
      process_number: `PE-014/${year}`,
      creditor_or_subject: 'Pregão Eletrônico — Lei nº 14.133/2021',
      document_number: null,
      title: 'Registro de Preços para Transporte Escolar Rural (PCA 2026)',
      description: 'Edital, ata de registro de preços e termo de homologação disponíveis.',
      amount_planned: 1450000,
      amount_executed: 1380000,
      status: 'published',
      metadata: { modalidade: 'Pregão Eletrônico', pncp_id: `PNCP-${year}-014` },
      file_url: null,
    },
    {
      id: 'base-work-1',
      institution_id: institutionId,
      module_key: 'public_works',
      fiscal_year: year,
      record_date: `${year}-06-01`,
      department_name: 'Secretaria de Obras e Infraestrutura',
      process_number: `OBR-003/${year}`,
      creditor_or_subject: 'Construtora Exemplo Engenharia S.A.',
      document_number: '98.765.432/0001-10',
      title: 'Pavimentação Asfáltica e Drenagem — Setor Central',
      description: 'Cronograma físico-financeiro: 68% executado. Fiscal: Eng. Marcos Silva (CREA).',
      amount_planned: 2400000,
      amount_executed: 1632000,
      status: 'published',
      metadata: {
        progresso_fisico: '68%',
        fiscal_contrato: 'Eng. Marcos Silva',
        situacao_obra: 'Em Execução',
      },
      file_url: null,
    },
    {
      id: 'base-pay-1',
      institution_id: institutionId,
      module_key: 'payroll',
      fiscal_year: year,
      record_date: `${year}-06-30`,
      department_name: 'Secretaria Municipal de Educação',
      process_number: `FOL-06/${year}`,
      creditor_or_subject: 'Ana Paula Ferreira (Professor Nível II — 40h)',
      document_number: '12345678901',
      title: 'Folha Nominal — Magistério Municipal',
      description: 'Carga horária: 40h semanais | Lotação: Escola Municipal Central.',
      amount_planned: 6850,
      amount_executed: 5340.5,
      status: 'published',
      metadata: {
        cargo: 'Professor Nível II',
        carga_horaria: '40h',
        bruto: 6850,
        descontos: 1509.5,
        liquido: 5340.5,
      },
      file_url: null,
    },
    {
      id: 'base-diaria-1',
      institution_id: institutionId,
      module_key: 'per_diems',
      fiscal_year: year,
      record_date: `${year}-05-12`,
      department_name: 'Secretaria Municipal de Saúde',
      process_number: `DIA-088/${year}`,
      creditor_or_subject: 'Carlos Eduardo Mendes (Motorista de Ambulância)',
      document_number: '23456789012',
      title: 'Diária — Transporte de pacientes TFD para capital',
      description: 'Destino: Capital do Estado — 2 diárias com comprovação de deslocamento.',
      amount_planned: 480,
      amount_executed: 480,
      status: 'published',
      metadata: { quantidade: 2, destino: 'Capital do Estado' },
      file_url: null,
    },
    {
      id: 'base-agr-1',
      institution_id: institutionId,
      module_key: 'agreements',
      fiscal_year: year,
      record_date: `${year}-04-05`,
      department_name: 'Secretaria de Assistência Social',
      process_number: `CONV-009/${year}`,
      creditor_or_subject: 'Ministério do Desenvolvimento Social (MDS)',
      document_number: '00.394.460/0001-41',
      title: 'Convênio CRAS Volante — Proteção Social Básica',
      description: 'Repasse fundo a fundo para manutenção de equipe técnica.',
      amount_planned: 280000,
      amount_executed: 140000,
      status: 'published',
      metadata: { concedente: 'União Federal', vigencia: `31/12/${year}` },
      file_url: null,
    },
    {
      id: 'base-amd-1',
      institution_id: institutionId,
      module_key: 'amendments',
      fiscal_year: year,
      record_date: `${year}-05-20`,
      department_name: 'Secretaria Municipal de Saúde',
      process_number: `EM-021/${year}`,
      creditor_or_subject: 'Emenda Parlamentar Individual — Bancada Estadual',
      document_number: null,
      title: 'Aquisição de Ambulância UTI Móvel — Atenção Especializada',
      description: 'Autor: Parlamentar Estadual | Objeto: Equipamento hospitalar.',
      amount_planned: 420000,
      amount_executed: 420000,
      status: 'published',
      metadata: { tipo_emenda: 'Individual', status_execucao: 'Liquidada' },
      file_url: null,
    },
    {
      id: 'base-sec-1',
      institution_id: institutionId,
      module_key: 'sectoral',
      fiscal_year: year,
      record_date: `${year}-06-15`,
      department_name: 'Secretaria Municipal de Educação',
      process_number: `FUNDEB-${year}`,
      creditor_or_subject: 'Painel Setorial FUNDEB (70% Magistério / 30% MDE)',
      document_number: null,
      title: `Demonstrativo de Aplicação FUNDEB — Exercício ${year}`,
      description: 'Aplicação mínima constitucional de 25% em MDE e 70% na valorização do magistério.',
      amount_planned: 9200000,
      amount_executed: 6890000,
      status: 'published',
      metadata: { percentual_aplicado: '74.9%', conselho_aprovacao: 'CACS-FUNDEB' },
      file_url: null,
    },
  ];
}

export const TransparencyPortalPage: React.FC<TransparencyPortalPageProps> = ({
  institution,
  darkMode,
  setDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('orcamento');
  const [selectedModule, setSelectedModule] = useState<TransparencyModuleKey | 'all'>('all');
  const [filters, setFilters] = useState<TransparencyFilterState>(() => {
    const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') || '' : '';
    return { ...INITIAL_TRANSPARENCY_FILTERS, keyword: q };
  });
  const [records, setRecords] = useState<PublicTransparencyRecord[]>([]);
  const [declarations, setDeclarations] = useState<NonOccurrenceDeclaration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [dbRows, dbDecls] = await Promise.all([
        fetchPublicTransparencyRecords(institution.id),
        fetchNonOccurrenceDeclarations(institution.id),
      ]);
      if (!active) return;
      const yearNum = Number(filters.year) || new Date().getFullYear();
      setRecords(dbRows.length > 0 ? dbRows : buildBaselineRecords(institution.id, yearNum));
      setDeclarations(dbDecls);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [institution.id]);

  const currentTabConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (!currentTabConfig.modules.includes(rec.module_key)) return false;
      if (selectedModule !== 'all' && rec.module_key !== selectedModule) return false;
      if (filters.year !== 'all' && String(rec.fiscal_year) !== filters.year) return false;
      if (filters.startDate && rec.record_date && rec.record_date < filters.startDate) return false;
      if (filters.endDate && rec.record_date && rec.record_date > filters.endDate) return false;
      if (
        filters.department &&
        !(rec.department_name || '').toLowerCase().includes(filters.department.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.creditor &&
        !(rec.creditor_or_subject || '').toLowerCase().includes(filters.creditor.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.document &&
        !(rec.document_number || '').replace(/\D/g, '').includes(filters.document.replace(/\D/g, ''))
      ) {
        return false;
      }
      if (
        filters.processNumber &&
        !(rec.process_number || '').toLowerCase().includes(filters.processNumber.toLowerCase())
      ) {
        return false;
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const blob = `${rec.title} ${rec.description || ''} ${rec.creditor_or_subject || ''} ${rec.department_name || ''} ${rec.process_number || ''}`.toLowerCase();
        if (!blob.includes(kw)) return false;
      }
      return true;
    });
  }, [records, currentTabConfig, selectedModule, filters]);

  const activeDeclaration = useMemo(() => {
    return declarations.find(
      (d) =>
        (selectedModule === 'all'
          ? currentTabConfig.modules.includes(d.module_key as TransparencyModuleKey)
          : d.module_key === selectedModule) &&
        (filters.year === 'all' || String(d.fiscal_year) === filters.year)
    );
  }, [declarations, currentTabConfig, selectedModule, filters.year]);

  const exportRows = useMemo(
    () =>
      filteredRecords.map((r) => ({
        modulo: MODULE_LABELS[r.module_key] || r.module_key,
        exercicio: r.fiscal_year,
        data: r.record_date || '',
        processo: r.process_number || '',
        orgao_secretaria: r.department_name || '',
        credor_assunto: r.creditor_or_subject || '',
        cpf_cnpj_mascarado: maskCpfClient(r.document_number),
        titulo: r.title,
        descricao: r.description || '',
        valor_previsto: r.amount_planned,
        valor_executado: r.amount_executed,
      })),
    [filteredRecords]
  );

  const departments = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.department_name) set.add(r.department_name);
    });
    return Array.from(set).sort();
  }, [records]);

  const handleDownloadDeclaration = (decl: NonOccurrenceDeclaration) => {
    const content = [
      `CERTIDÃO FORMAL DE NÃO OCORRÊNCIA — PNTP / ATRICON`,
      `Ente Público: ${institution.name}`,
      `Módulo: ${MODULE_LABELS[decl.module_key as TransparencyModuleKey] || decl.module_key}`,
      `Exercício: ${decl.fiscal_year} (${decl.period_start} a ${decl.period_end})`,
      `Justificativa Oficial: ${decl.justification}`,
      `Emitido por: ${decl.issuer_name} — ${decl.issuer_role}`,
      `Hash de Autenticidade: ${decl.document_hash}`,
      `Publicado em: ${new Date(decl.published_at).toLocaleString('pt-BR')}`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certidao_nao_ocorrencia_${decl.module_key}_${decl.fiscal_year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PublicInstitutionalLayout
      institution={institution}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      activeNav="transparencia"
      pageTitle="Portal da Transparência Ativa"
      pageSubtitle="Consulta pública em tempo real, série histórica, dados abertos (CSV, JSON, XML, XLSX) e conformidade com a Matriz PNTP / Atricon, LAI (12.527/2011), LRF (LC 101/2000) e Lei 14.133/2021."
    >
      <div className="space-y-6">
        {/* Selo e Links Oficiais Obrigatórios (PNCP / LRF) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-white">
              <Award size={20} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                Padrão Nacional de Transparência Pública — PNTP / Atricon
              </p>
              <p className="text-[11px] text-slate-600 dark:text-neutral-400">
                Dados pessoais protegidos com mascaramento automático de CPF (LGPD — Lei nº 13.709/2018).
              </p>
            </div>
          </div>
          <a
            href="https://pncp.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition"
          >
            <ExternalLink size={13} />
            Portal Nacional de Contratações Públicas (PNCP)
          </a>
        </div>

        {/* Abas Principais */}
        <div role="tablist" aria-label="Eixos do Portal da Transparência" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedModule('all');
                }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-left text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                    : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Submódulos da aba ativa */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedModule('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
              selectedModule === 'all'
                ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
            }`}
          >
            Todos do Eixo
          </button>
          {currentTabConfig.modules.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setSelectedModule(mod)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                selectedModule === mod
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                  : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
              }`}
            >
              {MODULE_LABELS[mod]}
            </button>
          ))}
        </div>

        {/* Motor de Filtros Combinados */}
        <TransparencyFilterBar
          filters={filters}
          onChange={setFilters}
          departments={departments}
        />

        {/* Banner Oficial de Declaração de Não Ocorrência (PNTP) */}
        {activeDeclaration && (
          <div
            role="status"
            className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <FileBadge size={22} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-extrabold text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                  Declaração Formal de Não Ocorrência — Exercício {activeDeclaration.fiscal_year}
                </p>
                <p className="text-amber-900 dark:text-amber-300">{activeDeclaration.justification}</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-400 font-mono">
                  Responsável: {activeDeclaration.issuer_name} ({activeDeclaration.issuer_role}) • Hash: {activeDeclaration.document_hash}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadDeclaration(activeDeclaration)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-900 text-white text-xs font-bold hover:bg-amber-800 shrink-0 cursor-pointer"
            >
              <Download size={14} />
              Baixar Certidão
            </button>
          </div>
        )}

        {/* Barra Universal de Exportação em Dados Abertos */}
        <OpenDataExportBar
          data={exportRows}
          filename={`transparencia_${activeTab}_${filters.year}`}
        />

        {/* Tabela de Resultados */}
        <section
          aria-label="Resultados da consulta de transparência"
          className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs"
        >
          {loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-500">
              Carregando registros públicos...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <AlertCircle size={28} className="mx-auto text-slate-400" />
              <p className="text-sm font-bold text-slate-700 dark:text-neutral-300">
                Nenhum registro encontrado para os filtros selecionados.
              </p>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Ajuste os filtros acima ou consulte outro exercício na série histórica.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Data / Processo</th>
                    <th className="px-4 py-3 font-extrabold">Módulo / Órgão</th>
                    <th className="px-4 py-3 font-extrabold">Descrição / Objeto</th>
                    <th className="px-4 py-3 font-extrabold">Credor / CPF-CNPJ</th>
                    <th className="px-4 py-3 font-extrabold text-right">Previsto / Bruto</th>
                    <th className="px-4 py-3 font-extrabold text-right">Executado / Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/40">
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {rec.record_date
                            ? new Date(rec.record_date + 'T00:00:00').toLocaleDateString('pt-BR')
                            : rec.fiscal_year}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                          {rec.process_number || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-[10px] font-bold text-slate-700 dark:text-neutral-300 mb-1">
                          {MODULE_LABELS[rec.module_key]}
                        </span>
                        <span className="block text-[11px] text-slate-600 dark:text-neutral-400">
                          {rec.department_name || 'Administração Geral'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top max-w-sm">
                        <p className="font-bold text-slate-900 dark:text-white">{rec.title}</p>
                        {rec.description && (
                          <p className="text-[11px] text-slate-600 dark:text-neutral-400 mt-0.5">
                            {rec.description}
                          </p>
                        )}
                        {rec.file_url && (
                          <a
                            href={rec.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-slate-900 dark:text-white underline"
                          >
                            <FileText size={11} /> Anexo Oficial
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <p className="font-semibold text-slate-800 dark:text-neutral-200">
                          {rec.creditor_or_subject || '—'}
                        </p>
                        {rec.document_number && (
                          <p className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                            <ShieldCheck size={11} /> {maskCpfClient(rec.document_number)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right font-mono font-semibold text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                        {rec.amount_planned > 0 ? formatCurrencyBRL(rec.amount_planned) : '—'}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {rec.amount_executed > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            {formatCurrencyBRL(rec.amount_executed)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Nota explicativa LGPD & Série Histórica */}
        <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-2">
          <Building2 size={14} />
          <span>
            Série histórica disponível para consulta e download em formatos abertos (CSV, JSON, XML, XLSX/ODS) conforme Art. 8º, §3º da Lei nº 12.527/2011.
          </span>
        </div>
      </div>
    </PublicInstitutionalLayout>
  );
};

export default TransparencyPortalPage;
