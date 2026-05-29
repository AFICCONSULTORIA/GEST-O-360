import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Package, AlertTriangle, AlertCircle, Edit2, Trash2, XCircle, FileText, Calendar as CalendarIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';

export interface Medication {
  id: string;
  name: string;
  active_ingredient: string;
  dosage: string;
  form: string;
  quantity: number;
  expiration_date: string;
  batch_number: string;
  created_at?: string;
}

const COMMON_FORMS = [
  'Comprimido',
  'Cápsula',
  'Xarope',
  'Suspensão',
  'Solução',
  'Gotas',
  'Pomada',
  'Creme',
  'Injetável'
];

export const FarmaciaModule = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState<{isOpen: boolean, type: 'in' | 'out', med: Medication | null}>({isOpen: false, type: 'in', med: null});

  const loadMedications = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar medicamentos:', error);
      showToast('Erro ao carregar medicamentos', 'error');
    } else if (data) {
      setMedications(data as Medication[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMedications();

    const channel = supabase
      .channel('medications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'medications'
        },
        () => {
          loadMedications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const deleteMedication = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este medicamento do sistema?')) return;
    const { error } = await supabase.from('medications').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir medicamento', 'error');
    } else {
      setMedications(medications.filter(m => m.id !== id));
      showToast('Medicamento excluído com sucesso!', 'success');
    }
  };

  const isExpiringSoon = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(expDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 60 && expDate > today; // less than 60 days
  };

  const isExpired = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const today = new Date();
    return expDate < today;
  };

  const filtered = medications.filter(m => {
    const search = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(search) || m.active_ingredient.toLowerCase().includes(search);
  });

  const lowStockCount = medications.filter(m => m.quantity < 50).length;
  const expiredCount = medications.filter(m => isExpired(m.expiration_date)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-6">
        <div>
          <h2 className="text-2xl font-bold italic tracking-tight uppercase dark:text-neutral-100 flex items-center gap-3">
            <span className="bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 p-2 rounded-xl">
              <Package size={24} />
            </span>
            Farmácia SUS
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">Controle de estoque, dispensação e validade de medicamentos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text"
              placeholder="Buscar medicamento ou princípio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 transition-all min-w-[300px] dark:text-white"
            />
          </div>

          <button 
            onClick={() => { setEditingMedication(null); setIsModalOpen(true); }}
            className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-sky-500/30 flex items-center gap-2"
          >
            <Plus size={18} /> Cadastrar Medicamento
          </button>
        </div>
      </div>

      {(lowStockCount > 0 || expiredCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4 rounded-2xl flex items-center gap-4">
              <div className="bg-amber-100 dark:bg-amber-500/20 p-3 rounded-xl text-amber-600 dark:text-amber-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm">Estoque Baixo</h4>
                <p className="text-xs text-amber-700 dark:text-amber-500/70">{lowStockCount} medicamento(s) com menos de 50 unidades.</p>
              </div>
            </div>
          )}
          {expiredCount > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 rounded-2xl flex items-center gap-4">
              <div className="bg-red-100 dark:bg-red-500/20 p-3 rounded-xl text-red-600 dark:text-red-400">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-red-900 dark:text-red-400 text-sm">Atenção à Validade</h4>
                <p className="text-xs text-red-700 dark:text-red-500/70">{expiredCount} medicamento(s) vencido(s).</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 text-xs font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                <th className="p-4">Medicamento</th>
                <th className="p-4">Princípio Ativo</th>
                <th className="p-4">Apresentação</th>
                <th className="p-4">Estoque</th>
                <th className="p-4">Validade / Lote</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(med => {
                const expired = isExpired(med.expiration_date);
                const expiringSoon = isExpiringSoon(med.expiration_date);
                const lowStock = med.quantity < 50;
                
                return (
                  <tr key={med.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-neutral-900 dark:text-neutral-100">{med.name}</div>
                    </td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {med.active_ingredient}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium dark:text-neutral-300">{med.dosage}</div>
                      <div className="text-xs text-neutral-500">{med.form}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black ${
                          lowStock ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {med.quantity}
                        </span>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => setIsStockModalOpen({isOpen: true, type: 'in', med})} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">
                            Entrada
                          </button>
                          <button onClick={() => setIsStockModalOpen({isOpen: true, type: 'out', med})} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20">
                            Saída
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`text-sm font-bold flex items-center gap-1.5 ${
                        expired ? 'text-red-600 dark:text-red-400' : 
                        expiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-700 dark:text-neutral-300'
                      }`}>
                        <CalendarIcon size={14} /> 
                        {med.expiration_date.split('-').reverse().join('/')}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono mt-0.5">Lote: {med.batch_number}</div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => { setEditingMedication(med); setIsModalOpen(true); }}
                        className="p-2 text-neutral-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 dark:hover:text-sky-400 rounded-lg transition-colors"
                        title="Editar Medicamento"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteMedication(med.id)}
                        className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-neutral-400">
                    <Package size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">Nenhum medicamento encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <MedicationModal 
            medication={editingMedication}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => { loadMedications(); setIsModalOpen(false); }}
          />
        )}
        {isStockModalOpen.isOpen && isStockModalOpen.med && (
          <StockModal 
            medication={isStockModalOpen.med}
            type={isStockModalOpen.type}
            onClose={() => setIsStockModalOpen({isOpen: false, type: 'in', med: null})}
            onSuccess={() => { loadMedications(); setIsStockModalOpen({isOpen: false, type: 'in', med: null}); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MedicationModal = ({ medication, onClose, onSuccess }: { medication: Medication | null, onClose: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState<Partial<Medication>>(
    medication || {
      name: '',
      active_ingredient: '',
      dosage: '',
      form: COMMON_FORMS[0],
      quantity: 0,
      expiration_date: '',
      batch_number: ''
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (medication) {
      const { error } = await supabase.from('medications').update(formData).eq('id', medication.id);
      if (error) {
        showToast('Erro ao atualizar medicamento.', 'error');
      } else {
        showToast('Medicamento atualizado com sucesso!', 'success');
        onSuccess();
      }
    } else {
      const newMed = {
        id: Math.random().toString(36).substring(2, 10),
        ...formData
      };
      const { error } = await supabase.from('medications').insert(newMed);
      if (error) {
        showToast('Erro ao cadastrar medicamento.', 'error');
      } else {
        showToast('Medicamento cadastrado com sucesso!', 'success');
        onSuccess();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-sky-50 dark:bg-sky-900/20">
          <h3 className="text-xl font-black text-sky-900 dark:text-sky-100 flex items-center gap-2">
            <Package size={24} className="text-sky-600 dark:text-sky-400" /> 
            {medication ? 'Editar Medicamento' : 'Novo Medicamento'}
          </h3>
          <button onClick={onClose} className="p-2 bg-white dark:bg-neutral-800 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <XCircle size={20} className="text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Nome Comercial / Genérico *</label>
              <input 
                type="text" required
                value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
                placeholder="Ex: Amoxicilina, Dipirona, Losartana"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Princípio Ativo *</label>
              <input 
                type="text" required
                value={formData.active_ingredient || ''} onChange={e => setFormData({...formData, active_ingredient: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
                placeholder="Ex: Paracetamol"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Dosagem / Concentração *</label>
              <input 
                type="text" required
                value={formData.dosage || ''} onChange={e => setFormData({...formData, dosage: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
                placeholder="Ex: 500mg, 50mg/ml"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Forma Farmacêutica *</label>
              <select 
                required
                value={formData.form || COMMON_FORMS[0]} onChange={e => setFormData({...formData, form: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
              >
                {COMMON_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Quantidade em Estoque *</label>
              <input 
                type="number" required min="0"
                value={formData.quantity !== undefined ? formData.quantity : 0} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
                disabled={!!medication} // If editing, quantity should be changed via the stock modal usually, but we can allow it here or disable it. Disable for safety.
                title={medication ? "Use os botões Entrada/Saída para alterar o estoque" : ""}
              />
              {medication && <p className="text-[10px] text-neutral-500 px-1">Use os botões de Entrada/Saída para ajustar.</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Data de Validade *</label>
              <input 
                type="date" required
                value={formData.expiration_date || ''} onChange={e => setFormData({...formData, expiration_date: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Número do Lote *</label>
              <input 
                type="text" required
                value={formData.batch_number || ''} onChange={e => setFormData({...formData, batch_number: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
                placeholder="Ex: LT-202305X"
              />
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-sky-500/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : medication ? 'Atualizar Medicamento' : 'Cadastrar Medicamento'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const StockModal = ({ medication, type, onClose, onSuccess }: { medication: Medication, type: 'in' | 'out', onClose: () => void, onSuccess: () => void }) => {
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setIsSubmitting(true);
    let newQuantity = medication.quantity;
    
    if (type === 'in') {
      newQuantity += amount;
    } else {
      if (amount > medication.quantity) {
        showToast('Quantidade de saída maior que o estoque!', 'error');
        setIsSubmitting(false);
        return;
      }
      newQuantity -= amount;
    }

    const { error } = await supabase.from('medications').update({ quantity: newQuantity }).eq('id', medication.id);
    
    if (error) {
      showToast('Erro ao atualizar estoque.', 'error');
    } else {
      showToast(`Estoque atualizado com sucesso!`, 'success');
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className={`px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center ${
          type === 'in' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
        }`}>
          <h3 className={`text-lg font-black flex items-center gap-2 ${
            type === 'in' ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'
          }`}>
            {type === 'in' ? <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" /> : <TrendingDown size={20} className="text-amber-600 dark:text-amber-400" />} 
            {type === 'in' ? 'Entrada de Estoque' : 'Saída de Estoque'}
          </h3>
          <button onClick={onClose} className="p-1.5 bg-white dark:bg-neutral-800 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <XCircle size={20} className="text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center space-y-1">
            <p className="font-bold text-neutral-900 dark:text-white">{medication.name}</p>
            <p className="text-xs text-neutral-500">{medication.dosage} - {medication.form}</p>
            <p className="text-sm font-medium mt-2">Estoque atual: <span className="font-black">{medication.quantity}</span></p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Quantidade</label>
            <input 
              type="number" required min="1" max={type === 'out' ? medication.quantity : undefined}
              value={amount || ''} onChange={e => setAmount(parseInt(e.target.value) || 0)}
              className={`w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-center text-2xl font-black focus:ring-4 outline-none transition-all dark:text-white ${
                type === 'in' ? 'focus:ring-emerald-500/10' : 'focus:ring-amber-500/10'
              }`}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || amount <= 0}
            className={`w-full text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 ${
              type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30'
            }`}
          >
            {isSubmitting ? 'Processando...' : 'Confirmar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
