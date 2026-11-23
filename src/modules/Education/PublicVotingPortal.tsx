import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Vote,
  School,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Lock,
  Unlock,
  UserCheck,
  CreditCard,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { VotingService } from './services/votingService';
import {
  SchoolUnit,
  Candidate,
  Election,
  VoteRecord,
  YesNoChoice
} from './types/voting';
import { formatCPF, validateCPF } from '../../lib/masks';
import { Institution } from '../../types';

interface PublicVotingPortalProps {
  darkMode?: boolean;
  setDarkMode?: (dark: boolean) => void;
  currentInstitution?: Institution | null;
}

type BallotStep = 'identify' | 'director' | 'coordinator' | 'fim';

function playStepBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1046.5;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // ignore audio block
  }
}

function playUrnaBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [880, 1174.66, 1318.51, 1760];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.15);
    });
  } catch {
    // ignore audio block
  }
}

export const PublicVotingPortal: React.FC<PublicVotingPortalProps> = ({
  currentInstitution
}) => {
  const [schools, setSchools] = useState<SchoolUnit[]>([]);
  const [election, setElection] = useState<Election | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolUnit | null>(null);
  const [schoolLocked, setSchoolLocked] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Passos da Urna Eletrônica
  const [step, setStep] = useState<BallotStep>('identify');

  // Identificação do Eleitor
  const [voterCpf, setVoterCpf] = useState('');
  const [voterName, setVoterName] = useState('');
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [lookupSource, setLookupSource] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [alreadyVotedReceipt, setAlreadyVotedReceipt] = useState<VoteRecord | null>(null);

  // Escolhas do Eleitor (Diretor + Coordenador)
  const [selectedDirectorId, setSelectedDirectorId] = useState<string | null>(null);
  const [directorChoice, setDirectorChoice] = useState<YesNoChoice | null>(null);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string | null>(null);
  const [coordinatorChoice, setCoordinatorChoice] = useState<YesNoChoice | null>(null);

  // Comprovante + Auto-Reset estilo Urna
  const [receipt, setReceipt] = useState<VoteRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState<number>(4);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const cpfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const reloadPortalData = () => {
      const loadedSchools = VotingService.getSchools();
      const activeElection = VotingService.getActiveElection();
      setSchools(loadedSchools);
      setElection(activeElection);

      setSelectedSchool((prev) => {
        if (prev) {
          const match = loadedSchools.find((s) => s.id === prev.id);
          if (match) {
            setCandidates(VotingService.getCandidates(match.id));
            return match;
          }
        }
        if (loadedSchools.length > 0) {
          setCandidates(VotingService.getCandidates(loadedSchools[0].id));
          return loadedSchools[0];
        }
        return null;
      });
    };

    VotingService.syncFromSupabase().finally(reloadPortalData);
    reloadPortalData();

    window.addEventListener('voting-data-changed', reloadPortalData);
    window.addEventListener('storage', reloadPortalData);
    return () => {
      window.removeEventListener('voting-data-changed', reloadPortalData);
      window.removeEventListener('storage', reloadPortalData);
    };
  }, []);

  const directorCandidates = useMemo(
    () => candidates.filter((c) => c.active !== false && (c.role || 'diretor') === 'diretor'),
    [candidates]
  );

  const coordinatorCandidates = useMemo(
    () => candidates.filter((c) => c.active !== false && c.role === 'coordenador'),
    [candidates]
  );

  // Auto-seleciona se houver candidato único
  useEffect(() => {
    if (directorCandidates.length === 1) {
      setSelectedDirectorId(directorCandidates[0].id);
    }
    if (coordinatorCandidates.length === 1) {
      setSelectedCoordinatorId(coordinatorCandidates[0].id);
    }
  }, [directorCandidates, coordinatorCandidates]);

  // Preparar urna para o próximo eleitor
  const resetForNextVoter = () => {
    setStep('identify');
    setVoterCpf('');
    setVoterName('');
    setLookupStatus('idle');
    setLookupSource('');
    setFormError(null);
    setAlreadyVotedReceipt(null);
    setDirectorChoice(null);
    setCoordinatorChoice(null);
    setSelectedDirectorId(directorCandidates.length === 1 ? directorCandidates[0].id : null);
    setSelectedCoordinatorId(coordinatorCandidates.length === 1 ? coordinatorCandidates[0].id : null);
    setReceipt(null);
    setCountdown(4);
    setTimeout(() => cpfInputRef.current?.focus(), 120);
  };

  // Contagem regressiva automática na tela FIM (modo Urna)
  useEffect(() => {
    if (step !== 'fim') return;
    if (countdown <= 0) {
      resetForNextVoter();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleSelectSchool = (schoolId: string) => {
    const found = schools.find((s) => s.id === schoolId) || null;
    setSelectedSchool(found);
    setCandidates(found ? VotingService.getCandidates(found.id) : []);
    setSelectedDirectorId(null);
    setSelectedCoordinatorId(null);
    setDirectorChoice(null);
    setCoordinatorChoice(null);
  };

  // Ao digitar 11 dígitos do CPF: valida e tenta puxar o nome completo automaticamente
  const handleCpfChange = async (rawValue: string) => {
    const formatted = formatCPF(rawValue);
    setVoterCpf(formatted);
    setFormError(null);
    setAlreadyVotedReceipt(null);

    const digits = formatted.replace(/\D/g, '');
    if (digits.length < 11) {
      setLookupStatus('idle');
      setLookupSource('');
      return;
    }

    if (!validateCPF(formatted)) {
      setLookupStatus('idle');
      setFormError('CPF inválido. Confira os 11 números digitados.');
      return;
    }

    setLookupStatus('loading');
    try {
      const found = await VotingService.lookupVoterNameByCpf(digits);
      if (found?.name) {
        setVoterName(found.name);
        setLookupStatus('found');
        setLookupSource(found.source);
      } else {
        setLookupStatus('not_found');
        setLookupSource('');
      }
    } catch {
      setLookupStatus('not_found');
    }
  };

  const handleStartVoting = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCpf = voterCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11 || !validateCPF(voterCpf)) {
      setFormError('Digite um CPF válido com 11 números.');
      return;
    }
    if (voterName.trim().length < 5) {
      setFormError('Informe o nome completo do eleitor.');
      return;
    }
    if (!selectedSchool) {
      setFormError('Selecione a escola onde está votando.');
      return;
    }
    if (directorCandidates.length === 0 && coordinatorCandidates.length === 0) {
      setFormError('Ainda não há candidatos cadastrados para esta escola.');
      return;
    }

    setIsSubmitting(true);
    try {
      const check = await VotingService.hasCpfVotedAsync(selectedSchool.id, cleanCpf, election?.id);
      if (check.voted && check.vote) {
        setAlreadyVotedReceipt(check.vote);
        return;
      }

      if (directorCandidates.length > 0) {
        if (directorCandidates.length === 1) setSelectedDirectorId(directorCandidates[0].id);
        setDirectorChoice(null);
        setCoordinatorChoice(null);
        setStep('director');
      } else {
        if (coordinatorCandidates.length === 1) setSelectedCoordinatorId(coordinatorCandidates[0].id);
        setDirectorChoice('branco');
        setCoordinatorChoice(null);
        setStep('coordinator');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectorVoteClick = (choice: YesNoChoice) => {
    if (isSubmitting) return;
    const targetId =
      choice === 'branco' ? '__BRANCO__' : activeDirector?.id || selectedDirectorId || '__BRANCO__';
    setSelectedDirectorId(targetId);
    setDirectorChoice(choice);

    if (soundEnabled) playStepBeep();
    if (coordinatorCandidates.length === 1) {
      setSelectedCoordinatorId(coordinatorCandidates[0].id);
    }
    setStep('coordinator');
  };

  const handleCoordinatorVoteClick = async (choice: YesNoChoice) => {
    if (isSubmitting) return;
    const coordId =
      choice === 'branco'
        ? '__BRANCO__'
        : activeCoordinator?.id || selectedCoordinatorId || '__COORDENADOR_ESCOLA__';
    setSelectedCoordinatorId(coordId);
    setCoordinatorChoice(choice);
    await handleConfirmBallot(
      directorChoice || 'branco',
      choice,
      selectedDirectorId || activeDirector?.id || '__BRANCO__',
      coordId
    );
  };

  const handleConfirmBallot = async (
    finalDirectorChoice: YesNoChoice,
    finalCoordinatorChoice: YesNoChoice,
    dirCandId?: string,
    coordCandId?: string
  ) => {
    if (!election || !selectedSchool) return;

    setIsSubmitting(true);
    try {
      const result = await VotingService.castVoteAsync({
        electionId: election.id,
        schoolId: selectedSchool.id,
        candidateId:
          finalDirectorChoice === 'branco' ? '__BRANCO__' : dirCandId || selectedDirectorId || '__BRANCO__',
        directorVote: finalDirectorChoice,
        coordinatorCandidateId:
          finalCoordinatorChoice === 'branco'
            ? '__BRANCO__'
            : coordCandId || selectedCoordinatorId || '__COORDENADOR_ESCOLA__',
        coordinatorVote: finalCoordinatorChoice,
        voterCpf,
        voterName: voterName.trim(),
        voterSegment: 'responsavel'
      });

      if (result.success && result.receipt) {
        if (soundEnabled) playUrnaBeep();
        setReceipt(result.receipt);
        setCountdown(4);
        setStep('fim');
      } else {
        setFormError(result.error || 'Não foi possível registrar o voto.');
        setStep('identify');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDirector = directorCandidates.find((c) => c.id === selectedDirectorId) || directorCandidates[0] || null;
  const activeCoordinator =
    coordinatorCandidates.find((c) => c.id === selectedCoordinatorId) || coordinatorCandidates[0] || null;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-100 via-white to-emerald-50/40 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col family-app-shell">
      {/* Cabeçalho Limpo da Urna */}
      <header className="bg-white/95 dark:bg-neutral-900/95 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 safe-pt">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Vote size={22} />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-black text-neutral-900 dark:text-white truncate">
                Urna Escolar · Diretor e Coordenador
              </div>
              <div className="text-xs text-neutral-500 truncate">
                {selectedSchool?.name || currentInstitution?.name || 'Rede Municipal de Ensino'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              title={soundEnabled ? 'Desativar som da urna' : 'Ativar som da urna'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {selectedSchool && step === 'identify' && (
              <button
                type="button"
                onClick={() => setSchoolLocked((l) => !l)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border cursor-pointer ${
                  schoolLocked
                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
                title="Travar escola selecionada para agilizar fila de votação"
              >
                {schoolLocked ? <Lock size={13} /> : <Unlock size={13} />}
                <span className="hidden sm:inline">{schoolLocked ? 'Urna Travada' : 'Travar Escola'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Corpo Principal Centralizado */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-2xl">
          {/* ETAPA 1: IDENTIFICAÇÃO DO ELEITOR */}
          {step === 'identify' && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="text-center space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                  <ShieldCheck size={14} /> Urna Pronta para o Próximo Eleitor
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                  Identifique-se para Votar
                </h1>
                <p className="text-sm text-neutral-500">
                  Digite seu CPF e confirme seu nome completo. Seu voto é rápido, simples e seguro.
                </p>
              </div>

              {alreadyVotedReceipt && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>Este CPF já registrou voto nesta eleição!</span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Comprovante: <strong className="font-mono">{alreadyVotedReceipt.receiptCode}</strong> •{' '}
                    {new Date(alreadyVotedReceipt.timestamp).toLocaleString('pt-BR')}
                  </p>
                  <button
                    type="button"
                    onClick={resetForNextVoter}
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black cursor-pointer"
                  >
                    Limpar para o Próximo Eleitor
                  </button>
                </div>
              )}

              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-bold flex items-center gap-2">
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleStartVoting} className="space-y-4">
                {!schoolLocked && schools.length > 0 && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                      Unidade Escolar
                    </label>
                    <div className="relative">
                      <School size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <select
                        value={selectedSchool?.id || ''}
                        onChange={(e) => handleSelectSchool(e.target.value)}
                        className="w-full min-h-[52px] pl-11 pr-4 py-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-base font-bold text-neutral-900 dark:text-white"
                      >
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                    CPF do Eleitor (somente números) *
                  </label>
                  <div className="relative">
                    <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      ref={cpfInputRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      autoFocus
                      required
                      value={voterCpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full min-h-[54px] pl-11 pr-11 py-3 rounded-2xl border-2 border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-lg font-black tracking-wider text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    {lookupStatus === 'loading' && (
                      <Loader2
                        size={18}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 animate-spin"
                      />
                    )}
                  </div>
                  {lookupStatus === 'found' && (
                    <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Nome localizado automaticamente ({lookupSource}).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
                    Nome Completo do Eleitor *
                  </label>
                  <div className="relative">
                    <UserCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={voterName}
                      onChange={(e) => {
                        setVoterName(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Digite seu nome completo"
                      className="w-full min-h-[54px] pl-11 pr-4 py-3 rounded-2xl border-2 border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-base font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[58px] py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Verificando...' : 'Iniciar Votação'}</span>
                  <ArrowRight size={20} />
                </button>
              </form>
            </div>
          )}

          {/* ETAPA 2A: VOTO PARA DIRETOR(A) */}
          {step === 'director' && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="text-center space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase tracking-wider">
                  1º Voto de 2 · Cargo de Direção
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                  Voto para Diretor(a) Escolar
                </h2>
                <p className="text-xs text-neutral-500">
                  Eleitor(a): <strong>{voterName}</strong>
                </p>
              </div>

              {directorCandidates.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {directorCandidates.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => setSelectedDirectorId(cand.id)}
                      className={`p-3 rounded-2xl border-2 text-left flex items-center gap-3 cursor-pointer transition-all ${
                        activeDirector?.id === cand.id
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40'
                          : 'border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      <img
                        src={cand.photoUrl}
                        alt={cand.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 bg-neutral-100"
                      />
                      <div className="min-w-0">
                        <div className="font-black text-sm truncate">{cand.name}</div>
                        <div className="text-xs text-neutral-500">Nº {cand.number}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeDirector && (
                <div className="p-5 rounded-3xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 flex flex-col items-center text-center gap-3">
                  <img
                    src={activeDirector.photoUrl}
                    alt={activeDirector.name}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover shadow-md border-4 border-white dark:border-neutral-900"
                  />
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                      {activeDirector.name}
                    </div>
                    {activeDirector.viceName && (
                      <div className="text-sm font-semibold text-neutral-500">
                        Vice: {activeDirector.viceName}
                      </div>
                    )}
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      Você aprova este(a) candidato(a) para Diretor(a)?
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDirectorVoteClick('sim')}
                  className="min-h-[92px] py-5 px-4 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xl sm:text-3xl shadow-xl shadow-emerald-600/25 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  <ThumbsUp size={30} />
                  <span>SIM</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDirectorVoteClick('nao')}
                  className="min-h-[92px] py-5 px-4 rounded-3xl bg-rose-600 hover:bg-rose-700 text-white font-black text-2xl sm:text-3xl shadow-xl shadow-rose-600/25 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  <ThumbsDown size={30} />
                  <span>NÃO</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep('identify')}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  ← Voltar
                </button>
                {election?.allowBlanks !== false && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDirectorVoteClick('branco')}
                    className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-black text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  >
                    Votar em Branco
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ETAPA 2B: VOTO PARA COORDENADOR(A) */}
          {step === 'coordinator' && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="text-center space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-black uppercase tracking-wider">
                  2º Voto de 2 · Coordenação Pedagógica
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                  Voto para Coordenador(a)
                </h2>
                <p className="text-xs text-neutral-500">
                  Eleitor(a): <strong>{voterName}</strong>
                </p>
              </div>

              {coordinatorCandidates.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coordinatorCandidates.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => setSelectedCoordinatorId(cand.id)}
                      className={`p-3 rounded-2xl border-2 text-left flex items-center gap-3 cursor-pointer transition-all ${
                        activeCoordinator?.id === cand.id
                          ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40'
                          : 'border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      <img
                        src={cand.photoUrl}
                        alt={cand.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 bg-neutral-100"
                      />
                      <div className="min-w-0">
                        <div className="font-black text-sm truncate">{cand.name}</div>
                        <div className="text-xs text-neutral-500">Nº {cand.number}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeCoordinator ? (
                <div className="p-5 rounded-3xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 flex flex-col items-center text-center gap-3">
                  <img
                    src={activeCoordinator.photoUrl}
                    alt={activeCoordinator.name}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover shadow-md border-4 border-white dark:border-neutral-900"
                  />
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                      {activeCoordinator.name}
                    </div>
                    <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1">
                      Você aprova este(a) candidato(a) para Coordenador(a)?
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 text-center space-y-1.5">
                  <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                    Coordenação Pedagógica
                  </div>
                  <div className="text-xs text-neutral-500">
                    {selectedSchool?.name || 'Unidade Escolar'}
                  </div>
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400 pt-1">
                    Você aprova a Coordenação Pedagógica desta escola?
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCoordinatorVoteClick('sim')}
                  className="min-h-[92px] py-5 px-4 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xl sm:text-3xl shadow-xl shadow-emerald-600/25 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  <ThumbsUp size={30} />
                  <span>SIM</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCoordinatorVoteClick('nao')}
                  className="min-h-[92px] py-5 px-4 rounded-3xl bg-rose-600 hover:bg-rose-700 text-white font-black text-2xl sm:text-3xl shadow-xl shadow-rose-600/25 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  <ThumbsDown size={30} />
                  <span>NÃO</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep(directorCandidates.length > 0 ? 'director' : 'identify')}
                  className="text-xs font-bold text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  ← Voltar para Diretor(a)
                </button>
                {election?.allowBlanks !== false && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleCoordinatorVoteClick('branco')}
                    className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-black text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  >
                    Votar em Branco
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ETAPA 4: FIM — AUTO-RESET PARA O PRÓXIMO ELEITOR */}
          {step === 'fim' && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border-2 border-emerald-500 p-8 sm:p-12 shadow-2xl text-center space-y-5">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={48} />
              </div>

              <div>
                <div className="text-5xl font-black tracking-widest text-emerald-600">FIM</div>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-2">
                  Voto Confirmado com Sucesso!
                </h2>
                {receipt && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Protocolo: <strong className="font-mono text-neutral-700 dark:text-neutral-300">{receipt.receiptCode}</strong>
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm font-bold">
                Preparando urna para o próximo eleitor em <span className="text-lg font-black">{countdown}s</span>...
              </div>

              <button
                type="button"
                onClick={resetForNextVoter}
                className="w-full min-h-[54px] py-3.5 px-6 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black text-sm uppercase tracking-wider cursor-pointer active:scale-[0.98]"
              >
                Liberar para Próximo Eleitor Agora
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
