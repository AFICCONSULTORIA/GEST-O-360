import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Search, MapPin, AlertTriangle, CheckCircle2, XCircle, FileText, Image as ImageIcon, Camera, User, Calendar, Filter } from 'lucide-react';
import { EnvironmentalReport, AdminUser } from '../../types';
import { showToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';

const MOCK_REPORTS: EnvironmentalReport[] = [
  {
    id: '1',
    description: 'Fumaça densa vindo do terreno baldio próximo à escola municipal. Parecem estar queimando lixo e galhos.',
    location: 'Rua das Flores, 123, Centro',
    referencePoint: 'Atrás da Escola Municipal São José',
    isAnonymous: false,
    reporterName: 'Maria Silva',
    reporterContact: '(11) 98765-4321',
    status: 'Pendente',
    dateReported: new Date().toISOString(),
  },
  {
    id: '2',
    description: 'Queimada em área de preservação. Fogo se espalhando rápido por causa do vento.',
    location: 'Rodovia BR-101, Km 45',
    isAnonymous: true,
    status: 'Em Análise',
    dateReported: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    description: 'Morador queimando folhas secas na calçada, fumaça incomodando vizinhança.',
    location: 'Av. Brasil, 1500, Bairro Novo',
    isAnonymous: false,
    reporterName: 'João Souza',
    status: 'Resolvido',
    dateReported: new Date(Date.now() - 172800000).toISOString(),
  }
];

export const MeioAmbienteModule = ({ currentInstitution, currentUser }: { currentInstitution?: { id: string } | null, currentUser?: AdminUser | null }) => {
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [selectedReport, setSelectedReport] = useState<EnvironmentalReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('meio_ambiente_denuncias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedReports: EnvironmentalReport[] = data.map(d => ({
          id: d.id,
          protocolo: d.protocolo,
          description: d.description,
          location: d.location,
          referencePoint: d.reference_point,
          isAnonymous: d.is_anonymous,
          reporterName: d.reporter_name,
          reporterContact: d.reporter_contact,
          status: d.status === 'Nova' ? 'Pendente' : d.status as 'Pendente' | 'Em Análise' | 'Resolvido',
          dateReported: d.created_at,
          photoUrl: d.photo_url,
        }));
        setReports(mappedReports);
      }
    } catch (error) {
      console.error('Erro ao buscar denúncias:', error);
      showToast('Erro ao carregar denúncias', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateStatus = async (id: string, newStatus: 'Pendente' | 'Em Análise' | 'Resolvido') => {
    try {
      const dbStatus = newStatus === 'Pendente' ? 'Nova' : newStatus;
      const { error } = await supabase
        .from('meio_ambiente_denuncias')
        .update({ status: dbStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
      if (selectedReport?.id === id) {
        setSelectedReport({ ...selectedReport, status: newStatus });
      }
      showToast('Status atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showToast('Erro ao atualizar status', 'error');
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta denúncia? Esta ação não pode ser desfeita.')) return;
    
    try {
      const { error } = await supabase
        .from('meio_ambiente_denuncias')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setReports(reports.filter(r => r.id !== id));
      setSelectedReport(null);
      showToast('Denúncia excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir denúncia:', error);
      showToast('Erro ao excluir denúncia', 'error');
    }
  };

  const filtered = reports.filter(r => {
    const matchSearch = r.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'Todos' || r.status === filterStatus;
    return matchSearch && matchStatus;
  }).sort((a, b) => new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
      case 'Em Análise': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
      case 'Resolvido': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
      default: return 'bg-neutral-50 text-neutral-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-6">
        <div>
          <h2 className="text-2xl font-bold italic tracking-tight uppercase dark:text-neutral-100 flex items-center gap-3">
            <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 p-2 rounded-xl">
              <Leaf size={24} />
            </span>
            Meio Ambiente
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">Gestão de denúncias de queimadas e infrações ambientais.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar denúncias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all min-w-[250px] dark:text-white"
            />
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm font-bold outline-none dark:text-white"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Pendente">Pendentes</option>
            <option value="Em Análise">Em Análise</option>
            <option value="Resolvido">Resolvidos</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(report => (
          <div key={report.id} onClick={() => setSelectedReport(report)} className="bg-white dark:bg-neutral-900 rounded-[32px] p-8 border border-neutral-100 dark:border-neutral-800 hover:shadow-md transition-all cursor-pointer relative group">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${
              report.status === 'Pendente' ? 'bg-red-500' :
              report.status === 'Em Análise' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col gap-1">
                 <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border w-fit ${getStatusColor(report.status)}`}>
                   {report.status}
                 </span>
                 {report.protocolo && (
                   <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                     Protocolo: {report.protocolo}
                   </span>
                 )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 {report.status !== 'Resolvido' && (
                    <button onClick={(e) => { e.stopPropagation(); updateStatus(report.id, 'Resolvido'); }} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20" title="Marcar como Resolvido"><CheckCircle2 size={16} /></button>
                 )}
                 {report.status === 'Pendente' && (
                    <button onClick={(e) => { e.stopPropagation(); updateStatus(report.id, 'Em Análise'); }} className="p-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20" title="Em Análise"><AlertTriangle size={16} /></button>
                 )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1 flex items-center gap-1.5"><MapPin size={12}/> Localização</p>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-snug">{report.location}</h3>
              </div>
              
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1 flex items-center gap-1.5"><FileText size={12}/> Descrição</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">{report.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                  <Calendar size={14} />
                  {new Date(report.dateReported).toLocaleDateString('pt-BR')}
                </div>
                {report.photoUrl && (
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">
                    <Camera size={14} /> Foto
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedReport(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800"
            >
              <div className="p-8 pb-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Detalhes da Denúncia</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Protocolo: {selectedReport.protocolo || selectedReport.id}</p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500 dark:text-neutral-400">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">Status</p>
                    <span className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Localização</p>
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <p className="font-bold text-neutral-900 dark:text-white">{selectedReport.location}</p>
                    </div>
                  </div>

                  {selectedReport.referencePoint && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Ponto de Referência</p>
                      <p className="font-medium text-neutral-900 dark:text-white">{selectedReport.referencePoint}</p>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-1">Descrição da Ocorrência</p>
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selectedReport.description}</p>
                    </div>
                  </div>

                  <div className="md:col-span-2 border-t border-neutral-100 dark:border-neutral-800 pt-6">
                     <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-4">Dados do Denunciante</p>
                     {selectedReport.isAnonymous ? (
                        <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-xl flex items-center gap-3">
                           <User size={20} className="text-neutral-400" />
                           <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Denúncia Anônima</span>
                        </div>
                     ) : (
                        <div className="grid grid-cols-2 gap-4 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                           <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 mb-1">Nome</p>
                              <p className="font-bold text-emerald-900 dark:text-emerald-300">{selectedReport.reporterName}</p>
                           </div>
                           {selectedReport.reporterContact && (
                              <div>
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 mb-1">Contato</p>
                                 <p className="font-bold text-emerald-900 dark:text-emerald-300">{selectedReport.reporterContact}</p>
                              </div>
                           )}
                        </div>
                     )}
                  </div>

                  {selectedReport.photoUrl && (
                     <div className="md:col-span-2 border-t border-neutral-100 dark:border-neutral-800 pt-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-4 flex items-center gap-2">
                           <ImageIcon size={14} /> Evidência Fotográfica
                        </p>
                        <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center min-h-[200px]">
                           {/* Como estamos mockando, podemos mostrar um placeholder se a URL não for real */}
                           {selectedReport.photoUrl.startsWith('http') ? (
                              <img src={selectedReport.photoUrl} alt="Evidência" className="w-full h-auto object-cover max-h-[400px]" />
                           ) : (
                              <div className="text-center text-neutral-400 p-8">
                                 <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                                 <p className="text-sm font-medium">Imagem anexada</p>
                                 <p className="text-xs">{selectedReport.photoUrl}</p>
                              </div>
                           )}
                        </div>
                     </div>
                  )}
                </div>
              </div>

              <div className="p-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
                <div className="flex gap-2">
                  {selectedReport.status !== 'Resolvido' && (
                     <button onClick={() => updateStatus(selectedReport.id, 'Resolvido')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20">
                        Marcar como Resolvido
                     </button>
                  )}
                  {selectedReport.status === 'Pendente' && (
                     <button onClick={() => updateStatus(selectedReport.id, 'Em Análise')} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-500/20">
                        Iniciar Análise
                     </button>
                  )}
                  {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') && (
                     <button onClick={() => deleteReport(selectedReport.id)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-red-500/20">
                        Excluir
                     </button>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="px-6 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-xl font-bold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
