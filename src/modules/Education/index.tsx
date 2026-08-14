import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Baby 
} from 'lucide-react';
import { EducationCrecheAdmin } from './components/EducationCrecheAdmin';

export const EducationModule: React.FC = () => {
  const [educationView, setEducationView] = useState<'creche'>('creche');

  const navigationTabs = [
    { id: 'creche', label: 'Vagas CMEI', icon: Baby },
  ] as const;

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      {/* Top Header & Navigation */}
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
              <GraduationCap size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">
                Secretaria de <span className="text-neutral-400 font-normal">Educação</span>
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                Gestão Integrada de Recursos, Rede Escolar, Logística e Controle Social.
              </p>
            </div>
          </div>

          <div className="flex bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1 overflow-x-auto w-full lg:w-auto">
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setEducationView(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  educationView === tab.id 
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area with Transitions */}
      <AnimatePresence mode="wait">
        {educationView === 'creche' && (
          <motion.div 
            key="creche"
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            transition={{ duration: 0.2 }}
          >
            <EducationCrecheAdmin />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
