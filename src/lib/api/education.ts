import { supabase } from '../supabase';

export interface StudentData {
  id: string;
  user_id: string;
  name: string;
  level: number;
  title: string;
  xp: number;
  coins: number;
  streak: number;
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
  modules: Module[];
}

/**
 * Busca os dados do aluno associados ao usuário logado.
 * Cria o perfil do aluno automaticamente se não existir.
 */
export async function fetchStudentProfile(userId: string, defaultName: string = 'Aluno GESTÃO 360'): Promise<StudentData | null> {
  if (!userId) return null;

  try {
    const { data: student, error } = await supabase
      .from('edu_students')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching student:', error);
      return null;
    }

    if (student) return student as StudentData;

    const { data: newStudent, error: insertError } = await supabase
      .from('edu_students')
      .insert([
        { 
          user_id: userId, 
          name: defaultName,
          level: 1,
          title: 'Iniciante',
          xp: 0,
          coins: 0,
          streak: 0
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating student profile:', insertError);
      return null;
    }
    return newStudent as StudentData;
  } catch (err) {
    console.error('Unexpected error in fetchStudentProfile:', err);
    return null;
  }
}

/**
 * Busca todos os cursos, incluindo seus módulos, aulas e o progresso do aluno logado.
 */
export async function fetchCoursesWithProgress(userId?: string): Promise<Course[]> {
  try {
    const { data: coursesData, error: coursesError } = await supabase
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
      .order('created_at', { ascending: true });

    if (coursesError) throw coursesError;

    let progressMap: Record<string, boolean> = {};

    if (userId) {
      const { data: progressData } = await supabase
        .from('edu_student_progress')
        .select('lesson_id')
        .eq('student_id', userId);
        
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
          isCompleted: progressMap[l.id] || false,
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

    return mappedCourses;
  } catch (err) {
    console.error('Erro ao buscar cursos', err);
    return [];
  }
}

/**
 * Marca uma lição como concluída para um aluno
 */
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
      .eq('user_id', studentId) // usar user_id
      .single();

    if (fetchError) throw fetchError;

    const newXp = current.xp + addedXp;
    const newCoins = current.coins + addedCoins;

    const { data, error } = await supabase
      .from('edu_students')
      .update({ xp: newXp, coins: newCoins })
      .eq('user_id', studentId)
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
      .eq('user_id', studentId)
      .single();

    if (fetchError) throw fetchError;
    if (current.coins < cost) return false;

    const { error } = await supabase
      .from('edu_students')
      .update({ coins: current.coins - cost })
      .eq('user_id', studentId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error spending coins:', err);
    return false;
  }
}
