import React, { useState, useMemo } from 'react';
import { 
  Building2, Search, ArrowRight, ShieldCheck, ExternalLink, 
  Sparkles, Sun, Moon, MapPin, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { Institution } from '../types';
import { LogoCompass } from './LogoCompass';
import { VersionBadge } from './VersionBadge';

export interface ClientMunicipality {
  id: string;
  name: string;
  subdomain: string;
  state: string;
  logo_url: string;
  tagline?: string;
  modules?: string[];
}

export const OFFICIAL_CLIENT_MUNICIPALITIES: ClientMunicipality[] = [
  {
    id: 'inst_1',
    name: 'Prefeitura Municipal de Torixoréu',
    subdomain: 'torixoreu',
    state: 'MT',
    logo_url: 'https://www.torixoreu.mt.gov.br/images/logoHeadernovo.png',
    tagline: 'Prefeitura Municipal de Torixoréu • Estado de Mato Grosso',
    modules: ['Portal do Servidor', 'Secretaria de Finanças & Extratos', 'Saúde & FUS', 'Educação & FUNDEB', 'Controle de Verbas']
  }
];

interface MunicipalityPortalHubProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  institutions?: Institution[];
  onSelectMunicipality: (inst: Institution) => void;
  onNavigateToLandingPage: () => void;
  onNavigateToDemo: () => void;
}

export const MunicipalityPortalHub: React.FC<MunicipalityPortalHubProps> = ({
  darkMode,
  setDarkMode,
  institutions = [],
  onSelectMunicipality,
  onNavigateToLandingPage,
  onNavigateToDemo
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Mescla municípios fixos oficiais com instituições cadastradas no banco de dados Supabase
  const allMunicipalities = useMemo(() => {
    const list: ClientMunicipality[] = [...OFFICIAL_CLIENT_MUNICIPALITIES];
    
    institutions.forEach(inst => {
      const sub = (inst.subdomain || '').toLowerCase().trim();
      const nm = (inst.name || '').trim();
      if (!sub || sub === 'demo' || nm.toLowerCase().includes('demonstração')) return;
      
      const exists = list.some(m => m.subdomain.toLowerCase() === sub || m.id === inst.id);
      if (!exists) {
        list.push({
          id: inst.id,
          name: inst.name,
          subdomain: sub,
          state: 'MT',
          logo_url: inst.logo_url || '/brasao-municipio.png',
          tagline: 'Administração Municipal',
          modules: ['Portal do Servidor', 'Finanças', 'Governança Integrada']
        });
      }
    });

    return list;
  }, [institutions]);

  // Filtragem dinâmica por nome do município ou subdomínio
  const filteredMunicipalities = useMemo(() => {
    if (!searchTerm.trim()) return allMunicipalities;
    const term = searchTerm.toLowerCase().trim();
    return allMunicipalities.filter(m => 
      m.name.toLowerCase().includes(term) ||
      m.subdomain.toLowerCase().includes(term) ||
      m.state.toLowerCase().includes(term)
    );
  }, [allMunicipalities, searchTerm]);

  // Constrói a URL para direcionamento oficial (Portal do Cidadão)
  const handleNavigateToMunicipality = (m: ClientMunicipality) => {
    const targetInst: Institution = {
      id: m.id,
      name: m.name,
      subdomain: m.subdomain,
      logo_url: m.logo_url
    };

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const protocol = window.location.protocol;

      // Se estiver em produção no domínio oficial (gestao360sistema.com.br)
      // Direciona para a raiz do subdomínio: Portal do Cidadão
      if (hostname.includes('gestao360sistema.com.br')) {
        window.location.href = `${protocol}//${m.subdomain}.gestao360sistema.com.br/`;
        return;
      }

      // Se estiver em ambiente local com subdomínio habilitado (.localhost)
      if (hostname.endsWith('.localhost')) {
        window.location.href = `${protocol}//${m.subdomain}.localhost${port}/`;
        return;
      }

      // Se estiver em localhost simples
      if (hostname === 'localhost') {
        window.location.href = `${protocol}//localhost${port}/?inst=${m.subdomain}`;
        return;
      }
    }

    // Fallback integrado via componente interno
    onSelectMunicipality(targetInst);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${darkMode ? 'dark bg-[#0a0a0c] text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* CABEÇALHO SUPERIOR CLEAN */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo e Identidade Gestão 360 */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-neutral-900 rounded-[14px] flex items-center justify-center">
                <LogoCompass size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight font-['Montserrat'] text-slate-900 dark:text-white">
                  GESTÃO <span className="text-emerald-600 dark:text-emerald-400">360</span>
                </h1>
                <VersionBadge variant="navbar" className="hidden sm:inline-flex" />
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-neutral-400 tracking-wider uppercase">
                Portal de Acesso aos Municípios Clientes
              </p>
            </div>
          </div>

          {/* Ações do Topo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onNavigateToLandingPage}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 shadow-sm border border-slate-200/90 dark:border-neutral-800 transition-all cursor-pointer"
              title="Acessar Apresentação Comercial"
            >
              <span>Apresentação Comercial</span>
              <ExternalLink size={13} />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
              title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* BANNER DE BOAS-VINDAS & TÍTULO */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Ambiente Oficial de Governança Municipal</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight font-['Montserrat'] text-slate-900 dark:text-white leading-tight">
            Selecione o seu <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 bg-clip-text text-transparent">Município</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Acesse com segurança o Portal do Servidor, sistemas integrados de finanças, saúde, educação e secretarias do seu município.
          </p>

          {/* BARRA DE PESQUISA RÁPIDA */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar prefeitura ou município..."
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 outline-none text-sm font-semibold text-slate-900 dark:text-white shadow-sm transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* GRADE DE MUNICÍPIOS CLIENTES COM LOGOS NÍTIDOS */}
        <div className={`grid gap-6 sm:gap-8 ${filteredMunicipalities.length === 1 ? 'max-w-2xl mx-auto grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredMunicipalities.map((m) => (
            <div
              key={m.id}
              onClick={() => handleNavigateToMunicipality(m)}
              className="group relative bg-white dark:bg-[#131316] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-neutral-800/80 hover:border-emerald-500/80 dark:hover:border-emerald-500/60 shadow-sm hover:shadow-xl hover:shadow-emerald-950/10 dark:hover:shadow-black/50 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Selo de Produção Oficial */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Cliente Ativo em Produção
                  </span>
                  <span className="text-xs font-black text-slate-400 dark:text-neutral-500 font-['Montserrat']">
                    MT
                  </span>
                </div>

                {/* Topo do Card com Brasão / Logo em Destaque */}
                <div className="flex items-start gap-5 mb-5">
                  <div className="w-24 h-24 sm:w-26 sm:h-26 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-700/60 p-3 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 group-hover:border-emerald-500/40 transition-transform duration-300">
                    <img
                      src={m.logo_url}
                      alt={`Brasão Oficial ${m.name}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/brasao-municipio.png';
                      }}
                      className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                      <MapPin size={12} />
                      <span>{m.state}</span>
                      <span className="text-slate-300 dark:text-neutral-700">•</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold lowercase">
                        {m.subdomain}.gestao360
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black font-['Montserrat'] text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      {m.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
                      {m.tagline || 'Portal Integrado do Servidor'}
                    </p>
                  </div>
                </div>

                {/* Tags de Serviços / Módulos Disponíveis */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {(m.modules || ['Portal do Servidor', 'Finanças', 'Governança']).map((mod, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 border border-slate-200/60 dark:border-neutral-700/60"
                    >
                      {mod}
                    </span>
                  ))}
                </div>
              </div>

              {/* Botão de Ação do Card */}
              <div className="pt-4 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="group-hover:underline font-extrabold text-sm">Acessar Portal do Cidadão</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FEEDBACK SE A BUSCA NÃO ENCONTRAR NADA */}
        {filteredMunicipalities.length === 0 && (
          <div className="text-center py-16 px-4 bg-white dark:bg-neutral-900/50 rounded-3xl border border-slate-200 dark:border-neutral-800 max-w-md mx-auto space-y-3">
            <Building2 size={36} className="mx-auto text-slate-400 dark:text-neutral-500" />
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">Nenhum município localizado</h4>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Não encontramos resultados para &ldquo;{searchTerm}&rdquo;. Verifique a ortografia ou limpe a busca.
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-700 transition-colors"
            >
              Ver todos os municípios
            </button>
          </div>
        )}

        {/* BANNER INSTITUCIONAL: TORIXORÉU EM PRODUÇÃO */}
        <div className="mt-12 bg-gradient-to-r from-emerald-950/20 via-slate-900/10 to-teal-950/20 dark:from-neutral-900 dark:to-neutral-950 p-6 sm:p-8 rounded-3xl border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-['Montserrat']">
                Prefeitura Municipal de Torixoréu — MT
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 mt-0.5">
                Município em produção oficial com sistemas de Folha, Finanças, FUS Saúde, Educação e Controles em operação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleNavigateToMunicipality(OFFICIAL_CLIENT_MUNICIPALITIES[0])}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Acessar Portal do Cidadão • Torixoréu</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </main>

      {/* RODAPÉ OFICIAL */}
      <footer className="border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0c] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-slate-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-neutral-300">Gestão 360</span>
            <span>•</span>
            <span>Plataforma Oficial de Governança Pública Municipal</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToLandingPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 transition-colors cursor-pointer"
            >
              <span>Apresentação Comercial</span>
              <ExternalLink size={12} />
            </button>
            <span>•</span>
            <VersionBadge variant="footer" />
          </div>
        </div>
      </footer>
    </div>
  );
};

