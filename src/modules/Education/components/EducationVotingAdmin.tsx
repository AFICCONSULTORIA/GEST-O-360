import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Vote, 
  School, 
  Users, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Camera, 
  Upload, 
  Search, 
  FileText, 
  Award, 
  ShieldCheck, 
  X,
  Lock,
  Calendar,
  Check
} from 'lucide-react';
import { VotingService } from '../services/votingService';
import { SchoolUnit, Candidate, Election, VoteRecord, SchoolElectionStats, VoterSegment, VOTER_SEGMENT_LABELS } from '../types/voting';
import { optimizeAvatarImage } from './EducationAvatar';
import { showToast } from '../../../components/ui/Toast';

export const EducationVotingAdmin: React.FC = () => {
  // Dados de estado
  const [schools, setSchools] = useState<SchoolUnit[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [activeElection, setActiveElection] = useState<Election | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('escola-darcy-ribeiro');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [stats, setStats] = useState<SchoolElectionStats | null>(null);

  // Sub-abas do painel
  // 'apuracao' | 'candidatos' | 'auditoria' | 'config'
  const [activeTab, setActiveTab] = useState<'apuracao' | 'candidatos' | 'auditoria' | 'config'>('apuracao');

  // Filtro na auditoria
  const [searchAudit, setSearchAudit] = useState('');

  // Modal de Candidato (Novo / Edição)
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateFormData, setCandidateFormData] = useState({
    name: '',
    viceName: '',
    number: '',
    schoolId: 'escola-darcy-ribeiro',
    photoUrl: '',
    bio: '',
    proposalsText: ''
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Confirmação para Zerar Urna
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedSchoolId) {
      updateSchoolData(selectedSchoolId);
    }
  }, [selectedSchoolId]);

  const loadAllData = () => {
    const loadedSchools = VotingService.getSchools();
    const loadedElections = VotingService.getElections();
    const currentElection = VotingService.getActiveElection();

    setSchools(loadedSchools);
    setElections(loadedElections);
    setActiveElection(currentElection);

    const defaultSchool = loadedSchools[0]?.id || 'escola-darcy-ribeiro';
    setSelectedSchoolId(defaultSchool);
    updateSchoolData(defaultSchool);
  };

  const updateSchoolData = (schoolId: string) => {
    const cands = VotingService.getCandidates(schoolId);
    const vts = VotingService.getVotes(schoolId);
    const st = VotingService.getSchoolStats(schoolId);

    setCandidates(cands);
    setVotes(vts);
    setStats(st);
  };

  // --- Ações de Candidato ---
  const handleOpenNewCandidateModal = () => {
    setEditingCandidate(null);
    setCandidateFormData({
      name: '',
      viceName: '',
      number: '',
      schoolId: selectedSchoolId,
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
      bio: '',
      proposalsText: ''
    });
    setIsCandidateModalOpen(true);
  };

  const handleOpenEditCandidateModal = (cand: Candidate) => {
    setEditingCandidate(cand);
    setCandidateFormData({
      name: cand.name,
      viceName: cand.viceName || '',
      number: cand.number,
      schoolId: cand.schoolId,
      photoUrl: cand.photoUrl,
      bio: cand.bio,
      proposalsText: cand.proposals.join('\n')
    });
    setIsCandidateModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const optimized = await optimizeAvatarImage(file, 400, 0.85);
      setCandidateFormData(prev => ({ ...prev, photoUrl: optimized }));
      showToast('Foto do candidato anexada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao processar imagem.', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateFormData.name || !candidateFormData.number) {
      showToast('Nome e número da chapa são obrigatórios.', 'warning');
      return;
    }

    const proposals = candidateFormData.proposalsText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const candidateToSave: Candidate = {
      id: editingCandidate ? editingCandidate.id : 'cand-' + Date.now(),
      electionId: activeElection?.id || 'eleicao-2027-2029',
      schoolId: candidateFormData.schoolId,
      name: candidateFormData.name,
      viceName: candidateFormData.viceName || undefined,
      number: candidateFormData.number,
      photoUrl: candidateFormData.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
      bio: candidateFormData.bio,
      proposals: proposals.length > 0 ? proposals : ['Gestão democrática e participativa na unidade escolar.'],
      active: true,
      createdAt: editingCandidate ? editingCandidate.createdAt : new Date().toISOString()
    };

    VotingService.saveCandidate(candidateToSave);
    setIsCandidateModalOpen(false);
    updateSchoolData(selectedSchoolId);
    showToast(editingCandidate ? 'Candidato atualizado com sucesso!' : 'Candidato cadastrado com sucesso!', 'success');
  };

  const handleDeleteCandidate = (candId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta chapa/candidato?')) {
      VotingService.deleteCandidate(candId);
      updateSchoolData(selectedSchoolId);
      showToast('Candidato removido.', 'info');
    }
  };

  // --- Alteração de Status da Eleição ---
  const handleUpdateElectionStatus = (status: 'open' | 'upcoming' | 'closed') => {
    if (!activeElection) return;
    const updated: Election = { ...activeElection, status };
    VotingService.saveElection(updated);
    setActiveElection(updated);
    showToast(`Status da eleição alterado para: ${status === 'open' ? 'Aberta' : status === 'upcoming' ? 'Em Breve' : 'Encerrada'}`, 'success');
  };

  // --- Zerar Urna ---
  const handleConfirmResetVotes = () => {
    VotingService.resetSchoolVotes(selectedSchoolId);
    updateSchoolData(selectedSchoolId);
    setIsResetModalOpen(false);
    showToast('Urna desta escola zerada para novo pleito.', 'info');
  };

  const handleCopyVotingLink = () => {
    const url = window.location.origin + '/votacao';
    navigator.clipboard.writeText(url);
    showToast('Link público copiado: ' + url, 'success');
  };

  const handlePrintBoletim = () => {
    window.print();
  };

  // Auditoria filtrada
  const filteredVotes = votes.filter(v => {
    if (!searchAudit) return true;
    const q = searchAudit.toLowerCase();
    return (
      v.voterCpfMasked.includes(q) ||
      (v.voterName && v.voterName.toLowerCase().includes(q)) ||
      v.receiptCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      
      {/* Header do Módulo de Votação da Secretaria */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 border border-neutral-100 dark:border-neutral-800 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Vote size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
                  Eleição de Diretores Escolares
                </h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  activeElection?.status === 'open'
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : activeElection?.status === 'upcoming'
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}>
                  {activeElection?.status === 'open' ? 'Urna Aberta' : activeElection?.status === 'upcoming' ? 'Em Breve' : 'Encerrada'}
                </span>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Apuração em tempo real, gestão de candidatos e auditoria de votos com proteção anti-duplicidade por CPF.
              </p>
            </div>
          </div>

          {/* Links e Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={handleCopyVotingLink}
              className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Copy size={15} /> Copiar Link (/votacao)
            </button>

            <a
              href="/votacao"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-emerald-200 dark:border-emerald-500/30"
            >
              <ExternalLink size={15} /> Abrir Cédula Pública
            </a>

            <button
              onClick={handlePrintBoletim}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer hover:bg-neutral-800 shadow-md"
            >
              <Printer size={15} /> Boletim de Urna
            </button>
          </div>
        </div>

        {/* Barra de Seleção de Escola e Abas Internas */}
        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Seletor de Escola */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 shrink-0">
              <School size={16} className="text-emerald-500" /> Escola:
            </span>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
              ))}
            </select>
          </div>

          {/* Abas */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800/60 p-1.5 rounded-2xl gap-1">
            {[
              { id: 'apuracao', label: 'Apuração dos Votos', icon: BarChart3 },
              { id: 'candidatos', label: 'Candidatos & Chapas', icon: Users },
              { id: 'auditoria', label: 'Auditoria (CPFs)', icon: ShieldCheck },
              { id: 'config', label: 'Configuração da Urna', icon: Lock },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* ABA 1: APURAÇÃO DOS VOTOS EM TEMPO REAL */}
      {/* ========================================================== */}
      {activeTab === 'apuracao' && stats && (
        <div className="space-y-6">
          
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Total de Votos</span>
                <h4 className="text-3xl font-black text-neutral-900 dark:text-white mt-1">{stats.totalVotes}</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Votos computados na urna</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
                🗳️
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Votos Válidos</span>
                <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.validVotes}</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {stats.totalVotes > 0 ? Math.round((stats.validVotes / stats.totalVotes) * 100) : 0}% dos votos
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
                ✓
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Brancos e Nulos</span>
                <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {stats.blankVotes + stats.nullVotes}
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Brancos: {stats.blankVotes} • Nulos: {stats.nullVotes}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
                ⚪
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Eleitorado Estimado</span>
                <h4 className="text-3xl font-black text-sky-600 dark:text-sky-400 mt-1">
                  {stats.totalVotes > 0 ? Math.round((stats.totalVotes / (stats.totalVotes + 150)) * 100) : 0}%
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">Quórum de participação</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 flex items-center justify-center font-black">
                👥
              </div>
            </div>
          </div>

          {/* Gráfico / Ranking de Votação das Chapas */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div>
                <h4 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="text-emerald-500" size={20} />
                  Resultado da Apuração: {stats.schoolName}
                </h4>
                <p className="text-xs text-neutral-500">Classificação atual dos candidatos ordenados por número de votos.</p>
              </div>

              {stats.tallies.length > 0 && stats.tallies[0].votes > 0 && (
                <div className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-2">
                  <Award size={16} className="text-amber-500" />
                  <span>Liderando: <strong>{stats.tallies[0].candidateName}</strong> ({stats.tallies[0].percentage}%)</span>
                </div>
              )}
            </div>

            {stats.tallies.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 text-sm">
                Nenhum candidato cadastrado para esta escola.
              </div>
            ) : (
              <div className="space-y-5">
                {stats.tallies.map((cand, index) => (
                  <div key={cand.candidateId} className="space-y-2 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                          index === 0 && cand.votes > 0
                            ? 'bg-amber-400 text-neutral-900'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}>
                          {index + 1}º
                        </span>
                        
                        <img 
                          src={cand.photoUrl} 
                          alt={cand.candidateName} 
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/20 bg-white" 
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-neutral-900 dark:text-white">
                              {cand.candidateName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black font-mono">
                              Chapa {cand.candidateNumber}
                            </span>
                          </div>
                          {cand.viceName && (
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Vice: {cand.viceName}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black text-neutral-900 dark:text-white font-mono">
                          {cand.votes} {cand.votes === 1 ? 'voto' : 'votos'}
                        </span>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{cand.percentage}% dos válidos</p>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          index === 0 && cand.votes > 0
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/30'
                            : 'bg-neutral-400 dark:bg-neutral-500'
                        }`}
                        style={{ width: `${Math.max(cand.percentage, 1)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Distribuição por Segmento de Eleitores */}
            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800">
              <h5 className="text-xs font-black uppercase tracking-wider text-neutral-500 mb-3">
                Distribuição de Participação por Segmento
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(Object.keys(VOTER_SEGMENT_LABELS) as VoterSegment[]).map(seg => (
                  <div key={seg} className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-center">
                    <span className="text-base font-black text-neutral-900 dark:text-white">
                      {stats.segmentDistribution[seg] || 0}
                    </span>
                    <p className="text-[10px] font-bold text-neutral-500 truncate mt-0.5">
                      {VOTER_SEGMENT_LABELS[seg]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 2: GERENCIAMENTO DE CANDIDATOS & FOTOS */}
      {/* ========================================================== */}
      {activeTab === 'candidatos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Users className="text-emerald-500" size={20} />
                Chapas e Candidatos Cadastrados
              </h4>
              <p className="text-xs text-neutral-500">Cadastre os candidatos a diretor e vice com suas fotos e planos de gestão.</p>
            </div>

            <button
              onClick={handleOpenNewCandidateModal}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Plus size={16} /> Novo Candidato / Chapa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {candidates.map(cand => (
              <div
                key={cand.id}
                className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="relative">
                      <img 
                        src={cand.photoUrl} 
                        alt={cand.name}
                        className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-500/30 bg-neutral-100" 
                      />
                      <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white font-black text-xs px-2 py-0.5 rounded-lg shadow-sm font-mono">
                        Chapa {cand.number}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCandidateModal(cand)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        title="Editar candidato"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCandidate(cand.id)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Excluir candidato"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h5 className="font-black text-base text-neutral-900 dark:text-white leading-tight">
                    {cand.name}
                  </h5>
                  {cand.viceName && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Vice: <strong>{cand.viceName}</strong>
                    </p>
                  )}

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3 mt-3">
                    {cand.bio}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                    {cand.proposals.length} propostas no plano
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 3: AUDITORIA DE VOTOS (CPFs E RECIBOS) */}
      {/* ========================================================== */}
      {activeTab === 'auditoria' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-500" size={20} />
                Auditoria de Votos e Comprovantes
              </h4>
              <p className="text-xs text-neutral-500">
                Lista de todos os eleitores que registraram voto para conferência contra duplicidade.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por CPF ou Código..."
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400 uppercase tracking-wider font-black border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">CPF (Mascarado)</th>
                  <th className="py-3 px-4">Nome do Eleitor</th>
                  <th className="py-3 px-4">Segmento</th>
                  <th className="py-3 px-4">Código de Autenticação</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredVotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400">
                      Nenhum registro de voto encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredVotes.map(v => (
                    <tr key={v.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td className="py-3 px-4 font-mono font-medium text-neutral-600 dark:text-neutral-300">
                        {new Date(v.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-neutral-900 dark:text-white">
                        {v.voterCpfMasked}
                      </td>
                      <td className="py-3 px-4 font-bold text-neutral-800 dark:text-neutral-200">
                        {v.voterName || 'Anônimo'}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                        {VOTER_SEGMENT_LABELS[v.voterSegment] || v.voterSegment}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {v.receiptCode}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          Computado ✓
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 4: CONFIGURAÇÃO DA URNA ELETRÔNICA */}
      {/* ========================================================== */}
      {activeTab === 'config' && activeElection && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-8">
          <div>
            <h4 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Lock className="text-emerald-500" size={20} />
              Controles e Parâmetros da Eleição
            </h4>
            <p className="text-xs text-neutral-500">Gerencie a vigência do pleito e reinício da urna eletrônica.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Status da Votação</span>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleUpdateElectionStatus('open')}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    activeElection.status === 'open' ? 'bg-emerald-600 text-white shadow-md' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  Aberta
                </button>
                <button
                  onClick={() => handleUpdateElectionStatus('upcoming')}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    activeElection.status === 'upcoming' ? 'bg-amber-500 text-white shadow-md' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  Em Breve
                </button>
                <button
                  onClick={() => handleUpdateElectionStatus('closed')}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                    activeElection.status === 'closed' ? 'bg-rose-600 text-white shadow-md' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  Encerrada
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Período de Votação</span>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                {activeElection.startDate} até {activeElection.endDate}
              </p>
              <p className="text-[11px] text-neutral-500">Horário: 08:00 às 17:00 (Horário de Brasília)</p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Segurança de Dados</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck size={16} /> Anti-duplicidade Ativa
              </p>
              <p className="text-[11px] text-neutral-500">1 voto único por CPF na unidade escolar</p>
            </div>
          </div>

          {/* Área de Risco: Zerar Urna */}
          <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h5 className="font-black text-rose-800 dark:text-rose-200 text-sm flex items-center gap-2">
                <AlertTriangle size={18} /> Zerar Urna Eletrônica
              </h5>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Esta ação apaga todos os votos registrados para a escola selecionada. Utilize apenas para testes ou homologação.
              </p>
            </div>

            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              Zerar Urna
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE CANDIDATO COM FOTO */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isCandidateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-[32px] max-w-xl w-full p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsCandidateModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-1">
                {editingCandidate ? 'Editar Candidato(a)' : 'Cadastrar Candidato(a) a Diretor'}
              </h3>
              <p className="text-xs text-neutral-500 mb-6">
                Informe os dados da chapa, foto do candidato e propostas de gestão.
              </p>

              <form onSubmit={handleSaveCandidate} className="space-y-4">
                
                {/* Upload e Foto do Candidato */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-2">
                    Foto do Candidato
                  </label>
                  <div className="flex items-center gap-4">
                    <img 
                      src={candidateFormData.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400'} 
                      alt="Preview" 
                      className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-500/30 bg-neutral-100 shadow-sm"
                    />

                    <div className="flex-1 space-y-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePhotoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Camera size={15} />
                        {isUploadingPhoto ? 'Processando foto...' : 'Escolher Foto do Computador'}
                      </button>

                      <input
                        type="text"
                        placeholder="Ou cole a URL da imagem aqui"
                        value={candidateFormData.photoUrl}
                        onChange={(e) => setCandidateFormData(prev => ({ ...prev, photoUrl: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Nome do(a) Candidato(a) a Diretor(a) *
                    </label>
                    <input
                      type="text"
                      required
                      value={candidateFormData.name}
                      onChange={(e) => setCandidateFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Profª Helena Souza"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Número da Chapa *
                    </label>
                    <input
                      type="text"
                      required
                      value={candidateFormData.number}
                      onChange={(e) => setCandidateFormData(prev => ({ ...prev, number: e.target.value }))}
                      placeholder="Ex: 10"
                      maxLength={4}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-black font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Nome do(a) Vice-Diretor(a)
                    </label>
                    <input
                      type="text"
                      value={candidateFormData.viceName}
                      onChange={(e) => setCandidateFormData(prev => ({ ...prev, viceName: e.target.value }))}
                      placeholder="Ex: Prof. Carlos Eduardo"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Escola Vinculada
                    </label>
                    <select
                      value={candidateFormData.schoolId}
                      onChange={(e) => setCandidateFormData(prev => ({ ...prev, schoolId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white font-bold"
                    >
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Minibiografia / Apresentação
                  </label>
                  <textarea
                    rows={2}
                    value={candidateFormData.bio}
                    onChange={(e) => setCandidateFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tempo de docência, formação e experiência pedagógica..."
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Propostas de Gestão (uma por linha)
                  </label>
                  <textarea
                    rows={4}
                    value={candidateFormData.proposalsText}
                    onChange={(e) => setCandidateFormData(prev => ({ ...prev, proposalsText: e.target.value }))}
                    placeholder="Climatização de salas&#10;Laboratório de informática maker&#10;Contraturno pedagógico..."
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white font-mono"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-2.5 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsCandidateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/25 transition-all"
                  >
                    Salvar Candidato
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* MODAL DE CONFIRMAÇÃO PARA ZERAR URNA */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-[32px] max-w-md w-full p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>

              <h4 className="text-xl font-black text-neutral-900 dark:text-white">
                Zerar Urna desta Escola?
              </h4>
              <p className="text-xs text-neutral-500 mt-1">
                Você está prestes a excluir todos os votos registrados para a unidade <strong>{schools.find(s => s.id === selectedSchoolId)?.name}</strong>. Esta ação não poderá ser desfeita.
              </p>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-neutral-600 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetVotes}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider shadow-md"
                >
                  Sim, Zerar Urna
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
