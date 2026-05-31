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

const OrdersModule = ({ orders, onAdd, onEdit, setOrders }: { orders: OrderItem[], onAdd: (o: Omit<OrderItem, 'id'>) => void, onEdit: (o: OrderItem) => void, setOrders: React.Dispatch<React.SetStateAction<OrderItem[]>> }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<OrderItem | null>(null);
  const [requesterFilter, setRequesterFilter] = React.useState<string>('all');
  const [supplierFilter, setSupplierFilter] = React.useState<string>('all');
  
  const formDataInitialState = {
    type: 'obras_abrange' as OrderType,
    requester: '',
    projectSite: '',
  };
  const [formData, setFormData] = React.useState(formDataInitialState);
  const [orderItemsList, setOrderItemsList] = React.useState([{ name: '', quantity: '1' }]);

  const uniqueRequesters = React.useMemo(() => {
    return Array.from(new Set(orders.map(o => o.requester))).sort();
  }, [orders]);

  const uniqueSuppliers = React.useMemo(() => {
    return Array.from(new Set(orders.map(o => o.winningSupplier).filter(Boolean))).sort() as string[];
  }, [orders]);

  const displayOrders = React.useMemo(() => {
    return orders.filter(o => 
      (requesterFilter === 'all' || o.requester === requesterFilter) &&
      (supplierFilter === 'all' || o.winningSupplier === supplierFilter)
    );
  }, [orders, requesterFilter, supplierFilter]);

  const [editFormData, setEditFormData] = React.useState({
    quotationNumber: '',
    winningSupplier: '',
    status: 'pendente' as OrderStatus
  });

  const handleAdd = () => {
    const validItems = orderItemsList.filter(item => item.name.trim() !== '');
    if (validItems.length === 0 || !formData.requester) return;

    const description = validItems.map(item => `${item.quantity}x ${item.name}`).join('\n');

    onAdd({
      type: formData.type,
      description: description,
      requester: formData.requester,
      projectSite: formData.projectSite,
      dateRequested: new Date().toISOString().split('T')[0],
      status: 'pendente',
    });
    setIsAdding(false);
    setFormData({ type: 'obras_abrange', requester: '', projectSite: '' });
    setOrderItemsList([{ name: '', quantity: '1' }]);
  };

  const handleEditSave = () => {
    if (!editingOrder) return;
    onEdit({
      ...editingOrder,
      quotationNumber: editFormData.quotationNumber,
      winningSupplier: editFormData.winningSupplier,
      status: editFormData.status,
    });
    setEditingOrder(null);
  };

  const startEdit = (order: OrderItem) => {
    setEditingOrder(order);
    setEditFormData({
      quotationNumber: order.quotationNumber || '',
      winningSupplier: order.winningSupplier || '',
      status: order.status
    });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold dark:text-neutral-100">Central de Pedidos</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Gerencie suprimentos (Abrange) e veículos/serviços (GTF).</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none dark:text-neutral-100 min-w-[200px]"
            value={requesterFilter}
            onChange={e => setRequesterFilter(e.target.value)}
          >
            <option value="all">Todos os Solicitantes</option>
            {uniqueRequesters.map(req => (
              <option key={req} value={req}>{req}</option>
            ))}
          </select>
          <select
            className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none dark:text-neutral-100 min-w-[200px]"
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
          >
            <option value="all">Todos os Fornecedores</option>
            {uniqueSuppliers.map(sup => (
              <option key={sup} value={sup}>{sup}</option>
            ))}
          </select>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} /> Novo Pedido
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">Registrar Novo Pedido</h3>
                  <p className="text-sm text-neutral-500 mt-1">Preencha os detalhes para solicitar itens.</p>
                </div>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setOrderItemsList([{ name: '', quantity: '1' }]);
                  }}
                  className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Tipo de Pedido</label>
                    <select
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as OrderType })}
                    >
                      <option value="obras_abrange">Obras (Abrange)</option>
                      <option value="veiculos_gtf">Veículos/Serviços (GTF)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Solicitante</label>
                    <input
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                      value={formData.requester}
                      onChange={e => setFormData({ ...formData, requester: e.target.value })}
                      placeholder="Ex: João - Sec. Obras"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Local / Obra</label>
                    <input
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                      value={formData.projectSite}
                      onChange={e => setFormData({ ...formData, projectSite: e.target.value })}
                      placeholder="Ex: Praça Central"
                    />
                  </div>
                  <div className="col-span-3 space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Itens do Pedido</label>
                    <div className="space-y-2">
                      {orderItemsList.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            className="w-24 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100 text-center"
                            value={item.quantity}
                            onChange={e => {
                              const newItems = [...orderItemsList];
                              newItems[index].quantity = e.target.value;
                              setOrderItemsList(newItems);
                            }}
                            placeholder="Qtd"
                          />
                          <input
                            className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                            value={item.name}
                            onChange={e => {
                              const newItems = [...orderItemsList];
                              newItems[index].name = e.target.value;
                              setOrderItemsList(newItems);
                            }}
                            placeholder="Ex: Cadeira de Escritório Giratória..."
                          />
                          {orderItemsList.length > 1 && (
                            <button
                              onClick={() => setOrderItemsList(orderItemsList.filter((_, i) => i !== index))}
                              className="p-3 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors shrink-0"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setOrderItemsList([...orderItemsList, { name: '', quantity: '1' }])}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-colors w-full justify-center border border-dashed border-sky-200 dark:border-sky-800"
                    >
                      <Plus size={14} /> Adicionar Item
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3 sticky bottom-0">
                <button onClick={() => {
                  setIsAdding(false);
                  setOrderItemsList([{ name: '', quantity: '1' }]);
                }} className="px-6 py-3 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">Cancelar</button>
                <button onClick={handleAdd} disabled={orderItemsList.filter(i => i.name.trim() !== '').length === 0 || !formData.requester} className="px-6 py-3 rounded-xl text-sm font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 disabled:opacity-50 transition-opacity">Salvar Pedido</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-start bg-white dark:bg-neutral-900 sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white">Atualizar Cotação</h3>
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">Pedido: {editingOrder.description}</p>
                </div>
                <button 
                  onClick={() => setEditingOrder(null)}
                  className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shrink-0 ml-4"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</label>
                    <select
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                      value={editFormData.status}
                      onChange={e => setEditFormData({ ...editFormData, status: e.target.value as OrderStatus })}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_cotacao">Em Cotação</option>
                      <option value="concluido">Concluído</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Nº Cotação</label>
                    <input
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                      value={editFormData.quotationNumber}
                      onChange={e => setEditFormData({ ...editFormData, quotationNumber: e.target.value })}
                      placeholder="Ex: COT-1234/24"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Fornecedor Ganhador</label>
                    <input
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                      value={editFormData.winningSupplier}
                      onChange={e => setEditFormData({ ...editFormData, winningSupplier: e.target.value })}
                      placeholder="Ex: Oficina Confiança..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3 sticky bottom-0">
                <button onClick={() => setEditingOrder(null)} className="px-6 py-3 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">Cancelar</button>
                <button onClick={handleEditSave} className="px-6 py-3 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Salvar Atualização</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayOrders.map(order => (
          <div key={order.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col group relative overflow-hidden">
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {order.type === 'obras_abrange' ? 'Obras / Abrange' : 'Veículos / GTF'}
                </span>
                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                  <Calendar size={12} /> {order.dateRequested.split('-').reverse().join('/')}
                </span>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex ${
                order.status === 'pendente' ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' :
                order.status === 'em_cotacao' ? 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 animate-pulse' :
                order.status === 'concluido' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
              }`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-6 line-clamp-3 flex-1 whitespace-pre-line">
              {order.description}
            </h3>

            <div className="space-y-4 mb-6">
              {order.projectSite && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                    <Building2 size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Local / Obra</p>
                    <p className="font-bold text-sky-700 dark:text-sky-300 text-sm line-clamp-1" title={order.projectSite}>{order.projectSite}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                  <Users size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Solicitante</p>
                  <p className="font-medium text-neutral-700 dark:text-neutral-300 text-sm line-clamp-1" title={order.requester}>{order.requester}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                  <FileText size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cotação / Fornecedor</p>
                  <p className="font-medium text-neutral-700 dark:text-neutral-300 text-sm line-clamp-2" title={order.winningSupplier ? `${order.quotationNumber} • ${order.winningSupplier}` : order.quotationNumber}>
                    {order.quotationNumber || '-'} {order.winningSupplier ? <><br/><span className="text-neutral-500 text-xs truncate block">{order.winningSupplier}</span></> : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-auto">
              <button 
                onClick={() => startEdit(order)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-xs font-bold uppercase tracking-widest flex-1 justify-center"
              >
                <Edit2 size={14} /> Atualizar
              </button>
              <button 
                onClick={() => setOrders(orders.filter(o => o.id !== order.id))}
                className="p-2 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-xl transition-colors shrink-0"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </div>

          </div>
        ))}

        {displayOrders.length === 0 && (
          <div className="col-span-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center text-neutral-400 mb-4">
              <Package size={32} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Nenhum pedido encontrado</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">Registre um novo pedido ou altere os filtros de busca.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { OrdersModule };
