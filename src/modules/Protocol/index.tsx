import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, Filter, CircleOff, Download, Edit2, Trash2, Eye, EyeOff, CheckCircle2, Clock, AlertCircle, X, Check, Printer } from 'lucide-react';
import { Protocol } from '../../types';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';

export const getAttachmentsArray = (attachment?: string): { name: string, url: string, role?: string }[] => {
  if (!attachment) return [];
  if (attachment.startsWith('[')) {
    try {
      const parsed = JSON.parse(attachment);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          if (typeof item === 'string') {
            const decoded = decodeURIComponent(item);
            const parts = decoded.split('/');
            const fullName = parts[parts.length - 1];
            const cleanName = fullName.replace(/^protocol-\d+-/, '');
            return { name: cleanName, url: item };
          }
          return item;
        });
      }
    } catch (e) {
      console.error("Error parsing attachments:", e);
    }
  }
  const decoded = decodeURIComponent(attachment);
  const parts = decoded.split('/');
  const fullName = parts[parts.length - 1];
  const cleanName = fullName.replace(/^protocol-\d+-/, '');
  return [{ name: cleanName, url: attachment }];
};

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
  const [viewingProtocol, setViewingProtocol] = React.useState<Protocol | null>(null);
  const [deletingProtocolId, setDeletingProtocolId] = React.useState<string | null>(null);

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

  const handleReceive = async (protocol: Protocol) => {
    if (protocol.status === 'Recebido') return;

    const newHistory = [...(protocol.history || []), {
      date: new Date().toISOString(),
      user: currentUser?.name || currentUser?.email || protocol.to,
      action: 'Alteração de Status',
      previousStatus: protocol.status,
      newStatus: 'Recebido'
    }];

    const { error } = await supabase.from('protocols').update({
      status: 'Recebido',
      history: newHistory
    }).eq('id', protocol.id);

    if (error) {
      showToast('Erro ao receber protocolo: ' + error.message, 'error');
    } else {
      showToast('Protocolo recebido com sucesso!', 'success');
      loadData();
    }
  };

  const handleDelete = (id: string) => {
    setDeletingProtocolId(id);
  };

  const filtered = protocols.filter(p => {
    const matchDept = filterDept === 'Todas' || p.from === filterDept || p.to === filterDept;
    const matchStatus = filterStatus === 'Todos' || p.status === filterStatus;
    const matchType = filterType === 'Todos' || p.type === filterType;
    const matchSearch = p.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.from.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.to.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.id.includes(searchQuery);
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
                  <option value="Administração e Finanças">Administração e Finanças</option>
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
              <option value="Compra Direta">Compra Direta</option>
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

      {/* Quick Filters Row */}
      {(() => {
        const totalCount = protocols.length;
        const pendingCount = protocols.filter(p => p.status === 'Pendente').length;
        const receivedCount = protocols.filter(p => p.status === 'Recebido').length;
        const analysisCount = protocols.filter(p => p.status === 'Em Análise').length;
        const completedCount = protocols.filter(p => p.status === 'Concluído').length;

        const statusFilters = [
          { label: 'Todos os Processos', status: 'Todos', count: totalCount, color: 'neutral', bgClass: 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-300 border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm' },
          { label: 'Pendentes', status: 'Pendente', count: pendingCount, color: 'amber', bgClass: 'bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 border-neutral-100 dark:border-neutral-800 hover:border-amber-200 dark:hover:border-amber-900 shadow-sm' },
          { label: 'Recebidos', status: 'Recebido', count: receivedCount, color: 'sky', bgClass: 'bg-white dark:bg-neutral-900 text-sky-600 dark:text-sky-400 border-neutral-100 dark:border-neutral-800 hover:border-sky-200 dark:hover:border-sky-900 shadow-sm' },
          { label: 'Em Análise', status: 'Em Análise', count: analysisCount, color: 'indigo', bgClass: 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 border-neutral-100 dark:border-neutral-800 hover:border-indigo-200 dark:hover:border-indigo-900 shadow-sm' },
          { label: 'Concluídos', status: 'Concluído', count: completedCount, color: 'emerald', bgClass: 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 border-neutral-100 dark:border-neutral-800 hover:border-emerald-200 dark:hover:border-emerald-900 shadow-sm' },
        ];

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {statusFilters.map(f => {
              const isActive = filterStatus === f.status;
              
              let activeRing = "";
              if (isActive) {
                if (f.color === 'neutral') activeRing = "ring-2 ring-neutral-400 dark:ring-neutral-500 bg-neutral-50 dark:bg-neutral-850/80 border-transparent shadow-md";
                else if (f.color === 'amber') activeRing = "ring-2 ring-amber-400 dark:ring-amber-500 bg-amber-50 dark:bg-amber-500/10 border-transparent shadow-md shadow-amber-500/10";
                else if (f.color === 'sky') activeRing = "ring-2 ring-sky-400 dark:ring-sky-500 bg-sky-50 dark:bg-sky-500/10 border-transparent shadow-md shadow-sky-500/10";
                else if (f.color === 'indigo') activeRing = "ring-2 ring-indigo-400 dark:ring-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-transparent shadow-md shadow-indigo-500/10";
                else if (f.color === 'emerald') activeRing = "ring-2 ring-emerald-400 dark:ring-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-transparent shadow-md shadow-emerald-500/10";
              }

              return (
                <button
                  key={f.status}
                  type="button"
                  onClick={() => setFilterStatus(f.status)}
                  className={`p-6 rounded-3xl border text-left transition-all ${f.bgClass} ${activeRing} flex flex-col justify-between h-[110px] hover:scale-[1.02] hover:shadow-md active:scale-98`}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{f.label}</span>
                  <span className="text-3xl font-black italic tracking-tight leading-none mt-2">{f.count}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {isLoading ? (
        <div className="py-10 text-center text-sm font-medium text-neutral-500 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-neutral-200 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin mb-4"></div>
          Carregando protocolos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm font-medium text-neutral-500">
          Nenhum protocolo encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((p, i) => (
            <div 
              key={p.id}
              onClick={() => setViewingProtocol(p)}
              className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer relative"
            >
              {/* Card Header: Type/ID on Left, Status on Right */}
              <div className="flex justify-between items-start mb-4 gap-2">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-1.5 rounded-xl border border-neutral-100 dark:border-neutral-700">
                  <span className="font-mono text-neutral-900 dark:text-neutral-100 text-sm font-medium">
                    {p.type.toUpperCase()}&nbsp;<span className="font-black text-emerald-600 dark:text-emerald-400">#{p.id.slice(-3)}</span>
                  </span>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest leading-none ${
                  p.status === 'Concluído' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                  p.status === 'Em Análise' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 
                  p.status === 'Recebido' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 
                  'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                }`}>
                  {p.status}
                </div>
              </div>

              {/* Card Body: Subject (title), and Departments Routing */}
              <div className="flex-1 space-y-3">
                <h4 className="font-bold text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-relaxed" title={p.subject}>
                  {p.subject}
                </h4>
                <div className="bg-neutral-50 dark:bg-neutral-800/30 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800/40 text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400 dark:text-neutral-500 w-10 shrink-0">DE:</span>
                    <span className="text-neutral-800 dark:text-neutral-300 truncate" title={p.from}>{p.from}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400 dark:text-neutral-500 w-10 shrink-0">PARA:</span>
                    <span className="text-neutral-800 dark:text-neutral-300 truncate" title={p.to}>{p.to}</span>
                  </div>
                </div>
                
                {/* Date indicator */}
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest pl-1">
                  Criado em: {new Date(p.date).toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Card Footer: Attachment on Left, Actions on Right */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0">
                  {p.attachment ? (
                    (() => {
                      const atts = getAttachmentsArray(p.attachment);
                      if (atts.length > 1) {
                        return (
                          <div className="text-sky-600 dark:text-sky-400 flex items-center gap-1.5 w-full select-none">
                            <FileText size={16} className="shrink-0" />
                            <span className="text-xs font-bold truncate">Anexos ({atts.length})</span>
                          </div>
                        );
                      }
                      return (
                        <a 
                          href={atts[0]?.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          onClick={(e) => e.stopPropagation()} 
                          className="text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-1.5 transition-colors group/link w-full"
                        >
                          <FileText size={16} className="shrink-0" />
                          <span className="text-xs font-bold truncate group-hover/link:underline">Ver Anexo</span>
                        </a>
                      );
                    })()
                  ) : (
                    <div className="text-neutral-400 dark:text-neutral-600 flex items-center gap-1.5 text-xs font-bold select-none">
                      <EyeOff size={16} className="shrink-0" />
                      <span className="truncate">Sem Anexo</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {p.status !== 'Recebido' && p.status !== 'Concluído' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleReceive(p); }}
                      className="p-2 rounded-xl text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                      title="Marcar como Recebido"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewingHistoryProtocol(p); }}
                    className="p-2 rounded-xl text-neutral-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
                    title="Ver Histórico"
                  >
                    <Clock size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingProtocol(p); }}
                    className="p-2 rounded-xl text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                    className="p-2 rounded-xl text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
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
        {viewingProtocol && (
          <ViewProtocolModal 
            protocol={viewingProtocol}
            onClose={() => setViewingProtocol(null)}
          />
        )}
        {deletingProtocolId && (
          <DeleteConfirmationModal 
            onClose={() => setDeletingProtocolId(null)}
            onConfirm={async () => {
              const id = deletingProtocolId;
              setDeletingProtocolId(null);
              const { error } = await supabase.from('protocols').delete().eq('id', id);
              if (error) {
                showToast(`Erro ao excluir: ${error.message}`, "error");
              } else {
                setProtocols(protocols.filter(p => p.id !== id));
                showToast("Protocolo excluído com sucesso!", "success");
              }
            }}
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
  title = "Novo Processo Digital (SMAF)",
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

  const [formData, setFormData] = React.useState({
    subject: initialData ? initialData.subject : '',
    from: initialData ? initialData.from : defaultFrom,
    to: initialData ? initialData.to : 'Administração e Finanças',
    status: initialData ? initialData.status : 'Pendente',
  });

  // Multiselect Types state
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(
    initialData?.type ? (initialData.type.split(', ') as any[]) : ['Memorando']
  );

  const CD_SLOTS_CONFIG = [
    { label: "Nota Fiscal", role: "Nota Fiscal", required: true },
    { label: "Certidão Federal", role: "Certidão Federal", required: true },
    { label: "Certidão Trabalhista", role: "Certidão Trabalhista", required: true },
    { label: "Certidão Estadual", role: "Certidão Estadual", required: true },
    { label: "Certidão Municipal", role: "Certidão Municipal", required: true },
    { label: "Certidão FGTS", role: "Certidão FGTS", required: false },
    { label: "Orçamento 1", role: "Orçamento 1", required: true },
    { label: "Orçamento 2", role: "Orçamento 2", required: true },
    { label: "Orçamento 3", role: "Orçamento 3", required: true },
  ];

  // Compra Direta slots state
  const [compraDiretaSlots, setCompraDiretaSlots] = React.useState<Record<string, { file: File | null, existing: { name: string, url: string, role?: string } | null }>>(() => {
    const slots: Record<string, { file: File | null, existing: { name: string, url: string, role?: string } | null }> = {
      "Nota Fiscal": { file: null, existing: null },
      "Certidão Federal": { file: null, existing: null },
      "Certidão Trabalhista": { file: null, existing: null },
      "Certidão Estadual": { file: null, existing: null },
      "Certidão Municipal": { file: null, existing: null },
      "Certidão FGTS": { file: null, existing: null },
      "Orçamento 1": { file: null, existing: null },
      "Orçamento 2": { file: null, existing: null },
      "Orçamento 3": { file: null, existing: null },
    };

    if (initialData && initialData.attachment) {
      const atts = getAttachmentsArray(initialData.attachment);
      atts.forEach(att => {
        if (att.role && slots[att.role]) {
          slots[att.role].existing = { name: att.name, url: att.url, role: att.role };
        }
      });
    }

    return slots;
  });

  // New selected files to upload
  const [files, setFiles] = React.useState<File[]>([]);
  // Existing attachments (excluding the ones with roles if editing a Compra Direta)
  const [existingAttachments, setExistingAttachments] = React.useState<{ name: string, url: string, role?: string }[]>(() => {
    if (!initialData?.attachment) return [];
    const atts = getAttachmentsArray(initialData.attachment);
    const hasCompraDireta = initialData.type?.includes('Compra Direta');
    if (hasCompraDireta) {
      const knownRoles = ["Nota Fiscal", "Certidão Federal", "Certidão Trabalhista", "Certidão Estadual", "Certidão Municipal", "Certidão FGTS", "Orçamento 1", "Orçamento 2", "Orçamento 3"];
      return atts.filter(att => !att.role || !knownRoles.includes(att.role));
    }
    return atts;
  });

  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      } else {
        showToast("Pelo menos um tipo de documento deve ser selecionado.", "warning");
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const isCompraDireta = selectedTypes.includes('Compra Direta');

  const handleSubmit = async () => {
    // 1. Validation
    if (isCompraDireta) {
      const missingRequired = CD_SLOTS_CONFIG.filter(slot => slot.required && !compraDiretaSlots[slot.role].file && !compraDiretaSlots[slot.role].existing);
      if (missingRequired.length > 0) {
        const list = missingRequired.map(s => s.label).join(", ");
        showToast(`Documentação incompleta para Compra Direta. Falta anexar: ${list}.`, 'error');
        return;
      }
    } else {
      if (files.length === 0 && existingAttachments.length === 0) {
        showToast('É obrigatório anexar pelo menos um documento digitalizado.', 'error');
        return;
      }
    }
    
    setIsUploading(true);
    
    try {
      // 2. Upload Compra Direta slots if needed
      const uploadedSlots: { name: string, url: string, role: string }[] = [];
      
      if (isCompraDireta) {
        const slotUploadPromises = Object.entries(compraDiretaSlots).map(async ([role, slotVal]) => {
          const slot = slotVal as { file: File | null, existing: { name: string, url: string, role?: string } | null };
          if (slot.file) {
            const safeName = slot.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
            const roleSlug = role.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const filename = `protocol-${Date.now()}-${roleSlug}-${safeName}`;
            const { error: uploadError } = await supabase.storage.from('protocolos').upload(filename, slot.file);
            
            if (uploadError) {
              throw new Error(`Erro ao enviar ${role}: ` + slot.file.name);
            }
            
            const { data: publicUrlData } = supabase.storage.from('protocolos').getPublicUrl(filename);
            return { name: slot.file.name, url: publicUrlData.publicUrl, role };
          } else if (slot.existing) {
            return { ...slot.existing, role };
          }
          return null;
        });

        const slotResults = await Promise.all(slotUploadPromises);
        slotResults.forEach(r => {
          if (r) uploadedSlots.push(r);
        });
      }

      // 3. Upload new generic files
      const uploadPromises = files.map(async (f) => {
        const safeName = f.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `protocol-${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('protocolos').upload(filename, f);
        
        if (uploadError) {
          throw new Error('Erro ao enviar arquivo: ' + f.name);
        }
        
        const { data: publicUrlData } = supabase.storage.from('protocolos').getPublicUrl(filename);
        return { name: f.name, url: publicUrlData.publicUrl };
      });
      
      const uploadedGeneric = await Promise.all(uploadPromises);
      
      // 4. Combine everything
      const allAttachments = [...uploadedSlots, ...existingAttachments, ...uploadedGeneric];
      const attachmentValue = JSON.stringify(allAttachments);

      let newHistory = initialData?.history || [];
      
      if (initialData) {
        if (initialData.status !== formData.status) {
          newHistory = [...newHistory, {
            date: new Date().toISOString(),
            user: currentUser?.name || currentUser?.email || formData.to,
            action: 'Alteração de Status',
            previousStatus: initialData.status,
            newStatus: formData.status
          }];
        }
      } else {
        newHistory = [{
          date: new Date().toISOString(),
          user: currentUser?.name || currentUser?.email || formData.from,
          action: 'Criação',
          newStatus: formData.status
        }];
      }

      const payload = {
        subject: formData.subject,
        type: selectedTypes.join(', '), // Comma separated types
        from: formData.from,
        to: formData.to,
        status: formData.status,
        attachment: attachmentValue, // JSON stringified array of attachments
        history: newHistory
      };

      if (initialData) {
        const { error } = await supabase.from('protocols').update(payload).eq('id', initialData.id);
        if (error) {
          showToast('Erro ao atualizar: ' + error.message, 'error');
        } else {
          showToast('Processo atualizado com sucesso!', 'success');
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
          showToast('Erro ao criar processo: ' + error.message, 'error');
        } else {
          showToast('Processo cadastrado com sucesso!', 'success');
          onSuccess();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar o processo.', 'error');
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
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-6 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">
              {initialData ? 'Editar Processo' : title}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Crie processos reunindo múltiplos documentos (memorandos, ofícios, pedidos) e arquivos anexados.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
            <CircleOff size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
          {/* Document Types Checkbox Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Tipos de Documentos Inclusos (Selecione vários se desejar)</label>
            <div className="flex flex-wrap gap-2">
              {['Memorando', 'Ofício', 'Pedido', 'Compra Direta'].map(type => {
                const isSelected = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                      isSelected 
                        ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-950 shadow-md' 
                        : 'bg-neutral-50 border-neutral-100 dark:bg-neutral-850 dark:border-neutral-800 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                      isSelected 
                        ? 'border-emerald-400 bg-emerald-500 text-white' 
                        : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                    }`}>
                      {isSelected && <Check size={10} strokeWidth={4} />}
                    </div>
                    {type}
                  </button>
                );
              })}
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
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Assunto / Título do Processo</label>
            <input 
              type="text" 
              placeholder="Ex: Aquisição de Insumos Hospitalares e Pedido de Equipamentos"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 dark:focus:border-white outline-none transition-all dark:text-neutral-100"
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
            />
          </div>

          {isCompraDireta && (
            <div className="space-y-4 p-6 bg-neutral-50 dark:bg-neutral-850 rounded-3xl border border-neutral-100 dark:border-neutral-800/80 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between border-b border-neutral-150 dark:border-neutral-700/60 pb-3 mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                  Documentação Obrigatória - Compra Direta
                </h4>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-500/20">
                  8 Obrigatórios
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {CD_SLOTS_CONFIG.map((slot) => {
                  const value = compraDiretaSlots[slot.role];
                  const hasFile = value.file || value.existing;
                  const fileName = value.file ? value.file.name : value.existing ? value.existing.name : '';
                  const isNew = !!value.file;

                  return (
                    <div 
                      key={slot.role}
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between h-[110px] relative group ${
                        hasFile 
                          ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-750 shadow-sm' 
                          : 'bg-neutral-100/30 dark:bg-neutral-900/10 border-dashed border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-wide text-neutral-700 dark:text-neutral-300 truncate" title={slot.label}>
                            {slot.label}
                          </p>
                          <p className="text-[8px] font-bold uppercase mt-0.5">
                            {slot.required ? (
                              <span className="text-amber-500 dark:text-amber-400">Obrigatório</span>
                            ) : (
                              <span className="text-neutral-400 dark:text-neutral-500">Opcional</span>
                            )}
                          </p>
                        </div>

                        {hasFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompraDiretaSlots(prev => ({
                                ...prev,
                                [slot.role]: { file: null, existing: null }
                              }));
                            }}
                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-rose-500 rounded-lg transition-colors shrink-0"
                            title="Remover arquivo"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      <div className="mt-2 min-w-0">
                        {hasFile ? (
                          <div className="flex items-center gap-1.5 min-w-0 bg-neutral-50 dark:bg-neutral-850 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800">
                            <FileText size={14} className={isNew ? "text-emerald-500" : "text-sky-500"} />
                            <span className="text-[9px] font-bold text-neutral-600 dark:text-neutral-300 truncate flex-1" title={fileName}>
                              {fileName}
                            </span>
                            {isNew && (
                              <span className="text-[7px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded shrink-0">
                                Novo
                              </span>
                            )}
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-95">
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setCompraDiretaSlots(prev => ({
                                    ...prev,
                                    [slot.role]: { file, existing: null }
                                  }));
                                }
                              }}
                            />
                            <Download size={12} className="shrink-0" />
                            Anexar
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files List Display */}
          {(existingAttachments.length > 0 || files.length > 0) && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">
                {isCompraDireta ? "Outros Anexos Adicionais" : "Documentos Anexados"} ({existingAttachments.length + files.length})
              </label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {/* Existing attachments */}
                {existingAttachments.map((att, idx) => (
                  <div key={`existing-${idx}`} className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-100 dark:border-neutral-800/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={16} className="text-sky-500 shrink-0" />
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate" title={att.name}>{att.name}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setExistingAttachments(existingAttachments.filter((_, i) => i !== idx))}
                      className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-rose-500 rounded-xl transition-colors"
                      title="Remover arquivo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                
                {/* New files to upload */}
                {files.map((f, idx) => (
                  <div key={`new-${idx}`} className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-100 dark:border-neutral-800/60 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={16} className="text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate" title={f.name}>{f.name}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Novo</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                      className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-rose-500 rounded-xl transition-colors"
                      title="Remover arquivo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dotted Upload Dropzone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="p-6 border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-3xl text-center space-y-2 group transition-all cursor-pointer"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple
              onChange={e => {
                if (e.target.files) {
                  const selected = Array.from(e.target.files);
                  setFiles(prev => [...prev, ...selected]);
                }
              }}
            />
            <div className="w-10 h-10 bg-neutral-50 dark:bg-neutral-800 rounded-xl flex items-center justify-center mx-auto text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-neutral-900 transition-all">
              <Download size={18} />
            </div>
            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase">
              {isCompraDireta ? "Outros Anexos Gerais (Opcional)" : "Selecionar Arquivos do Processo"}
            </p>
            <p className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest">
              Suporta múltiplos arquivos assinados (PDF, JPG, PNG)
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button 
            onClick={handleSubmit}
            disabled={!formData.subject || isUploading}
            className="w-full bg-neutral-900 dark:bg-white text-emerald-400 dark:text-emerald-600 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 shadow-xl shadow-neutral-900/20 dark:shadow-black/40"
          >
            {isUploading ? 'Enviando Arquivos...' : (initialData ? 'Salvar Processo' : 'Protocolar Processo')}
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

const getRoleBadgeStyle = (role?: string) => {
  if (!role) return "";
  if (role === "Nota Fiscal") {
    return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20";
  }
  if (role.startsWith("Certidão")) {
    return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20";
  }
  if (role.startsWith("Orçamento")) {
    return "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20";
  }
  return "bg-neutral-50 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-800";
};

export const ViewProtocolModal = ({ protocol, onClose }: { protocol: Protocol, onClose: () => void }) => {
  const handlePrintReceipt = () => {
    const atts = getAttachmentsArray(protocol.attachment);
    const dateFormatted = new Date(protocol.date).toLocaleDateString('pt-BR');
    const emissionDate = new Date().toLocaleString('pt-BR');
    
    // Generate a secure mock validation hash
    const fakeHash = Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase();
    const verificationHash = `${protocol.id.slice(0, 4)}-${fakeHash.slice(0, 8)}-${fakeHash.slice(8, 16)}-${fakeHash.slice(16, 24)}`;

    const newWindow = window.open('', '_blank');
    if (!newWindow) return;

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo de Protocolo #${protocol.id}</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            color: #171717;
            background-color: #ffffff;
            font-size: 13px;
            line-height: 1.5;
          }
          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e5e5e5;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #171717;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin: 5px 0;
          }
          .header p {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #737373;
            letter-spacing: 0.2em;
            margin: 0;
          }
          .title-area {
            text-align: center;
            margin-bottom: 30px;
          }
          .title-area h2 {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #0f172a;
            margin: 0 0 5px 0;
          }
          .title-area span {
            font-family: monospace;
            font-size: 12px;
            font-weight: bold;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 4px 10px;
            border-radius: 8px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .grid-full {
            grid-column: 1 / -1;
          }
          .field-block {
            background-color: #fafafa;
            border: 1px solid #f0f0f0;
            padding: 15px;
            border-radius: 16px;
          }
          .field-label {
            font-size: 8px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #737373;
            margin-bottom: 4px;
          }
          .field-value {
            font-size: 12px;
            font-weight: 800;
            color: #171717;
          }
          .attachments-title {
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #737373;
            margin-bottom: 10px;
            border-bottom: 1px solid #e5e5e5;
            padding-bottom: 5px;
          }
          .attachment-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #f5f5f5;
          }
          .attachment-name {
            font-weight: bold;
            font-size: 11px;
            word-break: break-all;
          }
          .attachment-role {
            font-size: 8px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            background-color: #f1f5f9;
            color: #475569;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            white-space: nowrap;
          }
          .footer-signature {
            margin-top: 40px;
            border-top: 1px solid #e5e5e5;
            padding-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .verification-area {
            font-size: 9px;
            color: #737373;
          }
          .verification-hash {
            font-family: monospace;
            font-weight: bold;
            color: #171717;
          }
          .qr-code {
            width: 80px;
            height: 80px;
          }
          @media print {
            body {
              padding: 0;
            }
            .receipt-container {
              border: none;
              box-shadow: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <p>Estado de Mato Grosso</p>
            <h1>Prefeitura Municipal de Cláudia</h1>
            <p>Secretaria Municipal de Administração e Finanças - SMAF</p>
          </div>
          
          <div class="title-area">
            <h2>Comprovante de Protocolo Digital</h2>
            <span>PROCESSO #${protocol.id}</span>
          </div>

          <div class="grid">
            <div class="field-block">
              <div class="field-label">Tipo de Processo</div>
              <div class="field-value">${protocol.type}</div>
            </div>
            <div class="field-block">
              <div class="field-label">Data de Registro</div>
              <div class="field-value">${dateFormatted}</div>
            </div>
            <div class="field-block">
              <div class="field-label">Secretaria Origem (Remetente)</div>
              <div class="field-value">${protocol.from}</div>
            </div>
            <div class="field-block">
              <div class="field-label">Secretaria Destino</div>
              <div class="field-value">${protocol.to}</div>
            </div>
            <div class="field-block grid-full">
              <div class="field-label">Assunto / Descrição</div>
              <div class="field-value" style="font-size: 13px; line-height: 1.6;">${protocol.subject}</div>
            </div>
          </div>

          <div class="attachments-title">Documentação Digitalizada Anexa (${atts.length})</div>
          <div style="margin-bottom: 30px;">
            ${atts.length === 0 ? '<div style="color: #737373; font-style: italic;">Nenhum documento anexado.</div>' : 
              atts.map(att => `
                <div class="attachment-row">
                  <div class="attachment-name">${att.name}</div>
                  ${att.role ? `<div class="attachment-role">${att.role}</div>` : '<div class="attachment-role" style="background-color: #fafafa; border-color: #f0f0f0;">Geral</div>'}
                </div>
              `).join('')
            }
          </div>

          <div class="footer-signature">
            <div class="verification-area">
              <p style="margin: 0 0 5px 0;"><strong>EMISSÃO DIGITAL:</strong> ${emissionDate}</p>
              <p style="margin: 0 0 5px 0;">Para verificar a autenticidade deste protocolo, acesse o portal da prefeitura.</p>
              <p style="margin: 0;">CHAVE DIGITAL DE VERIFICAÇÃO:</p>
              <p class="verification-hash" style="margin: 2px 0 0 0;">${verificationHash}</p>
            </div>
            <div class="qr-code">
              <svg viewBox="0 0 100 100" width="80" height="80" style="background: #ffffff; padding: 5px; border: 1px solid #e5e5e5; border-radius: 8px;">
                <path d="M0,0 h30 v10 h-20 v20 h-10 z" fill="#0f172a" />
                <path d="M10,10 h10 v10 h-10 z" fill="#0f172a" />
                <path d="M70,0 h30 v30 h-10 v-20 h-20 z" fill="#0f172a" />
                <path d="M80,10 h10 v10 h-10 z" fill="#0f172a" />
                <path d="M0,70 h10 v20 h20 v10 h-30 z" fill="#0f172a" />
                <path d="M10,80 h10 v10 h-10 z" fill="#0f172a" />
                <path d="M70,100 h30 v-30 h-10 v20 h-20 z" fill="#0f172a" />
                <path d="M80,80 h10 v10 h-10 z" fill="#0f172a" />
                <path d="M35,35 h30 v30 h-30 z M45,45 h10 v10 h-10 z" fill="#0f172a" />
                <path d="M15,40 h10 v10 h-10 z M40,15 h10 v10 h-10 z M40,75 h10 v10 h-10 z M75,40 h10 v10 h-10 z" fill="#0f172a" />
              </svg>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    
    newWindow.document.close();
    newWindow.focus();
    setTimeout(() => {
      newWindow.print();
    }, 500);
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
        className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[40px] p-10 shadow-2xl space-y-6 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Detalhes do Protocolo</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">#{protocol.id}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handlePrintReceipt}
              className="px-4 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all border border-neutral-200 dark:border-neutral-700"
              title="Emitir Comprovante de Protocolo"
            >
              <Printer size={16} />
              Recibo
            </button>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
              <CircleOff size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
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

          {/* Histórico de Tramitação */}
          <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Histórico de Tramitação</span>
            
            {!protocol.history || protocol.history.length === 0 ? (
              <p className="text-xs text-neutral-500 font-medium pl-1">Nenhuma tramitação registrada.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-150 dark:before:bg-neutral-800">
                {protocol.history.map((entry, idx) => {
                  let iconColor = "bg-sky-500 text-white";
                  let actionText = entry.action;
                  
                  if (entry.newStatus === 'Concluído') {
                    iconColor = "bg-emerald-500 text-white";
                  } else if (entry.newStatus === 'Recebido') {
                    iconColor = "bg-sky-500 text-white";
                  } else if (entry.newStatus === 'Em Análise') {
                    iconColor = "bg-amber-500 text-white";
                  } else if (entry.action === 'Criação') {
                    iconColor = "bg-blue-500 text-white";
                    actionText = "Abertura do Processo";
                  }

                  return (
                    <div key={idx} className="relative flex gap-4 text-left animate-in slide-in-from-bottom-2 duration-300">
                      <div className={`absolute left-[-20px] top-[18px] w-[10px] h-[10px] rounded-full border-2 border-white dark:border-neutral-900 ${iconColor.replace('text-white', '')} ring-4 ring-neutral-50 dark:ring-neutral-850 z-10`} />
                      <div className="flex-1 bg-neutral-50 dark:bg-neutral-850/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800/60">
                        <div className="flex justify-between items-start gap-2 flex-wrap mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                            {actionText}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-400">
                            {new Date(entry.date).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        
                        <div className="text-xs font-bold text-neutral-600 dark:text-neutral-450">
                          Status Resultante: <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ml-1 ${
                            entry.newStatus === 'Concluído' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                            entry.newStatus === 'Em Análise' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 
                            entry.newStatus === 'Recebido' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 
                            'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                          }`}>
                            {entry.newStatus}
                          </span>
                        </div>

                        <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mt-2">
                          Autor: {entry.user}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Anexos</span>
            {(() => {
              const atts = getAttachmentsArray(protocol.attachment);
              if (atts.length === 0) {
                return (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-700">
                    <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center shadow-sm">
                      <EyeOff size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">Sem anexo</p>
                      <p className="text-xs opacity-70">Este protocolo não possui arquivos digitalizados</p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {atts.map((att, idx) => (
                    <a 
                      key={idx}
                      href={att.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-4 p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors border border-sky-100 dark:border-sky-500/20 group"
                    >
                      <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center shadow-sm text-sky-500 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm truncate flex-1" title={att.name}>{att.name}</p>
                          {att.role && (
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${getRoleBadgeStyle(att.role)}`}>
                              {att.role}
                            </span>
                          )}
                        </div>
                        <p className="text-xs opacity-70 mt-0.5">Clique para visualizar ou baixar o arquivo</p>
                      </div>
                      <Download size={20} className="opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const DeleteConfirmationModal = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) => {
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
        className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[40px] p-8 shadow-2xl space-y-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <Trash2 size={28} className="animate-bounce" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic uppercase">
            Excluir Protocolo?
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider leading-relaxed">
            Tem certeza que deseja excluir este protocolo? Esta ação é irreversível e todos os anexos serão desvinculados.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all border border-neutral-150 dark:border-neutral-700"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20"
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
