import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Plus, Edit2, Trash2, 
  BookOpen, Tag, Clock, Eye, Save, X, Compass, Settings, AlertTriangle, TrendingUp, MessageSquare
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  views: number;
  createdAt: string;
}

const CATEGORIES = [
  { id: 'primeiros-passos', label: 'Primeiros Passos', icon: Compass },
  { id: 'gestao-notas', label: 'Gestão de Notas e Frequência', icon: BookOpen },
  { id: 'comunicacao', label: 'Comunicação com Alunos', icon: MessageSquare },
  { id: 'relatorios', label: 'Relatórios e Análises', icon: TrendingUp },
  { id: 'configuracoes', label: 'Configurações da Conta', icon: Settings },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle }
];

const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Como lançar notas em lote',
    content: 'Para lançar notas em lote, acesse a aba "Alunos", selecione a turma desejada e clique no botão "Lançar Notas". Você poderá inserir as notas de todos os alunos na mesma tela.',
    category: 'gestao-notas',
    views: 1245,
    createdAt: '2025-10-12'
  },
  {
    id: '2',
    title: 'Recuperando senha de acesso',
    content: 'Se você esqueceu sua senha, clique em "Esqueci minha senha" na tela de login. Um link de redefinição será enviado para o seu e-mail cadastrado.',
    category: 'configuracoes',
    views: 890,
    createdAt: '2026-01-05'
  },
  {
    id: '3',
    title: 'Criando sua primeira turma',
    content: 'Vá até o menu lateral, clique em "Turmas" e depois em "Nova Turma". Preencha o nome, ano letivo e selecione as disciplinas correspondentes.',
    category: 'primeiros-passos',
    views: 3400,
    createdAt: '2025-08-20'
  }
];

export const SupportArticlesManager = ({ categoryId, onBack }: { categoryId: string, onBack: () => void }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({ title: '', category: categoryId, content: '' });

  useEffect(() => {
    const saved = localStorage.getItem('gestao360_support_articles');
    if (saved) {
      setArticles(JSON.parse(saved));
    } else {
      setArticles(MOCK_ARTICLES);
      localStorage.setItem('gestao360_support_articles', JSON.stringify(MOCK_ARTICLES));
    }
  }, []);

  const saveArticles = (newArticles: Article[]) => {
    setArticles(newArticles);
    localStorage.setItem('gestao360_support_articles', JSON.stringify(newArticles));
  };

  const handleOpenForm = (article?: Article) => {
    if (article) {
      setEditingArticle(article);
      setFormData({ title: article.title, category: article.category, content: article.content });
    } else {
      setEditingArticle(null);
      setFormData({ title: '', category: categoryId, content: '' });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingArticle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    if (editingArticle) {
      const updated = articles.map(a => 
        a.id === editingArticle.id 
          ? { ...a, title: formData.title, category: formData.category, content: formData.content }
          : a
      );
      saveArticles(updated);
    } else {
      const newArticle: Article = {
        id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        category: formData.category,
        views: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      saveArticles([...articles, newArticle]);
    }
    handleCloseForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este artigo? Esta ação não pode ser desfeita.')) {
      saveArticles(articles.filter(a => a.id !== id));
    }
  };

  const filteredArticles = articles.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = a.category === categoryId;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (id: string) => CATEGORIES.find(c => c.id === id)?.label || id;
  const categoryName = getCategoryLabel(categoryId);
  const getCategoryIcon = (id: string) => {
    const Icon = CATEGORIES.find(c => c.id === id)?.icon || BookOpen;
    return <Icon size={16} />;
  };

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
                {editingArticle ? 'Editar Artigo' : 'Novo Artigo'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">Categoria: {categoryName}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-900 dark:text-white">Título do Artigo</label>
            <input 
              type="text" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="Ex: Como configurar o diário de classe"
              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-neutral-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-900 dark:text-white">Conteúdo</label>
            <textarea 
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              placeholder="Escreva o passo a passo ou explicação detalhada..."
              rows={8}
              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-neutral-900 dark:text-white resize-none"
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
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20 flex items-center gap-2"
            >
              <Save size={20} /> Salvar Artigo
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
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white">{categoryName}</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Gerencie os artigos desta categoria.</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/20 transition-all whitespace-nowrap"
        >
          <Plus size={20} />
          Novo Artigo
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar artigos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-white"
          />
        </div>
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50">
            <BookOpen size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Nenhum artigo encontrado</h3>
            <p className="text-neutral-500">Tente buscar por outros termos ou crie um novo artigo.</p>
          </div>
        ) : (
          filteredArticles.map(article => (
            <div key={article.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 hover:border-blue-500/30 hover:shadow-lg hover:shadow-neutral-900/5 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg">
                    {getCategoryIcon(article.category)}
                    {getCategoryLabel(article.category)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-neutral-400 font-medium">
                    <Clock size={14} /> {article.createdAt}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {article.title}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm line-clamp-2 leading-relaxed">
                  {article.content}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800 pt-4 md:pt-0">
                <div className="flex items-center gap-1.5 text-neutral-400 text-sm px-4 border-r border-neutral-200 dark:border-neutral-700">
                  <Eye size={16} />
                  <span className="font-medium">{article.views}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenForm(article)}
                    className="p-2.5 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(article.id)}
                    className="p-2.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
