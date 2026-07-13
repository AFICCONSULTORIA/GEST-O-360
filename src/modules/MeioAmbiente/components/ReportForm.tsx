import React, { useState } from 'react';
import { Camera, MapPin, AlertCircle, Send, FileText, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReportFormProps {
  onSubmit: (data: any) => Promise<void>;
}

export const ReportForm = ({ onSubmit }: ReportFormProps) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    location: '',
    referencePoint: '',
    isAnonymous: true,
    reporterName: '',
    reporterContact: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 p-8 rounded-[32px] text-center"
      >
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="text-2xl font-black tracking-tight text-emerald-900 dark:text-emerald-100 mb-2">Denúncia Enviada!</h3>
        <p className="text-emerald-700 dark:text-emerald-300 mb-8 max-w-md mx-auto">
          Sua denúncia foi registrada com sucesso e encaminhada para a equipe de fiscalização ambiental. Agradecemos sua colaboração em proteger nossa cidade.
        </p>
        <button 
          onClick={() => {
            setSuccess(false);
            setStep(1);
            setFormData({
              description: '',
              location: '',
              referencePoint: '',
              isAnonymous: true,
              reporterName: '',
              reporterContact: '',
            });
          }}
          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-500/30"
        >
          Fazer Nova Denúncia
        </button>
      </motion.div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 p-8 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-xl shadow-neutral-900/5">
      <div className="mb-8">
        <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mb-2">Registrar Denúncia</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Preencha os dados abaixo. Quanto mais detalhes você fornecer, mais rápida será a ação da fiscalização.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-neutral-100 dark:bg-neutral-800'}`} />
        <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-neutral-100 dark:bg-neutral-800'}`} />
      </div>

      <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); setStep(2); }} className="space-y-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">O que está acontecendo? *</label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 text-neutral-400" size={18} />
                <textarea 
                  required
                  rows={4}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-12 pr-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white resize-none"
                  placeholder="Descreva a situação com o máximo de detalhes (ex: fumaça escura, queima de lixo, tamanho aproximado do foco)..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Localização *</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input 
                  required
                  type="text"
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-12 pr-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                  placeholder="Rua, Bairro, CEP ou coordenadas"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Ponto de Referência (Opcional)</label>
              <input 
                type="text"
                value={formData.referencePoint} 
                onChange={e => setFormData({...formData, referencePoint: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                placeholder="Ex: Perto do mercado X, atrás da escola Y"
              />
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6">
               <h4 className="text-emerald-800 dark:text-emerald-400 font-bold mb-4 flex items-center gap-2">
                  <AlertCircle size={18} /> Você deseja se identificar?
               </h4>
               
               <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-900 border border-emerald-100 dark:border-emerald-900/30 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
                     <input 
                        type="radio" 
                        name="anonymous" 
                        checked={formData.isAnonymous} 
                        onChange={() => setFormData({...formData, isAnonymous: true})}
                        className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                     />
                     <div>
                        <p className="font-bold text-neutral-900 dark:text-white">Denúncia Anônima</p>
                        <p className="text-xs text-neutral-500">Seus dados não serão solicitados.</p>
                     </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-900 border border-emerald-100 dark:border-emerald-900/30 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
                     <input 
                        type="radio" 
                        name="anonymous" 
                        checked={!formData.isAnonymous} 
                        onChange={() => setFormData({...formData, isAnonymous: false})}
                        className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                     />
                     <div>
                        <p className="font-bold text-neutral-900 dark:text-white">Me Identificar</p>
                        <p className="text-xs text-neutral-500">Opcional. Ajudará caso precisemos de mais informações.</p>
                     </div>
                  </label>
               </div>
            </div>

            {!formData.isAnonymous && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                 <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Seu Nome (Opcional)</label>
                  <input 
                     type="text"
                     value={formData.reporterName} 
                     onChange={e => setFormData({...formData, reporterName: e.target.value})}
                     className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                     placeholder="Nome completo"
                  />
                 </div>
                 <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Telefone/WhatsApp (Opcional)</label>
                  <input 
                     type="text"
                     value={formData.reporterContact} 
                     onChange={e => setFormData({...formData, reporterContact: e.target.value})}
                     className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
                     placeholder="(00) 00000-0000"
                  />
                 </div>
              </motion.div>
            )}

            <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 border-dashed dark:border-neutral-700 rounded-2xl p-8 text-center hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors cursor-pointer">
               <Camera size={32} className="mx-auto text-neutral-400 mb-3" />
               <p className="text-sm font-bold text-neutral-900 dark:text-white">Adicionar Foto (Opcional)</p>
               <p className="text-xs text-neutral-500 mt-1">Clique para selecionar ou tire uma foto com seu celular</p>
               {/* Simulação de input de arquivo */}
               <input type="file" className="hidden" accept="image/*" />
            </div>
          </motion.div>
        )}

        <div className="flex gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          {step === 2 && (
            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="px-6 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Voltar
            </button>
          )}
          
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
          >
            {step === 1 ? 'Avançar' : (
               isSubmitting ? 'Enviando...' : <><Send size={18} /> Enviar Denúncia</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
