import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Bell, Monitor, CheckCircle2, 
  XCircle, MinusCircle, User, Users, Calendar, Clock, 
  Vote, FileText, AlertCircle, Sparkles, Printer, Plus
} from 'lucide-react';
import { SessaoPlenaria, MateriaLegislativa, Vereador, Votacao, TipoCronometro, CronometroConfig } from '../types';
import { PainelTelaoModal } from './PainelTelaoModal';
import { showToast } from '../../../components/ui/Toast';

interface PlenarioSessaoProps {
  sessao: SessaoPlenaria;
  materias: MateriaLegislativa[];
  vereadores: Vereador[];
  onSaveSessao: (sessao: SessaoPlenaria) => void;
  onSaveMateria: (materia: MateriaLegislativa) => void;
  onPrintAta?: (sessao: SessaoPlenaria) => void;
}

const CRONOMETROS: CronometroConfig[] = [
  { tipo: 'pequeno_expediente', label: 'Pequeno Expediente', duracao_segundos: 180 }, // 3 min
  { tipo: 'grande_expediente', label: 'Grande Expediente', duracao_segundos: 600 }, // 10 min
  { tipo: 'ordem_do_dia', label: 'Ordem do Dia / Discussão', duracao_segundos: 300 }, // 5 min
  { tipo: 'pela_ordem', label: 'Pela Ordem', duracao_segundos: 120 }, // 2 min
  { tipo: 'lideranca', label: 'Tempo de Liderança', duracao_segundos: 300 }, // 5 min
  { tipo: 'aparte', label: 'Aparte Regimental', duracao_segundos: 60 }, // 1 min
];

export const PlenarioSessao: React.FC<PlenarioSessaoProps> = ({
  sessao,
  materias,
  vereadores,
  onSaveSessao,
  onSaveMateria,
  onPrintAta
}) => {
  // --- ESTADOS DO CRONÔMETRO DE DISCURSO ---
  const [selectedCronometro, setSelectedCronometro] = useState<CronometroConfig>(CRONOMETROS[0]);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(CRONOMETROS[0].duracao_segundos);
  const [cronometroAtivo, setCronometroAtivo] = useState(false);
  const [oradorAtual, setOradorAtual] = useState<Vereador | null>(null);

  // --- ESTADOS DA VOTAÇÃO ELETRÔNICA ---
  const [materiaSelecionadaId, setMateriaSelecionadaId] = useState<string>(
    sessao.materia_em_discussao_id || materias[0]?.id || ''
  );
  const [tipoQuorum, setTipoQuorum] = useState<'Maioria Simples' | 'Maioria Absoluta' | 'Dois Terços (2/3)'>('Maioria Simples');
  const [turno, setTurno] = useState<'1º Turno' | '2º Turno' | 'Único' | 'Redação Final'>('1º Turno');
  
  // Mapa de votos: vereador_id -> 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE'
  const [votos, setVotos] = useState<Record<string, 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE'>>(() => {
    const initial: Record<string, any> = {};
    vereadores.forEach(v => {
      initial[v.id] = 'SIM'; // Padrão
    });
    return initial;
  });

  // Modal Telão
  const [showTelao, setShowTelao] = useState(false);

  // Matéria ativa
  const materiaEmVotacao = materias.find(m => m.id === materiaSelecionadaId) || materias[0] || null;

  // Web Audio Campainha da Presidência
  const playCampainha = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      console.log('Audio not supported:', e);
    }
  };

  // Efeito do cronômetro
  useEffect(() => {
    let interval: any = null;
    if (cronometroAtivo && segundosRestantes > 0) {
      interval = setInterval(() => {
        setSegundosRestantes(prev => {
          if (prev <= 1) {
            playCampainha();
            setCronometroAtivo(false);
            showToast('Tempo de tribuna esgotado!', 'info');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cronometroAtivo, segundosRestantes]);

  const handleSelectCronometroConfig = (config: CronometroConfig) => {
    setSelectedCronometro(config);
    setSegundosRestantes(config.duracao_segundos);
    setCronometroAtivo(false);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Voto individual
  const handleSetVoto = (vereadorId: string, voto: 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE') => {
    setVotos(prev => ({
      ...prev,
      [vereadorId]: voto
    }));
  };

  // Votação rápida unânime
  const handleVotoUnanime = (tipoVoto: 'SIM' | 'NAO' | 'ABSTENCAO') => {
    const updated: Record<string, any> = {};
    vereadores.forEach(v => {
      updated[v.id] = tipoVoto;
    });
    setVotos(updated);
  };

  // Contagem de votos
  const totalSim = Object.values(votos).filter(v => v === 'SIM').length;
  const totalNao = Object.values(votos).filter(v => v === 'NAO').length;
  const totalAbst = Object.values(votos).filter(v => v === 'ABSTENCAO').length;
  const totalPresentes = Object.values(votos).filter(v => v !== 'AUSENTE').length;

  // Concluir e Proclamar Votação
  const handleProclamarResultado = () => {
    if (!materiaEmVotacao) return;

    let resultado: 'Aprovado' | 'Rejeitado' = 'Aprovado';
    if (tipoQuorum === 'Maioria Simples') {
      resultado = totalSim > totalNao ? 'Aprovado' : 'Rejeitado';
    } else if (tipoQuorum === 'Maioria Absoluta') {
      const minimo = Math.floor(vereadores.length / 2) + 1;
      resultado = totalSim >= minimo ? 'Aprovado' : 'Rejeitado';
    } else if (tipoQuorum === 'Dois Terços (2/3)') {
      const minimo = Math.ceil((vereadores.length * 2) / 3);
      resultado = totalSim >= minimo ? 'Aprovado' : 'Rejeitado';
    }

    const novoStatus = resultado === 'Aprovado' 
      ? (turno === '1º Turno' ? '1ª Votação Aprovada' : 'Aprovado em Redação Final')
      : 'Rejeitado';

    const materiaAtualizada: MateriaLegislativa = {
      ...materiaEmVotacao,
      status: novoStatus,
      tramitacoes: [
        ...(materiaEmVotacao.tramitacoes || []),
        {
          id: `tram-${Date.now()}`,
          materia_id: materiaEmVotacao.id,
          data_tramitacao: new Date().toISOString().replace('T', ' ').substring(0, 19),
          fase: `Votação em Plenário (${sessao.numero}ª Sessão)`,
          despacho: `Matéria ${resultado.toUpperCase()} (${turno}). Placar: ${totalSim} SIM, ${totalNao} NÃO, ${totalAbst} ABSTENÇÃO.`,
          responsavel: 'Plenário da Câmara Municipal',
          status_resultante: novoStatus
        }
      ]
    };

    onSaveMateria(materiaAtualizada);
    playCampainha();
    showToast(`Votação Concluída! Matéria ${resultado} (${totalSim}x${totalNao})`, 'success');
  };

  // Finalizar Sessão
  const handleEncerrarSessao = () => {
    const updatedSessao: SessaoPlenaria = {
      ...sessao,
      status: 'Encerrada',
      hora_fim: new Date().toLocaleTimeString().substring(0, 5),
      ata_resumida: `Sessão encerrada com quórum pleno. Matérias votadas e aprovadas conforme ordem do dia.`
    };
    onSaveSessao(updatedSessao);
    showToast('Sessão Plenária encerrada e ata lavrada com sucesso!', 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* 1. CABEÇALHO DO PLENÁRIO & CONTROLES GERAIS */}
      <div className="bg-gradient-to-r from-[#002244] via-[#003B6F] to-[#004B87] text-white rounded-[32px] p-6 md:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3.5 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Sessão em Andamento
            </span>
            <span className="text-xs font-mono font-bold text-sky-200">
              {sessao.numero}ª Sessão {sessao.tipo} de {sessao.ano}
            </span>
            <span className="text-xs text-neutral-300">
              Início: {sessao.hora_inicio} • Data: {sessao.data_sessao}
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black font-['Montserrat'] tracking-tight">
            Plenário Legislativo da Câmara Municipal
          </h2>
          <p className="text-xs text-neutral-200">
            Painel Oficial da Mesa Diretora: Quórum, Tribuna e Votações Nominais em Tempo Real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowTelao(true)}
            className="px-5 py-3 bg-sky-500 hover:bg-sky-400 text-neutral-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-sky-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Monitor size={16} /> Abrir Modo Telão (TV)
          </button>
          {onPrintAta && (
            <button
              onClick={() => onPrintAta(sessao)}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={16} /> Gerar Ata
            </button>
          )}
          <button
            onClick={handleEncerrarSessao}
            className="px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
          >
            Encerrar Sessão
          </button>
        </div>
      </div>

      {/* 2. ÁREA DE TRABALHO: CRONÔMETRO DE TRIBUNA & QUÓRUM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel do Cronômetro de Discurso */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2">
                <Clock className="text-[#003B6F] dark:text-sky-400" size={18} />
                Cronômetro de Tribuna / Oratória
              </h3>
              <button
                onClick={playCampainha}
                className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 transition-colors"
                title="Tocar Campainha da Mesa"
              >
                <Bell size={16} />
              </button>
            </div>

            {/* Tipos de Tempo Regimental */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CRONOMETROS.map(c => (
                <button
                  key={c.tipo}
                  onClick={() => handleSelectCronometroConfig(c)}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer ${
                    selectedCronometro.tipo === c.tipo
                      ? 'bg-[#003B6F] text-white border-[#003B6F] shadow-sm'
                      : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <div className="text-[10px] opacity-75">{Math.floor(c.duracao_segundos / 60)} min</div>
                  <div className="truncate">{c.label}</div>
                </button>
              ))}
            </div>

            {/* Seleção do Vereador Orador */}
            <div className="mb-4">
              <label className="text-[11px] font-black uppercase text-neutral-400 tracking-wider">
                Orador na Tribuna:
              </label>
              <select
                value={oradorAtual?.id || ''}
                onChange={e => setOradorAtual(vereadores.find(v => v.id === e.target.value) || null)}
                className="w-full mt-1 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
              >
                <option value="">-- Selecione o Vereador --</option>
                {vereadores.map(v => (
                  <option key={v.id} value={v.id}>{v.nome_parlamentar} ({v.partido})</option>
                ))}
              </select>
            </div>

            {/* Display do Timer */}
            <div className="bg-neutral-950 text-white rounded-2xl p-6 text-center shadow-inner my-2">
              <span className="text-[11px] text-neutral-400 font-mono uppercase tracking-widest block mb-1">
                {selectedCronometro.label}
              </span>
              <div className={`text-5xl font-black font-mono tracking-tight ${
                segundosRestantes <= 30 && segundosRestantes > 0 ? 'text-rose-500 animate-pulse' : 'text-white'
              }`}>
                {formatTimer(segundosRestantes)}
              </div>
            </div>
          </div>

          {/* Controles do Timer */}
          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              onClick={() => setCronometroAtivo(!cronometroAtivo)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                cronometroAtivo 
                  ? 'bg-amber-500 hover:bg-amber-600 text-neutral-950' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
              }`}
            >
              {cronometroAtivo ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Iniciar</>}
            </button>
            <button
              onClick={() => {
                setCronometroAtivo(false);
                setSegundosRestantes(selectedCronometro.duracao_segundos);
              }}
              className="p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl transition-colors cursor-pointer"
              title="Reiniciar Tempo"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => setSegundosRestantes(prev => prev + 60)}
              className="px-3 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Acrescentar 1 minuto"
            >
              +1 min
            </button>
          </div>
        </div>

        {/* Painel Central e Direito: Votação Eletrônica Nominal */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[32px] p-6 shadow-sm flex flex-col justify-between space-y-6">
          
          <div>
            {/* Topo da Votação: Matéria Selecionada & Quórum */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex-1">
                <label className="text-[11px] font-black uppercase text-neutral-400 tracking-wider">
                  Matéria em Pauta para Votação:
                </label>
                <select
                  value={materiaSelecionadaId}
                  onChange={e => setMateriaSelecionadaId(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
                >
                  {materias.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.numero} - {m.tipo} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-neutral-400 tracking-wider">
                    Quórum Exigido:
                  </label>
                  <select
                    value={tipoQuorum}
                    onChange={e => setTipoQuorum(e.target.value as any)}
                    className="w-full mt-1 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="Maioria Simples">Maioria Simples</option>
                    <option value="Maioria Absoluta">Maioria Absoluta</option>
                    <option value="Dois Terços (2/3)">2/3 Qualificado</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase text-neutral-400 tracking-wider">
                    Turno:
                  </label>
                  <select
                    value={turno}
                    onChange={e => setTurno(e.target.value as any)}
                    className="w-full mt-1 p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="1º Turno">1º Turno</option>
                    <option value="2º Turno">2º Turno</option>
                    <option value="Único">Turno Único</option>
                    <option value="Redação Final">Redação Final</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ementa da Matéria */}
            {materiaEmVotacao && (
              <div className="my-3 p-4 bg-sky-50/60 dark:bg-sky-500/10 rounded-2xl border border-sky-100 dark:border-sky-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#003B6F] text-white">
                    {materiaEmVotacao.numero}
                  </span>
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                    Autor: {materiaEmVotacao.autor_nome}
                  </span>
                </div>
                <p className="text-xs text-neutral-800 dark:text-neutral-200 font-medium line-clamp-2">
                  {materiaEmVotacao.ementa}
                </p>
              </div>
            )}

            {/* Ações de Votação Rápida */}
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-neutral-400 uppercase tracking-wider text-[11px]">
                Votação Nominal dos Parlamentares:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVotoUnanime('SIM')}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 rounded-lg font-bold text-[11px] hover:bg-emerald-100 cursor-pointer"
                >
                  Unanimidade SIM
                </button>
                <button
                  onClick={() => handleVotoUnanime('NAO')}
                  className="px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 rounded-lg font-bold text-[11px] hover:bg-rose-100 cursor-pointer"
                >
                  Unanimidade NÃO
                </button>
              </div>
            </div>

            {/* Grid dos Vereadores e Botões de Voto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
              {vereadores.map(ver => {
                const votoAtual = votos[ver.id] || 'SIM';

                return (
                  <div
                    key={ver.id}
                    className="p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={ver.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={ver.nome_parlamentar}
                        className="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                      />
                      <div className="truncate">
                        <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {ver.nome_parlamentar}
                        </h5>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {ver.partido}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => handleSetVoto(ver.id, 'SIM')}
                        className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          votoAtual === 'SIM'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white dark:bg-neutral-800 text-neutral-500 hover:text-emerald-600'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        onClick={() => handleSetVoto(ver.id, 'NAO')}
                        className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          votoAtual === 'NAO'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white dark:bg-neutral-800 text-neutral-500 hover:text-rose-600'
                        }`}
                      >
                        NÃO
                      </button>
                      <button
                        onClick={() => handleSetVoto(ver.id, 'ABSTENCAO')}
                        className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          votoAtual === 'ABSTENCAO'
                            ? 'bg-amber-500 text-neutral-950 shadow-sm'
                            : 'bg-white dark:bg-neutral-800 text-neutral-500 hover:text-amber-500'
                        }`}
                      >
                        ABST
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Placar Consolidado & Botão de Proclamação */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">SIM: <strong className="text-neutral-900 dark:text-white font-mono text-sm">{totalSim}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">NÃO: <strong className="text-neutral-900 dark:text-white font-mono text-sm">{totalNao}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">ABST: <strong className="text-neutral-900 dark:text-white font-mono text-sm">{totalAbst}</strong></span>
              </div>
            </div>

            <button
              onClick={handleProclamarResultado}
              className="px-6 py-3 bg-[#003B6F] hover:bg-[#002b52] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#003B6F]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Vote size={16} /> Encerrar e Proclamar Resultado
            </button>
          </div>

        </div>

      </div>

      {/* MODAL TELÃO DO PLENÁRIO */}
      {showTelao && (
        <PainelTelaoModal
          sessao={sessao}
          materiaEmVotacao={materiaEmVotacao}
          vereadores={vereadores}
          votos={votos}
          cronometroSegundos={segundosRestantes}
          cronometroAtivo={cronometroAtivo}
          oradorAtual={oradorAtual}
          tipoExpedienteLabel={selectedCronometro.label}
          onClose={() => setShowTelao(false)}
        />
      )}

    </div>
  );
};
