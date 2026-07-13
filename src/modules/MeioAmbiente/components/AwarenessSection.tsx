import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Trees, AlertTriangle, Droplets, Wind, Scale } from 'lucide-react';

export const AwarenessSection = () => {
  return (
    <div className="space-y-12">
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
          <AlertTriangle size={14} /> Alerta Ambiental
        </div>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900 dark:text-white mb-6 leading-tight">
          Queimada Urbana é Crime!
        </h2>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
          O ato de queimar lixo, mato ou folhas em terrenos baldios ou ruas prejudica a saúde de todos, destrói o meio ambiente e pode causar incêndios de grandes proporções.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-neutral-900 p-8 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-xl shadow-neutral-900/5"
        >
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6">
            <Flame size={28} />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Riscos à Saúde</h3>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
            A fumaça contém gases tóxicos que agravam doenças respiratórias como asma e bronquite, afetando principalmente crianças e idosos.
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-neutral-900 p-8 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-xl shadow-neutral-900/5"
        >
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
            <Trees size={28} />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Danos Ambientais</h3>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
            Destrói a vegetação nativa, mata animais silvestres e empobrece o solo, além de contribuir para o aquecimento global.
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-neutral-900 p-8 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-xl shadow-neutral-900/5"
        >
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6">
            <Scale size={28} />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Multas e Punições</h3>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
            É crime ambiental! Quem pratica queimadas está sujeito a multas que podem chegar a milhares de reais e até reclusão.
          </p>
        </motion.div>
      </div>

      <div className="bg-neutral-900 dark:bg-black rounded-[32px] p-8 md:p-12 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-3xl font-black text-white mb-6">Como Prevenir?</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                  <Wind size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Não queime lixo ou folhas</p>
                  <p className="text-sm text-neutral-400">Varra e ensaque as folhas secas para a coleta de lixo normal.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                  <Droplets size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Mantenha terrenos limpos</p>
                  <p className="text-sm text-neutral-400">A capina deve ser feita sem o uso do fogo. Mantenha seu terreno roçado.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                  <AlertTriangle size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Cuidado com bitucas</p>
                  <p className="text-sm text-neutral-400">Nunca jogue bitucas de cigarro em vias públicas ou terrenos.</p>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl text-center">
             <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
                <Flame size={32} />
             </div>
             <h4 className="text-xl font-bold text-white mb-4">Viu um foco de incêndio?</h4>
             <p className="text-neutral-300 mb-6 text-sm">
                Se o fogo estiver fora de controle e oferecendo risco imediato, não hesite em chamar os bombeiros antes de fazer a denúncia.
             </p>
             <a href="tel:193" className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white w-full py-4 rounded-xl font-black text-lg transition-colors shadow-lg shadow-red-500/20">
                Ligar 193 (Bombeiros)
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};
