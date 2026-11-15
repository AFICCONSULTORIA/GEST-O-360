import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, Home, Pill } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Medication } from './Farmacia';
import { DEFAULT_MEDICATIONS } from './index';

export const PublicFarmaciaPortal = ({
  darkMode,
  currentInstitution,
  embedded = false
}: {
  darkMode: boolean;
  currentInstitution?: any;
  embedded?: boolean;
}) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'restock'>('all');

  const loadMedications = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('medications').select('*');
      if (currentInstitution?.id) {
        query = query.eq('institution_id', currentInstitution.id);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      
      if (!error && data && data.length > 0) {
        setMedications(data as Medication[]);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Erro ao consultar banco, usando catálogo da farmácia:', e);
    }

    // Fallback: estoque salvo localmente ou lista padrão oficial de medicamentos SUS
    try {
      const local = localStorage.getItem('gestao360_demo_saude_medications');
      if (local) {
        setMedications(JSON.parse(local));
      } else {
        setMedications(DEFAULT_MEDICATIONS);
      }
    } catch (_) {
      setMedications(DEFAULT_MEDICATIONS);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMedications();
  }, [currentInstitution]);

  const filtered = medications.filter(m => {
    const search = searchQuery.toLowerCase();
    const matchesSearch = m.name.toLowerCase().includes(search) || m.active_ingredient.toLowerCase().includes(search);
    if (!matchesSearch) return false;
    if (stockFilter === 'available') return m.quantity > 0;
    if (stockFilter === 'restock') return m.quantity <= 0;
    return true;
  });

  const availableCount = medications.filter(m => m.quantity > 0).length;
  const restockCount = medications.length - availableCount;

  const content = (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className={
        embedded
          ? 'w-full overflow-hidden'
          : `w-full max-w-5xl rounded-[36px] shadow-2xl overflow-hidden border ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'}`
      }
    >
      <div className="bg-gradient-to-br from-emerald-800 via-teal-700 to-cyan-800 p-6 sm:p-8 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg shrink-0">
              <Pill size={28} className="text-emerald-100" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-emerald-50 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> Catálogo RENAME · Estoque em Tempo Real
              </span>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Farmácia Básica Municipal</h2>
              <p className="text-emerald-100/90 text-xs md:text-sm font-medium mt-0.5">
                {currentInstitution?.name
                  ? `Consulte a disponibilidade gratuita de medicamentos em ${currentInstitution.name.replace('Prefeitura Municipal de ', '')}`
                  : 'Consulte a disponibilidade gratuita de medicamentos na rede municipal de saúde'}
              </p>
            </div>
          </div>

          {!isLoading && (
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center">
                <span className="text-xl font-black block leading-none">{availableCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Disponíveis</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/15 text-center">
                <span className="text-xl font-black block leading-none">{restockCount}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-100">Em Reposição</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Barra de Busca + Filtros de Disponibilidade */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" size={18} />
            <input
              type="text"
              placeholder="Buscar medicamento por nome comercial, princípio ativo ou dosagem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-xs sm:text-sm font-medium outline-none border transition-all ${
                darkMode
                  ? 'bg-neutral-800/90 border-neutral-700 text-white focus:border-emerald-500'
                  : 'bg-neutral-50 border-neutral-200/90 text-neutral-900 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              }`}
            />
          </div>

          <div className={`flex p-1.5 rounded-2xl border shrink-0 ${
            darkMode ? 'bg-neutral-800/80 border-neutral-700' : 'bg-neutral-100/80 border-neutral-200/70'
          }`}>
            {[
              { id: 'all' as const, label: `Todos (${medications.length})` },
              { id: 'available' as const, label: `Disponíveis (${availableCount})` },
              { id: 'restock' as const, label: `Em Reposição (${restockCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStockFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  stockFilter === tab.id
                    ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-14">
            <div className="w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-neutral-500 text-sm font-semibold">Sincronizando estoque da Farmácia Municipal...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((med, idx) => {
              const isAvailable = med.quantity > 0;
              return (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.025, 0.2), duration: 0.2 }}
                  whileHover={{ y: -2 }}
                  className={`p-5 rounded-3xl border flex flex-col justify-between gap-4 transition-all ${
                    darkMode
                      ? 'bg-neutral-800/50 border-neutral-800 hover:border-emerald-500/40'
                      : 'bg-neutral-50/60 border-neutral-200/80 hover:bg-white hover:shadow-lg hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-neutral-200/70 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                        }`}
                      >
                        <Pill size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white leading-snug truncate">
                          {med.name}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium truncate">
                          Princípio Ativo: {med.active_ingredient}
                        </p>
                      </div>
                    </div>

                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Disponível
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Reposição
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/50 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 px-2.5 py-1 rounded-lg">
                        {med.dosage}
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                        {med.form}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-neutral-400">
                      {isAvailable ? 'Dispensação mediante receita SUS' : 'Aguardando remessa'}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {filtered.length === 0 && (
              <div className="md:col-span-2 text-center py-14 bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-700">
                <Package size={44} className="mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <h4 className="font-bold text-neutral-900 dark:text-white mb-1">Nenhum medicamento encontrado</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Verifique a ortografia ou altere o filtro de disponibilidade.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className={`min-h-screen py-10 px-4 flex flex-col items-center font-sans ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      <div className="w-full max-w-4xl flex justify-end mb-4">
        <a
          href="/"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${darkMode ? 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700' : 'bg-white text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'} border ${darkMode ? 'border-neutral-700' : 'border-neutral-200'} shadow-sm`}
          title="Voltar à Página Inicial"
        >
          <Home size={14} />
          Página Inicial
        </a>
      </div>
      {content}
    </div>
  );
};
