import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Scale, Search, ShieldCheck } from 'lucide-react';
import { Institution, MunicipalLaw } from '../../types';
import { PublicInstitutionalLayout } from '../../layouts/PublicInstitutionalLayout';
import { fetchInstitutionLaws } from '../../lib/api/municipalLaws';
import { withInstitutionQuery } from '../../lib/institutionModules';
import { OpenDataExportBar } from '../../components/OpenDataExportBar';

export interface LegislationPortalPageProps {
  institution: Institution;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const LAW_GROUPS = [
  'Todas',
  'Lei Orgânica',
  'Código Tributário',
  'Plano Diretor',
  'Lei Ordinária',
  'Lei Complementar',
  'Decreto',
  'Portaria',
];

export const LegislationPortalPage: React.FC<LegislationPortalPageProps> = ({
  institution,
  darkMode,
  setDarkMode,
}) => {
  const [laws, setLaws] = useState<MunicipalLaw[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('Todas');
  const [viewMode, setViewMode] = useState<'original' | 'compilado'>('compilado');
  const [selectedLaw, setSelectedLaw] = useState<MunicipalLaw | null>(null);

  useEffect(() => {
    let active = true;
    fetchInstitutionLaws(institution.id).then((rows) => {
      if (!active) return;
      const published = rows.filter((l) => l.publish_on_site !== false);
      setLaws(published);
    });
    return () => {
      active = false;
    };
  }, [institution.id]);

  const filtered = useMemo(() => {
    return laws.filter((law) => {
      if (selectedType !== 'Todas') {
        const blob = `${law.type} ${law.category} ${law.title}`.toLowerCase();
        if (!blob.includes(selectedType.toLowerCase())) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const blob = `${law.number} ${law.title} ${law.ementa} ${law.full_text || ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [laws, selectedType, search]);

  const exportRows = useMemo(
    () =>
      filtered.map((l) => ({
        numero: l.number,
        tipo: l.type,
        data_publicacao: l.publication_date,
        titulo: l.title,
        ementa: l.ementa,
        status: l.status,
      })),
    [filtered]
  );

  return (
    <PublicInstitutionalLayout
      institution={institution}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      activeNav="legislacao"
      pageTitle="Legislação Municipal e Atos Oficiais"
      pageSubtitle="Busca indexada de Lei Orgânica, Código Tributário, Plano Diretor, leis, decretos e portarias, com alternância entre texto original e compilado e integração ao Diário Oficial Eletrônico (ICP-Brasil)."
    >
      <div className="space-y-6">
        {/* Acesso direto ao Diário Oficial Eletrônico com validação ICP-Brasil */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-white">
              <ShieldCheck size={20} />
            </div>
            <div className="text-xs">
              <p className="font-extrabold text-slate-900 dark:text-white">
                Diário Oficial Eletrônico do Município (Assinatura Digital ICP-Brasil)
              </p>
              <p className="text-slate-600 dark:text-neutral-400">
                Consulte edições oficiais e valide a autenticidade criptográfica de atos publicados.
              </p>
            </div>
          </div>
          <a
            href={withInstitutionQuery('/diario', institution)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800"
          >
            <ExternalLink size={13} />
            Acessar Diário Oficial (ICP-Brasil)
          </a>
        </div>

        {/* Barra de Pesquisa + Alternador Texto Original / Compilado */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-lg">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por número, ementa, assunto ou palavra-chave..."
                aria-label="Buscar legislação municipal"
                className="w-full rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div
              role="group"
              aria-label="Modo de visualização do texto legal"
              className="inline-flex rounded-xl border border-slate-300 dark:border-neutral-700 overflow-hidden text-xs font-bold"
            >
              <button
                type="button"
                onClick={() => setViewMode('original')}
                aria-pressed={viewMode === 'original'}
                className={`px-3.5 py-2 cursor-pointer ${
                  viewMode === 'original'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300'
                }`}
              >
                Texto Original
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compilado')}
                aria-pressed={viewMode === 'compilado'}
                className={`px-3.5 py-2 cursor-pointer ${
                  viewMode === 'compilado'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300'
                }`}
              >
                Texto Compilado
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {LAW_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedType(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                  selectedType === g
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                    : 'bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <OpenDataExportBar data={exportRows} filename="legislacao_municipal" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-10 text-center text-xs text-slate-500">
                Nenhum ato normativo localizado para os filtros informados.
              </div>
            ) : (
              filtered.map((law) => (
                <button
                  key={law.id}
                  type="button"
                  onClick={() => setSelectedLaw(law)}
                  className={`w-full text-left p-4 rounded-2xl border transition cursor-pointer ${
                    selectedLaw?.id === law.id
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold mb-1">
                    <span className="uppercase">{law.type} nº {law.number}</span>
                    <span>{new Date(law.publication_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-sm font-extrabold">{law.title}</p>
                  <p className={`text-xs mt-1 line-clamp-2 ${selectedLaw?.id === law.id ? 'text-slate-200 dark:text-slate-700' : 'text-slate-600 dark:text-neutral-400'}`}>
                    {law.ementa}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="lg:col-span-6">
            {selectedLaw ? (
              <article className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 sticky top-24 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 font-bold text-slate-700 dark:text-neutral-300">
                    {viewMode === 'compilado' ? 'Texto Compilado' : 'Texto Original'}
                  </span>
                  <span className="font-bold text-slate-500">{selectedLaw.status}</span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale size={18} />
                  {selectedLaw.type} nº {selectedLaw.number} — {selectedLaw.title}
                </h2>
                <p className="italic text-slate-600 dark:text-neutral-400 border-l-2 border-slate-300 pl-3">
                  {selectedLaw.ementa}
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-700 whitespace-pre-line leading-relaxed text-slate-800 dark:text-neutral-200 max-h-96 overflow-y-auto">
                  {viewMode === 'compilado'
                    ? selectedLaw.compiled_text || selectedLaw.full_text || 'Texto integral disponível no PDF oficial.'
                    : selectedLaw.full_text || 'Texto original disponível no PDF oficial.'}
                </div>
                {selectedLaw.file_url && (
                  <a
                    href={selectedLaw.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                  >
                    <FileText size={14} /> Baixar PDF Oficial
                  </a>
                )}
              </article>
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-10 text-center text-xs text-slate-500">
                Selecione um ato normativo ao lado para visualizar o texto original ou compilado.
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicInstitutionalLayout>
  );
};

export default LegislationPortalPage;
