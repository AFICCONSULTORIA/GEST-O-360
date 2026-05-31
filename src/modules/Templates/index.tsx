import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MOCK_TEMPLATES } from '../../App';
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

const TemplatesModule = () => {
  const [search, setSearch] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [templates, setTemplates] = React.useState<DocumentTemplate[]>(MOCK_TEMPLATES);
  const [formData, setFormData] = React.useState<Partial<DocumentTemplate>>({
    title: '', description: '', category: 'Geral', format: 'Word', fileUrl: ''
  });

  const handleEdit = (template: DocumentTemplate) => {
    setFormData(template);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
      setTemplates(templates.filter(t => t.id !== id));
      showToast('Modelo excluído com sucesso.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      setTemplates(templates.map(t => t.id === formData.id ? {
        ...t,
        ...formData,
        updatedAt: new Date().toISOString()
      } as DocumentTemplate : t));
      showToast('Modelo atualizado com sucesso.');
    } else {
      setTemplates([{
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        updatedAt: new Date().toISOString()
      } as DocumentTemplate, ...templates]);
      showToast('Modelo adicionado com sucesso.');
    }
    setIsModalOpen(false);
    setFormData({ title: '', description: '', category: 'Geral', format: 'Word', fileUrl: '' });
  };

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'Word': return <FileText size={32} className="text-blue-500" />;
      case 'Excel': return <FileText size={32} className="text-emerald-500" />;
      case 'PDF': return <FileText size={32} className="text-rose-500" />;
      case 'PowerPoint': return <FileText size={32} className="text-orange-500" />;
      default: return <FileText size={32} className="text-neutral-500" />;
    }
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'Word': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      case 'Excel': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
      case 'PDF': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
      case 'PowerPoint': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700';
    }
  };

  const handleDownload = (template: DocumentTemplate) => {
    if (template.fileUrl && template.fileUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = template.fileUrl;
      let ext = '.pdf';
      if (template.format === 'Word') ext = '.docx';
      else if (template.format === 'Excel') ext = '.xlsx';
      else if (template.format === 'PowerPoint') ext = '.pptx';
      a.download = `${template.title}${ext}`;
      a.click();
    } else if (template.fileUrl) {
      window.open(template.fileUrl, '_blank');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-2xl">
            <FileBadge size={32} className="text-neutral-900 dark:text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Modelos de Documentos</h2>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Acesse e gerencie templates oficiais da administração.</p>
          </div>
        </div>
        
        <div className="flex w-full md:w-auto gap-4">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar modelos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 pl-12 pr-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setFormData({ title: '', description: '', category: 'Geral', format: 'Word', fileUrl: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-neutral-900/10 dark:shadow-white/10 shrink-0"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Novo Modelo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map(template => (
          <div key={template.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-neutral-200 dark:hover:border-neutral-700 transition-all group flex flex-col h-full cursor-pointer" onClick={() => handleDownload(template)}>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                {getFormatIcon(template.format)}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${getFormatBadge(template.format)}`}>
                  {template.format}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(template); }}
                    className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-sky-500 rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                    className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-rose-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 line-clamp-2">{template.title}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 line-clamp-3 flex-1">{template.description}</p>
            
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{template.category}</span>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Clock size={12} />
                <span>{new Date(template.updatedAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-[2rem] p-8 max-w-xl w-full shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{formData.id ? 'Editar Modelo' : 'Novo Modelo'}</h3>
                  <p className="text-sm text-neutral-500 mt-1">{formData.id ? 'Atualize as informações do modelo de documento.' : 'Adicione um novo documento padrão à biblioteca.'}</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form 
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Título do Modelo</label>
                  <input 
                    required
                    type="text"
                    placeholder="Ex: Ofício de Resposta Padrão"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Descrição Breve</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Descreva quando e como este modelo deve ser usado..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Categoria</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as any})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    >
                      <option value="Geral">Geral</option>
                      <option value="RH">RH</option>
                      <option value="Licitações">Licitações</option>
                      <option value="Contratos">Contratos</option>
                      <option value="Ofícios">Ofícios</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Formato</label>
                    <select 
                      value={formData.format}
                      onChange={e => setFormData({...formData, format: e.target.value as any})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    >
                      <option value="Word">Word</option>
                      <option value="Excel">Excel</option>
                      <option value="PDF">PDF</option>
                      <option value="PowerPoint">PowerPoint</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Upload do Arquivo {formData.id ? '(Opcional)' : ''}</label>
                  <input 
                    required={!formData.id}
                    type="file"
                    accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({...formData, fileUrl: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 dark:file:bg-white dark:file:text-neutral-900 dark:hover:file:bg-neutral-100 cursor-pointer"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xl shadow-neutral-900/20 hover:scale-105 transition-all">
                    {formData.id ? 'Salvar Alterações' : 'Adicionar Modelo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { TemplatesModule };
