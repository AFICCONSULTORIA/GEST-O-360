import React from 'react';
import { 
  Settings, 
  Image as ImageIcon, 
  Sparkles, 
  Bell, 
  ToggleRight, 
  ToggleLeft
} from 'lucide-react';

interface StudentSettingsProps {
  studentData: {
    id: string;
    name: string;
    coins: number;
    xp: number;
    streakFreezes?: number;
  };
  setStudentData: React.Dispatch<React.SetStateAction<any>>;
}

export const StudentSettings: React.FC<StudentSettingsProps> = ({
  studentData,
  setStudentData,
}) => {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
          <Settings className="text-emerald-500" size={32} />
          Meu Perfil e Opções
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">Personalize sua experiência no Gestão 360 Educação e deixe tudo com a sua cara!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Meu Perfil Mágico */}
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
          <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="text-sky-500" size={24} />
            Avatar e Perfil
          </h3>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-sky-500 p-1 shadow-lg shadow-sky-500/20">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 bg-white dark:bg-neutral-800 flex items-center justify-center">
                  <img alt="Seu Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeX7sFEA5589G61M5FQ11ZaqQTn9qJl8GaZr8fJ9vsuXdf5QZS7_LgC20cJ9A41BBNK3FlojzVjTekLKe0deHUy5bMnT7kC2cCN-HK42t8CQzbwsyqMQ-ttR7WgzdKuLyvPu3SQufNi7uvpZtvGYf8qRCpwbAych_mkOo93c2tN_H7XEjqkUWJka1Bxehf7ZHJO0B4Kj5O2cMj06TyV5Rfc83rZ-1hiB_-q3kNFMyXheJsDDBw0c0Va1FKTmB2ctbmVr_A8NlOUH3v" className="w-full h-full object-cover" />
                </div>
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900 hover:scale-110 transition-transform cursor-pointer">
                <ImageIcon size={14} />
              </button>
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
          {/* Loja Mágica */}
          <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 md:p-8 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Sparkles className="text-yellow-500" size={24} />
                Loja Mágica
              </h3>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-3 py-1 rounded-full flex items-center gap-1 font-bold text-sm">
                <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-yellow-900">🪙</div>
                {studentData.coins}
              </div>
            </div>

            <div className="space-y-4">
              {/* Item: Congelador de Ofensivas */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 pointer-events-none opacity-20">
                  <Sparkles size={40} className="text-blue-300" />
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-inner border-2 border-blue-300">
                    🧊
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Congelador</h4>
                    <p className="text-[10px] text-neutral-500">Mantém ofensiva por 1 dia inativo.</p>
                    {studentData.streakFreezes ? (
                      <p className="text-[10px] font-bold text-blue-500">Você tem {studentData.streakFreezes} em estoque!</p>
                    ) : null}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (studentData.coins >= 200) {
                      const stored = localStorage.getItem(`edu_activity_${studentData.id}`);
                      if (stored) {
                        const parsed = JSON.parse(stored);
                        parsed.freezes = (parsed.freezes || 0) + 1;
                        localStorage.setItem(`edu_activity_${studentData.id}`, JSON.stringify(parsed));
                      }
                      setStudentData((prev: any) => ({
                        ...prev, 
                        coins: prev.coins - 200, 
                        streakFreezes: (prev.streakFreezes || 0) + 1
                      }));
                    }
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1 cursor-pointer relative z-10 ${studentData.coins >= 200 ? 'bg-yellow-400 text-yellow-950 hover:bg-yellow-500 hover:scale-105 shadow-sm active:scale-95' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                >
                  200 🪙
                </button>
              </div>

              {/* Item 1: Avatar Robô */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl shadow-inner">
                    🤖
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Avatar Robô</h4>
                    <p className="text-[10px] text-neutral-500">Mude seu visual.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (studentData.coins >= 500) {
                      setStudentData((prev: any) => ({...prev, coins: prev.coins - 500}));
                    }
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1 cursor-pointer ${studentData.coins >= 500 ? 'bg-yellow-400 text-yellow-950 hover:bg-yellow-500 hover:scale-105 shadow-sm active:scale-95' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                >
                  500 🪙
                </button>
              </div>

              {/* Item 2: Tema Sombrio */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shadow-inner">
                    🌌
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Tema Galáxia</h4>
                    <p className="text-[10px] text-neutral-500">Aventura noturna.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (studentData.coins >= 1000) {
                      setStudentData((prev: any) => ({...prev, coins: prev.coins - 1000}));
                    }
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1 cursor-pointer ${studentData.coins >= 1000 ? 'bg-yellow-400 text-yellow-950 hover:bg-yellow-500 hover:scale-105 shadow-sm active:scale-95' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                >
                  1000 🪙
                </button>
              </div>

              {/* Item 3: Ícone Dourado */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl shadow-inner border-2 border-amber-400">
                    👑
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white text-sm">Borda Ouro</h4>
                    <p className="text-[10px] text-neutral-500">Destaque no rank.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (studentData.coins >= 1500) {
                      setStudentData((prev: any) => ({...prev, coins: prev.coins - 1500}));
                    }
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1 cursor-pointer ${studentData.coins >= 1500 ? 'bg-yellow-400 text-yellow-950 hover:bg-yellow-500 hover:scale-105 shadow-sm active:scale-95' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                >
                  1500 🪙
                </button>
              </div>
            </div>
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
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <button className="bg-emerald-600 text-white font-bold px-8 py-4 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer">
          Salvar Minhas Escolhas <Sparkles size={18} />
        </button>
      </div>
    </div>
  );
};
