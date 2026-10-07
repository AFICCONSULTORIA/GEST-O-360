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
  Check,
  MapPin,
  Phone,
  Building2,
  Cloud,
  CloudOff,
  Database,
  RefreshCw,
  Download,
  UploadCloud
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
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(() => VotingService.getSchools()[0]?.id || '');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [stats, setStats] = useState<SchoolElectionStats | null>(null);

  // Sub-abas do painel
  // 'apuracao' | 'candidatos' | 'escolas' | 'auditoria' | 'config'
  const [activeTab, setActiveTab] = useState<'apuracao' | 'candidatos' | 'escolas' | 'auditoria' | 'config'>('apuracao');

  // Filtro na auditoria
  const [searchAudit, setSearchAudit] = useState('');

  // Filtro e busca de Escolas
  const [searchSchool, setSearchSchool] = useState('');
  const [schoolCategoryFilter, setSchoolCategoryFilter] = useState<string>('ALL');

  // Filtro de Candidatos por Escola
  const [candidateSchoolFilter, setCandidateSchoolFilter] = useState<string>('ALL');

  // Modal de Escola (Nova / Edição)
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolUnit | null>(null);
  const [schoolFormData, setSchoolFormData] = useState({
    name: '',
    code: '',
    category: 'EMEF' as 'CMEI' | 'EMEF' | 'EMEB' | 'Integral',
    address: '',
    neighborhood: '',
    phone: '',
    directorName: '',
    totalVotersEstimated: 450,
    votingStatus: 'open' as 'ready' | 'open' | 'closed'
  });

  // Modal de Candidato (Novo / Edição)
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateFormData, setCandidateFormData] = useState({
    name: '',
    viceName: '',
    number: '',
    schoolId: '',
    photoUrl: '',
    bio: '',
    proposalsText: ''
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de Confirmação para Zerar Urna
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sincronização em Nuvem (Supabase) e Backup
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(() => VotingService.getCloudStatus());
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllData();

    // Sincronização em tempo real entre abas e componentes
    const handleStorageChange = () => {
      loadAllData();
    };

    window.addEventListener('voting-data-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('voting-data-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
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
    setCloudStatus(VotingService.getCloudStatus());

    // Se a escola selecionada não existir mais, seleciona a primeira
    setSelectedSchoolId(prev => {
      const exists = loadedSchools.some(s => s.id === prev);
      const nextId = exists ? prev : (loadedSchools[0]?.id || '');
      updateSchoolData(nextId);
      return nextId;
    });
  };

  const handleTestCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await VotingService.syncFromSupabase();
      setCloudStatus(VotingService.getCloudStatus());
      if (res.success) {
        showToast('Sincronização com Supabase realizada com sucesso!', 'success');
        loadAllData();
      } else {
        showToast('Tabelas de votação ainda não criadas no Supabase. Execute o script SQL no Supabase SQL Editor.', 'warning');
      }
    } catch (e: any) {
      showToast('Erro ao conectar ao Supabase: ' + e.message, 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handlePushLocalToCloud = async () => {
    setIsPushingCloud(true);
    try {
      const res = await VotingService.pushLocalToSupabase();
      setCloudStatus(VotingService.getCloudStatus());
      if (res.success) {
        showToast('Todos os dados locais (escolas e candidatos) foram gravados no Supabase com sucesso!', 'success');
        loadAllData();
      } else {
        showToast('Falha ao enviar para o Supabase: ' + (res.error || 'Verifique se o script SQL foi executado'), 'error');
      }
    } catch (e: any) {
      showToast('Erro ao enviar dados: ' + e.message, 'error');
    } finally {
      setIsPushingCloud(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const json = VotingService.exportBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_votacao_gestao360_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup JSON exportado com sucesso!', 'success');
    } catch (e: any) {
      showToast('Erro ao exportar backup: ' + e.message, 'error');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await VotingService.importBackupJSON(text);
      if (res.success) {
        showToast(`Backup restaurado! ${res.count?.schools || 0} escolas e ${res.count?.candidates || 0} candidatos carregados.`, 'success');
        loadAllData();
      } else {
        showToast(res.error || 'Arquivo de backup inválido', 'error');
      }
    } catch (err: any) {
      showToast('Falha ao ler arquivo: ' + err.message, 'error');
    } finally {
      if (importFileInputRef.current) importFileInputRef.current.value = '';
    }
  };

  const handleCopySQL = () => {
    const sqlCode = `-- GESTÃO 360 · MÓDULO DE VOTAÇÃO
CREATE TABLE IF NOT EXISTS public.edu_voting_schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    category TEXT DEFAULT 'EMEF',
    address TEXT,
    neighborhood TEXT,
    phone TEXT,
    director_name TEXT,
    total_voters_estimated INTEGER DEFAULT 0,
    voting_status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.edu_voting_elections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    school_id TEXT DEFAULT 'ALL',
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'open',
    allow_blanks BOOLEAN DEFAULT true,
    allow_nulls BOOLEAN DEFAULT true,
    allowed_segments TEXT[] DEFAULT ARRAY['responsavel', 'aluno', 'professor', 'funcionario', 'comunidade'],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.edu_voting_candidates (
    id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    number TEXT NOT NULL,
    name TEXT NOT NULL,
    vice_name TEXT,
    photo_url TEXT,
    bio TEXT,
    proposals TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.edu_voting_votes (
    id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    voter_cpf_masked TEXT NOT NULL,
    voter_cpf_clean TEXT NOT NULL,
    voter_name TEXT,
    voter_segment TEXT NOT NULL,
    receipt_code TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_edu_vote_election_cpf UNIQUE (election_id, voter_cpf_clean)
);

CREATE INDEX IF NOT EXISTS idx_edu_voting_candidates_school ON public.edu_voting_candidates(school_id);
CREATE INDEX IF NOT EXISTS idx_edu_voting_candidates_election ON public.edu_voting_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_edu_voting_votes_school ON public.edu_voting_votes(school_id);
CREATE INDEX IF NOT EXISTS idx_edu_voting_votes_election ON public.edu_voting_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_edu_voting_votes_cpf ON public.edu_voting_votes(voter_cpf_clean);

ALTER TABLE public.edu_voting_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público leitura escolas votação" ON public.edu_voting_schools;
CREATE POLICY "Acesso público leitura escolas votação" ON public.edu_voting_schools FOR SELECT USING (true);
DROP POLICY IF EXISTS "Acesso gerenciamento escolas votação" ON public.edu_voting_schools;
CREATE POLICY "Acesso gerenciamento escolas votação" ON public.edu_voting_schools FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso público leitura eleições" ON public.edu_voting_elections;
CREATE POLICY "Acesso público leitura eleições" ON public.edu_voting_elections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Acesso gerenciamento eleições" ON public.edu_voting_elections;
CREATE POLICY "Acesso gerenciamento eleições" ON public.edu_voting_elections FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso público leitura candidatos" ON public.edu_voting_candidates;
CREATE POLICY "Acesso público leitura candidatos" ON public.edu_voting_candidates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Acesso gerenciamento candidatos" ON public.edu_voting_candidates;
CREATE POLICY "Acesso gerenciamento candidatos" ON public.edu_voting_candidates FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso público leitura votos apuração" ON public.edu_voting_votes;
CREATE POLICY "Acesso público leitura votos apuração" ON public.edu_voting_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Acesso registro e gerenciamento votos" ON public.edu_voting_votes;
CREATE POLICY "Acesso registro e gerenciamento votos" ON public.edu_voting_votes FOR ALL USING (true);

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.edu_voting_schools; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.edu_voting_elections; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.edu_voting_candidates; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.edu_voting_votes; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;
    navigator.clipboard.writeText(sqlCode);
    showToast('Script SQL copiado com sucesso! Abra o SQL Editor do Supabase e cole para executar.', 'success');
  };

  const updateSchoolData = (schoolId: string) => {
    if (!schoolId) {
      setCandidates([]);
      setVotes([]);
      setStats(null);
      return;
    }
    const cands = VotingService.getCandidates(schoolId);
    const vts = VotingService.getVotes(schoolId);
    const st = VotingService.getSchoolStats(schoolId);

    setCandidates(cands);
    setVotes(vts);
    setStats(st);
  };

  // --- Ações de Candidato ---
  const handleOpenNewCandidateModal = (targetSchoolId?: string) => {
    if (schools.length === 0) {
      showToast('Cadastre uma escola primeiro para poder registrar candidatos e chapas.', 'warning');
      handleOpenNewSchoolModal();
      return;
    }
    setEditingCandidate(null);
    const chosenSchool = targetSchoolId || 
      (candidateSchoolFilter !== 'ALL' ? candidateSchoolFilter : selectedSchoolId) || 
      schools[0]?.id || 
      '';

    setCandidateFormData({
      name: '',
      viceName: '',
      number: '',
      schoolId: chosenSchool,
      photoUrl: '',
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
      const optimized = await optimizeAvatarImage(file, 260, 0.78);
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
    if (!candidateFormData.name.trim() || !candidateFormData.number.trim()) {
      showToast('Nome e número da chapa são obrigatórios.', 'warning');
      return;
    }

    try {
      const proposals = candidateFormData.proposalsText
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const candidateToSave: Candidate = {
        id: editingCandidate ? editingCandidate.id : 'cand-' + Date.now(),
        electionId: activeElection?.id || 'eleicao-2027-2029',
        schoolId: candidateFormData.schoolId,
        name: candidateFormData.name.trim(),
        viceName: candidateFormData.viceName?.trim() || undefined,
        number: candidateFormData.number.trim(),
        photoUrl: candidateFormData.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
        bio: candidateFormData.bio.trim(),
        proposals: proposals.length > 0 ? proposals : ['Gestão democrática e participativa na unidade escolar.'],
        active: true,
        createdAt: editingCandidate ? editingCandidate.createdAt : new Date().toISOString()
      };

      const saved = VotingService.saveCandidate(candidateToSave);
      setIsCandidateModalOpen(false);

      // Sincroniza a escola selecionada e filtros para o candidato aparecer instantaneamente
      setSelectedSchoolId(saved.schoolId);
      updateSchoolData(saved.schoolId);

      const targetSchoolName = schools.find(s => s.id === saved.schoolId)?.name || 'escola';
      showToast(
        editingCandidate 
          ? `Chapa ${saved.number} (${saved.name}) atualizada com sucesso!` 
          : `Chapa ${saved.number} (${saved.name}) cadastrada e salva com sucesso em ${targetSchoolName}!`, 
        'success'
      );
    } catch (err: any) {
      console.error('Erro ao salvar candidato:', err);
      showToast('Erro ao salvar candidato: ' + (err?.message || 'Verifique os dados.'), 'error');
    }
  };

  const handleDeleteCandidate = (candId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta chapa/candidato?')) {
      VotingService.deleteCandidate(candId);
      updateSchoolData(selectedSchoolId);
      showToast('Candidato removido com sucesso.', 'info');
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

  // --- Ações de Unidades Escolares ---
  const handleOpenNewSchoolModal = () => {
    setEditingSchool(null);
    setSchoolFormData({
      name: '',
      code: `ESC-00${schools.length + 1}`,
      category: 'EMEF',
      address: '',
      neighborhood: '',
      phone: '',
      directorName: '',
      totalVotersEstimated: 450,
      votingStatus: 'open'
    });
    setIsSchoolModalOpen(true);
  };

  const handleOpenEditSchoolModal = (school: SchoolUnit) => {
    setEditingSchool(school);
    setSchoolFormData({
      name: school.name,
      code: school.code,
      category: school.category,
      address: school.address,
      neighborhood: school.neighborhood || '',
      phone: school.phone || '',
      directorName: school.directorName || '',
      totalVotersEstimated: school.totalVotersEstimated || 400,
      votingStatus: school.votingStatus || 'open'
    });
    setIsSchoolModalOpen(true);
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolFormData.name.trim()) {
      showToast('O nome da unidade escolar é obrigatório.', 'warning');
      return;
    }

    const schoolToSave: SchoolUnit = {
      id: editingSchool ? editingSchool.id : `escola-${Date.now()}`,
      name: schoolFormData.name.trim(),
      code: schoolFormData.code.trim() || `ESC-00${schools.length + 1}`,
      category: schoolFormData.category,
      address: schoolFormData.address.trim() || 'Endereço a definir',
      neighborhood: schoolFormData.neighborhood.trim() || undefined,
      phone: schoolFormData.phone.trim() || undefined,
      directorName: schoolFormData.directorName.trim() || undefined,
      totalVotersEstimated: Number(schoolFormData.totalVotersEstimated) || 300,
      votingStatus: schoolFormData.votingStatus,
      createdAt: editingSchool ? editingSchool.createdAt : new Date().toISOString()
    };

    try {
      const saved = VotingService.saveSchool(schoolToSave);
      const updatedSchools = VotingService.getSchools();
      setSchools(updatedSchools);
      setIsSchoolModalOpen(false);

      // Sempre atualiza e seleciona a escola recém-salva para ficar ativa imediatamente
      setSelectedSchoolId(saved.id);
      updateSchoolData(saved.id);

      showToast(
        editingSchool 
          ? `Escola "${saved.name}" atualizada com sucesso!` 
          : `Escola "${saved.name}" cadastrada e salva com sucesso!`, 
        'success'
      );
    } catch (err: any) {
      console.error('Erro ao salvar escola:', err);
      showToast('Erro ao salvar escola: ' + (err?.message || 'Verifique os dados.'), 'error');
    }
  };

  const handleDeleteSchool = (schoolId: string) => {
    const targetSchool = schools.find(s => s.id === schoolId);
    if (!window.confirm(`Tem certeza que deseja excluir a escola "${targetSchool?.name || 'selecionada'}"?`)) {
      return;
    }
    const res = VotingService.deleteSchool(schoolId);
    if (!res.success) {
      showToast(res.error || 'Erro ao remover escola.', 'error');
      return;
    }
    const updatedSchools = VotingService.getSchools();
    setSchools(updatedSchools);
    const nextSchool = updatedSchools[0]?.id || '';
    setSelectedSchoolId(nextSchool);
    updateSchoolData(nextSchool);
    showToast('Escola removida com sucesso.', 'info');
  };

  const handlePurgeMockData = () => {
    if (window.confirm('Deseja remover todas as escolas e candidatos demonstrativos de teste (Darcy Ribeiro, etc.) para utilizar somente dados reais?')) {
      const res = VotingService.purgeMockData();
      loadAllData();
      showToast(`Limpeza concluída! ${res.removedSchools} escola(s) demonstrativa(s) removida(s).`, 'success');
    }
  };

  // Escolas filtradas
  const filteredSchools = schools.filter(s => {
    const matchCategory = schoolCategoryFilter === 'ALL' || s.category === schoolCategoryFilter;
    if (!searchSchool) return matchCategory;
    const q = searchSchool.toLowerCase();
    const matchQuery = s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.neighborhood && s.neighborhood.toLowerCase().includes(q)) ||
      (s.directorName && s.directorName.toLowerCase().includes(q));
    return matchCategory && matchQuery;
  });

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
              {cloudStatus.connected === false && (
                <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 shadow-sm">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                  <span>
                    Atenção: Candidatos e escolas estão salvos apenas nesta máquina. 
                    <button 
                      type="button"
                      onClick={() => setIsSyncModalOpen(true)} 
                      className="underline font-bold ml-1 hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
                    >
                      Clique para ativar sincronização em todos os aparelhos
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Links e Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                cloudStatus.connected === true
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100'
              }`}
              title="Gerenciar sincronização em nuvem e backup"
            >
              {cloudStatus.connected === true ? <Cloud size={15} /> : <CloudOff size={15} />}
              <span>{cloudStatus.connected === true ? 'Nuvem Conectada' : 'Ativar na Nuvem'}</span>
            </button>

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
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 shrink-0">
              <School size={16} className="text-emerald-500" /> Escola:
            </span>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {schools.length === 0 ? (
                <option value="">Nenhuma escola cadastrada</option>
              ) : (
                schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={handleOpenNewSchoolModal}
              title="Cadastrar Nova Unidade Escolar"
              className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Nova Escola</span>
            </button>
          </div>

          {/* Abas */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800/60 p-1.5 rounded-2xl gap-1 overflow-x-auto max-w-full">
            {[
              { id: 'apuracao', label: 'Apuração dos Votos', icon: BarChart3 },
              { id: 'candidatos', label: 'Candidatos & Chapas', icon: Users },
              { id: 'escolas', label: 'Escolas & Urnas', icon: School },
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
      {activeTab === 'apuracao' && schools.length === 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 border border-neutral-100 dark:border-neutral-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-black">
            🏫
          </div>
          <h4 className="text-xl font-black text-neutral-900 dark:text-white">
            Nenhuma Escola Cadastrada
          </h4>
          <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
            Para iniciar o processo eleitoral com dados 100% reais, cadastre a primeira unidade escolar da sua rede municipal.
          </p>
          <button
            type="button"
            onClick={handleOpenNewSchoolModal}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer inline-flex items-center gap-2"
          >
            <Plus size={16} /> Cadastrar Nova Escola Real
          </button>
        </div>
      )}

      {activeTab === 'apuracao' && schools.length > 0 && stats && (
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
      {activeTab === 'candidatos' && (() => {
        const allNetworkCandidates = VotingService.getCandidates('ALL');
        const displayedCandidates = candidateSchoolFilter === 'ALL'
          ? allNetworkCandidates
          : allNetworkCandidates.filter(c => c.schoolId === candidateSchoolFilter);

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Users className="text-emerald-500" size={20} />
                  Chapas e Candidatos Cadastrados
                </h4>
                <p className="text-xs text-neutral-500">Cadastre os candidatos a diretor e vice com suas fotos e planos de gestão.</p>
              </div>

              <button
                onClick={() => handleOpenNewCandidateModal(candidateSchoolFilter !== 'ALL' ? candidateSchoolFilter : undefined)}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Plus size={16} /> Novo Candidato / Chapa
              </button>
            </div>

            {/* Barra de Filtro de Escola para os Candidatos */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-3 border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center gap-2 overflow-x-auto max-w-full">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-400 pl-2 shrink-0 flex items-center gap-1.5">
                <School size={14} className="text-emerald-500" /> Filtrar Escola:
              </span>
              <button
                onClick={() => setCandidateSchoolFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  candidateSchoolFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                Todas as Unidades ({allNetworkCandidates.length})
              </button>
              {schools.map(s => {
                const count = allNetworkCandidates.filter(c => c.schoolId === s.id).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setCandidateSchoolFilter(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                      candidateSchoolFilter === s.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    {s.name} ({count})
                  </button>
                );
              })}
            </div>

            {displayedCandidates.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center border border-neutral-100 dark:border-neutral-800">
                <Users size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-3" />
                <h5 className="font-black text-neutral-700 dark:text-neutral-300 text-base">
                  Nenhum candidato cadastrado nesta seleção
                </h5>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Clique no botão abaixo para registrar a primeira chapa e candidato a diretor escolar.
                </p>
                <button
                  onClick={() => handleOpenNewCandidateModal(candidateSchoolFilter !== 'ALL' ? candidateSchoolFilter : undefined)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Plus size={16} /> Cadastrar Nova Chapa
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedCandidates.map(cand => (
                  <div
                    key={cand.id}
                    className="bg-white dark:bg-neutral-900 rounded-[28px] p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* Escola Vinculada */}
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/20">
                          <School size={12} />
                          {schools.find(s => s.id === cand.schoolId)?.name || 'Rede Municipal'}
                        </span>
                      </div>

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
                            className="p-2 rounded-xl text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title="Editar candidato"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(cand.id)}
                            className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
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
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {cand.proposals.length} propostas no plano
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================== */}
      {/* ABA: ESCOLAS & UNIDADES ESCOLARES */}
      {/* ========================================================== */}
      {activeTab === 'escolas' && (
        <div className="space-y-6">
          
          {/* Header e Ações das Escolas */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h4 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2.5">
                <School className="text-emerald-500" size={24} />
                Unidades Escolares & Urnas da Rede
              </h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-xl">
                Cadastre novas escolas municipais, configure os polos de votação e acompanhe o fluxo eleitoral por unidade.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handlePurgeMockData}
                className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-all cursor-pointer flex items-center gap-2"
                title="Remove escolas e candidatos demonstrativos (Darcy Ribeiro, etc.)"
              >
                <Trash2 size={15} /> Limpar Dados Demonstrativos
              </button>

              <button
                onClick={handleOpenNewSchoolModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Plus size={16} /> Cadastrar Nova Escola
              </button>
            </div>
          </div>

          {/* Cards de Métricas Gerais da Rede */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Total de Escolas</span>
                <h4 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{schools.length}</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Polos eleitorais ativos</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Building2 size={22} />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Eleitores Aptos</span>
                <h4 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                  {schools.reduce((acc, s) => acc + (s.totalVotersEstimated || 0), 0).toLocaleString('pt-BR')}
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">Comunidade escolar estimada</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Chapas Inscritas</span>
                <h4 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                  {VotingService.getCandidates().length}
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">Candidatos a diretor(a)</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Award size={22} />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Votos na Rede</span>
                <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {VotingService.getVotes().length}
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">Votos já computados</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Vote size={22} />
              </div>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            
            {/* Categorias Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ALL', label: `Todas (${schools.length})` },
                { id: 'EMEF', label: `EMEF (${schools.filter(s => s.category === 'EMEF').length})` },
                { id: 'CMEI', label: `CMEI (${schools.filter(s => s.category === 'CMEI').length})` },
                { id: 'EMEB', label: `EMEB (${schools.filter(s => s.category === 'EMEB').length})` },
                { id: 'Integral', label: `Integral (${schools.filter(s => s.category === 'Integral').length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSchoolCategoryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    schoolCategoryFilter === f.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Input de Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
              <input
                type="text"
                placeholder="Buscar por nome, código, bairro..."
                value={searchSchool}
                onChange={(e) => setSearchSchool(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Grid de Escolas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSchools.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center border border-neutral-100 dark:border-neutral-800">
                <School size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-3" />
                <h5 className="font-black text-neutral-700 dark:text-neutral-300 text-base">Nenhuma unidade escolar encontrada</h5>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Altere os termos de busca ou clique no botão abaixo para adicionar uma nova escola à rede.
                </p>
                <button
                  onClick={handleOpenNewSchoolModal}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Plus size={16} /> Cadastrar Nova Escola
                </button>
              </div>
            ) : (
              filteredSchools.map(sch => {
                const schoolCandidates = VotingService.getCandidates(sch.id);
                const schoolVotes = VotingService.getVotes(sch.id);
                const participationRate = Math.min(100, Math.round((schoolVotes.length / (sch.totalVotersEstimated || 1)) * 100));

                const categoryBadge = 
                  sch.category === 'CMEI' ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300' :
                  sch.category === 'EMEF' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                  sch.category === 'EMEB' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                  'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300';

                return (
                  <div 
                    key={sch.id}
                    className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${categoryBadge}`}>
                            {sch.category}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg">
                            {sch.code}
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          sch.votingStatus === 'closed'
                            ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
                            : sch.votingStatus === 'ready'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        }`}>
                          {sch.votingStatus === 'closed' ? 'Encerrada' : sch.votingStatus === 'ready' ? 'Preparada' : 'Urna Ativa'}
                        </span>
                      </div>

                      {/* Nome da Escola */}
                      <h5 className="font-black text-lg text-neutral-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {sch.name}
                      </h5>

                      {/* Informações detalhadas */}
                      <div className="mt-3.5 space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {sch.address}
                            {sch.neighborhood && ` • ${sch.neighborhood}`}
                          </span>
                        </div>

                        {sch.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-neutral-400 shrink-0" />
                            <span>{sch.phone}</span>
                          </div>
                        )}

                        {sch.directorName && (
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-neutral-400 shrink-0" />
                            <span>Direção: <strong className="text-neutral-700 dark:text-neutral-300">{sch.directorName}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Indicadores Eleitorais */}
                      <div className="mt-5 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <span className="text-[10px] font-bold text-neutral-400 block uppercase">Chapas</span>
                            <span className="text-base font-black text-neutral-900 dark:text-white">
                              {schoolCandidates.length}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-neutral-400 block uppercase">Votos</span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              {schoolVotes.length}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-neutral-400 block uppercase">Aptos</span>
                            <span className="text-base font-black text-neutral-700 dark:text-neutral-300">
                              {sch.totalVotersEstimated || 0}
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso de Participação */}
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] font-bold text-neutral-400 mb-1">
                            <span>Participação Eleitoral</span>
                            <span className="text-emerald-600 dark:text-emerald-400">{participationRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${participationRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Ações do Card */}
                    <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedSchoolId(sch.id);
                            setActiveTab('apuracao');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer"
                        >
                          Apuração
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSchoolId(sch.id);
                            handleOpenNewCandidateModal(sch.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          + Chapa
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSchoolModal(sch)}
                          className="p-2 rounded-xl text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          title="Editar escola"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteSchool(sch.id)}
                          className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir escola"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
      {/* MODAL DE CADASTRO / EDIÇÃO DE ESCOLA */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isSchoolModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-[32px] max-w-xl w-full p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <School className="text-emerald-500" size={24} />
                    {editingSchool ? 'Editar Unidade Escolar' : 'Cadastrar Nova Escola'}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Configure os dados da instituição de ensino para o pleito eleitoral.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSchoolModalOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSchool} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Nome da Escola *
                    </label>
                    <input
                      type="text"
                      required
                      value={schoolFormData.name}
                      onChange={(e) => setSchoolFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: EMEF Profª Cora Coralina"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Código / INEP *
                    </label>
                    <input
                      type="text"
                      required
                      value={schoolFormData.code}
                      onChange={(e) => setSchoolFormData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="Ex: ESC-004"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-black font-mono text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Categoria / Nível *
                    </label>
                    <select
                      value={schoolFormData.category}
                      onChange={(e) => setSchoolFormData(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white"
                    >
                      <option value="EMEF">EMEF - Ensino Fundamental</option>
                      <option value="CMEI">CMEI - Educação Infantil</option>
                      <option value="EMEB">EMEB - Educação Básica</option>
                      <option value="Integral">Integral - Tempo Integral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Status da Urna na Escola
                    </label>
                    <select
                      value={schoolFormData.votingStatus}
                      onChange={(e) => setSchoolFormData(prev => ({ ...prev, votingStatus: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white"
                    >
                      <option value="open">Urna Aberta (Recebendo votos)</option>
                      <option value="ready">Pronta (Em preparação / Zerésima)</option>
                      <option value="closed">Encerrada (Votação finalizada)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Endereço da Unidade
                    </label>
                    <input
                      type="text"
                      value={schoolFormData.address}
                      onChange={(e) => setSchoolFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Ex: Av. Brasil, 1500"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Bairro / Região
                    </label>
                    <input
                      type="text"
                      value={schoolFormData.neighborhood}
                      onChange={(e) => setSchoolFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                      placeholder="Ex: Jardim América"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Telefone da Escola
                    </label>
                    <input
                      type="text"
                      value={schoolFormData.phone}
                      onChange={(e) => setSchoolFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Ex: (11) 4567-8900"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Diretor(a) Atual
                    </label>
                    <input
                      type="text"
                      value={schoolFormData.directorName}
                      onChange={(e) => setSchoolFormData(prev => ({ ...prev, directorName: e.target.value }))}
                      placeholder="Ex: Profª Marina Duarte"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      Eleitores Aptos (Est.)
                    </label>
                    <input
                      type="number"
                      min={10}
                      value={schoolFormData.totalVotersEstimated}
                      onChange={(e) => setSchoolFormData(prev => ({ ...prev, totalVotersEstimated: Number(e.target.value) }))}
                      placeholder="Ex: 500"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-bold text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2.5 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsSchoolModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                  >
                    Salvar Escola
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

      {/* ========================================================== */}
      {/* MODAL DE SINCRONIZAÇÃO EM NUVEM E BACKUP */}
      {/* ========================================================== */}
      <AnimatePresence>
        {isSyncModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-[32px] max-w-2xl w-full p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative my-8"
            >
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <Cloud size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-neutral-900 dark:text-white">
                    Sincronização em Nuvem (Supabase)
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Permita que escolas, candidatos e votos funcionem em qualquer computador ou celular.
                  </p>
                </div>
              </div>

              {/* Status Atual da Conexão */}
              {cloudStatus.connected === true ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 mb-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                        Nuvem Supabase Ativa e Conectada!
                      </h5>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                        Todas as escolas, candidatos e votos estão sincronizados na nuvem em tempo real. Qualquer voto realizado em celulares ou computadores da rede municipal será computado e visualizado instantaneamente.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handlePushLocalToCloud}
                      disabled={isPushingCloud}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <UploadCloud size={14} className={isPushingCloud ? 'animate-bounce' : ''} />
                      {isPushingCloud ? 'Enviando...' : 'Reenviar Dados Locais para a Nuvem'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestCloudSync}
                      disabled={isSyncingCloud}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={isSyncingCloud ? 'animate-spin' : ''} />
                      {isSyncingCloud ? 'Atualizando...' : 'Recarregar da Nuvem'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        Por que os dados estão apenas nesta máquina?
                      </h5>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                        Atualmente, as escolas e candidatos cadastrados estão salvos no <strong>armazenamento local (LocalStorage)</strong> do navegador deste computador. Para que o portal de votação funcione em <strong>outros computadores e celulares de eleitores</strong>, é necessário ativar as tabelas no banco de dados central (Supabase).
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-amber-200/60 dark:border-amber-800/40 space-y-3">
                    <h6 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                      Passo a Passo Rápido (Leva 1 minuto):
                    </h6>
                    
                    <div className="text-xs text-amber-800 dark:text-amber-300 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Acesse o <strong>SQL Editor do Supabase</strong> do seu projeto:</span>
                      </div>
                      <div className="pl-7">
                        <a
                          href="https://supabase.com/dashboard/project/gtltiyshhjsizazriwma/sql"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 font-bold hover:underline text-amber-950 dark:text-amber-100"
                        >
                          <ExternalLink size={13} /> Abrir Supabase SQL Editor
                        </a>
                      </div>

                      <div className="flex items-start gap-2 pt-1">
                        <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                        <span>Copie o script SQL pré-configurado:</span>
                      </div>
                      <div className="pl-7">
                        <button
                          type="button"
                          onClick={handleCopySQL}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold hover:bg-neutral-800 transition-all cursor-pointer shadow-sm text-xs"
                        >
                          <Copy size={14} /> Copiar Script SQL de Ativação
                        </button>
                      </div>

                      <div className="flex items-start gap-2 pt-1">
                        <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                        <span>Cole no Supabase, clique em <strong>Run</strong> e depois clique no botão abaixo:</span>
                      </div>
                      <div className="pl-7 pt-1 flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={handleTestCloudSync}
                          disabled={isSyncingCloud}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={isSyncingCloud ? 'animate-spin' : ''} />
                          {isSyncingCloud ? 'Verificando...' : 'Testar e Conectar à Nuvem Agora'}
                        </button>

                        <button
                          type="button"
                          onClick={handlePushLocalToCloud}
                          disabled={isPushingCloud}
                          className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <UploadCloud size={14} className={isPushingCloud ? 'animate-bounce' : ''} />
                          {isPushingCloud ? 'Enviando...' : 'Enviar Dados Desta Máquina para a Nuvem'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Opção Alternativa: Backup & Compartilhamento JSON Imediato */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2.5 mb-2">
                  <Database size={16} className="text-neutral-600 dark:text-neutral-400" />
                  <h5 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                    Backup e Transferência Imediata de Arquivo
                  </h5>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
                  Quer transferir seus candidatos e escolas para outro computador agora mesmo em 5 segundos sem esperar a configuração do banco? Baixe o arquivo e importe no outro computador:
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Download size={14} /> Baixar Backup (.json)
                  </button>

                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Upload size={14} /> Importar Arquivo (.json)
                  </button>
                  <input
                    type="file"
                    ref={importFileInputRef}
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
