import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Vote, 
  School, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Printer, 
  ArrowLeft, 
  Sparkles, 
  UserCheck, 
  FileText, 
  ChevronRight, 
  Info,
  Calendar,
  Lock,
  Sun,
  Moon,
  Search,
  Check,
  X
} from 'lucide-react';
import { VotingService } from './services/votingService';
import { SchoolUnit, Candidate, Election, VoteRecord, VoterSegment, VOTER_SEGMENT_LABELS } from './types/voting';
import { formatCPF, validateCPF, maskCPF } from '../../lib/masks';
import { Institution } from '../../types';

interface PublicVotingPortalProps {
  darkMode?: boolean;
  setDarkMode?: (dark: boolean) => void;
  currentInstitution?: Institution | null;
}

export const PublicVotingPortal: React.FC<PublicVotingPortalProps> = ({
  darkMode = false,
  setDarkMode,
  currentInstitution
}) => {
  // Dados principais
  const [schools, setSchools] = useState<SchoolUnit[]>([]);
  const [election, setElection] = useState<Election | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolUnit | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Fluxo de passos
  // 1: Identificação (CPF + Escola) | 2: Cédula de Votação | 3: Comprovante Concluído
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Formulário do Eleitor
  const [voterName, setVoterName] = useState('');
  const [voterCpf, setVoterCpf] = useState('');
  const [voterSegment, setVoterSegment] = useState<VoterSegment>('responsavel');
  const [cpfError, setCpfError] = useState<string | null>(null);

  // Cédula e Escolha
  // null = nenhum, '__BRANCO__' = branco, '__NULO__' = nulo, ou candidate.id
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateInModal, setCandidateInModal] = useState<Candidate | null>(null); // para ver proposta
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [numericInput, setNumericInput] = useState('');

  // Comprovante
  const [receipt, setReceipt] = useState<VoteRecord | null>(null);
  const [alreadyVotedReceipt, setAlreadyVotedReceipt] = useState<VoteRecord | null>(null);

  // Mensagens e carregamento
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadedSchools = VotingService.getSchools();
    const activeElection = VotingService.getActiveElection();
    setSchools(loadedSchools);
    setElection(activeElection);

    if (loadedSchools.length > 0) {
      setSelectedSchool(loadedSchools[0]);
      setCandidates(VotingService.getCandidates(loadedSchools[0].id));
    }
  }, []);

  const handleSelectSchool = (school: SchoolUnit) => {
    setSelectedSchool(school);
    setCandidates(VotingService.getCandidates(school.id));
    setSelectedCandidateId(null);
    setNumericInput('');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setVoterCpf(formatted);
    setCpfError(null);
  };

  const handleProceedToBallot = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = voterCpf.replace(/\D/g, '');

    if (clean.length !== 11) {
      setCpfError('Digite os 11 números do seu CPF.');
      return;
    }

    if (!validateCPF(voterCpf)) {
      setCpfError('CPF com formato inválido. Por favor, verifique os números digitados.');
      return;
    }

    if (!selectedSchool) {
      setCpfError('Selecione a Unidade Escolar.');
      return;
    }

    // Verificar se o CPF já votou nesta eleição
    const check = VotingService.hasCpfVoted(selectedSchool.id, clean, election?.id);
    if (check.voted && check.vote) {
      setAlreadyVotedReceipt(check.vote);
      return;
    }

    setAlreadyVotedReceipt(null);
    setCpfError(null);
    setStep(2);
  };

  // Teclado numérico na tela ou digitação
  const handleNumericPress = (digit: string) => {
    if (numericInput.length >= 2) return;
    const next = numericInput + digit;
    setNumericInput(next);
    
    // Auto-selecionar candidato se número bater
    const match = candidates.find(c => c.number === next);
    if (match) {
      setSelectedCandidateId(match.id);
    } else if (next.length === 2) {
      // Se digitou 2 números que não existem, vira Nulo
      setSelectedCandidateId('__NULO__');
    }
  };

  const handleClearNumeric = () => {
    setNumericInput('');
    setSelectedCandidateId(null);
  };

  const handleSelectDirectCandidate = (cand: Candidate) => {
    setSelectedCandidateId(cand.id);
    setNumericInput(cand.number);
    setIsConfirmModalOpen(true);
  };

  const handleSelectBlank = () => {
    setSelectedCandidateId('__BRANCO__');
    setNumericInput('BRANCO');
    setIsConfirmModalOpen(true);
  };

  const handleSelectNull = () => {
    setSelectedCandidateId('__NULO__');
    setNumericInput('NULO');
    setIsConfirmModalOpen(true);
  };

  const handleConfirmVote = () => {
    if (!election || !selectedSchool || !selectedCandidateId) return;

    setIsSubmitting(true);
    try {
      const result = VotingService.castVote({
        electionId: election.id,
        schoolId: selectedSchool.id,
        candidateId: selectedCandidateId,
        voterCpf,
        voterName: voterName || undefined,
        voterSegment
      });

      if (result.success && result.receipt) {
        setReceipt(result.receipt);
        setIsConfirmModalOpen(false);
        setStep(3);
      } else {
        alert(result.error || 'Erro ao registrar voto.');
      }
    } catch (e: any) {
      alert('Erro ao registrar voto: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleNewVote = () => {
    setStep(1);
    setVoterCpf('');
    setVoterName('');
    setSelectedCandidateId(null);
    setNumericInput('');
    setReceipt(null);
    setAlreadyVotedReceipt(null);
  };

  const getCandidateChosen = () => {
    if (selectedCandidateId === '__BRANCO__') {
      return { isBlank: true, name: 'VOTO EM BRANCO', number: 'BRANCO', vice: '' };
    }
    if (selectedCandidateId === '__NULO__') {
      return { isNull: true, name: 'VOTO NULO', number: 'NULO', vice: '' };
    }
    return candidates.find(c => c.id === selectedCandidateId) || null;
  };

  const chosen = getCandidateChosen();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Header Oficial */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 px-4 md:px-8 py-3.5 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Vote size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm md:text-base text-neutral-900 dark:text-white leading-tight">
                  {currentInstitution?.name || 'Prefeitura Municipal'} • Educação
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  Eleição Oficial
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Votação Direta para Diretores Escolares • Gestão 2027/2029
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {setDarkMode && (
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer"
                title="Alternar tema"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-xs font-bold">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Voto Único e Sigiloso por CPF</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 flex flex-col justify-center">
        
        {/* Banner de Aviso de Eleição Ativa */}
        {election && step !== 3 && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs md:text-sm text-emerald-800 dark:text-emerald-200 print:hidden">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>{election.title}</strong> está aberta para votação pública. Cada cidadão pode votar uma única vez por CPF.
              </span>
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-200/60 dark:bg-emerald-500/30 font-black text-xs text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Urna Aberta
            </span>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASSO 1: IDENTIFICAÇÃO DO ELEITOR & ESCOLA */}
        {/* ======================================================== */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200 dark:border-neutral-800 shadow-xl p-6 md:p-10 max-w-2xl mx-auto w-full"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-sm">
                <UserCheck size={32} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                Identificação do Eleitor
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
                Para garantir a lisura e transparência do pleito escolar, informe seu CPF e selecione a escola onde deseja votar.
              </p>
            </div>

            {/* Aviso se o CPF já votou */}
            {alreadyVotedReceipt && (
              <div className="mb-6 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-black text-base">Este CPF já registrou voto!</h4>
                    <p className="text-xs mt-1 text-amber-800 dark:text-amber-300">
                      O eleitor portador do CPF <strong>{alreadyVotedReceipt.voterCpfMasked}</strong> já exerceu seu direito de voto na unidade escolar em{' '}
                      <strong>{new Date(alreadyVotedReceipt.timestamp).toLocaleString('pt-BR')}</strong>. O voto é único e intransferível.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReceipt(alreadyVotedReceipt);
                          setStep(3);
                        }}
                        className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <FileText size={14} /> Ver Comprovante Emitido
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlreadyVotedReceipt(null)}
                        className="px-4 py-2 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold hover:bg-neutral-100 transition-all border border-neutral-200 dark:border-neutral-700"
                      >
                        Informar outro CPF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleProceedToBallot} className="space-y-6">
              
              {/* Seleção da Escola */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5">
                  <School size={15} className="text-emerald-500" />
                  1. Unidade Escolar
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {schools.map(school => (
                    <div
                      key={school.id}
                      onClick={() => handleSelectSchool(school)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedSchool?.id === school.id
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/20'
                          : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                          selectedSchool?.id === school.id
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}>
                          {school.category}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">{school.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{school.address}</p>
                        </div>
                      </div>
                      {selectedSchool?.id === school.id && (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CPF do Eleitor */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5">
                  <Lock size={15} className="text-emerald-500" />
                  2. CPF do Eleitor (Obrigatório para checagem anti-duplicidade)
                </label>
                <input
                  type="text"
                  required
                  value={voterCpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`w-full px-4 py-3.5 rounded-2xl border text-base font-bold transition-all bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 ${
                    cpfError 
                      ? 'border-rose-400 focus:ring-rose-400' 
                      : 'border-neutral-200 dark:border-neutral-700 focus:border-emerald-500 focus:ring-emerald-500/20'
                  }`}
                />
                {cpfError && (
                  <p className="text-xs font-bold text-rose-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={13} /> {cpfError}
                  </p>
                )}
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Seu CPF é verificado para evitar votos duplicados. A escolha do candidato é 100% secreta.
                </p>
              </div>

              {/* Nome do Eleitor (Opcional) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                  3. Nome Completo (Opcional - para constar no comprovante)
                </label>
                <input
                  type="text"
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Segmento do Eleitor */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
                  4. Seu Segmento na Comunidade Escolar
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(VOTER_SEGMENT_LABELS) as VoterSegment[]).map(seg => (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setVoterSegment(seg)}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                        voterSegment === seg
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-300'
                      }`}
                    >
                      <span>{VOTER_SEGMENT_LABELS[seg]}</span>
                      {voterSegment === seg && <Check size={14} className="shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 mt-8"
              >
                Acessar Cédula de Votação
                <ChevronRight size={20} />
              </button>
            </form>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* PASSO 2: CÉDULA DE VOTAÇÃO ELETRÔNICA */}
        {/* ======================================================== */}
        {step === 2 && selectedSchool && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Header da Cédula */}
            <div className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200 dark:border-neutral-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Voltar para identificação"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Cédula Eleitoral Oficial
                  </span>
                  <h2 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white">
                    {selectedSchool.name}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Eleitor: <strong>{voterName || 'Anônimo'}</strong> • CPF: <strong>{maskCPF(voterCpf)}</strong> ({VOTER_SEGMENT_LABELS[voterSegment]})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-2xl">
                <span className="text-xs font-bold text-neutral-500">Número Digitado:</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-widest min-w-[50px] text-center">
                  {numericInput || '__'}
                </span>
              </div>
            </div>

            {/* Grid dos Candidatos */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Vote className="text-emerald-500" size={18} />
                  Candidatos(as) Concorrentes a Diretor(a)
                </h3>
                <span className="text-xs text-neutral-500 font-bold">
                  {candidates.length} {candidates.length === 1 ? 'chapa inscrita' : 'chapas inscritas'}
                </span>
              </div>

              {candidates.length === 0 ? (
                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center border border-neutral-200 dark:border-neutral-800">
                  <p className="text-neutral-500 font-medium">Nenhum candidato cadastrado para esta escola ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {candidates.map(cand => (
                    <div 
                      key={cand.id}
                      className={`bg-white dark:bg-neutral-900 rounded-[28px] p-6 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                        selectedCandidateId === cand.id
                          ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-500/20 scale-[1.01]'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-emerald-300 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Top Chapa Badge */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={cand.photoUrl} 
                              alt={cand.name}
                              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-md bg-neutral-100" 
                            />
                            <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white font-black text-xs px-2 py-0.5 rounded-lg shadow-sm font-mono">
                              Chapa {cand.number}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                              Candidato(a) a Diretor(a)
                            </span>
                            <h4 className="text-lg font-black text-neutral-900 dark:text-white leading-tight mt-0.5">
                              {cand.name}
                            </h4>
                            {cand.viceName && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                Vice: <strong>{cand.viceName}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {cand.number}
                          </span>
                        </div>
                      </div>

                      {/* Bio resumida */}
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 mb-4">
                        {cand.bio}
                      </p>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          type="button"
                          onClick={() => setCandidateInModal(cand)}
                          className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Info size={14} /> Propostas
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleSelectDirectCandidate(cand)}
                          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            selectedCandidateId === cand.id
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          <Vote size={15} />
                          {selectedCandidateId === cand.id ? 'Selecionado ✓' : 'Votar nesta Chapa'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Urna com Teclado Numérico e Voto em Branco / Nulo */}
            <div className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-200 dark:border-neutral-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <h4 className="font-black text-sm text-neutral-900 dark:text-white uppercase tracking-wider">
                  Outras Opções de Voto
                </h4>
                <p className="text-xs text-neutral-500">
                  Em conformidade com a legislação democrática eleitoral, você pode manifestar voto em branco ou nulo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleSelectBlank}
                  className={`flex-1 md:flex-none px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer border ${
                    selectedCandidateId === '__BRANCO__'
                      ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white border-neutral-400 shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  Voto em Branco
                </button>

                <button
                  type="button"
                  onClick={handleSelectNull}
                  className={`flex-1 md:flex-none px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer border ${
                    selectedCandidateId === '__NULO__'
                      ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-rose-600 dark:text-rose-400 border-neutral-200 dark:border-neutral-700 hover:bg-rose-50'
                  }`}
                >
                  Voto Nulo
                </button>

                {selectedCandidateId && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="w-full md:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 animate-bounce"
                  >
                    Confirmar Voto
                    <CheckCircle2 size={18} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* PASSO 3: COMPROVANTE OFICIAL DE COMPARECIMENTO */}
        {/* ======================================================== */}
        {step === 3 && receipt && selectedSchool && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto w-full space-y-6"
          >
            {/* Banner de Celebração */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[32px] p-8 text-white text-center shadow-xl shadow-emerald-500/20 relative overflow-hidden print:hidden">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} className="text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                Voto Registrado com Sucesso! 🗳️
              </h2>
              <p className="text-emerald-100 text-sm mt-1 max-w-md mx-auto">
                Obrigado por fortalecer a gestão democrática da nossa educação municipal. Seu voto foi computado sigilosamente.
              </p>
            </div>

            {/* Cédula / Comprovante Oficial Imprimível */}
            <div 
              id="comprovante-eleitoral"
              className="bg-white text-neutral-900 rounded-[32px] p-8 md:p-10 border-2 border-neutral-200 shadow-xl relative overflow-hidden print:m-0 print:border-none print:shadow-none"
            >
              {/* Brasão / Cabeçalho do Comprovante */}
              <div className="text-center pb-6 border-b-2 border-neutral-100">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                  Secretaria Municipal de Educação
                </span>
                <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight mt-0.5">
                  Comprovante de Comparecimento Eleitoral
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  Eleição de Diretores Escolares • Gestão 2027/2029
                </p>
              </div>

              {/* Dados do Eleitor */}
              <div className="py-6 space-y-3.5 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                  <span className="text-neutral-500 font-bold">Unidade Escolar:</span>
                  <span className="font-black text-neutral-900 text-right">{selectedSchool.name}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                  <span className="text-neutral-500 font-bold">Eleitor:</span>
                  <span className="font-bold text-neutral-900">{receipt.voterName || 'Eleitor Cadastrado'}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                  <span className="text-neutral-500 font-bold">CPF do Eleitor:</span>
                  <span className="font-mono font-black text-neutral-900">{receipt.voterCpfMasked}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                  <span className="text-neutral-500 font-bold">Segmento:</span>
                  <span className="font-bold text-neutral-900">{VOTER_SEGMENT_LABELS[receipt.voterSegment]}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                  <span className="text-neutral-500 font-bold">Data e Hora do Voto:</span>
                  <span className="font-mono font-bold text-neutral-900">
                    {new Date(receipt.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-neutral-100 bg-emerald-50/50 p-2 rounded-xl">
                  <span className="text-emerald-800 font-bold">Código de Autenticação:</span>
                  <span className="font-mono font-black text-emerald-700 tracking-wider text-base">{receipt.receiptCode}</span>
                </div>
              </div>

              {/* Aviso de Sigilo do Voto */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 text-xs text-neutral-500 text-center space-y-1">
                <p className="font-bold text-neutral-700">🔒 Sigilo Eleitoral Assegurado</p>
                <p>
                  Por determinação legal, este comprovante certifica apenas a participação do eleitor no pleito. A opção de voto é anônima e inviolável.
                </p>
              </div>

              {/* Rodapé do comprovante */}
              <div className="mt-6 pt-4 text-center text-[10px] text-neutral-400 border-t border-neutral-100">
                Emitido eletronicamente via Sistema Gestão 360 Educação • Validação pública na Secretaria de Educação
              </div>
            </div>

            {/* Ações pós-voto */}
            <div className="flex flex-col sm:flex-row gap-3 print:hidden">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-4 px-6 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-black text-sm uppercase tracking-wider hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Imprimir Comprovante
              </button>

              <button
                type="button"
                onClick={handleNewVote}
                className="py-4 px-6 rounded-2xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-sm transition-all cursor-pointer text-center"
              >
                Concluir / Novo Voto
              </button>
            </div>
          </motion.div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMAÇÃO DO VOTO (ESTILO URNA ELETRÔNICA) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isConfirmModalOpen && chosen && selectedSchool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-[36px] max-w-md w-full p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative"
            >
              <div className="text-center mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                  Confirmação de Voto
                </span>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-1">
                  Revise sua Escolha
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Escola: <strong>{selectedSchool.name}</strong>
                </p>
              </div>

              {/* Card de revisão do candidato */}
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 mb-6">
                {'photoUrl' in chosen && chosen.photoUrl ? (
                  <div className="flex items-center gap-4">
                    <img src={chosen.photoUrl} alt={chosen.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/30 bg-white" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                        Chapa {chosen.number}
                      </span>
                      <h4 className="text-base font-black text-neutral-900 dark:text-white leading-tight">
                        {chosen.name}
                      </h4>
                      {chosen.viceName && (
                        <p className="text-xs text-neutral-500 mt-0.5">Vice: {chosen.viceName}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <span className="text-2xl font-black font-mono text-neutral-900 dark:text-white">
                      {chosen.name}
                    </span>
                    <p className="text-xs text-neutral-500 mt-1">Opção oficial registrada em ata eleitoral</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs mb-6 text-center">
                <p className="font-bold">Atenção: Voto único e irrevogável!</p>
                <p className="text-[11px] mt-0.5">Após clicar em CONFIRMA, seu voto será gravado e um comprovante será gerado.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="py-3.5 px-4 rounded-xl bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/30 dark:hover:bg-orange-950/50 text-orange-700 dark:text-orange-300 font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  CORRIGE
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmVote}
                  className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Gravando...' : 'CONFIRMA'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL DE PROPOSTAS DO CANDIDATO */}
      {/* ======================================================== */}
      <AnimatePresence>
        {candidateInModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-[32px] max-w-lg w-full p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setCandidateInModal(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <img 
                  src={candidateInModal.photoUrl} 
                  alt={candidateInModal.name} 
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/30 bg-neutral-100" 
                />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 font-mono">
                    Chapa {candidateInModal.number}
                  </span>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white leading-tight">
                    {candidateInModal.name}
                  </h3>
                  {candidateInModal.viceName && (
                    <p className="text-xs text-neutral-500 mt-0.5">Vice: {candidateInModal.viceName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500 mb-1">
                    Biografia & Trajetória
                  </h4>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {candidateInModal.bio}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                    Principais Propostas do Plano de Gestão
                  </h4>
                  <ul className="space-y-2">
                    {candidateInModal.proposals.map((prop, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{prop}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectDirectCandidate(candidateInModal);
                    setCandidateInModal(null);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Selecionar esta Chapa para Votar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-xs text-neutral-400 border-t border-neutral-200/50 dark:border-neutral-800/50 print:hidden">
        Gestão 360 Educação • Módulo Oficial de Eleições de Diretores Escolares
      </footer>
    </div>
  );
};
