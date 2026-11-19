import React, { useState } from 'react';
import {
  Building2,
  FileText,
  Headphones,
  HelpCircle,
  Landmark,
  Lock,
  Menu,
  Scale,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Institution } from '../types';
import { withInstitutionQuery } from '../lib/institutionModules';
import { AccessibilityBar } from '../components/AccessibilityBar';
import { VLibrasWidget } from '../components/VLibrasWidget';
import { CookieConsentBanner } from '../components/CookieConsentBanner';

export interface PublicInstitutionalLayoutProps {
  institution: Institution;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  pageTitle: string;
  pageSubtitle?: string;
  activeNav?:
    | 'portal'
    | 'transparencia'
    | 'esic'
    | 'ouvidoria'
    | 'carta-de-servicos'
    | 'estrutura'
    | 'legislacao'
    | 'faq'
    | 'legal';
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { key: 'portal', label: 'Início', path: '/portal' },
  { key: 'transparencia', label: 'Transparência', path: '/transparencia' },
  { key: 'esic', label: 'e-SIC', path: '/esic' },
  { key: 'ouvidoria', label: 'Ouvidoria', path: '/ouvidoria' },
  { key: 'carta-de-servicos', label: 'Carta de Serviços', path: '/carta-de-servicos' },
  { key: 'estrutura', label: 'Estrutura', path: '/estrutura' },
  { key: 'legislacao', label: 'Legislação', path: '/legislacao' },
  { key: 'faq', label: 'FAQ', path: '/perguntas-frequentes' },
] as const;

/**
 * Layout Institucional Público Neutro (Art. 37, §1º da CF/88 - Impessoalidade)
 * Conformidade: eMAG 3.1 / WCAG 2.1 AA, Lei 13.146/2015, Lei 14.129/2021 e PNTP Selo Diamante.
 */
export const PublicInstitutionalLayout: React.FC<PublicInstitutionalLayoutProps> = ({
  institution,
  darkMode,
  setDarkMode,
  pageTitle,
  pageSubtitle,
  activeNav,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openCookieModal, setOpenCookieModal] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = globalSearch.trim();
    if (!q) return;
    window.location.href = withInstitutionQuery(
      `/transparencia?q=${encodeURIComponent(q)}`,
      institution
    );
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100">
        {/* Barra de Acessibilidade Fixa no Topo (eMAG 3.1) */}
        <AccessibilityBar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          enableVLibras={false}
        />
        <VLibrasWidget enabled={true} />

        {/* Cabeçalho Institucional Neutro (Sem slogans ou marcas de gestão) */}
        <header className="bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <a
              href={withInstitutionQuery('/portal', institution)}
              className="flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-slate-900 rounded-xl p-1"
            >
              <img
                src={institution.logo_url || '/brasao-municipio.png'}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/brasao-municipio.png';
                }}
                alt={`Brasão Oficial — ${institution.name}`}
                className="w-11 h-11 object-contain shrink-0"
              />
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400">
                  Portal Oficial do Município
                </span>
                <span className="block text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                  {institution.name}
                </span>
              </div>
            </a>

            {/* Busca Global (#main-search para atalho Alt+3) */}
            <form
              id="main-search"
              onSubmit={handleGlobalSearch}
              role="search"
              aria-label="Busca no Portal da Transparência"
              className="hidden lg:flex items-center bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 w-72 focus-within:ring-2 focus-within:ring-slate-900"
            >
              <Search size={15} className="text-slate-500 mr-2 shrink-0" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Buscar despesas, leis, contratos..."
                aria-label="Buscar no portal"
                className="bg-transparent text-xs w-full outline-none text-slate-900 dark:text-white placeholder:text-slate-500"
              />
            </form>

            <div className="flex items-center gap-2">
              <a
                href={withInstitutionQuery('/servidores', institution)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <Lock size={13} />
                Acesso Interno
              </a>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-expanded={mobileMenuOpen}
                aria-controls="main-nav"
                aria-label={mobileMenuOpen ? 'Fechar menu principal' : 'Abrir menu principal'}
                className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 cursor-pointer"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Menu Principal Semântico (#main-nav / Alt+2) */}
          <nav
            id="main-nav"
            aria-label="Navegação Principal do Portal Público"
            className={`border-t border-slate-200 dark:border-neutral-800 bg-slate-900 dark:bg-neutral-950 text-white ${
              mobileMenuOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row lg:items-center gap-1 py-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = activeNav === item.key;
                return (
                  <a
                    key={item.key}
                    href={withInstitutionQuery(item.path, institution)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-white ${
                      isActive
                        ? 'bg-white text-slate-900'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
              <a
                href={withInstitutionQuery('/diario', institution)}
                className="px-3 py-2 rounded-lg text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition focus-visible:ring-2 focus-visible:ring-white"
              >
                Diário Oficial
              </a>
            </div>
          </nav>
        </header>

        {/* Conteúdo Principal (#main-content / Alt+1) */}
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {/* Cabeçalho da Página com H1 único */}
          <section className="bg-white dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="mt-1.5 text-sm text-slate-600 dark:text-neutral-400 max-w-3xl">
                  {pageSubtitle}
                </p>
              )}
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</div>
        </main>

        {/* Rodapé Institucional (#main-footer / Alt+4) */}
        <footer
          id="main-footer"
          className="bg-slate-900 dark:bg-neutral-950 text-slate-300 border-t border-slate-800 mt-auto"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/brasao-municipio.png"
                  alt="Brasão Oficial"
                  className="w-9 h-9 object-contain"
                />
                <div>
                  <p className="font-extrabold text-white text-sm">{institution.name}</p>
                  <p className="text-slate-400">Administração Pública Municipal</p>
                </div>
              </div>
              {institution.cnpj && <p className="text-slate-400">CNPJ: {institution.cnpj}</p>}
              {institution.contact_phone && <p className="text-slate-400">Telefone: {institution.contact_phone}</p>}
            </div>

            <div>
              <h2 className="font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Landmark size={14} /> Transparência & Controle
              </h2>
              <ul className="space-y-2">
                <li>
                  <a href={withInstitutionQuery('/transparencia', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Portal da Transparência (PNTP)
                  </a>
                </li>
                <li>
                  <a href={withInstitutionQuery('/esic', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    e-SIC — Acesso à Informação (LAI)
                  </a>
                </li>
                <li>
                  <a href={withInstitutionQuery('/ouvidoria', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Ouvidoria Municipal
                  </a>
                </li>
                <li>
                  <a href={withInstitutionQuery('/diario', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Diário Oficial Eletrônico
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Building2 size={14} /> Serviços & Estrutura
              </h2>
              <ul className="space-y-2">
                <li>
                  <a href={withInstitutionQuery('/carta-de-servicos', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Carta de Serviços (Lei 13.460/17)
                  </a>
                </li>
                <li>
                  <a href={withInstitutionQuery('/estrutura', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Organograma e Quem é Quem
                  </a>
                </li>
                <li>
                  <a href={withInstitutionQuery('/legislacao', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Legislação Municipal
                  </a>
                </li>
                <li>
                  <a href={withInstitutionQuery('/perguntas-frequentes', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Perguntas Frequentes (FAQ)
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldCheck size={14} /> Conformidade LGPD & Legal
              </h2>
              <ul className="space-y-2">
                <li>
                  <a href={withInstitutionQuery('/privacidade', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Política de Privacidade
                  </a>
                </li>
                <li>
                  <a href={withInstitutionQuery('/termos-de-uso', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href={withInstitutionQuery('/encarregado-dpo', institution)} className="hover:text-white underline-offset-2 hover:underline">
                    Encarregado de Dados (DPO)
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setOpenCookieModal(true)}
                    className="hover:text-white underline-offset-2 hover:underline cursor-pointer"
                  >
                    Gerenciar Preferências de Cookies
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 py-4 px-4 sm:px-6 text-[11px] text-slate-400">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>
                © {new Date().getFullYear()} {institution.name}. Conteúdo institucional em conformidade com o Art. 37, §1º da CF/88, LAI, LRF, LGPD e eMAG 3.1.
              </p>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1">
                  <Scale size={12} /> LAI 12.527/11
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText size={12} /> LRF 101/00
                </span>
                <span className="inline-flex items-center gap-1">
                  <Headphones size={12} /> eMAG 3.1 / WCAG 2.1 AA
                </span>
                <span className="inline-flex items-center gap-1">
                  <HelpCircle size={12} /> PNTP Atricon
                </span>
              </div>
            </div>
          </div>
        </footer>

        <CookieConsentBanner
          institution={institution}
          forceOpen={openCookieModal}
          onClose={() => setOpenCookieModal(false)}
        />
      </div>
    </div>
  );
};

export default PublicInstitutionalLayout;
