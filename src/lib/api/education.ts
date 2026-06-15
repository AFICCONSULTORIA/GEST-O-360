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

export interface Course {
  id: string;
  title: string;
  description: string;
  color: string;
  bg_class: string;
}

/**
 * Busca os dados do aluno associados ao usuário logado.
 * Cria o perfil do aluno automaticamente se não existir.
 */
export async function fetchStudentProfile(userId: string, defaultName: string = 'Arthur da Silva'): Promise<StudentData | null> {
  if (!userId) return null;

  try {
    // 1. Tentar buscar o perfil
    const { data: student, error } = await supabase
      .from('edu_students')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 é "not found" (zero rows)
      console.error('Error fetching student:', error);
      return null;
    }

    if (student) {
      return student as StudentData;
    }

    // 2. Se não existir, criar o perfil default
    const { data: newStudent, error: insertError } = await supabase
      .from('edu_students')
      .insert([
        { 
          user_id: userId, 
          name: defaultName,
          level: 7,
          title: 'Explorador Nível 7 ⚡',
          xp: 1850,
          coins: 450,
          streak: 12
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
 * Atualiza XP e moedas do aluno.
 */
export async function awardStudent(studentId: string, addedXp: number, addedCoins: number) {
  try {
    // Busca dados atuais primeiro
    const { data: current, error: fetchError } = await supabase
      .from('edu_students')
      .select('xp, coins')
      .eq('id', studentId)
      .single();

    if (fetchError) throw fetchError;

    const newXp = current.xp + addedXp;
    const newCoins = current.coins + addedCoins;

    // TODO: Adicionar lógica para 'level up' no backend se newXp > limite

    const { data, error } = await supabase
      .from('edu_students')
      .update({ xp: newXp, coins: newCoins })
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;
    
    return data as StudentData;
  } catch (err) {
    console.error('Error awarding student:', err);
    return null;
  }
}

/**
 * Deduz moedas do aluno (ex: compras na loja).
 */
export async function spendCoins(studentId: string, amount: number) {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('edu_students')
      .select('coins')
      .eq('id', studentId)
      .single();

    if (fetchError) throw fetchError;

    if (current.coins < amount) {
      throw new Error('Moedas insuficientes.');
    }

    const { data, error } = await supabase
      .from('edu_students')
      .update({ coins: current.coins - amount })
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;

    return data as StudentData;
  } catch (err) {
    console.error('Error spending coins:', err);
    return null;
  }
}
