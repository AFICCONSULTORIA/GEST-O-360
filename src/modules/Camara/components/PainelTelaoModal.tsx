import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Maximize2, Minimize2, X, Clock, Users, CheckCircle2, 
  XCircle, MinusCircle, Volume2, ShieldCheck, Landmark 
} from 'lucide-react';
import { SessaoPlenaria, MateriaLegislativa, Vereador, VotoIndividual } from '../types';

interface PainelTelaoModalProps {
  sessao: SessaoPlenaria;
  materiaEmVotacao: MateriaLegislativa | null;
  vereadores: Vereador[];
  votos: Record<string, 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE'>;
  cronometroSegundos: number;
  cronometroAtivo: boolean;
  oradorAtual: Vereador | null;
  tipoExpedienteLabel: string;
  onClose: () => void;
}

export const PainelTelaoModal: React.FC<PainelTelaoModalProps> = ({
  sessao,
  materiaEmVotacao,
  vereadores,
  votos,
  cronometroSegundos,
  cronometroAtivo,
  oradorAtual,
  tipoExpedienteLabel,
  onClose
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log(err));
        setIsFullscreen(false);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Contagem de votos
  const totalSim = Object.values(votos).filter(v => v === 'SIM').length;
  const totalNao = Object.values(votos).filter(v => v === 'NAO').length;
  const totalAbst = Object.values(votos).filter(v => v === 'ABSTENCAO').length;
  const totalPresentes = vereadores.filter(v => votos[v.id] !== 'AUSENTE').length;

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 text-white flex flex-col justify-between overflow-hidden select-none font-['Inter']">
      
      {/* 1. HEADER DO TELÃO */}
      <div className="p-6 bg-[#001D3D] border-b border-white/10 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-sky-400">
            <Landmark size={32} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black font-['Montserrat'] tracking-tight text-white uppercase">
              Câmara Municipal • Painel Eletrônico do Plenário
            </h1>
            <p className="text-xs text-sky-300 font-mono font-bold">
              {sessao.numero}ª Sessão {sessao.tipo} de {sessao.ano} • {sessao.data_sessao}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 bg-black/30 px-5 py-2.5 rounded-2xl border border-white/10">
            <Users size={20} className="text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
              Quórum: <strong className="text-white text-base">{totalPresentes}</strong> / {vereadores.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-colors"
              title="Tela Cheia"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button
              onClick={onClose}
              className="p-3 bg-rose-600 hover:bg-rose-500 rounded-2xl text-white transition-colors"
              title="Fechar Telão"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. ÁREA CENTRAL: GRID DE VEREADORES & CRONÔMETRO */}
      <div className="flex-1 p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto">
        
        {/* Painel Esquerdo / Central: Grid de Bancadas e Votação */}
        <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
          
          {/* Matéria em Discussão */}
          <div className="bg-[#002855]/70 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="px-3 py-1 bg-sky-500 text-neutral-950 text-xs font-black font-mono rounded-lg">
                {materiaEmVotacao ? materiaEmVotacao.numero : 'EXPEDIENTE DO DIA'}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">
                {materiaEmVotacao ? materiaEmVotacao.tipo : 'Discussão Geral'}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white line-clamp-2 leading-relaxed">
              {materiaEmVotacao ? materiaEmVotacao.ementa : 'Tribuna Livre e Leitura das Matérias do Expediente'}
            </h2>
            {materiaEmVotacao && (
              <p className="text-xs text-sky-200 mt-2 font-medium">
                Autoria: <strong>{materiaEmVotacao.autor_nome}</strong> • Regime: <strong>{materiaEmVotacao.regime}</strong>
              </p>
            )}
          </div>

          {/* Cards dos Vereadores e Votos em Tempo Real */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 flex-1">
            {vereadores.map(ver => {
              const voto = votos[ver.id] || 'AUSENTE';
              
              let badgeColor = 'bg-neutral-800 text-neutral-400 border-neutral-700';
              let icon = null;

              if (voto === 'SIM') {
                badgeColor = 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30 animate-pulse';
                icon = <CheckCircle2 size={16} />;
              } else if (voto === 'NAO') {
                badgeColor = 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30 animate-pulse';
                icon = <XCircle size={16} />;
              } else if (voto === 'ABSTENCAO') {
                badgeColor = 'bg-amber-500 text-neutral-950 border-amber-300 shadow-lg shadow-amber-500/30';
                icon = <MinusCircle size={16} />;
              }

              return (
                <div 
                  key={ver.id}
                  className={`rounded-2xl p-4 border flex flex-col justify-between items-center text-center transition-all ${
                    voto !== 'AUSENTE'
                      ? 'bg-white/5 border-white/20'
                      : 'bg-black/30 border-white/5 opacity-50'
                  }`}
                >
                  <div className="relative">
                    <img 
                      src={ver.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                      alt={ver.nome_parlamentar}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white/20 mb-2 shadow-md"
                    />
                    {ver.cargo_mesa !== 'Vereador(a)' && (
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-[#003B6F] text-[9px] font-black rounded-md border border-white/30 text-white">
                        {ver.cargo_mesa.replace('Presidente', 'Pres.')}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {ver.nome_parlamentar}
                  </h4>
                  <span className="text-[10px] text-neutral-400 font-mono mb-2">
                    {ver.partido}
                  </span>

                  <div className={`w-full py-1.5 px-2 rounded-xl text-xs font-black font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 border ${badgeColor}`}>
                    {icon} {voto}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Painel Direito: Cronômetro Gigante & Placar */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Cronômetro Gigante de Discurso */}
          <div className="bg-[#001833] border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-bold text-sky-300 uppercase tracking-widest mb-3">
              {tipoExpedienteLabel}
            </span>

            {oradorAtual ? (
              <div className="mb-2">
                <span className="text-xs text-neutral-400">Na Tribuna:</span>
                <h3 className="text-lg font-black text-white">{oradorAtual.nome_parlamentar}</h3>
              </div>
            ) : (
              <div className="mb-2 text-xs text-neutral-400">
                Tempo de Plenário
              </div>
            )}

            {/* Display do Cronômetro */}
            <div className={`text-6xl md:text-7xl font-black font-mono tracking-tighter my-4 ${
              cronometroSegundos <= 30 && cronometroSegundos > 0
                ? 'text-rose-500 animate-pulse'
                : 'text-white'
            }`}>
              {formatTime(cronometroSegundos)}
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Clock size={16} className={cronometroAtivo ? 'text-emerald-400 animate-spin' : 'text-neutral-500'} />
              <span>{cronometroAtivo ? 'Tempo em Contagem Regressiva' : 'Cronômetro Pausado'}</span>
            </div>
          </div>

          {/* Placar Eletrônico de Votação */}
          <div className="bg-[#002244] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-300 text-center">
              Placar da Votação Eletrônica
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4">
                <span className="text-xs font-bold text-emerald-400 uppercase">SIM</span>
                <div className="text-4xl font-black text-emerald-400 font-mono mt-1">{totalSim}</div>
              </div>

              <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-4">
                <span className="text-xs font-bold text-rose-400 uppercase">NÃO</span>
                <div className="text-4xl font-black text-rose-400 font-mono mt-1">{totalNao}</div>
              </div>

              <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-4">
                <span className="text-xs font-bold text-amber-400 uppercase">ABST.</span>
                <div className="text-4xl font-black text-amber-400 font-mono mt-1">{totalAbst}</div>
              </div>
            </div>

            <div className="p-3 bg-black/30 rounded-2xl border border-white/10 text-center">
              <span className="text-xs text-neutral-300">
                Resultado Parcial: <strong className="text-white uppercase font-mono">
                  {totalSim > totalNao ? 'Aprovando por Maioria' : totalNao > totalSim ? 'Rejeitando' : 'Empate Regimental'}
                </strong>
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* 3. RODAPÉ DO TELÃO */}
      <div className="p-4 bg-[#001226] border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-neutral-400 px-8">
        <span>Sistema de Gestão Legislativa Integrada • Câmara 360</span>
        <span className="font-mono">{new Date().toLocaleTimeString()}</span>
      </div>

    </div>
  );
};
