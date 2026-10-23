import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Trophy, 
  Star, 
  Zap, 
  Compass, 
  Crown, 
  Unlock,
  Lock,
  Users,
  GraduationCap,
  Sparkles,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { 
  fetchRealStudentRanking, 
  fetchRealTeacherRanking, 
  RealStudentRanking, 
  RealTeacherRanking 
} from '../../../lib/api/education';
import { EducationAvatar } from './EducationAvatar';

interface StudentAchievementsProps {
  studentData: {
    id?: string;
    enrollment_code?: string;
    name: string;
    xp: number;
    level: number;
    streak?: number;
    highestStreak?: number;
    coins?: number;
    weeklyActivity?: boolean[];
    hasPracticedToday?: boolean;
  };
}

type RankingUser = { id: string; name: string; level: number; xp: number; avatar: string; isCurrentUser?: boolean };

const ALL_ACHIEVEMENTS: (Omit<RankingUser, 'id' | 'name' | 'level' | 'xp' | 'avatar'> & { id: string, emoji: string, name: string, desc: string, color: string, type: 'streak' | 'xp' | 'coins' | 'level', target: number, xpReward: number })[] = [
  // --- OFENSIVA (STREAK) - 12 Conquistas ---
  { id: 'streak-1', emoji: '✨', name: 'Fagulha Inicial', desc: 'Sua primeira sequência de estudos', color: 'orange', type: 'streak', target: 1, xpReward: 50 },
  { id: 'streak-3', emoji: '🔥', name: 'Primeiro Fogo', desc: '3 dias de sequência', color: 'orange', type: 'streak', target: 3, xpReward: 100 },
  { id: 'streak-5', emoji: '🧨', name: 'Faísca Persistente', desc: '5 dias de sequência', color: 'orange', type: 'streak', target: 5, xpReward: 200 },
  { id: 'streak-7', emoji: '☄️', name: 'Fogo do Conhecimento', desc: '7 dias de sequência (Uma semana!)', color: 'orange', type: 'streak', target: 7, xpReward: 300 },
  { id: 'streak-10', emoji: '🛡️', name: 'Dedicação de Ferro', desc: '10 dias de sequência', color: 'rose', type: 'streak', target: 10, xpReward: 400 },
  { id: 'streak-14', emoji: '🌋', name: 'Chama Inabalável', desc: '14 dias de sequência (Duas semanas!)', color: 'rose', type: 'streak', target: 14, xpReward: 600 },
  { id: 'streak-21', emoji: '🧠', name: 'Hábito Formado', desc: '21 dias de sequência', color: 'violet', type: 'streak', target: 21, xpReward: 1000 },
  { id: 'streak-30', emoji: '👑', name: 'Lenda Intocável', desc: '30 dias de sequência (Um mês!)', color: 'violet', type: 'streak', target: 30, xpReward: 1500 },
  { id: 'streak-50', emoji: '🦅', name: 'Forja Divina', desc: '50 dias incansáveis de estudos', color: 'fuchsia', type: 'streak', target: 50, xpReward: 3000 },
  { id: 'streak-100', emoji: '⚔️', name: 'Centurião dos Estudos', desc: '100 dias ininterruptos!', color: 'fuchsia', type: 'streak', target: 100, xpReward: 5000 },
  { id: 'streak-200', emoji: '☀️', name: 'Fogo Eterno', desc: '200 dias seguidos de glória', color: 'yellow', type: 'streak', target: 200, xpReward: 10000 },
  { id: 'streak-365', emoji: '🌎', name: 'O Ano da Virada', desc: '365 dias! Um ano inteiro estudando.', color: 'emerald', type: 'streak', target: 365, xpReward: 50000 },

  // --- EXPERIÊNCIA (XP) - 13 Conquistas ---
  { id: 'xp-100', emoji: '🐣', name: 'O Despertar', desc: 'Acumule 100 XP', color: 'sky', type: 'xp', target: 100, xpReward: 25 },
  { id: 'xp-500', emoji: '🌱', name: 'Primeiros Passos', desc: 'Acumule 500 XP', color: 'sky', type: 'xp', target: 500, xpReward: 50 },
  { id: 'xp-1000', emoji: '🚀', name: 'Explorador Iniciante', desc: 'Acumule 1.000 XP', color: 'sky', type: 'xp', target: 1000, xpReward: 100 },
  { id: 'xp-2500', emoji: '⚔️', name: 'Aventureiro Valente', desc: 'Acumule 2.500 XP', color: 'teal', type: 'xp', target: 2500, xpReward: 250 },
  { id: 'xp-5000', emoji: '🌟', name: 'Super Estrela', desc: 'Acumule 5.000 XP', color: 'amber', type: 'xp', target: 5000, xpReward: 500 },
  { id: 'xp-10000', emoji: '🧠', name: 'Mestre do Conhecimento', desc: 'Acumule 10.000 XP', color: 'purple', type: 'xp', target: 10000, xpReward: 1000 },
  { id: 'xp-25000', emoji: '⛩️', name: 'Guarda do Templo', desc: 'Acumule 25.000 XP', color: 'indigo', type: 'xp', target: 25000, xpReward: 2000 },
  { id: 'xp-50000', emoji: '🐉', name: 'Dragão de Prata', desc: 'Acumule 50.000 XP', color: 'slate', type: 'xp', target: 50000, xpReward: 5000 },
  { id: 'xp-100000', emoji: '🗿', name: 'Titã do Conhecimento', desc: 'Acumule 100.000 XP', color: 'orange', type: 'xp', target: 100000, xpReward: 10000 },
  { id: 'xp-250000', emoji: '🌌', name: 'Divindade do Ensino', desc: 'Acumule 250.000 XP', color: 'fuchsia', type: 'xp', target: 250000, xpReward: 25000 },
  { id: 'xp-500000', emoji: '🌪️', name: 'Força da Natureza', desc: 'Acumule 500.000 XP', color: 'teal', type: 'xp', target: 500000, xpReward: 50000 },
  { id: 'xp-750000', emoji: '🪐', name: 'Senhor do Multiverso', desc: 'Acumule 750.000 XP', color: 'violet', type: 'xp', target: 750000, xpReward: 75000 },
  { id: 'xp-1000000', emoji: '♾️', name: 'O Escolhido', desc: 'O mítico 1.000.000 XP', color: 'amber', type: 'xp', target: 1000000, xpReward: 100000 },

  // --- MOEDAS (COINS) - 12 Conquistas ---
  { id: 'coins-50', emoji: '👛', name: 'Primeiro Troco', desc: 'Acumule 50 moedas', color: 'yellow', type: 'coins', target: 50, xpReward: 20 },
  { id: 'coins-200', emoji: '🪙', name: 'Moedinha Brilhante', desc: 'Acumule 200 moedas', color: 'yellow', type: 'coins', target: 200, xpReward: 50 },
  { id: 'coins-500', emoji: '💰', name: 'Poupador Esperto', desc: 'Acumule 500 moedas', color: 'amber', type: 'coins', target: 500, xpReward: 150 },
  { id: 'coins-1000', emoji: '🐷', name: 'Cofrinho Cheio', desc: 'Acumule 1.000 moedas', color: 'amber', type: 'coins', target: 1000, xpReward: 250 },
  { id: 'coins-2500', emoji: '💎', name: 'Caçador de Tesouros', desc: 'Acumule 2.500 moedas', color: 'cyan', type: 'coins', target: 2500, xpReward: 500 },
  { id: 'coins-5000', emoji: '🤝', name: 'Mestre de Vendas', desc: 'Acumule 5.000 moedas', color: 'emerald', type: 'coins', target: 5000, xpReward: 1000 },
  { id: 'coins-10000', emoji: '🎩', name: 'Barão da Moeda', desc: 'Acumule 10.000 moedas', color: 'indigo', type: 'coins', target: 10000, xpReward: 2500 },
  { id: 'coins-25000', emoji: '🗄️', name: 'Cofre Forte', desc: 'Acumule 25.000 moedas', color: 'slate', type: 'coins', target: 25000, xpReward: 5000 },
  { id: 'coins-50000', emoji: '🐲', name: 'Dragão Dourado', desc: 'Acumule 50.000 moedas', color: 'amber', type: 'coins', target: 50000, xpReward: 10000 },
  { id: 'coins-100000', emoji: '🌲', name: 'Rico por Natureza', desc: 'Acumule 100.000 moedas', color: 'emerald', type: 'coins', target: 100000, xpReward: 20000 },
  { id: 'coins-250000', emoji: '🏛️', name: 'Dono do Banco', desc: 'Acumule 250.000 moedas', color: 'sky', type: 'coins', target: 250000, xpReward: 50000 },
  { id: 'coins-500000', emoji: '🏦', name: 'Magnata Supremo', desc: 'Acumule 500.000 moedas', color: 'emerald', type: 'coins', target: 500000, xpReward: 100000 },

  // --- NÍVEL (LEVEL) - 13 Conquistas ---
  { id: 'level-2', emoji: '🪜', name: 'Primeiro Degrau', desc: 'Alcance o Nível 2', color: 'emerald', type: 'level', target: 2, xpReward: 50 },
  { id: 'level-3', emoji: '🎒', name: 'Aprendiz Curioso', desc: 'Alcance o Nível 3', color: 'emerald', type: 'level', target: 3, xpReward: 100 },
  { id: 'level-5', emoji: '⚡', name: 'Relâmpago', desc: 'Alcance o Nível 5', color: 'emerald', type: 'level', target: 5, xpReward: 200 },
  { id: 'level-7', emoji: '🍀', name: 'Número da Sorte', desc: 'Alcance o Nível 7', color: 'green', type: 'level', target: 7, xpReward: 350 },
  { id: 'level-10', emoji: '🧙‍♂️', name: 'Mago do Saber', desc: 'Alcance o Nível 10', color: 'indigo', type: 'level', target: 10, xpReward: 600 },
  { id: 'level-15', emoji: '📜', name: 'Erudito Implacável', desc: 'Alcance o Nível 15', color: 'blue', type: 'level', target: 15, xpReward: 1000 },
  { id: 'level-20', emoji: '🛡️', name: 'Cavaleiro Lendário', desc: 'Alcance o Nível 20', color: 'rose', type: 'level', target: 20, xpReward: 1500 },
  { id: 'level-30', emoji: '🦉', name: 'Sábio Ancião', desc: 'Alcance o Nível 30', color: 'slate', type: 'level', target: 30, xpReward: 3000 },
  { id: 'level-40', emoji: '🥋', name: 'Mestre dos Mestres', desc: 'Alcance o Nível 40', color: 'amber', type: 'level', target: 40, xpReward: 5000 },
  { id: 'level-50', emoji: '🎖️', name: 'Meio Século', desc: 'Alcance o cobiçado Nível 50', color: 'yellow', type: 'level', target: 50, xpReward: 8000 },
  { id: 'level-75', emoji: '✨', name: 'Espírito Ascendido', desc: 'Alcance o Nível 75', color: 'sky', type: 'level', target: 75, xpReward: 15000 },
  { id: 'level-99', emoji: '🧗', name: 'Quase Lá...', desc: 'Alcance o Nível 99', color: 'orange', type: 'level', target: 99, xpReward: 25000 },
  { id: 'level-100', emoji: '👑', name: 'O Imortal', desc: 'Alcance o Nível Máximo (100)', color: 'fuchsia', type: 'level', target: 100, xpReward: 50000 },
];

export const StudentAchievements: React.FC<StudentAchievementsProps> = ({
  studentData,
}) => {
  const unlockedAchievements: any[] = [];
  const lockedAchievements: any[] = [];

  ALL_ACHIEVEMENTS.forEach(ach => {
    let currentVal = 0;
    if (ach.type === 'streak') currentVal = studentData.highestStreak || 0;
    if (ach.type === 'xp') currentVal = studentData.xp || 0;
    if (ach.type === 'coins') currentVal = studentData.coins || 0;
    if (ach.type === 'level') currentVal = studentData.level || 0;

    const progress = Math.min((currentVal / ach.target) * 100, 100);
    const isUnlocked = currentVal >= ach.target;

    const enriched = { ...ach, progress, currentVal };
    if (isUnlocked) unlockedAchievements.push(enriched);
    else lockedAchievements.push(enriched);
  });

  const mainBadges = unlockedAchievements.slice(-3).reverse(); // Pegar as 3 ultimas
  while (mainBadges.length < 3) {
    mainBadges.push(null);
  }

  const [rankingTab, setRankingTab] = useState<'students' | 'teachers'>('students');
  const [realStudents, setRealStudents] = useState<RealStudentRanking[]>([]);
  const [realTeachers, setRealTeachers] = useState<RealTeacherRanking[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingRanking(true);
        const [studentsData, teachersData] = await Promise.all([
          fetchRealStudentRanking(),
          fetchRealTeacherRanking()
        ]);
        if (isMounted) {
          setRealStudents(studentsData);
          setRealTeachers(teachersData);
        }
      } catch (e) {
        console.warn('Erro ao carregar dados do ranking:', e);
      } finally {
        if (isMounted) setLoadingRanking(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Combina lista real de alunos com o aluno logado e ordena por XP
  const studentRankingList = useMemo(() => {
    const list = [...realStudents];
    const myName = (studentData.name || '').trim().toLowerCase();
    const myCode = (studentData.enrollment_code || '').trim().toUpperCase();

    const existingIndex = list.findIndex(s => 
      s.name.toLowerCase().trim() === myName ||
      (myCode && s.enrollment_code?.toUpperCase() === myCode) ||
      (studentData.id && s.id === studentData.id)
    );

    if (existingIndex !== -1) {
      list[existingIndex] = {
        ...list[existingIndex],
        name: studentData.name,
        xp: Math.max(list[existingIndex].xp, studentData.xp),
        level: Math.max(list[existingIndex].level, studentData.level),
        streak_count: Math.max(list[existingIndex].streak_count, studentData.streak || 0),
        isCurrentUser: true,
      };
    } else {
      list.push({
        id: studentData.id || 'current-student',
        name: studentData.name,
        enrollment_code: myCode || 'AFIC001',
        level: studentData.level,
        title: 'Explorador Aprendiz',
        xp: studentData.xp,
        coins: studentData.coins || 0,
        streak_count: studentData.streak || 0,
        avatar: '',
        isCurrentUser: true,
      });
    }

    return list.sort((a, b) => b.xp - a.xp);
  }, [realStudents, studentData]);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 p-8 md:p-10 text-neutral-900 shadow-xl shadow-amber-400/20">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-6 bottom-0 opacity-10 pointer-events-none translate-y-1/4">
          <Trophy size={220} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
          <div>
            <span className="inline-flex items-center gap-2 bg-neutral-900/20 backdrop-blur-sm text-neutral-900 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
              <Crown size={12} /> Sala dos Campeões
            </span>
            <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">Mural de Conquistas e Heróis</h2>
            <p className="text-neutral-800 font-medium max-w-2xl text-sm md:text-base leading-relaxed">Exiba suas medalhas e veja quem são os líderes da semana! Continue estudando e completando desafios para desbloquear novos troféus.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Streak Widget estilo Duolingo - Poder do Raio ⚡ */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                studentData.hasPracticedToday
                  ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30 ring-4 ring-yellow-400/20'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 ring-4 ring-neutral-200/50 dark:ring-neutral-700/50'
              }`}>
                <Zap size={28} fill={studentData.hasPracticedToday ? "currentColor" : "none"} className={studentData.hasPracticedToday ? "animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "opacity-60"} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-black text-neutral-900 dark:text-white">{studentData.streak || 0} {studentData.streak === 1 ? 'dia' : 'dias'}</p>
                  {studentData.hasPracticedToday ? (
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-yellow-400">
                      Raio Ativo ⚡
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                      Aguardando ⚡
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-neutral-500">
                  {studentData.hasPracticedToday 
                    ? 'Energia máxima alcançada hoje!' 
                    : 'Complete uma atividade hoje para liberar o raio!'}
                </p>
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="flex justify-between text-xs font-bold text-neutral-500 mb-2">
                <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
              </div>
              <div className="flex gap-1.5">
                {(studentData.weeklyActivity || [false, false, false, false, false, false, false]).map((active, i) => (
                  <div key={i} className={`flex-1 h-8 rounded-lg transition-all ${active ? 'bg-gradient-to-t from-amber-500 to-yellow-400 shadow-sm shadow-amber-500/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}></div>
                ))}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-yellow-400 text-xs font-black px-4 py-2.5 rounded-xl shrink-0 text-center">
              Recorde: {studentData.highestStreak || 0} dias!
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Trophy size={24} className="text-amber-500" /> Suas Insígnias Principais
              </h3>
              <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold px-3 py-1 rounded-full text-sm">{unlockedAchievements.length} de {ALL_ACHIEVEMENTS.length} Desbloqueadas</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4">
              {mainBadges.map((badge, idx) => {
                if (!badge) {
                  return (
                    <div key={`empty-${idx}`} className="flex flex-col items-center text-center gap-3 opacity-50">
                      <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-[28px] flex items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-700">
                        <Lock size={32} className="text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-neutral-500 text-sm">Vazio</h4>
                        <p className="text-[10px] font-bold text-neutral-400">Continue jogando!</p>
                      </div>
                    </div>
                  );
                }
                
                const rotation = idx === 0 ? 'rotate-3' : idx === 1 ? '-rotate-3' : 'rotate-6';
                
                return (
                  <div key={badge.id} className="flex flex-col items-center text-center gap-3 group relative cursor-pointer">
                    <div className={`w-24 h-24 bg-gradient-to-br from-${badge.color}-300 to-${badge.color}-500 rounded-[28px] flex items-center justify-center shadow-lg shadow-${badge.color}-500/30 group-hover:-translate-y-2 group-hover:scale-105 transition-all ${rotation} ring-4 ring-${badge.color}-100 dark:ring-${badge.color}-900/30 ring-offset-4 ring-offset-white dark:ring-offset-neutral-900`}>
                      <span className="text-4xl drop-shadow-md">{badge.emoji}</span>
                    </div>
                    <div>
                      <h4 className="font-black text-neutral-900 dark:text-white text-sm">{badge.name}</h4>
                      <p className="text-[10px] font-bold text-neutral-500">{badge.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Troféus Conquistados */}
          {unlockedAchievements.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Unlock className="text-emerald-500" size={22} />
                Troféus Conquistados
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {unlockedAchievements.map((badge) => (
                  <div key={badge.id} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-[24px] p-4 border border-neutral-100 dark:border-neutral-800/50 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all cursor-pointer group text-center">
                    <div className={`w-16 h-16 rounded-2xl bg-${badge.color}-100 dark:bg-${badge.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform text-4xl border border-${badge.color}-200/50 dark:border-${badge.color}-500/20 shadow-sm`}>
                      {badge.emoji}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-neutral-900 dark:text-white leading-tight">{badge.name}</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">{badge.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-auto">
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">+{badge.xpReward} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Próximas Conquistas */}
          {lockedAchievements.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Lock className="text-neutral-400" size={22} />
                Próximas Conquistas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {lockedAchievements.map((badge) => (
                  <div key={badge.id} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-[24px] p-4 border border-neutral-100 dark:border-neutral-800/50 flex flex-col items-center gap-3 text-center opacity-80 hover:opacity-100 transition-opacity">
                    <div className="relative w-16 h-16">
                      <div className="w-full h-full rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-4xl grayscale border border-neutral-300 dark:border-neutral-700">
                        {badge.emoji}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900">
                        <Lock size={11} className="text-neutral-600 dark:text-neutral-400" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-neutral-900 dark:text-white leading-tight">{badge.name}</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">{badge.desc}</p>
                    </div>
                    <div className="w-full space-y-1 mt-auto">
                      <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all" style={{ width: `${badge.progress}%` }}></div>
                      </div>
                      <p className="text-[10px] font-bold text-neutral-500">{badge.currentVal} / {badge.target}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Ranking Real da Rede (Alunos & Professores) */}
        <div className="bg-gradient-to-b from-sky-600 via-indigo-700 to-indigo-900 rounded-[32px] p-1 shadow-2xl shadow-indigo-500/25 relative overflow-hidden h-fit">
          <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
            <Trophy size={140} />
          </div>
          
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl w-full h-full rounded-[28px] p-5 md:p-6 flex flex-col gap-5 relative z-10 text-white">
            
            {/* Header com Título e Switcher de Abas */}
            <div className="pb-4 border-b border-white/15 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                    <Trophy className="text-yellow-300" size={24} /> Ranking da Rede
                  </h3>
                  <p className="text-xs font-semibold text-sky-200 mt-0.5">Dados reais sincronizados via Supabase</p>
                </div>
                {loadingRanking && (
                  <Loader2 size={16} className="text-sky-300 animate-spin" />
                )}
              </div>

              {/* Seletor de Categoria: Alunos vs Professores */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/25 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setRankingTab('students')}
                  className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    rankingTab === 'students'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-neutral-950 shadow-md shadow-yellow-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <GraduationCap size={15} />
                  <span>Alunos ({studentRankingList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRankingTab('teachers')}
                  className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    rankingTab === 'teachers'
                      ? 'bg-gradient-to-r from-indigo-400 to-sky-400 text-neutral-950 shadow-md shadow-indigo-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users size={15} />
                  <span>Professores ({realTeachers.length})</span>
                </button>
              </div>
            </div>
            
            {/* Lista: Ranking de Alunos Reais */}
            {rankingTab === 'students' && (
              <div className="flex-1 space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {studentRankingList.map((user, index) => {
                  const position = index + 1;
                  const isFirst = position === 1;
                  const isSecond = position === 2;
                  const isThird = position === 3;
                  
                  if (user.isCurrentUser) {
                    return (
                      <div 
                        key={user.id} 
                        className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-neutral-950 rounded-2xl p-3.5 flex items-center gap-3.5 relative overflow-hidden shadow-xl shadow-amber-500/40 transform scale-[1.02] z-10 border-2 border-white/60"
                      >
                        <div className="font-black text-lg w-7 text-center text-amber-950 shrink-0">
                          {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `#${position}`}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-amber-600 border-2 border-amber-600/30 shadow-inner shrink-0 text-sm">
                          {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-black text-xs sm:text-sm truncate">{user.name}</p>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-neutral-950 text-yellow-300 shrink-0">
                              Você ⚡
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] font-bold text-amber-950/80">
                            Nível {user.level} · {user.streak_count} {user.streak_count === 1 ? 'dia' : 'dias'} ⚡
                          </p>
                        </div>
                        <div className="font-black text-amber-950 text-sm whitespace-nowrap bg-black/10 px-2.5 py-1 rounded-xl">
                          {user.xp.toLocaleString('pt-BR')} XP
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={user.id} 
                      className={`rounded-2xl p-3 flex items-center gap-3.5 relative overflow-hidden transition-all hover:bg-white/15 ${
                        isFirst 
                          ? 'bg-white/20 border-2 border-yellow-400/80 shadow-lg shadow-yellow-500/20' 
                          : isSecond 
                          ? 'bg-white/15 border border-slate-300/50' 
                          : isThird 
                          ? 'bg-white/10 border border-amber-600/40' 
                          : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      <div className="font-black text-base w-7 text-center shrink-0">
                        {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : position}
                      </div>
                      
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 shrink-0 ${
                        isFirst ? 'bg-yellow-400 text-neutral-900 border-white' : 'bg-white/20 text-white border-white/30'
                      }`}>
                        {user.name.charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`font-bold text-sm truncate ${isFirst ? 'text-white font-black' : 'text-white/95'}`}>
                            {user.name}
                          </p>
                          {user.enrollment_code && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-sky-200">
                              {user.enrollment_code}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-sky-200/80">
                          Nível {user.level} · {user.streak_count || 0} dias ⚡
                        </p>
                      </div>

                      <div className={`font-black text-sm shrink-0 ${isFirst ? 'text-yellow-300' : 'text-white/90'}`}>
                        {user.xp.toLocaleString('pt-BR')} XP
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lista: Quadro de Educadores Reais */}
            {rankingTab === 'teachers' && (
              <div className="flex-1 space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {realTeachers.map((teacher, index) => {
                  const isAfic = teacher.email.toLowerCase() === 'aficconsultoria@gmail.com';

                  return (
                    <div 
                      key={teacher.id} 
                      className={`rounded-2xl p-3.5 flex items-start gap-3.5 transition-all ${
                        isAfic 
                          ? 'bg-gradient-to-r from-indigo-500/30 via-purple-500/20 to-sky-500/30 border-2 border-indigo-400 shadow-lg shadow-indigo-500/20' 
                          : 'bg-white/10 border border-white/10 hover:bg-white/15'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border-2 shrink-0 ${
                        isAfic 
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-yellow-300 shadow-md' 
                          : 'bg-white/20 text-white border-white/30'
                      }`}>
                        {teacher.name.charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-black text-sm text-white truncate">{teacher.name}</p>
                          {isAfic && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-400 text-neutral-950 flex items-center gap-1 shadow-sm">
                              👑 AFIC
                            </span>
                          )}
                        </div>
                        
                        <p className="text-[11px] font-semibold text-sky-200 mt-0.5">
                          {teacher.subject} · {teacher.school}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Ativo na Rede
                          </span>
                          <span className="text-[10px] text-white/60 truncate font-mono">
                            {teacher.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
