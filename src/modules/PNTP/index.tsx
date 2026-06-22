import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RADAR_DATA } from '../../lib/mockData';
import { 
  PNTPItem, PNTPCategory, Evidence
} from '../../types';
import { showToast } from '../../components/ui/Toast';

// Destructure common icons to avoid changing code
const { 
  Plus, Search, Filter, Edit2, Trash2, Eye, FileText, ClipboardCheck, TrendingUp, TrendingDown, ChevronRight, ShieldAlert, Download, CircleOff, History, Info, CheckCircle2, AlertCircle, AlertTriangle, Package, LayoutDashboard, Calendar, FileBox, FileSignature, Landmark, ShieldCheck, ArrowRight, Settings, ChevronLeft, CalendarClock, Briefcase, Users, Activity, Building2, Trees, CircleDollarSign, Tractor, HeartHandshake, Trophy, BookOpen, PieChart: PieChartIcon, AlarmClock, Clock, Target, Upload, GraduationCap, Home, Bus, Salad, Users2, Leaf, BookText, Truck, Globe, FileBadge, X, Printer, ArrowUpRight, CheckSquare, FileSpreadsheet, Play, Sparkles
} = LucideIcons;

// Define custom interface for tasks
interface PNTPTask {
  id: string;
  itemRef: string;
  categoryRef: string;
  task: string;
  department: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

const DEFAULT_DEPARTMENTS: Record<string, string> = {
  'Receitas': 'Administração e Finanças',
  'Despesas': 'Administração e Finanças',
  'Licitações': 'Administração e Finanças',
  'Contratos': 'Administração e Finanças',
  'Folha de Pagamento': 'Administração e Finanças',
  'Obras Públicas': 'Viação e Obras',
  'Diárias': 'Administração e Finanças',
  'Convênios': 'Administração e Finanças',
  'Relatórios Fiscais': 'Administração e Finanças',
  'Ouvidoria/e-SIC': 'Administração e Finanças',
  'Estrutura Organizacional': 'Administração e Finanças',
  'Perguntas Frequentes': 'Administração e Finanças',
};

const INITIAL_TASKS: PNTPTask[] = [
  {
    id: 'task_1',
    itemRef: 'Obras Públicas',
    categoryRef: 'Essenciais',
    task: 'Cadastrar o Plano de Obras Públicas 2026 no Portal de Transparência',
    department: 'Viação e Obras',
    deadline: '2026-07-15',
    status: 'in_progress',
    notes: 'Aguardando o envio do cronograma físico-financeiro consolidado pela engenharia.'
  },
  {
    id: 'task_2',
    itemRef: 'Licitações',
    categoryRef: 'Prioritários',
    task: 'Homologar editais pendentes do primeiro trimestre no Portal de Contratações (PNTP)',
    department: 'Administração e Finanças',
    deadline: '2026-07-05',
    status: 'pending',
    notes: 'Exige assinatura digital do secretário de finanças.'
  },
  {
    id: 'task_3',
    itemRef: 'Perguntas Frequentes',
    categoryRef: 'Obrigatórios',
    task: 'Criar painel de FAQ para dúvidas de cidadãos no portal e-SIC',
    department: 'Administração e Finanças',
    deadline: '2026-07-25',
    status: 'pending',
    notes: 'Elaborar respostas rápidas com a Controladoria Geral.'
  }
];

const DEPARTMENTS_LIST = [
  'Administração e Finanças',
  'Viação e Obras',
  'Educação',
  'Saúde',
  'Serviços Públicos',
  'Meio Ambiente',
  'Tributos',
  'Agricultura',
  'Assistência Social',
  'Esporte',
  'Planejamento'
];

const PNTPModule = ({ selectedYear }: { selectedYear: string }) => {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'radar' | 'simulator' | 'tasks' | 'dossier'>('radar');

  // Categories & Tasks State
  const [categories, setCategories] = useState<PNTPCategory[]>([]);
  const [tasks, setTasks] = useState<PNTPTask[]>([]);

  // Filtering states for Radar view
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'compliant' | 'partial' | 'non-compliant'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modal states
  const [editingItem, setEditingItem] = useState<{ category: string, item: PNTPItem } | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<Omit<PNTPTask, 'id'>>({
    itemRef: '',
    categoryRef: '',
    task: '',
    department: 'Administração e Finanças',
    deadline: '',
    status: 'pending',
    notes: ''
  });

  // Simulator state: set of item names simulated as completed
  const [simulatedItems, setSimulatedItems] = useState<Set<string>>(new Set());

  // Evidence editing state (inside the editingItem modal)
  const [newEvidenceLabel, setNewEvidenceLabel] = useState('');
  const [newEvidenceType, setNewEvidenceType] = useState<Evidence['type']>('URL');
  const [newEvidenceLink, setNewEvidenceLink] = useState('');

  // ----------------------------------------------------
  // DATA LOAD & STORAGE
  // ----------------------------------------------------
  useEffect(() => {
    const savedCategories = localStorage.getItem(`gestao360_pntp_categories_${selectedYear}`);
    const savedTasks = localStorage.getItem(`gestao360_pntp_tasks_${selectedYear}`);

    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      // Clone from RADAR_DATA and inject departments if missing
      const initialCats = JSON.parse(JSON.stringify(RADAR_DATA)).map((cat: any) => ({
        ...cat,
        items: cat.items.map((item: any) => ({
          ...item,
          department: DEFAULT_DEPARTMENTS[item.name] || 'Administração e Finanças'
        }))
      }));
      setCategories(initialCats);
      localStorage.setItem(`gestao360_pntp_categories_${selectedYear}`, JSON.stringify(initialCats));
    }

    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      setTasks(INITIAL_TASKS);
      localStorage.setItem(`gestao360_pntp_tasks_${selectedYear}`, JSON.stringify(INITIAL_TASKS));
    }
  }, [selectedYear]);

  // Helper to persist categories
  const saveCategories = (newCats: PNTPCategory[]) => {
    setCategories(newCats);
    localStorage.setItem(`gestao360_pntp_categories_${selectedYear}`, JSON.stringify(newCats));
  };

  // Helper to persist tasks
  const saveTasks = (newTasks: PNTPTask[]) => {
    setTasks(newTasks);
    localStorage.setItem(`gestao360_pntp_tasks_${selectedYear}`, JSON.stringify(newTasks));
  };

  // ----------------------------------------------------
  // CALCULATIONS (DYNAMICS)
  // ----------------------------------------------------
  const calculateCategoryScore = (items: PNTPItem[]) => {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = items.reduce((sum, i) => sum + (i.score * i.weight), 0);
    return Math.round((weightedSum / totalWeight) * 10) / 10;
  };

  const currentOverallScore = useMemo(() => {
    let totalWeight = 0;
    let weightedSum = 0;
    categories.forEach(cat => {
      cat.items.forEach(item => {
        totalWeight += item.weight;
        weightedSum += item.score * item.weight;
      });
    });
    if (totalWeight === 0) return 0;
    return Math.round((weightedSum / totalWeight) * 10) / 10;
  }, [categories]);

  // Simulated calculations
  const simulatedOverallScore = useMemo(() => {
    let totalWeight = 0;
    let weightedSum = 0;
    categories.forEach(cat => {
      cat.items.forEach(item => {
        totalWeight += item.weight;
        const score = simulatedItems.has(item.name) ? 100 : item.score;
        weightedSum += score * item.weight;
      });
    });
    if (totalWeight === 0) return 0;
    return Math.round((weightedSum / totalWeight) * 10) / 10;
  }, [categories, simulatedItems]);

  const getSealInfo = (score: number) => {
    if (score >= 95) {
      return { 
        name: 'Diamante', 
        color: 'text-emerald-500 dark:text-emerald-400', 
        bg: 'bg-emerald-50 dark:bg-emerald-500/10', 
        border: 'border-emerald-200 dark:border-emerald-800/30', 
        badgeColor: 'bg-emerald-500', 
        nextThreshold: null as number | null, 
        nextName: '' 
      };
    } else if (score >= 85) {
      return { 
        name: 'Ouro', 
        color: 'text-amber-500 dark:text-amber-400', 
        bg: 'bg-amber-50 dark:bg-amber-500/10', 
        border: 'border-amber-200 dark:border-amber-800/30', 
        badgeColor: 'bg-amber-500', 
        nextThreshold: 95 as number | null, 
        nextName: 'Diamante' 
      };
    } else if (score >= 75) {
      return { 
        name: 'Prata', 
        color: 'text-sky-500 dark:text-sky-400', 
        bg: 'bg-sky-50 dark:bg-sky-500/10', 
        border: 'border-sky-200 dark:border-sky-800/30', 
        badgeColor: 'bg-sky-500', 
        nextThreshold: 85 as number | null, 
        nextName: 'Ouro' 
      };
    } else {
      return { 
        name: 'Básico', 
        color: 'text-stone-500 dark:text-stone-400', 
        bg: 'bg-stone-50 dark:bg-stone-800', 
        border: 'border-stone-200 dark:border-stone-700', 
        badgeColor: 'bg-stone-500', 
        nextThreshold: 75 as number | null, 
        nextName: 'Prata' 
      };
    }
  };

  const currentSeal = getSealInfo(currentOverallScore);
  const simulatedSeal = getSealInfo(simulatedOverallScore);

  // Status helper colors/icons
  const getStatusColor = (status: PNTPItem['status']) => {
    switch (status) {
      case 'compliant': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
      case 'partial': return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';
      case 'non-compliant': return 'text-rose-500 bg-rose-50 dark:bg-rose-500/10';
      default: return 'text-neutral-400 bg-neutral-50 dark:bg-neutral-800';
    }
  };

  const getStatusLabel = (status: PNTPItem['status']) => {
    switch (status) {
      case 'compliant': return 'Conforme';
      case 'partial': return 'Parcial';
      case 'non-compliant': return 'Não Conforme';
    }
  };

  // ----------------------------------------------------
  // FILTERING LOGIC
  // ----------------------------------------------------
  const filteredItems = useMemo(() => {
    const list: Array<{ categoryName: string, item: PNTPItem }> = [];
    categories.forEach(cat => {
      if (selectedCategoryName && cat.category !== selectedCategoryName) return;
      cat.items.forEach(item => {
        // Search filter
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Status filter
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        
        // Department filter
        const dept = (item as any).department || DEFAULT_DEPARTMENTS[item.name] || 'Administração e Finanças';
        const matchesDept = deptFilter === 'all' || dept === deptFilter;

        if (matchesSearch && matchesStatus && matchesDept) {
          list.push({ categoryName: cat.category, item });
        }
      });
    });
    return list;
  }, [categories, selectedCategoryName, searchTerm, statusFilter, deptFilter]);

  // Unique departments present in indicators
  const departmentsWithIndicators = useMemo(() => {
    const set = new Set<string>();
    categories.forEach(cat => {
      cat.items.forEach(item => {
        set.add((item as any).department || DEFAULT_DEPARTMENTS[item.name] || 'Administração e Finanças');
      });
    });
    return Array.from(set).sort();
  }, [categories]);

  // ----------------------------------------------------
  // SIMULATOR ACTIONS
  // ----------------------------------------------------
  const pendingItemsForSimulator = useMemo(() => {
    const list: Array<{ categoryName: string, item: PNTPItem, impact: number }> = [];
    let totalWeight = 0;
    categories.forEach(cat => cat.items.forEach(i => totalWeight += i.weight));

    categories.forEach(cat => {
      cat.items.forEach(item => {
        if (item.score < 100) {
          // Impact is the possible score increase on the overall score
          const impact = ((100 - item.score) * item.weight) / (totalWeight || 1);
          list.push({ categoryName: cat.category, item, impact: Math.round(impact * 100) / 100 });
        }
      });
    });
    // Sort by highest impact first
    return list.sort((a, b) => b.impact - a.impact);
  }, [categories]);

  const toggleSimulated = (itemName: string) => {
    const next = new Set(simulatedItems);
    if (next.has(itemName)) {
      next.delete(itemName);
    } else {
      next.add(itemName);
    }
    setSimulatedItems(next);
  };

  const applySimulationAsTasks = () => {
    if (simulatedItems.size === 0) {
      showToast('Nenhum item selecionado para simulação.', 'warning');
      return;
    }
    
    const newTasksToAdd: PNTPTask[] = [];
    categories.forEach(cat => {
      cat.items.forEach(item => {
        if (simulatedItems.has(item.name)) {
          // Check if task already exists for this item
          const exists = tasks.some(t => t.itemRef === item.name && t.status !== 'completed');
          if (!exists) {
            newTasksToAdd.push({
              id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              itemRef: item.name,
              categoryRef: cat.category,
              task: `Subir conformidade do item "${item.name}" para 100% (Simulado)`,
              department: (item as any).department || DEFAULT_DEPARTMENTS[item.name] || 'Administração e Finanças',
              deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days deadline
              status: 'pending',
              notes: 'Tarefa criada automaticamente através do simulador de metas.'
            });
          }
        }
      });
    });

    if (newTasksToAdd.length > 0) {
      saveTasks([...tasks, ...newTasksToAdd]);
      showToast(`${newTasksToAdd.length} novas tarefas de metas criadas no Plano de Ação!`, 'success');
      setActiveTab('tasks');
      setSimulatedItems(new Set());
    } else {
      showToast('Todos os itens simulados já possuem tarefas ativas no Plano de Ação.', 'info');
    }
  };

  // ----------------------------------------------------
  // EVIDENCE & COMPLIANCE MANAGEMENT
  // ----------------------------------------------------
  const handleOpenEditItem = (categoryName: string, item: PNTPItem) => {
    setEditingItem({ category: categoryName, item: JSON.parse(JSON.stringify(item)) });
    setNewEvidenceLabel('');
    setNewEvidenceLink('');
  };

  const handleSaveItemChanges = () => {
    if (!editingItem) return;
    const { category, item } = editingItem;

    const newCats = categories.map(cat => {
      if (cat.category === category) {
        const newItems = cat.items.map(i => {
          if (i.name === item.name) {
            return item;
          }
          return i;
        });
        return {
          ...cat,
          items: newItems,
          score: calculateCategoryScore(newItems)
        };
      }
      return cat;
    });

    saveCategories(newCats);
    showToast(`Item "${item.name}" atualizado com sucesso!`, 'success');
    setEditingItem(null);
  };

  const handleAddEvidence = () => {
    if (!editingItem || !newEvidenceLabel.trim() || !newEvidenceLink.trim()) {
      showToast('Por favor preencha a etiqueta e o link da evidência.', 'warning');
      return;
    }

    const newEv: Evidence = {
      label: newEvidenceLabel,
      type: newEvidenceType,
      link: newEvidenceLink
    };

    const updatedItem = {
      ...editingItem.item,
      evidences: [...editingItem.item.evidences, newEv]
    };

    setEditingItem({ ...editingItem, item: updatedItem });
    setNewEvidenceLabel('');
    setNewEvidenceLink('');
    showToast('Evidência adicionada provisoriamente. Lembre-se de salvar.', 'info');
  };

  const handleRemoveEvidence = (index: number) => {
    if (!editingItem) return;

    const filteredEvs = editingItem.item.evidences.filter((_, i) => i !== index);
    const updatedItem = {
      ...editingItem.item,
      evidences: filteredEvs
    };

    setEditingItem({ ...editingItem, item: updatedItem });
    showToast('Evidência removida. Salve para persistir.', 'info');
  };

  const handleQuickStatusChange = (status: PNTPItem['status']) => {
    if (!editingItem) return;
    let score = editingItem.item.score;
    if (status === 'compliant') score = 100;
    if (status === 'non-compliant') score = 0;
    if (status === 'partial' && (score === 100 || score === 0)) score = 50;

    setEditingItem({
      ...editingItem,
      item: { ...editingItem.item, status, score }
    });
  };

  // ----------------------------------------------------
  // TASKS ACTIONS
  // ----------------------------------------------------
  const handleOpenAddTask = (itemRef?: string, categoryRef?: string) => {
    setTaskForm({
      itemRef: itemRef || '',
      categoryRef: categoryRef || '',
      task: '',
      department: itemRef ? (DEFAULT_DEPARTMENTS[itemRef] || 'Administração e Finanças') : 'Administração e Finanças',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      notes: ''
    });
    setTaskModalOpen(true);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.task.trim()) {
      showToast('Insira a descrição da tarefa.', 'warning');
      return;
    }

    // Auto find category if not selected but item is
    let categoryRef = taskForm.categoryRef;
    if (!categoryRef && taskForm.itemRef) {
      const found = categories.find(c => c.items.some(i => i.name === taskForm.itemRef));
      if (found) categoryRef = found.category;
    }

    const newTask: PNTPTask = {
      ...taskForm,
      categoryRef,
      id: `task_${Date.now()}`
    };

    saveTasks([...tasks, newTask]);
    setTaskModalOpen(false);
    showToast('Tarefa delegada com sucesso!', 'success');
  };

  const handleUpdateTaskStatus = (taskId: string, status: PNTPTask['status']) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status };
      }
      return t;
    });
    saveTasks(updated);

    // If task is completed, notify about uploading evidence
    if (status === 'completed') {
      const task = tasks.find(t => t.id === taskId);
      showToast(`Tarefa concluída! Não se esqueça de atualizar a evidência do item "${task?.itemRef}".`, 'success');
    } else {
      showToast('Status da tarefa atualizado.', 'info');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    saveTasks(updated);
    showToast('Tarefa excluída.', 'success');
  };

  const tasksByStatusCount = useMemo(() => {
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    };
  }, [tasks]);

  // ----------------------------------------------------
  // RENDER DYNAMIC GAUGES
  // ----------------------------------------------------
  const CircularProgress = ({ value, size = 70, strokeWidth = 6, colorClass = 'text-sky-500' }: { value: number, size?: number, strokeWidth?: number, colorClass?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;
    
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            className="text-neutral-100 dark:text-neutral-800"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={`${colorClass} transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-black text-neutral-800 dark:text-neutral-200">
          {Math.round(value)}%
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 relative">
      {/* ----------------------------------------------------
          MODAL: EDIT ITEM / EVIDENCE MANAGER
         ---------------------------------------------------- */}
      <AnimatePresence>
        {editingItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-y-auto max-h-[90vh] space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Categoria: {editingItem.category}
                  </span>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
                    {editingItem.item.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setEditingItem(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status and Score Editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                    Grau de Conformidade
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: 'compliant', label: 'Conforme' },
                      { id: 'partial', label: 'Parcial' },
                      { id: 'non-compliant', label: 'Não Conforme' }
                    ].map(status => (
                      <button
                        key={status.id}
                        type="button"
                        onClick={() => handleQuickStatusChange(status.id as any)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all border ${
                          editingItem.item.status === status.id
                            ? status.id === 'compliant' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                              : status.id === 'partial' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                              : 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                      Nota do Indicador
                    </label>
                    <span className="text-sm font-black text-neutral-900 dark:text-neutral-100">
                      {editingItem.item.score}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editingItem.item.score}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, score: Number(e.target.value) }
                      })}
                      className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-white"
                    />
                  </div>
                </div>
              </div>

              {/* Department responsibility selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                  Secretaria Responsável
                </label>
                <select
                  value={(editingItem.item as any).department || 'Administração e Finanças'}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, department: e.target.value } as any
                  })}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-200 dark:text-white"
                >
                  {DEPARTMENTS_LIST.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Evidence Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-sky-500" />
                  Evidências / Documentação
                </h4>

                <div className="space-y-2">
                  {editingItem.item.evidences.length > 0 ? (
                    editingItem.item.evidences.map((ev, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="text-neutral-400 dark:text-neutral-500" size={16} />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{ev.label}</span>
                            <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 tracking-wide uppercase">{ev.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={ev.link}
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-all"
                          >
                            Acessar Link
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveEvidence(index)}
                            className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 dark:hover:bg-rose-600 rounded-lg transition-all"
                            title="Remover Evidência"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-400">
                      Nenhum link ou documento cadastrado como evidência.
                    </div>
                  )}
                </div>

                {/* Add new evidence form inside modal */}
                <div className="p-4 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-800/20 space-y-3">
                  <span className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                    Nova Evidência
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Ex: Diário Oficial nº 124"
                      value={newEvidenceLabel}
                      onChange={(e) => setNewEvidenceLabel(e.target.value)}
                      className="px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none dark:text-white"
                    />
                    <select
                      value={newEvidenceType}
                      onChange={(e) => setNewEvidenceType(e.target.value as any)}
                      className="px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none dark:text-white cursor-pointer"
                    >
                      <option value="URL">Link (URL)</option>
                      <option value="PDF">PDF</option>
                      <option value="DOCX">Word (DOCX)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Link do Portal ou do Arquivo"
                      value={newEvidenceLink}
                      onChange={(e) => setNewEvidenceLink(e.target.value)}
                      className="px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEvidence}
                    className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-bold hover:shadow transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Adicionar Evidência
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={handleSaveItemChanges}
                  className="flex-1 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-6 py-3.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-2xl text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          MODAL: CREATE TASK
         ---------------------------------------------------- */}
      <AnimatePresence>
        {taskModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <ClipboardCheck size={22} className="text-sky-500" />
                  Nova Tarefa PNTP
                </h3>
                <button 
                  onClick={() => setTaskModalOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                    Descrição da Ação / Pendência
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Publicar relatório bimestral de Receitas no portal"
                    value={taskForm.task}
                    onChange={(e) => setTaskForm({ ...taskForm, task: e.target.value })}
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-200 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                      Indicador Vinculado
                    </label>
                    <select
                      value={taskForm.itemRef}
                      onChange={(e) => {
                        const val = e.target.value;
                        const defaultDept = DEFAULT_DEPARTMENTS[val] || 'Administração e Finanças';
                        setTaskForm({ ...taskForm, itemRef: val, department: defaultDept });
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    >
                      <option value="">Sem vínculo específico</option>
                      {categories.flatMap(cat => cat.items.map(item => (
                        <option key={item.name} value={item.name}>{item.name}</option>
                      )))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                      Secretaria Responsável
                    </label>
                    <select
                      value={taskForm.department}
                      onChange={(e) => setTaskForm({ ...taskForm, department: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    >
                      {DEPARTMENTS_LIST.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                      Prazo Limite
                    </label>
                    <input
                      type="date"
                      required
                      value={taskForm.deadline}
                      onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                      Prioridade Inicial
                    </label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none dark:text-white"
                    >
                      <option value="pending">Pendente (A Fazer)</option>
                      <option value="in_progress">Em Andamento</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                    Observações / Orientações
                  </label>
                  <textarea
                    placeholder="Instruções adicionais para a secretaria responsável..."
                    rows={3}
                    value={taskForm.notes}
                    onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-200 dark:text-white resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-sm font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-lg"
                  >
                    Delegar Tarefa
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskModalOpen(false)}
                    className="px-6 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-2xl text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          HEADER: RESUMO DO RADAR (PREMIUM BRAND CARD)
         ---------------------------------------------------- */}
      <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-sky-500/5 dark:bg-sky-500/3 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                Módulo Administrativo
              </span>
              <span className="text-[10px] font-bold text-neutral-400">Ciclo {selectedYear}</span>
            </div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
              <Globe className="text-sky-500 animate-pulse" size={32} />
              Radar Transparência Pública (ATRICON)
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-xl text-sm leading-relaxed">
              Monitore os índices oficiais do Tribunal de Contas, gerencie evidências das exigências federais e planeje ações para elevar o selo do município.
            </p>
          </div>

          <div className="flex items-center gap-8 bg-neutral-50/50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80 px-8 py-5 rounded-3xl w-full lg:w-auto">
            <div className="flex items-center gap-4">
              <CircularProgress 
                value={currentOverallScore} 
                colorClass={
                  currentOverallScore >= 95 ? 'text-emerald-500' :
                  currentOverallScore >= 85 ? 'text-amber-500' : 'text-sky-500'
                }
              />
              <div>
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                  Índice Municipal
                </p>
                <p className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
                  {currentOverallScore}%
                </p>
              </div>
            </div>

            <div className="h-10 w-px bg-neutral-200 dark:bg-neutral-800" />

            <div className="text-center">
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">
                Selo Conquistado
              </p>
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${currentSeal.bg} ${currentSeal.color} ${currentSeal.border}`}>
                {currentSeal.name}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic target progress bar */}
        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800/80">
          <div className="flex justify-between items-center text-xs font-bold text-neutral-400 dark:text-neutral-500 mb-2">
            <span>Progressão de Metas e Selos ATRICON</span>
            {currentSeal.nextThreshold && (
              <span className="text-sky-600 dark:text-sky-400">
                Faltam {Math.max(0, Math.round((currentSeal.nextThreshold - currentOverallScore) * 10) / 10)}% para o Selo {currentSeal.nextName}
              </span>
            )}
          </div>
          
          <div className="relative">
            {/* Base track */}
            <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${currentOverallScore}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-500 rounded-full"
              />
            </div>

            {/* Threshold pins */}
            <div className="absolute top-0 left-[75%] -translate-y-1.5 flex flex-col items-center">
              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
              <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-white dark:bg-neutral-900 px-1 mt-1 rounded">75% Prata</span>
            </div>
            <div className="absolute top-0 left-[85%] -translate-y-1.5 flex flex-col items-center">
              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
              <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 bg-white dark:bg-neutral-900 px-1 mt-1 rounded">85% Ouro</span>
            </div>
            <div className="absolute top-0 left-[95%] -translate-y-1.5 flex flex-col items-center">
              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
              <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 bg-white dark:bg-neutral-900 px-1 mt-1 rounded">95% Diamante</span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          TABS NAV BAR
         ---------------------------------------------------- */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        {[
          { id: 'radar', label: 'Indicadores & Evidências', icon: Globe },
          { id: 'simulator', label: 'Simulador de Selo', icon: Sparkles },
          { id: 'tasks', label: 'Plano de Ação', icon: ClipboardCheck, count: tasksByStatusCount.pending + tasksByStatusCount.in_progress },
          { id: 'dossier', label: 'Dossiê Exportável', icon: Printer }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm transition-all focus:outline-none relative -mb-[2px] ${
                activeTab === tab.id
                  ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] bg-sky-500 text-white font-black px-2 py-0.5 rounded-full ml-1 animate-pulse">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------
          TAB 1: RADAR & INDICADORES
         ---------------------------------------------------- */}
      {activeTab === 'radar' && (
        <div className="space-y-6">
          {/* Quick Filters */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar indicadores do Radar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none dark:text-white"
                />
              </div>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none dark:text-white cursor-pointer"
              >
                <option value="all">Todas as Secretarias</option>
                {departmentsWithIndicators.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-1.5 w-full lg:w-auto overflow-x-auto">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'compliant', label: 'Conformes' },
                { id: 'partial', label: 'Parciais' },
                { id: 'non-compliant', label: 'Pendentes' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === st.id
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((cat, idx) => {
              const totalItemsInCat = cat.items.length;
              const compliantInCat = cat.items.filter(i => i.status === 'compliant').length;
              const isSelected = selectedCategoryName === cat.category;

              return (
                <motion.button
                  key={idx}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedCategoryName(isSelected ? null : cat.category)}
                  className={`p-6 rounded-3xl border text-left transition-all duration-300 ${
                    isSelected 
                      ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white text-white dark:text-neutral-950 shadow-xl' 
                      : 'bg-white border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm hover:border-neutral-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-white/60 dark:text-neutral-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
                      {cat.category}
                    </span>
                    {isSelected && <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600" />}
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-black">{cat.score}%</p>
                      <p className={`text-[10px] mt-1 ${isSelected ? 'text-white/60 dark:text-neutral-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
                        {compliantInCat} de {totalItemsInCat} conformes
                      </p>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${
                      cat.score >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      PESO TOTAL: {cat.items.reduce((s, i) => s + i.weight, 0)}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Indicators List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                <Target size={14} />
                {selectedCategoryName ? `Indicadores: ${selectedCategoryName}` : 'Todos os Indicadores'} ({filteredItems.length})
              </h3>
              {selectedCategoryName && (
                <button
                  onClick={() => setSelectedCategoryName(null)}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline uppercase"
                >
                  Ver Todos
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredItems.map(({ categoryName, item }) => {
                const dept = (item as any).department || 'Administração e Finanças';

                return (
                  <motion.div
                    key={`${categoryName}-${item.name}`}
                    layout
                    className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-4 hover:border-neutral-200 dark:hover:border-neutral-700 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                            {categoryName}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-400">
                            PESO: {item.weight}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-500 bg-neutral-50 dark:bg-neutral-800 px-2 py-0.5 rounded flex items-center gap-1">
                            <Building2 size={10} />
                            {dept}
                          </span>
                        </div>
                        <h4 className="font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-all">
                          {item.name}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-neutral-400">Pontuação</span>
                        <span className="text-neutral-900 dark:text-white">{item.score}%</span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.status === 'compliant' ? 'bg-emerald-500' :
                            item.status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-50 dark:border-neutral-800/80">
                      <button
                        onClick={() => handleOpenEditItem(categoryName, item)}
                        className="flex items-center gap-1 text-[11px] font-bold uppercase text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 px-3 py-2 rounded-xl transition-all"
                      >
                        <FileText size={14} />
                        Gerenciar Evidências ({item.evidences.length})
                      </button>

                      <button
                        onClick={() => handleOpenAddTask(item.name, categoryName)}
                        className="flex items-center gap-1 text-[11px] font-bold uppercase text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 px-3 py-2 rounded-xl transition-all border border-neutral-100 dark:border-neutral-800"
                      >
                        <Plus size={14} />
                        Delegar Ação
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="col-span-2 text-center py-12 text-neutral-400 dark:text-neutral-500">
                  <AlertTriangle className="mx-auto mb-2 text-neutral-300" size={36} />
                  Nenhum indicador atende aos filtros aplicados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: SIMULADOR DE SELO
         ---------------------------------------------------- */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Center: Pending indicators checklists */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
              <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100 mb-2">
                Simulador de Metas e Impacto
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Selecione as exigências pendentes abaixo para simular o impacto de resolvê-las (atingir 100% de conformidade) na pontuação e no selo do município.
              </p>
            </div>

            <div className="space-y-3">
              {pendingItemsForSimulator.map(({ categoryName, item, impact }) => {
                const isChecked = simulatedItems.has(item.name);
                return (
                  <div
                    key={item.name}
                    onClick={() => toggleSimulated(item.name)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isChecked
                        ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-950 shadow-md scale-[1.01]'
                        : 'bg-white border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 hover:border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isChecked 
                          ? 'border-emerald-500 bg-emerald-500 text-neutral-900' 
                          : 'border-neutral-300 dark:border-neutral-600 bg-transparent'
                      }`}>
                        {isChecked && <CheckCircle2 size={16} />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase ${isChecked ? 'text-white/60 dark:text-neutral-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
                            {categoryName}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                          <span className={`text-[9px] font-bold ${isChecked ? 'text-white/60 dark:text-neutral-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
                            Nota Atual: {item.score}%
                          </span>
                        </div>
                        <h4 className="font-bold text-sm tracking-tight">{item.name}</h4>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-xs font-black uppercase ${isChecked ? 'text-emerald-400 dark:text-emerald-600' : 'text-sky-500'}`}>
                        +{impact}% no Score
                      </p>
                      <p className={`text-[9px] ${isChecked ? 'text-white/50 dark:text-neutral-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
                        Peso: {item.weight}
                      </p>
                    </div>
                  </div>
                );
              })}

              {pendingItemsForSimulator.length === 0 && (
                <div className="text-center py-12 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 rounded-3xl">
                  <Trophy size={48} className="mx-auto mb-2" />
                  <p className="font-bold">Parabéns! 100% de conformidade atingida.</p>
                  <p className="text-xs">O município já alcançou o índice máximo.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right side: Simulation impact panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6 sticky top-6">
              <h3 className="text-md font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Resultado da Simulação
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-neutral-400">Pontuação Atual:</span>
                  <span className="text-base font-bold text-neutral-600 dark:text-neutral-300">{currentOverallScore}%</span>
                </div>

                <div className="flex justify-between items-end">
                  <span className="text-sm font-semibold text-neutral-400">Pontuação Projetada:</span>
                  <span className="text-3xl font-black text-neutral-900 dark:text-white">
                    {simulatedOverallScore}%
                  </span>
                </div>

                {/* Score change badge */}
                {simulatedOverallScore > currentOverallScore && (
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>Aumento Projetado:</span>
                    <span className="font-black">+{Math.round((simulatedOverallScore - currentOverallScore) * 10) / 10}%</span>
                  </div>
                )}
              </div>

              {/* Badges comparison */}
              <div className="border-t border-neutral-100 dark:border-neutral-800/80 pt-4 space-y-3">
                <p className="text-xs font-bold text-neutral-400">Comparativo de Selo:</p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <p className="text-[9px] uppercase tracking-wider text-neutral-400">Atual</p>
                    <p className={`text-sm font-black uppercase ${currentSeal.color} mt-1`}>{currentSeal.name}</p>
                  </div>

                  <div className={`p-3 rounded-2xl border ${simulatedSeal.bg} ${simulatedSeal.border}`}>
                    <p className="text-[9px] uppercase tracking-wider text-neutral-400">Projetado</p>
                    <p className={`text-sm font-black uppercase ${simulatedSeal.color} mt-1`}>{simulatedSeal.name}</p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={applySimulationAsTasks}
                disabled={simulatedItems.size === 0}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold rounded-2xl text-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Converter em Metas do Plano
              </button>

              <div className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center leading-normal">
                Clique nos itens projetados como metas para gerar tarefas automáticas de acompanhamento para as secretarias competentes.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: PLANO DE AÇÃO (TASKS)
         ---------------------------------------------------- */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100">
                Plano de Ação Municipal - PNTP
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Monitore e delegue tarefas de transparência para que as secretarias comprovem as exigências do radar.
              </p>
            </div>

            <button
              onClick={() => handleOpenAddTask()}
              className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:shadow transition-all"
            >
              <Plus size={18} />
              Delegar Nova Ação
            </button>
          </div>

          {/* Task lists by state */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN: A FAZER */}
            <div className="space-y-4 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                  A Fazer ({tasksByStatusCount.pending})
                </span>
              </div>

              <div className="space-y-3">
                {tasks.filter(t => t.status === 'pending').map(task => (
                  <div 
                    key={task.id}
                    className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-3 group hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                        {task.task}
                      </h4>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-neutral-300 hover:text-rose-500 p-1 rounded transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[9px] font-bold text-neutral-400 uppercase">
                      <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <Building2 size={10} />
                        {task.department}
                      </span>
                      {task.itemRef && (
                        <span className="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded">
                          {task.itemRef}
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 line-clamp-2">
                        {task.notes}
                      </p>
                    )}

                    <div className="pt-2 border-t border-neutral-50 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                        <Calendar size={12} />
                        Lim: {task.deadline}
                      </span>

                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                        className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-100 dark:border-sky-900/30 flex items-center gap-1"
                      >
                        <Play size={10} /> Iniciar
                      </button>
                    </div>
                  </div>
                ))}

                {tasksByStatusCount.pending === 0 && (
                  <div className="text-center py-8 text-neutral-400 text-xs">
                    Sem tarefas pendentes nesta coluna.
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN: EM ANDAMENTO */}
            <div className="space-y-4 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Em Andamento ({tasksByStatusCount.in_progress})
                </span>
              </div>

              <div className="space-y-3">
                {tasks.filter(t => t.status === 'in_progress').map(task => (
                  <div 
                    key={task.id}
                    className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm space-y-3 group hover:border-amber-300 transition-all"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                        {task.task}
                      </h4>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-neutral-300 hover:text-rose-500 p-1 rounded transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[9px] font-bold text-neutral-400 uppercase">
                      <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <Building2 size={10} />
                        {task.department}
                      </span>
                      {task.itemRef && (
                        <span className="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded">
                          {task.itemRef}
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 line-clamp-2">
                        {task.notes}
                      </p>
                    )}

                    <div className="pt-2 border-t border-neutral-50 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                        <Calendar size={12} />
                        Lim: {task.deadline}
                      </span>

                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                        className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1"
                      >
                        <CheckCircle2 size={10} /> Concluir
                      </button>
                    </div>
                  </div>
                ))}

                {tasksByStatusCount.in_progress === 0 && (
                  <div className="text-center py-8 text-neutral-400 text-xs">
                    Sem tarefas em andamento nesta coluna.
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN: CONCLUÍDAS */}
            <div className="space-y-4 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Concluídas ({tasksByStatusCount.completed})
                </span>
              </div>

              <div className="space-y-3">
                {tasks.filter(t => t.status === 'completed').map(task => (
                  <div 
                    key={task.id}
                    className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-3 opacity-70 group hover:opacity-100 hover:border-neutral-300 transition-all animate-in fade-in"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-neutral-600 dark:text-neutral-400 line-through">
                        {task.task}
                      </h4>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-neutral-300 hover:text-rose-500 p-1 rounded transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[9px] font-bold text-neutral-400 uppercase">
                      <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <Building2 size={10} />
                        {task.department}
                      </span>
                      {task.itemRef && (
                        <span className="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded">
                          {task.itemRef}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-neutral-50 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                        <Calendar size={12} />
                        Fim: {task.deadline}
                      </span>

                      <span className="text-[9px] font-black uppercase text-emerald-500 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">
                        <CheckCircle2 size={10} /> Finalizada
                      </span>
                    </div>
                  </div>
                ))}

                {tasksByStatusCount.completed === 0 && (
                  <div className="text-center py-8 text-neutral-400 text-xs">
                    Sem tarefas finalizadas nesta coluna.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 4: DOSSIÊ EXPORTÁVEL (REPORTS)
         ---------------------------------------------------- */}
      {activeTab === 'dossier' && (
        <div className="space-y-6">
          {/* Actions top bar */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100">
                Relatório de Auditoria de Transparência
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Gere o dossiê executivo completo com as evidências municipais prontas para envio aos órgãos controladores.
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => window.print()}
                className="flex-1 sm:flex-initial bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:shadow transition-all"
              >
                <Printer size={16} /> Imprimir / Salvar PDF
              </button>

              <button
                onClick={() => {
                  showToast('Estrutura de dados exportada para o console (CSV)', 'info');
                  const header = 'Categoria,Item,Status,Score,Responsavel,Evidencias\n';
                  const rows = categories.flatMap(cat => 
                    cat.items.map(i => {
                      const evs = i.evidences.map(e => e.label).join(' | ');
                      return `"${cat.category}","${i.name}","${i.status}",${i.score},"${(i as any).department || DEFAULT_DEPARTMENTS[i.name] || ''}","${evs}"`;
                    })
                  ).join('\n');
                  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `dossie_radar_pntp_${selectedYear}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex-1 sm:flex-initial border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
              >
                <FileSpreadsheet size={16} /> Exportar CSV (Excel)
              </button>
            </div>
          </div>

          {/* Dossier Document Preview */}
          <div className="bg-white text-neutral-900 p-12 rounded-3xl border border-neutral-100 shadow-md space-y-8 max-w-4xl mx-auto dark:bg-white dark:text-neutral-900 print:shadow-none print:border-none print:p-0 print:my-0">
            {/* Header Report */}
            <div className="text-center pb-8 border-b-2 border-neutral-800 space-y-2">
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Dossiê Executivo de Transparência
              </h1>
              <p className="text-xs uppercase font-extrabold tracking-widest text-neutral-500">
                Radar de Transparência Pública (ATRICON) - Ciclo {selectedYear}
              </p>
              <div className="pt-4 flex justify-center gap-8 text-xs font-bold text-neutral-600">
                <p>ÓRGÃO: <span className="text-neutral-950 font-black">Prefeitura Municipal de Torixoréu/MT</span></p>
                <p>DATA DE EMISSÃO: <span className="text-neutral-950 font-black">{new Date().toLocaleDateString('pt-BR')}</span></p>
              </div>
            </div>

            {/* General metrics */}
            <div className="grid grid-cols-3 gap-6 text-center py-4 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Pontuação Geral</p>
                <p className="text-3xl font-black text-neutral-950 mt-1">{currentOverallScore}%</p>
              </div>
              <div className="border-x border-neutral-200">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Selo ATRICON</p>
                <p className={`text-sm font-black uppercase tracking-wider mt-2 ${
                  currentOverallScore >= 95 ? 'text-emerald-600' :
                  currentOverallScore >= 85 ? 'text-amber-600' :
                  currentOverallScore >= 75 ? 'text-sky-600' : 'text-neutral-500'
                }`}>
                  Selo {currentSeal.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Total de Exigências</p>
                <p className="text-3xl font-black text-neutral-950 mt-1">
                  {categories.reduce((s, c) => s + c.items.length, 0)} Itens
                </p>
              </div>
            </div>

            {/* List by category */}
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-950 border-b-2 border-neutral-950 pb-2">
                1. Critérios de Avaliação e Conformidade
              </h3>

              <div className="space-y-6">
                {categories.map(cat => (
                  <div key={cat.category} className="space-y-3">
                    <div className="flex justify-between items-center bg-neutral-100 px-4 py-2 rounded-lg">
                      <span className="text-xs font-black uppercase text-neutral-800">{cat.category}</span>
                      <span className="text-xs font-black text-neutral-800">Nota: {cat.score}%</span>
                    </div>

                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-neutral-300 text-neutral-500 font-bold">
                          <th className="py-2 w-2/5">Exigência / Indicador</th>
                          <th className="py-2 w-1/5 text-center">Score</th>
                          <th className="py-2 w-1/5 text-center">Conformidade</th>
                          <th className="py-2 w-1/5 text-right">Responsável</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {cat.items.map(item => (
                          <tr key={item.name} className="hover:bg-neutral-50">
                            <td className="py-3 font-semibold text-neutral-950">{item.name}</td>
                            <td className="py-3 text-center font-mono font-bold">{item.score}%</td>
                            <td className="py-3 text-center">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                item.status === 'compliant' ? 'bg-emerald-100 text-emerald-800' :
                                item.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {getStatusLabel(item.status)}
                              </span>
                            </td>
                            <td className="py-3 text-right text-neutral-500 font-medium">
                              {(item as any).department || DEFAULT_DEPARTMENTS[item.name]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>

            {/* List of Evidence proof links */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-950 border-b-2 border-neutral-950 pb-2">
                2. Relação de Evidências Apresentadas
              </h3>

              <div className="space-y-4">
                {categories.flatMap(cat => cat.items).filter(i => i.evidences.length > 0).map(item => (
                  <div key={item.name} className="text-xs space-y-1">
                    <p className="font-bold text-neutral-950">{item.name} ({item.score}%)</p>
                    <ul className="list-disc pl-5 text-neutral-500 space-y-0.5 font-medium">
                      {item.evidences.map((ev, i) => (
                        <li key={i}>
                          <span className="font-bold text-neutral-700">{ev.label}</span> [{ev.type}] - Link: <span className="underline select-all text-neutral-500 font-mono text-[10px]">{ev.link}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit signature lines */}
            <div className="pt-16 grid grid-cols-2 gap-12 text-center text-xs font-bold text-neutral-500">
              <div className="space-y-1">
                <div className="w-full border-t border-neutral-300 pt-2" />
                <p className="text-neutral-950 font-black">Carlos Mendes</p>
                <p>Controle Interno Geral</p>
              </div>
              <div className="space-y-1">
                <div className="w-full border-t border-neutral-300 pt-2" />
                <p className="text-neutral-950 font-black">Prefeito Municipal</p>
                <p>Gabinete do Executivo</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { PNTPModule };
