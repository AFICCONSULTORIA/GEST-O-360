import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, ChevronLeft } from 'lucide-react';
import { AwarenessSection } from './components/AwarenessSection';
import { ReportForm } from './components/ReportForm';

interface PublicMeioAmbientePortalProps {
  darkMode: boolean;
  currentInstitution?: { name: string; logo_url?: string } | null;
}

export const PublicMeioAmbientePortal = ({ darkMode, currentInstitution }: PublicMeioAmbientePortalProps) => {
  const handleReportSubmit = async (data: any) => {
    // Simulação de envio da denúncia para o banco de dados
    console.log('Enviando denúncia simulada:', data);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
  };

  return (
    <div className={`min-h-dvh ${darkMode ? 'dark bg-neutral-950' : 'bg-neutral-50'} font-sans text-neutral-900 dark:text-neutral-100 selection:bg-emerald-500/30`}>
      {/* Header Público */}
      <nav className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500 dark:text-neutral-400"
              title="Voltar ao Início"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              {currentInstitution?.logo_url ? (
                <img src={currentInstitution.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                  <Leaf size={20} />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-lg font-black tracking-tight leading-none dark:text-white">Secretaria de Meio Ambiente</h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{currentInstitution?.name || 'Prefeitura Municipal'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <a href="/" className="text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                Portal Principal
             </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-24">
         {/* Hero Section */}
         <section className="text-center max-w-4xl mx-auto pt-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest mb-6"
            >
              <Leaf size={14} /> Defesa Ambiental
            </motion.div>
            <motion.h2 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-4xl md:text-6xl font-black tracking-tight text-neutral-900 dark:text-white mb-6 leading-[1.1]"
            >
               Proteja nossa cidade.<br/>Denuncie queimadas.
            </motion.h2>
            <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed"
            >
               As queimadas prejudicam a saúde pública e destroem a natureza. Use este canal para registrar focos de incêndio e queimadas irregulares.
            </motion.p>
         </section>

         {/* Formulário e Conscientização em Grid */}
         <section className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7">
               <AwarenessSection />
            </div>
            <div className="lg:col-span-5 sticky top-28">
               <ReportForm onSubmit={handleReportSubmit} />
            </div>
         </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-neutral-900 border-t border-neutral-200/50 dark:border-neutral-800/50 py-12 mt-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">
            Meio Ambiente • GESTÃO 360
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Juntos por uma cidade mais limpa e saudável.
          </p>
        </div>
      </footer>
    </div>
  );
};
