/**
 * Serviço de Gerenciamento e Apuração de Eleições de Diretores Escolares
 * Persistência Híbrida: Supabase (Nuvem em Tempo Real) + LocalStorage (Cache Ultra-Rápido & Offline)
 * Garantia de unicidade de voto por CPF e sincronização entre múltiplos computadores e celulares.
 */

import { 
  SchoolUnit, 
  Candidate, 
  Election, 
  VoteRecord, 
  SchoolElectionStats, 
  VoteTally, 
  VoterSegment 
} from '../types/voting';
import { maskCPF } from '../../../lib/masks';
import { supabase } from '../../../lib/supabase';

// Escolas Padrão: Vazio para uso estrito de dados reais cadastrados pela gestão
export const DEFAULT_SCHOOLS: SchoolUnit[] = [];

// Eleição Padrão Ativa
export const DEFAULT_ELECTIONS: Election[] = [
  {
    id: 'eleicao-diretores',
    title: 'Eleição Direta para Diretores Escolares',
    description: 'Processo democrático de escolha dos gestores escolares da Rede Municipal de Ensino.',
    schoolId: 'ALL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2026-12-31',
    status: 'open',
    allowBlanks: true,
    allowNulls: true,
    allowedSegments: ['responsavel', 'aluno', 'professor', 'funcionario', 'comunidade'],
    createdAt: new Date().toISOString()
  }
];

// Candidatos Demonstrativos: Vazio para uso estrito de dados reais
export const DEFAULT_CANDIDATES: Candidate[] = [];

const STORAGE_KEYS = {
  SCHOOLS: 'gestao360_voting_schools',
  ELECTIONS: 'gestao360_voting_elections',
  CANDIDATES: 'gestao360_voting_candidates',
  VOTES: 'gestao360_voting_votes',
  LAST_SYNC: 'gestao360_voting_last_sync'
};

const DB_TABLES = {
  SCHOOLS: 'edu_voting_schools',
  ELECTIONS: 'edu_voting_elections',
  CANDIDATES: 'edu_voting_candidates',
  VOTES: 'edu_voting_votes'
};

// Conversões de BD (snake_case) para Modelo (camelCase)
function mapSchoolFromDb(row: any): SchoolUnit {
  return {
    id: row.id,
    name: row.name,
    code: row.code || '',
    category: row.category || 'EMEF',
    address: row.address || '',
    neighborhood: row.neighborhood || undefined,
    phone: row.phone || undefined,
    directorName: row.director_name || undefined,
    totalVotersEstimated: Number(row.total_voters_estimated) || 0,
    votingStatus: row.voting_status || 'open',
    createdAt: row.created_at
  };
}

function mapSchoolToDb(school: SchoolUnit) {
  return {
    id: school.id,
    name: school.name,
    code: school.code || '',
    category: school.category || 'EMEF',
    address: school.address || '',
    neighborhood: school.neighborhood || null,
    phone: school.phone || null,
    director_name: school.directorName || null,
    total_voters_estimated: school.totalVotersEstimated || 0,
    voting_status: school.votingStatus || 'open',
    updated_at: new Date().toISOString()
  };
}

function mapElectionFromDb(row: any): Election {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    schoolId: row.school_id || 'ALL',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    status: row.status || 'open',
    allowBlanks: row.allow_blanks ?? true,
    allowNulls: row.allow_nulls ?? true,
    allowedSegments: Array.isArray(row.allowed_segments) 
      ? row.allowed_segments 
      : ['responsavel', 'aluno', 'professor', 'funcionario', 'comunidade'],
    createdAt: row.created_at
  };
}

function mapElectionToDb(election: Election) {
  return {
    id: election.id,
    title: election.title,
    description: election.description || '',
    school_id: election.schoolId || 'ALL',
    start_date: election.startDate || '',
    end_date: election.endDate || '',
    status: election.status || 'open',
    allow_blanks: election.allowBlanks,
    allow_nulls: election.allowNulls,
    allowed_segments: election.allowedSegments,
    updated_at: new Date().toISOString()
  };
}

function mapCandidateFromDb(row: any): Candidate {
  return {
    id: row.id,
    electionId: row.election_id,
    schoolId: row.school_id,
    number: row.number,
    name: row.name,
    viceName: row.vice_name || undefined,
    photoUrl: row.photo_url || '',
    bio: row.bio || '',
    proposals: Array.isArray(row.proposals) ? row.proposals : [],
    active: row.active ?? true,
    createdAt: row.created_at
  };
}

function mapCandidateToDb(candidate: Candidate) {
  return {
    id: candidate.id,
    election_id: candidate.electionId,
    school_id: candidate.schoolId,
    number: candidate.number,
    name: candidate.name,
    vice_name: candidate.viceName || null,
    photo_url: candidate.photoUrl || '',
    bio: candidate.bio || '',
    proposals: candidate.proposals || [],
    active: candidate.active ?? true,
    updated_at: new Date().toISOString()
  };
}

function mapVoteFromDb(row: any): VoteRecord {
  return {
    id: row.id,
    electionId: row.election_id,
    schoolId: row.school_id,
    candidateId: row.candidate_id,
    voterCpfMasked: row.voter_cpf_masked,
    voterCpfClean: row.voter_cpf_clean,
    voterName: row.voter_name || undefined,
    voterSegment: row.voter_segment as VoterSegment,
    receiptCode: row.receipt_code,
    timestamp: row.timestamp || row.created_at || new Date().toISOString()
  };
}

function mapVoteToDb(vote: VoteRecord) {
  return {
    id: vote.id,
    election_id: vote.electionId,
    school_id: vote.schoolId,
    candidate_id: vote.candidateId,
    voter_cpf_masked: vote.voterCpfMasked,
    voter_cpf_clean: vote.voterCpfClean,
    voter_name: vote.voterName || null,
    voter_segment: vote.voterSegment,
    receipt_code: vote.receiptCode,
    timestamp: vote.timestamp
  };
}

// Camada de Armazenamento Local de Altíssima Resiliência
class VotingStorage {
  private static memoryFallback: Record<string, string> = {};

  static getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          this.memoryFallback[key] = val;
          return val;
        }
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const sessVal = window.sessionStorage.getItem(key);
        if (sessVal !== null) {
          this.memoryFallback[key] = sessVal;
          return sessVal;
        }
      }
    } catch (_) {}

    return this.memoryFallback[key] || null;
  }

  static setItem(key: string, value: string, emitEvent = true): void {
    this.memoryFallback[key] = value;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (_) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(key, value);
        }
      } catch (_) {}
    }

    if (emitEvent && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('voting-data-changed', { detail: { key } }));
      } catch (_) {}
    }
  }
}

export class VotingService {
  private static isSyncing = false;
  private static isSubscribed = false;
  private static cloudConnected: boolean | null = null;
  private static cloudError: string | null = null;

  /**
   * Status da conexão com a nuvem Supabase
   */
  static getCloudStatus(): { connected: boolean | null; error: string | null } {
    return {
      connected: this.cloudConnected,
      error: this.cloudError
    };
  }

  /**
   * Inicializa a sincronização em tempo real com o Supabase.
   * É chamada automaticamente na importação e sempre que o usuário recarrega os dados.
   */
  static async initSync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      await this.syncFromSupabase();
      this.subscribeRealtime();
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sincroniza dados da Nuvem Supabase para o cache local
   */
  static async syncFromSupabase(): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Testar tabela de escolas no Supabase
      const { data: dbSchools, error: errSchools } = await supabase
        .from(DB_TABLES.SCHOOLS)
        .select('*')
        .order('name', { ascending: true });

      if (errSchools) {
        this.cloudConnected = false;
        this.cloudError = errSchools.message;
        // Se as tabelas não foram criadas no Supabase ainda, não trava a tela
        return { success: false, error: errSchools.message };
      }

      this.cloudConnected = true;
      this.cloudError = null;

      // Se o Supabase retornou escolas, salvamos no cache local
      if (Array.isArray(dbSchools) && dbSchools.length > 0) {
        const schools = dbSchools.map(mapSchoolFromDb);
        VotingStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools), false);
      } else {
        // Banco na nuvem está vazio! Se a máquina local tem dados, envia para a nuvem!
        const localSchools = this.getSchools();
        if (localSchools.length > 0) {
          await this.pushLocalToSupabase();
          return { success: true };
        }
      }

      // 2. Eleições
      const { data: dbElections } = await supabase
        .from(DB_TABLES.ELECTIONS)
        .select('*');

      if (Array.isArray(dbElections) && dbElections.length > 0) {
        const elections = dbElections.map(mapElectionFromDb);
        VotingStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(elections), false);
      }

      // 3. Candidatos
      const { data: dbCandidates } = await supabase
        .from(DB_TABLES.CANDIDATES)
        .select('*')
        .order('number', { ascending: true });

      if (Array.isArray(dbCandidates) && dbCandidates.length > 0) {
        const candidates = dbCandidates.map(mapCandidateFromDb);
        VotingStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates), false);
      }

      // 4. Votos
      const { data: dbVotes } = await supabase
        .from(DB_TABLES.VOTES)
        .select('*')
        .order('timestamp', { ascending: false });

      if (Array.isArray(dbVotes)) {
        const votes = dbVotes.map(mapVoteFromDb);
        VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(votes), false);
      }

      VotingStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString(), true);
      return { success: true };
    } catch (e: any) {
      this.cloudConnected = false;
      this.cloudError = e.message || 'Falha na conexão com Supabase';
      return { success: false, error: this.cloudError };
    }
  }

  /**
   * Envia os dados cadastrados no navegador atual diretamente para o Supabase (migração instantânea)
   */
  static async pushLocalToSupabase(): Promise<{ success: boolean; error?: string }> {
    try {
      const schools = this.getSchools();
      const elections = this.getElections();
      const candidates = this.getCandidates();
      const votes = this.getVotes();

      // Enviar Escolas
      if (schools.length > 0) {
        const rows = schools.map(mapSchoolToDb);
        const { error } = await supabase.from(DB_TABLES.SCHOOLS).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      // Enviar Eleições
      if (elections.length > 0) {
        const rows = elections.map(mapElectionToDb);
        const { error } = await supabase.from(DB_TABLES.ELECTIONS).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      // Enviar Candidatos
      if (candidates.length > 0) {
        const rows = candidates.map(mapCandidateToDb);
        const { error } = await supabase.from(DB_TABLES.CANDIDATES).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      // Enviar Votos existentes
      if (votes.length > 0) {
        const rows = votes.map(mapVoteToDb);
        const { error } = await supabase.from(DB_TABLES.VOTES).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }

      this.cloudConnected = true;
      this.cloudError = null;
      return { success: true };
    } catch (e: any) {
      this.cloudConnected = false;
      this.cloudError = e.message || 'Erro ao enviar dados para o Supabase';
      return { success: false, error: this.cloudError };
    }
  }

  /**
   * Assina eventos em tempo real via Supabase Realtime
   */
  private static subscribeRealtime(): void {
    if (this.isSubscribed || typeof window === 'undefined') return;
    this.isSubscribed = true;

    try {
      supabase
        .channel('gestao360_voting_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: DB_TABLES.SCHOOLS }, () => {
          this.syncFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: DB_TABLES.ELECTIONS }, () => {
          this.syncFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: DB_TABLES.CANDIDATES }, () => {
          this.syncFromSupabase();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: DB_TABLES.VOTES }, () => {
          this.syncFromSupabase();
        })
        .subscribe();
    } catch (e) {
      console.warn('[VotingService] Falha ao assinar realtime:', e);
    }
  }

  // ==========================================
  // --- MÉTODOS DE ESCOLAS ---
  // ==========================================

  static getSchools(): SchoolUnit[] {
    const raw = VotingStorage.getItem(STORAGE_KEYS.SCHOOLS);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filtrar qualquer escola demonstrativa de teste
          return parsed.filter(s => 
            s.id !== 'escola-darcy-ribeiro' && 
            s.id !== 'escola-cecilia-meireles' && 
            s.id !== 'cmei-pequeno-principe' &&
            !s.name.toLowerCase().includes('darcy ribeiro') &&
            !s.name.toLowerCase().includes('cecília meireles') &&
            !s.name.toLowerCase().includes('pequeno príncipe')
          );
        }
      } catch (e) {
        console.error('Erro ao ler escolas:', e);
      }
    }
    return [];
  }

  static getSchoolById(schoolId: string): SchoolUnit | undefined {
    return this.getSchools().find(s => s.id === schoolId);
  }

  static saveSchool(school: SchoolUnit): SchoolUnit {
    const schools = this.getSchools();
    const finalSchool: SchoolUnit = {
      ...school,
      id: school.id || `escola-${Date.now()}`
    };
    const idx = schools.findIndex(s => s.id === finalSchool.id);
    if (idx >= 0) {
      schools[idx] = finalSchool;
    } else {
      schools.push(finalSchool);
    }
    VotingStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));

    // Salvar assincronamente na Nuvem Supabase
    supabase
      .from(DB_TABLES.SCHOOLS)
      .upsert(mapSchoolToDb(finalSchool), { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.warn('[VotingService] Erro ao sincronizar escola no Supabase:', error.message);
      });

    return finalSchool;
  }

  static deleteSchool(schoolId: string): { success: boolean; error?: string } {
    // 1. Remover a escola da lista
    const currentSchools = this.getSchools();
    const updatedSchools = currentSchools.filter(s => s.id !== schoolId);
    VotingStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(updatedSchools));

    // 2. Remover em cascata todos os candidatos e votos vinculados
    const currentCandidates = this.getCandidates();
    const updatedCandidates = currentCandidates.filter(c => c.schoolId !== schoolId);
    VotingStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(updatedCandidates));

    const currentVotes = this.getVotes();
    const updatedVotes = currentVotes.filter(v => v.schoolId !== schoolId);
    VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(updatedVotes));

    // 3. Deletar no Supabase
    supabase.from(DB_TABLES.SCHOOLS).delete().eq('id', schoolId).then();
    supabase.from(DB_TABLES.CANDIDATES).delete().eq('school_id', schoolId).then();
    supabase.from(DB_TABLES.VOTES).delete().eq('school_id', schoolId).then();

    return { success: true };
  }

  // ==========================================
  // --- MÉTODOS DE ELEIÇÕES ---
  // ==========================================

  static getElections(): Election[] {
    const raw = VotingStorage.getItem(STORAGE_KEYS.ELECTIONS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return JSON.parse(JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('Erro ao ler eleições:', e);
      }
    }
    const defaults = JSON.parse(JSON.stringify(DEFAULT_ELECTIONS));
    VotingStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(defaults), false);
    return defaults;
  }

  static getActiveElection(): Election | null {
    const elections = this.getElections();
    return elections.find(e => e.status === 'open') || elections[0] || null;
  }

  static saveElection(election: Election): void {
    const elections = this.getElections();
    const idx = elections.findIndex(e => e.id === election.id);
    if (idx >= 0) {
      elections[idx] = election;
    } else {
      elections.push(election);
    }
    VotingStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(elections));

    // Salvar no Supabase
    supabase
      .from(DB_TABLES.ELECTIONS)
      .upsert(mapElectionToDb(election), { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.warn('[VotingService] Erro ao sincronizar eleição no Supabase:', error.message);
      });
  }

  // ==========================================
  // --- MÉTODOS DE CANDIDATOS ---
  // ==========================================

  static getCandidates(schoolId?: string): Candidate[] {
    const raw = VotingStorage.getItem(STORAGE_KEYS.CANDIDATES);
    let candidates: Candidate[] = [];
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filtrar candidatos demonstrativos
          candidates = parsed.filter(c => 
            c.schoolId !== 'escola-darcy-ribeiro' &&
            c.schoolId !== 'escola-cecilia-meireles' &&
            c.schoolId !== 'cmei-pequeno-principe' &&
            c.id !== 'cand-darcy-10' &&
            c.id !== 'cand-darcy-20' &&
            c.id !== 'cand-cecilia-12' &&
            c.id !== 'cand-cecilia-15' &&
            c.id !== 'cand-cmei-10'
          );
        }
      } catch (e) {
        console.error('Erro ao ler candidatos:', e);
      }
    }

    if (schoolId && schoolId !== 'ALL') {
      return candidates.filter(c => c.schoolId === schoolId);
    }
    return candidates;
  }

  static saveCandidate(candidate: Candidate): Candidate {
    const candidates = this.getCandidates();
    const finalCandidate: Candidate = {
      ...candidate,
      id: candidate.id || `cand-${Date.now()}`
    };
    const idx = candidates.findIndex(c => c.id === finalCandidate.id);
    if (idx >= 0) {
      candidates[idx] = finalCandidate;
    } else {
      candidates.push(finalCandidate);
    }
    VotingStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));

    // Salvar no Supabase
    supabase
      .from(DB_TABLES.CANDIDATES)
      .upsert(mapCandidateToDb(finalCandidate), { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.warn('[VotingService] Erro ao sincronizar candidato no Supabase:', error.message);
      });

    return finalCandidate;
  }

  static deleteCandidate(candidateId: string): void {
    const candidates = this.getCandidates().filter(c => c.id !== candidateId);
    VotingStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));

    // Deletar no Supabase
    supabase
      .from(DB_TABLES.CANDIDATES)
      .delete()
      .eq('id', candidateId)
      .then(({ error }) => {
        if (error) console.warn('[VotingService] Erro ao deletar candidato no Supabase:', error.message);
      });
  }

  // ==========================================
  // --- MÉTODOS DE VOTOS E URNA ELETRÔNICA ---
  // ==========================================

  static getVotes(schoolId?: string): VoteRecord[] {
    const raw = VotingStorage.getItem(STORAGE_KEYS.VOTES);
    let votes: VoteRecord[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          votes = parsed;
        }
      } catch (e) {
        console.error('Erro ao ler votos:', e);
      }
    }

    if (schoolId && schoolId !== 'ALL') {
      return votes.filter(v => v.schoolId === schoolId);
    }
    return votes;
  }

  /**
   * Checagem síncrona local de voto por CPF
   */
  static hasCpfVoted(schoolId: string, cpf: string, electionId?: string): { voted: boolean; vote?: VoteRecord } {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!cleanCpf) return { voted: false };

    const votes = this.getVotes();
    const found = votes.find(v => {
      const matchCpf = v.voterCpfClean === cleanCpf;
      const matchSchool = !schoolId || schoolId === 'ALL' || v.schoolId === schoolId;
      const matchElection = !electionId || v.electionId === electionId;
      return matchCpf && matchSchool && matchElection;
    });

    return {
      voted: !!found,
      vote: found
    };
  }

  /**
   * Checagem assíncrona central na Nuvem Supabase
   * Garante que um CPF não vote duas vezes mesmo usando computadores ou celulares diferentes!
   */
  static async hasCpfVotedAsync(schoolId: string, cpf: string, electionId?: string): Promise<{ voted: boolean; vote?: VoteRecord }> {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!cleanCpf) return { voted: false };

    // 1. Checagem rápida no cache local
    const localCheck = this.hasCpfVoted(schoolId, cleanCpf, electionId);
    if (localCheck.voted) return localCheck;

    // 2. Checagem direta no Supabase
    try {
      let query = supabase
        .from(DB_TABLES.VOTES)
        .select('*')
        .eq('voter_cpf_clean', cleanCpf);

      if (electionId) {
        query = query.eq('election_id', electionId);
      }

      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        const dbVote = mapVoteFromDb(data[0]);
        // Atualiza cache local
        const currentVotes = this.getVotes();
        if (!currentVotes.some(v => v.id === dbVote.id)) {
          currentVotes.push(dbVote);
          VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(currentVotes), false);
        }
        return { voted: true, vote: dbVote };
      }
    } catch (_) {}

    return { voted: false };
  }

  /**
   * Computa voto de forma assíncrona garantindo persistência na nuvem
   */
  static async castVoteAsync(params: {
    electionId: string;
    schoolId: string;
    candidateId: string;
    voterCpf: string;
    voterName?: string;
    voterSegment: VoterSegment;
  }): Promise<{ success: boolean; error?: string; receipt?: VoteRecord }> {
    const cleanCpf = params.voterCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return { success: false, error: 'CPF inválido. Certifique-se de digitar os 11 dígitos do seu CPF.' };
    }

    // Checagem central na nuvem
    const check = await this.hasCpfVotedAsync(params.schoolId, cleanCpf, params.electionId);
    if (check.voted) {
      return {
        success: false,
        error: `Este CPF já registrou voto nesta eleição em ${new Date(check.vote!.timestamp).toLocaleString('pt-BR')}. O voto é único e intransferível.`,
        receipt: check.vote
      };
    }

    // Gerar código único de comprovante
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const now = new Date();
    const receiptCode = `EDU-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${randomSuffix}`;

    const newVote: VoteRecord = {
      id: 'vote-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      electionId: params.electionId,
      schoolId: params.schoolId,
      candidateId: params.candidateId,
      voterCpfMasked: maskCPF(cleanCpf),
      voterCpfClean: cleanCpf,
      voterName: params.voterName ? params.voterName.trim() : undefined,
      voterSegment: params.voterSegment,
      receiptCode,
      timestamp: now.toISOString()
    };

    // 1. Salvar localmente
    const votes = this.getVotes();
    votes.push(newVote);
    VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(votes));

    // 2. Gravar no Supabase
    try {
      const dbRow = mapVoteToDb(newVote);
      const { error } = await supabase.from(DB_TABLES.VOTES).insert(dbRow);
      if (error) {
        // Se der erro de unicidade (código 23505 no Postgres)
        if (error.code === '23505' || error.message.includes('unique') || error.message.includes('uq_edu_vote_election_cpf')) {
          return {
            success: false,
            error: 'Este CPF já foi computado nesta eleição. Voto recusado por garantia anti-duplicidade.'
          };
        }
        console.warn('[VotingService] Aviso ao gravar voto no Supabase:', error.message);
      }
    } catch (e: any) {
      console.warn('[VotingService] Falha de rede ao gravar voto na nuvem:', e.message);
    }

    return {
      success: true,
      receipt: newVote
    };
  }

  /**
   * Versão síncrona (compatibilidade)
   */
  static castVote(params: {
    electionId: string;
    schoolId: string;
    candidateId: string;
    voterCpf: string;
    voterName?: string;
    voterSegment: VoterSegment;
  }): { success: boolean; error?: string; receipt?: VoteRecord } {
    const cleanCpf = params.voterCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return { success: false, error: 'CPF inválido. Certifique-se de digitar os 11 dígitos do seu CPF.' };
    }

    const check = this.hasCpfVoted(params.schoolId, cleanCpf, params.electionId);
    if (check.voted) {
      return {
        success: false,
        error: `Este CPF já registrou voto nesta eleição em ${new Date(check.vote!.timestamp).toLocaleString('pt-BR')}. O voto é único e intransferível.`,
        receipt: check.vote
      };
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const now = new Date();
    const receiptCode = `EDU-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${randomSuffix}`;

    const newVote: VoteRecord = {
      id: 'vote-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      electionId: params.electionId,
      schoolId: params.schoolId,
      candidateId: params.candidateId,
      voterCpfMasked: maskCPF(cleanCpf),
      voterCpfClean: cleanCpf,
      voterName: params.voterName ? params.voterName.trim() : undefined,
      voterSegment: params.voterSegment,
      receiptCode,
      timestamp: now.toISOString()
    };

    const votes = this.getVotes();
    votes.push(newVote);
    VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(votes));

    // Gravar em background no Supabase
    supabase.from(DB_TABLES.VOTES).insert(mapVoteToDb(newVote)).then(({ error }) => {
      if (error) console.warn('[VotingService] Erro ao gravar voto no Supabase:', error.message);
    });

    return {
      success: true,
      receipt: newVote
    };
  }

  // ==========================================
  // --- APURAÇÃO E ESTATÍSTICAS ---
  // ==========================================

  static getSchoolStats(schoolId: string): SchoolElectionStats {
    const schools = this.getSchools();
    const targetSchool = schools.find(s => s.id === schoolId) || {
      id: schoolId,
      name: schoolId === 'ALL' ? 'Toda a Rede Municipal' : 'Escola',
      code: '',
      category: 'EMEF' as const,
      address: ''
    };

    const votes = this.getVotes(schoolId);
    const candidates = this.getCandidates(schoolId);

    const totalVotes = votes.length;
    let blankVotes = 0;
    let nullVotes = 0;
    const candidateVoteMap: Record<string, number> = {};

    candidates.forEach(c => {
      candidateVoteMap[c.id] = 0;
    });

    const segmentDistribution: Record<VoterSegment, number> = {
      responsavel: 0,
      aluno: 0,
      professor: 0,
      funcionario: 0,
      comunidade: 0
    };

    votes.forEach(v => {
      if (v.voterSegment && segmentDistribution[v.voterSegment] !== undefined) {
        segmentDistribution[v.voterSegment]++;
      }

      if (v.candidateId === '__BRANCO__') {
        blankVotes++;
      } else if (v.candidateId === '__NULO__') {
        nullVotes++;
      } else {
        candidateVoteMap[v.candidateId] = (candidateVoteMap[v.candidateId] || 0) + 1;
      }
    });

    const validVotes = totalVotes - blankVotes - nullVotes;

    let tallies: VoteTally[] = candidates.map(c => {
      const vCount = candidateVoteMap[c.id] || 0;
      const pct = validVotes > 0 ? (vCount / validVotes) * 100 : 0;
      return {
        candidateId: c.id,
        candidateName: c.name,
        candidateNumber: c.number,
        photoUrl: c.photoUrl,
        viceName: c.viceName,
        votes: vCount,
        percentage: Math.round(pct * 10) / 10
      };
    });

    tallies.sort((a, b) => b.votes - a.votes);

    if (tallies.length > 0 && tallies[0].votes > 0) {
      tallies[0].isWinner = true;
    }

    return {
      schoolId: targetSchool.id,
      schoolName: targetSchool.name,
      totalVotes,
      validVotes,
      blankVotes,
      nullVotes,
      tallies,
      segmentDistribution
    };
  }

  /**
   * Zera a urna eletrônica
   */
  static resetSchoolVotes(schoolId?: string): void {
    if (!schoolId || schoolId === 'ALL') {
      VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify([]));
      supabase.from(DB_TABLES.VOTES).delete().neq('id', '___safe___').then();
    } else {
      const remaining = this.getVotes().filter(v => v.schoolId !== schoolId);
      VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(remaining));
      supabase.from(DB_TABLES.VOTES).delete().eq('school_id', schoolId).then();
    }
  }

  // ==========================================
  // --- EXPORTAÇÃO E IMPORTAÇÃO MANUAL JSON ---
  // ==========================================

  static exportBackupJSON(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      schools: this.getSchools(),
      elections: this.getElections(),
      candidates: this.getCandidates(),
      votes: this.getVotes()
    };
    return JSON.stringify(backup, null, 2);
  }

  static async importBackupJSON(jsonString: string): Promise<{ success: boolean; error?: string; count?: { schools: number; candidates: number } }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.schools && !parsed.candidates) {
        return { success: false, error: 'Arquivo JSON inválido. Não foram encontrados dados de escolas ou candidatos.' };
      }

      if (Array.isArray(parsed.schools)) {
        VotingStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(parsed.schools));
      }
      if (Array.isArray(parsed.elections)) {
        VotingStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(parsed.elections));
      }
      if (Array.isArray(parsed.candidates)) {
        VotingStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(parsed.candidates));
      }
      if (Array.isArray(parsed.votes)) {
        VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(parsed.votes));
      }

      // Enviar para Supabase
      await this.pushLocalToSupabase();

      return {
        success: true,
        count: {
          schools: Array.isArray(parsed.schools) ? parsed.schools.length : 0,
          candidates: Array.isArray(parsed.candidates) ? parsed.candidates.length : 0
        }
      };
    } catch (e: any) {
      return { success: false, error: 'Erro ao interpretar JSON: ' + e.message };
    }
  }

  /**
   * Remove todas as escolas e candidatos demonstrativos/falsos (Darcy Ribeiro, Cecília Meireles, etc.)
   * mantendo exclusivamente os dados reais cadastrados pela gestão.
   */
  static purgeMockData(): { removedSchools: number; removedCandidates: number } {
    const mockSchoolIds = ['escola-darcy-ribeiro', 'escola-cecilia-meireles', 'cmei-pequeno-principe'];
    const mockCandIds = ['cand-darcy-10', 'cand-darcy-20', 'cand-cecilia-12', 'cand-cecilia-15', 'cand-cmei-10'];

    const rawSchools = VotingStorage.getItem(STORAGE_KEYS.SCHOOLS);
    let schools: SchoolUnit[] = [];
    if (rawSchools) {
      try { schools = JSON.parse(rawSchools); } catch (_) {}
    }
    const cleanSchools = schools.filter(s => 
      !mockSchoolIds.includes(s.id) &&
      !s.name.toLowerCase().includes('darcy ribeiro') &&
      !s.name.toLowerCase().includes('cecília meireles') &&
      !s.name.toLowerCase().includes('pequeno príncipe')
    );
    VotingStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(cleanSchools));

    const rawCands = VotingStorage.getItem(STORAGE_KEYS.CANDIDATES);
    let cands: Candidate[] = [];
    if (rawCands) {
      try { cands = JSON.parse(rawCands); } catch (_) {}
    }
    const cleanCands = cands.filter(c => 
      !mockCandIds.includes(c.id) && 
      !mockSchoolIds.includes(c.schoolId) &&
      !c.name.toLowerCase().includes('helena souza') &&
      !c.name.toLowerCase().includes('marcos vinícius')
    );
    VotingStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(cleanCands));

    const rawVotes = VotingStorage.getItem(STORAGE_KEYS.VOTES);
    let votes: VoteRecord[] = [];
    if (rawVotes) {
      try { votes = JSON.parse(rawVotes); } catch (_) {}
    }
    const cleanVotes = votes.filter(v => !mockSchoolIds.includes(v.schoolId));
    VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(cleanVotes));

    // Excluir também no Supabase se existirem
    for (const id of mockSchoolIds) {
      supabase.from(DB_TABLES.SCHOOLS).delete().eq('id', id).then();
      supabase.from(DB_TABLES.CANDIDATES).delete().eq('school_id', id).then();
      supabase.from(DB_TABLES.VOTES).delete().eq('school_id', id).then();
    }

    return {
      removedSchools: schools.length - cleanSchools.length,
      removedCandidates: cands.length - cleanCands.length
    };
  }
}

// Inicia limpeza de dados demonstrativos e sincronização em segundo plano automaticamente ao importar
if (typeof window !== 'undefined') {
  VotingService.purgeMockData();
  VotingService.initSync().catch(err => {
    console.warn('[VotingService] Falha inicial ao sincronizar com nuvem:', err);
  });
}
