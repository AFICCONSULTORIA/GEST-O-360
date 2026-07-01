import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, BookOpen, Compass, Map, Calculator, PlayCircle, Layers, CheckCircle2, X, ChevronDown, ChevronUp, Video, FileText, HelpCircle, Save, GripVertical, Zap, Coins, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { Course, Module, Lesson } from '../../lib/api/education';
import { StudentPortal } from './StudentPortal';

export const TeacherEducationManager = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Views: 'list' | 'create-course' | 'edit-course'
  const [view, setView] = useState<'list' | 'create-course' | 'edit-course'>('list');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Success Modal State
  const [successModal, setSuccessModal] = useState<{show: boolean, message: string}>({ show: false, message: '' });

  // Wizard States
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardCourse, setWizardCourse] = useState({ title: '', subject: 'Matemática', description: '', color: 'emerald', icon: 'BookOpen' });
  const [wizardModule, setWizardModule] = useState({ title: '', description: '' });
  const [wizardLesson, setWizardLesson] = useState({ type: 'video', title: '', duration: '', xp: 50, coins: 20, contentUrl: '', contentBody: '', quizQuestion: '', quizOptions: ['', '', '', ''], quizCorrectAnswer: 0 });

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
            id, title, description, order_index,
            edu_lessons (
              id, type, title, xp_reward, coin_reward, content_url, content_body, order_index,
              edu_quiz_questions (
                id, question_text, options, correct_answer_index, order_index
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
          modules: (c.edu_modules || []).sort((a:any, b:any) => a.order_index - b.order_index).map((m: any) => ({
            id: m.id,
            course_id: c.id,
            title: m.title,
            description: m.description,
            lessons: (m.edu_lessons || []).sort((a:any, b:any) => a.order_index - b.order_index).map((l: any) => ({
              id: l.id,
              module_id: m.id,
              type: l.type,
              title: l.title,
              duration: null,
              xp: l.xp_reward,
              coins: l.coin_reward,
              contentUrl: l.content_url,
              contentBody: l.content_body,
              questions: (l.edu_quiz_questions || []).sort((a:any, b:any) => a.order_index - b.order_index).map((q: any) => ({
                id: q.id,
                lesson_id: l.id,
                question: q.question_text,
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
    // Legacy fallback (now mostly handled by wizard)
  };

  const handleWizardSubmit = async () => {
    if (!wizardCourse.title || !wizardModule.title || !wizardLesson.title) return;
    setIsLoading(true);

    try {
      console.log("Iniciando publicação em lote...");
      // 1. Inserir Trilha
      console.log("Criando Trilha:", wizardCourse);
      const { data: courseDataArr, error: courseError } = await supabase.from('edu_courses').insert([{
        title: wizardCourse.title,
        subject: wizardCourse.subject,
        description: wizardCourse.description,
        color: wizardCourse.color,
        icon: wizardCourse.icon
      }]).select();

      if (courseError) throw new Error(courseError.message || "Erro ao criar trilha");
      const courseData = courseDataArr?.[0];
      if (!courseData) throw new Error("Trilha criada, mas nenhum dado retornado (RLS?)");

      // 2. Inserir Fase
      console.log("Criando Fase:", wizardModule);
      const { data: moduleDataArr, error: moduleError } = await supabase.from('edu_modules').insert([{
        course_id: courseData.id,
        title: wizardModule.title,
        description: wizardModule.description,
        order_index: 0
      }]).select();

      if (moduleError) throw new Error(moduleError.message || "Erro ao criar fase");
      const moduleData = moduleDataArr?.[0];
      if (!moduleData) throw new Error("Fase criada, mas nenhum dado retornado");

      // 3. Inserir Aula
      console.log("Criando Aula:", wizardLesson);
      const { data: lessonDataArr, error: lessonError } = await supabase.from('edu_lessons').insert([{
        module_id: moduleData.id,
        type: wizardLesson.type,
        title: wizardLesson.title,
        xp_reward: Number(wizardLesson.xp),
        coin_reward: Number(wizardLesson.coins),
        content_url: wizardLesson.type === 'video' ? wizardLesson.contentUrl : null,
        content_body: wizardLesson.type === 'text' ? wizardLesson.contentBody : null,
        order_index: 0
      }]).select();

      if (lessonError) throw new Error(lessonError.message || "Erro ao criar aula");
      const lessonData = lessonDataArr?.[0];
      if (!lessonData) throw new Error("Aula criada, mas nenhum dado retornado");

      // 4. Se for quiz, inserir pergunta
      if (wizardLesson.type === 'quiz') {
        console.log("Criando Quiz...");
        const { error: quizError } = await supabase.from('edu_quiz_questions').insert([{
          lesson_id: lessonData.id,
          question_text: wizardLesson.quizQuestion,
          options: wizardLesson.quizOptions,
          correct_answer_index: wizardLesson.quizCorrectAnswer,
          order_index: 0
        }]);
        if (quizError) throw new Error(quizError.message || "Erro ao salvar pergunta do quiz");
      }

      console.log("Criação em lote concluída com sucesso!");

      // Sucesso total
      setSuccessModal({ show: true, message: "A trilha foi criada com sucesso e já possui a primeira fase e aula cadastradas!" });
      setView('list');
      setWizardStep(1);
      setWizardCourse({ title: '', subject: 'Matemática', description: '', color: 'emerald', icon: 'BookOpen' });
      setWizardModule({ title: '', description: '' });
      setWizardLesson({ type: 'video', title: '', duration: '', xp: 50, coins: 20, contentUrl: '', contentBody: '', quizQuestion: '', quizOptions: ['', '', '', ''], quizCorrectAnswer: 0 });
      loadCourses();

    } catch (err: any) {
      console.error(err);
      alert(`Erro na criação em lote: ${err.message}`);
    } finally {
      setIsLoading(false);
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
        order_index: positionIndex
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
        xp_reward: Number(newLesson.xp),
        coin_reward: Number(newLesson.coins),
        content_url: newLesson.type === 'video' ? newLesson.contentUrl : null,
        content_body: newLesson.type === 'text' ? newLesson.contentBody : null,
        order_index: positionIndex
      }]).select().single();

      if (error) {
        console.error("Erro ao criar aula:", error);
        alert(`Erro ao criar Aula. Detalhes: ${error.message}`);
      } else {
        if (newLesson.type === 'quiz' && newLessonData) {
          const { error: quizError } = await supabase.from('edu_quiz_questions').insert([{
            lesson_id: newLessonData.id,
            question_text: newLesson.quizQuestion,
            options: newLesson.quizOptions,
            correct_answer_index: newLesson.quizCorrectAnswer,
            order_index: 0
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
        xp_reward: Number(editLessonData.xp),
        coin_reward: Number(editLessonData.coins),
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
            question_text: editLessonData.quizQuestion,
            options: editLessonData.quizOptions,
            correct_answer_index: editLessonData.quizCorrectAnswer
          }).eq('id', editLessonData.quizId);
          if (quizError) console.error("Erro ao atualizar quiz:", quizError);
        } else {
          // Insert new question (if they changed type to quiz just now)
          const { error: quizError } = await supabase.from('edu_quiz_questions').insert([{
            lesson_id: lessonId,
            question_text: editLessonData.quizQuestion,
            options: editLessonData.quizOptions,
            correct_answer_index: editLessonData.quizCorrectAnswer,
            order_index: 0
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

  const handleReorderLesson = async (moduleId: string, lessonIndex: number, direction: 'up' | 'down') => {
    if (!selectedCourse) return;
    
    const course = { ...selectedCourse };
    const mod = course.modules?.find(m => m.id === moduleId);
    if (!mod || !mod.lessons) return;
    
    const targetIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIndex < 0 || targetIndex >= mod.lessons.length) return;
    
    const lessons = [...mod.lessons];
    const temp = lessons[lessonIndex];
    lessons[lessonIndex] = lessons[targetIndex];
    lessons[targetIndex] = temp;
    
    mod.lessons = lessons;
    setSelectedCourse(course);
    
    try {
      await supabase.from('edu_lessons').update({ position_index: targetIndex }).eq('id', lessons[lessonIndex].id);
      await supabase.from('edu_lessons').update({ position_index: lessonIndex }).eq('id', lessons[targetIndex].id);
      loadCourses();
    } catch (err) {
      console.error('Erro ao reordenar:', err);
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

      {/* Preview Modal */}
      {previewCourseId && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-neutral-950 overflow-hidden">
          <StudentPortal onBack={() => setPreviewCourseId(null)} previewCourseId={previewCourseId} />
        </div>
      )}

      {/* Success Modal */}
      {successModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSuccessModal({ show: false, message: '' })}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[32px] p-8 shadow-2xl border border-neutral-200/50 dark:border-neutral-800 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="animate-[bounce_2s_ease-in-out_infinite]" />
            </div>
            <h3 className="text-2xl font-black text-center text-neutral-900 dark:text-white mb-3">Tudo Pronto!</h3>
            <p className="text-center text-neutral-500 dark:text-neutral-400 mb-8 font-medium">
              {successModal.message}
            </p>
            <button 
              onClick={() => setSuccessModal({ show: false, message: '' })}
              className="w-full py-4 font-bold rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 group"
            >
              Continuar
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

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
                      onClick={() => setPreviewCourseId(course.id)}
                      className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors shrink-0"
                      title="Visualizar como Aluno"
                    >
                      <PlayCircle size={16} />
                    </button>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-neutral-900/60 dark:bg-black/80 backdrop-blur-md transition-opacity" onClick={() => {
              setView('list');
              setWizardStep(1);
          }}></div>
          
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-[32px] p-6 md:p-10 border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8 flex-shrink-0">
              <h3 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                <Compass className="text-indigo-500" size={32} />
                Criador de Trilhas
              </h3>
              <button onClick={() => {
                setView('list');
                setWizardStep(1);
              }} className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {/* Progresso do Wizard */}
            <div className="flex items-center justify-between mb-8 relative z-10">
              {[1, 2, 3].map((step) => (
                <div key={step} className={`flex-1 flex flex-col items-center gap-2 relative ${step !== 3 ? 'after:content-[\'\'] after:absolute after:top-5 after:left-[50%] after:w-full after:h-1' : ''} ${step < wizardStep ? 'after:bg-emerald-500' : 'after:bg-neutral-200 dark:after:bg-neutral-800'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black z-10 transition-colors duration-300 ${wizardStep === step ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-500/20' : wizardStep > step ? 'bg-emerald-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                    {wizardStep > step ? <CheckCircle2 size={20} /> : step}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-widest mt-1 ${wizardStep === step ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400'}`}>
                    {step === 1 ? '1. A Trilha' : step === 2 ? '2. A Fase' : '3. A Aula'}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-6 relative z-10 min-h-[350px]">
              {/* Step 1 */}
              {wizardStep === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Nome da Trilha</label>
                    <input type="text" value={wizardCourse.title} onChange={e => setWizardCourse({...wizardCourse, title: e.target.value})} placeholder="Ex: A Jornada do Sistema Solar" className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Matéria</label>
                      <select value={wizardCourse.subject} onChange={e => setWizardCourse({...wizardCourse, subject: e.target.value})} className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all">
                        <option>Matemática</option>
                        <option>Ciências</option>
                        <option>Português</option>
                        <option>História</option>
                        <option>Geografia</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Cor do Tema</label>
                      <select value={wizardCourse.color} onChange={e => setWizardCourse({...wizardCourse, color: e.target.value})} className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all">
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
                    <textarea value={wizardCourse.description} onChange={e => setWizardCourse({...wizardCourse, description: e.target.value})} rows={3} placeholder="Descreva sobre o que é esta trilha..." className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all resize-none"></textarea>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {wizardStep === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Nome da Primeira Fase (Módulo)</label>
                    <input type="text" value={wizardModule.title} onChange={e => setWizardModule({...wizardModule, title: e.target.value})} placeholder="Ex: Introdução ao Tema" className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Descrição da Fase (Opcional)</label>
                    <textarea value={wizardModule.description} onChange={e => setWizardModule({...wizardModule, description: e.target.value})} rows={3} placeholder="O que os alunos vão aprender nesta fase?" className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all resize-none"></textarea>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {wizardStep === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                  <div className="flex items-center gap-4 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                    {['video', 'text', 'quiz'].map((type) => (
                      <button 
                        key={type}
                        onClick={() => setWizardLesson({...wizardLesson, type: type as any})}
                        className={`flex-1 py-3 px-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${wizardLesson.type === type ? 'bg-white dark:bg-neutral-900 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                      >
                        {type === 'video' && <Video size={18} />}
                        {type === 'text' && <FileText size={18} />}
                        {type === 'quiz' && <HelpCircle size={18} />}
                        <span className="capitalize">{type}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Título da Primeira Aula</label>
                    <input type="text" value={wizardLesson.title} onChange={e => setWizardLesson({...wizardLesson, title: e.target.value})} placeholder="Ex: O que é o Sistema Solar?" className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all" />
                  </div>

                  {wizardLesson.type === 'video' && (
                    <div>
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">URL do Vídeo (YouTube)</label>
                      <input type="url" value={wizardLesson.contentUrl} onChange={e => setWizardLesson({...wizardLesson, contentUrl: e.target.value})} placeholder="https://youtube.com/watch?v=..." className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all" />
                    </div>
                  )}

                  {wizardLesson.type === 'text' && (
                    <div>
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Conteúdo em Texto</label>
                      <textarea value={wizardLesson.contentBody} onChange={e => setWizardLesson({...wizardLesson, contentBody: e.target.value})} rows={4} placeholder="Escreva o conteúdo da aula..." className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all resize-none"></textarea>
                    </div>
                  )}

                  {wizardLesson.type === 'quiz' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block">Pergunta do Quiz</label>
                        <input type="text" value={wizardLesson.quizQuestion} onChange={e => setWizardLesson({...wizardLesson, quizQuestion: e.target.value})} placeholder="Ex: Qual é o maior planeta do Sistema Solar?" className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[0, 1, 2, 3].map((index) => (
                          <div key={index} className="flex items-center gap-3">
                            <button 
                              onClick={() => setWizardLesson({...wizardLesson, quizCorrectAnswer: index})}
                              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${wizardLesson.quizCorrectAnswer === index ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-300 dark:border-neutral-600'}`}
                            >
                              {wizardLesson.quizCorrectAnswer === index && <CheckCircle2 size={14} />}
                            </button>
                            <input type="text" value={wizardLesson.quizOptions[index]} onChange={e => {
                              const newOpts = [...wizardLesson.quizOptions];
                              newOpts[index] = e.target.value;
                              setWizardLesson({...wizardLesson, quizOptions: newOpts});
                            }} placeholder={`Opção ${index + 1}`} className={`flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-2 rounded-xl outline-none font-bold transition-colors ${wizardLesson.quizCorrectAnswer === index ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-neutral-200 dark:border-neutral-700 focus:border-indigo-500'}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block flex items-center gap-1"><Zap size={14} className="text-amber-500"/> Recompensa (XP)</label>
                      <input type="number" value={wizardLesson.xp} onChange={e => setWizardLesson({...wizardLesson, xp: e.target.value as any})} className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-neutral-500 uppercase tracking-widest pl-4 mb-2 block flex items-center gap-1"><Coins size={14} className="text-amber-500"/> Moedas Edu</label>
                      <input type="number" value={wizardLesson.coins} onChange={e => setWizardLesson({...wizardLesson, coins: e.target.value as any})} className="w-full px-6 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-[24px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-base font-bold transition-all" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-4 mt-10 pt-6 border-t border-neutral-200/50 dark:border-neutral-800/50">
              {wizardStep > 1 && (
                <button 
                  onClick={() => setWizardStep(wizardStep - 1 as any)} 
                  className="px-6 py-4 rounded-[24px] font-bold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
                >
                  Voltar
                </button>
              )}
              
              {wizardStep < 3 ? (
                <button 
                  disabled={(wizardStep === 1 && !wizardCourse.title) || (wizardStep === 2 && !wizardModule.title)} 
                  onClick={() => setWizardStep(wizardStep + 1 as any)} 
                  className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-sky-600 disabled:opacity-50 hover:from-indigo-500 hover:to-sky-500 text-white font-black text-lg rounded-[24px] shadow-lg transition-all flex justify-center items-center gap-2"
                >
                  Próximo Passo <ArrowRight size={20} />
                </button>
              ) : (
                <button 
                  disabled={!wizardLesson.title || isLoading} 
                  onClick={handleWizardSubmit} 
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-50 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-lg rounded-[24px] shadow-lg shadow-emerald-500/20 transition-all flex justify-center items-center gap-2"
                >
                  <CheckCircle2 size={24} /> {isLoading ? "Publicando..." : "Concluir e Publicar Trilha"}
                </button>
              )}
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
                                  {lIdx > 0 && (
                                    <button onClick={() => handleReorderLesson(module.id, lIdx, 'up')} className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center hover:text-indigo-500 transition-colors" title="Mover para cima"><ArrowUp size={14} /></button>
                                  )}
                                  {lIdx < (module.lessons?.length || 0) - 1 && (
                                    <button onClick={() => handleReorderLesson(module.id, lIdx, 'down')} className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center hover:text-indigo-500 transition-colors" title="Mover para baixo"><ArrowDown size={14} /></button>
                                  )}
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
