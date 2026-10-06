/**
 * Utilitários para o Sistema de Sequência Diária (Ofensiva / Streak) estilo Duolingo
 */

export interface StreakState {
  currentStreak: number;
  hasPracticedToday: boolean;
  freezesRemaining: number;
}

/**
 * Retorna a string de data no formato YYYY-MM-DD baseada no fuso horário local do usuário.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna a string de data YYYY-MM-DD com deslocamento de dias a partir de uma data base.
 * offsetDays = 0 -> hoje
 * offsetDays = -1 -> ontem
 * offsetDays = -2 -> anteontem
 */
export function getOffsetDateString(offsetDays: number, baseDate: Date = new Date()): string {
  const target = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offsetDays);
  return getLocalDateString(target);
}

/**
 * Calcula a sequência diária exata seguindo as regras do Duolingo:
 * 1. Se o aluno já fez uma atividade hoje:
 *    - hasPracticedToday = true (fogo aceso 🔥)
 *    - Contagem inicia a partir de hoje e retrocede consecutivamente dia a dia.
 * 2. Se o aluno ainda NÃO fez atividade hoje:
 *    - hasPracticedToday = false (fogo apagado / cinza 🕯️)
 *    - Contagem inicia a partir de ontem para verificar se a sequência anterior está preservada.
 *    - Se fez ontem (ou congelamento ativo), a sequência acumulada é mantida (mas fogo apagado aguardando o treino de hoje).
 *    - Se não fez ontem e não tem congelamento, a sequência é quebrada (0 dias).
 */
export function calculateDuolingoStreak(
  datesList: string[] = [],
  availableFreezes: number = 0,
  baseDate: Date = new Date()
): StreakState {
  const datesSet = new Set(datesList);
  const todayStr = getLocalDateString(baseDate);
  const hasPracticedToday = datesSet.has(todayStr);

  let freezesLeft = availableFreezes;
  let streak = 0;

  // Se já praticou hoje, começa a checagem em hoje (offset 0)
  // Se ainda não praticou hoje, verifica a continuidade a partir de ontem (offset -1)
  let dayOffset = hasPracticedToday ? 0 : -1;

  for (let i = 0; i < 365; i++) {
    const checkStr = getOffsetDateString(dayOffset, baseDate);
    if (datesSet.has(checkStr)) {
      streak++;
      dayOffset--;
    } else {
      if (freezesLeft > 0) {
        freezesLeft--;
        dayOffset--;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak: streak,
    hasPracticedToday,
    freezesRemaining: freezesLeft
  };
}

/**
 * Calcula a atividade da semana corrente (Segunda a Domingo).
 * Retorna array de 7 booleanos.
 */
export function calculateWeeklyActivity(datesList: string[] = [], baseDate: Date = new Date()): boolean[] {
  const weekly = [false, false, false, false, false, false, false];
  const datesSet = new Set(datesList);

  // No padrão brasileiro/ISO: 0 = Segunda, 1 = Terça, ..., 6 = Domingo
  // getDay(): 0 = Domingo, 1 = Segunda, 2 = Terça, ..., 6 = Sábado
  const dayOfWeek = (baseDate.getDay() + 6) % 7;

  for (let i = 0; i < 7; i++) {
    const offset = i - dayOfWeek;
    const dateStr = getOffsetDateString(offset, baseDate);
    if (datesSet.has(dateStr)) {
      weekly[i] = true;
    }
  }

  return weekly;
}

/**
 * Cria histórico retroativo de datas para inicializar perfis com streak pré-existente
 * terminando em ontem (para que hoje comece com fogo apagado e suba ao fazer lição).
 */
export function seedInitialStreakDates(streakCount: number, baseDate: Date = new Date()): string[] {
  const seededDates: string[] = [];
  for (let i = 1; i <= streakCount; i++) {
    seededDates.push(getOffsetDateString(-i, baseDate));
  }
  return seededDates;
}
