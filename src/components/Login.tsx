import React from 'react';
import { motion } from 'motion/react';
import { Home, Users, Lock, EyeOff, Eye, ChevronRight, Sparkles, Shield, Sun, Moon } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { getSubdomain } from '../lib/subdomain';
import { Institution } from '../types';
import { LogoCompass } from './LogoCompass';

// Chapada dos Guimarães / Pantanal — Mato Grosso
const BG_IMAGE = 'https://images.unsplash.com/photo-1596706935833-28c0b2f90a59?q=80&w=1920&auto=format&fit=crop';
// Optimizations: w_1280 (resize), q_auto (auto quality), f_auto (auto format like webm), ac_none (remove audio)
const VIDEO_SOURCE = 'https://res.cloudinary.com/demo/video/upload/w_1280,q_auto,f_auto,ac_none/docs/waterfall.mp4';

export const Login = ({ onLogin, onDemoLogin, darkMode, setDarkMode, currentInstitution, isSaaSAdmin = false }: { onLogin: () => void, onDemoLogin?: () => void, darkMode: boolean, setDarkMode?: (v: boolean) => void, currentInstitution?: Institution | null, isSaaSAdmin?: boolean }) => {
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
    <div className="dark min-h-[100dvh] relative flex items-center justify-center overflow-x-hidden overflow-y-auto">

      {/* Backgrounds wrapper fixed to avoid scrolling with content */}
      <div className="fixed inset-0 z-0">
        {/* ── Background Fallback: Foto Full-Screen (Mato Grosso) ── */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: `url('${BG_IMAGE}')` }}
        />

        {/* ── Background: Vídeo Animado (Cachoeira) ── */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105 select-none pointer-events-none transition-opacity duration-1000"
        >
          <source src={VIDEO_SOURCE} type="video/mp4" />
        </video>

        {/* ── Overlay escuro gradiente (Muda no Claro/Escuro) ── */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-neutral-100/50 dark:from-black/60 dark:via-black/45 dark:to-neutral-950/60 transition-colors duration-500" />
      </div>

      {/* ── Partículas / efeitos decorativos ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[15%] left-[10%] w-64 h-64 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[8%] w-80 h-80 bg-indigo-500/20 dark:bg-indigo-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-[60%] left-[60%] w-48 h-48 bg-teal-500/15 dark:bg-teal-500/8 rounded-full blur-[60px] animate-pulse delay-500" />
      </div>

      {/* ── Logo no canto superior esquerdo ── */}
      <div className="absolute top-6 left-6 sm:left-8 flex items-center gap-3 z-20">
        <div className="p-1.5 bg-neutral-900/5 dark:bg-white/10 backdrop-blur-md border border-neutral-900/10 dark:border-white/20 rounded-xl flex items-center justify-center">
          <LogoCompass size={32} className="text-neutral-900 dark:text-white" />
        </div>
        <div>
          <span className="text-sm font-black text-neutral-900 dark:text-white tracking-tight uppercase">Gestão 360</span>
          <p className="text-[9px] text-neutral-500 dark:text-white/50 font-bold uppercase tracking-widest leading-none mt-0.5">Sistemas Públicos</p>
        </div>
      </div>

      {/* ── Botão Voltar (canto superior direito) ── */}
      {!isSaaSAdmin && (
        <a
          href="/"
          className="absolute top-6 right-6 sm:right-8 z-20 inline-flex items-center gap-2 px-3 py-2 sm:px-4 bg-neutral-900/5 dark:bg-white/10 hover:bg-neutral-900/10 dark:hover:bg-white/20 backdrop-blur-md border border-neutral-900/10 dark:border-white/20 text-neutral-700 dark:text-white/80 hover:text-neutral-900 dark:hover:text-white rounded-xl text-[10px] sm:text-xs font-bold transition-all"
        >
          <Home size={14} /> <span className="hidden sm:inline">Início</span>
        </a>
      )}

      {/* ── Card de Login (Glassmorphism Adaptável) ── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4 my-24 sm:my-12"
      >
        <div className="bg-white/70 dark:bg-neutral-950/70 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[24px] sm:rounded-[32px] shadow-[0_16px_40px_rgba(0,0,0,0.1)] sm:shadow-[0_32px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] dark:sm:shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden transition-colors duration-500">
          
          {/* Linha decorativa no topo */}
          <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

          <div className="px-6 pb-6 pt-6 sm:px-10 sm:pb-10 sm:pt-8 space-y-6 sm:space-y-7">

            {/* Cabeçalho do card */}
            <div className="text-center space-y-1">
              {isSaaSAdmin ? (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl mb-2 sm:mb-3">
                    <Shield size={24} className="text-purple-600 dark:text-purple-400 sm:w-7 sm:h-7" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Central SaaS</h1>
                  <p className="text-[9px] sm:text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Controle Geral de Prefeituras</p>
                </>
              ) : currentInstitution ? (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-2 sm:mb-3">
                    <LogoCompass size={36} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight px-2">{currentInstitution.name}</h1>
                  <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Painel Administrativo Oficial</p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-neutral-900/5 dark:bg-white/5 border border-neutral-900/10 dark:border-white/10 rounded-2xl mb-2 sm:mb-3">
                    <LogoCompass size={36} className="text-neutral-900 dark:text-white" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Bem-vindo de volta</h1>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-white/50 font-medium">Entre com suas credenciais para acessar o sistema</p>
                </>
              )}
            </div>

            {/* ── Formulário ── */}
            <form onSubmit={handleLogin} className="space-y-4">

              {/* Campo E-mail */}
              <div className="space-y-1.5">
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-white/40 ml-1">E-mail</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/30" size={16} />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className="w-full bg-neutral-900/5 dark:bg-white/5 hover:bg-neutral-900/10 dark:hover:bg-white/8 border border-neutral-900/10 dark:border-white/10 focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10 px-11 py-3 sm:px-12 sm:py-3.5 rounded-xl sm:rounded-2xl text-[13px] sm:text-sm outline-none transition-all font-medium text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/25"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-white/40">Senha</label>
                  <span className="text-[9px] sm:text-[10px] text-neutral-400 dark:text-white/30 font-medium cursor-pointer hover:text-emerald-600 dark:hover:text-white/60 transition-colors">Esqueceu a senha?</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/30" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-neutral-900/5 dark:bg-white/5 hover:bg-neutral-900/10 dark:hover:bg-white/8 border border-neutral-900/10 dark:border-white/10 focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10 px-11 py-3 sm:px-12 sm:py-3.5 rounded-xl sm:rounded-2xl text-[13px] sm:text-sm outline-none transition-all font-medium text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/25"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/30 hover:text-neutral-700 dark:hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Mensagem de erro */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest text-center"
                >
                  Credenciais inválidas. Verifique os dados.
                </motion.p>
              )}

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] text-[11px] sm:text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_8px_32px_rgba(16,185,129,0.25)] dark:shadow-[0_8px_32px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.4)] dark:hover:shadow-[0_8px_40px_rgba(16,185,129,0.55)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Acessar o Sistema
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform sm:w-[18px] sm:h-[18px]" />
                  </>
                )}
              </button>
            </form>

            {/* ── Caixinha "Cara Nova" ── */}
            <div className="flex items-start gap-3 p-3.5 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl sm:rounded-2xl backdrop-blur-sm">
              <div className="shrink-0 mt-0.5 p-1.5 bg-emerald-500/20 rounded-lg">
                <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-black text-emerald-700 dark:text-emerald-300">Estamos de cara nova!</p>
                <p className="text-[10px] sm:text-[11px] text-neutral-600 dark:text-white/60 font-medium leading-relaxed mt-0.5">
                  Buscando cada vez mais melhorar a sua experiência e eficiência no sistema.
                </p>
              </div>
            </div>

            {/* Botão Demo */}
            {onDemoLogin && getSubdomain() === 'demo' && (
              <button
                type="button"
                onClick={onDemoLogin}
                className="w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] text-[9px] sm:text-[10px] bg-neutral-900/5 dark:bg-white/5 hover:bg-neutral-900/10 dark:hover:bg-white/10 border border-neutral-900/10 dark:border-white/10 text-neutral-600 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white transition-all"
              >
                Entrar sem Senha (Demonstração)
              </button>
            )}

          </div>

          {/* Rodapé do card */}
          <div className="px-6 sm:px-10 pb-5 sm:pb-6 text-center border-t border-neutral-900/5 dark:border-white/5 pt-4">
            <p className="text-[9px] sm:text-[10px] text-neutral-400 dark:text-white/30 font-medium leading-relaxed">
              © {new Date().getFullYear()} Gestão 360 — Acesso restrito a servidores autorizados
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
