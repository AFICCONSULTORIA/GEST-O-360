import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, BookOpen, Compass, Map, Calculator, PlayCircle, Layers, CheckCircle2, X, ChevronDown, ChevronUp, Video, FileText, HelpCircle, Save, GripVertical, Zap, Coins } from 'lucide-react';
import { Course, Module, Lesson } from '../../lib/api/education';

export const TeacherEducationManager = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Views: 'list' | 'create-course' | 'edit-course'
  const [view, setView] = useState<'list' | 'create-course' | 'edit-course'>('list');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Form states
  const [newCourse, setNewCourse] = useState({ title: '', subject: 'Matemática', description: '', color: 'emerald', icon: 'BookOpen' });

  // Curriculum Builder states
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModule, setNewModule] = useState({ title: '', description: '' });
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({ type: 'video', title: '', duration: '', xp: 50, coins: 20, contentUrl: '', contentBody: '', quizQuestion: '', quizOptions: ['', '', '', ''], quizCorrectAnswer: 0 });

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonData, setEditLessonData] = useState({ type: 'video', title: '', duration: '', xp: 50, coins: 20, contentUrl: '', contentBody: '', quizQuestion: '', quizOptions: ['', '', '', ''], quizCorrectAnswer: 0, quizId: '' });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoading(true);
    
    // MVP Bypass: Carrega todos os cursos independentemente de estar logado
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) return;

    try {
      const { data, error } = await supabase
        .from('edu_courses')
        .select(`
          id, title, subject, description, color, icon,
          edu_modules (
            id, title, description, position_index,
            edu_lessons (
              id, type, title, duration, xp, coins, content_url, content_body, position_index,
              edu_quiz_questions (
                id, question, options, correct_answer_index, position_index
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao carregar cursos do Supabase:", error);
      } else if (data) {
        // Map to UI
        const mapped = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          subject: c.subject,
          description: c.description,
          color: c.color,
          icon: c.icon,
          modules: (c.edu_modules || []).sort((a:any, b:any) => a.position_index - b.position_index).map((m: any) => ({
            id: m.id,
            course_id: c.id,
            title: m.title,
            description: m.description,
            lessons: (m.edu_lessons || []).sort((a:any, b:any) => a.position_index - b.position_index).map((l: any) => ({
              id: l.id,
              module_id: m.id,
              type: l.type,
              title: l.title,
              duration: l.duration,
              xp: l.xp,
              coins: l.coins,
              contentUrl: l.content_url,
              contentBody: l.content_body,
              questions: (l.edu_quiz_questions || []).sort((a:any, b:any) => a.position_index - b.position_index).map((q: any) => ({
                id: q.id,
                lesson_id: l.id,
                question: q.question,
                options: q.options,
                correctAnswer: q.correct_answer_index
              }))
            }))
          }))
        }));
        setCourses(mapped);
      }
    } catch (err) {
      console.error("Exceção inesperada no loadCourses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    console.log("Iniciando publicação de trilha...");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Bypass: Permite testar mesmo sem sessão (Mock Mode)
    const userId = user ? user.id : null;

    console.log("Tentando inserir no banco sem created_by...");
    const { error } = await supabase.from('edu_courses').insert([{
      title: newCourse.title,
      subject: newCourse.subject,
      description: newCourse.description,
      color: newCourse.color,
      icon: newCourse.icon
    }]);

    if (!error) {
      console.log("Trilha criada com sucesso!");
      alert("Trilha criada com sucesso!");
      setView('list');
      setNewCourse({ title: '', subject: 'Matemática', description: '', color: 'emerald', icon: 'BookOpen' });
      loadCourses();
    } else {
      console.error("Supabase Insert Error:", error);
      alert(`Erro ao criar trilha. Detalhes: ${error.message || JSON.stringify(error)}`);
    }
  };

  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const executeDeleteCourse = async () => {
    if (!courseToDelete) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from('edu_courses').delete().eq('id', courseToDelete.id);
      if (error) {
        console.error("Erro ao excluir trilha:", error);
        alert(`Erro ao excluir trilha. Detalhes: ${error.message}`);
      } else {
        setCourseToDelete(null);
        loadCourses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateModule = async () => {
    if (!selectedCourse || !newModule.title) return;
    setIsLoading(true);
    try {
      const positionIndex = selectedCourse.modules.length;
      const { error } = await supabase.from('edu_modules').insert([{
        course_id: selectedCourse.id,
        title: newModule.title,
        description: newModule.description,
        position_index: positionIndex
      }]);

      if (error) {
        console.error("Erro ao criar módulo:", error);
        alert(`Erro ao criar Fase. Detalhes: ${error.message}`);
      } else {
        setNewModule({ title: '', description: '' });
        setIsAddingModule(false);
        // Atualizamos o curso de forma otimista ou recarregamos
        loadCourses();
        // O loadCourses atualizará a lista, mas precisamos manter o selectedCourse atualizado
        // Uma forma é pegar do find depois do loadCourses. 
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLesson = async () => {
    if (!addingLessonTo || !newLesson.title) return;
    setIsLoading(true);
    try {
      // Find position index
      const mod = selectedCourse?.modules.find(m => m.id === addingLessonTo);
      const positionIndex = mod ? mod.lessons.length : 0;
      
      const { data: newLessonData, error } = await supabase.from('edu_lessons').insert([{
        module_id: addingLessonTo,
        type: newLesson.type,
        title: newLesson.title,
        duration: newLesson.duration || null,
        xp: Number(newLesson.xp),
        coins: Number(newLesson.coins),
        content_url: newLesson.type === 'video' ? newLesson.contentUrl : null,
        content_body: newLesson.type === 'text' ? newLesson.contentBody : null,
        position_index: positionIndex
      }]).select().single();

      if (error) {
        console.error("Erro ao criar aula:", error);
        alert(`Erro ao criar Aula. Detalhes: ${error.message}`);
      } else {
        if (newLesson.type === 'quiz' && newLessonData) {
          const { error: quizError } = await supabase.from('edu_quiz_questions').insert([{
            lesson_id: newLessonData.id,
            question: newLesson.quizQuestion,
            options: newLesson.quizOptions,
            correct_answer_index: newLesson.quizCorrectAnswer,
            position_index: 0
          }]);
          if (quizError) console.error("Erro ao salvar pergunta do quiz:", quizError);
        }

        setNewLesson({ type: 'video', title: '', duration: '', xp: 50, coins: 20, contentUrl: '', contentBody: '', quizQuestion: '', quizOptions: ['', '', '', ''], quizCorrectAnswer: 0 });
        setAddingLessonTo(null);
        loadCourses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLesson = async (lessonId: string) => {
    if (!editLessonData.title) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('edu_lessons').update({
        type: editLessonData.type,
        title: editLessonData.title,
        duration: editLessonData.duration || null,
        xp: Number(editLessonData.xp),
        coins: Number(editLessonData.coins),
        content_url: editLessonData.type === 'video' ? editLessonData.contentUrl : null,
        content_body: editLessonData.type === 'text' ? editLessonData.contentBody : null
      }).eq('id', lessonId);

      if (error) {
        console.error("Erro ao atualizar aula:", error);
        alert(`Erro ao atualizar Aula. Detalhes: ${error.message}`);
        return;
      }

      if (editLessonData.type === 'quiz') {
        if (editLessonData.quizId) {
          // Update existing question
          const { error: quizError } = await supabase.from('edu_quiz_questions').update({
            question: editLessonData.quizQuestion,
            options: editLessonData.quizOptions,
            correct_answer_index: editLessonData.quizCorrectAnswer
          }).eq('id', editLessonData.quizId);
          if (quizError) console.error("Erro ao atualizar quiz:", quizError);
        } else {
          // Insert new question (if they changed type to quiz just now)
          const { error: quizError } = await supabase.from('edu_quiz_questions').insert([{
            lesson_id: lessonId,
            question: editLessonData.quizQuestion,
            options: editLessonData.quizOptions,
            correct_answer_index: editLessonData.quizCorrectAnswer,
            position_index: 0
          }]);
          if (quizError) console.error("Erro ao inserir quiz:", quizError);
        }
      }

      setEditingLessonId(null);
      loadCourses();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta aula permanentemente?")) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('edu_lessons').delete().eq('id', lessonId);
      if (error) {
        console.error("Erro ao excluir aula:", error);
        alert(`Erro ao excluir Aula. Detalhes: ${error.message}`);
      } else {
        loadCourses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync selectedCourse when courses change
  useEffect(() => {
    if (selectedCourse) {
      const updatedCourse = courses.find(c => c.id === selectedCourse.id);
      if (updatedCourse) {
        setSelectedCourse(updatedCourse);
      }
    }
  }, [courses]);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 relative">

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setCourseToDelete(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[32px] p-8 shadow-2xl border border-neutral-200/50 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-center text-neutral-900 dark:text-white mb-2">Excluir Trilha?</h3>
            <p className="text-center text-neutral-500 mb-8 font-medium">
              Você está prestes a excluir a trilha <strong className="text-neutral-900 dark:text-white">{courseToDelete.title}</strong>. Todo o conteúdo, incluindo módulos e aulas, será perdido para sempre.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setCourseToDelete(null)}
                className="flex-1 py-4 font-bold rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDeleteCourse}
                className="flex-1 py-4 font-bold rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 transition-all active:scale-95"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      
      {view === 'list' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                <Layers className="text-indigo-500" size={32} />
                Gestão de Trilhas (Portal do Aluno)
              </h2>
              <p className="text-neutral-500 mt-1">Crie e edite o conteúdo consumido pelos alunos.</p>
            </div>
            <button 
              onClick={() => setView('create-course')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1"
            >
              <Plus size={20} />
              Nova Trilha
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>
          ) : courses.length === 0 ? (
            <div className="text-center p-12 bg-white/50 dark:bg-neutral-900/50 rounded-[32px] border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-md">
              <Compass size={48} className="mx-auto text-neutral-400 mb-4" />
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Nenhuma Trilha Encontrada</h3>
              <p className="text-neutral-500">Você ainda não criou nenhuma trilha para os alunos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <div key={course.id} className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-5 hover:shadow-xl hover:-translate-y-1 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className={`w-14 h-14 rounded-2xl bg-${course.color}-100 dark:bg-${course.color}-500/20 text-${course.color}-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform rotate-3`}>
                      {course.icon === 'Calculator' ? <Calculator size={28} /> : <BookOpen size={28} />}
                    </div>
                    <span className="text-xs font-bold text-neutral-400 flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg">
                      {course.modules.length} Fases
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-xl text-neutral-900 dark:text-white mb-1">{course.title}</h4>
                    <p className="text-xs text-neutral-500 font-medium">{course.description}</p>
                  </div>
                  
                  <div className="flex gap-2 mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button 
                      onClick={() => { setSelectedCourse(course); setView('edit-course'); }}
                      className="flex-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold py-2.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit2 size={16} /> Editar Trilha
                    </button>
                    <button 
                      onClick={() => setCourseToDelete(course)}
                      className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                      title="Excluir Trilha"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'create-course' && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
              <Compass className="text-indigo-500" size={32} />
              Criar Nova Trilha Gamificada
            </h3>
            <button onClick={() => setView('list')} className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 text-neutral-400 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-[32px] p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-xl">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Nome da Trilha</label>
                <input type="text" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} placeholder="Ex: A Jornada do Sistema Solar" className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Matéria</label>
                  <select value={newCourse.subject} onChange={e => setNewCourse({...newCourse, subject: e.target.value})} className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all">
                    <option>Matemática</option>
                    <option>Ciências</option>
                    <option>Português</option>
                    <option>História</option>
                    <option>Geografia</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Cor do Tema</label>
                  <select value={newCourse.color} onChange={e => setNewCourse({...newCourse, color: e.target.value})} className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all">
                    <option value="emerald">Verde (Emerald)</option>
                    <option value="sky">Azul (Sky)</option>
                    <option value="rose">Rosa (Rose)</option>
                    <option value="amber">Amarelo (Amber)</option>
                    <option value="purple">Roxo (Purple)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Descrição Breve</label>
                <textarea value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} rows={3} placeholder="Descreva sobre o que é esta trilha..." className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all resize-none"></textarea>
              </div>
              <button disabled={!newCourse.title} onClick={handleCreateCourse} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-sky-600 disabled:opacity-50 hover:from-indigo-500 hover:to-sky-500 text-white font-black text-lg rounded-[24px] shadow-lg transition-all flex justify-center items-center gap-3 mt-4">
                <CheckCircle2 size={24} /> Publicar Nova Trilha
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'edit-course' && selectedCourse && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
           <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                <Edit2 className="text-indigo-500" size={32} />
                Editando: {selectedCourse.title}
              </h2>
              <p className="text-neutral-500 mt-1">Adicione módulos e lições abaixo.</p>
            </div>
            <button onClick={() => setView('list')} className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:scale-105 transition-transform">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/80 dark:bg-neutral-900/80 p-6 rounded-[24px] border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-${selectedCourse.color}-100 dark:bg-${selectedCourse.color}-500/20 text-${selectedCourse.color}-500 flex items-center justify-center`}>
                  {selectedCourse.icon === 'Calculator' ? <Calculator size={24} /> : <BookOpen size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight">Módulos (Fases)</h3>
                  <p className="text-sm text-neutral-500 font-medium">{selectedCourse.modules?.length || 0} Fases criadas</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddingModule(true)}
                className="bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
              >
                <Plus size={18} /> Nova Fase
              </button>
            </div>

            {isAddingModule && (
              <div className="bg-white dark:bg-neutral-900 p-6 rounded-[24px] border-2 border-indigo-500/30 dark:border-indigo-500/50 shadow-lg animate-in fade-in slide-in-from-top-4">
                <h4 className="font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2"><Layers className="text-indigo-500" size={20} /> Adicionar Nova Fase</h4>
                <div className="space-y-4">
                  <input type="text" placeholder="Nome da Fase (ex: Introdução)" value={newModule.title} onChange={e => setNewModule({...newModule, title: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold" />
                  <textarea placeholder="Breve descrição da fase..." rows={2} value={newModule.description} onChange={e => setNewModule({...newModule, description: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"></textarea>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setIsAddingModule(false)} className="px-4 py-2 font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl">Cancelar</button>
                    <button disabled={!newModule.title} onClick={handleCreateModule} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-500/20"><Save size={16} /> Salvar Fase</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {selectedCourse.modules?.map((module, index) => (
                <div key={module.id} className="bg-white dark:bg-neutral-900 rounded-[24px] border border-neutral-200/80 dark:border-neutral-800/80 shadow-sm overflow-hidden">
                  {/* Module Header */}
                  <div 
                    onClick={() => setExpandedModules(prev => ({...prev, [module.id]: !prev[module.id]}))}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 cursor-grab active:cursor-grabbing">
                        <GripVertical size={16} />
                      </div>
                      <div>
                        <h4 className="font-black text-lg text-neutral-900 dark:text-white flex items-center gap-2">
                          <span className="text-indigo-500">Fase {index + 1}:</span> {module.title}
                        </h4>
                        <p className="text-xs text-neutral-500 font-medium">{module.lessons?.length || 0} aulas cadastradas</p>
                      </div>
                    </div>
                    <button className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                      {expandedModules[module.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>

                  {/* Module Content (Expanded) */}
                  {expandedModules[module.id] && (
                    <div className="bg-neutral-50 dark:bg-neutral-950 p-6 border-t border-neutral-100 dark:border-neutral-800">
                      <div className="space-y-3 mb-6">
                        {module.lessons?.map((lesson, lIdx) => (
                          <React.Fragment key={lesson.id}>
                            {editingLessonId === lesson.id ? (
                              <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/50 shadow-md my-2">
                                <h5 className="font-bold text-neutral-900 dark:text-white mb-4">Editando Aula: {lesson.title}</h5>
                                <div className="space-y-4">
                                  <div className="flex gap-2">
                                    {['video', 'text', 'quiz'].map(type => (
                                      <button key={type} onClick={() => setEditLessonData({...editLessonData, type})} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${editLessonData.type === type ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}>
                                        {type === 'video' ? 'Vídeo (YouTube)' : type === 'quiz' ? 'Desafio (Quiz)' : 'Leitura (Texto)'}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  <input type="text" placeholder="Título da Aula" value={editLessonData.title} onChange={e => setEditLessonData({...editLessonData, title: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold" />
                                  
                                  <div className="grid grid-cols-3 gap-4">
                                    <input type="text" placeholder="Duração (Ex: 10 min)" value={editLessonData.duration} onChange={e => setEditLessonData({...editLessonData, duration: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium" />
                                    <input type="number" placeholder="XP (Ex: 50)" value={editLessonData.xp} onChange={e => setEditLessonData({...editLessonData, xp: Number(e.target.value)})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium" />
                                    <input type="number" placeholder="Moedas (Ex: 20)" value={editLessonData.coins} onChange={e => setEditLessonData({...editLessonData, coins: Number(e.target.value)})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium" />
                                  </div>

                                  {editLessonData.type === 'video' ? (
                                    <input type="text" placeholder="Link do Vídeo (Youtube ou MP4)" value={editLessonData.contentUrl} onChange={e => setEditLessonData({...editLessonData, contentUrl: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium text-sm" />
                                  ) : editLessonData.type === 'quiz' ? (
                                    <div className="space-y-4 bg-amber-50 dark:bg-amber-500/5 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20">
                                      <textarea placeholder="Digite a Pergunta do Desafio..." rows={2} value={editLessonData.quizQuestion} onChange={e => setEditLessonData({...editLessonData, quizQuestion: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none font-bold text-sm"></textarea>
                                      <div className="space-y-2">
                                        <label className="text-xs font-bold text-neutral-500 uppercase">Alternativas (Marque a correta)</label>
                                        {editLessonData.quizOptions.map((opt, oIdx) => (
                                          <div key={oIdx} className="flex items-center gap-3">
                                            <input type="radio" name="editQuizCorrect" checked={editLessonData.quizCorrectAnswer === oIdx} onChange={() => setEditLessonData({...editLessonData, quizCorrectAnswer: oIdx})} className="w-5 h-5 text-amber-500 focus:ring-amber-500 dark:bg-neutral-800 dark:border-neutral-600" />
                                            <input type="text" placeholder={`Opção ${['A', 'B', 'C', 'D'][oIdx]}`} value={opt} onChange={e => {
                                              const newOpts = [...editLessonData.quizOptions];
                                              newOpts[oIdx] = e.target.value;
                                              setEditLessonData({...editLessonData, quizOptions: newOpts});
                                            }} className="flex-1 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-medium" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <textarea placeholder="Conteúdo da leitura..." rows={4} value={editLessonData.contentBody} onChange={e => setEditLessonData({...editLessonData, contentBody: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none font-medium text-sm"></textarea>
                                  )}

                                  <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => setEditingLessonId(null)} className="px-4 py-2 font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-sm">Cancelar</button>
                                    <button disabled={!editLessonData.title} onClick={() => handleUpdateLesson(lesson.id)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 text-sm">Salvar Alterações</button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors group">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lesson.type === 'video' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' : lesson.type === 'quiz' ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10' : 'bg-sky-50 text-sky-500 dark:bg-sky-500/10'}`}>
                                    {lesson.type === 'video' ? <Video size={18} /> : lesson.type === 'quiz' ? <HelpCircle size={18} /> : <FileText size={18} />}
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-neutral-900 dark:text-white">{lesson.title}</h5>
                                    <div className="flex items-center gap-3 text-xs font-medium text-neutral-400 mt-0.5">
                                      <span>{lesson.duration || '0 min'}</span>
                                      <span className="flex items-center gap-1 text-emerald-500"><Zap size={10} /> {lesson.xp} XP</span>
                                      <span className="flex items-center gap-1 text-amber-500"><Coins size={10} /> {lesson.coins}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => {
                                    const q = lesson.questions && lesson.questions.length > 0 ? lesson.questions[0] : null;
                                    setEditLessonData({
                                      type: lesson.type,
                                      title: lesson.title,
                                      duration: lesson.duration || '',
                                      xp: lesson.xp,
                                      coins: lesson.coins,
                                      contentUrl: lesson.contentUrl || '',
                                      contentBody: lesson.contentBody || '',
                                      quizQuestion: q?.question || '',
                                      quizOptions: q?.options || ['', '', '', ''],
                                      quizCorrectAnswer: q?.correctAnswer ?? 0,
                                      quizId: q?.id || ''
                                    });
                                    setEditingLessonId(lesson.id);
                                    setAddingLessonTo(null);
                                  }} className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center hover:text-indigo-500 transition-colors"><Edit2 size={14} /></button>
                                  <button onClick={() => handleDeleteLesson(lesson.id)} className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                        {module.lessons?.length === 0 && !addingLessonTo && (
                          <p className="text-center text-sm text-neutral-500 py-4 italic">Nenhuma aula cadastrada nesta fase.</p>
                        )}
                      </div>

                      {addingLessonTo === module.id ? (
                        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/50 shadow-md">
                          <h5 className="font-bold text-neutral-900 dark:text-white mb-4">Adicionar Nova Aula</h5>
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              {['video', 'text', 'quiz'].map(type => (
                                <button key={type} onClick={() => setNewLesson({...newLesson, type})} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${newLesson.type === type ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}>
                                  {type === 'video' ? 'Vídeo (YouTube)' : type === 'quiz' ? 'Desafio (Quiz)' : 'Leitura (Texto)'}
                                </button>
                              ))}
                            </div>
                            
                            <input type="text" placeholder="Título da Aula" value={newLesson.title} onChange={e => setNewLesson({...newLesson, title: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold" />
                            
                            <div className="grid grid-cols-3 gap-4">
                              <input type="text" placeholder="Duração (Ex: 10 min)" value={newLesson.duration} onChange={e => setNewLesson({...newLesson, duration: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium" />
                              <input type="number" placeholder="XP (Ex: 50)" value={newLesson.xp} onChange={e => setNewLesson({...newLesson, xp: Number(e.target.value)})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium" />
                              <input type="number" placeholder="Moedas (Ex: 20)" value={newLesson.coins} onChange={e => setNewLesson({...newLesson, coins: Number(e.target.value)})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium" />
                            </div>

                            {newLesson.type === 'video' ? (
                              <input type="text" placeholder="Link do Vídeo (Youtube ou MP4)" value={newLesson.contentUrl} onChange={e => setNewLesson({...newLesson, contentUrl: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium text-sm" />
                            ) : newLesson.type === 'quiz' ? (
                              <div className="space-y-4 bg-amber-50 dark:bg-amber-500/5 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20">
                                <textarea placeholder="Digite a Pergunta do Desafio..." rows={2} value={newLesson.quizQuestion} onChange={e => setNewLesson({...newLesson, quizQuestion: e.target.value})} className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none font-bold text-sm"></textarea>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-neutral-500 uppercase">Alternativas (Marque a correta)</label>
                                  {newLesson.quizOptions.map((opt, oIdx) => (
                                    <div key={oIdx} className="flex items-center gap-3">
                                      <input type="radio" name="newQuizCorrect" checked={newLesson.quizCorrectAnswer === oIdx} onChange={() => setNewLesson({...newLesson, quizCorrectAnswer: oIdx})} className="w-5 h-5 text-amber-500 focus:ring-amber-500 dark:bg-neutral-800 dark:border-neutral-600" />
                                      <input type="text" placeholder={`Opção ${['A', 'B', 'C', 'D'][oIdx]}`} value={opt} onChange={e => {
                                        const newOpts = [...newLesson.quizOptions];
                                        newOpts[oIdx] = e.target.value;
                                        setNewLesson({...newLesson, quizOptions: newOpts});
                                      }} className="flex-1 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-medium" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <textarea placeholder="Conteúdo da leitura..." rows={4} value={newLesson.contentBody} onChange={e => setNewLesson({...newLesson, contentBody: e.target.value})} className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none font-medium text-sm"></textarea>
                            )}

                            <div className="flex gap-2 justify-end pt-2">
                              <button onClick={() => setAddingLessonTo(null)} className="px-4 py-2 font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-sm">Cancelar</button>
                              <button disabled={!newLesson.title} onClick={handleCreateLesson} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 text-sm">Salvar Aula</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setAddingLessonTo(module.id)}
                          className="w-full py-4 border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-xl text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all flex items-center justify-center gap-2 bg-white/50 dark:bg-neutral-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                        >
                          <Plus size={18} /> Adicionar Nova Aula
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
