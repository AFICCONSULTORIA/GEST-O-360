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
import { WhatsNewBanner } from '../../components/ui/WhatsNewBanner';

const { 
  Plus, Search, Filter, Edit2, Trash2, Eye, FileText, ClipboardCheck, TrendingUp, TrendingDown, ChevronRight, ChevronDown, ShieldAlert, Download, CircleOff, History, Info, CheckCircle2, AlertCircle, AlertTriangle, Package, LayoutDashboard, Calendar, FileBox, FileSignature, Landmark, ShieldCheck, ArrowRight, Settings, ChevronLeft, CalendarClock, Briefcase, Users, Activity, Building2, Trees, CircleDollarSign, Tractor, HeartHandshake, Trophy, BookOpen, PieChart: PieChartIcon, AlarmClock, Clock, Target, Upload, GraduationCap, Home, Bus, Salad, Users2, Leaf, BookText, Truck, Globe, FileBadge, X, LayoutGrid, List, Copy, RotateCw, Loader2, ImageOff
} = LucideIcons;

const compressImage = async (file: File): Promise<File> => {
  try {
    // createImageBitmap automaticamente respeita a orientação EXIF das fotos de celular
    const bitmap = await createImageBitmap(file);
    const MAX_WIDTH = 1280;
    const MAX_HEIGHT = 1280;
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > height) {
      if (width > MAX_WIDTH) {
        height = Math.round((height *= MAX_WIDTH / width));
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width = Math.round((width *= MAX_HEIGHT / height));
        height = MAX_HEIGHT;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(bitmap, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, 'image/webp', 0.8);
    });
  } catch (err) {
    console.error('Erro ao comprimir imagem, enviando original:', err);
    return file; // Fallback se o navegador não suportar createImageBitmap
  }
};

const PatrimonioModule = ({ items, onAdd, onEdit, onDelete, canDelete, canEdit = true, userDepartment, availableDepartments = [] }: { items: PatrimonioItem[], onAdd: (item: PatrimonioItem) => void, onEdit?: (item: PatrimonioItem) => void, onDelete?: (id: string) => void, canDelete?: boolean, canEdit?: boolean, userDepartment?: string, availableDepartments?: string[] }) => {
  const [search, setSearch] = React.useState('');
  const [filterDept, setFilterDept] = React.useState('Todos');
  const [filterCond, setFilterCond] = React.useState('Todos');
  const [filterStatus, setFilterStatus] = React.useState('Todos');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [imageModalItem, setImageModalItem] = React.useState<PatrimonioItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [expandedDescId, setExpandedDescId] = React.useState<string | null>(null);
  const [isRotating, setIsRotating] = React.useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 12;
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterDept, filterCond, filterStatus, viewMode]);

  const handleSave = () => {
    if (formRef.current && !formRef.current.reportValidity()) return;
    
    if (editingItemId && onEdit) {
      onEdit({ ...formData, id: editingItemId } as PatrimonioItem);
    } else {
      onAdd({
        ...formData,
        id: crypto.randomUUID()
      } as PatrimonioItem);
    }
    
    
    setIsModalOpen(false);
    setEditingItemId(null);
    setFormData({ itemType: 'Geral', code: '', objectName: '', location: '', status: 'Servível', condition: 'Bom', department: userDepartment || '', year: new Date().getFullYear(), imageUrls: [], plate: '', chassis: '', model: '' });
  };

  const handleRotateImage = async (item: PatrimonioItem, idx: number) => {
    setIsRotating(true);
    try {
      const url = item.imageUrls![idx];
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'image.webp', { type: blob.type });

      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.height;
      canvas.height = bitmap.width; 
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Sem suporte a Canvas');
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
      
      const newBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', 0.8));
      if (!newBlob) throw new Error('Falha ao processar imagem');
      
      const newFile = new File([newBlob], `rotated-${Date.now()}.webp`, { type: 'image/webp' });
      
      showToast('Salvando foto rotacionada...', 'info');
      
      const filename = `patrimonio/${Date.now()}-rotated.webp`;
      const { error: uploadError } = await supabase.storage.from('certidoes').upload(filename, newFile);
      if (uploadError) throw uploadError;
      
      const { data: publicData } = supabase.storage.from('certidoes').getPublicUrl(filename);
      const newUrl = publicData.publicUrl;
      
      const newUrls = [...item.imageUrls!];
      newUrls[idx] = newUrl;
      
      const { error: updateError } = await supabase.from('patrimonio').update({ image_urls: newUrls }).eq('id', item.id);
      if (updateError) throw updateError;
      
      const oldPath = url.split('/certidoes/')[1];
      if (oldPath) {
        supabase.storage.from('certidoes').remove([oldPath]).catch(console.error);
      }
      
      if (onEdit) onEdit({ ...item, imageUrls: newUrls });
      setImageModalItem({ ...item, imageUrls: newUrls });
      
      // Update the local items state manually since we are not directly mutating the global state here if onEdit wasn't enough
      const itemIndex = items.findIndex(i => i.id === item.id);
      if (itemIndex > -1) {
         items[itemIndex].imageUrls = newUrls;
      }
      
      showToast('Foto rotacionada e salva!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao rotacionar a foto', 'error');
    } finally {
      setIsRotating(false);
    }
  };

  const openImageModal = (item: PatrimonioItem) => {
    setActiveImageIdx(0);
    setImageModalItem(item);
  };
  const openEditModal = (item: PatrimonioItem) => {
    setEditingItemId(item.id);
    setFormData(item);
    setIsModalOpen(true);
  };
  const handleDuplicate = (item: PatrimonioItem) => {
    setEditingItemId(null);
    setFormData({
      ...item,
      id: undefined,
      code: item.code ? item.code + ' (Cópia)' : '',
      plate: item.plate ? item.plate + ' (Cópia)' : ''
    });
    setIsModalOpen(true);
  };
  const [formData, setFormData] = React.useState<Partial<PatrimonioItem>>({
    itemType: 'Geral', code: '', objectName: '', location: '', status: 'Servível', condition: 'Bom', department: '', year: new Date().getFullYear(), imageUrls: [], plate: '', chassis: '', model: ''
  });
  
  const filteredItems = React.useMemo(() => {
    return items.filter(i => {
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
  }, [items, filterDept, filterCond, filterStatus, search]);

  const uniqueDepts = React.useMemo(() => {
    return Array.from(new Set(items.map(i => i.department)));
  }, [items]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 relative print:hidden">
      <WhatsNewBanner 
        version="2.2.0"
        title="Atualizações no Patrimônio"
        features={[
          "Duplicação Rápida: Novo botão para clonar um item idêntico, poupando tempo na digitação.",
          "Modo Lista Limpo: A tabela foi substituída por caixinhas organizadas e expansíveis.",
          "Cores de Status: Status e condições voltaram a exibir cores para facilitar a identificação.",
          "Preenchimento Automático: A secretaria agora é preenchida sozinha com base na sua lotação."
        ]}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold dark:text-neutral-100">Controle de Patrimônio</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Gerencie os bens móveis, imóveis, equipamentos e veículos da administração.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={() => window.print()}
            className="bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-6 py-2.5 rounded-2xl text-sm font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-all flex items-center gap-2"
          >
            <Download size={18} />
            Emitir Relatório
          </button>
          {canEdit && (
            <button 
              onClick={() => {
                setEditingItemId(null);
                setFormData({ itemType: 'Geral', code: '', objectName: '', location: '', status: 'Servível', condition: 'Bom', department: userDepartment || '', year: new Date().getFullYear(), imageUrls: [], plate: '', chassis: '', model: '' });
                setIsModalOpen(true);
              }}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-2.5 rounded-2xl text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Package size={18} />
              Novo Item
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-3 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, código, categoria ou localização..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white font-medium"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:flex md:gap-3">
            <select 
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3 py-3 text-xs md:text-sm md:min-w-[180px] outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white font-semibold cursor-pointer"
            >
              <option value="Todos">Secretarias</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            
            <select 
              value={filterCond}
              onChange={e => setFilterCond(e.target.value)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3 py-3 text-xs md:text-sm md:min-w-[140px] outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white font-semibold cursor-pointer"
            >
              <option value="Todos">Condição</option>
              <option value="Excelente">Excelente</option>
              <option value="Bom">Bom</option>
              <option value="Ruim">Ruim</option>
              <option value="Muito Ruim">Muito Ruim</option>
            </select>
            
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3 py-3 text-xs md:text-sm md:min-w-[140px] outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all dark:text-white font-semibold cursor-pointer"
            >
              <option value="Todos">Status</option>
              <option value="Servível">Servível</option>
              <option value="Inservível">Inservível</option>
              <option value="Ocioso">Ocioso</option>
              <option value="Em Manutenção">Em Manutenção</option>
              <option value="Baixado">Baixado</option>
            </select>
          </div>
        </div>

        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl self-end lg:self-auto shadow-sm">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
            title="Visualização em Grid"
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
            title="Visualização em Lista"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedItems.map(item => (
              <motion.div 
                key={item.id}
                className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden group flex flex-col h-full hover:shadow-md hover:border-neutral-200 dark:hover:border-neutral-700 transition-all duration-300 relative"
              >
                {/* Image Area */}
                <div 
                  onClick={() => {
                    if (item.imageUrls && item.imageUrls.length > 0) {
                      openImageModal(item);
                    }
                  }}
                  className={`relative aspect-[4/3] bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800/50 overflow-hidden ${item.imageUrls && item.imageUrls.length > 0 ? 'cursor-pointer' : ''}`}
                >
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <>
                      <img 
                        src={item.imageUrls[0]} 
                        alt={item.objectName} 
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      {item.imageUrls.length > 1 && (
                        <div className="absolute top-3 right-3 bg-neutral-950/85 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-lg border border-white/10 shadow-lg">
                          +{item.imageUrls.length - 1} FOTOS
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 relative overflow-hidden group-hover:scale-105 transition-transform duration-700 ease-out">
                      {/* Padrão de bolinhas sutil no fundo */}
                      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                      
                      {/* Ícone com Glassmorphism */}
                      <div className="relative z-10 p-5 bg-white/60 dark:bg-black/30 backdrop-blur-md rounded-full shadow-lg border border-white/50 dark:border-white/10 mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500 ease-out">
                        {item.itemType === 'Veículo' ? (
                          <Truck size={36} strokeWidth={1.5} className="text-neutral-400 dark:text-neutral-500" />
                        ) : (
                          <ImageOff size={36} strokeWidth={1.5} className="text-neutral-400 dark:text-neutral-500" />
                        )}
                      </div>
                      
                      <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 bg-white/60 dark:bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 dark:border-white/10 shadow-sm">
                        Foto Indisponível
                      </span>
                    </div>
                  )}

                  {/* Status & Condition Pills (Floating) */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                    <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-md ${
                      item.condition === 'Excelente' ? 'bg-emerald-500/90 text-white' :
                      item.condition === 'Bom' ? 'bg-sky-500/90 text-white' :
                      item.condition === 'Ruim' ? 'bg-amber-500/90 text-white' :
                      'bg-rose-500/90 text-white'
                    }`}>
                      {item.condition}
                    </span>
                    <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-md ${
                      item.status === 'Servível' ? 'bg-neutral-900/90 text-white dark:bg-white/90 dark:text-neutral-950' :
                      'bg-rose-900/90 text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-100 dark:border-neutral-800">
                        {item.code}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 font-bold">{item.year}</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2" title={item.objectName}>
                        {item.objectName}
                      </h3>

                      {item.itemType === 'Veículo' && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[9px] font-mono bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded border border-neutral-100 dark:border-neutral-800">
                            Placa: <strong className="text-neutral-800 dark:text-neutral-300">{item.plate}</strong>
                          </span>
                          <span className="text-[9px] font-medium bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded border border-neutral-100 dark:border-neutral-800">
                            Modelo: <strong className="text-neutral-800 dark:text-neutral-300">{item.model}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/50 space-y-1.5">
                      <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                        <Building2 size={13} className="text-neutral-400" />
                        {item.department}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-450 flex items-center gap-2">
                        <Home size={13} className="text-neutral-400" />
                        {item.location}
                      </p>
                      {canDelete && item.createdByName && (
                        <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 mt-2 bg-neutral-100 dark:bg-neutral-800/50 p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 inline-block w-full truncate">
                          👤 Registrado por: <span className="text-neutral-700 dark:text-neutral-300">{item.createdByName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/50 flex justify-end gap-2">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleDuplicate(item)}
                            className="p-2 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                            title="Duplicar item"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"
                            title="Editar item"
                          >
                            <Edit2 size={15} />
                          </button>
                        </>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja excluir este item?')) {
                              onDelete?.(item.id);
                            }
                          }}
                          className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                          title="Excluir item"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          {paginatedItems.length === 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-12 text-center text-neutral-500">
              Nenhum item encontrado.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden transition-all">
              <div 
                className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors gap-4"
                onClick={() => setExpandedDescId(expandedDescId === item.id ? null : item.id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0 relative">
                    {item.imageUrls && item.imageUrls.length > 0 ? (
                      <div className="w-full h-full relative cursor-pointer group" onClick={(e) => { e.stopPropagation(); openImageModal(item); }}>
                        <img src={item.imageUrls[0]} alt={item.objectName} loading="lazy" className="w-full h-full object-cover rounded-2xl group-hover:opacity-80 transition-opacity" />
                        {item.imageUrls.length > 1 && (
                          <div className="absolute -bottom-1 -right-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 z-10 shadow-sm">
                            +{item.imageUrls.length - 1}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Package size={20} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">{item.objectName}</h3>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-3 md:pt-0 border-t border-neutral-100 dark:border-neutral-800 md:border-0">
                  {(canEdit || canDelete) && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      {canEdit && (
                        <>
                          <button onClick={() => handleDuplicate(item)} className="p-2 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all" title="Duplicar item">
                            <Copy size={16} />
                          </button>
                          <button onClick={() => openEditModal(item)} className="p-2 text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all" title="Editar item">
                            <Edit2 size={16} />
                          </button>
                        </>
                      )}
                      {canDelete && (
                        <button onClick={() => { if (window.confirm('Tem certeza que deseja excluir este item?')) onDelete?.(item.id); }} className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all" title="Excluir item">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  <ChevronDown className={`text-neutral-400 transition-transform duration-300 ${expandedDescId === item.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              <AnimatePresence>
                {expandedDescId === item.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Descrição</p>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{item.description || 'Nenhuma descrição fornecida para este item.'}</p>
                        </div>
                        
                        {canDelete && item.createdByName && (
                          <div className="lg:col-span-4 space-y-1 bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">👤 Registrado por</p>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{item.createdByName}</p>
                          </div>
                        )}
                        
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Código</p>
                          <p className="text-sm font-mono font-bold text-neutral-900 dark:text-neutral-100">{item.code}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Localização</p>
                          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.location}</p>
                          <p className="text-xs text-neutral-500">{item.department}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Status / Condição</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${
                              item.status === 'Servível' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700' :
                              'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                            }`}>{item.status}</span>
                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${
                              item.condition === 'Excelente' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' :
                              item.condition === 'Bom' ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30' :
                              item.condition === 'Ruim' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' :
                              'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                            }`}>{item.condition}</span>
                          </div>
                        </div>

                        {item.itemType === 'Veículo' && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Veículo</p>
                            <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">Placa: <strong className="text-neutral-800 dark:text-neutral-200">{item.plate}</strong></p>
                            <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">Modelo: <strong className="text-neutral-800 dark:text-neutral-200">{item.model}</strong></p>
                          </div>
                        )}
                        
                        {item.imageUrls && item.imageUrls.length > 0 && (
                          <div className="lg:col-span-4 mt-2 border-t border-neutral-100 dark:border-neutral-800 pt-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Galeria de Fotos</p>
                            <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
                              {item.imageUrls.map((url, idx) => (
                                <img 
                                  key={url} 
                                  src={url} 
                                  loading="lazy"
                                  onClick={(e) => { e.stopPropagation(); setActiveImageIdx(idx); setImageModalItem(item); }}
                                  className="h-24 w-32 object-cover rounded-xl shrink-0 cursor-pointer hover:opacity-80 transition-opacity border border-neutral-200 dark:border-neutral-700 snap-start shadow-sm" 
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {paginatedItems.length === 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 p-12 text-center text-neutral-500">
              Nenhum item encontrado.
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium text-center sm:text-left">
            Mostrando <strong className="text-neutral-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong className="text-neutral-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</strong> de <strong className="text-neutral-900 dark:text-white">{filteredItems.length}</strong> itens
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center"
              title="Página Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center ${
                      currentPage === pageNum
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md'
                        : 'border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hidden sm:flex'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center"
              title="Próxima Página"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

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
              className="bg-white dark:bg-neutral-900 w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-[30px] md:rounded-[40px] p-6 md:p-10 shadow-2xl custom-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-neutral-100">{editingItemId ? 'Editar Item' : 'Novo Item'}</h3>
                  <p className="text-xs md:text-sm text-neutral-500 mt-1">{editingItemId ? 'Atualize as informações do bem selecionado.' : 'Cadastre um novo bem para o controle da administração.'}</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 shrink-0 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form 
                ref={formRef}
                onSubmit={(e) => e.preventDefault()}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Descrição</label>
                  <textarea 
                    placeholder="Descrição detalhada do item..."
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white transition-all resize-none"
                  />
                </div>

                {formData.itemType === 'Veículo' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="relative">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Secretaria</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Administração"
                      value={formData.department}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                      onFocus={() => setShowDeptDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDeptDropdown(false), 200)}
                      readOnly={!canDelete}
                      className={`w-full mt-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm outline-none transition-all ${!canDelete ? 'opacity-60 cursor-not-allowed font-semibold' : 'focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 dark:text-white'}`}
                    />
                    {showDeptDropdown && canDelete && availableDepartments.length > 0 && (
                      <div className="absolute z-[60] w-full mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto py-2 custom-scrollbar">
                        {availableDepartments.map(d => (
                          <button
                            key={d}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData({...formData, department: d});
                              setShowDeptDropdown(false);
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-sm font-medium transition-colors text-neutral-700 dark:text-neutral-200"
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
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
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []) as File[];
                            if (!files.length) return;
                            
                            const currentImages = formData.imageUrls || [];
                            const remainingSlots = 5 - currentImages.length;
                            const filesToProcess = files.slice(0, remainingSlots);
                            
                            if (files.length > remainingSlots) {
                              showToast(`Você só pode adicionar mais ${remainingSlots} foto(s). O limite é 5.`, 'warning');
                            }

                            showToast('Enviando imagens...', 'info');

                            const newImageUrls: string[] = [];
                            for (const file of filesToProcess) {
                               try {
                                 const compressedFile = await compressImage(file);
                                 const safeName = compressedFile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
                                 const filename = `patrimonio/${Date.now()}-${safeName}`;
                                 const { error } = await supabase.storage.from('certidoes').upload(filename, compressedFile);
                                 if (!error) {
                                   const { data } = supabase.storage.from('certidoes').getPublicUrl(filename);
                                   newImageUrls.push(data.publicUrl);
                                 } else {
                                   console.error("Erro no upload", error);
                                   showToast(`Erro ao enviar a imagem ${file.name}`, 'error');
                                 }
                               } catch (err) {
                                 console.error("Erro na compressão", err);
                                 showToast(`Erro ao processar a imagem ${file.name}`, 'error');
                               }
                            }

                            setFormData(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...newImageUrls] }));
                            showToast('Imagens anexadas!', 'success');
                          }}
                        />
                        <Package size={24} className="text-neutral-400" />
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Clique para selecionar até 5 imagens</span>
                      </label>
                    )}
                    {formData.imageUrls && formData.imageUrls.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {formData.imageUrls.map((url, idx) => (
                          <div key={url} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0">
                            <img src={url} alt={`Preview ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
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

                <div className="pt-4 flex flex-col md:flex-row gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 md:py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">Cancelar</button>
                  <button type="button" onClick={handleSave} className="flex-1 py-3.5 md:py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xl shadow-neutral-900/20 md:hover:scale-105 transition-all">
                    {editingItemId ? 'Atualizar Item' : 'Salvar Item'}
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
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-950/95 backdrop-blur-md"
            onClick={() => setImageModalItem(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl flex flex-col items-center gap-4 p-4"
              onClick={e => e.stopPropagation()}
            >
              {/* Rotate Button */}
              {canEdit && (
                <button 
                  onClick={() => handleRotateImage(imageModalItem, activeImageIdx)}
                  disabled={isRotating}
                  className="absolute top-0 right-16 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Rotacionar foto (90°)"
                >
                  {isRotating ? <Loader2 size={20} className="animate-spin" /> : <RotateCw size={20} />}
                </button>
              )}
              
              {/* Close Button */}
              <button 
                onClick={() => setImageModalItem(null)} 
                className="absolute top-0 right-4 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-20"
              >
                <X size={20} />
              </button>
              
              {/* Main Image Container */}
              <div className="relative w-full aspect-[4/3] max-h-[70vh] flex items-center justify-center bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl group">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={activeImageIdx}
                    src={imageModalItem.imageUrls[activeImageIdx]} 
                    alt={`${imageModalItem.objectName} - Foto ${activeImageIdx + 1}`} 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-contain"
                  />
                </AnimatePresence>
                
                {/* Image Counter Badge */}
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-xl border border-white/10 shadow-lg pointer-events-none">
                  {activeImageIdx + 1} / {imageModalItem.imageUrls.length}
                </div>

                {/* Left/Right Navigation Arrows */}
                {imageModalItem.imageUrls.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActiveImageIdx(prev => (prev === 0 ? imageModalItem.imageUrls!.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white bg-black/40 hover:bg-black/60 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={() => setActiveImageIdx(prev => (prev === imageModalItem.imageUrls!.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white bg-black/40 hover:bg-black/60 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>

              {/* Title & Info Bar */}
              <div className="text-center text-white mt-2 space-y-1 max-w-xl">
                <h4 className="font-bold text-lg">{imageModalItem.objectName}</h4>
                <p className="text-xs text-white/60 font-medium tracking-wide uppercase">{imageModalItem.department} • {imageModalItem.location}</p>
              </div>

              {/* Thumbnail Row */}
              {imageModalItem.imageUrls.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto max-w-full px-4 py-2 custom-scrollbar">
                  {imageModalItem.imageUrls.map((url, idx) => (
                    <button 
                      key={url}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${activeImageIdx === idx ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/20' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    >
                      <img src={url} alt={`Miniatura ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
                    </button>
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
