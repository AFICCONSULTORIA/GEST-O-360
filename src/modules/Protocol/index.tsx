import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, Filter, CircleOff, Download, Edit2, Trash2, Eye, EyeOff, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Protocol } from '../../types';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';

export const ProtocolModule = ({ searchQuery = '', currentUser }: { searchQuery?: string, currentUser?: any }) => {
  const [protocols, setProtocols] = React.useState<Protocol[]>([]);
  const [institutions, setInstitutions] = React.useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filterDept, setFilterDept] = React.useState<string>('Todas');
  const [filterStatus, setFilterStatus] = React.useState<string>('Todos');
  const [filterType, setFilterType] = React.useState<string>('Todos');
  
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [editingProtocol, setEditingProtocol] = React.useState<Protocol | null>(null);
  const [viewingHistoryProtocol, setViewingHistoryProtocol] = React.useState<Protocol | null>(null);
  const [updatingStatusProtocol, setUpdatingStatusProtocol] = React.useState<Protocol | null>(null);
  const [viewingProtocol, setViewingProtocol] = React.useState<Protocol | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [protoRes, instRes] = await Promise.all([
      supabase.from('protocols').select('*').order('created_at', { ascending: false }),
      supabase.from('institutions').select('id, name').order('name')
    ]);
    
    if (protoRes.error) console.error("Erro ao carregar protocolos:", protoRes.error);
    else if (protoRes.data) setProtocols(protoRes.data as Protocol[]);
    
    if (instRes.error) console.error("Erro ao carregar instituições:", instRes.error);
    else if (instRes.data) setInstitutions(instRes.data);
    
    setIsLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este protocolo?")) {
      const { error } = await supabase.from('protocols').delete().eq('id', id);
      if (error) {
        showToast(`Erro ao excluir: ${error.message}`, "error");
      } else {
        setProtocols(protocols.filter(p => p.id !== id));
        showToast("Protocolo excluído com sucesso!", "success");
      }
    }
  };

  const filtered = protocols.filter(p => {
    const matchDept = filterDept === 'Todas' || p.from === filterDept;
    const matchStatus = filterStatus === 'Todos' || p.status === filterStatus;
    const matchType = filterType === 'Todos' || p.type === filterType;
    const matchSearch = p.subject.toLowerCase().includes(searchQuery.toLowerCase()) || p.from.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.includes(searchQuery);
    return matchDept && matchStatus && matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-6">
        <div>
          <h2 className="text-2xl font-bold italic tracking-tight uppercase dark:text-neutral-100">Protocolo Digital</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Envio e acompanhamento de documentos para a SMAF.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase ml-1">Secretaria</span>
            <select 
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-xs font-bold px-4 py-2 rounded-xl outline-none min-w-[140px] dark:text-neutral-100"
            >
              <option value="Todas">Todas</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.name}>{inst.name}</option>
              ))}
              {institutions.length === 0 && (
                <>
                  <option value="Saúde">Saúde</option>
                  <option value="Obras">Obras</option>
                  <option value="Educação">Educação</option>
                  <option value="Transportes">Transportes</option>
                  <option value="Cultura">Cultura</option>
                </>
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase ml-1">Status</span>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-xs font-bold px-4 py-2 rounded-xl outline-none min-w-[120px] dark:text-neutral-100"
            >
              <option value="Todos">Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Recebido">Recebido</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase ml-1">Tipo</span>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-xs font-bold px-4 py-2 rounded-xl outline-none min-w-[120px] dark:text-neutral-100"
            >
              <option value="Todos">Todos</option>
              <option value="Memorando">Memorando</option>
              <option value="Ofício">Ofício</option>
              <option value="Pedido">Pedido</option>
            </select>
          </div>

          <div className="lg:ml-4 flex items-end h-full pt-5">
            <button 
              onClick={() => setIsNewModalOpen(true)}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:shadow-xl transition-all whitespace-nowrap"
            >
              <FileText size={18} />
              Novo Documento
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="py-10 text-center text-sm font-medium text-neutral-500 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-neutral-200 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin mb-4"></div>
            Carregando protocolos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm font-medium text-neutral-500">
            Nenhum protocolo encontrado.
          </div>
        ) : filtered.map((p, i) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setViewingProtocol(p)}
            className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between group hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-6">
               <div className="w-12 h-12 bg-neutral-900 dark:bg-neutral-800 text-emerald-400 rounded-xl flex items-center justify-center font-black text-xs">
                 #{p.id.slice(-3)}
               </div>
               <div>
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded">
                      {p.type}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                      {new Date(p.date).toLocaleDateString('pt-BR')}
                    </span>
                    {p.attachment && (
                      <a href={p.attachment} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] font-bold text-sky-500 flex items-center gap-1 hover:underline">
                        <Download size={12} /> Anexo
                      </a>
                    )}
                 </div>
                 <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{p.subject}</h4>
                 <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest mt-1">
                   DE: {p.from} <span className="mx-2">→</span> PARA: {p.to}
                 </p>
               </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                p.status === 'Concluído' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                p.status === 'Em Análise' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 
                p.status === 'Recebido' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 
                'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
              }`}>
                {p.status}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setUpdatingStatusProtocol(p); }}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-neutral-400"
                  title="Dar Andamento"
                >
                  <CheckCircle2 size={18} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setViewingHistoryProtocol(p); }}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-neutral-400"
                  title="Ver Histórico"
                >
                  <Clock size={18} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingProtocol(p); }}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-neutral-400"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-neutral-400"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <AnimatePresence>
        {(isNewModalOpen || editingProtocol) && (
          <NewProtocolModal 
            onClose={() => { setIsNewModalOpen(false); setEditingProtocol(null); }}
            initialData={editingProtocol || undefined}
            institutions={institutions}
            currentUser={currentUser}
            onSuccess={() => {
              loadData();
              setIsNewModalOpen(false);
              setEditingProtocol(null);
            }}
          />
        )}
        {viewingHistoryProtocol && (
          <ProtocolHistoryModal 
            protocol={viewingHistoryProtocol}
            onClose={() => setViewingHistoryProtocol(null)}
          />
        )}
        {updatingStatusProtocol && (
          <UpdateStatusModal 
            protocol={updatingStatusProtocol}
            onClose={() => setUpdatingStatusProtocol(null)}
            onSuccess={() => {
              loadData();
              setUpdatingStatusProtocol(null);
            }}
          />
        )}
        {viewingProtocol && (
          <ViewProtocolModal 
            protocol={viewingProtocol}
            onClose={() => setViewingProtocol(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export const NewProtocolModal = ({ 
  onClose, 
  onSuccess,
  initialData,
  institutions = [],
  title = "Novo Protocolo SMAF",
  currentUser
}: { 
  onClose: () => void, 
  onSuccess: () => void,
  initialData?: Protocol,
  institutions?: {id: string, name: string}[],
  title?: string,
  currentUser?: any
}) => {
  const defaultFrom = currentUser?.institution_id 
    ? institutions.find(i => i.id === currentUser.institution_id)?.name || 'Saúde'
    : 'Saúde';

  const [formData, setFormData] = React.useState(initialData ? {
    subject: initialData.subject,
    type: initialData.type as 'Memorando' | 'Ofício' | 'Pedido',
    from: initialData.from,
    to: initialData.to,
    status: initialData.status,
  } : {
    subject: '',
    type: 'Memorando' as 'Memorando' | 'Ofício' | 'Pedido',
    from: defaultFrom,
    to: 'Administração e Finanças',
    status: 'Pendente',
  });

  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setIsUploading(true);
    let attachmentUrl = initialData?.attachment || null;

    if (file) {
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `protocol-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('protocolos').upload(filename, file);
      
      if (uploadError) {
        showToast('Erro ao enviar arquivo anexado: ' + uploadError.message, 'error');
        setIsUploading(false);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('protocolos').getPublicUrl(filename);
      attachmentUrl = publicUrlData.publicUrl;
    }

    let newHistory = initialData?.history || [];
    
    if (initialData) {
      if (initialData.status !== formData.status) {
        newHistory = [...newHistory, {
          date: new Date().toISOString(),
          user: formData.to, // Quem muda o status é quem recebeu (destino)
          action: 'Alteração de Status',
          previousStatus: initialData.status,
          newStatus: formData.status
        }];
      }
    } else {
      newHistory = [{
        date: new Date().toISOString(),
        user: formData.from, // Quem cria é o remetente
        action: 'Criação',
        newStatus: formData.status
      }];
    }

    const payload = {
      subject: formData.subject,
      type: formData.type,
      from: formData.from,
      to: formData.to,
      status: formData.status,
      attachment: attachmentUrl,
      history: newHistory
    };

    if (initialData) {
      const { error } = await supabase.from('protocols').update(payload).eq('id', initialData.id);
      if (error) {
        showToast('Erro ao atualizar: ' + error.message, 'error');
      } else {
        showToast('Protocolo atualizado!', 'success');
        onSuccess();
      }
    } else {
      const generatedId = `2024${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const { error } = await supabase.from('protocols').insert({
        id: generatedId,
        ...payload,
        date: new Date().toISOString().split('T')[0]
      });
      if (error) {
        showToast('Erro ao criar protocolo: ' + error.message, 'error');
      } else {
        showToast('Protocolo cadastrado!', 'success');
        onSuccess();
      }
    }
    setIsUploading(false);
  };

  return (
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
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">{initialData ? 'Editar Protocolo' : title}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Protocolo eletrônico de ofícios, memorandos e pedidos.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
            <CircleOff size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Tipo de Documento</label>
            <div className="flex gap-2">
              {['Memorando', 'Ofício', 'Pedido'].map(type => (
                <button
                  key={type}
                  onClick={() => setFormData({...formData, type: type as any})}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.type === type ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Secretaria Remetente</label>
              <select 
                value={formData.from}
                onChange={(e) => setFormData({...formData, from: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 outline-none transition-all dark:text-neutral-100"
              >
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.name}>{inst.name}</option>
                ))}
                {institutions.length === 0 && (
                  <>
                    <option value="Saúde">Secretaria de Saúde</option>
                    <option value="Obras">Secretaria de Obras</option>
                    <option value="Educação">Secretaria de Educação</option>
                    <option value="Transportes">Secretaria de Transportes</option>
                    <option value="Cultura">Secretaria de Cultura</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Secretaria Destino</label>
              <select 
                value={formData.to}
                onChange={(e) => setFormData({...formData, to: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 outline-none transition-all dark:text-neutral-100"
              >
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.name}>{inst.name}</option>
                ))}
                {institutions.length === 0 && (
                  <>
                    <option value="Administração e Finanças">Administração e Finanças</option>
                    <option value="Saúde">Secretaria de Saúde</option>
                    <option value="Obras">Secretaria de Obras</option>
                    <option value="Educação">Secretaria de Educação</option>
                    <option value="Transportes">Secretaria de Transportes</option>
                    <option value="Cultura">Secretaria de Cultura</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Assunto / Título</label>
            <input 
              type="text" 
              placeholder="Ex: Aquisição de Toners para Impressoras"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 dark:focus:border-white outline-none transition-all dark:text-neutral-100"
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
            />
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-3xl text-center space-y-2 group hover:border-neutral-900/40 dark:hover:border-white/40 transition-all cursor-pointer"
          >
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               onChange={e => e.target.files && setFile(e.target.files[0])}
             />
             <div className="w-10 h-10 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-center mx-auto text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-neutral-900 transition-all">
               <Download size={18} />
             </div>
             <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase">
               {file ? file.name : (initialData?.attachment ? "Substituir Anexo Existente" : "Anexar Documento Digitalizado")}
             </p>
             <p className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest">Apenas arquivos assinados (PDF, JPG, PNG)</p>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            onClick={handleSubmit}
            disabled={!formData.subject || isUploading}
            className="flex-1 bg-neutral-900 dark:bg-white text-emerald-400 dark:text-emerald-600 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 shadow-xl shadow-neutral-900/20 dark:shadow-black/40"
          >
            {isUploading ? 'Enviando...' : (initialData ? 'Atualizar Protocolo' : 'Protocolar Documento')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const ProtocolHistoryModal = ({ protocol, onClose }: { protocol: Protocol, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Histórico</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Protocolo #{protocol.id.slice(-3)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
            <CircleOff size={24} />
          </button>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {!protocol.history || protocol.history.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              Nenhum histórico registrado para este protocolo.
            </div>
          ) : (
            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 dark:before:via-neutral-800 before:to-transparent">
              {protocol.history.map((entry, index) => (
                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white dark:border-neutral-900 bg-emerald-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10">
                    <Clock size={10} />
                  </div>
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        {entry.action}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400">
                        {new Date(entry.date).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                      {entry.previousStatus && <span className="line-through text-neutral-400 mr-2">{entry.previousStatus}</span>}
                      <span className="font-bold">{entry.newStatus}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase">
                      Por: {entry.user}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const UpdateStatusModal = ({ protocol, onClose, onSuccess }: { protocol: Protocol, onClose: () => void, onSuccess: () => void }) => {
  const [status, setStatus] = React.useState(protocol.status);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    if (status === protocol.status) {
      onClose();
      return;
    }

    const newHistory = [...(protocol.history || []), {
      date: new Date().toISOString(),
      user: protocol.to,
      action: 'Alteração de Status',
      previousStatus: protocol.status,
      newStatus: status
    }];

    const { error } = await supabase.from('protocols').update({
      status,
      history: newHistory
    }).eq('id', protocol.id);

    setIsUpdating(false);

    if (error) {
      showToast('Erro ao atualizar status: ' + error.message, 'error');
    } else {
      showToast('Status atualizado com sucesso!', 'success');
      onSuccess();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Dar Andamento</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Protocolo #{protocol.id.slice(-3)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
            <CircleOff size={24} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Novo Status</label>
          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 outline-none transition-all dark:text-neutral-100 font-bold"
          >
            <option value="Pendente">Pendente</option>
            <option value="Recebido">Recebido</option>
            <option value="Em Análise">Em Análise</option>
            <option value="Concluído">Concluído</option>
          </select>
        </div>

        <button 
          onClick={handleUpdate}
          disabled={isUpdating || status === protocol.status}
          className="w-full bg-emerald-500 text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-xl shadow-emerald-500/20"
        >
          {isUpdating ? 'Atualizando...' : 'Confirmar'}
        </button>
      </motion.div>
    </motion.div>
  );
};

export const ViewProtocolModal = ({ protocol, onClose }: { protocol: Protocol, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Detalhes do Protocolo</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">#{protocol.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
            <CircleOff size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Tipo</span>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{protocol.type}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Data de Criação</span>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{new Date(protocol.date).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">De (Remetente)</span>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{protocol.from}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Para (Destino)</span>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{protocol.to}</p>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Assunto / Título</span>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">{protocol.subject}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status Atual</span>
            <div>
              <span className={`inline-flex px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                protocol.status === 'Concluído' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                protocol.status === 'Em Análise' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 
                protocol.status === 'Recebido' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 
                'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
              }`}>
                {protocol.status}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Anexo</span>
            {protocol.attachment ? (
              <a 
                href={protocol.attachment} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors border border-sky-100 dark:border-sky-500/20 group"
              >
                <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center shadow-sm text-sky-500">
                  <FileText size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Documento Anexado</p>
                  <p className="text-xs opacity-70">Clique para visualizar ou baixar o arquivo</p>
                </div>
                <Download size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-700">
                <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center shadow-sm">
                  <EyeOff size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Sem anexo</p>
                  <p className="text-xs opacity-70">Este protocolo não possui arquivos digitalizados</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
