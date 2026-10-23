import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, Award, Crown, Star, ShieldCheck } from 'lucide-react';

interface StreakAnimationOverlayProps {
  prevStreak: number;
  currentStreak: number;
  onClose: () => void;
}

// Síntese procedural de som elétrico e trovão usando Web Audio API nativo (sem dependências de áudio externas)
function playLightningSound(isMilestone: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // 1. Ruído de estalo elétrico de alta voltagem
    const bufferSize = ctx.sampleRate * (isMilestone ? 0.6 : 0.35);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isMilestone ? 0.55 : 0.3));

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start();

    // 2. Ressonância grave do trovão (rumble)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = isMilestone ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isMilestone ? 95 : 120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + (isMilestone ? 1.4 : 0.8));

    oscGain.gain.setValueAtTime(0.5, ctx.currentTime + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isMilestone ? 1.4 : 0.8));

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(ctx.currentTime + 0.05);
    osc.stop(ctx.currentTime + (isMilestone ? 1.45 : 0.85));
  } catch (e) {
    // Falha silenciosa caso o navegador restrinja reprodução de áudio
  }
}

export const StreakAnimationOverlay: React.FC<StreakAnimationOverlayProps> = ({
  prevStreak,
  currentStreak,
  onClose,
}) => {
  const isMilestone = currentStreak >= 30;
  const [displayNumber, setDisplayNumber] = useState(prevStreak);
  const [lightningStage, setLightningStage] = useState<'strike' | 'aftershock' | 'charged'>('strike');

  // Relâmpago principal e ramificações desenhadas via caminhos vetoriais
  const mainLightningPath = 'M 85,0 L 68,22 L 78,24 L 52,48 L 62,50 L 35,76 L 46,78 L 15,100';
  const branch1Path = 'M 68,22 L 50,30 L 42,42';
  const branch2Path = 'M 52,48 L 38,58 L 28,70';
  const branch3Path = 'M 35,76 L 22,86';

  // Relâmpago secundário invertido para efeito de tempestade no marco lendário (30+ dias)
  const secondaryLightningPath = 'M 15,0 L 35,26 L 26,28 L 50,54 L 40,56 L 68,82 L 58,84 L 88,100';

  useEffect(() => {
    // 1. Toca o estrondo do raio imediatamente
    playLightningSound(isMilestone);

    // 2. Pós-choque e arcos elétricos
    const t1 = setTimeout(() => {
      setLightningStage('aftershock');
      setDisplayNumber(currentStreak);
    }, isMilestone ? 1200 : 900);

    // 3. Estabilização da energia do raio
    const t2 = setTimeout(() => {
      setLightningStage('charged');
    }, isMilestone ? 2000 : 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [currentStreak, isMilestone]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md overflow-hidden select-none"
      >
        {/* ========================================================= */}
        {/* CAMADA 1: CLARÃO ELÉTRICO NA TELA (SCREEN FLASH)          */}
        {/* ========================================================= */}
        <motion.div
          initial={{ opacity: 0.95 }}
          animate={{ opacity: [0.95, 0.4, 0.8, 0] }}
          transition={{ duration: isMilestone ? 0.7 : 0.45, ease: 'easeOut' }}
          className={`fixed inset-0 pointer-events-none z-[1001] ${
            isMilestone 
              ? 'bg-gradient-to-br from-amber-200 via-white to-sky-300' 
              : 'bg-gradient-to-br from-cyan-100 via-white to-sky-400'
          }`}
        />

        {/* ========================================================= */}
        {/* CAMADA 2: RAIO CORTANDO A TELA (SVG HIGH-VOLTAGE LIGHTNING) */}
        {/* ========================================================= */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="fixed inset-0 w-full h-full pointer-events-none z-[1002]"
        >
          <defs>
            <filter id="lightning-core-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            <linearGradient id="lightning-gradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isMilestone ? '#fef08a' : '#e0f2fe'} />
              <stop offset="50%" stopColor={isMilestone ? '#f59e0b' : '#38bdf8'} />
              <stop offset="100%" stopColor={isMilestone ? '#fbbf24' : '#0284c7'} />
            </linearGradient>

            <linearGradient id="secondary-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>

          {/* Raio Principal cortando a tela */}
          <motion.path
            d={mainLightningPath}
            fill="none"
            stroke="url(#lightning-gradient)"
            strokeWidth={isMilestone ? '2.4' : '1.8'}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lightning-core-glow)"
            initial={{ pathLength: 0, opacity: 1 }}
            animate={{ 
              pathLength: [0, 1, 1], 
              opacity: [1, 1, 0.8, 0] 
            }}
            transition={{ 
              duration: isMilestone ? 1.2 : 0.85, 
              times: [0, 0.25, 0.7, 1],
              ease: 'easeOut' 
            }}
          />

          {/* Ramificações elétricas secundárias */}
          <motion.path
            d={branch1Path}
            fill="none"
            stroke="url(#lightning-gradient)"
            strokeWidth="0.9"
            filter="url(#lightning-core-glow)"
            initial={{ pathLength: 0, opacity: 0.9 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0.9, 0.9, 0] }}
            transition={{ duration: 0.6, delay: 0.08 }}
          />

          <motion.path
            d={branch2Path}
            fill="none"
            stroke="url(#lightning-gradient)"
            strokeWidth="0.8"
            filter="url(#lightning-core-glow)"
            initial={{ pathLength: 0, opacity: 0.9 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0.9, 0.9, 0] }}
            transition={{ duration: 0.6, delay: 0.12 }}
          />

          <motion.path
            d={branch3Path}
            fill="none"
            stroke="url(#lightning-gradient)"
            strokeWidth="0.7"
            filter="url(#lightning-core-glow)"
            initial={{ pathLength: 0, opacity: 0.8 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0.8, 0.8, 0] }}
            transition={{ duration: 0.5, delay: 0.18 }}
          />

          {/* Segundo Raio Cruzado (Exclusivo para o marco de 30+ dias) */}
          {isMilestone && (
            <motion.path
              d={secondaryLightningPath}
              fill="none"
              stroke="url(#secondary-gradient)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lightning-core-glow)"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
              transition={{ duration: 1.1, delay: 0.15, ease: 'easeOut' }}
            />
          )}
        </svg>

        {/* ========================================================= */}
        {/* CAMADA 3: ONDA DE CHOQUE E ARCOS DE PLASMA EXPANSIVOS      */}
        {/* ========================================================= */}
        <motion.div
          initial={{ scale: 0.1, opacity: 1 }}
          animate={{ scale: [0.1, 1.8, 2.5], opacity: [1, 0.6, 0] }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className={`absolute w-96 h-96 rounded-full pointer-events-none z-[1000] border-4 ${
            isMilestone 
              ? 'border-amber-400 shadow-[0_0_80px_#f59e0b]' 
              : 'border-sky-400 shadow-[0_0_80px_#0284c7]'
          }`}
        />

        {/* ========================================================= */}
        {/* CAMADA 4: CARD MODAL CENTRAL (TEMPESTADE / VOLTAGEM)       */}
        {/* ========================================================= */}
        <motion.div
          initial={{ scale: 0.7, y: 60, opacity: 0 }}
          animate={{ 
            scale: 1, 
            y: 0, 
            opacity: 1,
            x: lightningStage === 'strike' ? [0, -14, 16, -10, 10, -4, 0] : 0 
          }}
          transition={{ 
            type: 'spring', 
            bounce: 0.45, 
            duration: 0.8,
            x: { duration: 0.5, ease: 'easeInOut' } 
          }}
          className={`relative w-full max-w-md rounded-[40px] p-8 md:p-10 shadow-2xl flex flex-col items-center text-center overflow-hidden z-[1010] border-2 transition-all duration-500 ${
            isMilestone
              ? 'bg-gradient-to-b from-neutral-900 via-neutral-900 to-amber-950/70 border-amber-400/80 shadow-[0_0_90px_rgba(245,158,11,0.35)]'
              : 'bg-gradient-to-b from-neutral-900 via-neutral-900 to-sky-950/60 border-sky-400/70 shadow-[0_0_80px_rgba(2,132,199,0.3)]'
          }`}
        >
          {/* Fundo dinâmico com brilho elétrico pulsante */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div 
              className={`absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] transition-opacity ${
                isMilestone ? 'bg-amber-500/25' : 'bg-sky-500/20'
              }`}
            />
            <div 
              className={`absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-[100px] transition-opacity ${
                isMilestone ? 'bg-purple-600/30' : 'bg-teal-500/20'
              }`}
            />
          </div>

          {/* Emblema de Marco 30+ Dias */}
          {isMilestone && (
            <motion.div 
              initial={{ scale: 0, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.35, type: 'spring' }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-widest mb-6 shadow-sm"
            >
              <Crown size={14} className="text-amber-400" />
              <span>Conquista Lendária · 30 Dias</span>
              <Sparkles size={14} className="text-yellow-300" />
            </motion.div>
          )}

          {/* Orbe Central de Alta Voltagem com Ícone de Raio */}
          <div className="relative mb-6">
            {/* Halo pulsante de plasma elétrico */}
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.5, 0.9, 0.5],
                rotate: [0, 180, 360]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className={`absolute -inset-4 rounded-full blur-xl pointer-events-none ${
                isMilestone 
                  ? 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-purple-500' 
                  : 'bg-gradient-to-tr from-sky-400 via-cyan-300 to-indigo-500'
              }`}
            />

            {/* Esfera do Raio */}
            <motion.div
              animate={
                lightningStage === 'aftershock'
                  ? { scale: [1, 1.35, 1], rotate: [0, -12, 12, -8, 8, 0] }
                  : { scale: [1, 1.05, 1] }
              }
              transition={{ duration: 0.7 }}
              className={`relative w-28 h-28 md:w-32 md:h-32 rounded-3xl flex items-center justify-center shadow-2xl transition-all ${
                isMilestone
                  ? 'bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 text-neutral-950 ring-4 ring-amber-300/60 shadow-amber-500/50'
                  : 'bg-gradient-to-br from-sky-300 via-cyan-500 to-indigo-600 text-white ring-4 ring-sky-300/50 shadow-sky-500/50'
              }`}
            >
              <Zap 
                size={isMilestone ? 68 : 60} 
                className="drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]" 
                fill="currentColor" 
              />

              {/* Anéis orbitais de eletricidade */}
              <div className="absolute inset-0 border-2 border-white/40 rounded-3xl animate-pulse" />
            </motion.div>

            {/* Faíscas elétricas e estrelas efervescentes */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.8], y: -45, x: 35 }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.5 }}
              className="absolute -top-3 -right-3 text-amber-300 pointer-events-none"
            >
              <Sparkles size={26} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.8], y: 40, x: -35 }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.8 }}
              className="absolute -bottom-2 -left-3 text-sky-300 pointer-events-none"
            >
              <Zap size={22} fill="currentColor" />
            </motion.div>
          </div>

          {/* Título de Impacto */}
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
            {isMilestone ? (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400">
                Mestre dos Relâmpagos! ⚡
              </span>
            ) : (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-cyan-300 to-indigo-300">
                Raio Cortou a Tela! ⚡
              </span>
            )}
          </h2>

          <p className="text-neutral-300 font-medium text-sm md:text-base mb-6 max-w-xs leading-relaxed">
            {isMilestone ? (
              <>Você completou <strong>30 dias de sequência</strong>! Sua dedicação alcançou o nível lendário do trovão.</>
            ) : (
              <>Você completou sua primeira atividade de hoje e <strong>carregou a sequência de raios</strong>!</>
            )}
          </p>

          {/* Contador de Dias com Efeito Elétrico */}
          <div className="flex items-baseline justify-center gap-2 mb-6 px-6 py-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-inner">
            <motion.div
              key={displayNumber}
              initial={{ opacity: 0, scale: 0.6, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`text-5xl md:text-6xl font-black tracking-tight ${
                isMilestone 
                  ? 'text-amber-400 drop-shadow-[0_0_20px_#f59e0b]' 
                  : 'text-sky-400 drop-shadow-[0_0_20px_#0284c7]'
              }`}
            >
              {displayNumber}
            </motion.div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-lg font-black text-white uppercase tracking-wider">
                {displayNumber === 1 ? 'Dia' : 'Dias'}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${isMilestone ? 'text-amber-300' : 'text-sky-300'}`}>
                Sequência Ativa ⚡
              </span>
            </div>
          </div>

          {/* Recompensas de Marco Lendário */}
          {isMilestone && (
            <div className="w-full mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-400/30 flex items-center justify-around text-xs font-black text-amber-200">
              <div className="flex items-center gap-1.5">
                <Star size={16} className="text-amber-400 fill-amber-400" />
                <span>+300 XP Bônus</span>
              </div>
              <div className="h-4 w-px bg-amber-400/30" />
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-yellow-400" />
                <span>Escudo do Trovão</span>
              </div>
            </div>
          )}

          {/* Botão de Fechar / Continuar */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={onClose}
            className={`w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider shadow-xl transition-all cursor-pointer ${
              isMilestone
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-neutral-950 shadow-amber-500/40 hover:shadow-amber-500/60'
                : 'bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500 text-neutral-950 shadow-sky-500/30 hover:shadow-sky-500/50'
            }`}
          >
            {isMilestone ? 'Continuar com Poder Lendário ⚡' : 'Continuar com Energia Total ⚡'}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
