import React from 'react';
import { motion } from 'motion/react';
import {
  Sun, Moon, Globe, Calendar, HeartPulse, GraduationCap, Lock, ChevronRight, Newspaper, Headphones, Scale, ShieldCheck
} from 'lucide-react';

import { LogoCompass } from './LogoCompass';
import { Institution, AdminUser } from '../types';
import { isInstitutionModuleActive, withInstitutionQuery } from '../lib/institutionModules';

export interface LandingPageProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  currentInstitution?: Institution | null;
  onReturnToHome?: () => void;
  isAuthenticated?: boolean;
  currentUser?: AdminUser | null;
}

export const LandingPage = ({ 
  darkMode, 
  setDarkMode, 
  currentInstitution, 
  onReturnToHome,
  isAuthenticated = false,
  currentUser
}: LandingPageProps) => {
  const showNoticias = isInstitutionModuleActive(currentInstitution, 'noticias');
  const showServicos = isInstitutionModuleActive(currentInstitution, 'servicos_publicos');
  const showSaude = isInstitutionModuleActive(currentInstitution, 'saude');
  const showEducacao = isInstitutionModuleActive(currentInstitution, 'education');
  const showOuvidoria = isInstitutionModuleActive(currentInstitution, 'ouvidoria');
  const showNotaFiscal = isInstitutionModuleActive(currentInstitution, 'notafiscal');

  const hasAnyPublicPortal = showNoticias || showServicos || showSaude || showEducacao || showOuvidoria || showNotaFiscal;

  return (
    <div className={`min-h-[100dvh] ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-[100dvh] bg-[#F4F4F2] dark:bg-neutral-950 flex flex-col overflow-hidden relative transition-colors duration-300">
        {/* Gradients de fundo */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-emerald-100/60 dark:bg-emerald-900/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-sky-100/60 dark:bg-sky-900/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-violet-100/30 dark:bg-violet-900/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-neutral-900 p-2 sm:p-2.5 rounded-2xl shadow-lg border border-neutral-100 dark:border-neutral-800">
              {currentInstitution?.logo_url ? (
                <img
                  src={currentInstitution.logo_url}
                  alt={`Brasão ${currentInstitution.name}`}
                  className="w-7 h-7 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <LogoCompass size={28} />
              )}
            </div>
            <span className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white tracking-tight italic">
              {currentInstitution ? currentInstitution.name.replace('Prefeitura Municipal de ', 'Prefeitura de ') : <>Gestão <span className="text-neutral-400 font-normal">360</span></>}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={withInstitutionQuery('/servidores', currentInstitution)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition hover:scale-105 ${isAuthenticated ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-neutral-900 dark:bg-white dark:text-neutral-950'}`}
              title={isAuthenticated ? 'Acessar minha conta logada' : 'Acesso Restrito do Servidor Municipal'}
            >
              {isAuthenticated ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Acessar Meu Painel</span>
                </>
              ) : (
                <>
                  <Lock size={13} />
                  <span>Área do Servidor</span>
                </>
              )}
            </a>
            <button
              onClick={() => {
                if (onReturnToHome) {
                  onReturnToHome();
                } else {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('inst');
                  url.searchParams.delete('subdomain');
                  url.searchParams.delete('municipio');
                  window.location.href = url.pathname === '/' ? '/?sales=true' : '/';
                }
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm transition hover:scale-105"
              title="Conhecer o ecossistema Gestão 360"
            >
              ← Ecossistema Gestão 360
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 sm:p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-md border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-110 transition-all"
              aria-label="Alternar tema"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="space-y-6 max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Sistema Oficial Online
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none">
              {currentInstitution ? (
                <>
                  {hasAnyPublicPortal ? 'Portal do Cidadão' : 'Gestão Administrativa'}
                  <span className="block text-xl md:text-3xl font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mt-4">
                    {currentInstitution.name}
                  </span>
                </>
              ) : (
                <>
                  Gestão <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-500">360°</span>
                </>
              )}
            </h1>

            <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto leading-relaxed">
              {currentInstitution
                ? `Plataforma digital oficial da ${currentInstitution.name}.`
                : "Plataforma de compliance, transparência e gestão municipal integrada."}
            </p>
          </motion.div>

          {/* Cards de Acesso filtrados por active_modules da Prefeitura */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full max-w-7xl px-4 mx-auto"
          >
            {showNoticias && (
              <a
                href={withInstitutionQuery('/noticias', currentInstitution)}
                className="group relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-7 text-left hover:shadow-2xl hover:shadow-rose-500/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative space-y-4">
                  <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white dark:group-hover:text-neutral-950 transition-all duration-300 text-rose-600 dark:text-rose-400 shadow-sm">
                    <Newspaper size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Notícias & Ações</h2>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-1 font-medium">
                      Acompanhe obras em andamento, programas entregues, avisos oficiais e metas da gestão.
                    </p>
                  </div>
                </div>
                <div className="relative mt-6 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-widest border-t border-neutral-100 dark:border-neutral-800/80 pt-4 w-full">
                  <span>Ver Notícias</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </a>
            )}

            {showServicos && (
              <a
                href={withInstitutionQuery('/servicos', currentInstitution)}
                className="group relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-8 text-left hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative space-y-5">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:text-neutral-950 transition-all duration-300 text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Serviços Públicos</h2>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 font-medium">
                      Abra chamados, relate problemas urbanos e acompanhe suas demandas municipais em tempo real.
                    </p>
                  </div>
                </div>
                <div className="relative mt-8 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest border-t border-neutral-100 dark:border-neutral-800/80 pt-4 w-full">
                  <span>Acessar Portal</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </a>
            )}

            {showSaude && (
              <>
                <a
                  href={withInstitutionQuery('/agendamento', currentInstitution)}
                  className="group relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-8 text-left hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 to-transparent dark:from-sky-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative space-y-5">
                    <div className="w-14 h-14 bg-sky-50 dark:bg-sky-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white dark:group-hover:text-neutral-950 transition-all duration-300 text-sky-600 dark:text-sky-400 shadow-sm">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">Agendamento SUS</h2>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 font-medium">
                        Agende consultas médicas básicas, exames e solicite transporte para tratamento de saúde.
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-8 flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-black uppercase tracking-widest border-t border-neutral-100 dark:border-neutral-800/80 pt-4 w-full">
                    <span>Agendar Consulta</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </a>

                <a
                  href={withInstitutionQuery('/farmaciasus', currentInstitution)}
                  className="group relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-8 text-left hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative space-y-5">
                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white dark:group-hover:text-neutral-950 transition-all duration-300 text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <HeartPulse size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Farmácia SUS</h2>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 font-medium">
                        Consulte a disponibilidade em tempo real de medicamentos gratuitos nas farmácias municipais.
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-8 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest border-t border-neutral-100 dark:border-neutral-800/80 pt-4 w-full">
                    <span>Consultar Remédios</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </a>
              </>
            )}

            {showEducacao && (
              <a
                href={withInstitutionQuery('/educacao', currentInstitution)}
                className="group relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-8 text-left hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative space-y-5">
                  <div className="w-14 h-14 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white dark:group-hover:text-neutral-950 transition-all duration-300 text-amber-600 dark:text-amber-400 shadow-sm">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Educação Municipal</h2>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 font-medium">
                      Acesse avaliações diagnósticas dos alunos e trilhas de formação para os professores da rede.
                    </p>
                  </div>
                </div>
                <div className="relative mt-8 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest border-t border-neutral-100 dark:border-neutral-800/80 pt-4 w-full">
                  <span>Portal da Educação</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </a>
            )}

            {showOuvidoria && (
              <a
                href={withInstitutionQuery('/ouvidoria', currentInstitution)}
                className="group relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-8 text-left hover:shadow-2xl hover:shadow-teal-500/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative space-y-5">
                  <div className="w-14 h-14 bg-teal-50 dark:bg-teal-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white dark:group-hover:text-neutral-950 transition-all duration-300 text-teal-600 dark:text-teal-400 shadow-sm">
                    <Headphones size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Ouvidoria Municipal</h2>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 font-medium">
                      Canal oficial para envio de elogios, sugestões, solicitações, reclamações e denúncias, com opção de sigilo e protocolo.
                    </p>
                  </div>
                </div>
                <div className="relative mt-8 flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-black uppercase tracking-widest border-t border-neutral-100 dark:border-neutral-800/80 pt-4 w-full">
                  <span>Acessar Ouvidoria</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </a>
            )}

            {showNotaFiscal && (
              <a
                href={withInstitutionQuery('/notafiscal', currentInstitution)}
                className="group relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-8 text-left hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative space-y-5">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white dark:group-hover:text-neutral-950 transition-all duration-300 text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <Scale size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Auditor Fiscal 2026</h2>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 font-medium">
                      Auditoria e pré-validação de NF-e e NFS-e (XML ou PDF). Validação do Grupo UB, IBS, CBS e amarração do Bloco W.
                    </p>
                  </div>
                </div>
                <div className="relative mt-8 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest border-t border-neutral-100 dark:border-neutral-800/80 pt-4 w-full">
                  <span>Auditar Documento</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </a>
            )}

            {/* Card de Acesso Interno dos Servidores (sempre visível para prefeituras) */}
            <a
              href={withInstitutionQuery('/servidores', currentInstitution)}
              className="group relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/80 rounded-[32px] p-8 text-left hover:shadow-2xl hover:shadow-neutral-500/10 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
            >
              <div className="relative space-y-5">
                <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-neutral-950 transition-all duration-300 text-neutral-700 dark:text-neutral-300 shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Portal do Servidor</h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mt-2 font-medium">
                    Acesso restrito para servidores municipais: Controle de Patrimônio, Banco de Certidões, Protocolos e Governança.
                  </p>
                </div>
              </div>
              <div className="relative mt-8 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest border-t border-neutral-100 dark:border-neutral-800/80 pt-4 w-full">
                <span>{isAuthenticated ? 'Acessar Minha Conta (Logado)' : 'Entrar no Sistema'}</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </a>
          </motion.div>
        </main>

        {/* Footer discreto com link de acesso restrito */}
        <footer className="relative z-10 flex items-center justify-between px-8 py-5 text-[10px] text-neutral-400 dark:text-neutral-700 font-bold uppercase tracking-widest">
          <span>Gestão 360 · Sistemas de Compliance Municipal</span>
          <a
            href={withInstitutionQuery('/servidores', currentInstitution)}
            className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-400 transition-colors duration-300"
            title="Área restrita"
          >
            <Lock size={10} />
            <span>Acesso Servidor</span>
          </a>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
