import React from 'react';
import { motion } from 'motion/react';
import { 
  Sun, Moon, Globe, Calendar, HeartPulse, GraduationCap, Lock, ChevronRight, Baby 
} from 'lucide-react';

import { LogoCompass } from './LogoCompass';
import { Institution } from '../types';

export const LandingPage = ({ darkMode, setDarkMode, currentInstitution }: { darkMode: boolean, setDarkMode: (v: boolean) => void, currentInstitution?: Institution | null }) => (
  <div className={`min-h-[100dvh] ${darkMode ? 'dark' : ''}`}>
    <div className="min-h-[100dvh] bg-[#F4F4F2] dark:bg-neutral-950 flex flex-col overflow-hidden relative transition-colors duration-300">
      {/* Gradients de fundo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-emerald-100/60 dark:bg-emerald-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-sky-100/60 dark:bg-sky-900/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-violet-100/30 dark:bg-violet-900/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-2xl shadow-lg border border-neutral-100 dark:border-neutral-800">
            <LogoCompass size={28} />
          </div>
          <span className="text-xl font-black text-neutral-900 dark:text-white tracking-tight italic">
            {currentInstitution ? currentInstitution.name.replace('Prefeitura Municipal de ', 'Prefeitura de ') : <>Gestão <span className="text-neutral-400 font-normal">360</span></>}
          </span>
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-md border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-110 transition-all"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
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
            Sistema Online
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none">
            {currentInstitution ? (
              <>
                Portal do Cidadão
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
              ? `Acesse os serviços digitais oficiais da prefeitura de ${currentInstitution.name.replace('Prefeitura Municipal de ', '')}.` 
              : "Plataforma de compliance, transparência e gestão municipal integrada."}
          </p>
        </motion.div>

        {/* Cards de Acesso */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-6xl px-4 mx-auto"
        >
          {/* Card Serviços Públicos */}
          <a
            href="/servicos"
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

          {/* Card Agendamento */}
          <a
            href="/agendamento"
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

          {/* Card Farmácia SUS */}
          <a
            href="/farmaciasus"
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

          {/* Card Educação */}
          <a
            href="/educacao"
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

        </motion.div>
      </main>

      {/* Footer discreto com link de acesso restrito */}
      <footer className="relative z-10 flex items-center justify-between px-8 py-5 text-[10px] text-neutral-400 dark:text-neutral-700 font-bold uppercase tracking-widest">
        <span>Gestão 360 · Sistemas de Compliance Municipal</span>
        <a
          href="/servidores"
          className="flex items-center gap-1.5 text-neutral-300 dark:text-neutral-800 hover:text-neutral-500 dark:hover:text-neutral-500 transition-colors duration-300"
          title="Área restrita"
        >
          <Lock size={10} />
          <span>servidor</span>
        </a>
      </footer>
    </div>
  </div>
);

export default LandingPage;
