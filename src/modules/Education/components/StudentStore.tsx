import React, { useState } from 'react';
import { Store, Coins, Snowflake, User, AlertCircle, CheckCircle2, Check } from 'lucide-react';
import { spendCoins } from '../../../lib/api/education';

interface StudentStoreProps {
  studentData: {
    id?: string;
    coins: number;
    avatar?: string;
    inventory: string[];
    streakFreezes: number;
  };
  setStudentData: (data: any) => void;
}

const AVATAR_URLS: Record<string, string> = {
  avatar_ninja:
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23334155"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🥷</text></svg>',
  avatar_fox:
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f97316"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🦊</text></svg>',
  avatar_robot:
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230ea5e9"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🤖</text></svg>',
  avatar_dragon:
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e11d48"/><text y="50%" x="50%" dominant-baseline="central" text-anchor="middle" font-size="60">🐲</text></svg>'
};

const AVATARS = [
  { id: 'avatar_ninja', name: 'Ninja Sombrio', price: 300, icon: '🥷', bgClass: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'avatar_fox', name: 'Raposa Astuta', price: 500, icon: '🦊', bgClass: 'bg-orange-50 dark:bg-orange-500/15' },
  { id: 'avatar_robot', name: 'Robô do Futuro', price: 800, icon: '🤖', bgClass: 'bg-sky-50 dark:bg-sky-500/15' },
  { id: 'avatar_dragon', name: 'Dragão Lendário', price: 1500, icon: '🐲', bgClass: 'bg-rose-50 dark:bg-rose-500/15' }
];

export const StudentStore: React.FC<StudentStoreProps> = ({
  studentData,
  setStudentData,
}) => {
  const [toastMessage, setToastMessage] = useState<{ title: string; type: 'success' | 'error' } | null>(null);

  const showToast = (title: string, type: 'success' | 'error') => {
    setToastMessage({ title, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBuyAvatar = async (id: string, price: number) => {
    if (studentData.inventory.includes(id)) {
      showToast('Você já possui este avatar!', 'error');
      return;
    }
    if (studentData.coins < price) {
      showToast('Complete mais atividades para juntar moedas suficientes!', 'error');
      return;
    }

    const avatarUrl = AVATAR_URLS[id] || '';
    setStudentData((prev: any) => ({
      ...prev,
      coins: prev.coins - price,
      inventory: [...prev.inventory, id],
      avatar: avatarUrl || prev.avatar
    }));

    if (studentData.id) {
      await spendCoins(studentData.id, price);
    }

    showToast('Avatar desbloqueado e equipado no seu perfil!', 'success');
  };

  const handleEquipAvatar = (id: string) => {
    const avatarUrl = AVATAR_URLS[id];
    if (!avatarUrl) return;
    setStudentData((prev: any) => ({
      ...prev,
      avatar: avatarUrl
    }));
    showToast('Avatar equipado com sucesso!', 'success');
  };

  const handleBuyFreeze = async (price: number) => {
    if (studentData.coins < price) {
      showToast('Moedas insuficientes!', 'error');
      return;
    }

    setStudentData((prev: any) => ({
      ...prev,
      coins: prev.coins - price,
      streakFreezes: prev.streakFreezes + 1
    }));

    if (studentData.id) {
      await spendCoins(studentData.id, price);
    }

    showToast('Escudo de Sequência adquirido!', 'success');
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full pb-28 md:pb-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
            <Store className="text-amber-500" size={32} />
            Loja de Recompensas
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium mt-1">
            Troque as moedas conquistadas nas aulas por avatares e itens especiais!
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 rounded-2xl border border-amber-200 dark:border-amber-500/20 shadow-sm shrink-0 self-start md:self-auto">
          <Coins className="text-amber-500" size={24} />
          <span className="font-black text-amber-600 dark:text-amber-400 text-xl">
            {studentData.coins.toLocaleString('pt-BR')} moedas
          </span>
        </div>
      </div>

      <div className="space-y-12">
        {/* Avatars Section */}
        <section>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="text-indigo-500" size={24} />
            Avatares Divertidos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AVATARS.map((avatar) => {
              const hasItem = studentData.inventory.includes(avatar.id);
              const isEquipped = studentData.avatar === AVATAR_URLS[avatar.id];
              const canAfford = studentData.coins >= avatar.price;

              return (
                <div
                  key={avatar.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[24px] p-5 flex flex-col items-center text-center shadow-sm relative overflow-hidden group"
                >
                  <div
                    className={`w-20 h-20 rounded-full ${avatar.bgClass} flex items-center justify-center text-4xl mb-4 shadow-inner group-hover:scale-110 transition-transform`}
                  >
                    {avatar.icon}
                  </div>
                  <h4 className="font-black text-neutral-900 dark:text-white mb-2">{avatar.name}</h4>

                  <div className="mt-auto pt-4 w-full">
                    {hasItem ? (
                      isEquipped ? (
                        <button
                          disabled
                          className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Check size={16} strokeWidth={3} /> Em Uso
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEquipAvatar(avatar.id)}
                          className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 font-black rounded-xl transition-colors cursor-pointer"
                        >
                          Equipar Agora
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleBuyAvatar(avatar.id, avatar.price)}
                        className={`w-full py-2.5 rounded-xl font-black flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                          canAfford
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-300 cursor-pointer'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-75'
                        }`}
                      >
                        <Coins size={16} /> {avatar.price}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Powerups Section */}
        <section>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Snowflake className="text-sky-500" size={24} />
            Proteção de Sequência
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-sky-50 to-white dark:from-sky-900/20 dark:to-neutral-900 border border-sky-100 dark:border-sky-500/20 rounded-[24px] p-6 flex items-center gap-6 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm shrink-0">
                <Snowflake size={26} className="text-sky-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-neutral-900 dark:text-white text-lg">Escudo de Sequência Diária</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-3">
                  Protege seus dias seguidos de estudo por 1 dia caso você não consiga entrar.
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs text-neutral-500">
                    Escudos ativos: <strong>{studentData.streakFreezes}</strong>
                  </span>
                  <button
                    onClick={() => handleBuyFreeze(200)}
                    className={`px-4 py-2 rounded-xl font-black flex items-center justify-center gap-1.5 transition-transform active:scale-95 ml-auto ${
                      studentData.coins >= 200
                        ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md cursor-pointer'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                    }`}
                  >
                    <Coins size={14} /> 200
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Toast Notifier */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100'
                : 'bg-rose-50 dark:bg-rose-900/90 border-rose-200 dark:border-rose-700 text-rose-800 dark:text-rose-100'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{toastMessage.title}</span>
          </div>
        </div>
      )}
    </div>
  );
};
