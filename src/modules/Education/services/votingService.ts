/**
 * Serviço de Gerenciamento e Apuração de Eleições de Diretores Escolares
 * Suporta persistência híbrida (LocalStorage + Supabase) com garantia anti-duplicidade por CPF.
 */

import { SchoolUnit, Candidate, Election, VoteRecord, SchoolElectionStats, VoteTally, VoterSegment } from '../types/voting';
import { maskCPF } from '../../../lib/masks';

// Escolas Padrão da Rede Municipal
export const DEFAULT_SCHOOLS: SchoolUnit[] = [
  {
    id: 'escola-darcy-ribeiro',
    name: 'EMEF Prof. Darcy Ribeiro',
    code: 'ESC-001',
    category: 'EMEF',
    address: 'Av. das Flores, 450 - Centro',
    totalVotersEstimated: 650
  },
  {
    id: 'escola-cecilia-meireles',
    name: 'EMEB Cecília Meireles',
    code: 'ESC-002',
    category: 'EMEB',
    address: 'Rua Tiradentes, 120 - Jardim Primavera',
    totalVotersEstimated: 480
  },
  {
    id: 'cmei-pequeno-principe',
    name: 'CMEI Pequeno Príncipe',
    code: 'ESC-003',
    category: 'CMEI',
    address: 'Rua das Palmeiras, 88 - Bairro Universitário',
    totalVotersEstimated: 320
  }
];

// Eleição Padrão Ativa
export const DEFAULT_ELECTIONS: Election[] = [
  {
    id: 'eleicao-2027-2029',
    title: 'Eleição Direta para Diretores Escolares - Gestão 2027/2029',
    description: 'Processo democrático de escolha dos gestores escolares da Rede Municipal de Ensino.',
    schoolId: 'ALL',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'open',
    allowBlanks: true,
    allowNulls: true,
    allowedSegments: ['responsavel', 'aluno', 'professor', 'funcionario', 'comunidade'],
    createdAt: '2026-10-01T08:00:00Z'
  }
];

// Candidatos Demonstrativos
export const DEFAULT_CANDIDATES: Candidate[] = [
  {
    id: 'cand-darcy-10',
    electionId: 'eleicao-2027-2029',
    schoolId: 'escola-darcy-ribeiro',
    number: '10',
    name: 'Profª Helena Souza',
    viceName: 'Prof. Carlos Eduardo',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    bio: 'Pedagoga com pós-graduação em Gestão Escolar e 14 anos de docência na rede pública municipal.',
    proposals: [
      'Climatização completa de todas as salas de aula.',
      'Implementação do Espaço Maker e Clube de Robótica.',
      'Ampliação das oficinas de contraturno escolar e reforço pedagógico.',
      'Gestão participativa com reuniões bimestrais do Conselho Escolar.'
    ],
    active: true,
    createdAt: '2026-10-01T09:00:00Z'
  },
  {
    id: 'cand-darcy-20',
    electionId: 'eleicao-2027-2029',
    schoolId: 'escola-darcy-ribeiro',
    number: '20',
    name: 'Prof. Marcos Vinícius',
    viceName: 'Profª Renata Lima',
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
    bio: 'Mestre em Educação, especialista em Metodologias Ativas e coordenador pedagógico há 8 anos.',
    proposals: [
      'Modernização da quadra poliesportiva com cobertura e vestiários.',
      'Adoção de tablets educacionais nas turmas dos anos finais.',
      'Programa Escola Segura: monitoramento digital e mediação de conflitos.',
      'Parcerias culturais para festivais de teatro e música na escola.'
    ],
    active: true,
    createdAt: '2026-10-01T09:30:00Z'
  },
  {
    id: 'cand-cecilia-12',
    electionId: 'eleicao-2027-2029',
    schoolId: 'escola-cecilia-meireles',
    number: '12',
    name: 'Profª Sandra Mara',
    viceName: 'Profª Cláudia Silva',
    photoUrl: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&q=80&w=400',
    bio: 'Licenciada em Letras e Pedagogia, 16 anos de experiência e atuação destacada na alfabetização.',
    proposals: [
      'Revitalização da biblioteca escolar com acervo digital e cantinho de leitura.',
      'Horta comunitária pedagógica integrada à merenda escolar saudável.',
      'Atendimento psicopedagógico presencial para crianças com TDAH e Autismo.'
    ],
    active: true,
    createdAt: '2026-10-01T10:00:00Z'
  },
  {
    id: 'cand-cecilia-15',
    electionId: 'eleicao-2027-2029',
    schoolId: 'escola-cecilia-meireles',
    number: '15',
    name: 'Prof. Rodrigo Mendes',
    viceName: 'Prof. Roberto Alves',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    bio: 'Especialista em Educação Inclusiva e Gestão Pública, apaixonado pela valorização dos servidores.',
    proposals: [
      'Projeto Escola em Tempo Integral com foco em artes e esportes.',
      'Olimpíadas de Matemática e Ciências no ambiente escolar.',
      'Portal da Transparência da Associação de Pais e Mestres (APM).'
    ],
    active: true,
    createdAt: '2026-10-01T10:30:00Z'
  },
  {
    id: 'cand-cmei-10',
    electionId: 'eleicao-2027-2029',
    schoolId: 'cmei-pequeno-principe',
    number: '10',
    name: 'Profª Juliana Andrade',
    viceName: 'Profª Mariana Dias',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
    bio: 'Especialista em Primeira Infância e Psicomotricidade, com dedicação exclusiva ao atendimento infantil.',
    proposals: [
      'Criação de sala sensorial com recursos lúdicos e neurocompatíveis.',
      'Reforma do playground com piso ecológico emborrachado e seguro.',
      'Comunicação direta com os pais via aplicativo e relatórios diários de rotina.'
    ],
    active: true,
    createdAt: '2026-10-01T11:00:00Z'
  }
];

const STORAGE_KEYS = {
  SCHOOLS: 'gestao360_voting_schools',
  ELECTIONS: 'gestao360_voting_elections',
  CANDIDATES: 'gestao360_voting_candidates',
  VOTES: 'gestao360_voting_votes'
};

// Camada de armazenamento ultra-resiliente (LocalStorage + SessionStorage + Cache em Memória + Eventos)
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
    } catch (e) {
      console.warn(`[VotingStorage] Falha ao ler localStorage[${key}]:`, e);
    }

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

  static setItem(key: string, value: string): void {
    this.memoryFallback[key] = value;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[VotingStorage] Falha ao gravar localStorage[${key}], tentando sessionStorage:`, e);
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(key, value);
        }
      } catch (_) {}
    }

    // Notificar todas as abas e componentes da aplicação
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('voting-data-changed', { detail: { key } }));
      }
    } catch (_) {}
  }
}

export class VotingService {
  // --- ESCOLAS ---
  static getSchools(): SchoolUnit[] {
    const raw = VotingStorage.getItem(STORAGE_KEYS.SCHOOLS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return JSON.parse(JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('Erro ao ler escolas:', e);
      }
    }
    const defaults = JSON.parse(JSON.stringify(DEFAULT_SCHOOLS));
    VotingStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(defaults));
    return defaults;
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
    return finalSchool;
  }

  static deleteSchool(schoolId: string): { success: boolean; error?: string } {
    const votes = this.getVotes(schoolId);
    if (votes.length > 0) {
      return { 
        success: false, 
        error: `Não é possível excluir esta escola porque já existem ${votes.length} voto(s) computados na urna.` 
      };
    }
    const candidates = this.getCandidates(schoolId);
    if (candidates.length > 0) {
      return {
        success: false,
        error: `Não é possível excluir esta escola porque existem ${candidates.length} candidato(s)/chapa(s) vinculados a ela. Remova os candidatos primeiro.`
      };
    }
    const schools = this.getSchools().filter(s => s.id !== schoolId);
    VotingStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
    return { success: true };
  }

  // --- ELEIÇÕES ---
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
    VotingStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(defaults));
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
  }

  // --- CANDIDATOS ---
  static getCandidates(schoolId?: string): Candidate[] {
    const raw = VotingStorage.getItem(STORAGE_KEYS.CANDIDATES);
    let candidates: Candidate[] = JSON.parse(JSON.stringify(DEFAULT_CANDIDATES));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          candidates = JSON.parse(JSON.stringify(parsed));
        }
      } catch (e) {
        console.error('Erro ao ler candidatos:', e);
      }
    } else {
      VotingStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
    }

    if (schoolId && schoolId !== 'ALL') {
      return candidates.filter(c => c.schoolId === schoolId);
    }
    return candidates;
  }

  static saveCandidate(candidate: Candidate): Candidate {
    const candidates = this.getCandidates(); // Busca todos sem filtro
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
    return finalCandidate;
  }

  static deleteCandidate(candidateId: string): void {
    const candidates = this.getCandidates().filter(c => c.id !== candidateId);
    VotingStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
  }

  // --- VOTOS ---
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
   * Verifica se o CPF informado já registrou voto nesta eleição para a escola selecionada.
   * Garante a regra fundamental de NÃO DUPLICIDADE DE VOTOS.
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
   * Computa o voto na urna digital com emissão de comprovante e verificação estrita de CPF.
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

    // Checagem de voto duplicado
    const check = this.hasCpfVoted(params.schoolId, cleanCpf, params.electionId);
    if (check.voted) {
      return {
        success: false,
        error: `Este CPF já registrou voto nesta eleição em ${new Date(check.vote!.timestamp).toLocaleString('pt-BR')}. O voto é único e intransferível.`,
        receipt: check.vote
      };
    }

    // Gerar código único do comprovante de comparecimento
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

    return {
      success: true,
      receipt: newVote
    };
  }

  /**
   * Calcula as estatísticas e apuração dos votos por escola ou rede municipal
   */
  static getSchoolStats(schoolId: string): SchoolElectionStats {
    const schools = this.getSchools();
    const targetSchool = schools.find(s => s.id === schoolId) || {
      id: schoolId,
      name: schoolId === 'ALL' ? 'Toda a Rede Municipal' : 'Escola',
      code: '',
      category: 'EMEF',
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

    // Calcular percentuais dos candidatos
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

    // Ordenar por número de votos decrescente
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
   * Zera a urna eletrônica (útil para homologação ou reinício de pleito)
   */
  static resetSchoolVotes(schoolId?: string): void {
    if (!schoolId || schoolId === 'ALL') {
      VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify([]));
    } else {
      const remaining = this.getVotes().filter(v => v.schoolId !== schoolId);
      VotingStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(remaining));
    }
  }
}
