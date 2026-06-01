import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, Home, Pill } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Medication } from './Farmacia';

export const PublicFarmaciaPortal = ({ darkMode, currentInstitution }: { darkMode: boolean, currentInstitution?: any }) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMedications = async () => {
    setIsLoading(true);
    let query = supabase.from('medications').select('*');
    if (currentInstitution) {
      query = query.eq('institution_id', currentInstitution.id);
    }
    
    const { data, error } = await query.order('name', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar medicamentos:', error);
    } else if (data) {
      setMedications(data as Medication[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMedications();
  }, [currentInstitution]);

  const filtered = medications.filter(m => {
    const search = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(search) || m.active_ingredient.toLowerCase().includes(search);
  });

  return (
    <div className={`min-h-screen py-12 px-4 flex flex-col items-center font-sans ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* Botão Voltar */}
      <div className="w-full max-w-4xl flex justify-end mb-4">
        <a
          href="/"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${darkMode ? 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700' : 'bg-white text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'} border ${darkMode ? 'border-neutral-700' : 'border-neutral-200'} shadow-sm`}
          title="Voltar à Página Inicial"
        >
          <Home size={14} />
          Página Inicial
        </a>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden ${darkMode ? 'bg-neutral-900' : 'bg-white'}`}
      >
        <div className="bg-sky-600 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <Package size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Farmácia do SUS</h1>
          <p className="text-sky-100 font-medium">
            {currentInstitution ? `Consulte a disponibilidade de medicamentos na prefeitura de ${currentInstitution.name.replace("Prefeitura Municipal de ", "")}` : 'Consulte a disponibilidade de medicamentos no município'}
          </p>
        </div>

        <div className="p-8 md:p-12">
          <div className="mb-8 relative max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar por nome ou princípio ativo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-neutral-100 dark:bg-neutral-800 border-none rounded-3xl text-base focus:ring-4 focus:ring-sky-500/20 outline-none transition-all dark:text-white"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-neutral-500 font-medium">Carregando lista de medicamentos...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(med => {
                const isAvailable = med.quantity > 0;
                return (
                  <div key={med.id} className="bg-white dark:bg-neutral-800/50 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-2xl ${isAvailable ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'}`}>
                        <Pill size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white">{med.name}</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{med.active_ingredient}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-md">
                            {med.dosage}
                          </span>
                          <span className="text-xs font-medium text-neutral-500">
                            {med.form}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center md:flex-col md:items-end gap-2 shrink-0">
                      {isAvailable ? (
                        <div className="flex flex-col items-end">
                           <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                            Disponível
                          </span>
                          <span className="text-xs text-neutral-400 mt-2">
                            Retirada na Unidade Central
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                            Aguardando fornecedor
                          </span>
                          <span className="text-xs text-neutral-400 mt-2">
                            Previsão de reposição em breve
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-16 bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-700">
                  <Package size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                  <h4 className="font-bold text-neutral-900 dark:text-white mb-2">Nenhum medicamento encontrado</h4>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Verifique a ortografia ou busque pelo princípio ativo.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
