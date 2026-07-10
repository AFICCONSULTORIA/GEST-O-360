import React from 'react';
import { 
  Settings, 
  Image as ImageIcon, 
  Sparkles, 
  Bell, 
  ToggleRight, 
  ToggleLeft,
  CheckCircle2
} from 'lucide-react';

interface StudentSettingsProps {
  studentData: {
    id: string;
    name: string;
    coins: number;
    xp: number;
    streakFreezes?: number;
    avatar: string;
    inventory: string[];
  };
  setStudentData: React.Dispatch<React.SetStateAction<any>>;
}

const DEFAULT_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBeX7sFEA5589G61M5FQ11ZaqQTn9qJl8GaZr8fJ9vsuXdf5QZS7_LgC20cJ9A41BBNK3FlojzVjTekLKe0deHUy5bMnT7kC2cCN-HK42t8CQzbwsyqMQ-ttR7WgzdKuLyvPu3SQufNi7uvpZtvGYf8qRCpwbAych_mkOo93c2tN_H7XEjqkUWJka1Bxehf7ZHJO0B4Kj5O2cMj06TyV5Rfc83rZ-1hiB_-q3kNFMyXheJsDDBw0c0Va1FKTmB2ctbmVr_A8NlOUH3v',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD67XhB0DJ40aaTrcWE9Iu_CcFYker9wsK8fJp4A7tzRdu9BapL31HGEWE1YNiLn0vGagwV83hToRXj61oJHwqa90jNR9WsRsmG3nfD2pkzQbohLj66VPCTSk5ZgEEIr7s-KDWO0w3dGS9shn0V2SiFXd5iEDWQqlK76AiiDEsS5dkMZO5pxzNAt30M4FdnuuDXFNVVg797dlHMBDUiIpllNfDj8CTg1sGQSelXwDbN03csF-YcHbv5tjK3HL8OvXoSpjanR_rgKewT',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDllRObvU5JxFTVh5peqsNKPqwOqP1l8lebIwbcOdWvzvHUyxWhDg43f0OcCFOnycftt_-hr-wNyLYuGKNAh6GHqpMby3k04-V7DZlITdVNLGB21dKL50vmm7l20NHjDpfO5mVgsqP9p8WskMxObv699qRM9aApARfS64JeVrxkhH7WIu9ioZMXSFXdgNd0A1K0Yd64IhHTrIQeSneQl-04iEuBW5ABmM_Va3_iVbWnsrdHQ1jMh8T7vzz8r_4inEwnTz4gQyLMte8j',
];

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

  const handleSave = () => {
    setToastMessage('Suas escolhas mágicas foram salvas!');
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Combinar avatares disponíveis
  const availableAvatars = [
    ...DEFAULT_AVATARS,
    ...(studentData.inventory || [])
      .filter(item => item.startsWith('avatar_'))
      .map(item => PREMIUM_AVATARS[item])
  ];

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
            Configurações Básicas
          </h3>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-sky-500 p-1 shadow-lg shadow-sky-500/20">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 bg-white dark:bg-neutral-800 flex items-center justify-center">
                  <img alt="Seu Avatar" src={studentData.avatar} className="w-full h-full object-cover" />
                </div>
              </div>
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
              Escolher Avatar
            </h3>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {availableAvatars.map((url, i) => (
                <div 
                  key={i}
                  onClick={() => setStudentData((prev: any) => ({ ...prev, avatar: url }))}
                  className={`relative cursor-pointer rounded-2xl overflow-hidden aspect-square border-4 transition-all hover:scale-105 ${studentData.avatar === url ? 'border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105' : 'border-transparent hover:border-emerald-200 dark:hover:border-emerald-900'}`}
                >
                  <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover bg-white" />
                  {studentData.avatar === url && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-neutral-500 text-center mt-2">Você pode desbloquear mais avatares na Loja de Recompensas!</p>
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
