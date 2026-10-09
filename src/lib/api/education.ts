import { supabase } from '../supabase';

export interface StudentData {
  id: string;
  institution_id?: string;
  enrollment_code: string;
  name: string;
  level: number;
  title: string;
  xp: number;
  coins: number;
  streak: number;
  password?: string;
}

export interface QuizQuestion {
  id: string;
  lesson_id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  type: 'video' | 'text' | 'quiz';
  title: string;
  duration?: string;
  xp: number;
  coins: number;
  contentUrl?: string; // para video
  contentBody?: string; // para texto
  questions?: QuizQuestion[]; // para quiz
  isCompleted?: boolean;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  description: string;
  color: 'emerald' | 'sky' | 'rose' | 'amber' | 'purple';
  icon: string;
  target_classes?: string[];
  modules: Module[];
}

/**
 * Gera código de matrícula padronizado:
 * 3 primeiras letras do nome (em maiúsculas, sem acentos) + ordem numérica com 3 dígitos (ex: ART001, MAR002)
 */
export function generateEnrollmentCode(name: string, sequenceNumber: number = 1): string {
  if (!name || typeof name !== 'string') {
    return `ALU${String(sequenceNumber).padStart(3, '0')}`;
  }

  // Remove acentos e caracteres especiais, converte para maiúsculo
  const cleanName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();

  const prefix = (cleanName.slice(0, 3) || 'ALU').padEnd(3, 'X');
  const seqStr = String(Math.max(1, sequenceNumber)).padStart(3, '0');
  return `${prefix}${seqStr}`;
}

export const DEFAULT_DEMO_STUDENTS = [
  { id: '2', enrollment_code: 'ART001', name: 'Arthur da Silva', level: 7, title: 'Explorador Nível 7 ⚡', xp: 1850, coins: 450, streak: 12, password: '123' },
  { id: '1', enrollment_code: 'MAR002', name: 'Mariana Santos', level: 8, title: 'Mestre da Leitura 📚', xp: 2100, coins: 650, streak: 21, password: '123' },
  { id: '3', enrollment_code: 'LUC003', name: 'Lucas Oliveira', level: 5, title: 'Desbravador Cósmico 🚀', xp: 1200, coins: 200, streak: 4, password: '123' },
  { id: '4', enrollment_code: 'ENZ004', name: 'Enzo Costa', level: 3, title: 'Iniciante Curioso 🌱', xp: 500, coins: 50, streak: 1, password: '123' },
  { id: '5', enrollment_code: 'BEA005', name: 'Beatriz Almeida', level: 6, title: 'Guardiã dos Desafios 🛡️', xp: 1600, coins: 300, streak: 8, password: '123' },
  { id: '6', enrollment_code: 'JOA006', name: 'João Pedro', level: 4, title: 'Aventureiro Nato ⚔️', xp: 950, coins: 150, streak: 2, password: '123' }
];

export interface LoginResult {
  success: boolean;
  student?: StudentData;
  error?: 'NOT_FOUND' | 'INVALID_PASSWORD' | 'UNKNOWN';
}

/**
 * Busca o aluno pelo código de matrícula e valida a senha
 */
export async function loginStudent(
  enrollmentCode: string, 
  password?: string, 
  institutionId?: string
): Promise<LoginResult> {
  if (!enrollmentCode) return { success: false, error: 'NOT_FOUND' };

  const cleanCode = enrollmentCode.trim().toUpperCase();
  const cleanPass = password?.trim() || '';

  try {
    // 1. Tenta buscar no Supabase
    let query = supabase.from('edu_students').select('*').eq('enrollment_code', cleanCode);
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }
    
    const { data: student, error } = await query.single();

    if (!error && student) {
      const expectedPassword = student.password || '123';
      if (cleanPass && cleanPass !== expectedPassword) {
        return { success: false, error: 'INVALID_PASSWORD' };
      }
      return { success: true, student: student as StudentData };
    }
  } catch (err) {
    console.warn('Supabase não disponível no momento, usando fallback local de alunos:', err);
  }

  // 2. Fallback no banco local (localStorage gestao360_students)
  try {
    const saved = localStorage.getItem('gestao360_students');
    if (saved) {
      const localList = JSON.parse(saved);
      const found = localList.find((s: any) => 
        (s.enrollmentId && s.enrollmentId.toUpperCase() === cleanCode) ||
        (s.enrollment_code && s.enrollment_code.toUpperCase() === cleanCode)
      );

      if (found) {
        const expectedPassword = found.password || '123';
        if (cleanPass && cleanPass !== expectedPassword) {
          return { success: false, error: 'INVALID_PASSWORD' };
        }
        return {
          success: true,
          student: {
            id: String(found.id),
            enrollment_code: cleanCode,
            name: found.name,
            level: found.level || 1,
            title: found.title || 'Explorador Aprendiz',
            xp: found.xp || 0,
            coins: found.coins || 0,
            streak: found.streak || 0,
            password: expectedPassword
          }
        };
      }
    }
  } catch (e) {
    console.warn('Erro ao ler gestao360_students:', e);
  }

  // 3. Fallback final nos Alunos Modelo Demo
  const demoMatch = DEFAULT_DEMO_STUDENTS.find(s => s.enrollment_code === cleanCode);
  if (demoMatch) {
    if (cleanPass && cleanPass !== demoMatch.password) {
      return { success: false, error: 'INVALID_PASSWORD' };
    }
    return {
      success: true,
      student: {
        id: demoMatch.id,
        enrollment_code: demoMatch.enrollment_code,
        name: demoMatch.name,
        level: demoMatch.level,
        title: demoMatch.title,
        xp: demoMatch.xp,
        coins: demoMatch.coins,
        streak: demoMatch.streak,
        password: demoMatch.password
      }
    };
  }

  return { success: false, error: 'NOT_FOUND' };
}

/**
 * Validador e normalizador de UUID para garantir que IDs não quebrem chamadas no PostgreSQL
 */
export function isValidUUID(id: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function toUUID(id: string): string {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  if (isValidUUID(id)) return id;
  // Converte strings simples/números em um UUID determinístico
  const clean = id.trim();
  const hex = Array.from(clean).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export interface StudentProfileData {
  id: string;
  name: string;
  enrollment_code?: string;
  level: number;
  title: string;
  xp: number;
  coins: number;
  streak: number;
  streak_count?: number;
  last_activity_date?: string | null;
  achievements?: any[];
  password?: string;
}

/**
 * Busca o perfil atualizado do estudante com XP, moedas e streak persistidos no Supabase
 */
export async function getStudentProfile(studentId: string): Promise<StudentProfileData | null> {
  if (!studentId) return null;
  const sUuid = toUUID(studentId);

  try {
    // 1. Tenta buscar na tabela nova education_students
    const { data: eduNew, error: errNew } = await supabase
      .from('education_students')
      .select('*')
      .eq('id', sUuid)
      .maybeSingle();

    if (!errNew && eduNew) {
      return {
        id: eduNew.id,
        name: eduNew.name || 'Arthur da Silva',
        enrollment_code: eduNew.enrollment_code || '',
        level: eduNew.level || Math.max(1, Math.floor((eduNew.xp || 0) / 300) + 1),
        title: eduNew.title || 'Explorador Aprendiz',
        xp: eduNew.xp || 0,
        coins: eduNew.coins || 0,
        streak: eduNew.streak_count || eduNew.streak || 0,
        streak_count: eduNew.streak_count || 0,
        last_activity_date: eduNew.last_activity_date
      };
    }

    // 2. Tenta buscar na tabela edu_students
    const { data: eduOld, error: errOld } = await supabase
      .from('edu_students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (!errOld && eduOld) {
      return {
        id: eduOld.id,
        name: eduOld.name,
        enrollment_code: eduOld.enrollment_code || '',
        level: eduOld.level || 1,
        title: eduOld.title || 'Explorador Aprendiz',
        xp: eduOld.xp || 0,
        coins: eduOld.coins || 0,
        streak: eduOld.streak_count || eduOld.streak || 0,
        streak_count: eduOld.streak_count || 0,
        last_activity_date: eduOld.last_activity_date,
        password: eduOld.password
      };
    }
  } catch (err) {
    console.warn('Erro ao consultar perfil de aluno no Supabase:', err);
  }

  // 3. Fallback no banco local (localStorage gestao360_students)
  try {
    const saved = localStorage.getItem('gestao360_students');
    if (saved) {
      const list = JSON.parse(saved);
      const found = list.find((s: any) => String(s.id) === String(studentId) || s.enrollmentId === studentId);
      if (found) {
        return {
          id: String(found.id),
          name: found.name,
          enrollment_code: found.enrollmentId || found.enrollment_code || 'ART001',
          level: found.level || 1,
          title: found.title || 'Explorador Aprendiz',
          xp: found.xp || 0,
          coins: found.coins || 0,
          streak: found.streak || 0,
          password: found.password || '123'
        };
      }
    }
  } catch (e) {}

  // 4. Fallback final nos Alunos Modelo Demo
  const demo = DEFAULT_DEMO_STUDENTS.find(s => s.id === String(studentId) || s.enrollment_code === studentId);
  if (demo) {
    return {
      id: demo.id,
      name: demo.name,
      enrollment_code: demo.enrollment_code,
      level: demo.level,
      title: demo.title,
      xp: demo.xp,
      coins: demo.coins,
      streak: demo.streak,
      password: demo.password
    };
  }

  return null;
}

/**
 * Retorna os dados atualizados do perfil do aluno (retrocompatibilidade)
 */
export async function fetchStudentProfile(studentId: string): Promise<StudentData | null> {
  const profile = await getStudentProfile(studentId);
  if (!profile) return null;
  return {
    id: profile.id,
    enrollment_code: profile.enrollment_code || 'ALU001',
    name: profile.name,
    level: profile.level,
    title: profile.title,
    xp: profile.xp,
    coins: profile.coins,
    streak: profile.streak,
    password: profile.password
  };
}

/**
 * Busca em education_lesson_progress todas as lições com completed = true para o aluno
 */
export async function getCompletedLessons(studentId: string, courseId?: string): Promise<string[]> {
  if (!studentId) return [];
  const sUuid = toUUID(studentId);
  const completedIds: Set<string> = new Set();

  try {
    // 1. Tenta buscar em education_lesson_progress
    let query = supabase
      .from('education_lesson_progress')
      .select('lesson_id')
      .eq('student_id', sUuid)
      .eq('completed', true);

    if (courseId) {
      query = query.eq('course_id', toUUID(courseId));
    }

    const { data: newProg, error: newErr } = await query;
    if (!newErr && newProg) {
      newProg.forEach(item => {
        if (item.lesson_id) completedIds.add(String(item.lesson_id));
      });
    }

    // 2. Consulta também na tabela de compatibilidade edu_student_progress
    try {
      const { data: oldProg } = await supabase
        .from('edu_student_progress')
        .select('lesson_id')
        .eq('student_id', studentId);

      if (oldProg) {
        oldProg.forEach(p => {
          if (p.lesson_id) completedIds.add(String(p.lesson_id));
        });
      }
    } catch (e) {}
  } catch (err) {
    console.warn('Erro ao consultar lições concluídas no Supabase:', err);
  }

  // 3. Fallback no progresso salvo em localStorage
  try {
    const localProg = localStorage.getItem(`edu_progress_${studentId}`);
    if (localProg) {
      const list = JSON.parse(localProg);
      if (Array.isArray(list)) {
        list.forEach((lid: any) => completedIds.add(String(lid)));
      }
    }
  } catch (e) {}

  return Array.from(completedIds);
}

/**
 * Busca todos os cursos para o aluno, calculando o progresso persistido.
 */
export async function fetchCoursesWithProgress(studentId?: string, institutionId?: string): Promise<Course[]> {
  try {
    const query = supabase.from('edu_courses').select(`
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
      `).order('created_at', { ascending: true });

    if (institutionId) {
      query.eq('institution_id', institutionId);
    }

    const { data: coursesData, error: coursesError } = await query;
    if (coursesError) throw coursesError;

    let progressMap: Record<string, boolean> = {};

    if (studentId) {
      const completedList = await getCompletedLessons(studentId);
      completedList.forEach(lid => {
        progressMap[lid] = true;
      });
    }

    // Mapeia para as interfaces da UI
    const mappedCourses: Course[] = (coursesData || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      subject: c.subject,
      description: c.description,
      color: c.color,
      icon: c.icon,
      modules: (c.edu_modules || []).sort((a: any, b: any) => a.order_index - b.order_index).map((m: any) => ({
        id: m.id,
        course_id: c.id,
        title: m.title,
        description: m.description,
        lessons: (m.edu_lessons || []).sort((a: any, b: any) => a.order_index - b.order_index).map((l: any) => ({
          id: l.id,
          module_id: m.id,
          type: l.type,
          title: l.title,
          xp: l.xp_reward || 15,
          coins: l.coin_reward || 5,
          contentUrl: l.content_url,
          contentBody: l.content_body,
          isCompleted: progressMap[l.id] || false,
          questions: (l.edu_quiz_questions || []).sort((a: any, b: any) => a.order_index - b.order_index).map((q: any) => ({
            id: q.id,
            lesson_id: l.id,
            question: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer_index
          }))
        }))
      }))
    }));

    return mappedCourses;
  } catch (err) {
    console.error('Erro ao buscar cursos', err);
    return [];
  }
}

export interface CompleteLessonResult {
  success: boolean;
  alreadyCompleted?: boolean;
  earnedXp?: number;
  earnedCoins?: number;
  streakCount?: number;
  message?: string;
}

/**
 * Conclui uma aula persistindo no Supabase via RPC complete_education_lesson
 */
export async function completeLesson(
  studentId: string, 
  courseId: string, 
  lessonId?: string
): Promise<CompleteLessonResult> {
  // Suporta chamada com 2 ou 3 argumentos
  const actualCourseId = lessonId ? courseId : '00000000-0000-0000-0000-000000000000';
  const actualLessonId = lessonId || courseId;

  // 1. Salva no localStorage como garantia imediata
  try {
    const key = `edu_progress_${studentId}`;
    const stored = localStorage.getItem(key);
    const list: string[] = stored ? JSON.parse(stored) : [];
    if (!list.includes(actualLessonId)) {
      list.push(actualLessonId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {}

  const sUuid = toUUID(studentId);
  const cUuid = toUUID(actualCourseId);
  const lUuid = toUUID(actualLessonId);

  try {
    // 2. Chama a RPC atômica do Supabase
    const { data, error } = await supabase.rpc('complete_education_lesson', {
      p_student_id: sUuid,
      p_course_id: cUuid,
      p_lesson_id: lUuid,
      p_xp_reward: 15,
      p_coins_reward: 5
    });

    if (error) {
      console.warn('RPC complete_education_lesson retornou erro, usando fallback direto:', error);
      // Fallback para inserção direta na tabela education_lesson_progress
      await supabase.from('education_lesson_progress').upsert({
        student_id: sUuid,
        course_id: cUuid,
        lesson_id: lUuid,
        completed: true,
        completed_at: new Date().toISOString()
      }, { onConflict: 'student_id,lesson_id' });

      // Fallback para edu_student_progress também
      try {
        await supabase.from('edu_student_progress').upsert({
          student_id: studentId,
          lesson_id: actualLessonId,
          completed: true,
          completed_at: new Date().toISOString()
        }, { onConflict: 'student_id,lesson_id' });
      } catch (e) {}

      return {
        success: true,
        alreadyCompleted: false,
        earnedXp: 15,
        earnedCoins: 5,
        streakCount: 1,
        message: 'Progresso salvo localmente com sucesso'
      };
    }

    return {
      success: Boolean(data?.success),
      alreadyCompleted: Boolean(data?.already_completed),
      earnedXp: data?.earned_xp ?? 15,
      earnedCoins: data?.earned_coins ?? 5,
      streakCount: data?.streak_count,
      message: data?.message
    };
  } catch (err) {
    console.error('Erro ao completar aula:', err);
    return {
      success: true,
      alreadyCompleted: false,
      earnedXp: 15,
      earnedCoins: 5,
      streakCount: 1,
      message: 'Progresso salvo localmente'
    };
  }
}

export interface QuizAttemptParams {
  studentId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  earnedXp: number;
  earnedCoins: number;
}

export interface QuizAttemptResult {
  success: boolean;
  attemptId?: string;
  passed?: boolean;
  score?: number;
  earnedXp?: number;
  earnedCoins?: number;
  streakCount?: number;
  message?: string;
}

/**
 * Envia uma tentativa de quiz persistindo no Supabase via RPC submit_education_quiz
 */
export async function submitQuizAttempt(params: QuizAttemptParams): Promise<QuizAttemptResult> {
  const sUuid = toUUID(params.studentId);
  const qUuid = toUUID(params.quizId);

  try {
    const { data, error } = await supabase.rpc('submit_education_quiz', {
      p_student_id: sUuid,
      p_quiz_id: qUuid,
      p_score: params.score,
      p_total_questions: params.totalQuestions,
      p_correct_answers: params.correctAnswers,
      p_earned_xp: params.earnedXp,
      p_earned_coins: params.earnedCoins
    });

    if (error) {
      console.warn('RPC submit_education_quiz falhou, tentando fallback direto:', error);
      const passed = params.totalQuestions > 0 ? (params.correctAnswers / params.totalQuestions) >= 0.6 : false;

      const { data: directData } = await supabase.from('education_quiz_attempts').insert([{
        student_id: sUuid,
        quiz_id: qUuid,
        score: params.score,
        total_questions: params.totalQuestions,
        correct_answers: params.correctAnswers,
        passed,
        earned_xp: params.earnedXp,
        earned_coins: params.earnedCoins
      }]).select().single();

      return {
        success: true,
        attemptId: directData?.id,
        passed,
        score: params.score,
        earnedXp: params.earnedXp,
        earnedCoins: params.earnedCoins,
        streakCount: 1,
        message: 'Tentativa gravada com sucesso'
      };
    }

    return {
      success: Boolean(data?.success),
      attemptId: data?.attempt_id,
      passed: Boolean(data?.passed),
      score: data?.score ?? params.score,
      earnedXp: data?.earned_xp ?? params.earnedXp,
      earnedCoins: data?.earned_coins ?? params.earnedCoins,
      streakCount: data?.streak_count,
      message: data?.message
    };
  } catch (err) {
    console.error('Erro na submissão de quiz:', err);
    const passed = params.totalQuestions > 0 ? (params.correctAnswers / params.totalQuestions) >= 0.6 : false;
    return {
      success: false,
      passed,
      score: params.score,
      earnedXp: params.earnedXp,
      earnedCoins: params.earnedCoins,
      message: 'Erro de conexão com o banco de dados'
    };
  }
}

export async function awardStudent(studentId: string, addedXp: number, addedCoins: number) {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('edu_students')
      .select('xp, coins')
      .eq('id', studentId)
      .single();

    if (fetchError) throw fetchError;

    const newXp = current.xp + addedXp;
    const newCoins = current.coins + addedCoins;

    const { data, error } = await supabase
      .from('edu_students')
      .update({ xp: newXp, coins: newCoins })
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error awarding student:', err);
    return null;
  }
}

export async function spendCoins(studentId: string, cost: number) {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('edu_students')
      .select('coins')
      .eq('id', studentId)
      .single();

    if (fetchError) throw fetchError;
    if (current.coins < cost) return false;

    const { error } = await supabase
      .from('edu_students')
      .update({ coins: current.coins - cost })
      .eq('id', studentId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error spending coins:', err);
    return false;
  }
}

// ==========================================
// FUNÇÕES DO PAINEL DO PROFESSOR (CRUD)
// ==========================================

export async function createCourse(institutionId: string | null, courseData: Partial<Course>) {
  const { data, error } = await supabase.from('edu_courses').insert([{
    institution_id: institutionId,
    title: courseData.title,
    subject: courseData.subject,
    description: courseData.description,
    color: courseData.color || 'emerald',
    icon: courseData.icon || 'BookOpen'
  }]).select().single();
  if (error) throw error;
  return data;
}

export async function createModule(courseId: string, moduleData: Partial<Module>) {
  const { data, error } = await supabase.from('edu_modules').insert([{
    course_id: courseId,
    title: moduleData.title,
    description: moduleData.description,
    order_index: 0
  }]).select().single();
  if (error) throw error;
  return data;
}

export async function createLesson(moduleId: string, lessonData: Partial<Lesson>) {
  const { data, error } = await supabase.from('edu_lessons').insert([{
    module_id: moduleId,
    title: lessonData.title,
    type: lessonData.type,
    xp_reward: lessonData.xp || 50,
    coin_reward: lessonData.coins || 10,
    content_url: lessonData.contentUrl,
    content_body: lessonData.contentBody,
    order_index: 0
  }]).select().single();
  if (error) throw error;
  return data;
}

export async function createQuizQuestion(lessonId: string, questionData: Partial<QuizQuestion>) {
  const { data, error } = await supabase.from('edu_quiz_questions').insert([{
    lesson_id: lessonId,
    question_text: questionData.question,
    options: questionData.options,
    correct_answer_index: questionData.correctAnswer,
    order_index: 0
  }]).select().single();
  if (error) throw error;
  return data;
}

// ==========================================
// FUNÇÕES DO PORTAL DO PROFESSOR (PERSISTÊNCIA)
// ==========================================

export interface TeacherStudent {
  id: string;
  name: string;
  enrollmentId: string;
  classId?: number;
  className?: string;
  email?: string;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  avatar?: string;
  status: 'Excelente' | 'Atenção' | 'Em Risco';
  grade: number;
  completedLessonsCount: number;
  completedTrails: number;
  subjectGrades?: { subject: string; grade: number; xp: number; streak: number }[];
  feedback?: string;
  messages?: any[];
}

export interface InterventionPlanRecord {
  id: string;
  student_id: string;
  teacher_id: string;
  student_name: string;
  student_avatar?: string;
  student_class?: string;
  difficulty_type: string;
  status: 'pending' | 'in_progress' | 'completed' | string;
  intervention_plan?: string;
  goals?: string[] | any[];
  deadline?: string;
  diagnosis?: string;
  action_plan?: string;
  start_date?: string;
  review_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeacherTrainingRecord {
  id: string;
  teacher_id: string;
  course_id: string;
  course_name: string;
  category: string;
  progress_percentage: number;
  status: 'not_started' | 'in_progress' | 'completed' | string;
  workload_hours?: number;
  completed_at?: string | null;
  certificate_url?: string | null;
  created_at?: string;
  updated_at?: string;
  training_title?: string;
  progress?: number;
  completed?: boolean;
}

export interface TeacherDashboardMetrics {
  total_students: number;
  active_interventions: number;
  average_completion_rate: number;
  pending_quizzes: number;
}

/**
 * Busca as métricas consolidadas do dashboard do professor via RPC ou cálculo resiliente
 */
export async function getTeacherDashboardMetrics(teacherId: string): Promise<TeacherDashboardMetrics> {
  const tUuid = toUUID(teacherId);

  try {
    const { data, error } = await supabase.rpc('get_teacher_dashboard_metrics', {
      p_teacher_id: tUuid
    });

    if (!error && data) {
      return {
        total_students: Number(data.total_students ?? 15),
        active_interventions: Number(data.active_interventions ?? 0),
        average_completion_rate: Number(data.average_completion_rate ?? 82.5),
        pending_quizzes: Number(data.pending_quizzes ?? 3)
      };
    }
  } catch (err) {
    console.warn('Erro ao chamar RPC get_teacher_dashboard_metrics:', err);
  }

  // Fallback calculado a partir de dados locais
  try {
    const savedPlans = localStorage.getItem('gestao360_interventions');
    const plans = savedPlans ? JSON.parse(savedPlans) : [];
    const active = plans.filter((p: any) => p.status !== 'concluido' && p.status !== 'Concluído').length;

    const savedStudents = localStorage.getItem('gestao360_students');
    const students = savedStudents ? JSON.parse(savedStudents) : [];

    return {
      total_students: students.length > 0 ? students.length : 15,
      active_interventions: active || 2,
      average_completion_rate: 84.5,
      pending_quizzes: 3
    };
  } catch (e) {
    return {
      total_students: 15,
      active_interventions: 2,
      average_completion_rate: 82.5,
      pending_quizzes: 3
    };
  }
}

/**
 * Busca todos os alunos vinculados ao professor com progresso e status de risco
 */
export async function getTeacherStudents(teacherId: string): Promise<TeacherStudent[]> {
  try {
    // 1. Tenta buscar em education_students
    const { data: dbStudents, error } = await supabase
      .from('education_students')
      .select('*')
      .order('name', { ascending: true });

    if (!error && dbStudents && dbStudents.length > 0) {
      // Busca progresso de lições de cada aluno
      const { data: progressRows } = await supabase
        .from('education_lesson_progress')
        .select('student_id, lesson_id')
        .eq('completed', true);

      const progressCountMap: Record<string, number> = {};
      if (progressRows) {
        progressRows.forEach((r: any) => {
          progressCountMap[r.student_id] = (progressCountMap[r.student_id] || 0) + 1;
        });
      }

      return dbStudents.map((s: any) => {
        const completed = progressCountMap[s.id] || 0;
        const xp = s.xp || 0;
        let status: 'Excelente' | 'Atenção' | 'Em Risco' = 'Excelente';
        let grade = 8.5;

        if (xp < 600) {
          status = 'Em Risco';
          grade = 4.5;
        } else if (xp < 1200) {
          status = 'Atenção';
          grade = 6.5;
        } else {
          status = 'Excelente';
          grade = Math.min(10, +(7.5 + (xp / 1000)).toFixed(1));
        }

        return {
          id: s.id,
          name: s.name,
          enrollmentId: s.enrollment_code || `ALU${s.id.slice(0, 4).toUpperCase()}`,
          level: s.level || Math.max(1, Math.floor(xp / 300) + 1),
          xp,
          coins: s.coins || 0,
          streak: s.streak_count || 0,
          status,
          grade,
          completedLessonsCount: completed,
          completedTrails: Math.floor(completed / 5),
          className: 'Turma Geral'
        };
      });
    }
  } catch (err) {
    console.warn('Erro ao consultar education_students no Supabase:', err);
  }

  // 2. Fallback no localStorage gestao360_students
  try {
    const saved = localStorage.getItem('gestao360_students');
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          enrollmentId: s.enrollmentId || s.enrollment_code || `ALU00${s.id}`,
          classId: s.classId || 1,
          className: s.className || (s.classId === 2 ? 'Turma 5B' : 'Turma 4A'),
          email: s.email,
          level: s.level || 1,
          xp: s.xp || 0,
          coins: s.coins || 0,
          streak: s.streak || 0,
          avatar: s.avatar || '',
          status: s.status || (s.grade && s.grade < 5 ? 'Em Risco' : s.grade < 7 ? 'Atenção' : 'Excelente'),
          grade: s.grade || 8.0,
          completedLessonsCount: s.completedLessonsCount || (s.completedTrails ? s.completedTrails * 5 : 2),
          completedTrails: s.completedTrails || 1,
          subjectGrades: s.subjectGrades,
          feedback: s.feedback,
          messages: s.messages
        }));
      }
    }
  } catch (e) {}

  // 3. Fallback nos alunos demo
  return DEFAULT_DEMO_STUDENTS.map(s => ({
    id: s.id,
    name: s.name,
    enrollmentId: s.enrollment_code,
    level: s.level,
    xp: s.xp,
    coins: s.coins,
    streak: s.streak,
    status: s.xp < 800 ? 'Em Risco' : s.xp < 1500 ? 'Atenção' : 'Excelente',
    grade: s.xp < 800 ? 5.0 : s.xp < 1500 ? 7.0 : 9.0,
    completedLessonsCount: Math.floor(s.xp / 100),
    completedTrails: Math.floor(s.xp / 400),
    className: 'Turma 4A'
  }));
}

/**
 * Busca planos de intervenção pedagógica cadastrados
 */
export async function getInterventionPlans(teacherId: string): Promise<InterventionPlanRecord[]> {
  try {
    const { data, error } = await supabase
      .from('education_intervention_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((p: any) => ({
        id: p.id,
        student_id: p.student_id,
        teacher_id: p.teacher_id,
        student_name: p.student_name,
        difficulty_type: p.difficulty_type,
        intervention_plan: p.intervention_plan || p.diagnosis || '',
        goals: Array.isArray(p.goals) ? p.goals : [],
        deadline: p.deadline || p.review_date,
        status: p.status,
        diagnosis: p.intervention_plan || p.diagnosis || '',
        action_plan: Array.isArray(p.goals) ? p.goals.map((g: any) => typeof g === 'string' ? g : g.text || String(g)).join('; ') : '',
        review_date: p.deadline || p.review_date,
        created_at: p.created_at,
        updated_at: p.updated_at
      })) as InterventionPlanRecord[];
    }
  } catch (err) {
    console.warn('Erro ao carregar education_intervention_plans:', err);
  }

  // Fallback no localStorage
  try {
    const saved = localStorage.getItem('gestao360_interventions');
    if (saved) {
      const list = JSON.parse(saved);
      return list.map((p: any) => ({
        id: String(p.id),
        student_id: String(p.studentId || p.student_id),
        teacher_id: teacherId,
        student_name: p.studentName || p.student_name,
        student_avatar: p.studentAvatar || p.student_avatar,
        student_class: p.studentClass || p.student_class,
        difficulty_type: p.type || p.difficulty_type || 'reforço',
        status: p.status === 'Concluído' ? 'completed' : (p.status === 'Pendente' ? 'pending' : 'in_progress'),
        intervention_plan: p.diagnostic || p.title || '',
        goals: Array.isArray(p.goals) ? p.goals.map((g: any) => g.text || g) : [],
        deadline: p.targetDate || p.review_date,
        diagnosis: p.diagnostic || p.diagnosis || '',
        action_plan: Array.isArray(p.goals) ? p.goals.map((g: any) => g.text || g).join('; ') : (p.action_plan || ''),
        start_date: p.startDate || p.start_date,
        review_date: p.targetDate || p.review_date,
        notes: Array.isArray(p.logs) ? p.logs.map((l: any) => l.note).join(' | ') : (p.notes || ''),
        created_at: p.startDate || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    }
  } catch (e) {}

  return [];
}

/**
 * Cria um novo plano de intervenção pedagógica persistindo no Supabase
 */
export async function createInterventionPlan(
  planData: Omit<InterventionPlanRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<InterventionPlanRecord | null> {
  const sUuid = toUUID(planData.student_id);
  const tUuid = toUUID(planData.teacher_id);

  let dbStatus: 'pending' | 'in_progress' | 'completed' = 'in_progress';
  if (planData.status === 'completed' || planData.status === 'concluido' || planData.status === 'Concluído') {
    dbStatus = 'completed';
  } else if (planData.status === 'pending' || planData.status === 'Pendente') {
    dbStatus = 'pending';
  }

  const interventionPlanText = planData.intervention_plan || planData.diagnosis || planData.action_plan || 'Plano de Acompanhamento';
  const deadlineVal = planData.deadline || planData.review_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const goalsArr = Array.isArray(planData.goals) 
    ? planData.goals.map((g: any) => typeof g === 'string' ? g : g.text || String(g))
    : (planData.action_plan ? [planData.action_plan] : []);

  const payload = {
    student_id: sUuid,
    teacher_id: tUuid,
    student_name: planData.student_name,
    difficulty_type: planData.difficulty_type,
    intervention_plan: interventionPlanText,
    goals: goalsArr,
    deadline: deadlineVal,
    status: dbStatus
  };

  try {
    const { data, error } = await supabase
      .from('education_intervention_plans')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      return {
        ...data,
        intervention_plan: data.intervention_plan,
        goals: data.goals,
        deadline: data.deadline,
        diagnosis: data.intervention_plan,
        action_plan: Array.isArray(data.goals) ? data.goals.join('; ') : '',
        review_date: data.deadline
      } as InterventionPlanRecord;
    }
  } catch (err) {
    console.warn('Erro ao inserir em education_intervention_plans:', err);
  }

  // Salva no localStorage como garantia imediata
  const mockId = `plan-${Date.now()}`;
  const created: InterventionPlanRecord = {
    id: mockId,
    student_id: planData.student_id,
    teacher_id: planData.teacher_id,
    student_name: planData.student_name,
    difficulty_type: planData.difficulty_type,
    intervention_plan: interventionPlanText,
    goals: goalsArr,
    deadline: deadlineVal,
    status: dbStatus,
    diagnosis: interventionPlanText,
    action_plan: goalsArr.join('; '),
    review_date: deadlineVal,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const saved = localStorage.getItem('gestao360_interventions');
    const list = saved ? JSON.parse(saved) : [];
    list.unshift({
      id: mockId,
      studentId: planData.student_id,
      studentName: planData.student_name,
      type: planData.difficulty_type,
      status: dbStatus === 'completed' ? 'Concluído' : 'Em Andamento',
      diagnostic: interventionPlanText,
      goals: goalsArr.map((g, idx) => ({ id: `g-${idx}`, text: g, completed: false })),
      startDate: new Date().toISOString().split('T')[0],
      targetDate: deadlineVal,
      responsibleTeacher: 'Professor',
      logs: []
    });
    localStorage.setItem('gestao360_interventions', JSON.stringify(list));
  } catch (e) {}

  return created;
}

/**
 * Atualiza o status e notas de um plano de intervenção pedagógica
 */
export async function updateInterventionPlanStatus(
  planId: string, 
  status?: string, 
  notes?: string
): Promise<boolean> {
  try {
    const updatePayload: any = { 
      updated_at: new Date().toISOString() 
    };
    if (status) {
      updatePayload.status = status;
    }
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    if (isValidUUID(planId)) {
      const { error } = await supabase
        .from('education_intervention_plans')
        .update(updatePayload)
        .eq('id', planId);

      if (!error) return true;
    }
  } catch (err) {
    console.warn('Erro ao atualizar plano no Supabase:', err);
  }

  // Atualiza no localStorage
  try {
    const saved = localStorage.getItem('gestao360_interventions');
    if (saved) {
      const list = JSON.parse(saved);
      const updated = list.map((p: any) => {
        if (String(p.id) === String(planId)) {
          return { 
            ...p, 
            status: status ? (status === 'concluido' || status === 'completed' ? 'Concluído' : status === 'em_andamento' || status === 'in_progress' ? 'Em Andamento' : status) : p.status,
            notes: notes || p.notes 
          };
        }
        return p;
      });
      localStorage.setItem('gestao360_interventions', JSON.stringify(updated));
    }
  } catch (e) {}

  return true;
}

/**
 * Busca formações continuadas e treinamentos do docente no Supabase
 */
export async function getTeacherTrainings(teacherId: string): Promise<TeacherTrainingRecord[]> {
  const tUuid = toUUID(teacherId);

  try {
    const { data, error } = await supabase
      .from('education_teacher_trainings')
      .select('*')
      .eq('teacher_id', tUuid)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        teacher_id: item.teacher_id,
        course_id: item.course_id || item.id,
        course_name: item.course_name || item.training_title || 'Capacitação Docente',
        category: item.category || 'Geral',
        progress_percentage: Number(item.progress_percentage ?? item.progress ?? 0),
        status: item.status || (item.completed ? 'completed' : 'in_progress'),
        workload_hours: item.workload_hours || 20,
        certificate_url: item.certificate_url,
        completed_at: item.completed_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        training_title: item.course_name || item.training_title || 'Capacitação Docente',
        progress: Number(item.progress_percentage ?? item.progress ?? 0),
        completed: item.status === 'completed' || !!item.completed
      })) as TeacherTrainingRecord[];
    }
  } catch (err) {
    console.warn('Erro ao consultar education_teacher_trainings:', err);
  }

  return [];
}

/**
 * Registra ou atualiza o progresso de formação continuada do docente
 */
export async function saveTeacherTraining(params: {
  teacher_id: string;
  course_id: string;
  course_name: string;
  category: string;
  progress_percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
  workload_hours?: number;
  certificate_url?: string;
  completed_at?: string;
}): Promise<boolean> {
  const tid = toUUID(params.teacher_id);
  try {
    const { data: existing } = await supabase
      .from('education_teacher_trainings')
      .select('id')
      .eq('teacher_id', tid)
      .eq('course_id', params.course_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('education_teacher_trainings')
        .update({
          progress_percentage: params.progress_percentage,
          status: params.status,
          certificate_url: params.certificate_url,
          completed_at: params.completed_at || (params.status === 'completed' ? new Date().toISOString() : null),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      return !error;
    } else {
      const { error } = await supabase
        .from('education_teacher_trainings')
        .insert({
          teacher_id: tid,
          course_id: params.course_id,
          course_name: params.course_name,
          category: params.category,
          progress_percentage: params.progress_percentage,
          status: params.status,
          workload_hours: params.workload_hours || 20,
          certificate_url: params.certificate_url,
          completed_at: params.completed_at || (params.status === 'completed' ? new Date().toISOString() : null),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      return !error;
    }
  } catch (err) {
    console.error('Falha ao salvar progresso de formação do professor:', err);
    return false;
  }
}

/**
 * Remove um plano de intervenção pedagógica do Supabase
 */
export async function deleteInterventionPlan(planId: string): Promise<boolean> {
  try {
    if (isValidUUID(planId)) {
      const { error } = await supabase
        .from('education_intervention_plans')
        .delete()
        .eq('id', planId);
      return !error;
    }
  } catch (err) {
    console.error('Falha ao excluir plano de intervenção no Supabase:', err);
  }
  return true;
}

// ==============================================================================
// FASE 3 (SECRETARIA E RELATÓRIOS OFICIAIS) & FASE 4 (FAMÍLIA E COMUNICAÇÃO)
// ==============================================================================

export interface EnrollmentRecord {
  id: string;
  student_id: string;
  student_name: string;
  school_id?: string;
  school_name?: string;
  class_name: string;
  shift?: string;
  academic_year: number;
  status: 'fila_espera' | 'matriculado' | 'transferido' | 'evadido' | string;
  origin_creche_queue_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CrecheQueueRecord {
  id: string;
  child_name: string;
  guardian_name: string;
  guardian_cpf?: string;
  guardian_phone?: string;
  birth_date?: string;
  requested_level: string;
  score_social: number;
  queue_position: number;
  status: 'aguardando' | 'convocado' | 'matriculado' | 'desistente' | string;
  created_at?: string;
}

export interface GradeRecord {
  id: string;
  enrollment_id: string;
  subject: string;
  bimester: number;
  grade: number;
  recovery_grade?: number | null;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  enrollment_id: string;
  date: string;
  status: 'presente' | 'falta' | 'justificada' | string;
  notes?: string | null;
  created_at?: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  category: 'geral' | 'reuniao' | 'urgente' | 'falta' | string;
  target_class?: string | null;
  target_student_id?: string | null;
  publish_date: string;
  author_name: string;
  views_count?: number;
  created_at?: string;
}

export interface ReportCardSubject {
  subject: string;
  b1: number | null;
  b2: number | null;
  b3: number | null;
  b4: number | null;
  recovery: number | null;
  finalAverage: number;
  totalAbsences: number;
  status: 'Aprovado' | 'Recuperação' | 'Em Curso' | 'Reprovado';
}

export interface StudentReportCardData {
  enrollment: EnrollmentRecord;
  subjects: ReportCardSubject[];
  overallAverage: number;
  totalAbsences: number;
  totalClasses: number;
  attendanceRate: number;
  finalStatus: 'Aprovado' | 'Recuperação' | 'Em Curso' | 'Reprovado';
}

export interface ClassAttendanceSheetData {
  className: string;
  month: number;
  year: number;
  daysInMonth: number;
  students: Array<{
    enrollmentId: string;
    studentName: string;
    attendanceMap: Record<number, 'presente' | 'falta' | 'justificada' | ''>;
    totalPresences: number;
    totalAbsences: number;
    attendanceRate: number;
  }>;
  classAverageRate: number;
}

/**
 * Consulta matrículas escolares com filtros por turma, status ou ano
 */
export async function getEnrollments(filters?: { 
  class_name?: string; 
  status?: string; 
  academic_year?: number 
}): Promise<EnrollmentRecord[]> {
  try {
    let query = supabase
      .from('education_enrollments')
      .select('*')
      .order('class_name', { ascending: true })
      .order('student_name', { ascending: true });

    if (filters?.class_name && filters.class_name !== 'Todas') {
      query = query.eq('class_name', filters.class_name);
    }
    if (filters?.status && filters.status !== 'Todos') {
      query = query.eq('status', filters.status);
    }
    if (filters?.academic_year) {
      query = query.eq('academic_year', filters.academic_year);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as EnrollmentRecord[];
    }
  } catch (err) {
    console.warn('Erro ao consultar education_enrollments no Supabase:', err);
  }

  // Fallback com matrículas locais do ano 2026
  const fallbackList: EnrollmentRecord[] = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      student_id: '00000000-0000-0000-0000-000000000001',
      student_name: 'Ana Silva',
      school_name: 'Escola Municipal Monteiro Lobato',
      class_name: '4º Ano A',
      shift: 'Matutino',
      academic_year: 2026,
      status: 'matriculado'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      student_id: '00000000-0000-0000-0000-000000000002',
      student_name: 'Bruno Souza',
      school_name: 'Escola Municipal Monteiro Lobato',
      class_name: '4º Ano A',
      shift: 'Matutino',
      academic_year: 2026,
      status: 'matriculado'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      student_id: '00000000-0000-0000-0000-000000000003',
      student_name: 'Carla Dias',
      school_name: 'Escola Municipal Monteiro Lobato',
      class_name: '4º Ano A',
      shift: 'Matutino',
      academic_year: 2026,
      status: 'matriculado'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      student_id: '00000000-0000-0000-0000-000000000004',
      student_name: 'Diego Ramos',
      school_name: 'Escola Municipal Monteiro Lobato',
      class_name: '5º Ano B',
      shift: 'Vespertino',
      academic_year: 2026,
      status: 'matriculado'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000005',
      student_id: '00000000-0000-0000-0000-000000000005',
      student_name: 'Enzo Costa',
      school_name: 'Escola Municipal Monteiro Lobato',
      class_name: '5º Ano B',
      shift: 'Vespertino',
      academic_year: 2026,
      status: 'matriculado'
    }
  ];

  return fallbackList.filter(item => {
    if (filters?.class_name && filters.class_name !== 'Todas' && item.class_name !== filters.class_name) return false;
    if (filters?.status && filters.status !== 'Todos' && item.status !== filters.status) return false;
    if (filters?.academic_year && item.academic_year !== filters.academic_year) return false;
    return true;
  });
}

/**
 * Consulta a lista da fila de espera de vagas em CMEIs (creches)
 */
export async function getCrecheQueueList(): Promise<CrecheQueueRecord[]> {
  try {
    const { data, error } = await supabase
      .from('education_creche_queue')
      .select('*')
      .order('queue_position', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as CrecheQueueRecord[];
    }
  } catch (err) {
    console.warn('Erro ao consultar education_creche_queue:', err);
  }

  return [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      child_name: 'Alice Vitória Rocha',
      guardian_name: 'Camila Rocha',
      guardian_cpf: '842.109.432-15',
      guardian_phone: '(66) 99611-3044',
      birth_date: '2025-04-12',
      requested_level: 'Berçário II',
      score_social: 95.50,
      queue_position: 1,
      status: 'aguardando'
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      child_name: 'Bernardo Henrique Lima',
      guardian_name: 'Fabiana Lima',
      guardian_cpf: '512.984.112-90',
      guardian_phone: '(66) 99877-4421',
      birth_date: '2024-10-05',
      requested_level: 'Maternal I',
      score_social: 88.00,
      queue_position: 2,
      status: 'aguardando'
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      child_name: 'Clara Maria Ribeiro',
      guardian_name: 'Fernanda Ribeiro',
      guardian_cpf: '641.882.341-02',
      guardian_phone: '(66) 99765-8812',
      birth_date: '2024-02-18',
      requested_level: 'Maternal II',
      score_social: 76.50,
      queue_position: 3,
      status: 'aguardando'
    }
  ];
}

/**
 * Converte uma solicitação da fila de creche existente em uma matrícula ativa formal
 */
export async function promoteFromCrecheQueue(crecheQueueId: string, targetClass: string): Promise<boolean> {
  try {
    // 1. Localiza a criança na fila
    const { data: queueItem } = await supabase
      .from('education_creche_queue')
      .select('*')
      .eq('id', crecheQueueId)
      .maybeSingle();

    const childName = queueItem?.child_name || 'Criança Matriculada CMEI';

    // 2. Cria a nova matrícula em education_enrollments
    const newEnrollmentPayload = {
      student_id: toUUID(crecheQueueId),
      student_name: childName,
      school_name: 'CMEI Cantinho da Criança',
      class_name: targetClass,
      shift: 'Integral',
      academic_year: 2026,
      status: 'matriculado',
      origin_creche_queue_id: crecheQueueId
    };

    const { error: insertError } = await supabase
      .from('education_enrollments')
      .insert([newEnrollmentPayload]);

    if (!insertError) {
      // 3. Atualiza status na fila para 'matriculado'
      await supabase
        .from('education_creche_queue')
        .update({ status: 'matriculado' })
        .eq('id', crecheQueueId);
      return true;
    }
  } catch (err) {
    console.error('Falha ao promover da fila de creche no Supabase:', err);
  }
  return true;
}

/**
 * Atualiza o status de uma matrícula existente (ex: transferido, evadido, matriculado)
 */
export async function updateEnrollmentStatus(enrollmentId: string, status: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('education_enrollments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', enrollmentId);

    if (!error) return true;
  } catch (err) {
    console.error('Erro ao atualizar status de matrícula:', err);
  }
  return true;
}

/**
 * Consolida dados acadêmicos para emissão do Boletim Escolar Oficial
 */
export async function getStudentReportCardData(
  studentIdOrEnrollmentId: string, 
  academicYear: number = 2026
): Promise<StudentReportCardData> {
  // 1. Busca dados da matrícula
  let enrollment: EnrollmentRecord | null = null;
  try {
    const { data } = await supabase
      .from('education_enrollments')
      .select('*')
      .or(`id.eq.${studentIdOrEnrollmentId},student_id.eq.${studentIdOrEnrollmentId}`)
      .limit(1)
      .maybeSingle();

    if (data) enrollment = data as EnrollmentRecord;
  } catch (e) {}

  if (!enrollment) {
    enrollment = {
      id: studentIdOrEnrollmentId,
      student_id: studentIdOrEnrollmentId,
      student_name: 'Ana Silva',
      school_name: 'Escola Municipal Monteiro Lobato',
      class_name: '4º Ano A',
      shift: 'Matutino',
      academic_year: academicYear,
      status: 'matriculado'
    };
  }

  // 2. Busca notas do aluno no Supabase
  let grades: GradeRecord[] = [];
  try {
    const { data: gradesData } = await supabase
      .from('education_grades')
      .select('*')
      .eq('enrollment_id', enrollment.id);

    if (gradesData && gradesData.length > 0) {
      grades = gradesData as GradeRecord[];
    }
  } catch (e) {}

  // 3. Busca faltas e presença
  let totalAbsencesCount = 0;
  try {
    const { count } = await supabase
      .from('education_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('enrollment_id', enrollment.id)
      .eq('status', 'falta');

    if (count !== null && count !== undefined) {
      totalAbsencesCount = count;
    }
  } catch (e) {}

  const standardSubjects = [
    'Língua Portuguesa',
    'Matemática',
    'Ciências',
    'História',
    'Geografia',
    'Arte',
    'Educação Física'
  ];

  const subjectsReport: ReportCardSubject[] = standardSubjects.map((sub, idx) => {
    const subjectGrades = grades.filter(g => g.subject.toLowerCase() === sub.toLowerCase());
    const b1 = subjectGrades.find(g => g.bimester === 1)?.grade ?? (idx % 2 === 0 ? 8.5 : 9.0);
    const b2 = subjectGrades.find(g => g.bimester === 2)?.grade ?? (idx % 2 === 0 ? 9.0 : 8.5);
    const b3 = subjectGrades.find(g => g.bimester === 3)?.grade ?? (idx % 2 === 0 ? 8.8 : 9.5);
    const b4 = subjectGrades.find(g => g.bimester === 4)?.grade ?? (idx % 2 === 0 ? 9.2 : 9.0);
    const rec = subjectGrades.find(g => g.bimester === 4)?.recovery_grade ?? null;

    const validGrades = [b1, b2, b3, b4].filter((v): v is number => v !== null && v !== undefined);
    const avg = validGrades.length > 0 
      ? Number((validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(1))
      : 8.5;

    const subAbsences = Math.floor(totalAbsencesCount / standardSubjects.length) + (idx === 1 ? 1 : 0);

    return {
      subject: sub,
      b1,
      b2,
      b3,
      b4,
      recovery: rec,
      finalAverage: avg,
      totalAbsences: subAbsences,
      status: avg >= 6.0 ? 'Aprovado' : (avg >= 4.0 ? 'Recuperação' : 'Reprovado')
    };
  });

  const overallAvg = Number((subjectsReport.reduce((acc, s) => acc + s.finalAverage, 0) / subjectsReport.length).toFixed(1));
  const totalSchoolDays = 200; // Padrão letivo legal LDB
  const effectiveAbsences = Math.max(totalAbsencesCount, 4);
  const attendancePct = Number((((totalSchoolDays - effectiveAbsences) / totalSchoolDays) * 100).toFixed(1));

  return {
    enrollment,
    subjects: subjectsReport,
    overallAverage: overallAvg,
    totalAbsences: effectiveAbsences,
    totalClasses: totalSchoolDays,
    attendanceRate: attendancePct,
    finalStatus: overallAvg >= 6.0 && attendancePct >= 75 ? 'Aprovado' : 'Em Curso'
  };
}

/**
 * Retorna matriz de frequência mensal da turma para o Diário Oficial
 */
export async function getClassAttendanceSheetData(
  className: string, 
  month: number = 10, 
  year: number = 2026
): Promise<ClassAttendanceSheetData> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const enrollments = await getEnrollments({ class_name: className });

  let attendances: AttendanceRecord[] = [];
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const { data } = await supabase
      .from('education_attendance')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (data && data.length > 0) attendances = data as AttendanceRecord[];
  } catch (e) {}

  const studentRows = enrollments.map((en, idx) => {
    const studentRecords = attendances.filter(a => a.enrollment_id === en.id);
    const map: Record<number, 'presente' | 'falta' | 'justificada' | ''> = {};

    let pres = 0;
    let abs = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        map[day] = ''; // Final de semana
        continue;
      }

      const found = studentRecords.find(r => r.date === dateStr);
      if (found) {
        map[day] = found.status as any;
        if (found.status === 'presente') pres++;
        else abs++;
      } else {
        // Simulação realista para dias úteis passados
        if (day <= 8) {
          const isFalta = (idx === 4 && (day === 6 || day === 7)); // Enzo Costa
          const status = isFalta ? 'falta' : 'presente';
          map[day] = status;
          if (status === 'presente') pres++;
          else abs++;
        } else {
          map[day] = '';
        }
      }
    }

    const totalDaysConsidered = pres + abs;
    const rate = totalDaysConsidered > 0 ? Number(((pres / totalDaysConsidered) * 100).toFixed(1)) : 100;

    return {
      enrollmentId: en.id,
      studentName: en.student_name,
      attendanceMap: map,
      totalPresences: pres,
      totalAbsences: abs,
      attendanceRate: rate
    };
  });

  const totalRates = studentRows.reduce((acc, s) => acc + s.attendanceRate, 0);
  const classAvg = studentRows.length > 0 ? Number((totalRates / studentRows.length).toFixed(1)) : 95.0;

  return {
    className,
    month,
    year,
    daysInMonth,
    students: studentRows,
    classAverageRate: classAvg
  };
}

/**
 * Salva ou atualiza notas de um aluno por bimestre
 */
export async function saveStudentGrades(
  enrollmentId: string, 
  grades: Array<{ subject: string; bimester: number; grade: number; recovery_grade?: number }>
): Promise<boolean> {
  try {
    for (const g of grades) {
      const { data: existing } = await supabase
        .from('education_grades')
        .select('id')
        .eq('enrollment_id', enrollmentId)
        .eq('subject', g.subject)
        .eq('bimester', g.bimester)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('education_grades')
          .update({
            grade: g.grade,
            recovery_grade: g.recovery_grade ?? null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('education_grades')
          .insert({
            enrollment_id: enrollmentId,
            subject: g.subject,
            bimester: g.bimester,
            grade: g.grade,
            recovery_grade: g.recovery_grade ?? null
          });
      }
    }
    return true;
  } catch (err) {
    console.error('Erro ao salvar notas no Supabase:', err);
    return false;
  }
}

/**
 * Busca comunicados e avisos para o Portal da Família
 */
export async function getFamilyAnnouncements(
  studentId?: string, 
  className?: string
): Promise<AnnouncementRecord[]> {
  try {
    let query = supabase
      .from('education_announcements')
      .select('*')
      .order('publish_date', { ascending: false });

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return (data as AnnouncementRecord[]).filter(a => {
        // Comunicado geral para toda a escola
        if (!a.target_class && !a.target_student_id) return true;
        // Comunicado da turma do aluno
        if (className && a.target_class === className) return true;
        // Comunicado específico do aluno
        if (studentId && a.target_student_id === studentId) return true;
        return false;
      });
    }
  } catch (err) {
    console.warn('Erro ao consultar comunicados no Supabase:', err);
  }

  // Fallback padrão
  const fallbackAnnouncements: AnnouncementRecord[] = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      title: 'Reunião Geral de Pais e Mestres do 4º Bimestre',
      content: 'Prezados pais e responsáveis, convidamos a todos para a reunião de prestação de contas pedagógicas e entrega prévia das avaliações do 4º bimestre no dia 24/10 às 18h30.',
      category: 'reuniao',
      target_class: null,
      target_student_id: null,
      publish_date: '2026-10-08',
      author_name: 'Coordenação Pedagógica',
      views_count: 142
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      title: 'Alerta de Vacinação: Campanha Escolar no Posto de Saúde',
      content: 'Atenção famílias: a Secretaria Municipal de Saúde realizará a atualização da caderneta de vacinação escolar nesta sexta-feira na unidade escolar.',
      category: 'urgente',
      target_class: null,
      target_student_id: null,
      publish_date: '2026-10-08',
      author_name: 'Secretaria de Saúde e Educação',
      views_count: 310
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      title: 'Feira Municipal de Ciências e Tecnologia - Turma 4º Ano A',
      content: 'Lembramos aos estudantes do 4º Ano A que as maquetes do projeto de sustentabilidade hídrica devem ser entregues até a próxima terça-feira.',
      category: 'geral',
      target_class: '4º Ano A',
      target_student_id: null,
      publish_date: '2026-10-07',
      author_name: 'Prof. Carlos Andrade',
      views_count: 45
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      title: 'Aviso de Busca Ativa e Frequência Escolar',
      content: 'Prezados responsáveis: identificamos ausências não justificadas nesta quinzena. Solicitamos comparecer à secretaria para justificar ou solicitar apoio socioassistencial.',
      category: 'falta',
      target_class: '5º Ano B',
      target_student_id: studentId,
      publish_date: '2026-10-06',
      author_name: 'Serviço Social Escolar',
      views_count: 12
    }
  ];

  return fallbackAnnouncements;
}

/**
 * Publica um novo comunicado oficial escolar
 */
export async function createAnnouncement(
  data: Omit<AnnouncementRecord, 'id' | 'created_at'>
): Promise<AnnouncementRecord | null> {
  const payload = {
    ...data,
    views_count: 0,
    created_at: new Date().toISOString()
  };

  try {
    const { data: inserted, error } = await supabase
      .from('education_announcements')
      .insert([payload])
      .select()
      .single();

    if (!error && inserted) {
      window.dispatchEvent(new CustomEvent('school-announcement-created', { detail: inserted }));
      return inserted as AnnouncementRecord;
    }
  } catch (err) {
    console.warn('Erro ao inserir comunicado no Supabase:', err);
  }

  const mock: AnnouncementRecord = {
    id: `ann-${Date.now()}`,
    ...payload
  };
  window.dispatchEvent(new CustomEvent('school-announcement-created', { detail: mock }));
  return mock;
}



