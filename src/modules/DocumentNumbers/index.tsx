import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { 
  CheckItem, Protocol, PatrimonioItem, DocumentRecord, OrderItem,
  OrderType, OrderStatus, DocType, PNTPItem, DocumentTemplate, Contract,
  Institution, AdminUser, View, PNTPCategory, Evidence
} from '../../types';
import { showToast } from '../../components/ui/Toast';

// Destructure common icons to avoid changing code
const { 
  Plus, Search, Filter, Edit2, Trash2, Eye, FileText, ClipboardCheck, TrendingUp, TrendingDown, ChevronRight, ShieldAlert, Download, CircleOff, History, Info, CheckCircle2, AlertCircle, AlertTriangle, Package, LayoutDashboard, Calendar, FileBox, FileSignature, Landmark, ShieldCheck, ArrowRight, Settings, ChevronLeft, CalendarClock, Briefcase, Users, Activity, Building2, Trees, CircleDollarSign, Tractor, HeartHandshake, Trophy, BookOpen, PieChart: PieChartIcon, AlarmClock, Clock, Target, Upload, GraduationCap, Home, Bus, Salad, Users2, Leaf, BookText, Truck, Globe, FileBadge, X
} = LucideIcons;

const DocumentNumbersModule = ({ currentUser, currentInstitution }: { currentUser: AdminUser | null, currentInstitution?: { id: string } | null }) => {
  const [records, setRecords] = React.useState<DocumentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [formData, setFormData] = React.useState({
    type: 'Ofício' as DocType,
    requester: '',
    subject: '',
    customNumber: ''
  });

  const [typeFilter, setTypeFilter] = React.useState('Todos');
  const [recordToDelete, setRecordToDelete] = React.useState<string | null>(null);

  const [recordToEdit, setRecordToEdit] = React.useState<DocumentRecord | null>(null);
  const [editFormData, setEditFormData] = React.useState({
    type: 'Ofício' as DocType,
    number: 1,
    year: new Date().getFullYear(),
    dateCreated: '',
    requester: '',
    subject: ''
  });
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  React.useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase.from('document_records').select('*');
    if (currentInstitution?.id) query = query.eq('institution_id', currentInstitution.id);
    const { data, error } = await query
      .order('year', { ascending: false })
      .order('number', { ascending: false });
    if (data && !error) {
      // Postgres returns lowercased 'datecreated' or 'created_at'. Map it to 'dateCreated' for the UI.
      const mappedData = data.map(item => ({
        ...item,
        dateCreated: item.created_at || item.datecreated
      }));
      setRecords(mappedData as DocumentRecord[]);
    } else if (error) {
      console.error("Fetch records error:", error);
    }
    setLoading(false);
  };

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => typeFilter === 'Todos' || r.type === typeFilter);
  }, [records, typeFilter]);

  const handleDelete = async () => {
    if (!recordToDelete) return;
    
    const { error } = await supabase.from('document_records').delete().eq('id', recordToDelete);
    if (!error) {
      showToast('Documento excluído com sucesso.', 'success');
      setRecordToDelete(null);
      fetchRecords();
    } else {
      showToast('Erro ao excluir documento. Verifique as permissões do banco.', 'error');
      console.error(error);
    }
  };

  const openEditModal = (record: DocumentRecord) => {
    setRecordToEdit(record);
    
    let formattedDate = '';
    if (record.dateCreated) {
      try {
        formattedDate = new Date(record.dateCreated).toISOString().split('T')[0];
      } catch (e) {
        console.error('Invalid date', record.dateCreated);
      }
    }

    setEditFormData({
      type: record.type,
      number: record.number,
      year: record.year,
      dateCreated: formattedDate,
      requester: record.requester || '',
      subject: record.subject || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!recordToEdit) return;

    if (
      editFormData.type !== recordToEdit.type ||
      editFormData.number !== recordToEdit.number ||
      editFormData.year !== recordToEdit.year
    ) {
      const { data: duplicate } = await supabase
        .from('document_records')
        .select('id')
        .eq('type', editFormData.type)
        .eq('year', editFormData.year)
        .eq('number', editFormData.number)
        .neq('id', recordToEdit.id)
        .limit(1);
        
      if (duplicate && duplicate.length > 0) {
        showToast('Este número já está em uso para este tipo e ano.', 'error');
        return;
      }
    }

    setIsSavingEdit(true);
    
    const updatePayload: any = {
      type: editFormData.type,
      number: editFormData.number,
      year: editFormData.year,
      requester: editFormData.requester,
      subject: editFormData.subject
    };
    
    if (editFormData.dateCreated) {
      updatePayload.created_at = new Date(editFormData.dateCreated).toISOString();
    }

    const { error } = await supabase.from('document_records').update(updatePayload).eq('id', recordToEdit.id);

    if (!error) {
      showToast('Documento atualizado com sucesso.', 'success');
      setRecordToEdit(null);
      fetchRecords();
    } else {
      showToast('Erro ao atualizar documento.', 'error');
      console.error(error);
    }
    setIsSavingEdit(false);
  };

  const handleUpload = async (recordId: string, file: File) => {
    showToast('Enviando arquivo...', 'info');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${recordId}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('document_attachments').upload(fileName, file);
    
    if (uploadError) {
      showToast('Erro no upload. O bucket "document_attachments" existe?', 'error');
      console.error(uploadError);
      return;
    }
    
    const { data } = supabase.storage.from('document_attachments').getPublicUrl(fileName);
    
    const { error: updateError } = await supabase.from('document_records').update({ attachment: data.publicUrl }).eq('id', recordId);
    
    if (!updateError) {
      showToast('Anexo salvo com sucesso!', 'success');
      fetchRecords();
    } else {
      showToast('Erro ao vincular anexo.', 'error');
      console.error(updateError);
    }
  };

  const handleAdd = async () => {
    if (!formData.requester || !formData.subject) return;
    setIsGenerating(true);
    
    const currentYear = new Date().getFullYear();
    
    // Find max number for this type and year
    let queryMax = supabase
      .from('document_records')
      .select('number')
      .eq('type', formData.type)
      .eq('year', currentYear);
    if (currentInstitution?.id) queryMax = queryMax.eq('institution_id', currentInstitution.id);
    const { data: maxData } = await queryMax
      .order('number', { ascending: false })
      .limit(1);
      
    let newNumber = 1;
    if (formData.customNumber && !isNaN(Number(formData.customNumber))) {
      newNumber = Number(formData.customNumber);
      
      let queryDup = supabase
        .from('document_records')
        .select('id')
        .eq('type', formData.type)
        .eq('year', currentYear)
        .eq('number', newNumber);
      if (currentInstitution?.id) queryDup = queryDup.eq('institution_id', currentInstitution.id);
      const { data: duplicate } = await queryDup.limit(1);
        
      if (duplicate && duplicate.length > 0) {
        showToast('Este número já está em uso para este tipo e ano.', 'error');
        setIsGenerating(false);
        return;
      }
    } else if (maxData && maxData.length > 0) {
      newNumber = maxData[0].number + 1;
    }
    
    const newDoc = {
      type: formData.type,
      number: newNumber,
      year: currentYear,
      requester: formData.requester,
      subject: formData.subject,
      institution_id: currentInstitution?.id || currentUser?.institution_id || null
    };
    
    const { error } = await supabase.from('document_records').insert(newDoc);
    
    if (error) {
      showToast('Erro ao gerar número. Tente novamente.', 'error');
      console.error(error);
    } else {
      showToast(`${formData.type} ${String(newNumber).padStart(3, '0')}/${currentYear} gerado!`, 'success');
      setIsAdding(false);
      setFormData({ type: 'Ofício', requester: '', subject: '', customNumber: '' });
      fetchRecords();
    }
    setIsGenerating(false);
  };

  const handleUpdate = async (id: string, updates: Partial<DocumentRecord>) => {
    const { error } = await supabase.from('document_records').update(updates).eq('id', id);
    if (!error) {
      showToast('Anexo salvo com sucesso!', 'success');
      fetchRecords();
    } else {
      showToast('Erro ao salvar anexo.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Controle de Numeração</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Geração automática de números oficiais</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm font-bold outline-none flex-1 sm:flex-none dark:text-neutral-100"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="Ofício">Ofício</option>
            <option value="Decreto">Decreto</option>
          </select>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Gerar
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="font-bold dark:text-neutral-100">Reservar Novo Número</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Tipo de Documento</label>
              <select
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as DocType })}
              >
                <option value="Ofício">Ofício</option>
                <option value="Decreto">Decreto</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Solicitante</label>
              <input
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={formData.requester}
                onChange={e => setFormData({ ...formData, requester: e.target.value })}
                placeholder="Ex: João Silva - Sec. Administração"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Assunto</label>
              <input
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Assunto tratado no documento..."
              />
            </div>
            {['Super Admin', 'Admin'].includes(currentUser?.role || '') && (
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Número Inicial (Opcional - para forçar um pulo na sequência)</label>
                <input
                  type="number"
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                  value={formData.customNumber}
                  onChange={e => setFormData({ ...formData, customNumber: e.target.value })}
                  placeholder="Ex: 90 (Se deixado em branco, seguirá a numeração automática)"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors">Cancelar</button>
            <button onClick={handleAdd} disabled={!formData.requester || !formData.subject || isGenerating} className="px-6 py-3 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 disabled:opacity-50 transition-opacity flex items-center gap-2">
              {isGenerating ? 'Gerando...' : 'Gerar Documento'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <p className="text-neutral-400 dark:text-neutral-500 font-bold">Carregando registros...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex justify-center py-20">
          <p className="text-neutral-400 dark:text-neutral-500 font-bold">Nenhum documento encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecords.map((record) => (
            <div key={record.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-1.5 rounded-xl border border-neutral-100 dark:border-neutral-700">
                  <span className="font-mono text-neutral-900 dark:text-neutral-100 text-sm font-medium">
                    {record.type.toUpperCase()}&nbsp;<span className="font-black text-sky-600 dark:text-sky-400">{String(record.number).padStart(3, '0')}/{record.year}</span>
                  </span>
                </div>
                <div className="text-[10px] uppercase font-black tracking-widest text-neutral-400 dark:text-neutral-500">
                  {new Date(record.dateCreated).toLocaleDateString('pt-BR')}
                </div>
              </div>
              
              <div className="flex-1">
                <h4 className="font-bold text-neutral-800 dark:text-neutral-200 mb-3 line-clamp-2 leading-relaxed" title={record.subject}>
                  {record.subject}
                </h4>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                  <Users size={12} className="text-neutral-400" />
                  <span className="truncate" title={record.requester}>{record.requester}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <div className="flex-1">
                  {record.attachment && record.attachment.startsWith('http') ? (
                    <a 
                      href={record.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-2 w-full transition-colors"
                    >
                      <FileText size={16} />
                      <span className="text-xs font-bold truncate max-w-[150px]">Visualizar Anexo</span>
                    </a>
                  ) : (
                    <label className="text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer flex items-center gap-2 transition-colors inline-flex">
                      <Upload size={16} />
                      <span className="text-xs font-bold">Anexar Arquivo</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUpload(record.id, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {['Super Admin', 'Admin'].includes(currentUser?.role || '') && (
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openEditModal(record)}
                      className="p-2 text-neutral-300 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all"
                      title="Editar Documento"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setRecordToDelete(record.id)}
                      className="p-2 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Excluir Documento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-sm p-8 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-6 text-rose-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">Excluir Documento?</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
                Esta ação não pode ser desfeita. O número do documento ficará permanentemente vago.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 px-4 py-3 font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {recordToEdit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-[32px] w-full max-w-md p-8 shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white">Editar Documento</h3>
                <button onClick={() => setRecordToEdit(null)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Tipo de Documento</label>
                  <select
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                    value={editFormData.type}
                    onChange={e => setEditFormData({ ...editFormData, type: e.target.value as DocType })}
                  >
                    <option value="Ofício">Ofício</option>
                    <option value="Decreto">Decreto</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Número</label>
                    <input
                      type="number"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                      value={editFormData.number}
                      onChange={e => setEditFormData({ ...editFormData, number: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Ano</label>
                    <input
                      type="number"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                      value={editFormData.year}
                      onChange={e => setEditFormData({ ...editFormData, year: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Data de Criação</label>
                  <input
                    type="date"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                    value={editFormData.dateCreated}
                    onChange={e => setEditFormData({ ...editFormData, dateCreated: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Solicitante</label>
                  <input
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                    value={editFormData.requester}
                    onChange={e => setEditFormData({ ...editFormData, requester: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Assunto</label>
                  <input
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                    value={editFormData.subject}
                    onChange={e => setEditFormData({ ...editFormData, subject: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setRecordToEdit(null)}
                  className="flex-1 px-4 py-3 font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={!editFormData.requester || !editFormData.subject || isSavingEdit}
                  className="flex-1 px-4 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {isSavingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { DocumentNumbersModule };
