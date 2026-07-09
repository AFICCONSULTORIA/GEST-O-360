import React from 'react';
import { 
  Award, 
  Trophy, 
  Star, 
  Flame, 
  Compass, 
  Crown, 
  Zap,
  BookOpen,
  Unlock,
  Lock
} from 'lucide-react';

interface StudentAchievementsProps {
  studentData: {
    name: string;
    xp: number;
    level: number;
    streak?: number;
    highestStreak?: number;
    weeklyActivity?: boolean[];
  };
}

export const StudentAchievements: React.FC<StudentAchievementsProps> = ({
  studentData,
}) => {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Banner (Sala dos Campeões) */}
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
            <p className="text-neutral-800 font-medium max-w-2xl text-sm md:text-base leading-relaxed">Exiba suas medalhas e veja quem são os líderes da semana! Continue estudando e completando desafios para alcançar o topo do ranking.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Badges e Status */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Widget de Sequência de Estudos (Streak) */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <Flame size={28} fill="currentColor" />
              </div>
              <div>
                <p className="text-3xl font-black text-neutral-900 dark:text-white">{studentData.streak || 0} dias</p>
                <p className="text-sm font-bold text-neutral-500">Sequência de Estudos 🔥</p>
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="flex justify-between text-xs font-bold text-neutral-500 mb-2">
                <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
              </div>
              <div className="flex gap-1.5">
                {(studentData.weeklyActivity || [false, false, false, false, false, false, false]).map((active, i) => (
                  <div key={i} className={`flex-1 h-8 rounded-lg transition-all ${active ? 'bg-orange-400 shadow-sm shadow-orange-400/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}></div>
                ))}
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-black px-4 py-2.5 rounded-xl shrink-0">
              Recorde: {studentData.highestStreak || 0} dias!
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Trophy size={24} className="text-amber-500" /> Suas Insígnias Principais
              </h3>
              <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold px-3 py-1 rounded-full text-sm">3 de 12 Desbloqueadas</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4">
              {/* Badge Earned */}
              <div className="flex flex-col items-center text-center gap-3 group relative cursor-pointer">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-300 to-amber-500 rounded-[28px] flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:-translate-y-2 group-hover:scale-105 transition-all rotate-3 ring-4 ring-amber-100 dark:ring-amber-900/30 ring-offset-4 ring-offset-white dark:ring-offset-neutral-900">
                  <Flame size={48} className="text-white drop-shadow-md" fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-black text-neutral-900 dark:text-white text-sm">Fogo do Conhecimento</h4>
                  <p className="text-[10px] font-bold text-neutral-500">7 Dias Seguidos</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center gap-3 group relative cursor-pointer">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-300 to-emerald-500 rounded-[28px] flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:-translate-y-2 group-hover:scale-105 transition-all -rotate-3 ring-4 ring-emerald-100 dark:ring-emerald-900/30 ring-offset-4 ring-offset-white dark:ring-offset-neutral-900">
                  <Star size={48} className="text-white drop-shadow-md" fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-black text-neutral-900 dark:text-white text-sm">Estrela Perfeita</h4>
                  <p className="text-[10px] font-bold text-neutral-500">Nota 10 em Matemática</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center gap-3 group relative cursor-pointer">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-300 to-indigo-500 rounded-[28px] flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:-translate-y-2 group-hover:scale-105 transition-all rotate-6 ring-4 ring-indigo-100 dark:ring-indigo-900/30 ring-offset-4 ring-offset-white dark:ring-offset-neutral-900">
                  <Compass size={48} className="text-white drop-shadow-md" />
                </div>
                <div>
                  <h4 className="font-black text-neutral-900 dark:text-white text-sm">Primeiros Passos</h4>
                  <p className="text-[10px] font-bold text-neutral-500">Concluiu 1 Trilha</p>
                </div>
              </div>
            </div>
          </div>

          {/* Troféus Conquistados */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Unlock className="text-emerald-500" size={22} />
              Troféus Conquistados
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { emoji: '🌟', name: 'Super Estrela', desc: 'Nota máxima em 5 missões', color: 'amber', xp: '+200 XP', date: 'Jun 10' },
                { emoji: '⚡', name: 'Relâmpago', desc: 'Completou missão com 15 min de sobra', color: 'yellow', xp: '+150 XP', date: 'Jun 8' },
                { emoji: '🔥', name: 'Em Chamas!', desc: '7 dias de sequência de estudos', color: 'orange', xp: '+300 XP', date: 'Jun 5' },
                { emoji: '🧙', name: 'Mago Matemático', desc: 'Acertou 100% na trilha de Números', color: 'indigo', xp: '+500 XP', date: 'Mai 28' },
                { emoji: '📚', name: 'Devorador de Livros', desc: 'Leu 10 materiais de apoio', color: 'sky', xp: '+250 XP', date: 'Mai 20' },
                { emoji: '🎯', name: 'Mira Certeira', desc: 'Acertou 5 avaliações seguidas', color: 'rose', xp: '+400 XP', date: 'Mai 15' },
              ].map((badge, i) => (
                <div key={i} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-[24px] p-4 border border-neutral-100 dark:border-neutral-800/50 flex flex-col items-center gap-3 hover:-translate-y-1 transition-all cursor-pointer group text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-${badge.color}-100 dark:bg-${badge.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform text-4xl border border-${badge.color}-200/50 dark:border-${badge.color}-500/20 shadow-sm`}>
                    {badge.emoji}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-neutral-900 dark:text-white leading-tight">{badge.name}</h4>
                    <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">{badge.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-auto">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">{badge.xp}</span>
                    <span className="text-[10px] text-neutral-400">{badge.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Próximas Conquistas (Locked) */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Lock className="text-neutral-400" size={22} />
              Próximas Conquistas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { emoji: '🚀', name: 'Explorador', desc: 'Complete a trilha de Ciências', progress: 65, needed: 'Fase 3 de 5' },
                { emoji: '👑', name: 'Rei das Rimas', desc: 'Nota máxima em Português', progress: 80, needed: '1 missão' },
                { emoji: '🦁', name: 'Coração Bravo', desc: '20 dias de sequência seguidos', progress: 60, needed: '8 dias restantes' },
              ].map((badge, i) => (
                <div key={i} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-[24px] p-4 border border-neutral-100 dark:border-neutral-800/50 flex flex-col items-center gap-3 text-center opacity-80 hover:opacity-100 transition-opacity">
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
                    <p className="text-[10px] font-bold text-neutral-500">{badge.needed}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Coluna Direita: Ranking */}
        <div className="bg-gradient-to-b from-sky-500 to-indigo-600 rounded-[32px] p-1 shadow-xl shadow-sky-500/20 relative overflow-hidden h-fit">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Trophy size={120} />
          </div>
          <div className="bg-white/10 backdrop-blur-md w-full h-full rounded-[28px] p-6 flex flex-col gap-6 relative z-10 text-white">
            <div className="text-center pb-4 border-b border-white/20">
              <h3 className="text-2xl font-black mb-1">Ranking Semanal</h3>
              <p className="text-sm font-medium text-sky-100">Atualizado a cada hora</p>
            </div>
            
            <div className="flex-1 space-y-4">
              {/* Top 1 */}
              <div className="bg-white/20 rounded-2xl p-3 flex items-center gap-4 relative overflow-hidden ring-2 ring-yellow-400">
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
                <div className="font-black text-xl w-6 text-center text-yellow-300">1</div>
                <img src="https://i.pravatar.cc/150?u=a" alt="User" className="w-10 h-10 rounded-full border-2 border-white" />
                <div className="flex-1">
                  <p className="font-black text-sm truncate">Maria Clara</p>
                  <p className="text-[10px] font-bold text-sky-100">Nível 9</p>
                </div>
                <div className="font-black text-yellow-300 text-sm">3450 XP</div>
              </div>

              {/* Top 2 */}
              <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
                <div className="font-black text-xl w-6 text-center text-slate-300">2</div>
                <img src="https://i.pravatar.cc/150?u=b" alt="User" className="w-10 h-10 rounded-full border-2 border-white/50" />
                <div className="flex-1">
                  <p className="font-bold text-sm truncate text-white/90">João Pedro</p>
                  <p className="text-[10px] font-bold text-sky-100">Nível 8</p>
                </div>
                <div className="font-black text-white/90 text-sm">2900 XP</div>
              </div>

              {/* Current User */}
              <div className="bg-amber-400 text-neutral-900 rounded-2xl p-3 flex items-center gap-4 relative overflow-hidden shadow-lg shadow-amber-500/50 transform scale-105 z-10 my-6">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
                <div className="font-black text-xl w-6 text-center text-amber-900">3</div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-amber-500 border-2 border-amber-600">
                  {studentData.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm truncate">Você ({studentData.name})</p>
                  <p className="text-[10px] font-bold text-amber-900">Subindo rápido! 🚀</p>
                </div>
                <div className="font-black text-amber-900 text-sm">{studentData.xp} XP</div>
              </div>

              {/* Top 4 */}
              <div className="bg-white/5 rounded-2xl p-3 flex items-center gap-4 relative overflow-hidden">
                <div className="font-black text-xl w-6 text-center text-white/50">4</div>
                <img src="https://i.pravatar.cc/150?u=c" alt="User" className="w-10 h-10 rounded-full border-2 border-white/30" />
                <div className="flex-1">
                  <p className="font-bold text-sm truncate text-white/70">Ana Beatriz</p>
                  <p className="text-[10px] font-bold text-sky-200/50">Nível 7</p>
                </div>
                <div className="font-black text-white/70 text-sm">1800 XP</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
