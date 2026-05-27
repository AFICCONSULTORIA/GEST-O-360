import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PatrimonioPrintLayout } from '../Reports';
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

const PatrimonioModule = ({ items, onAdd, onDelete, canDelete }: { items: PatrimonioItem[], onAdd: (item: PatrimonioItem) => void, onDelete?: (id: string) => void, canDelete?: boolean }) => {
  const [search, setSearch] = React.useState('');
  const [filterDept, setFilterDept] = React.useState('Todos');
  const [filterCond, setFilterCond] = React.useState('Todos');
  const [filterStatus, setFilterStatus] = React.useState('Todos');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [imageModalItem, setImageModalItem] = React.useState<PatrimonioItem | null>(null);
  const [formData, setFormData] = React.useState<Partial<PatrimonioItem>>({
    itemType: 'Geral', code: '', objectName: '', location: '', status: 'Servível', condition: 'Bom', department: '', year: new Date().getFullYear(), imageUrls: [], plate: '', chassis: '', model: ''
  });
  
  const filteredItems = items.filter(i => {
    if (filterDept !== 'Todos' && i.department !== filterDept) return false;
    if (filterCond !== 'Todos' && i.condition !== filterCond) return false;
    if (filterStatus !== 'Todos' && i.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!i.objectName.toLowerCase().includes(s) && 
          !i.code.toLowerCase().includes(s) &&
          !i.department.toLowerCase().includes(s) &&
          !i.location.toLowerCase().includes(s) &&
          !(i.plate && i.plate.toLowerCase().includes(s)) &&
          !(i.model && i.model.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const uniqueDepts = Array.from(new Set(items.map(i => i.department)));

  return (
    <>
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 relative print:hidden">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold dark:text-neutral-100">Controle de Patrimônio</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Gerencie os bens móveis, imóveis, equipamentos e veículos da administração.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-6 py-2.5 rounded-2xl text-sm font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-all flex items-center gap-2"
          >
            <Download size={18} />
            Emitir Relatório
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-2.5 rounded-2xl text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Package size={18} />
            Novo Item
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, categoria ou localização..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white"
          />
        </div>
        <select 
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3 text-sm min-w-[200px] outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white"
        >
          <option value="Todos">Todos os Departamentos</option>
          {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select 
          value={filterCond}
          onChange={e => setFilterCond(e.target.value)}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3 text-sm min-w-[200px] outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white"
        >
          <option value="Todos">Todos os Estados</option>
          <option value="Excelente">Excelente</option>
          <option value="Bom">Bom</option>
          <option value="Ruim">Ruim</option>
          <option value="Muito Ruim">Muito Ruim</option>
        </select>
        <select 
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3 text-sm min-w-[150px] outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white"
        >
          <option value="Todos">Todos os Status</option>
          <option value="Servível">Servível</option>
          <option value="Inservível">Inservível</option>
          <option value="Ocioso">Ocioso</option>
          <option value="Em Manutenção">Em Manutenção</option>
          <option value="Baixado">Baixado</option>
        </select>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50">
              <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Código / Objeto</th>
              <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Local / Secretaria</th>
              <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Condição</th>
              <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest text-right">Status / Ano</th>
              {canDelete && <th className="px-8 py-5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                <td className="px-8 py-5 flex items-center gap-4">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => setImageModalItem(item)}>
                      <img 
                        src={item.imageUrls[0]} 
                        alt={item.objectName} 
                        className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-sm" 
                      />
                      {item.imageUrls.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-900">
                          +{item.imageUrls.length - 1}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-400">
                      <Package size={20} />
                    </div>
                  )}
                  <div>
                    <p className="font-mono text-xs text-neutral-500">{item.code}</p>
                    <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{item.objectName}</p>
                    {item.itemType === 'Veículo' && (
                      <div className="flex gap-2 mt-1.5">
                        <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">Placa: {item.plate}</span>
                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">Modelo: {item.model}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{item.location}</p>
                  <p className="text-xs text-neutral-500">{item.department}</p>
                </td>
                <td className="px-8 py-5">
                  <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${
                    item.condition === 'Excelente' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                    item.condition === 'Bom' ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400' :
                    item.condition === 'Ruim' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                    'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                  }`}>
                    {item.condition}
                  </span>
                </td>
                <td className="px-8 py-5 text-right flex flex-col items-end gap-1">
                  <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${
                    item.status === 'Servível' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700' :
                    'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                  }`}>
                    {item.status}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">Ano: {item.year}</span>
                </td>
                {canDelete && (
                  <td className="px-8 py-5 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir este item?')) {
                          onDelete?.(item.id);
                        }
                      }}
                      className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Excluir item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 5 : 4} className="px-8 py-10 text-center text-neutral-500">Nenhum item encontrado.</td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
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
              className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[40px] p-10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Novo Item de Patrimônio</h3>
                  <p className="text-sm text-neutral-500 mt-1">Cadastre um novo bem para o controle da administração.</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  onAdd({
                    ...formData,
                    id: Math.random().toString(36).substr(2, 9)
                  } as PatrimonioItem);
                  setIsModalOpen(false);
                  setFormData({ itemType: 'Geral', code: '', objectName: '', location: '', status: 'Servível', condition: 'Bom', department: '', year: new Date().getFullYear(), imageUrls: [], plate: '', chassis: '', model: '' });
                }}
                className="space-y-6"
              >
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Tipo de Bem</label>
                  <div className="flex gap-4 mt-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 cursor-pointer transition-all ${formData.itemType === 'Geral' ? 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-600 dark:text-neutral-400'}`}>
                      <input type="radio" name="itemType" className="hidden" checked={formData.itemType === 'Geral'} onChange={() => setFormData({...formData, itemType: 'Geral'})} />
                      <Package size={16} />
                      <span className="text-sm font-bold">Patrimônio Geral</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 cursor-pointer transition-all ${formData.itemType === 'Veículo' ? 'border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-600 dark:text-neutral-400'}`}>
                      <input type="radio" name="itemType" className="hidden" checked={formData.itemType === 'Veículo'} onChange={() => setFormData({...formData, itemType: 'Veículo'})} />
                      <Truck size={16} />
                      <span className="text-sm font-bold">Veículo da Frota</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Código do Item</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: 015/2026"
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Objeto</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Cadeira Giratória / Ambulância"
                      value={formData.objectName}
                      onChange={e => setFormData({...formData, objectName: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    />
                  </div>
                </div>

                {formData.itemType === 'Veículo' && (
                  <div className="grid grid-cols-3 gap-6 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">Placa</label>
                      <input 
                        required={formData.itemType === 'Veículo'}
                        type="text"
                        placeholder="Ex: ABC-1234"
                        value={formData.plate}
                        onChange={e => setFormData({...formData, plate: e.target.value})}
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-900/50 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white transition-all uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">Modelo</label>
                      <input 
                        required={formData.itemType === 'Veículo'}
                        type="text"
                        placeholder="Ex: Fiat Ducato"
                        value={formData.model}
                        onChange={e => setFormData({...formData, model: e.target.value})}
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-900/50 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 ml-1">Chassi</label>
                      <input 
                        required={formData.itemType === 'Veículo'}
                        type="text"
                        placeholder="Ex: 9BD..."
                        value={formData.chassis}
                        onChange={e => setFormData({...formData, chassis: e.target.value})}
                        className="w-full mt-1 bg-white dark:bg-neutral-900 border border-indigo-100 dark:border-indigo-900/50 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white transition-all uppercase"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Secretaria</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Administração"
                      value={formData.department}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Localização Específica</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Sala de Reuniões"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Status</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    >
                      <option value="Servível">Servível</option>
                      <option value="Inservível">Inservível</option>
                      <option value="Ocioso">Ocioso</option>
                      <option value="Em Manutenção">Em Manutenção</option>
                      <option value="Baixado">Baixado</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Condição</label>
                    <select 
                      value={formData.condition}
                      onChange={e => setFormData({...formData, condition: e.target.value as any})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    >
                      <option value="Excelente">Excelente</option>
                      <option value="Bom">Bom</option>
                      <option value="Ruim">Ruim</option>
                      <option value="Muito Ruim">Muito Ruim</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Ano</label>
                    <input 
                      required
                      type="number"
                      value={formData.year}
                      onChange={e => setFormData({...formData, year: Number(e.target.value)})}
                      className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1 mb-1 block">Fotos do Item (Até 5)</label>
                  <div className="flex flex-col gap-4">
                    {(formData.imageUrls?.length || 0) < 5 && (
                      <label className="cursor-pointer bg-neutral-50 dark:bg-neutral-800 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-2xl px-5 py-4 flex flex-col items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                        <input 
                          type="file" 
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []) as File[];
                            if (!files.length) return;
                            
                            const currentImages = formData.imageUrls || [];
                            const remainingSlots = 5 - currentImages.length;
                            const filesToProcess = files.slice(0, remainingSlots);
                            
                            if (files.length > remainingSlots) {
                              showToast(`Você só pode adicionar mais ${remainingSlots} foto(s). O limite é 5.`, 'warning');
                            }

                            const newImageUrls: string[] = [];
                            let processed = 0;

                            filesToProcess.forEach(file => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                newImageUrls.push(reader.result as string);
                                processed++;
                                if (processed === filesToProcess.length) {
                                  setFormData(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...newImageUrls] }));
                                }
                              };
                              reader.readAsDataURL(file);
                            });
                          }}
                        />
                        <Package size={24} className="text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Clique para selecionar até 5 imagens</span>
                      </label>
                    )}
                    {formData.imageUrls && formData.imageUrls.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {formData.imageUrls.map((url, idx) => (
                          <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0">
                            <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                const newUrls = [...formData.imageUrls!];
                                newUrls.splice(idx, 1);
                                setFormData({ ...formData, imageUrls: newUrls });
                              }}
                              className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xl shadow-neutral-900/20 hover:scale-105 transition-all">
                    Salvar Item
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {imageModalItem && imageModalItem.imageUrls && imageModalItem.imageUrls.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl flex flex-col items-center justify-center gap-6"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setImageModalItem(null)} 
                className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all z-10"
              >
                <X size={24} />
              </button>
              
              <div className="flex overflow-x-auto snap-x snap-mandatory w-full gap-6 pb-4 items-center hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {imageModalItem.imageUrls.map((url, idx) => (
                  <div key={idx} className="snap-center shrink-0 w-full md:w-auto flex justify-center items-center">
                    <img 
                      src={url} 
                      alt={`${imageModalItem.objectName} - Foto ${idx + 1}`} 
                      className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                    />
                  </div>
                ))}
              </div>
              
              {imageModalItem.imageUrls.length > 1 && (
                <div className="flex gap-2 mt-4">
                  {imageModalItem.imageUrls.map((_, idx) => (
                    <div key={idx} className="w-2 h-2 rounded-full bg-white/50" />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    
    <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999] min-h-screen pb-10">
      <PatrimonioPrintLayout filteredItems={filteredItems} filters={{ search: search, dept: filterDept, cond: filterCond, status: filterStatus }} />
    </div>
    </>
  );
};

export { PatrimonioModule };
