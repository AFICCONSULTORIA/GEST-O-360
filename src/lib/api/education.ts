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
