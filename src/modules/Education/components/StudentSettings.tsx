import React, { useRef, useState } from 'react';
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
  Zap,
  ShieldCheck
} from 'lucide-react';
import { EducationAvatar, optimizeAvatarImage } from './EducationAvatar';

interface StudentSettingsProps {
  studentData: {
    id: string;
    name: string;
    coins: number;
    xp: number;
    streak?: number;
    highestStreak?: number;
    hasPracticedToday?: boolean;
    streakFreezes?: number;
    weeklyActivity?: boolean[];
    className?: string;
    avatar: string;
    inventory: string[];
  };
  setStudentData: React.Dispatch<React.SetStateAction<any>>;
  onTestStreakAnimation?: (prev: number, current: number) => void;
}

const PREMIUM_AVATARS: Record<string, { label: string; url: string }> = {
  avatar_ninja: {
    label: 'Ninja',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23334155"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🥷</text></svg>'
  },
  avatar_fox: {
    label: 'Raposa',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f97316"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🦊</text></svg>'
  },
  avatar_robot: {
    label: 'Robô',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230ea5e9"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🤖</text></svg>'
  },
  avatar_dragon: {
    label: 'Dragão',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e11d48"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🐲</text></svg>'
  }
};

export const StudentSettings: React.FC<StudentSettingsProps> = ({
  studentData,
  setStudentData,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [notifyChallenges, setNotifyChallenges] = useState(true);
  const [notifyTeacherMsgs, setNotifyTeacherMsgs] = useState(true);
  const [notifyStudyReminder, setNotifyStudyReminder] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setToastMessage('Suas preferências foram salvas com sucesso!');
    setTimeout(() => setToastMessage(null), 3000);
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
      setToastMessage('Foto de perfil atualizada com sucesso!');
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
    setToastMessage('Ícone padrão restaurado!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const unlockedAvatars = (studentData.inventory || [])
    .filter((item) => item in PREMIUM_AVATARS)
    .map((item) => ({
      id: item,
      label: PREMIUM_AVATARS[item].label,
      url: PREMIUM_AVATARS[item].url
    }));

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-28 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
          <Settings className="text-emerald-500" size={32} />
          Meu Perfil Escolar
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Personalize sua foto ou avatar e acompanhe sua rotina semanal de estudos!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Foto e Identificação Escolar */}
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col gap-6">
          <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="text-emerald-500" size={24} />
            Minha Identificação
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
                {isProcessingPhoto ? 'Processando...' : 'Escolher Foto'}
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
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">
                  Nome de Exibição
                </label>
                <input
                  type="text"
                  value={studentData.name}
                  onChange={(e) => setStudentData((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 outline-none transition-colors font-bold text-neutral-900 dark:text-white"
                />
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-neutral-400 uppercase block text-[10px]">Turma Escolar</span>
                  <strong className="text-sm text-neutral-900 dark:text-white">
                    {studentData.className || 'Turma 4A'}
                  </strong>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                  <ShieldCheck size={13} /> Matrícula Ativa
                </span>
              </div>
            </div>
          </div>

          {/* Minha Constância Semanal */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Zap size={17} className="text-amber-500" />
                Minha Rotina Desta Semana
              </h4>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                Recorde: {studentData.highestStreak || studentData.streak || 0} dias
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, idx) => {
                const done = studentData.weeklyActivity ? studentData.weeklyActivity[idx] : false;
                return (
                  <div
                    key={day}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 ${
                      done
                        ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200/60 dark:border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase">{day}</span>
                    <span className="text-sm font-black">{done ? '⚡' : '·'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Selecionar Avatar */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col gap-6">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="text-amber-500" size={24} />
              Escolher Avatar
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div
                onClick={handleResetToDefault}
                className={`relative cursor-pointer rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border-3 transition-all hover:scale-105 ${
                  !studentData.avatar
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md'
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

              {studentData.avatar && !studentData.avatar.startsWith('data:image/svg+xml') && (
                <div className="relative cursor-pointer rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border-3 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white dark:border-neutral-800 shadow-md">
                    <img src={studentData.avatar} alt="Foto Pessoal" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 text-center">Foto Pessoal</span>
                  <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                </div>
              )}

              {unlockedAvatars.map((av) => (
                <div
                  key={av.id}
                  onClick={() => setStudentData((prev: any) => ({ ...prev, avatar: av.url }))}
                  className={`relative cursor-pointer rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border-3 transition-all hover:scale-105 ${
                    studentData.avatar === av.url
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-emerald-200 dark:hover:border-emerald-900'
                  }`}
                >
                  <img src={av.url} alt={av.label} className="w-14 h-14 rounded-full object-cover shadow-sm bg-white" />
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 text-center">
                    {av.label}
                  </span>
                  {studentData.avatar === av.url && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-neutral-500 text-center">
              Desbloqueie novos avatares na <strong>Loja de Recompensas</strong> usando suas moedas!
            </p>
          </div>

          {/* Preferências de Avisos */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/70 dark:border-neutral-800 shadow-sm flex flex-col gap-6">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Bell className="text-amber-500" size={24} />
              Avisos & Sons
            </h3>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setNotifyChallenges(!notifyChallenges)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-left"
              >
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Novas Atividades da Turma</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">Avisar quando o professor publicar trilha nova.</p>
                </div>
                {notifyChallenges ? (
                  <ToggleRight size={32} className="text-emerald-500 shrink-0" />
                ) : (
                  <ToggleLeft size={32} className="text-neutral-400 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setNotifyTeacherMsgs(!notifyTeacherMsgs)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-left"
              >
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Recados dos Professores</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">Destacar novas mensagens e comunicados da escola.</p>
                </div>
                {notifyTeacherMsgs ? (
                  <ToggleRight size={32} className="text-emerald-500 shrink-0" />
                ) : (
                  <ToggleLeft size={32} className="text-neutral-400 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setNotifyStudyReminder(!notifyStudyReminder)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-left"
              >
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Lembrete no Fim de Semana</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">Convite leve para leitura livre com a família.</p>
                </div>
                {notifyStudyReminder ? (
                  <ToggleRight size={32} className="text-emerald-500 shrink-0" />
                ) : (
                  <ToggleLeft size={32} className="text-neutral-400 shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 relative">
        <button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-2xl hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          Salvar Preferências <Sparkles size={18} />
        </button>
      </div>

      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100">
            <CheckCircle2 size={22} />
            <span className="font-bold text-sm">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
