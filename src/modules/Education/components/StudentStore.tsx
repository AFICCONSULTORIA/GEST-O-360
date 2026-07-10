import React, { useState } from 'react';
import { Store, Coins, Snowflake, User, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StudentStoreProps {
  studentData: {
    coins: number;
    inventory: string[];
    streakFreezes: number;
  };
  setStudentData: (data: any) => void;
}

export const StudentStore: React.FC<StudentStoreProps> = ({
  studentData,
  setStudentData,
}) => {
  const [toastMessage, setToastMessage] = useState<{title: string, type: 'success' | 'error'} | null>(null);

  const showToast = (title: string, type: 'success' | 'error') => {
    setToastMessage({ title, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const AVATARS = [
    { id: 'avatar_ninja', name: 'Ninja Sombrio', price: 300, icon: '🥷', color: 'slate' },
    { id: 'avatar_fox', name: 'Raposa Astuta', price: 500, icon: '🦊', color: 'orange' },
    { id: 'avatar_robot', name: 'Robô do Futuro', price: 800, icon: '🤖', color: 'sky' },
    { id: 'avatar_dragon', name: 'Dragão Lendário', price: 1500, icon: '🐲', color: 'rose' }
  ];

  const POWERUPS = [
    { id: 'power_freeze', name: 'Congelador de Ofensiva', desc: 'Proteja sua sequência por 1 dia se você esquecer de estudar.', price: 200, icon: <Snowflake size={24} className="text-sky-500" /> }
  ];

  const handleBuyAvatar = (id: string, price: number) => {
    if (studentData.inventory.includes(id)) {
      showToast('Você já possui este avatar!', 'error');
      return;
    }
    if (studentData.coins < price) {
      showToast('Moedas insuficientes!', 'error');
      return;
    }

    setStudentData((prev: any) => ({
      ...prev,
      coins: prev.coins - price,
      inventory: [...prev.inventory, id]
    }));
    showToast('Avatar comprado com sucesso! Vá em configurações para equipar.', 'success');
  };

  const handleBuyFreeze = (price: number) => {
    if (studentData.coins < price) {
      showToast('Moedas insuficientes!', 'error');
      return;
    }

    setStudentData((prev: any) => ({
      ...prev,
      coins: prev.coins - price,
      streakFreezes: prev.streakFreezes + 1
    }));
    showToast('Congelador de Ofensiva adquirido!', 'success');
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
            <Store className="text-amber-500" size={32} />
            Loja de Recompensas
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium mt-1">Gaste suas moedas suadas em itens incríveis!</p>
        </div>
        
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 rounded-2xl border border-amber-200 dark:border-amber-500/20 shadow-sm shrink-0">
          <Coins className="text-amber-500" size={24} />
          <span className="font-black text-amber-600 dark:text-amber-400 text-xl">{studentData.coins.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div className="space-y-12">
        {/* Avatars Section */}
        <section>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="text-indigo-500" size={24} />
            Avatares Premium
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AVATARS.map(avatar => {
              const hasItem = studentData.inventory.includes(avatar.id);
              const canAfford = studentData.coins >= avatar.price;
              
              return (
                <div key={avatar.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[24px] p-5 flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
                  <div className={`w-20 h-20 rounded-full bg-${avatar.color}-50 dark:bg-${avatar.color}-500/10 flex items-center justify-center text-4xl mb-4 shadow-inner group-hover:scale-110 transition-transform`}>
                    {avatar.icon}
                  </div>
                  <h4 className="font-black text-neutral-900 dark:text-white mb-2">{avatar.name}</h4>
                  
                  <div className="mt-auto pt-4 w-full">
                    {hasItem ? (
                      <button disabled className="w-full py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 font-bold rounded-xl cursor-not-allowed">
                        Comprado
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBuyAvatar(avatar.id, avatar.price)}
                        className={`w-full py-2.5 rounded-xl font-black flex items-center justify-center gap-2 transition-transform active:scale-95 ${canAfford ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-400 cursor-pointer' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-70'}`}
                      >
                        <Coins size={16} /> {avatar.price}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Powerups Section */}
        <section>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Snowflake className="text-sky-500" size={24} />
            Power-ups
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POWERUPS.map(power => {
              const canAfford = studentData.coins >= power.price;
              
              return (
                <div key={power.id} className="bg-gradient-to-br from-sky-50 to-white dark:from-sky-900/20 dark:to-neutral-900 border border-sky-100 dark:border-sky-500/20 rounded-[24px] p-6 flex items-center gap-6 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm shrink-0">
                    {power.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-neutral-900 dark:text-white text-lg">{power.name}</h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-3">{power.desc}</p>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-neutral-400">Você tem: {studentData.streakFreezes}</span>
                      <button 
                        onClick={() => handleBuyFreeze(power.price)}
                        className={`px-4 py-2 rounded-xl font-black flex items-center justify-center gap-1.5 transition-transform active:scale-95 ml-auto ${canAfford ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md cursor-pointer' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'}`}
                      >
                        <Coins size={14} /> {power.price}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Toast Notifier */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border ${toastMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/80 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100' : 'bg-rose-50 dark:bg-rose-900/80 border-rose-200 dark:border-rose-700 text-rose-800 dark:text-rose-100'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{toastMessage.title}</span>
          </div>
        </div>
      )}

    </div>
  );
};
