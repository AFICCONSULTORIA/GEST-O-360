import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Plus, Edit2, Trash2, 
  PlayCircle, Video, Save, X, Image as ImageIcon, Upload, Clock
} from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  duration: string;
  views: number;
  thumbnailUrl?: string;
  videoUrl?: string;
}

const MOCK_TUTORIALS: Tutorial[] = [
  { id: '1', title: "Como criar uma nova turma", duration: "3:45", views: 1200 },
  { id: '2', title: "Utilizando o diário de classe", duration: "5:20", views: 856 },
  { id: '3', title: "Como enviar comunicados aos pais", duration: "2:15", views: 2300 },
  { id: '4', title: "Entendendo os relatórios de engajamento", duration: "6:10", views: 500 },
  { id: '5', title: "Configurando alertas automáticos", duration: "4:00", views: 340 },
  { id: '6', title: "Lançamento de notas em lote", duration: "3:30", views: 4100 },
];

export const SupportTutorialsManager = ({ onBack }: { onBack: () => void }) => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Video Player Modal
  const [playingTutorial, setPlayingTutorial] = useState<Tutorial | null>(null);

  // States for Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [formData, setFormData] = useState({ title: '', duration: '', videoUrl: '', thumbnailUrl: '' });

  useEffect(() => {
    const saved = localStorage.getItem('gestao360_support_tutorials');
    if (saved) {
      setTutorials(JSON.parse(saved));
    } else {
      setTutorials(MOCK_TUTORIALS);
      localStorage.setItem('gestao360_support_tutorials', JSON.stringify(MOCK_TUTORIALS));
    }
  }, []);

  const saveTutorials = (newTutorials: Tutorial[]) => {
    setTutorials(newTutorials);
    localStorage.setItem('gestao360_support_tutorials', JSON.stringify(newTutorials));
  };

  const handleOpenForm = (tutorial?: Tutorial) => {
    if (tutorial) {
      setEditingTutorial(tutorial);
      setFormData({ 
        title: tutorial.title, 
        duration: tutorial.duration, 
        videoUrl: tutorial.videoUrl || '',
        thumbnailUrl: tutorial.thumbnailUrl || ''
      });
    } else {
      setEditingTutorial(null);
      setFormData({ title: '', duration: '', videoUrl: '', thumbnailUrl: '' });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTutorial(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit to not break localStorage easily
        alert('Para testes, a imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, thumbnailUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.duration.trim()) {
      alert('Por favor, preencha pelo menos o título e a duração.');
      return;
    }

    if (editingTutorial) {
      const updated = tutorials.map(t => 
        t.id === editingTutorial.id 
          ? { ...t, title: formData.title, duration: formData.duration, videoUrl: formData.videoUrl, thumbnailUrl: formData.thumbnailUrl }
          : t
      );
      saveTutorials(updated);
    } else {
      const newTutorial: Tutorial = {
        id: Date.now().toString(),
        title: formData.title,
        duration: formData.duration,
        videoUrl: formData.videoUrl,
        thumbnailUrl: formData.thumbnailUrl,
        views: 0
      };
      saveTutorials([newTutorial, ...tutorials]);
    }
    handleCloseForm();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este tutorial? Esta ação não pode ser desfeita.')) {
      saveTutorials(tutorials.filter(t => t.id !== id));
    }
  };

  // Helper to extract YouTube video ID if possible, to embed correctly
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (youtubeMatch && youtubeMatch[1]) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
    }
    return url; // fallback
  };

  const filteredTutorials = tutorials.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                {editingTutorial ? 'Editar Tutorial' : 'Novo Tutorial'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">Preencha os detalhes do vídeo tutorial.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm space-y-6">
          
          {/* Thumbnail Upload Area */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-900 dark:text-white">Capa do Vídeo (Thumbnail)</label>
            <div className="flex items-center gap-6">
              <div 
                className="w-48 h-28 bg-neutral-100 dark:bg-neutral-800 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center relative overflow-hidden group"
              >
                {formData.thumbnailUrl ? (
                  <img src={formData.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon size={32} className="text-neutral-400 mb-2" />
                    <span className="text-xs text-neutral-500 font-medium">Sem imagem</span>
                  </>
                )}
                
                {/* Overlay Input */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Upload size={24} className="text-white" />
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div className="text-sm text-neutral-500 max-w-xs">
                Faça o upload de uma imagem chamativa para a capa do seu vídeo (Recomendado: 1280x720px, Máx 2MB).
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-neutral-900 dark:text-white">Título do Tutorial</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Como configurar o diário de classe"
                className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-neutral-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-900 dark:text-white">Duração (Ex: 4:30)</label>
              <input 
                type="text" 
                value={formData.duration}
                onChange={e => setFormData({...formData, duration: e.target.value})}
                placeholder="0:00"
                className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-neutral-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-900 dark:text-white">URL do Vídeo (Youtube ou MP4)</label>
              <input 
                type="text" 
                value={formData.videoUrl}
                onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                placeholder="https://youtube.com/..."
                className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-neutral-900 dark:text-white"
              />
            </div>
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
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/20 flex items-center gap-2"
            >
              <Save size={20} /> Salvar Tutorial
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Video Player Modal */}
      {playingTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={() => setPlayingTutorial(null)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative w-full max-w-5xl bg-black rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-neutral-800">
            {/* Close Button */}
            <button 
              onClick={() => setPlayingTutorial(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X size={24} />
            </button>

            {/* Video Container */}
            <div className="aspect-video w-full bg-neutral-900 flex items-center justify-center relative">
              {playingTutorial.videoUrl ? (
                playingTutorial.videoUrl.includes('mp4') ? (
                  <video 
                    src={playingTutorial.videoUrl} 
                    controls 
                    autoPlay 
                    className="w-full h-full outline-none"
                  ></video>
                ) : (
                  <iframe 
                    src={getEmbedUrl(playingTutorial.videoUrl)} 
                    className="w-full h-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                )
              ) : (
                <div className="text-center text-neutral-500">
                  <Video size={64} className="mx-auto mb-4 opacity-50" />
                  <p>Nenhuma URL de vídeo cadastrada para este tutorial.</p>
                </div>
              )}
            </div>
            
            {/* Info Bar */}
            <div className="p-6 bg-neutral-900 border-t border-neutral-800">
              <h2 className="text-2xl font-bold text-white mb-2">{playingTutorial.title}</h2>
              <div className="flex items-center gap-4 text-neutral-400 text-sm">
                <span className="flex items-center gap-1.5"><Clock size={16} /> {playingTutorial.duration}</span>
                <span className="flex items-center gap-1.5"><Video size={16} /> {playingTutorial.views} visualizações</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
            <ArrowLeft size={24} className="text-neutral-600 dark:text-neutral-400" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white">Tutoriais em Vídeo</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Aprenda de forma rápida com nossos vídeos curtos.</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3.5 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/20 transition-all whitespace-nowrap"
        >
          <Plus size={20} />
          Novo Tutorial
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar tutoriais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 text-neutral-900 dark:text-white"
          />
        </div>
      </div>

      {/* Tutorials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTutorials.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50">
            <Video size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Nenhum tutorial encontrado</h3>
            <p className="text-neutral-500">Tente buscar por outros termos ou adicione um novo vídeo.</p>
          </div>
        ) : (
          filteredTutorials.map((vid) => (
            <div 
              key={vid.id} 
              onClick={() => setPlayingTutorial(vid)}
              className="group bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 transition-all cursor-pointer relative flex flex-col"
            >
              {/* Management Actions - Appear on Hover */}
              <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleOpenForm(vid); }}
                  className="p-2 bg-white/90 dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-300 hover:text-purple-600 rounded-xl backdrop-blur-sm transition-colors shadow-sm"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => handleDelete(vid.id, e)}
                  className="p-2 bg-white/90 dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-300 hover:text-rose-600 rounded-xl backdrop-blur-sm transition-colors shadow-sm"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="aspect-video bg-neutral-100 dark:bg-neutral-800 relative flex items-center justify-center overflow-hidden">
                {/* Custom Thumbnail */}
                {vid.thumbnailUrl && (
                  <img 
                    src={vid.thumbnailUrl} 
                    alt={vid.title} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                
                {/* Overlay Darker if has thumbnail */}
                <div className={`absolute inset-0 transition-opacity ${vid.thumbnailUrl ? 'bg-black/30 group-hover:bg-black/50' : 'bg-gradient-to-tr from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100'}`} />
                
                <PlayCircle size={48} className={`text-neutral-400 group-hover:text-purple-500 group-hover:scale-110 transition-all z-10 ${vid.thumbnailUrl ? 'text-white/80 group-hover:text-white drop-shadow-lg' : ''}`} />
                
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-md">
                  {vid.duration}
                </div>
              </div>
              <div className="p-5 flex-1">
                <h3 className="font-bold text-neutral-900 dark:text-white mb-2 line-clamp-2">{vid.title}</h3>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Video size={14} />
                  <span>{vid.views >= 1000 ? (vid.views / 1000).toFixed(1) + 'k' : vid.views} visualizações</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
