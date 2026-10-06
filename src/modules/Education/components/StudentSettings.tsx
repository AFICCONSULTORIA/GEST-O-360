import React, { useRef } from 'react';
import { 
  Settings, 
  Image as ImageIcon, 
  Sparkles, 
  Bell, 
  ToggleRight, 
  ToggleLeft,
  CheckCircle2,
  Camera,
  RotateCcw,
  User,
  Flame,
  Calendar
} from 'lucide-react';
import { EducationAvatar, optimizeAvatarImage } from './EducationAvatar';
import { 
  getLocalDateString, 
  calculateDuolingoStreak, 
  calculateWeeklyActivity, 
  seedInitialStreakDates 
} from '../utils/streakUtils';

interface StudentSettingsProps {
  studentData: {
    id: string;
    name: string;
    coins: number;
    xp: number;
    streak?: number;
    hasPracticedToday?: boolean;
    streakFreezes?: number;
    avatar: string;
    inventory: string[];
  };
  setStudentData: React.Dispatch<React.SetStateAction<any>>;
}

const PREMIUM_AVATARS: Record<string, string> = {
  'avatar_ninja': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23334155"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🥷</text></svg>',
  'avatar_fox': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f97316"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🦊</text></svg>',
  'avatar_robot': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230ea5e9"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🤖</text></svg>',
  'avatar_dragon': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e11d48"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🐲</text></svg>'
};

export const StudentSettings: React.FC<StudentSettingsProps> = ({
  studentData,
  setStudentData,
}) => {
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setToastMessage('Suas alterações foram salvas com sucesso!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSimulateNewDay = () => {
    if (!studentData.id) return;
    const todayStr = getLocalDateString();
    const storedAct = localStorage.getItem(`edu_activity_${studentData.id}`);
    let localActivity = storedAct ? JSON.parse(storedAct) : { dates: [] as string[], freezes: 0, highestStreak: 0 };
    
    // Remove hoje do histórico de datas para simular que o dia começou agora (fogo apagado)
    localActivity.dates = (localActivity.dates || []).filter((d: string) => d !== todayStr);
    localStorage.setItem(`edu_activity_${studentData.id}`, JSON.stringify(localActivity));
    
    const streakData = calculateDuolingoStreak(localActivity.dates, localActivity.freezes);
    const weeklyActivity = calculateWeeklyActivity(localActivity.dates);

    setStudentData((prev: any) => ({
      ...prev,
      streak: streakData.currentStreak,
      hasPracticedToday: false,
      weeklyActivity
    }));

    setToastMessage('Fogo apagado! Dia simulado como novo: complete uma aula para acender a ofensiva.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetStreak = () => {
    if (!studentData.id) return;
    const storedAct = localStorage.getItem(`edu_activity_${studentData.id}`);
    let localActivity = storedAct ? JSON.parse(storedAct) : { dates: [] as string[], freezes: 0, highestStreak: 0 };
    localActivity.dates = [];
    localActivity.highestStreak = 0;
    localStorage.setItem(`edu_activity_${studentData.id}`, JSON.stringify(localActivity));

    setStudentData((prev: any) => ({
      ...prev,
      streak: 0,
      highestStreak: 0,
      hasPracticedToday: false,
      weeklyActivity: [false, false, false, false, false, false, false]
    }));

    setToastMessage('Ofensiva reiniciada para 0 dias.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSetArthur12Streak = () => {
    if (!studentData.id) return;
    const storedAct = localStorage.getItem(`edu_activity_${studentData.id}`);
    let localActivity = storedAct ? JSON.parse(storedAct) : { dates: [] as string[], freezes: 0, highestStreak: 0 };
    localActivity.dates = seedInitialStreakDates(12);
    localActivity.highestStreak = 12;
    localStorage.setItem(`edu_activity_${studentData.id}`, JSON.stringify(localActivity));

    const streakData = calculateDuolingoStreak(localActivity.dates, localActivity.freezes);
    const weeklyActivity = calculateWeeklyActivity(localActivity.dates);

    setStudentData((prev: any) => ({
      ...prev,
      streak: 12,
      highestStreak: 12,
      hasPracticedToday: false,
      weeklyActivity
    }));

    setToastMessage('Ofensiva configurada para 12 dias (com fogo apagado para hoje).');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastMessage('Por favor, selecione um arquivo de imagem válido.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    try {
      setIsProcessingPhoto(true);
      const optimizedBase64 = await optimizeAvatarImage(file, 360, 0.85);
      setStudentData((prev: any) => ({ ...prev, avatar: optimizedBase64 }));
      setToastMessage('Foto atualizada com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setToastMessage('Erro ao carregar imagem. Tente outra foto.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetToDefault = () => {
    setStudentData((prev: any) => ({ ...prev, avatar: '' }));
    setToastMessage('Ícone padrão escolar restaurado!');
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Avatares desbloqueados do inventário
  const unlockedAvatars = (studentData.inventory || [])
    .filter(item => item.startsWith('avatar_'))
    .map(item => ({ id: item, url: PREMIUM_AVATARS[item] }));

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
          <Settings className="text-emerald-500" size={32} />
          Meu Perfil e Opções
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">Personalize sua foto, ícone e nome no Gestão 360 Educação!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Meu Perfil Mágico */}
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
          <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="text-emerald-500" size={24} />
            Foto do Aluno e Dados
          </h3>

          <div className="flex flex-col items-center gap-5">
            <div className="relative group">
              <div className="p-1 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 shadow-xl shadow-emerald-500/20">
                <div className="rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 bg-white dark:bg-neutral-800">
                  <EducationAvatar 
                    src={studentData.avatar} 
                    name={studentData.name} 
                    role="student" 
                    size="xl" 
                  />
                </div>
              </div>

              {/* Botão de upload sobreposto */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingPhoto}
                title="Adicionar ou trocar foto"
                className="absolute bottom-1 right-1 p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <Camera size={18} />
              </button>
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="hidden" 
            />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingPhoto}
                className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Camera size={16} />
                {isProcessingPhoto ? 'Processando...' : 'Carregar Minha Foto'}
              </button>

              {studentData.avatar && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Usar Ícone Padrão
                </button>
              )}
            </div>
            
            <div className="w-full space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">Seu Nome Mágico</label>
                <input 
                  type="text" 
                  value={studentData.name} 
                  onChange={e => setStudentData((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors font-bold text-neutral-900 dark:text-white" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Selecionar Avatar */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="text-amber-500" size={24} />
              Escolher Aparência
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Opção 1: Ícone Padrão */}
              <div 
                onClick={handleResetToDefault}
                className={`relative cursor-pointer rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border-4 transition-all hover:scale-105 ${
                  !studentData.avatar 
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/10 scale-105' 
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-emerald-200 dark:hover:border-emerald-900'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
                  <User size={26} />
                </div>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 text-center">Ícone Padrão</span>
                {!studentData.avatar && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                )}
              </div>

              {/* Se o aluno tem foto própria carregada */}
              {studentData.avatar && !studentData.avatar.startsWith('data:image/svg+xml') && (
                <div 
                  className="relative cursor-pointer rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/10 scale-105"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white dark:border-neutral-800 shadow-md">
                    <img src={studentData.avatar} alt="Foto Própria" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 text-center">Foto Pessoal</span>
                  <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                </div>
              )}

              {/* Avatares da Loja (se possuir) */}
              {unlockedAvatars.map((av) => (
                <div 
                  key={av.id}
                  onClick={() => setStudentData((prev: any) => ({ ...prev, avatar: av.url }))}
                  className={`relative cursor-pointer rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border-4 transition-all hover:scale-105 ${
                    studentData.avatar === av.url 
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/20 scale-105' 
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-emerald-200 dark:hover:border-emerald-900'
                  }`}
                >
                  <img src={av.url} alt={av.id} className="w-14 h-14 rounded-full object-cover shadow-sm bg-white" />
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 text-center capitalize">
                    {av.id.replace('avatar_', '')}
                  </span>
                  {studentData.avatar === av.url && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-neutral-500 text-center mt-1">Você pode carregar uma foto pessoal ou desbloquear avatares divertidos na Loja de Recompensas!</p>
          </div>

          {/* Notificações */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Bell className="text-amber-500" size={24} />
              Avisos Mágicos
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Novos Desafios Diários</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Me avise quando tiver jogo novo!</p>
                </div>
                <ToggleRight size={32} className="text-emerald-500" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Mensagens dos Professores</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Sons divertidos ao receber dicas.</p>
                </div>
                <ToggleRight size={32} className="text-emerald-500" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer opacity-75">
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Lembrete de Estudos</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Aviso gentil no fim de semana.</p>
                </div>
                <ToggleLeft size={32} className="text-neutral-400" />
              </div>
            </div>
          </div>

          {/* Gerenciador da Ofensiva Diária (Duolingo) */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Flame className={studentData.hasPracticedToday ? "text-orange-500" : "text-neutral-400"} size={24} fill={studentData.hasPracticedToday ? "currentColor" : "none"} />
                Ofensiva Diária (Estilo Duolingo)
              </h3>
              <div className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 transition-all ${
                studentData.hasPracticedToday
                  ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
              }`}>
                {studentData.hasPracticedToday ? '🔥 Fogo Aceso Hoje' : '🕯️ Fogo Apagado (Pendente)'}
              </div>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              O sistema conta a ofensiva estritamente na <strong>primeira atividade</strong> de cada dia. Caso você ainda não tenha feito uma atividade hoje, o fogo permanece apagado. Use os controles abaixo para simular ou ajustar o teste da sequência:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleSimulateNewDay}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs transition-all border border-amber-200/60 dark:border-amber-500/30 cursor-pointer shadow-sm active:scale-95"
              >
                <Calendar size={14} />
                Simular Novo Dia (Apagar Fogo)
              </button>
              
              <button
                type="button"
                onClick={handleSetArthur12Streak}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 font-bold text-xs transition-all border border-orange-200/60 dark:border-orange-500/30 cursor-pointer shadow-sm active:scale-95"
              >
                <Flame size={14} />
                Definir 12 Dias (Pendente)
              </button>

              <button
                type="button"
                onClick={handleResetStreak}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs transition-all border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCcw size={14} />
                Zerar Ofensiva
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end pt-4 relative">
        <button 
          onClick={handleSave}
          className="bg-emerald-600 text-white font-bold px-8 py-4 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          Salvar Minhas Escolhas <Sparkles size={18} />
        </button>
      </div>

      {/* Toast Notifier */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border bg-emerald-50 dark:bg-emerald-900/80 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100">
            <CheckCircle2 size={24} />
            <span className="font-bold">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
