import React, { useState } from 'react';
import { Plus, Search, X, Edit2, Trash2, Lightbulb, Users, Clock, Target, Box, Printer, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../components/ui/Toast';

export interface DynamicActivity {
  id: string;
  title: string;
  category: string;
  targetAudience: string;
  duration: string;
  objective: string;
  materials: string;
  description: string;
}

const MOCK_DYNAMICS: DynamicActivity[] = [
  {
    id: '1',
    title: 'A Árvore da Autoestima',
    category: 'Oficina Socioeducativa',
    targetAudience: 'Adolescentes',
    duration: '1h30',
    objective: 'Fortalecer a autoimagem positiva e reconhecer qualidades próprias e dos colegas.',
    materials: 'Papel pardo, cartolinas verdes, post-its, canetinhas coloridas e fita adesiva.',
    description: '1. Desenhar uma grande árvore no papel pardo e colar na parede.\n2. Distribuir folhas/post-its para cada adolescente.\n3. Pedir que cada um escreva 3 qualidades que enxerga em si mesmo e 1 qualidade que enxerga no colega ao lado.\n4. Colar as folhas na árvore, formando a copa.\n5. Fazer uma roda de conversa sobre como foi reconhecer essas qualidades.'
  },
  {
    id: '2',
    title: 'Roda de Conversa: Setembro Amarelo',
    category: 'Campanha',
    targetAudience: 'Comunidade em Geral',
    duration: '2h00',
    objective: 'Conscientizar sobre a importância da saúde mental e prevenção ao suicídio.',
    materials: 'Projetor, panfletos informativos, fitas amarelas, caixa de som e microfone.',
    description: '1. Recepção com entrega do laço amarelo.\n2. Apresentação inicial sobre dados de saúde mental.\n3. Dinâmica do "O que eu sinto importa" onde os participantes escrevem anonimamente medos ou sentimentos ruins e colocam em uma urna.\n4. Leitura mediada de alguns papéis com acolhimento profissional.\n5. Fechamento informando os canais de apoio (CVV, CAPS, CRAS).'
  }
];

export const DinamicasTab = () => {
  const [dynamics, setDynamics] = useState<DynamicActivity[]>(MOCK_DYNAMICS);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDynamic, setEditingDynamic] = useState<DynamicActivity | null>(null);
  
  const [activeView, setActiveView] = useState<'list' | 'detail'>('list');
  const [selectedDynamic, setSelectedDynamic] = useState<DynamicActivity | null>(null);

  const [formData, setFormData] = useState<Partial<DynamicActivity>>({
    title: '',
    category: 'Terapia de Grupo',
    targetAudience: '',
    duration: '',
    objective: '',
    materials: '',
    description: ''
  });

  const filteredDynamics = dynamics.filter(d => 
    (d.title.toLowerCase().includes(search.toLowerCase()) || d.targetAudience.toLowerCase().includes(search.toLowerCase())) &&
    (filterCategory === 'Todas' || d.category === filterCategory)
  );

  const handleSave = () => {
    if (!formData.title || !formData.category || !formData.description) {
      showToast('Título, Categoria e Passo a Passo são obrigatórios', 'error');
      return;
    }

    if (editingDynamic) {
      const updatedDynamics = dynamics.map(d => d.id === editingDynamic.id ? { ...d, ...formData } as DynamicActivity : d);
      MOCK_DYNAMICS.length = 0;
      MOCK_DYNAMICS.push(...updatedDynamics);
      setDynamics([...MOCK_DYNAMICS]);
      
      if (selectedDynamic?.id === editingDynamic.id) {
        setSelectedDynamic({ ...selectedDynamic, ...formData } as DynamicActivity);
      }
      showToast('Atividade atualizada!', 'success');
    } else {
      MOCK_DYNAMICS.unshift({ id: crypto.randomUUID(), ...formData } as DynamicActivity);
      setDynamics([...MOCK_DYNAMICS]);
      showToast('Atividade adicionada ao Banco de Ideias!', 'success');
    }
    
    setIsModalOpen(false);
    setEditingDynamic(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta atividade do banco de ideias?')) {
      const updatedDynamics = dynamics.filter(d => d.id !== id);
      MOCK_DYNAMICS.length = 0;
      MOCK_DYNAMICS.push(...updatedDynamics);
      setDynamics([...MOCK_DYNAMICS]);
      
      if (selectedDynamic?.id === id) {
        setActiveView('list');
      }
      showToast('Atividade excluída.', 'info');
    }
  };

  if (activeView === 'detail' && selectedDynamic) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setActiveView('list'); setSelectedDynamic(null); }}
              className="p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-neutral-500 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div>
              <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-500 rounded-lg inline-block mb-1">
                {selectedDynamic.category}
              </span>
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                {selectedDynamic.title}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => showToast('Baixando PDF da Atividade...')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <Printer size={16} /> Imprimir Ficha
            </button>
            <button 
              onClick={() => {
                setEditingDynamic(selectedDynamic);
                setFormData(selectedDynamic);
                setIsModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
            >
              <Edit2 size={16} /> Editar Atividade
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm">
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-6">Informações Gerais</h3>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-neutral-500 mb-1">
                    <Users size={16} /> <span className="text-xs font-black uppercase tracking-widest">Público-Alvo</span>
                  </div>
                  <p className="font-medium text-neutral-900 dark:text-white">{selectedDynamic.targetAudience || 'Não especificado'}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 text-neutral-500 mb-1">
                    <Clock size={16} /> <span className="text-xs font-black uppercase tracking-widest">Duração Estimada</span>
                  </div>
                  <p className="font-medium text-neutral-900 dark:text-white">{selectedDynamic.duration || 'Não especificado'}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 text-neutral-500 mb-1">
                    <Target size={16} /> <span className="text-xs font-black uppercase tracking-widest">Objetivo</span>
                  </div>
                  <p className="font-medium text-neutral-900 dark:text-white">{selectedDynamic.objective || 'Não especificado'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm">
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-6">Materiais</h3>
              <div className="flex items-start gap-3">
                <Box size={20} className="text-neutral-400 shrink-0 mt-0.5" />
                <p className="font-medium text-neutral-900 dark:text-white whitespace-pre-wrap">
                  {selectedDynamic.materials || 'Nenhum material listado'}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-8 shadow-sm h-full">
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-6">Descrição / Passo a Passo</h3>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {selectedDynamic.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reusing Modal inside Detail view */}
        <AnimatePresence>
          {isModalOpen && (
            <DynamicModal 
              formData={formData} 
              setFormData={setFormData} 
              onClose={() => setIsModalOpen(false)} 
              onSave={handleSave} 
              isEditing={true} 
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por título ou público-alvo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          <select 
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-bold text-neutral-700 dark:text-neutral-300 focus:ring-2 focus:ring-rose-500 outline-none whitespace-nowrap"
          >
            <option value="Todas">Todas as Categorias</option>
            <option value="Terapia de Grupo">Terapia de Grupo</option>
            <option value="Oficina Socioeducativa">Oficina Socioeducativa</option>
            <option value="Campanha">Campanha (Temática)</option>
            <option value="Palestra">Palestra</option>
          </select>
          <button
            onClick={() => {
              setEditingDynamic(null);
              setFormData({ title: '', category: 'Terapia de Grupo', targetAudience: '', duration: '', objective: '', materials: '', description: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 whitespace-nowrap"
          >
            <Plus size={18} /> Adicionar Ideia
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDynamics.map(dynamic => (
          <div key={dynamic.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 flex flex-col hover:shadow-xl transition-shadow relative group cursor-pointer" onClick={() => { setSelectedDynamic(dynamic); setActiveView('detail'); }}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
                <Lightbulb size={24} />
              </div>
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); setEditingDynamic(dynamic); setFormData(dynamic); setIsModalOpen(true); }} className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(dynamic.id); }} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h4 className="text-lg font-black text-neutral-900 dark:text-white mb-2 line-clamp-2">{dynamic.title}</h4>
            
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-500 rounded-lg border border-neutral-200 dark:border-neutral-700">
                {dynamic.category}
              </span>
            </div>
            
            <div className="space-y-2 mt-auto">
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <Users size={14} className="text-neutral-400" />
                <span className="line-clamp-1">Público: {dynamic.targetAudience}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <Clock size={14} className="text-neutral-400" />
                <span>Duração: {dynamic.duration}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredDynamics.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 rounded-full flex items-center justify-center mb-4">
              <Lightbulb size={40} />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Nenhum registro encontrado</h3>
            <p className="text-neutral-500 text-sm">O banco de ideias está vazio para esta busca.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <DynamicModal 
            formData={formData} 
            setFormData={setFormData} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSave} 
            isEditing={!!editingDynamic} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Extracted Modal component to keep code clean and reusable
const DynamicModal = ({ formData, setFormData, onClose, onSave, isEditing }: any) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-8 sm:p-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
              <Lightbulb size={20} />
            </div>
            {isEditing ? 'Editar Atividade' : 'Nova Ideia'}
          </h3>
          <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Título da Atividade *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
                placeholder="Ex: Roda de Conversa Setembro Amarelo"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Categoria *</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
              >
                <option value="Terapia de Grupo">Terapia de Grupo</option>
                <option value="Oficina Socioeducativa">Oficina Socioeducativa</option>
                <option value="Campanha">Campanha (Temática)</option>
                <option value="Palestra">Palestra</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Público-Alvo</label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
                placeholder="Ex: Adolescentes, Pais, Idosos"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Duração Estimada</label>
              <input
                type="text"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
                placeholder="Ex: 1h30"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Objetivo</label>
            <input
              type="text"
              value={formData.objective}
              onChange={e => setFormData({ ...formData, objective: e.target.value })}
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-neutral-900 dark:text-white"
              placeholder="O que se espera alcançar com a atividade..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Materiais Necessários</label>
            <textarea
              rows={2}
              value={formData.materials}
              onChange={e => setFormData({ ...formData, materials: e.target.value })}
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none custom-scrollbar text-neutral-900 dark:text-white"
              placeholder="Ex: Cartolinas, canetas, projetor..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Descrição / Passo a Passo *</label>
            <textarea
              rows={6}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none resize-none custom-scrollbar text-neutral-900 dark:text-white"
              placeholder="Descreva detalhadamente como conduzir a dinâmica..."
            />
          </div>
        </div>

        <div className="mt-10 flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            Cancelar
          </button>
          <button onClick={onSave} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20">
            {isEditing ? 'Salvar Edição' : 'Salvar Ideia'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
