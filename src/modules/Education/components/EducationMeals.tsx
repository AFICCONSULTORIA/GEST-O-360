import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Salad, Plus, Search, Filter, Edit2, Trash2, CheckCircle2, 
  AlertTriangle, Leaf, Users, ShieldCheck, Download, FileText, 
  X, Utensils, Apple, HeartHandshake, Sparkles
} from 'lucide-react';
import { showToast } from '../../../components/ui/Toast';

export interface SchoolMenu {
  id: string;
  stage: 'Berçário (0-1 ano)' | 'Educação Infantil (2-5 anos)' | 'Ensino Fundamental' | 'EJA';
  title: string;
  nutritionist: string;
  crn: string;
  status: 'Aprovado' | 'Em Análise' | 'Vigente';
  breakfast: string;
  lunch: string;
  snack: string;
  dinner?: string;
  caloriesKcal: number;
  familyFarmingPercentage: number;
}

const DEFAULT_MENUS: SchoolMenu[] = [
  {
    id: '1',
    stage: 'Berçário (0-1 ano)',
    title: 'Cardápio Nutricional Especial - Introdução Alimentar',
    nutritionist: 'Dra. Camila Nogueira Ribeiro',
    crn: 'CRN-1 / 14.890',
    status: 'Vigente',
    breakfast: 'Fórmula infantil / Leite materno + Purê de banana com aveia',
    lunch: 'Papinha de carne bovina, abóbora cabotiá, chuchu e feijão amassado',
    snack: 'Purê de maçã raspada e mamão papaia',
    caloriesKcal: 450,
    familyFarmingPercentage: 42
  },
  {
    id: '2',
    stage: 'Educação Infantil (2-5 anos)',
    title: 'Cardápio CMEI Semanal - Desenvolvimento e Energia',
    nutritionist: 'Dra. Camila Nogueira Ribeiro',
    crn: 'CRN-1 / 14.890',
    status: 'Vigente',
    breakfast: 'Leite com cacau 100%, pão de queijo artesanal e melancia fresca',
    lunch: 'Arroz integral, feijão carioquinha, frango caipira cozido, salada de alface e tomate',
    snack: 'Suco de maracujá natural (da agricultura familiar) + Biscoito integral de aveia',
    caloriesKcal: 680,
    familyFarmingPercentage: 38
  },
  {
    id: '3',
    stage: 'Ensino Fundamental',
    title: 'Cardápio PNAE Fundamental - Alto Valor Biológico',
    nutritionist: 'Dr. Fernando Dias Brandão',
    crn: 'CRN-1 / 11.234',
    status: 'Vigente',
    breakfast: 'Iogurte natural batido com morango da região + Pão com ovos mexidos',
    lunch: 'Arroz branco, feijão preto, carne moída refogada com legumes e salada de beterraba',
    snack: 'Banana prata e bolo caseiro de cenoura sem cobertura',
    caloriesKcal: 820,
    familyFarmingPercentage: 32
  },
];

export const EducationMeals: React.FC = () => {
  const [menus, setMenus] = useState<SchoolMenu[]>(() => {
    const saved = localStorage.getItem('@gestao360:education_menus');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_MENUS;
  });

  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<SchoolMenu | null>(null);

  // Form states
  const [formStage, setFormStage] = useState<SchoolMenu['stage']>('Educação Infantil (2-5 anos)');
  const [formTitle, setFormTitle] = useState('');
  const [formNutritionist, setFormNutritionist] = useState('Dra. Camila Nogueira Ribeiro');
  const [formCrn, setFormCrn] = useState('CRN-1 / 14.890');
  const [formStatus, setFormStatus] = useState<SchoolMenu['status']>('Vigente');
  const [formBreakfast, setFormBreakfast] = useState('');
  const [formLunch, setFormLunch] = useState('');
  const [formSnack, setFormSnack] = useState('');
  const [formCaloriesKcal, setFormCaloriesKcal] = useState<number>(650);
  const [formFamilyFarming, setFormFamilyFarming] = useState<number>(35);

  const saveMenus = (updated: SchoolMenu[]) => {
    setMenus(updated);
    localStorage.setItem('@gestao360:education_menus', JSON.stringify(updated));
  };

  const handleOpenModal = (menu?: SchoolMenu) => {
    if (menu) {
      setEditingMenu(menu);
      setFormStage(menu.stage);
      setFormTitle(menu.title);
      setFormNutritionist(menu.nutritionist);
      setFormCrn(menu.crn);
      setFormStatus(menu.status);
      setFormBreakfast(menu.breakfast);
      setFormLunch(menu.lunch);
      setFormSnack(menu.snack);
      setFormCaloriesKcal(menu.caloriesKcal);
      setFormFamilyFarming(menu.familyFarmingPercentage);
    } else {
      setEditingMenu(null);
      setFormStage('Educação Infantil (2-5 anos)');
      setFormTitle('');
      setFormNutritionist('Dra. Camila Nogueira Ribeiro');
      setFormCrn('CRN-1 / 14.890');
      setFormStatus('Vigente');
      setFormBreakfast('');
      setFormLunch('');
      setFormSnack('');
      setFormCaloriesKcal(650);
      setFormFamilyFarming(35);
    }
    setIsModalOpen(true);
  };

  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formLunch.trim()) {
      showToast('Por favor, informe o título e os itens principais do cardápio.', 'error');
      return;
    }

    if (editingMenu) {
      const updated = menus.map(m => m.id === editingMenu.id ? {
        ...m,
        stage: formStage,
        title: formTitle,
        nutritionist: formNutritionist,
        crn: formCrn,
        status: formStatus,
        breakfast: formBreakfast,
        lunch: formLunch,
        snack: formSnack,
        caloriesKcal: Number(formCaloriesKcal) || 0,
        familyFarmingPercentage: Number(formFamilyFarming) || 0,
      } : m);
      saveMenus(updated);
      showToast('Cardápio nutricional atualizado com sucesso!', 'success');
    } else {
      const newMenu: SchoolMenu = {
        id: Date.now().toString(),
        stage: formStage,
        title: formTitle,
        nutritionist: formNutritionist,
        crn: formCrn,
        status: formStatus,
        breakfast: formBreakfast,
        lunch: formLunch,
        snack: formSnack,
        caloriesKcal: Number(formCaloriesKcal) || 0,
        familyFarmingPercentage: Number(formFamilyFarming) || 0,
      };
      saveMenus([newMenu, ...menus]);
      showToast('Novo cardápio nutricional cadastrado!', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDeleteMenu = (id: string) => {
    if (window.confirm('Deseja realmente excluir este cardápio?')) {
      const updated = menus.filter(m => m.id !== id);
      saveMenus(updated);
      showToast('Cardápio removido com sucesso.', 'info');
    }
  };

  const filteredMenus = menus.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.breakfast.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.lunch.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.snack.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = selectedStage === 'all' || m.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-8">
      {/* Cards de Métricas do PNAE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Refeições / Dia</p>
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">9.200</h3>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight mt-1">
                Atendimento 100% da Rede
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <Utensils size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Agricultura Familiar</p>
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">34.2%</h3>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-1 flex items-center gap-1">
                <ShieldCheck size={12} /> Meta Legal: 30% (Superada)
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <Leaf size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Alergias Mapeadas</p>
              <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400">38 Alunos</h3>
              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight mt-1">
                Cardápios Adaptados Ativos
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Responsabilidade Técnica</p>
              <h3 className="text-base font-black text-neutral-900 dark:text-white mt-1">Dra. Camila N.</h3>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">
                CRN-1 / 14.890 (Regular)
              </p>
            </div>
            <div className="p-3 bg-sky-50 dark:bg-sky-500/10 text-sky-600 rounded-2xl">
              <Apple size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Seção Principal de Cardápios */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-6 sm:p-8 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50/50 dark:bg-neutral-800/30">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Salad size={20} className="text-emerald-500" />
              Gestão de Cardápios & Fichas Nutricionais ({filteredMenus.length})
            </h3>
            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-1">
              PNAE / FNDE · Cardápios balanceados com rastreabilidade da agricultura familiar.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => showToast('Exportando cardápios em PDF oficial para afixação nas escolas...', 'success')}
              className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2"
            >
              <Download size={16} /> Imprimir Cardápios
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md"
            >
              <Plus size={16} /> Novo Cardápio
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Buscar ingredientes ou refeições..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select 
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todas as Etapas</option>
            <option value="Berçário (0-1 ano)">Berçário (0 a 1 ano)</option>
            <option value="Educação Infantil (2-5 anos)">Educação Infantil (2 a 5 anos)</option>
            <option value="Ensino Fundamental">Ensino Fundamental</option>
            <option value="EJA">EJA</option>
          </select>
        </div>

        {/* Cards de Cardápio */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {filteredMenus.map((menu) => (
            <div 
              key={menu.id} 
              className="bg-neutral-50 dark:bg-neutral-800/40 rounded-3xl p-6 border border-neutral-200/60 dark:border-neutral-800 flex flex-col justify-between hover:shadow-lg transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-black uppercase px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                    {menu.stage}
                  </span>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenModal(menu)}
                      className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteMenu(menu.id)}
                      className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h4 className="text-base font-black text-neutral-900 dark:text-white leading-tight">
                  {menu.title}
                </h4>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Desjejum / Lanche Manhã</p>
                    <p className="font-medium text-neutral-700 dark:text-neutral-300">{menu.breakfast}</p>
                  </div>

                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Almoço Principal</p>
                    <p className="font-bold text-neutral-900 dark:text-white">{menu.lunch}</p>
                  </div>

                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest mb-1">Lanche da Tarde</p>
                    <p className="font-medium text-neutral-700 dark:text-neutral-300">{menu.snack}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200/60 dark:border-neutral-700 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Leaf size={12} /> {menu.familyFarmingPercentage}% da Agricultura Familiar
                </span>
                <span className="font-bold text-neutral-700 dark:text-neutral-300">
                  {menu.caloriesKcal} kcal
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel da Agricultura Familiar e Cooperativas */}
      <div className="bg-emerald-600 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest">
            <HeartHandshake size={14} /> Lei Federal 11.947/2009
          </div>
          <h3 className="text-2xl font-black italic">
            Chamada Pública da <span className="underline underline-offset-8">Agricultura Familiar</span>
          </h3>
          <p className="text-emerald-100 text-xs font-medium leading-relaxed">
            O município compra diretamente de produtores locais e cooperativas rurais de Torixoréu, garantindo alimentos frescos, sem agrotóxicos e gerando renda no campo.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="bg-emerald-700/60 border border-emerald-500/40 px-4 py-2.5 rounded-2xl">
              <p className="text-[9px] uppercase font-bold text-emerald-200">Cooperativas Cadastradas</p>
              <p className="text-lg font-black">04 Associações Rurais</p>
            </div>
            <div className="bg-emerald-700/60 border border-emerald-500/40 px-4 py-2.5 rounded-2xl">
              <p className="text-[9px] uppercase font-bold text-emerald-200">Total Investido (Ano)</p>
              <p className="text-lg font-black">R$ 412.500,00</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar / Editar Cardápio */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Salad className="text-emerald-500" />
                  {editingMenu ? 'Editar Cardápio Nutricional' : 'Novo Cardápio Nutricional'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveMenu} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Título do Cardápio *</label>
                    <input 
                      type="text" 
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Cardápio PNAE - Semana 01"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Etapa de Ensino *</label>
                    <select 
                      value={formStage}
                      onChange={(e) => setFormStage(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Berçário (0-1 ano)">Berçário (0 a 1 ano)</option>
                      <option value="Educação Infantil (2-5 anos)">Educação Infantil (2 a 5 anos)</option>
                      <option value="Ensino Fundamental">Ensino Fundamental</option>
                      <option value="EJA">EJA</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Nutricionista RT</label>
                    <input 
                      type="text" 
                      value={formNutritionist}
                      onChange={(e) => setFormNutritionist(e.target.value)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Desjejum / Café da Manhã</label>
                    <input 
                      type="text" 
                      value={formBreakfast}
                      onChange={(e) => setFormBreakfast(e.target.value)}
                      placeholder="Ex: Leite com cacau e frutas frescas"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Almoço Principal *</label>
                    <input 
                      type="text" 
                      required
                      value={formLunch}
                      onChange={(e) => setFormLunch(e.target.value)}
                      placeholder="Ex: Arroz, feijão, frango assado e salada mista"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Lanche da Tarde</label>
                    <input 
                      type="text" 
                      value={formSnack}
                      onChange={(e) => setFormSnack(e.target.value)}
                      placeholder="Ex: Suco natural de polpa da agricultura familiar + biscoito integral"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Agricultura Familiar (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      value={formFamilyFarming}
                      onChange={(e) => setFormFamilyFarming(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1 block">Valor Calórico (Kcal)</label>
                    <input 
                      type="number" 
                      value={formCaloriesKcal}
                      onChange={(e) => setFormCaloriesKcal(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
                  >
                    {editingMenu ? 'Salvar Alterações' : 'Cadastrar Cardápio'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
