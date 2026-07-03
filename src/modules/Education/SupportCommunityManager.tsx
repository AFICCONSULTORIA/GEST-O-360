import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Plus, Edit2, Trash2, 
  MessageSquare, UserCog, Clock, Save, X, Tag
} from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  author: string;
  content: string;
  tag: string;
  replies: number;
  time: string;
}

const MOCK_TOPICS: Topic[] = [
  { id: '1', title: "Dicas de engajamento para aulas remotas", author: "Profa. Ana Clara", content: "Quais ferramentas vocês estão usando?", replies: 24, time: "Há 2 horas", tag: "Dicas" },
  { id: '2', title: "Como vocês organizam as atividades extraclasse?", author: "Prof. Roberto", content: "Estou tendo dificuldades de rastrear as atividades extracurriculares.", replies: 15, time: "Há 5 horas", tag: "Metodologia" },
  { id: '3', title: "Sugestão: Adicionar exportação para Excel", author: "Profa. Mariana", content: "Acho que o diário de classe precisa de um botão de exportar.", replies: 8, time: "Há 1 dia", tag: "Feedback" },
  { id: '4', title: "Alguém teve problemas com anexos hoje?", author: "Prof. Diego", content: "Não consigo subir PDF no material de apoio.", replies: 3, time: "Há 2 dias", tag: "Suporte" },
];

const TAGS = ['Dicas', 'Metodologia', 'Feedback', 'Suporte', 'Discussão'];

export const SupportCommunityManager = ({ onBack }: { onBack: () => void }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  
  // States for Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({ title: '', tag: TAGS[0], content: '' });

  useEffect(() => {
    const saved = localStorage.getItem('gestao360_support_community');
    if (saved) {
      setTopics(JSON.parse(saved));
    } else {
      setTopics(MOCK_TOPICS);
      localStorage.setItem('gestao360_support_community', JSON.stringify(MOCK_TOPICS));
    }
  }, []);

  const saveTopics = (newTopics: Topic[]) => {
    setTopics(newTopics);
    localStorage.setItem('gestao360_support_community', JSON.stringify(newTopics));
  };

  const handleOpenForm = (topic?: Topic) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({ title: topic.title, tag: topic.tag, content: topic.content || '' });
    } else {
      setEditingTopic(null);
      setFormData({ title: '', tag: TAGS[0], content: '' });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTopic(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Por favor, preencha o título e o conteúdo.');
      return;
    }

    if (editingTopic) {
      const updated = topics.map(t => 
        t.id === editingTopic.id 
          ? { ...t, title: formData.title, tag: formData.tag, content: formData.content }
          : t
      );
      saveTopics(updated);
    } else {
      const newTopic: Topic = {
        id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        tag: formData.tag,
        author: 'Você (Professor)',
        replies: 0,
        time: 'Agora mesmo'
      };
      saveTopics([newTopic, ...topics]);
    }
    handleCloseForm();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este tópico?')) {
      saveTopics(topics.filter(t => t.id !== id));
    }
  };

  const filteredTopics = topics.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === 'all' || t.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  if (isFormOpen) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={handleCloseForm} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
              <ArrowLeft size={24} className="text-neutral-600 dark:text-neutral-400" />
            </button>
            <div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white">
                {editingTopic ? 'Editar Tópico' : 'Novo Tópico'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">Inicie uma discussão com a comunidade de professores.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-900 dark:text-white">Título do Tópico</label>
            <input 
              type="text" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="Sobre o que você quer conversar?"
              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-neutral-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-900 dark:text-white">Categoria/Tag</label>
            <div className="relative">
              <select 
                value={formData.tag}
                onChange={e => setFormData({...formData, tag: e.target.value})}
                className="w-full p-4 pl-12 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-neutral-900 dark:text-white appearance-none"
              >
                {TAGS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Tag size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-900 dark:text-white">Mensagem</label>
            <textarea 
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              placeholder="Escreva os detalhes da sua dúvida ou sugestão..."
              rows={5}
              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="button"
              onClick={handleCloseForm}
              className="px-6 py-3 font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-2"
            >
              <X size={20} /> Cancelar
            </button>
            <button 
              type="submit"
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center gap-2"
            >
              <Save size={20} /> Publicar Tópico
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
            <ArrowLeft size={24} className="text-neutral-600 dark:text-neutral-400" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white">Comunidade</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Troque ideias e experiências com outros professores.</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3.5 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/20 transition-all whitespace-nowrap"
        >
          <Plus size={20} />
          Novo Tópico
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar tópicos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white"
          />
        </div>
        <div className="relative md:w-64">
          <select 
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white appearance-none font-medium"
          >
            <option value="all">Todas as Tags</option>
            {TAGS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-4">
        {filteredTopics.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50">
            <MessageSquare size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Nenhum tópico encontrado</h3>
            <p className="text-neutral-500">Seja o primeiro a iniciar uma discussão sobre este assunto!</p>
          </div>
        ) : (
          filteredTopics.map((topic) => (
            <div key={topic.id} className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 hover:border-emerald-500/50 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="inline-block px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg mb-2 uppercase tracking-wider">
                  {topic.tag}
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{topic.title}</h3>
                <div className="flex items-center gap-3 text-sm text-neutral-500">
                  <span className="flex items-center gap-1.5"><UserCog size={14} /> {topic.author}</span>
                  <span className="w-1 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full"></span>
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {topic.time}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400">
                  <MessageSquare size={16} />
                  <span className="font-bold">{topic.replies}</span>
                </div>
                
                {topic.author === 'Você (Professor)' && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenForm(topic); }}
                      className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(topic.id, e)}
                      className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
