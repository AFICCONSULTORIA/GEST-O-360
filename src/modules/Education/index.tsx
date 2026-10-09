import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Baby, Vote, Users, FileText, HeartHandshake, Bell 
} from 'lucide-react';
import { EducationCrecheAdmin } from './components/EducationCrecheAdmin';
import { EducationVotingAdmin } from './components/EducationVotingAdmin';
import { EducationStaffAdmin } from './components/EducationStaffAdmin';
import { EducationEnrollmentManager } from './components/EducationEnrollmentManager';
import { FamilyPortalView } from './components/FamilyPortalView';
import { SchoolAnnouncementsManager } from './components/SchoolAnnouncementsManager';

export const EducationModule: React.FC = () => {
  const [educationView, setEducationView] = useState<'staff' | 'matriculas' | 'creche' | 'familia' | 'avisos' | 'votacao'>('staff');

  const navigationTabs = [
    { id: 'staff', label: 'Professores & Equipe', icon: Users },
    { id: 'matriculas', label: 'Secretaria & Matrículas', icon: FileText },
    { id: 'creche', label: 'Fila CMEI', icon: Baby },
    { id: 'familia', label: 'Portal da Família', icon: HeartHandshake },
    { id: 'avisos', label: 'Mural de Avisos', icon: Bell },
    { id: 'votacao', label: 'Eleição de Diretores', icon: Vote },
  ] as const;

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      {/* Top Header & Navigation */}
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
              <GraduationCap size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">
                Secretaria de <span className="text-neutral-400 font-normal">Educação</span>
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
                Gestão Integrada de Educadores, Escolas, Rede de Ensino e Controle Social.
              </p>
            </div>
          </div>

          <div className="flex bg-neutral-50 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1 overflow-x-auto w-full lg:w-auto">
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setEducationView(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer ${
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
        {educationView === 'staff' && (
          <motion.div 
            key="staff"
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            transition={{ duration: 0.2 }}
          >
            <EducationStaffAdmin />
          </motion.div>
        )}

        {educationView === 'matriculas' && (
          <motion.div 
            key="matriculas"
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            transition={{ duration: 0.2 }}
          >
            <EducationEnrollmentManager />
          </motion.div>
        )}

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

        {educationView === 'familia' && (
          <motion.div 
            key="familia"
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            transition={{ duration: 0.2 }}
          >
            <FamilyPortalView />
          </motion.div>
        )}

        {educationView === 'avisos' && (
          <motion.div 
            key="avisos"
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            transition={{ duration: 0.2 }}
          >
            <SchoolAnnouncementsManager />
          </motion.div>
        )}

        {educationView === 'votacao' && (
          <motion.div 
            key="votacao"
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }} 
            transition={{ duration: 0.2 }}
          >
            <EducationVotingAdmin />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
