import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Sparkles,
  Trophy,
  Users,
  RefreshCw,
  Trash2,
  Printer,
  Play,
  RotateCcw,
  CheckCircle2,
  UserCheck,
  Award
} from 'lucide-react';
import { Institution } from '../../../types';
import { DeclarationCampaign, DeclarationSubmission } from '../types/certificates';
import {
  fetchDeclarationCampaigns,
  fetchDeclarationSubmissions
} from '../services/certificateService';
import { showToast } from '../../../components/ui/Toast';

interface EventRafflePanelProps {
  currentInstitution?: Institution | null;
}

interface RaffleWinner {
  id: string;
  order: number;
  submissionId: string;
  name: string;
  cpfMasked: string;
  email?: string;
  prize?: string;
  drawnAt: string;
}

function maskCpf(cpf?: string): string {
  const digits = (cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) return cpf || '—';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

export const EventRafflePanel: React.FC<EventRafflePanelProps> = ({ currentInstitution }) => {
  const [campaigns, setCampaigns] = useState<DeclarationCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [submissions, setSubmissions] = useState<DeclarationSubmission[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(true);
  const [loadingSubs, setLoadingSubs] = useState<boolean>(false);

  const [onlyCompletedTwoStages, setOnlyCompletedTwoStages] = useState<boolean>(false);
  const [prizeInput, setPrizeInput] = useState<string>('');
  const [winners, setWinners] = useState<RaffleWinner[]>([]);

  // Estados da animação de suspense
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spotlightName, setSpotlightName] = useState<string>('');
  const [revealedWinner, setRevealedWinner] = useState<RaffleWinner | null>(null);
  const spinTimerRef = useRef<number | null>(null);

  const storageKey = selectedCampaignId
    ? `gestao360_raffle_winners_${selectedCampaignId}`
    : '';

  useEffect(() => {
    const load = async () => {
      if (!currentInstitution?.id) {
        setLoadingCampaigns(false);
        return;
      }
      setLoadingCampaigns(true);
      try {
        const list = await fetchDeclarationCampaigns(currentInstitution.id);
        setCampaigns(list);
        if (list.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(list[0].id);
        }
      } catch {
        showToast('Erro ao carregar eventos de QR Code.', 'error');
      } finally {
        setLoadingCampaigns(false);
      }
    };
    load();
  }, [currentInstitution?.id]);

  const loadParticipants = async (campaignId: string) => {
    if (!campaignId) return;
    setLoadingSubs(true);
    try {
      const rows = await fetchDeclarationSubmissions(campaignId);
      setSubmissions(rows);
    } catch {
      showToast('Erro ao buscar participantes do evento.', 'error');
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    if (!selectedCampaignId) return;
    setRevealedWinner(null);
    setSpotlightName('');
    loadParticipants(selectedCampaignId);

    try {
      const raw = localStorage.getItem(`gestao360_raffle_winners_${selectedCampaignId}`);
      setWinners(raw ? JSON.parse(raw) : []);
    } catch {
      setWinners([]);
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
    };
  }, []);

  const persistWinners = (next: RaffleWinner[]) => {
    setWinners(next);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Participantes únicos que confirmaram presença no QR Code
  const uniqueParticipants = useMemo(() => {
    const byKey = new Map<string, DeclarationSubmission>();
    for (const s of submissions) {
      if (onlyCompletedTwoStages && s.emission_status !== 'emitido') continue;
      const key = (s.participant_cpf || '').replace(/\D/g, '') || s.id;
      if (!byKey.has(key)) {
        byKey.set(key, s);
      }
    }
    return Array.from(byKey.values());
  }, [submissions, onlyCompletedTwoStages]);

  // Participantes elegíveis (excluindo quem já ganhou para não repetir ganhador)
  const eligibleParticipants = useMemo(() => {
    const winnerSubIds = new Set(winners.map((w) => w.submissionId));
    const winnerCpfs = new Set(winners.map((w) => w.cpfMasked));
    return uniqueParticipants.filter(
      (p) => !winnerSubIds.has(p.id) && !winnerCpfs.has(maskCpf(p.participant_cpf))
    );
  }, [uniqueParticipants, winners]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  const handleStartRaffle = () => {
    if (isSpinning) return;
    if (eligibleParticipants.length === 0) {
      showToast(
        uniqueParticipants.length === 0
          ? 'Nenhum participante com presença confirmada no QR Code para este evento.'
          : 'Todos os participantes elegíveis já foram sorteados!',
        'warning'
      );
      return;
    }

    const chosen = eligibleParticipants[secureRandomInt(eligibleParticipants.length)];
    setIsSpinning(true);
    setRevealedWinner(null);

    // Sequência de desaceleração dramática (~3.4s) para gerar suspense
    const totalSteps = 28;
    let step = 0;

    const tick = () => {
      step += 1;
      if (step < totalSteps) {
        const preview = eligibleParticipants[secureRandomInt(eligibleParticipants.length)];
        setSpotlightName(preview.participant_name);

        // Começa rápido (45ms) e vai desacelerando até 340ms nos últimos nomes
        const progress = step / totalSteps;
        const delay = Math.round(45 + Math.pow(progress, 2.4) * 310);
        spinTimerRef.current = window.setTimeout(tick, delay);
      } else {
        const newWinner: RaffleWinner = {
          id: crypto.randomUUID(),
          order: winners.length + 1,
          submissionId: chosen.id,
          name: chosen.participant_name,
          cpfMasked: maskCpf(chosen.participant_cpf),
          email: chosen.participant_email,
          prize: prizeInput.trim() || undefined,
          drawnAt: new Date().toISOString(),
        };
        setSpotlightName(chosen.participant_name);
        setRevealedWinner(newWinner);
        persistWinners([newWinner, ...winners]);
        setPrizeInput('');
        setIsSpinning(false);
      }
    };

    tick();
  };

  const handleRemoveWinner = (id: string) => {
    const filtered = winners
      .filter((w) => w.id !== id)
      .map((w, idx, arr) => ({ ...w, order: arr.length - idx }));
    persistWinners(filtered);
    if (revealedWinner?.id === id) setRevealedWinner(null);
  };

  const handleClearWinners = () => {
    persistWinners([]);
    setRevealedWinner(null);
    setSpotlightName('');
    showToast('Lista de ganhadores limpa. Todos os participantes voltaram ao sorteio.', 'info');
  };

  const handlePrintWinners = () => {
    if (winners.length === 0) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      showToast('Permita pop-ups para imprimir a lista de ganhadores.', 'warning');
      return;
    }
    const ordered = [...winners].sort((a, b) => a.order - b.order);
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Ganhadores do Sorteio — ${selectedCampaign?.title || 'Evento'}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 24px; font-size: 12px; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          p { margin: 0 0 16px; color: #475569; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #1e293b; color: #fff; font-size: 11px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>Lista Oficial de Ganhadores do Sorteio</h1>
        <p>${currentInstitution?.name || ''} &bull; Evento: <strong>${selectedCampaign?.title || '—'}</strong> &bull; Total de Participantes: ${uniqueParticipants.length}</p>
        <table>
          <thead>
            <tr>
              <th style="width:60px;text-align:center">#</th>
              <th>Participante Sorteado</th>
              <th style="width:130px">CPF</th>
              <th>Prêmio / Brinde</th>
              <th style="width:90px;text-align:center">Horário</th>
            </tr>
          </thead>
          <tbody>
            ${ordered
              .map(
                (w) => `<tr>
                  <td style="text-align:center;font-weight:800">${w.order}º</td>
                  <td><strong>${w.name}</strong></td>
                  <td>${w.cpfMasked}</td>
                  <td>${w.prize || '—'}</td>
                  <td style="text-align:center">${new Date(w.drawnAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Seletor do Evento */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Evento / Lista de Presença (QR Code)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                disabled={loadingCampaigns || isSpinning}
                className="flex-1 min-w-[240px] px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold text-neutral-900 dark:text-white"
              >
                {campaigns.length === 0 && <option value="">Nenhum evento QR Code cadastrado</option>}
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.event_date_start})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => loadParticipants(selectedCampaignId)}
                disabled={!selectedCampaignId || loadingSubs || isSpinning}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-xs font-bold text-neutral-700 dark:text-neutral-200 disabled:opacity-50"
                title="Atualizar lista de presentes do QR Code"
              >
                <RefreshCw size={14} className={loadingSubs ? 'animate-spin' : ''} />
                <span>Atualizar Presenças</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyCompletedTwoStages}
                onChange={(e) => setOnlyCompletedTwoStages(e.target.checked)}
                disabled={isSpinning}
                className="accent-indigo-600 rounded"
              />
              <span>Apenas quem emitiu declaração</span>
            </label>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-black text-indigo-700 dark:text-indigo-300">
              <Users size={15} />
              <span>{eligibleParticipants.length} apto(s)</span>
              <span className="text-indigo-400 font-semibold">/ {uniqueParticipants.length} presentes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Palco do Sorteio + Lista de Ganhadores ao Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Esquerda (7 cols): Palco com Animação de Suspense */}
        <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-black uppercase tracking-wider text-amber-300">
              <Gift size={14} />
              <span>Sorteio Ao Vivo</span>
            </div>
            <span className="text-xs font-semibold text-indigo-200">
              {selectedCampaign ? selectedCampaign.title : 'Selecione um evento'}
            </span>
          </div>

          {/* Campo opcional de Prêmio/Brinde */}
          <div className="mb-6">
            <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1.5">
              Prêmio / Brinde desta rodada (Opcional)
            </label>
            <input
              type="text"
              value={prizeInput}
              onChange={(e) => setPrizeInput(e.target.value)}
              disabled={isSpinning}
              placeholder="Ex: 1º Prêmio — Kit Educacional / Cesta / Vale-Brinde..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm font-bold text-white placeholder:text-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Visor Central de Suspense */}
          <div className="min-h-[210px] rounded-2xl bg-black/35 border border-white/15 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center relative">
            <AnimatePresence mode="wait">
              {isSpinning ? (
                <motion.div
                  key="spinning"
                  initial={{ opacity: 0.5, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3 w-full"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-widest animate-pulse">
                    <Sparkles size={14} />
                    <span>Sorteando...</span>
                  </div>
                  <motion.div
                    key={spotlightName}
                    initial={{ y: 12, opacity: 0.4 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.08 }}
                    className="text-2xl sm:text-4xl font-black tracking-tight text-white break-words"
                  >
                    {spotlightName}
                  </motion.div>
                </motion.div>
              ) : revealedWinner ? (
                <motion.div
                  key={revealedWinner.id}
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="space-y-3"
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Trophy size={30} />
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest text-amber-300">
                    {revealedWinner.order}º Ganhador(a) Sorteado(a)!
                  </div>
                  <div className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                    {revealedWinner.name}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-indigo-200">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 font-mono">
                      CPF: {revealedWinner.cpfMasked}
                    </span>
                    {revealedWinner.prize && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-bold">
                        {revealedWinner.prize}
                      </span>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <Award size={38} className="mx-auto text-indigo-300/70" />
                  <p className="text-base font-bold text-indigo-100">
                    Pronto para sortear!
                  </p>
                  <p className="text-xs text-indigo-300 max-w-md">
                    {eligibleParticipants.length > 0
                      ? `${eligibleParticipants.length} participante(s) confirmado(s) no QR Code aguardando o sorteio.`
                      : 'Selecione um evento com presenças confirmadas para iniciar.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Botão Principal de Sortear */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleStartRaffle}
              disabled={isSpinning || eligibleParticipants.length === 0}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
            >
              <Play size={18} fill="currentColor" />
              <span>{isSpinning ? 'Sorteando...' : winners.length > 0 ? 'Sortear Próximo Ganhador' : 'Iniciar Sorteio'}</span>
            </button>
          </div>
        </div>

        {/* Direita (5 cols): Lista Oficial de Ganhadores (Sem Repetição) */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Trophy size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                  Ganhadores ({winners.length})
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Excluídos automaticamente dos próximos sorteios
                </p>
              </div>
            </div>

            {winners.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrintWinners}
                  className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  title="Imprimir lista de ganhadores"
                >
                  <Printer size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleClearWinners}
                  disabled={isSpinning}
                  className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"
                  title="Zerar lista de ganhadores"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            )}
          </div>

          {winners.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400 space-y-2">
              <UserCheck size={28} className="mx-auto text-neutral-300 dark:text-neutral-700" />
              <p>Nenhum ganhador sorteado ainda neste evento.</p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
              {winners.map((w) => (
                <div
                  key={w.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      {w.order}º
                    </span>
                    <div className="min-w-0">
                      <div className="font-black text-sm text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{w.name}</span>
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      </div>
                      <div className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-2">
                        <span className="font-mono">{w.cpfMasked}</span>
                        {w.prize && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold">
                            {w.prize}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWinner(w.id)}
                    disabled={isSpinning}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40"
                    title="Remover da lista (devolver ao sorteio)"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
