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

const DocumentNumbersModule = ({ records, onAdd, onUpdate }: { records: DocumentRecord[], onAdd: (o: Omit<DocumentRecord, 'id' | 'number' | 'year' | 'dateCreated'>) => void, onUpdate: (id: string, updates: Partial<DocumentRecord>) => void }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [formData, setFormData] = React.useState({
    type: 'Ofício' as DocType,
    requester: '',
    subject: '',
  });

  const [typeFilter, setTypeFilter] = React.useState('Todos');

  const filteredRecords = React.useMemo(() => {
    return records.filter(r => typeFilter === 'Todos' || r.type === typeFilter);
  }, [records, typeFilter]);

  const handleAdd = () => {
    if (!formData.requester || !formData.subject) return;
    onAdd(formData);
    setIsAdding(false);
    setFormData({ type: 'Ofício', requester: '', subject: '' });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold dark:text-neutral-100">Controle de Numeração</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Geração de números sequenciais para Ofícios, Decretos e Memorandos.</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none dark:text-neutral-100 min-w-[150px]"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="Ofício">Ofício</option>
            <option value="Decreto">Decreto</option>
            <option value="Memorando">Memorando</option>
            <option value="Portaria">Portaria</option>
          </select>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Gerar Número
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
                <option value="Memorando">Memorando</option>
                <option value="Portaria">Portaria</option>
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
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400 transition-colors">Cancelar</button>
            <button onClick={handleAdd} disabled={!formData.requester || !formData.subject} className="px-6 py-3 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 disabled:opacity-50 transition-opacity">Gerar Documento</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-[10px] uppercase font-black tracking-widest text-neutral-400 dark:text-neutral-500">
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Assunto</th>
                <th className="px-6 py-4">Solicitante</th>
                <th className="px-6 py-4 text-center">Data</th>
                <th className="px-6 py-4 text-center">Anexo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-neutral-900 dark:text-neutral-100 font-medium">
                      {record.type.toUpperCase()}&nbsp;<span className="font-bold text-sky-600 dark:text-sky-400">{String(record.number).padStart(3, '0')}/{record.year}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-3 py-1 rounded-full text-xs font-medium">
                      {record.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-700 dark:text-neutral-300">
                    {record.subject}
                  </td>
                  <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                    {record.requester}
                  </td>
                  <td className="px-6 py-4 text-center text-neutral-500 dark:text-neutral-500">
                    {record.dateCreated}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {record.attachment ? (
                      <button 
                        onClick={() => showToast('Botão em desenvolvimento', 'warning')}
                        className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 justify-center w-full"
                      >
                        <FileText size={14} />
                        <span className="text-xs font-bold truncate max-w-[80px]" title={record.attachment}>{record.attachment}</span>
                      </button>
                    ) : (
                      <label className="text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer flex items-center justify-center gap-1 transition-colors">
                        <Upload size={14} />
                        <span className="text-xs font-bold">Anexar</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              onUpdate(record.id, { attachment: e.target.files[0].name });
                            }
                          }}
                        />
                      </label>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 dark:text-neutral-500 text-sm font-bold">
                    Nenhum documento encontrado.
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

export { DocumentNumbersModule };
