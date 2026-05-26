import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { ChevronRight, Wrench, Lightbulb, TreePine, Trash2, Truck, CheckCircle2, UserCircle, Phone, MapPin, AlignLeft, Info, Camera, Send, ArrowLeft, Home } from 'lucide-react';

type CategoriaDemanda = 'Iluminação' | 'Poda de Árvore' | 'Tapa buraco' | 'Remoção de Entulho' | 'Coleta de Lixo';

const CATEGORY_DATA: Record<CategoriaDemanda, { icon: any, desc: string, color: string, bg: string }> = {
  'Iluminação': { icon: Lightbulb, desc: 'Lâmpadas queimadas ou postes', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  'Poda de Árvore': { icon: TreePine, desc: 'Galhos em risco ou via pública', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  'Tapa buraco': { icon: Wrench, desc: 'Asfalto danificado na via', color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  'Remoção de Entulho': { icon: Truck, desc: 'Entulhos em locais irregulares', color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  'Coleta de Lixo': { icon: Trash2, desc: 'Atraso ou falha na coleta', color: 'text-sky-500 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-500/10' }
};

const LogoCompass = ({ size = 32, className = '' }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="compass-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#06B6D4" />
      </linearGradient>
      <linearGradient id="needle-gradient" x1="12" y1="6" x2="12" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#34D399" />
        <stop offset="1" stopColor="#22D3EE" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" stroke="url(#compass-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 4V5M12 19V20M4 12H5M19 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30" />
    <path d="M12 12L15 6L12 10.5V12Z" fill="url(#needle-gradient)" />
    <path d="M12 12L9 18L12 13.5V12Z" fill="currentColor" className="opacity-50" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

export function PublicServicosPortal({ darkMode }: { darkMode: boolean }) {
  const [step, setStep] = React.useState<'category' | 'details' | 'success'>('category');
  const [loading, setLoading] = React.useState(false);
  const [protocol, setProtocol] = React.useState('');

  const [formData, setFormData] = React.useState({
    categoria: '' as CategoriaDemanda | '',
    descricao: '',
    endereco: '',
    nome: '',
    telefone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'category') {
      if (!formData.categoria) return;
      setStep('details');
    } else if (step === 'details') {
      setLoading(true);
      
      const newProtocol = `SP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      try {
        const { error } = await supabase.from('servicos_publicos_demandas').insert({
          protocolo: newProtocol,
          categoria: formData.categoria,
          descricao: formData.descricao,
          endereco: formData.endereco,
          solicitante: formData.nome,
          telefone: formData.telefone,
          status: 'Aberto'
        });

        if (error) throw error;

        setProtocol(newProtocol);
        setStep('success');
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar solicitação. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className={`min-h-[100dvh] bg-[#F4F5F7] dark:bg-neutral-950 flex flex-col font-sans transition-colors relative overflow-hidden ${darkMode ? 'dark' : ''}`}>
      
      {/* Background Decorators */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-500/10 dark:bg-sky-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header Hero */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-white/20 dark:border-neutral-800/50 sticky top-0 z-40 shadow-sm"
        >
          <div className="max-w-xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                <LogoCompass size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none italic text-neutral-900 dark:text-white">Gestão <span className="font-normal opacity-50">360</span></h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">Portal do Cidadão</span>
              <a
                href="/"
                className="p-2.5 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-white shadow-sm hover:shadow-md transition-all"
                title="Voltar à Página Inicial"
              >
                <Home size={16} />
              </a>
            </div>
          </div>
        </motion.header>

        <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col pb-24">
          <AnimatePresence mode="wait">
            {step === 'category' && (
              <motion.div 
                key="category"
                initial={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col pt-4"
              >
                <div className="mb-8 space-y-3 flex flex-col items-center text-center">
                  <span className="inline-block px-4 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-neutral-900/20 dark:shadow-white/20">
                    Passo 1 de 2
                  </span>
                  <h2 className="text-4xl font-black text-neutral-900 dark:text-white leading-tight tracking-tight">
                    Como podemos<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-500">
                      ajudar seu bairro?
                    </span>
                  </h2>
                  <p className="text-neutral-500 dark:text-neutral-400 text-base">
                    Selecione o tipo de serviço público que você deseja solicitar.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 flex-1">
                  {(Object.keys(CATEGORY_DATA) as CategoriaDemanda[]).map((cat, index) => {
                    const data = CATEGORY_DATA[cat];
                    const Icon = data.icon;
                    const isSelected = formData.categoria === cat;
                    return (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, categoria: cat })}
                        className={`group w-full flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all text-left overflow-hidden relative ${
                          isSelected 
                            ? 'border-emerald-500 bg-white dark:bg-neutral-900 shadow-xl shadow-emerald-500/10' 
                            : 'border-transparent bg-white/60 dark:bg-neutral-900/60 hover:bg-white dark:hover:bg-neutral-900 shadow-sm hover:shadow-md backdrop-blur-md'
                        }`}
                      >
                        {isSelected && (
                          <motion.div layoutId="selection-bg" className="absolute inset-0 bg-emerald-50 dark:bg-emerald-500/5" />
                        )}
                        <div className={`relative p-3 rounded-2xl transition-colors ${isSelected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : `${data.bg} ${data.color} group-hover:scale-110 transition-transform`}`}>
                          <Icon size={24} strokeWidth={2.5} />
                        </div>
                        <div className="relative flex-1">
                          <div className={`font-black text-lg transition-colors ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                            {cat}
                          </div>
                          <div className={`text-xs mt-0.5 font-medium transition-colors ${isSelected ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {data.desc}
                          </div>
                        </div>
                        <div className="relative">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-300 dark:border-neutral-700'
                          }`}>
                            {isSelected && <CheckCircle2 size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-8 sticky bottom-6">
                  <motion.button
                    whileHover={formData.categoria ? { scale: 1.02 } : {}}
                    whileTap={formData.categoria ? { scale: 0.98 } : {}}
                    onClick={handleSubmit}
                    disabled={!formData.categoria}
                    className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-2xl shadow-neutral-900/20 dark:shadow-white/20"
                  >
                    Próxima Etapa
                    <ChevronRight size={18} strokeWidth={3} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 'details' && (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: 30, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col pt-4"
              >
                <div className="mb-6 flex items-start gap-4">
                  <button 
                    onClick={() => setStep('category')} 
                    className="p-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white shadow-sm hover:shadow-md transition-all mt-1"
                  >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                  </button>
                  <div>
                    <span className="inline-block px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest rounded-full mb-3">
                      Passo 2 de 2
                    </span>
                    <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight">
                      Detalhes do Problema
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Solicitando {formData.categoria}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 flex-1 mt-4">
                  
                  {/* Glassmorphism Card for Location & Desc */}
                  <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white dark:border-neutral-800 p-5 rounded-[32px] shadow-sm space-y-5">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-2">Endereço Exato</label>
                      <div className="relative group">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input 
                          type="text" required
                          placeholder="Ex: Rua das Flores, 123 - Centro"
                          value={formData.endereco}
                          onChange={e => setFormData({...formData, endereco: e.target.value})}
                          className="w-full pl-14 pr-5 py-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-[15px] font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all dark:text-white placeholder:text-neutral-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-2">Descrição da Situação</label>
                      <div className="relative group">
                        <AlignLeft className="absolute left-5 top-5 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <textarea 
                          required rows={4}
                          placeholder="Explique com detalhes o que está acontecendo..."
                          value={formData.descricao}
                          onChange={e => setFormData({...formData, descricao: e.target.value})}
                          className="w-full pl-14 pr-5 py-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-[15px] font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all resize-none dark:text-white placeholder:text-neutral-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Glassmorphism Card for Personal Info */}
                  <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white dark:border-neutral-800 p-5 rounded-[32px] shadow-sm space-y-5">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-2">Seu Nome</label>
                      <div className="relative group">
                        <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input 
                          type="text" required
                          placeholder="Nome completo"
                          value={formData.nome}
                          onChange={e => setFormData({...formData, nome: e.target.value})}
                          className="w-full pl-14 pr-5 py-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-[15px] font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all dark:text-white placeholder:text-neutral-400"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 ml-2">Celular (WhatsApp)</label>
                      <div className="relative group">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <input 
                          type="tel" required
                          placeholder="(00) 90000-0000"
                          value={formData.telefone}
                          onChange={e => setFormData({...formData, telefone: e.target.value})}
                          className="w-full pl-14 pr-5 py-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-[15px] font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all dark:text-white placeholder:text-neutral-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-sky-50 dark:bg-sky-500/5 border border-sky-100 dark:border-sky-500/10 p-5 rounded-3xl flex gap-4 mt-2">
                    <div className="bg-sky-100 dark:bg-sky-500/20 p-2 rounded-xl h-fit shrink-0">
                      <Info className="text-sky-600 dark:text-sky-400" size={20} />
                    </div>
                    <p className="text-[13px] text-sky-800 dark:text-sky-300 font-medium leading-relaxed">
                      Seus dados são confidenciais e serão usados <strong className="font-bold">apenas</strong> para atualizar você sobre o andamento do pedido.
                    </p>
                  </div>

                  <div className="mt-8 sticky bottom-6 pb-6">
                    <motion.button
                      whileHover={!loading ? { scale: 1.02 } : {}}
                      whileTap={!loading ? { scale: 0.98 } : {}}
                      type="submit"
                      disabled={loading || !formData.endereco || !formData.descricao || !formData.nome || !formData.telefone}
                      className="w-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-sm disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          Confirmar Solicitação
                          <Send size={18} />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                  className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30"
                >
                  <CheckCircle2 size={56} strokeWidth={2.5} />
                </motion.div>
                
                <h2 className="text-4xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight">Tudo Certo!</h2>
                <p className="text-base text-neutral-500 dark:text-neutral-400 mb-10 max-w-sm">
                  Sua solicitação de <strong className="text-neutral-900 dark:text-white">{formData.categoria}</strong> foi registrada e encaminhada para a equipe responsável.
                </p>

                <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white dark:border-neutral-800 p-8 rounded-[32px] w-full mb-10 shadow-xl shadow-neutral-900/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-[100px] -z-10" />
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] mb-2">Seu Protocolo</p>
                  <p className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-500 tracking-widest">{protocol}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4 font-medium bg-neutral-50 dark:bg-neutral-950/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    Anote ou tire print deste número para acompanhar o chamado.
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setFormData({ categoria: '', descricao: '', endereco: '', nome: '', telefone: '' });
                    setStep('category');
                  }}
                  className="px-8 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all shadow-sm"
                >
                  Fazer Nova Solicitação
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
