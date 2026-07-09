import React from 'react';
import { HelpCircle } from 'lucide-react';

export const StudentSupport: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <HelpCircle size={48} />
      </div>
      <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">Central de Ajuda</h2>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md">Precisando de uma mãozinha? Nossos monitores e suporte técnico estão à disposição.</p>
    </div>
  );
};
