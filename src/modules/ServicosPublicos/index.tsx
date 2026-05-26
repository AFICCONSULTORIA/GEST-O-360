import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, Lightbulb, TreePine, Trash2, Truck, Plus, CircleOff, Search, ChevronRight, MapPin, Phone, UserCircle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { showToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';

export type CategoriaDemanda = 'Iluminação' | 'Poda de Árvore' | 'Tapa buraco' | 'Remoção de Entulho' | 'Coleta de Lixo';

export interface Demanda {
  id: string;
  protocolo: string;
  categoria: CategoriaDemanda;
  descricao: string;
  endereco: string;
  solicitante: string;
  telefone: string;
  status: 'Aberto' | 'Em Andamento' | 'Concluído';
  data_solicitacao: string;
  foto?: string;
}

const CATEGORY_ICONS: Record<CategoriaDemanda, any> = {
  'Iluminação': Lightbulb,
  'Poda de Árvore': TreePine,
  'Tapa buraco': Wrench,
  'Remoção de Entulho': Truck,
  'Coleta de Lixo': Trash2
};

const STATUS_COLORS = {
  'Aberto': 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  'Em Andamento': 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  'Concluído': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
};

export function ServicosPublicosModule() {
  const [demands, setDemands] = React.useState<Demanda[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<Demanda['status'] | 'Todos'>('Todos');
  const [viewingDemanda, setViewingDemanda] = React.useState<Demanda | null>(null);

  React.useEffect(() => {
    fetchDemands();
  }, []);

  const fetchDemands = async () => {
    const { data, error } = await supabase
      .from('servicos_publicos_demandas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar demandas:', error);
      return;
    }
    
    if (data) {
      const formatted = data.map(d => ({
        ...d,
        data_solicitacao: d.data_solicitacao.split('-').reverse().join('/')
      })) as Demanda[];
      setDemands(formatted);
    }
  };

  const filteredDemands = demands.filter(d => 
    (selectedStatus === 'Todos' || d.status === selectedStatus) &&
    (d.protocolo.toLowerCase().includes(searchQuery.toLowerCase()) ||
     d.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
     d.endereco.toLowerCase().includes(searchQuery.toLowerCase()) ||
     d.solicitante.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = {
    total: demands.length,
    abertos: demands.filter(d => d.status === 'Aberto').length,
    andamento: demands.filter(d => d.status === 'Em Andamento').length,
    concluidos: demands.filter(d => d.status === 'Concluído').length,
  };

  const updateStatus = async (id: string, newStatus: Demanda['status']) => {
    setDemands(demands.map(d => d.id === id ? { ...d, status: newStatus } : d));
    if (viewingDemanda && viewingDemanda.id === id) {
      setViewingDemanda({ ...viewingDemanda, status: newStatus });
    }
    
    const { error } = await supabase
      .from('servicos_publicos_demandas')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (error) {
      console.error('Erro ao atualizar status:', error);
      showToast('Erro ao atualizar no banco de dados', 'error');
      fetchDemands();
    } else {
      showToast(`Status atualizado para ${newStatus}`, 'success');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Serviços Públicos</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">Gestão de demandas e zeladoria do município.</p>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total de Chamados', value: stats.total, color: 'text-neutral-900', icon: Wrench, bg: 'bg-neutral-50' },
          { label: 'Abertos', value: stats.abertos, color: 'text-rose-600', icon: AlertCircle, bg: 'bg-rose-50' },
          { label: 'Em Andamento', value: stats.andamento, color: 'text-amber-600', icon: Clock, bg: 'bg-amber-50' },
          { label: 'Concluídos', value: stats.concluidos, color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden"
          >
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${stat.bg} dark:bg-neutral-800/50 opacity-50 blur-2xl`} />
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{stat.label}</p>
              <stat.icon size={20} className={`${stat.color} dark:text-neutral-300`} />
            </div>
            <h3 className={`text-4xl font-black ${stat.color} dark:text-white`}>{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Filters and List */}
      <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por protocolo, descrição, solicitante..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {(['Todos', 'Aberto', 'Em Andamento', 'Concluído'] as const).map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  selectedStatus === status
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md'
                    : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="space-y-4">
            {filteredDemands.map((demanda) => {
              const Icon = CATEGORY_ICONS[demanda.categoria];
              return (
                <div 
                  key={demanda.id}
                  onClick={() => setViewingDemanda(demanda)}
                  className="group flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-white dark:bg-neutral-900 p-3 rounded-xl shadow-sm">
                      <Icon size={24} className="text-neutral-700 dark:text-neutral-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black font-mono text-neutral-400 dark:text-neutral-500 uppercase">{demanda.protocolo}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_COLORS[demanda.status]}`}>
                          {demanda.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{demanda.categoria}</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">{demanda.descricao}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-8 text-xs text-neutral-500 dark:text-neutral-400 mt-4 md:mt-0">
                    <div className="flex items-center gap-2">
                      <UserCircle size={14} />
                      {demanda.solicitante.split(' ')[0]}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      {demanda.data_solicitacao}
                    </div>
                    <ChevronRight size={16} className="text-neutral-300 group-hover:text-neutral-600 dark:group-hover:text-white transition-colors" />
                  </div>
                </div>
              );
            })}
            
            {filteredDemands.length === 0 && (
              <div className="text-center py-12">
                <Wrench size={48} className="mx-auto text-neutral-200 dark:text-neutral-800 mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">Nenhuma demanda encontrada.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Demanda Modal */}
      <AnimatePresence>
        {viewingDemanda && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-8 md:p-10 shadow-2xl space-y-8 flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg text-xs font-mono font-bold">
                      {viewingDemanda.protocolo}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${STATUS_COLORS[viewingDemanda.status]}`}>
                      {viewingDemanda.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{viewingDemanda.categoria}</h3>
                </div>
                <button onClick={() => setViewingDemanda(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
                  <CircleOff size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-700">
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Descrição</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{viewingDemanda.descricao}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                    <MapPin size={18} className="text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Endereço</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-1">{viewingDemanda.endereco}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                    <UserCircle size={18} className="text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Solicitante</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-1">{viewingDemanda.solicitante}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                    <Phone size={18} className="text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Telefone</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-1">{viewingDemanda.telefone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                    <Clock size={18} className="text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Data Solicitação</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                        {viewingDemanda.data_solicitacao.split('-').reverse().join('/')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
                <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4">Ações (Mudar Status)</p>
                <div className="flex gap-3">
                  {viewingDemanda.status !== 'Aberto' && (
                    <button 
                      onClick={() => updateStatus(viewingDemanda.id, 'Aberto')}
                      className="flex-1 py-4 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-2xl font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                    >
                      Reabrir
                    </button>
                  )}
                  {viewingDemanda.status !== 'Em Andamento' && (
                    <button 
                      onClick={() => updateStatus(viewingDemanda.id, 'Em Andamento')}
                      className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold text-xs hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                    >
                      Em Andamento
                    </button>
                  )}
                  {viewingDemanda.status !== 'Concluído' && (
                    <button 
                      onClick={() => updateStatus(viewingDemanda.id, 'Concluído')}
                      className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Concluir
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
