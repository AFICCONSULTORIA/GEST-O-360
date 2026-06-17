import React from 'react';
import { motion } from 'motion/react';
import { Home, Users, Lock, EyeOff, Eye, ChevronRight } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { getSubdomain } from '../lib/subdomain';
import { Institution } from '../types';
import { LogoCompass } from './LogoCompass';

export const Login = ({ onLogin, onDemoLogin, darkMode, currentInstitution, isSaaSAdmin = false }: { onLogin: () => void, onDemoLogin?: () => void, darkMode: boolean, currentInstitution?: Institution | null, isSaaSAdmin?: boolean }) => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (signInError) {
        console.error("Erro no login:", signInError.message);
        setError(true);
      } else if (data.session) {
        onLogin();
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-[100dvh] bg-[#F9F9F8] dark:bg-neutral-950 grid place-items-center p-4 py-8 transition-colors overflow-y-auto overflow-x-hidden">
      {/* Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${darkMode ? 'bg-sky-900/20' : 'bg-sky-100/50'} rounded-full blur-3xl animate-pulse`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-100/50'} rounded-full blur-3xl animate-pulse delay-1000`} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[32px] sm:rounded-[48px] p-8 sm:p-12 shadow-2xl shadow-neutral-200/50 dark:shadow-neutral-950/50 border border-neutral-100 dark:border-neutral-800 relative z-10 my-auto"
      >
        {!isSaaSAdmin && (
          <a
            href="/"
            className="absolute top-6 right-6 p-2.5 rounded-xl transition-all text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
            title="Voltar à Página Inicial"
          >
            <Home size={18} />
          </a>
        )}
        <div className="text-center space-y-4 mb-10">
          <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white p-3 rounded-[1.25rem] shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] border border-neutral-100 dark:border-neutral-800 flex items-center justify-center mx-auto w-20 h-20 transition-all hover:scale-110 duration-500">
            <LogoCompass size={44} />
          </div>
          <div>
            {isSaaSAdmin ? (
              <>
                <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight mt-2">Central SaaS</h1>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-widest mt-1">Controle Geral de Prefeituras</p>
              </>
            ) : currentInstitution ? (
              <>
                <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight mt-2">{currentInstitution.name}</h1>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mt-1">Painel Administrativo Oficial</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic mt-2">Gestão <span className="text-neutral-400 font-normal">360</span></h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest mt-1">Sistemas de Compliance & Protocolo</p>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Usuário</label>
            <div className="relative">
              <Users className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={18} />
              <input 
                type="email" 
                placeholder="seu@email.com"
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 px-14 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 focus:border-neutral-900 dark:focus:border-white outline-none transition-all font-bold text-neutral-900 dark:text-white"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" size={18} />
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 px-14 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 focus:border-neutral-900 dark:focus:border-white outline-none transition-all font-bold text-neutral-900 dark:text-white"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-bold text-rose-500 uppercase tracking-widest text-center"
            >
              Credenciais inválidas. Verifique os dados.
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-xl shadow-neutral-900/20 dark:shadow-neutral-950/20 flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 dark:border-neutral-900/30 border-t-white dark:border-t-neutral-900 rounded-full animate-spin" />
            ) : (
              <>
                Acessar Painel
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {onDemoLogin && getSubdomain() === 'demo' && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onDemoLogin}
              className="w-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-4 rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm"
            >
              Acesso de Demonstração (Entrar sem Senha)
            </button>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-neutral-50 dark:border-neutral-800 space-y-4">

          <p className="text-[10px] text-neutral-400 font-bold text-center uppercase tracking-widest">
            Acesso Restrito ao Setor de Controladoria
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
