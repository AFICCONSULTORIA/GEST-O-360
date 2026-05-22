import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, Calendar, CheckCircle2, AlertTriangle, FileText, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const COMMON_SPECIALTIES = [
  'Clínico Geral',
  'Pediatria',
  'Ginecologia',
  'Odontologia',
  'Fisioterapia',
  'Ortopedia',
  'Psicologia',
  'Enfermagem'
];

const formatCPF = (value: string) => {
  let v = value.replace(/\D/g, '').substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1-$2');
  return v;
};

const formatSUS = (value: string) => {
  let v = value.replace(/\D/g, '').substring(0, 15);
  v = v.replace(/(\d{3})(\d)/, '$1 $2');
  v = v.replace(/(\d{4})(\d)/, '$1 $2');
  v = v.replace(/(\d{4})(\d)/, '$1 $2');
  return v;
};

export const PublicSaudePortal = ({ darkMode }: { darkMode: boolean }) => {
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_cpf: '',
    patient_sus: '',
    patient_birth_date: '',
    is_pregnant: false,
    specialty: COMMON_SPECIALTIES[0],
    appointment_date: new Date().toISOString().split('T')[0],
    referral_details: '',
    has_referral: false,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const { has_referral, referral_details, ...restFormData } = formData;
    const newAppointment = {
      id: Math.random().toString(36).substring(2, 10),
      ...restFormData,
      referral_details: restFormData.specialty === 'Clínico Geral' ? null : referral_details,
      is_urgent: false,
      status: 'Agendado'
    };

    const { error: dbError } = await supabase.from('appointments').insert(newAppointment);

    if (dbError) {
      setError('Ocorreu um erro ao agendar sua consulta. Tente novamente mais tarde.');
      console.error(dbError);
    } else {
      setSuccess(true);
    }
    setIsSubmitting(false);
  };

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-full max-w-lg p-10 rounded-3xl text-center shadow-xl ${darkMode ? 'bg-neutral-900' : 'bg-white'}`}
        >
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-4">Agendamento Confirmado!</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">
            Sua solicitação para a especialidade de <strong className="text-emerald-600 dark:text-emerald-400">{formData.specialty}</strong> foi registrada com sucesso e encaminhada para a fila de regulação. Aguarde o contato da unidade de saúde ou acompanhe pelo aplicativo.
          </p>
          <button 
            onClick={() => {
              setSuccess(false);
              setFormData({...formData, patient_name: '', patient_cpf: '', patient_sus: '', notes: ''});
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30"
          >
            Fazer novo agendamento
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-12 px-4 flex flex-col items-center font-sans ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* Banner de Urgência */}
      <div className="w-full max-w-3xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-2xl p-4 mb-8 flex items-start gap-4 shadow-sm">
        <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={24} />
        <div>
          <h4 className="font-bold text-rose-800 dark:text-rose-300 text-sm">Este sistema é destinado apenas para agendamentos eletivos.</h4>
          <p className="text-sm text-rose-700/80 dark:text-rose-400/80 mt-1">Em casos de urgência ou emergência, não utilize este portal. Procure imediatamente a Unidade de Saúde mais próxima ou o Hospital Municipal.</p>
        </div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden ${darkMode ? 'bg-neutral-900' : 'bg-white'}`}
      >
        <div className="bg-emerald-600 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <HeartPulse size={48} className="mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Portal da Saúde</h1>
          <p className="text-emerald-100 font-medium">Agende sua consulta sem sair de casa</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm font-bold">
              <XCircle size={20} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-2">Nome Completo *</label>
              <input 
                type="text" required
                value={formData.patient_name} onChange={e => setFormData({...formData, patient_name: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-base focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all dark:text-white"
                placeholder="Ex: João da Silva Santos"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-2">CPF *</label>
              <input 
                type="text" required
                value={formData.patient_cpf} onChange={e => setFormData({...formData, patient_cpf: formatCPF(e.target.value)})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-base focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all dark:text-white font-mono"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-2">Cartão do SUS *</label>
              <input 
                type="text" required
                value={formData.patient_sus} onChange={e => setFormData({...formData, patient_sus: formatSUS(e.target.value)})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-base focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all dark:text-white font-mono"
                placeholder="000 0000 0000 0000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-2">Data de Nascimento *</label>
              <input 
                type="date" required
                value={formData.patient_birth_date} onChange={e => setFormData({...formData, patient_birth_date: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-base focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all dark:text-white"
              />
            </div>

            <div className="space-y-2 flex items-end pb-2">
              <label className="flex items-center gap-3 cursor-pointer group bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 w-full transition-colors hover:border-emerald-500">
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                  formData.is_pregnant 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600'
                }`}>
                  {formData.is_pregnant && <CheckCircle2 size={16} />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={formData.is_pregnant}
                  onChange={(e) => setFormData({...formData, is_pregnant: e.target.checked})}
                />
                <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                  A paciente é gestante?
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-2">Especialidade Desejada *</label>
              <select 
                required
                value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-base focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all dark:text-white"
              >
                {COMMON_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {formData.specialty !== 'Clínico Geral' && (
              <div className="col-span-1 md:col-span-2 space-y-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Encaminhamento Obrigatório</h4>
                    <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">
                      Para agendar consultas com especialistas, é necessário possuir um encaminhamento prévio fornecido pelo Clínico Geral.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group mt-4">
                  <div className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                    formData.has_referral 
                      ? 'bg-amber-500 border-amber-500 text-white' 
                      : 'bg-white dark:bg-neutral-900 border-amber-300 dark:border-amber-700'
                  }`}>
                    {formData.has_referral && <CheckCircle2 size={16} />}
                  </div>
                  <input 
                    type="checkbox" 
                    required
                    className="hidden"
                    checked={formData.has_referral}
                    onChange={(e) => setFormData({...formData, has_referral: e.target.checked})}
                  />
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Declaro que possuo o encaminhamento original em mãos e o apresentarei no dia da consulta. *
                  </span>
                </label>

                <div className="space-y-2 mt-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-amber-800/70 dark:text-amber-500 ml-2">Médico Solicitante / CRM / Nº da Guia *</label>
                  <input 
                    type="text" required
                    value={formData.referral_details} onChange={e => setFormData({...formData, referral_details: e.target.value})}
                    className="w-full bg-white dark:bg-neutral-950 border border-amber-200 dark:border-amber-800 px-6 py-4 rounded-2xl text-base focus:ring-4 focus:ring-amber-500/20 outline-none transition-all dark:text-white"
                    placeholder="Ex: Dr. Carlos (Clínico Geral) CRM: 12345"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 ml-2">Sintomas ou Motivo da Consulta (Opcional)</label>
              <textarea 
                rows={4}
                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 py-4 rounded-2xl text-base focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all resize-none dark:text-white"
                placeholder="Descreva brevemente o que está sentindo ou o motivo do agendamento..."
              />
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isSubmitting ? 'Enviando Agendamento...' : <><Calendar size={24} /> Confirmar Agendamento</>}
            </button>
            <p className="text-center text-xs text-neutral-400 mt-4">
              Ao agendar, você concorda com os termos de triagem da Secretaria Municipal de Saúde.
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
