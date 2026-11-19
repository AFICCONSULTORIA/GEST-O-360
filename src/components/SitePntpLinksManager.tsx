import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Institution } from '../types';
import {
  DEFAULT_EXTERNAL_TRANSPARENCY_URL,
  InstitutionalSiteConfig,
  PntpCriterionLink,
} from '../lib/api/institutionalSite';
import { withInstitutionQuery } from '../lib/institutionModules';
import { showToast } from './ui/Toast';

export interface SitePntpLinksManagerProps {
  config: InstitutionalSiteConfig;
  onChange: (next: InstitutionalSiteConfig) => void;
  institution: Institution;
  accentHex: string;
}

function buildDefaultPntpLinks(
  institution: Institution,
  externalBase: string
): PntpCriterionLink[] {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://gestao360sistema.com.br';
  const ext = (externalBase || DEFAULT_EXTERNAL_TRANSPARENCY_URL).replace(/\/+$/, '') + '/';
  const siteUrl = (path: string) => `${origin}${withInstitutionQuery(path, institution)}`;

  return [
    // 1. Informações Institucionais
    {
      id: 'pntp-1-1',
      code: '1.1',
      dimension: 'Informações Institucionais',
      title: 'Site oficial com estrutura organizacional, competências e "Quem é Quem"',
      classification: 'Obrigatório',
      sourceType: 'site_institucional',
      url: siteUrl('/estrutura'),
      status: 'pronto',
      notes: 'Organograma, secretários, horários, telefones e endereços.',
    },
    {
      id: 'pntp-1-2',
      code: '1.2',
      dimension: 'Informações Institucionais',
      title: 'Carta de Serviços ao Usuário (Lei nº 13.460/2017)',
      classification: 'Obrigatório',
      sourceType: 'site_institucional',
      url: siteUrl('/carta-de-servicos'),
      status: 'pronto',
      notes: 'Catálogo com prazos, documentos, etapas e avaliação de satisfação.',
    },
    {
      id: 'pntp-1-3',
      code: '1.3',
      dimension: 'Informações Institucionais',
      title: 'Legislação Municipal (Lei Orgânica, Códigos, Leis e Decretos)',
      classification: 'Obrigatório',
      sourceType: 'site_institucional',
      url: siteUrl('/legislacao'),
      status: 'pronto',
      notes: 'Busca indexada com texto original e compilado.',
    },
    {
      id: 'pntp-1-4',
      code: '1.4',
      dimension: 'Informações Institucionais',
      title: 'Diário Oficial Eletrônico (Atos Oficiais)',
      classification: 'Obrigatório',
      sourceType: 'site_institucional',
      url: siteUrl('/diario'),
      status: 'pronto',
      notes: 'Edições oficiais com validação de autenticidade.',
    },
    // 2. Receitas e Despesas (Portal Externo)
    {
      id: 'pntp-2-1',
      code: '2.1',
      dimension: 'Receitas e Despesas',
      title: 'Portal da Transparência — Receitas (Prevista, Lançada e Arrecadada)',
      classification: 'Essencial',
      sourceType: 'portal_externo',
      url: ext,
      status: 'pronto',
      notes: 'Redirecionado para o Portal da Transparência externo.',
    },
    {
      id: 'pntp-2-2',
      code: '2.2',
      dimension: 'Receitas e Despesas',
      title: 'Portal da Transparência — Despesas (Empenho, Liquidação e Pagamento)',
      classification: 'Essencial',
      sourceType: 'portal_externo',
      url: ext,
      status: 'pronto',
      notes: 'Redirecionado para o Portal da Transparência externo.',
    },
    // 3. Planejamento e Relatórios Fiscais (LRF)
    {
      id: 'pntp-3-1',
      code: '3.1',
      dimension: 'Planejamento e LRF',
      title: 'PPA, LDO, LOA, RREO, RGF, Balanço Anual e Pareceres do TCE',
      classification: 'Essencial',
      sourceType: 'portal_externo',
      url: ext,
      status: 'pronto',
      notes: 'Instrumentos de planejamento e prestação de contas (LC 101/2000).',
    },
    // 4. Licitações, Contratos e Obras
    {
      id: 'pntp-4-1',
      code: '4.1',
      dimension: 'Licitações, Contratos e Obras',
      title: 'Licitações, Editais, Atas, Dispensas e Plano de Contratações Anual (PCA)',
      classification: 'Essencial',
      sourceType: 'portal_externo',
      url: ext,
      status: 'pronto',
      notes: 'Lei nº 14.133/2021 + integração PNCP.',
    },
    {
      id: 'pntp-4-2',
      code: '4.2',
      dimension: 'Licitações, Contratos e Obras',
      title: 'Contratos, Aditivos, Fiscais e Painel de Obras Públicas',
      classification: 'Essencial',
      sourceType: 'portal_externo',
      url: ext,
      status: 'pronto',
      notes: 'Execução contratual e cronograma físico-financeiro de obras.',
    },
    // 5. Recursos Humanos e Diárias
    {
      id: 'pntp-5-1',
      code: '5.1',
      dimension: 'Recursos Humanos',
      title: 'Folha de Pagamento Nominal, Cargos, Lotação e Diárias/Passagens',
      classification: 'Essencial',
      sourceType: 'portal_externo',
      url: ext,
      status: 'pronto',
      notes: 'Com mascaramento de CPF conforme LGPD.',
    },
    // 6. Transparência Passiva (e-SIC, Ouvidoria e FAQ)
    {
      id: 'pntp-6-1',
      code: '6.1',
      dimension: 'e-SIC e Ouvidoria',
      title: 'e-SIC — Pedido de Acesso à Informação, Recursos (1ª/2ª Instância) e SIC Físico',
      classification: 'Essencial',
      sourceType: 'site_institucional',
      url: siteUrl('/esic'),
      status: 'pronto',
      notes: 'Prazo 20+10 dias e relatório estatístico anual.',
    },
    {
      id: 'pntp-6-2',
      code: '6.2',
      dimension: 'e-SIC e Ouvidoria',
      title: 'Ouvidoria Municipal (com Denúncia Anônima sem login/CPF)',
      classification: 'Obrigatório',
      sourceType: 'site_institucional',
      url: siteUrl('/ouvidoria'),
      status: 'pronto',
      notes: 'Protocolo rastreável para manifestações e denúncias.',
    },
    {
      id: 'pntp-6-3',
      code: '6.3',
      dimension: 'e-SIC e Ouvidoria',
      title: 'Perguntas Frequentes (FAQ)',
      classification: 'Obrigatório',
      sourceType: 'site_institucional',
      url: siteUrl('/perguntas-frequentes'),
      status: 'pronto',
      notes: 'Busca por palavra-chave e categoria.',
    },
    // 7. Acessibilidade e LGPD
    {
      id: 'pntp-7-1',
      code: '7.1',
      dimension: 'Acessibilidade e LGPD',
      title: 'Barra de Acessibilidade eMAG 3.1, Alto Contraste e VLibras',
      classification: 'Obrigatório',
      sourceType: 'site_institucional',
      url: siteUrl('/site'),
      status: 'pronto',
      notes: 'Ativo em todo o Site Institucional e subpáginas.',
    },
    {
      id: 'pntp-7-2',
      code: '7.2',
      dimension: 'Acessibilidade e LGPD',
      title: 'Política de Privacidade, Termos de Uso e Encarregado de Dados (DPO)',
      classification: 'Obrigatório',
      sourceType: 'site_institucional',
      url: siteUrl('/encarregado-dpo'),
      status: 'pronto',
      notes: 'Links permanentes no rodapé (/privacidade, /termos-de-uso, /encarregado-dpo).',
    },
  ];
}

export const SitePntpLinksManager: React.FC<SitePntpLinksManagerProps> = ({
  config,
  onChange,
  institution,
  accentHex,
}) => {
  const externalBase = config.transparencyUrl?.trim() || DEFAULT_EXTERNAL_TRANSPARENCY_URL;
  const links = useMemo(
    () =>
      config.pntpLinks && config.pntpLinks.length > 0
        ? config.pntpLinks
        : buildDefaultPntpLinks(institution, externalBase),
    [config.pntpLinks, institution, externalBase]
  );

  const [search, setSearch] = useState('');
  const [dimensionFilter, setDimensionFilter] = useState('Todas');
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDimension, setNewDimension] = useState('Informações Institucionais');
  const [newUrl, setNewUrl] = useState('');

  const updateLinks = (nextLinks: PntpCriterionLink[]) => {
    onChange({
      ...config,
      pntpLinks: nextLinks,
    });
  };

  const handleUpdateField = (
    id: string,
    patch: Partial<PntpCriterionLink>
  ) => {
    updateLinks(links.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleSyncExternalBase = () => {
    const cleanBase = externalBase.replace(/\/+$/, '') + '/';
    updateLinks(
      links.map((item) =>
        item.sourceType === 'portal_externo' ? { ...item, url: cleanBase } : item
      )
    );
    showToast(`URL base externa (${cleanBase}) aplicada aos critérios do Portal Externo!`, 'success');
  };

  const handleResetDefaults = () => {
    updateLinks(buildDefaultPntpLinks(institution, externalBase));
    showToast('Matriz de links PNTP restaurada com os endereços atuais.', 'info');
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    const item: PntpCriterionLink = {
      id: `pntp-custom-${Date.now()}`,
      code: newCode.trim() || 'EXT',
      dimension: newDimension,
      title: newTitle.trim(),
      classification: 'Obrigatório',
      sourceType: newUrl.includes('45.161.37.1') || !newUrl.includes(window.location.host)
        ? 'portal_externo'
        : 'site_institucional',
      url: newUrl.trim(),
      status: 'pronto',
    };
    updateLinks([...links, item]);
    setNewTitle('');
    setNewCode('');
    setNewUrl('');
    showToast('Critério adicionado à matriz PNTP. Clique em Salvar e Publicar para gravar.', 'success');
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiado!`, 'success');
    } catch {
      showToast('Não foi possível copiar automaticamente.', 'warning');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Codigo', 'Dimensao', 'Criterio', 'Classificacao', 'Origem', 'Status', 'URL', 'Observacoes'];
    const rows = links.map((l) =>
      [l.code, l.dimension, l.title, l.classification, l.sourceType, l.status, l.url, l.notes || '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';')
    );
    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matriz_links_pntp_${institution.subdomain || institution.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dimensions = useMemo(() => {
    const set = new Set<string>(['Todas']);
    links.forEach((l) => set.add(l.dimension));
    return Array.from(set);
  }, [links]);

  const filtered = useMemo(() => {
    return links.filter((l) => {
      if (dimensionFilter !== 'Todas' && l.dimension !== dimensionFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.code.toLowerCase().includes(q) ||
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          l.dimension.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [links, dimensionFilter, search]);

  const readyCount = links.filter((l) => l.status === 'pronto').length;

  return (
    <div className="space-y-5">
      {/* Cabeçalho Explicativo */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 font-black text-emerald-900 dark:text-emerald-300">
            <ShieldCheck size={16} />
            <span>Gerenciador de Links por Critério — Matriz PNTP / Atricon</span>
          </div>
          <p className="text-emerald-800 dark:text-emerald-200 leading-relaxed max-w-3xl">
            Centralize e mantenha prontos os links exatos de cada critério avaliado pelo Tribunal de Contas (PNTP / Atricon).
            Critérios orçamentários apontam para o Portal Externo (<strong>{externalBase}</strong>) e critérios institucionais/LAI apontam para este Site Institucional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-700 text-xs font-black text-emerald-800 dark:text-emerald-300">
            {readyCount}/{links.length} Prontos
          </span>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black cursor-pointer"
          >
            <Download size={13} />
            Exportar CSV (TCE/PNTP)
          </button>
        </div>
      </div>

      {/* URL Base do Portal da Transparência Externo */}
      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
            URL Base do Portal da Transparência Externo (Redirecionamento Oficial)
          </label>
          <input
            type="url"
            value={config.transparencyUrl || DEFAULT_EXTERNAL_TRANSPARENCY_URL}
            onChange={(e) => onChange({ ...config, transparencyUrl: e.target.value })}
            placeholder="http://45.161.37.1:8079/transparencia/"
            className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-mono text-neutral-900 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSyncExternalBase}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-black cursor-pointer"
            style={{ backgroundColor: accentHex }}
          >
            <RefreshCw size={13} />
            Aplicar nos Links Externos
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-bold cursor-pointer"
          >
            Restaurar Padrão
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar critério, código ou URL..."
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-8 pr-3 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-neutral-400 shrink-0" />
          <select
            value={dimensionFilter}
            onChange={(e) => setDimensionFilter(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-bold"
          >
            {dimensions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Critérios PNTP */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-black font-mono">
                    {item.code}
                  </span>
                  <span className="text-[11px] font-bold text-neutral-500">{item.dimension}</span>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                    {item.classification}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.sourceType === 'portal_externo'
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                    }`}
                  >
                    {item.sourceType === 'portal_externo' ? 'Portal Externo' : 'Site Institucional'}
                  </span>
                </div>
                <p className="text-xs font-extrabold text-neutral-900 dark:text-white">
                  {item.title}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={item.status}
                  onChange={(e) =>
                    handleUpdateField(item.id, {
                      status: e.target.value as PntpCriterionLink['status'],
                    })
                  }
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                    item.status === 'pronto'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-700'
                      : item.status === 'pendente'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-700'
                      : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                  }`}
                >
                  <option value="pronto">Pronto</option>
                  <option value="pendente">Pendente</option>
                  <option value="nao_se_aplica">Não se aplica</option>
                </select>

                {item.id.startsWith('pntp-custom-') && (
                  <button
                    type="button"
                    onClick={() => updateLinks(links.filter((l) => l.id !== item.id))}
                    title="Remover critério"
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Link2 size={13} className="absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="url"
                  value={item.url}
                  onChange={(e) => handleUpdateField(item.id, { url: e.target.value })}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 pl-8 pr-3 py-1.5 text-xs font-mono text-neutral-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCopy(item.url, `Link ${item.code}`)}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-bold cursor-pointer"
              >
                <Copy size={12} /> Copiar Link
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold"
              >
                <ExternalLink size={12} /> Testar
              </a>
            </div>

            <input
              type="text"
              value={item.notes || ''}
              onChange={(e) => handleUpdateField(item.id, { notes: e.target.value })}
              placeholder="Observação / Comprovação para o auditor do TCE..."
              className="w-full rounded-lg border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 bg-transparent px-2 py-1 text-[11px] text-neutral-500 dark:text-neutral-400 outline-none"
            />
          </div>
        ))}
      </div>

      {/* Adicionar Novo Critério Personalizado */}
      <form
        onSubmit={handleAddCriterion}
        className="p-4 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/30 space-y-3"
      >
        <p className="text-xs font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <Plus size={14} /> Adicionar Critério ou Subitem PNTP Personalizado
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          <input
            type="text"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Código (ex.: 4.5)"
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
          />
          <select
            value={newDimension}
            onChange={(e) => setNewDimension(e.target.value)}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
          >
            <option>Informações Institucionais</option>
            <option>Receitas e Despesas</option>
            <option>Planejamento e LRF</option>
            <option>Licitações, Contratos e Obras</option>
            <option>Recursos Humanos</option>
            <option>e-SIC e Ouvidoria</option>
            <option>Acessibilidade e LGPD</option>
          </select>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Descrição do critério Atricon *"
            className="sm:col-span-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 text-xs">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="URL completa do critério (ex.: http://45.161.37.1:8079/transparencia/...) *"
            className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 font-mono"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white font-black cursor-pointer"
            style={{ backgroundColor: accentHex }}
          >
            <Plus size={14} /> Adicionar à Matriz
          </button>
        </div>
      </form>

      <div className="flex items-center gap-4 text-[11px] text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 size={12} className="text-emerald-600" /> Pronto para informar ao PNTP
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={12} className="text-amber-600" /> Pendente de preenchimento
        </span>
      </div>
    </div>
  );
};

export default SitePntpLinksManager;
