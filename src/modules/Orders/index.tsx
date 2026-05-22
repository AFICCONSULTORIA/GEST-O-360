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
    description: '',
    requester: '',
  };
  const [formData, setFormData] = React.useState(formDataInitialState);

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
    if (!formData.description || !formData.requester) return;
    onAdd({
      type: formData.type,
      description: formData.description,
      requester: formData.requester,
      dateRequested: new Date().toISOString().split('T')[0],
      status: 'pendente',
    });
    setIsAdding(false);
    setFormData({ type: 'obras_abrange', description: '', requester: '' });
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

      {isAdding && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="font-bold dark:text-neutral-100">Registrar Novo Pedido</h3>
          <div className="grid grid-cols-2 gap-4">
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
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Descrição do Pedido</label>
              <textarea
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100 resize-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Detalhes dos itens ou serviços..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors">Cancelar</button>
            <button onClick={handleAdd} disabled={!formData.description || !formData.requester} className="px-6 py-3 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 disabled:opacity-50 transition-opacity">Salvar</button>
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/30 shadow-sm space-y-4">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Atualizar Pedido Administração</h3>
          <p className="text-sm dark:text-neutral-300">Pedido: {editingOrder.description}</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Status</label>
              <select
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
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
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={editFormData.quotationNumber}
                onChange={e => setEditFormData({ ...editFormData, quotationNumber: e.target.value })}
                placeholder="Ex: COT-1234/24"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Fornecedor Ganhador</label>
              <input
                className="w-full bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none dark:text-neutral-100"
                value={editFormData.winningSupplier}
                onChange={e => setEditFormData({ ...editFormData, winningSupplier: e.target.value })}
                placeholder="Ex: Oficina Confiança..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingOrder(null)} className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors">Cancelar</button>
            <button onClick={handleEditSave} className="px-6 py-3 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Atualizar Cotação</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-[10px] uppercase font-black tracking-widest text-neutral-400 dark:text-neutral-500">
                <th className="px-6 py-4">Pedido</th>
                <th className="px-6 py-4">Solicitante</th>
                <th className="px-6 py-4">Nº Cotação</th>
                <th className="px-6 py-4">Fornecedor Ganhador</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
              {displayOrders.map(order => (
                <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">{order.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400">{order.type === 'obras_abrange' ? 'Obras / Abrange' : 'Veículos / GTF'}</span>
                        <span className="text-neutral-300 dark:text-neutral-600">•</span>
                        <span className="text-[10px] uppercase tracking-widest font-black text-neutral-400">{order.dateRequested}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{order.requester}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-neutral-600 dark:text-neutral-400 font-medium">{order.quotationNumber || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{order.winningSupplier || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex ${
                      order.status === 'pendente' ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' :
                      order.status === 'em_cotacao' ? 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 animate-pulse' :
                      order.status === 'concluido' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(order)}
                        className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        title="Atualizar Pedido"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setOrders(orders.filter(o => o.id !== order.id))}
                        className="bg-neutral-100 dark:bg-neutral-800 text-rose-500 p-2 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 dark:text-neutral-500 text-sm font-bold">
                    Nenhum pedido registrado no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export { OrdersModule };
