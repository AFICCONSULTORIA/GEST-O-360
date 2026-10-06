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
 * Retorna os dados atualizados do perfil do aluno usando o ID interno da tabela edu_students
 */
export async function fetchStudentProfile(studentId: string): Promise<StudentData | null> {
  if (!studentId) return null;
  try {
    const { data, error } = await supabase.from('edu_students').select('*').eq('id', studentId).single();
    if (error) return null;
    return data as StudentData;
  } catch (err) {
    return null;
  }
}

/**
 * Busca todos os cursos para o aluno, calculando o progresso.
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
      const { data: progressData } = await supabase
        .from('edu_student_progress')
        .select('lesson_id')
        .eq('student_id', studentId);
        
      if (progressData) {
        progressData.forEach(p => progressMap[p.lesson_id] = true);
      }
    }

    // Mapeia para as interfaces da UI
    const mappedCourses: Course[] = (coursesData || []).map((c: any) => ({
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
          xp: l.xp_reward,
          coins: l.coin_reward,
          contentUrl: l.content_url,
          contentBody: l.content_body,
          isCompleted: progressMap[l.id] || false,
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

    return mappedCourses;
  } catch (err) {
    console.error('Erro ao buscar cursos', err);
    return [];
  }
}

export async function completeLesson(studentId: string, lessonId: string, score: number = 0) {
  try {
    const { error } = await supabase
      .from('edu_student_progress')
      .upsert({
        student_id: studentId,
        lesson_id: lessonId,
        score: score,
        completed_at: new Date().toISOString()
      }, { onConflict: 'student_id,lesson_id' });
      
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao completar aula:', err);
    return false;
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
