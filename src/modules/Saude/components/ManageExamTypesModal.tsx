import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldAlert, Plus, Search, Edit2, Trash2, CheckCircle2, 
  Clock, DollarSign, FileText, AlertTriangle, Sparkles, Filter,
  ArrowRight, ShieldCheck, Check
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { ExamType, ExamCategory, COMMON_EXAM_CATEGORIES, generateUUID } from '../types';

interface ManageExamTypesModalProps {
  examTypes: ExamType[];
  currentInstitution?: { id: string; name?: string } | null;
  onClose: () => void;
  onRefresh: () => void;
}

const COMMON_INTERVAL_PRESETS = [
  { label: '15 dias', value: 15, hint: 'Controle rápido' },
  { label: '30 dias', value: 30, hint: '1 mês (Padrão SUS)' },
  { label: '60 dias', value: 60, hint: '2 meses (Bimestral)' },
  { label: '90 dias', value: 90, hint: '3 meses (Trimestral)' },
  { label: '180 dias', value: 180, hint: '6 meses (Semestral)' },
  { label: '365 dias', value: 365, hint: '1 ano (Anual/Preventivo)' },
];

export const ManageExamTypesModal: React.FC<ManageExamTypesModalProps> = ({
  examTypes,
  currentInstitution,
  onClose,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  
  // Estado para formulário de cadastro / edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExamType, setEditingExamType] = useState<ExamType | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ExamCategory>('Laboratorial');
  const [formInterval, setFormInterval] = useState<number>(30);
  const [formPreparation, setFormPreparation] = useState('');
  const [formCost, setFormCost] = useState<string>('25.00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edição rápida de carência inline
  const [quickEditingId, setQuickEditingId] = useState<string | null>(null);
  const [quickIntervalValue, setQuickIntervalValue] = useState<number>(30);

  // Filtrar exames
  const filteredExams = useMemo(() => {
    return examTypes.filter(exam => {
      const matchSearch = exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.preparation_instructions && exam.preparation_instructions.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory = filterCategory === 'todas' || exam.category === filterCategory;
      return matchSearch && matchCategory;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [examTypes, searchQuery, filterCategory]);

  // Abrir formulário para novo exame
  const handleOpenNew = () => {
    setEditingExamType(null);
    setFormName('');
    setFormCategory('Laboratorial');
    setFormInterval(30);
    setFormPreparation('');
    setFormCost('25.00');
    setIsFormOpen(true);
  };

  // Abrir formulário para edição
  const handleOpenEdit = (exam: ExamType) => {
    setEditingExamType(exam);
    setFormName(exam.name);
    setFormCategory(exam.category);
    setFormInterval(exam.min_interval_days || 30);
    setFormPreparation(exam.preparation_instructions || '');
    setFormCost(exam.estimated_cost ? exam.estimated_cost.toFixed(2) : '0.00');
    setIsFormOpen(true);
  };

  // Salvar novo exame ou atualizar existente
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      showToast('Por favor, informe o nome do exame.', 'error');
      return;
    }

    if (formInterval < 1) {
      showToast('O prazo de carência deve ser de no mínimo 1 dia.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedCost = parseFloat(formCost.replace(',', '.')) || 0;
      const payload: Partial<ExamType> = {
        name: trimmedName,
        category: formCategory,
        min_interval_days: formInterval,
        preparation_instructions: formPreparation.trim() || undefined,
        estimated_cost: parsedCost,
        is_active: true,
        institution_id: currentInstitution?.id || null
      };

      if (editingExamType) {
        // Atualizar no Supabase
        const { error } = await supabase
          .from('exam_types')
          .update(payload)
          .eq('id', editingExamType.id);

        if (error) {
          console.warn('Erro ao atualizar exame no Supabase:', error);
        }

        // Atualizar também na persistência local
        try {
          const rawLocal = localStorage.getItem('gestao360_custom_exam_types');
          let localList: ExamType[] = rawLocal ? JSON.parse(rawLocal) : [];
          localList = localList.map(t => t.id === editingExamType.id ? { ...t, ...payload } as ExamType : t);
          localStorage.setItem('gestao360_custom_exam_types', JSON.stringify(localList));
        } catch (e) {
          console.error(e);
        }

        showToast(`Exame "${trimmedName}" e carência de ${formInterval} dias atualizados!`, 'success');
      } else {
        // Cadastrar novo
        const newId = generateUUID();
        const newRecord: ExamType = {
          id: newId,
          ...payload
        } as ExamType;

        const { error } = await supabase
          .from('exam_types')
          .insert([{ id: newId, ...payload }]);

        if (error) {
          console.warn('Erro ao inserir exame no Supabase:', error);
        }

        // Persistir localmente
        try {
          const rawLocal = localStorage.getItem('gestao360_custom_exam_types');
          const localList: ExamType[] = rawLocal ? JSON.parse(rawLocal) : [];
          localList.push(newRecord);
          localStorage.setItem('gestao360_custom_exam_types', JSON.stringify(localList));
        } catch (e) {
          console.error(e);
        }

        showToast(`Novo exame "${trimmedName}" cadastrado com carência de ${formInterval} dias!`, 'success');
      }

      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao salvar exame: ' + (err.message || 'Tente novamente.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Atualização rápida de carência direta na tabela
  const handleQuickSaveInterval = async (exam: ExamType, newDays: number) => {
    try {
      const { error } = await supabase
        .from('exam_types')
        .update({ min_interval_days: newDays })
        .eq('id', exam.id);

      if (error) {
        console.warn('Erro ao atualizar carência no Supabase:', error);
      }

      // Atualizar localmente
      try {
        const rawLocal = localStorage.getItem('gestao360_custom_exam_types');
        let localList: ExamType[] = rawLocal ? JSON.parse(rawLocal) : [];
        const exists = localList.some(t => t.id === exam.id);
        if (exists) {
          localList = localList.map(t => t.id === exam.id ? { ...t, min_interval_days: newDays } : t);
        } else {
          localList.push({ ...exam, min_interval_days: newDays });
        }
        localStorage.setItem('gestao360_custom_exam_types', JSON.stringify(localList));
      } catch (e) {
        console.error(e);
      }

      showToast(`Carência do exame "${exam.name}" atualizada para ${newDays} dias!`, 'success');
      setQuickEditingId(null);
      onRefresh();
    } catch (err: any) {
      showToast('Erro ao atualizar carência: ' + err.message, 'error');
    }
  };

  // Excluir procedimento
  const handleDeleteExam = async (exam: ExamType) => {
    if (!window.confirm(`Tem certeza que deseja remover o exame "${exam.name}" do catálogo municipal?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('exam_types')
        .delete()
        .eq('id', exam.id);

      if (error) {
        console.warn('Erro ao excluir no Supabase:', error);
      }

      // Remover do local storage
      try {
        const rawLocal = localStorage.getItem('gestao360_custom_exam_types');
        if (rawLocal) {
          const localList: ExamType[] = JSON.parse(rawLocal);
          const updated = localList.filter(t => t.id !== exam.id);
          localStorage.setItem('gestao360_custom_exam_types', JSON.stringify(updated));
        }
      } catch (e) {
        console.error(e);
      }

      showToast(`Exame "${exam.name}" removido do catálogo!`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast('Erro ao excluir exame: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 my-6 flex flex-col max-h-[92vh]"
      >
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <ShieldAlert size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Catálogo de Exames & Prazos de Carência</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-blue-100 px-2 py-0.5 rounded-full">
                  {examTypes.length} procedimentos
                </span>
              </div>
              <p className="text-xs text-blue-100/85">
                Configure o intervalo mínimo recomendado entre repetições para a regra anti-duplicidade SUS
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Modal com rolagem */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-neutral-800 dark:text-neutral-200">
          
          {/* Barra Superior: Busca, Filtros e Botão de Novo Exame */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text"
                  placeholder="Pesquisar exame pelo nome ou preparo..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas as Categorias</option>
                {COMMON_EXAM_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenNew}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus size={15} /> Cadastrar Novo Exame
            </button>
          </div>

          {/* FORMULÁRIO DE CADASTRO / EDIÇÃO DE EXAME & CARÊNCIA (QUANDO ABERTO) */}
          <AnimatePresence>
            {isFormOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <form 
                  onSubmit={handleSaveExam}
                  className="bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-800/80 rounded-2xl p-5 space-y-4 text-xs"
                >
                  <div className="flex justify-between items-center border-b border-blue-200 dark:border-blue-800/60 pb-3">
                    <h4 className="font-black text-sm text-blue-950 dark:text-blue-200 flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-600" />
                      {editingExamType ? 'Editar Exame e Prazo de Carência' : 'Cadastrar Novo Exame com Prazo de Carência'}
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setIsFormOpen(false)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="md:col-span-2 space-y-1">
                      <label className="font-black uppercase tracking-wider text-[10px] text-neutral-600 dark:text-neutral-300">
                        Nome do Exame / Procedimento *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="Ex: Hemograma Completo, Ressonância Magnética, Ecocardiograma..."
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-[10px] text-neutral-600 dark:text-neutral-300">
                        Categoria *
                      </label>
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value as ExamCategory)}
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {COMMON_EXAM_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SELEÇÃO DO PRAZO DE CARÊNCIA ANTI-DUPLICIDADE */}
                  <div className="space-y-2 bg-white dark:bg-neutral-800 p-4 rounded-xl border border-blue-200 dark:border-blue-800/60">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <label className="font-black uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <ShieldAlert size={14} /> Prazo de Carência Anti-Duplicidade (Intervalo Mínimo em Dias) *
                      </label>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        Período configurado: <strong className="text-rose-600 font-black">{formInterval} dias</strong>
                      </span>
                    </div>

                    {/* Botões Rápidos de Carência */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {COMMON_INTERVAL_PRESETS.map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setFormInterval(preset.value)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1 cursor-pointer border ${
                            formInterval === preset.value
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-neutral-50 dark:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-rose-400'
                          }`}
                        >
                          {formInterval === preset.value && <Check size={13} />}
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 font-medium">Ou digite o valor exato:</span>
                        <input 
                          type="number"
                          min="1"
                          required
                          value={formInterval}
                          onChange={e => setFormInterval(parseInt(e.target.value) || 1)}
                          className="w-24 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-neutral-500 font-bold">dias</span>
                      </div>

                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic">
                        ↳ Repetições solicitadas em menos de <strong>{formInterval} dias</strong> serão sinalizadas à regulação.
                      </p>
                    </div>
                  </div>

                  {/* Preparo e Custo Estimado */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="md:col-span-2 space-y-1">
                      <label className="font-black uppercase tracking-wider text-[10px] text-neutral-600 dark:text-neutral-300">
                        Instruções de Preparo para o Munícipe (Opcional)
                      </label>
                      <input 
                        type="text"
                        value={formPreparation}
                        onChange={e => setFormPreparation(e.target.value)}
                        placeholder="Ex: Jejum obrigatório de 8 a 12 horas. Ingestão moderada de água..."
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-[10px] text-neutral-600 dark:text-neutral-300 flex items-center gap-1">
                        <DollarSign size={12} className="text-emerald-600" /> Custo Ref. (R$)
                      </label>
                      <input 
                        type="text"
                        value={formCost}
                        onChange={e => setFormCost(e.target.value)}
                        placeholder="Ex: 35.00"
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-mono outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      {isSubmitting ? 'Salvando...' : (editingExamType ? 'Atualizar Exame & Carência' : 'Salvar no Catálogo')}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TABELA DE EXAMES E CARÊNCIAS */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900">
            <div className="bg-neutral-50 dark:bg-neutral-800/60 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Procedimentos no Catálogo ({filteredExams.length})
              </span>
              <span className="text-[11px] text-neutral-400">
                Clique na carência para alterar rapidamente
              </span>
            </div>

            {filteredExams.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 italic text-xs">
                Nenhum procedimento encontrado com o termo "{searchQuery}".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-400 bg-neutral-50/50 dark:bg-neutral-800/30">
                      <th className="py-3 px-4">Exame / Procedimento</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Prazo de Carência Anti-Duplicidade</th>
                      <th className="py-3 px-4">Instruções de Preparo</th>
                      <th className="py-3 px-4">Custo Ref.</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filteredExams.map(exam => {
                      const isQuickEditing = quickEditingId === exam.id;

                      return (
                        <tr key={exam.id || exam.name} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3 px-4 font-black text-neutral-900 dark:text-white">
                            {exam.name}
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                              {exam.category}
                            </span>
                          </td>

                          {/* Prazo de Carência com Edição Rápida */}
                          <td className="py-3 px-4">
                            {isQuickEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="number"
                                  min="1"
                                  value={quickIntervalValue}
                                  onChange={e => setQuickIntervalValue(parseInt(e.target.value) || 1)}
                                  className="w-20 px-2 py-1 bg-white dark:bg-neutral-800 border border-blue-500 rounded-lg text-xs font-mono font-bold outline-none"
                                />
                                <span className="text-[11px] text-neutral-500 font-bold">dias</span>
                                <button
                                  type="button"
                                  onClick={() => handleQuickSaveInterval(exam, quickIntervalValue)}
                                  className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
                                  title="Salvar carência"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuickEditingId(null)}
                                  className="p-1 text-neutral-400 hover:text-neutral-600 rounded-md cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickEditingId(exam.id);
                                  setQuickIntervalValue(exam.min_interval_days || 30);
                                }}
                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-bold transition-all cursor-pointer"
                                title="Clique para alterar rapidamente o prazo de carência"
                              >
                                <ShieldAlert size={13} className="text-rose-600 shrink-0" />
                                <span>{exam.min_interval_days || 30} dias de carência</span>
                                <Edit2 size={11} className="opacity-0 group-hover:opacity-100 text-rose-500 ml-1 transition-opacity" />
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 max-w-xs truncate" title={exam.preparation_instructions}>
                            {exam.preparation_instructions || 'Nenhum preparo especial'}
                          </td>

                          <td className="py-3 px-4 font-mono text-neutral-700 dark:text-neutral-300">
                            {exam.estimated_cost ? `R$ ${exam.estimated_cost.toFixed(2)}` : 'R$ 0,00'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(exam)}
                                className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer"
                                title="Editar exame completo"
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteExam(exam)}
                                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                title="Remover exame"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex justify-between items-center text-xs">
          <div className="text-neutral-500">
            Total no catálogo: <strong className="text-neutral-900 dark:text-white font-bold">{examTypes.length}</strong> exames regulados
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
