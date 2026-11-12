import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Building2,
  ExternalLink,
  Link2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { Institution } from '../types';
import {
  InstitutionalSiteConfig,
  SecretariatAwardItem,
  SecretariatIndicatorItem,
  SecretariatProfileConfig,
  SecretariatResultItem,
  SecretariatServiceItem,
  UsefulLinkCategory,
  UsefulLinkItem,
  buildDefaultSecretariatProfile,
  buildDefaultUsefulLinks,
  getSuggestedIndicatorsForDepartment,
  normalizeSecretariatSlug,
  resolveSecretariatProfile,
} from '../lib/api/institutionalSite';
import { withInstitutionQuery } from '../lib/institutionModules';

const USEFUL_LINK_CATEGORY_LABELS: Record<UsefulLinkCategory, string> = {
  transparencia: 'Transparência & Compras',
  cidadao: 'Serviços ao Cidadão',
  governo: 'Governo & Imprensa',
  controle: 'Controle & Legislação',
};

interface UsefulLinksManagerProps {
  config: InstitutionalSiteConfig;
  onChange: React.Dispatch<React.SetStateAction<InstitutionalSiteConfig>>;
  accentHex: string;
}

export const UsefulLinksManagerPanel: React.FC<UsefulLinksManagerProps> = ({
  config,
  onChange,
  accentHex,
}) => {
  const links = useMemo(
    () => (Array.isArray(config.usefulLinks) ? config.usefulLinks : buildDefaultUsefulLinks()),
    [config.usefulLinks]
  );

  const updateLinks = (next: UsefulLinkItem[]) => {
    onChange((prev) => ({
      ...prev,
      usefulLinks: next,
    }));
  };

  const handleAdd = () => {
    const newItem: UsefulLinkItem = {
      id: `ul_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: 'Novo Link Útil',
      description: '',
      url: 'https://',
      category: 'cidadao',
      enabled: true,
    };
    updateLinks([...links, newItem]);
  };

  const handleUpdateItem = (id: string, patch: Partial<UsefulLinkItem>) => {
    updateLinks(links.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemove = (id: string) => {
    updateLinks(links.filter((item) => item.id !== id));
  };

  const handleRestoreDefaults = () => {
    updateLinks(buildDefaultUsefulLinks());
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Link2 size={18} style={{ color: accentHex }} />
            <span>Links Úteis do Portal Institucional</span>
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Adicione, edite ou ative portais externos e links de utilidade pública exibidos na seção de Links Úteis do site.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold transition cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Restaurar Padrão Gov</span>
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-white text-xs font-black shadow-sm hover:opacity-95 transition cursor-pointer"
            style={{ backgroundColor: accentHex }}
          >
            <Plus size={14} />
            <span>Adicionar Link Útil</span>
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-3">
          <p className="text-sm text-neutral-500">Nenhum link útil configurado.</p>
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Carregar links úteis governamentais padrão</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Título do Link
                  </label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                    placeholder="Ex: Tribunal de Contas (TCE)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                    URL de Destino (HTTPS)
                  </label>
                  <input
                    type="url"
                    value={item.url}
                    onChange={(e) => handleUpdateItem(item.id, { url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                    Categoria
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) =>
                      handleUpdateItem(item.id, { category: e.target.value as UsefulLinkCategory })
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold"
                  >
                    {Object.entries(USEFUL_LINK_CATEGORY_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-4 sm:pt-0">
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.enabled !== false}
                      onChange={(e) => handleUpdateItem(item.id, { enabled: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span>Ativo</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                    title="Remover link"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={item.description || ''}
                  onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                  placeholder="Descrição breve do serviço ou portal (opcional)"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface SecretariatsProfileManagerProps {
  institution: Institution;
  departmentNames: string[];
  config: InstitutionalSiteConfig;
  onChange: React.Dispatch<React.SetStateAction<InstitutionalSiteConfig>>;
  accentHex: string;
}

export const SecretariatsProfileManagerPanel: React.FC<SecretariatsProfileManagerProps> = ({
  institution,
  departmentNames,
  config,
  onChange,
  accentHex,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>(() => departmentNames[0] || '');
  const [subTab, setSubTab] = useState<'showcase' | 'institutional'>('showcase');

  const currentDept = useMemo(() => {
    if (selectedDept && departmentNames.includes(selectedDept)) return selectedDept;
    return departmentNames[0] || '';
  }, [selectedDept, departmentNames]);

  const slug = useMemo(() => (currentDept ? normalizeSecretariatSlug(currentDept) : ''), [currentDept]);
  const storedCustom = slug ? config.secretariatProfiles?.[slug] : undefined;
  const resolved = useMemo(
    () => (currentDept ? resolveSecretariatProfile(currentDept, config, institution) : null),
    [currentDept, config, institution]
  );

  const patchProfile = (patch: Partial<SecretariatProfileConfig>) => {
    if (!currentDept || !slug) return;
    onChange((prev) => {
      const existing = prev.secretariatProfiles?.[slug] || {};
      return {
        ...prev,
        secretariatProfiles: {
          ...(prev.secretariatProfiles || {}),
          [slug]: {
            ...existing,
            slug,
            departmentName: currentDept,
            ...patch,
          },
        },
      };
    });
  };

  const handleLoadDefaults = () => {
    if (!currentDept) return;
    const defaults = buildDefaultSecretariatProfile(currentDept, institution, config);
    patchProfile({
      secretaryRole: defaults.secretaryRole,
      overview: defaults.overview,
      mission: defaults.mission,
      vision: defaults.vision,
      competencies: defaults.competencies,
      address: defaults.address,
      phone: defaults.phone,
      email: defaults.email,
      serviceHours: defaults.serviceHours,
      services: defaults.services,
    });
  };

  const currentServices: SecretariatServiceItem[] = resolved?.services || [];
  const currentIndicators: SecretariatIndicatorItem[] = resolved?.indicators || [];
  const currentResults: SecretariatResultItem[] = resolved?.results || [];
  const currentAwards: SecretariatAwardItem[] = resolved?.awards || [];

  const handleAddIndicator = () => {
    const newItem: SecretariatIndicatorItem = {
      id: `ind_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: 'Novo Índice Oficial',
      value: '0,0',
      target: 'Meta da pasta',
      progress: 75,
      period: String(new Date().getFullYear()),
      source: 'Fonte oficial / Órgão',
      trend: 'up',
    };
    patchProfile({ indicators: [...currentIndicators, newItem] });
  };

  const handleUpdateIndicator = (id: string, patch: Partial<SecretariatIndicatorItem>) => {
    patchProfile({
      indicators: currentIndicators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  };

  const handleRemoveIndicator = (id: string) => {
    patchProfile({ indicators: currentIndicators.filter((i) => i.id !== id) });
  };

  const handleLoadSuggestedIndicators = () => {
    if (!currentDept) return;
    const suggested = getSuggestedIndicatorsForDepartment(currentDept);
    const existingIds = new Set(currentIndicators.map((i) => i.id));
    const merged = [...currentIndicators, ...suggested.filter((s) => !existingIds.has(s.id))];
    patchProfile({ indicators: merged });
  };

  const handleAddResult = () => {
    const newItem: SecretariatResultItem = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: 'Nova Entrega / Marco da Gestão',
      metric: '+100% atendimentos',
      description: 'Descreva o impacto concreto alcançado para a população.',
      year: String(new Date().getFullYear()),
      category: 'Entrega à População',
    };
    patchProfile({ results: [...currentResults, newItem] });
  };

  const handleUpdateResult = (id: string, patch: Partial<SecretariatResultItem>) => {
    patchProfile({
      results: currentResults.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const handleRemoveResult = (id: string) => {
    patchProfile({ results: currentResults.filter((r) => r.id !== id) });
  };

  const handleAddAward = () => {
    const newItem: SecretariatAwardItem = {
      id: `awd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: 'Selo / Prêmio Recebido',
      issuer: 'Órgão ou Instituição Concedente',
      year: String(new Date().getFullYear()),
      category: 'Certificação Pública',
      description: 'Critério ou reconhecimento alcançado pelo município nesta pasta.',
    };
    patchProfile({ awards: [...currentAwards, newItem] });
  };

  const handleUpdateAward = (id: string, patch: Partial<SecretariatAwardItem>) => {
    patchProfile({
      awards: currentAwards.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  };

  const handleRemoveAward = (id: string) => {
    patchProfile({ awards: currentAwards.filter((a) => a.id !== id) });
  };

  const handleAddService = () => {
    const nextService: SecretariatServiceItem = {
      id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: 'Novo Serviço ao Cidadão',
      description: 'Descreva como o cidadão solicita este serviço e o que ele recebe.',
      requirements: 'Documento pessoal com foto e CPF.',
      channel: 'Presencial / Digital',
      sla: 'Conforme atendimento',
      actionUrl: '',
      actionLabel: 'Acessar serviço',
    };
    patchProfile({ services: [...currentServices, nextService] });
  };

  const handleUpdateService = (id: string, patch: Partial<SecretariatServiceItem>) => {
    patchProfile({
      services: currentServices.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const handleRemoveService = (id: string) => {
    patchProfile({
      services: currentServices.filter((s) => s.id !== id),
    });
  };

  if (departmentNames.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center space-y-2">
        <Building2 size={32} className="mx-auto text-neutral-400" />
        <h4 className="text-sm font-black">Nenhuma Secretaria Cadastrada</h4>
        <p className="text-xs text-neutral-500">
          Cadastre primeiro as secretarias oficiais do município no módulo de Configurações/Administração para personalizar seus ambientes públicos aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Building2 size={18} style={{ color: accentHex }} />
            <span>Ambientes Próprios das Secretarias Municipais</span>
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Cada secretaria possui página pública própria com dados, missão, carta de serviços, notícias e atos oficiais filtrados automaticamente.
          </p>
        </div>

        {currentDept && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold transition cursor-pointer"
            >
              <Sparkles size={13} />
              <span>Carregar Sugestões Padrão</span>
            </button>
            <a
              href={withInstitutionQuery(`/secretaria/${slug}`, institution)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-white text-xs font-black shadow-sm hover:opacity-95 transition"
              style={{ backgroundColor: accentHex }}
            >
              <span>Abrir Ambiente Público</span>
              <ExternalLink size={13} />
            </a>
          </div>
        )}
      </div>

      {/* Seletor de Secretaria */}
      <div className="flex flex-wrap gap-2">
        {departmentNames.map((dept) => {
          const isCurrent = dept === currentDept;
          const deptSlug = normalizeSecretariatSlug(dept);
          const hasCustom = Boolean(config.secretariatProfiles?.[deptSlug]);
          return (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
                isCurrent
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
              }`}
              style={isCurrent ? { backgroundColor: accentHex } : undefined}
            >
              <span>{dept}</span>
              {hasCustom && (
                <span
                  className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-white' : 'bg-emerald-500'}`}
                  title="Perfil personalizado salvo"
                />
              )}
            </button>
          );
        })}
      </div>

      {resolved && (
        <div className="space-y-5 p-4 sm:p-5 rounded-3xl bg-neutral-50/70 dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800">
          {/* Sub-navegação do Editor da Secretaria */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setSubTab('showcase')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
                subTab === 'showcase'
                  ? 'text-white shadow-sm'
                  : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
              style={subTab === 'showcase' ? { backgroundColor: accentHex } : undefined}
            >
              <Trophy size={14} />
              <span>
                Vitrine: Resultados, Índices & Prêmios ({currentResults.length + currentIndicators.length + currentAwards.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('institutional')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
                subTab === 'institutional'
                  ? 'text-white shadow-sm'
                  : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
              style={subTab === 'institutional' ? { backgroundColor: accentHex } : undefined}
            >
              <Building2 size={14} />
              <span>Dados, Missão & Carta de Serviços ({currentServices.length})</span>
            </button>
          </div>

          {subTab === 'showcase' && (
            <div className="space-y-6">
              {/* Perfil do Secretário & Chamada da Vitrine */}
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <TrendingUp size={14} style={{ color: accentHex }} />
                  <span>Identidade Executiva da Vitrine</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                      Secretário(a) / Titular
                    </label>
                    <input
                      type="text"
                      value={storedCustom?.secretaryName ?? resolved.secretaryName ?? ''}
                      onChange={(e) => patchProfile({ secretaryName: e.target.value })}
                      placeholder="Nome completo (oculto em Modo Eleitoral)"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      value={storedCustom?.secretaryRole ?? resolved.secretaryRole ?? ''}
                      onChange={(e) => patchProfile({ secretaryRole: e.target.value })}
                      placeholder="Ex: Secretário(a) Municipal de Educação"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                      URL da Foto Oficial (Opcional)
                    </label>
                    <input
                      type="url"
                      value={storedCustom?.secretaryPhotoUrl ?? resolved.secretaryPhotoUrl ?? ''}
                      onChange={(e) => patchProfile({ secretaryPhotoUrl: e.target.value })}
                      placeholder="https://... (oculta em Modo Eleitoral)"
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                      Mensagem de Gestão / Visão de Resultados do(a) Secretário(a)
                    </label>
                    <textarea
                      rows={2}
                      value={storedCustom?.secretaryBio ?? resolved.secretaryBio ?? ''}
                      onChange={(e) => patchProfile({ secretaryBio: e.target.value })}
                      placeholder="Destaque os avanços, metas e compromisso da gestão com a população..."
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                      Resumo / Subtítulo da Vitrine de Resultados
                    </label>
                    <textarea
                      rows={2}
                      value={storedCustom?.resultsSummary ?? resolved.resultsSummary ?? ''}
                      onChange={(e) => patchProfile({ resultsSummary: e.target.value })}
                      placeholder="Ex: Prestação de contas, metas alcançadas e reconhecimentos oficiais da pasta."
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 1: Índices Oficiais */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 size={14} style={{ color: accentHex }} />
                      <span>Índices Oficiais & Metas da Secretaria ({currentIndicators.length})</span>
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Divulgue notas do IDEB, Previne Brasil, vacinação, IEGM/TCE, cobertura de atendimento ou indicadores próprios.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleLoadSuggestedIndicators}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold cursor-pointer hover:bg-neutral-100"
                    >
                      <Sparkles size={13} />
                      <span>Sugerir Índices da Área</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddIndicator}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-black cursor-pointer"
                      style={{ backgroundColor: accentHex }}
                    >
                      <Plus size={13} />
                      <span>Adicionar Índice</span>
                    </button>
                  </div>
                </div>

                {currentIndicators.length === 0 ? (
                  <div className="p-5 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs text-neutral-500">
                    Nenhum índice cadastrado ainda. Clique em <strong>Sugerir Índices da Área</strong> ou <strong>Adicionar Índice</strong> para montar o painel de desempenho da secretaria.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentIndicators.map((ind) => (
                      <div
                        key={ind.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={ind.name}
                              onChange={(e) => handleUpdateIndicator(ind.id, { name: e.target.value })}
                              placeholder="Nome do Índice (Ex: IDEB Anos Iniciais)"
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-black"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="text"
                              value={ind.value}
                              onChange={(e) => handleUpdateIndicator(ind.id, { value: e.target.value })}
                              placeholder="Valor/Nota (Ex: 6.4 ou 94%)"
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-black"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <select
                              value={ind.trend || 'up'}
                              onChange={(e) =>
                                handleUpdateIndicator(ind.id, {
                                  trend: e.target.value as SecretariatIndicatorItem['trend'],
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold"
                            >
                              <option value="up">Evolução Positiva</option>
                              <option value="highlight">Meta Superada / Destaque</option>
                              <option value="stable">Em Manutenção</option>
                            </select>
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveIndicator(ind.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                              title="Remover índice"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={ind.target || ''}
                            onChange={(e) => handleUpdateIndicator(ind.id, { target: e.target.value })}
                            placeholder="Meta (Ex: Meta MEC: 6.0)"
                            className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px]"
                          />
                          <input
                            type="text"
                            value={ind.source || ''}
                            onChange={(e) => handleUpdateIndicator(ind.id, { source: e.target.value })}
                            placeholder="Fonte (Ex: INEP / MS / TCE)"
                            className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px]"
                          />
                          <input
                            type="text"
                            value={ind.period || ''}
                            onChange={(e) => handleUpdateIndicator(ind.id, { period: e.target.value })}
                            placeholder="Ano/Período (Ex: 2026)"
                            className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px]"
                          />
                          <div className="flex items-center gap-2 px-2">
                            <span className="text-[10px] font-bold text-neutral-400 shrink-0">
                              Barra: {ind.progress ?? 0}%
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={ind.progress ?? 0}
                              onChange={(e) =>
                                handleUpdateIndicator(ind.id, { progress: Number(e.target.value) })
                              }
                              className="w-full accent-emerald-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bloco 2: Resultados & Entregas da Gestão */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} style={{ color: accentHex }} />
                      <span>Resultados & Entregas da Gestão ({currentResults.length})</span>
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Destaque atendimentos realizados, obras entregues, economia gerada, redução de filas e conquistas operacionais.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddResult}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-black cursor-pointer"
                    style={{ backgroundColor: accentHex }}
                  >
                    <Plus size={13} />
                    <span>Adicionar Resultado</span>
                  </button>
                </div>

                {currentResults.length === 0 ? (
                  <div className="p-5 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs text-neutral-500">
                    Nenhum resultado específico cadastrado ainda. As notícias da categoria <strong>Obras/Projetos</strong> também entram automaticamente na vitrine da secretaria.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentResults.map((res) => (
                      <div
                        key={res.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={res.title}
                              onChange={(e) => handleUpdateResult(res.id, { title: e.target.value })}
                              placeholder="Título da Entrega / Resultado"
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-black"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="text"
                              value={res.metric}
                              onChange={(e) => handleUpdateResult(res.id, { metric: e.target.value })}
                              placeholder="Número de Impacto (Ex: 3.200 consultas)"
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-black"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={res.category || ''}
                              onChange={(e) => handleUpdateResult(res.id, { category: e.target.value })}
                              placeholder="Categoria"
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px]"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <input
                              type="text"
                              value={res.year || ''}
                              onChange={(e) => handleUpdateResult(res.id, { year: e.target.value })}
                              placeholder="Ano"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] text-center"
                            />
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveResult(res.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                              title="Remover resultado"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          value={res.description}
                          onChange={(e) => handleUpdateResult(res.id, { description: e.target.value })}
                          placeholder="Descrição detalhada do benefício para o cidadão"
                          className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bloco 3: Prêmios, Selos & Reconhecimentos */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Award size={14} style={{ color: accentHex }} />
                      <span>Prêmios, Selos & Certificações ({currentAwards.length})</span>
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Premiações estaduais/nacionais, Selo UNICEF, Band Cidades Excelentes, TCE, CNM ou homenagens recebidas pela equipe.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAward}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-black cursor-pointer"
                    style={{ backgroundColor: accentHex }}
                  >
                    <Plus size={13} />
                    <span>Adicionar Prêmio / Selo</span>
                  </button>
                </div>

                {currentAwards.length === 0 ? (
                  <div className="p-5 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs text-neutral-500">
                    Nenhum prêmio ou certificação cadastrado para esta secretaria ainda.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentAwards.map((awd) => (
                      <div
                        key={awd.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={awd.title}
                              onChange={(e) => handleUpdateAward(awd.id, { title: e.target.value })}
                              placeholder="Nome do Prêmio ou Selo"
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-black"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="text"
                              value={awd.issuer}
                              onChange={(e) => handleUpdateAward(awd.id, { issuer: e.target.value })}
                              placeholder="Órgão Concedente (Ex: TCE / UNICEF)"
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={awd.category || ''}
                              onChange={(e) => handleUpdateAward(awd.id, { category: e.target.value })}
                              placeholder="Categoria"
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px]"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <input
                              type="text"
                              value={awd.year}
                              onChange={(e) => handleUpdateAward(awd.id, { year: e.target.value })}
                              placeholder="Ano"
                              className="w-full px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] text-center"
                            />
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveAward(awd.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                              title="Remover prêmio"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={awd.description || ''}
                          onChange={(e) => handleUpdateAward(awd.id, { description: e.target.value })}
                          placeholder="Motivo ou conquista reconhecida (opcional)"
                          className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {subTab === 'institutional' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Telefone da Secretaria
              </label>
              <input
                type="text"
                value={storedCustom?.phone ?? resolved.phone ?? ''}
                onChange={(e) => patchProfile({ phone: e.target.value })}
                placeholder="(66) 3555-0000"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                E-mail Institucional da Pasta
              </label>
              <input
                type="email"
                value={storedCustom?.email ?? resolved.email ?? ''}
                onChange={(e) => patchProfile({ email: e.target.value })}
                placeholder="secretaria@municipio.gov.br"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Endereço de Atendimento
              </label>
              <input
                type="text"
                value={storedCustom?.address ?? resolved.address ?? ''}
                onChange={(e) => patchProfile({ address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Horário de Funcionamento
              </label>
              <input
                type="text"
                value={storedCustom?.serviceHours ?? resolved.serviceHours ?? ''}
                onChange={(e) => patchProfile({ serviceHours: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Apresentação Geral da Secretaria
            </label>
            <textarea
              rows={2}
              value={storedCustom?.overview ?? resolved.overview ?? ''}
              onChange={(e) => patchProfile({ overview: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Missão da Pasta
              </label>
              <textarea
                rows={3}
                value={storedCustom?.mission ?? resolved.mission ?? ''}
                onChange={(e) => patchProfile({ mission: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Visão Institucional
              </label>
              <textarea
                rows={3}
                value={storedCustom?.vision ?? resolved.vision ?? ''}
                onChange={(e) => patchProfile({ vision: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Competências e Atribuições (uma por linha)
            </label>
            <textarea
              rows={3}
              value={(storedCustom?.competencies ?? resolved.competencies ?? []).join('\n')}
              onChange={(e) =>
                patchProfile({
                  competencies: e.target.value.split('\n'),
                })
              }
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
            />
          </div>

          {/* Carta de Serviços da Secretaria */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">
                  Carta de Serviços da {currentDept} ({currentServices.length})
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Serviços específicos prestados por esta pasta ao cidadão.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddService}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-black cursor-pointer"
                style={{ backgroundColor: accentHex }}
              >
                <Plus size={13} />
                <span>Adicionar Serviço</span>
              </button>
            </div>

            <div className="space-y-3">
              {currentServices.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="text"
                      value={srv.title}
                      onChange={(e) => handleUpdateService(srv.id, { title: e.target.value })}
                      placeholder="Nome do serviço"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-black"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveService(srv.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                      title="Excluir serviço"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={srv.description}
                    onChange={(e) => handleUpdateService(srv.id, { description: e.target.value })}
                    placeholder="Descrição objetiva do serviço"
                    className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={srv.requirements || ''}
                      onChange={(e) => handleUpdateService(srv.id, { requirements: e.target.value })}
                      placeholder="Requisitos / Documentos"
                      className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px]"
                    />
                    <input
                      type="text"
                      value={srv.channel || ''}
                      onChange={(e) => handleUpdateService(srv.id, { channel: e.target.value })}
                      placeholder="Canal (ex: Online / Presencial)"
                      className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px]"
                    />
                    <input
                      type="text"
                      value={srv.sla || ''}
                      onChange={(e) => handleUpdateService(srv.id, { sla: e.target.value })}
                      placeholder="Prazo / SLA estimado"
                      className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px]"
                    />
                    <input
                      type="text"
                      value={srv.actionUrl || ''}
                      onChange={(e) => handleUpdateService(srv.id, { actionUrl: e.target.value })}
                      placeholder="Link (/agendamento ou https://...)"
                      className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

