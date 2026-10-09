import React, { useState, useEffect } from 'react';
import { 
  Bell, Plus, Send, AlertTriangle, Calendar, MessageSquare, 
  CheckCircle2, Clock, Trash2, Users, Sparkles, Filter 
} from 'lucide-react';
import { 
  AnnouncementRecord, 
  getFamilyAnnouncements, 
  createAnnouncement 
} from '../../../lib/api/education';

export const SchoolAnnouncementsManager: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'geral' | 'reuniao' | 'urgente' | 'falta'>('geral');
  const [targetClass, setTargetClass] = useState<string>('Todas');
  const [authorName, setAuthorName] = useState(() => {
    return localStorage.getItem('gestao360_teacher_name') || 'Coordenação Pedagógica';
  });

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const data = await getFamilyAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Erro ao carregar comunicados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Por favor, preencha o título e conteúdo do comunicado.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        category,
        target_class: targetClass === 'Todas' ? null : targetClass,
        target_student_id: null,
        publish_date: new Date().toISOString().split('T')[0],
        author_name: authorName.trim()
      });

      if (created) {
        setAnnouncements(prev => [created, ...prev]);
        showToast('Comunicado publicado e enviado ao Mural da Família!');
        setTitle('');
        setContent('');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Erro ao criar comunicado:', err);
      showToast('Erro ao publicar comunicado.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 md:p-8 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner shrink-0">
            <Bell size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                Gestor de Comunicados & Avisos Escolares
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={12} /> Canal Oficial
              </span>
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 max-w-2xl">
              Crie avisos direcionados por turma ou gerais para os pais e responsáveis no Portal da Família.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
        >
          <Plus size={18} />
          <span>Novo Comunicado</span>
        </button>
      </div>

      {/* Lista de Comunicados Gerenciados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 rounded-[28px] border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-lg transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  ann.category === 'urgente' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse' :
                  ann.category === 'reuniao' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                  ann.category === 'falta' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' :
                  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                }`}>
                  {ann.category}
                </span>

                <span className="text-[11px] text-neutral-400 font-semibold flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(ann.publish_date).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <h4 className="font-bold text-base text-neutral-900 dark:text-white leading-tight">
                {ann.title}
              </h4>

              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-3">
                {ann.content}
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 font-medium">
              <span>{ann.target_class ? `Turma: ${ann.target_class}` : 'Toda a Escola'}</span>
              <span>Por: <strong>{ann.author_name}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Novo Comunicado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 max-w-lg w-full rounded-3xl p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">Publicar Comunicado</h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                  Título do Aviso
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Reunião de Prestação de Contas Bimestral"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="geral">Geral</option>
                    <option value="reuniao">Reunião de Pais</option>
                    <option value="urgente">Urgente</option>
                    <option value="falta">Alerta de Frequência</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                    Público-Alvo
                  </label>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full px-3 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Todas">Toda a Escola (Geral)</option>
                    <option value="1º Ano A">1º Ano A</option>
                    <option value="4º Ano A">4º Ano A</option>
                    <option value="5º Ano B">5º Ano B</option>
                    <option value="Berçário II">Berçário II</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                  Conteúdo do Comunicado
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escreva a mensagem clara e objetiva para os pais e responsáveis..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-neutral-500 block mb-1">
                  Autor / Setor Responsável
                </label>
                <input 
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <Send size={14} />
                  <span>{isSaving ? 'Publicando...' : 'Publicar Agora'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
