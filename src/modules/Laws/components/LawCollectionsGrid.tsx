import React from 'react';
import { 
  Landmark, 
  Coins, 
  Users2, 
  Building, 
  FileSpreadsheet, 
  Trees, 
  ShieldCheck,
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface LawCollection {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  icon: any;
  color: string;
  targetLawNumber?: string;
  count: number;
}

export const LAW_COLLECTIONS: LawCollection[] = [
  {
    id: 'lom',
    title: 'Lei Orgânica Municipal',
    subtitle: 'Constituição Cívica & Autonomia Local',
    type: 'Lei Orgânica',
    icon: Landmark,
    color: 'from-blue-600 to-indigo-700 text-white',
    targetLawNumber: '001/1990',
    count: 1
  },
  {
    id: 'tributario',
    title: 'Código Tributário Municipal',
    subtitle: 'ISS, IPTU, ITBI, Taxas & Arrecadação',
    type: 'Lei Complementar',
    icon: Coins,
    color: 'from-amber-500 to-amber-700 text-white',
    targetLawNumber: '045/2021',
    count: 3
  },
  {
    id: 'estatuto',
    title: 'Estatuto dos Servidores',
    subtitle: 'Regime Jurídico, Vantagens & Estágio',
    type: 'Lei Ordinária',
    icon: Users2,
    color: 'from-emerald-600 to-teal-700 text-white',
    targetLawNumber: '1.420/2023',
    count: 4
  },
  {
    id: 'licitacoes',
    title: 'Regulamento de Licitações',
    subtitle: 'Aplicação da Nova Lei 14.133/2021',
    type: 'Decreto',
    icon: FileSpreadsheet,
    color: 'from-purple-600 to-purple-800 text-white',
    targetLawNumber: '089/2024',
    count: 2
  },
  {
    id: 'planodiretor',
    title: 'Plano Diretor & Urbanismo',
    subtitle: 'Zoneamento, Solo Urbano & Obras',
    type: 'Lei Ordinária',
    icon: Building,
    color: 'from-cyan-600 to-blue-700 text-white',
    targetLawNumber: '1.380/2022',
    count: 2
  },
  {
    id: 'meioambiente',
    title: 'Meio Ambiente & Posturas',
    subtitle: 'Licenciamento Simplificado & Ordem Urbana',
    type: 'Lei Ordinária',
    icon: Trees,
    color: 'from-green-600 to-emerald-800 text-white',
    targetLawNumber: '1.102/2018',
    count: 2
  }
];

interface LawCollectionsGridProps {
  onSelectCollection: (collection: LawCollection) => void;
  activeCollectionId?: string | null;
}

export const LawCollectionsGrid: React.FC<LawCollectionsGridProps> = ({
  onSelectCollection,
  activeCollectionId
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="text-emerald-500" size={18} />
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
            Grandes Coleções & Códigos Estruturantes
          </h3>
        </div>
        <span className="text-xs text-neutral-400 font-semibold">
          Acesso rápido às normas fundamentais da Administração
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {LAW_COLLECTIONS.map(col => {
          const IconComponent = col.icon;
          const isActive = activeCollectionId === col.id;

          return (
            <button
              key={col.id}
              type="button"
              onClick={() => onSelectCollection(col)}
              className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer relative overflow-hidden group border ${
                isActive
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30 bg-white dark:bg-neutral-800'
                  : 'border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${col.color} shadow-sm group-hover:scale-105 transition-transform`}>
                  <IconComponent size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md">
                  {col.type}
                </span>
              </div>

              <h4 className="text-xs font-black text-neutral-900 dark:text-white leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                {col.title}
              </h4>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1 leading-normal">
                {col.subtitle}
              </p>

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500">
                  {col.count} {col.count === 1 ? 'ato' : 'atos'}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Ver texto <ChevronRight size={12} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

