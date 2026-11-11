import React from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { AdminUser, Institution } from '../../types';
import { DiarioOficialManagerContent } from './components/DiarioOficialManagerContent';

interface DiarioOficialModuleProps {
  currentUser?: AdminUser | null;
  currentInstitution?: Institution | null;
}

export const DiarioOficialModule: React.FC<DiarioOficialModuleProps> = ({
  currentUser,
  currentInstitution,
}) => {
  if (!currentInstitution) {
    return (
      <div className="p-8 text-center text-sm text-neutral-500">
        Selecione uma instituição municipal para gerenciar o Diário Oficial Eletrônico.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
                Diário Oficial Eletrônico
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                <ShieldCheck size={11} /> Publicidade Oficial
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              {currentInstitution.name} — Publicação oficial, edições numeradas e transparência administrativa
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-sm">
        <DiarioOficialManagerContent
          currentInstitution={currentInstitution}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
};

export default DiarioOficialModule;

