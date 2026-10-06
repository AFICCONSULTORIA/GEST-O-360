/**
 * Modelos de dados para o Sistema de Votação e Eleição de Diretores Escolares
 */

export type VoterSegment = 'responsavel' | 'aluno' | 'professor' | 'funcionario' | 'comunidade';

export const VOTER_SEGMENT_LABELS: Record<VoterSegment, string> = {
  responsavel: 'Pai, Mãe ou Responsável Legal',
  aluno: 'Estudante (Ensino Fundamental II / EJA)',
  professor: 'Professor(a) ou Equipe Pedagógica',
  funcionario: 'Servidor(a) Técnico / Apoio Escolar',
  comunidade: 'Membro da Comunidade Escolar / Bairro'
};

export interface SchoolUnit {
  id: string;
  name: string;
  code: string;
  category: 'CMEI' | 'EMEF' | 'EMEB' | 'Integral';
  address: string;
  neighborhood?: string;
  phone?: string;
  directorName?: string;
  totalVotersEstimated?: number;
  votingStatus?: 'ready' | 'open' | 'closed';
  createdAt?: string;
}

export interface Candidate {
  id: string;
  electionId: string;
  schoolId: string;
  number: string; // Ex: "10", "12", "20"
  name: string; // Nome do candidato a diretor(a)
  viceName?: string; // Nome do candidato a vice-diretor(a)
  photoUrl: string; // URL da foto ou Base64 compactado
  bio: string; // Minibiografia / Apresentação
  proposals: string[]; // Principais metas do plano de gestão
  active: boolean;
  createdAt: string;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  schoolId: string; // ID da escola ou 'ALL' para municipal
  startDate: string;
  endDate: string;
  status: 'open' | 'upcoming' | 'closed';
  allowBlanks: boolean;
  allowNulls: boolean;
  allowedSegments: VoterSegment[];
  createdAt: string;
}

export interface VoteRecord {
  id: string;
  electionId: string;
  schoolId: string;
  candidateId: string; // ID do candidato, ou '__BRANCO__', ou '__NULO__'
  voterCpfMasked: string; // Ex: '***.456.789-**'
  voterCpfClean: string; // CPF numérico puro (usado para checagem única e anti-duplicidade)
  voterName?: string;
  voterSegment: VoterSegment;
  receiptCode: string; // Código de autenticidade (ex: 'EDU-8392-A1B')
  timestamp: string;
}

export interface VoteTally {
  candidateId: string;
  candidateName: string;
  candidateNumber: string;
  photoUrl: string;
  viceName?: string;
  votes: number;
  percentage: number;
  isWinner?: boolean;
}

export interface SchoolElectionStats {
  schoolId: string;
  schoolName: string;
  totalVotes: number;
  validVotes: number;
  blankVotes: number;
  nullVotes: number;
  tallies: VoteTally[];
  segmentDistribution: Record<VoterSegment, number>;
}
