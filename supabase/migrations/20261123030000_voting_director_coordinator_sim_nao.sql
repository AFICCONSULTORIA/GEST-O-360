-- ==============================================================================
-- MIGRAÇÃO: ELEIÇÃO ESCOLAR — DIRETOR + COORDENADOR COM VOTO SIM/NÃO
-- Versão: 20261123030000
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.edu_voting_schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  category TEXT DEFAULT 'EMEF',
  address TEXT DEFAULT '',
  neighborhood TEXT,
  phone TEXT,
  director_name TEXT,
  total_voters_estimated INTEGER DEFAULT 0,
  voting_status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_voting_elections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  school_id TEXT DEFAULT 'ALL',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  allow_blanks BOOLEAN DEFAULT true,
  allow_nulls BOOLEAN DEFAULT true,
  allowed_segments JSONB DEFAULT '["responsavel","aluno","professor","funcionario","comunidade"]'::jsonb,
  voting_mode TEXT DEFAULT 'sim_nao',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_voting_candidates (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'diretor' CHECK (role IN ('diretor', 'coordenador')),
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  vice_name TEXT,
  photo_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  proposals JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_voting_votes (
  id TEXT PRIMARY KEY,
  election_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  director_vote TEXT,
  coordinator_candidate_id TEXT,
  coordinator_vote TEXT,
  voter_cpf_masked TEXT NOT NULL,
  voter_cpf_clean TEXT NOT NULL,
  voter_name TEXT,
  voter_segment TEXT NOT NULL DEFAULT 'responsavel',
  receipt_code TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas novas caso as tabelas já existam
ALTER TABLE public.edu_voting_elections ADD COLUMN IF NOT EXISTS voting_mode TEXT DEFAULT 'sim_nao';
ALTER TABLE public.edu_voting_candidates ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'diretor';
ALTER TABLE public.edu_voting_votes ADD COLUMN IF NOT EXISTS director_vote TEXT;
ALTER TABLE public.edu_voting_votes ADD COLUMN IF NOT EXISTS coordinator_candidate_id TEXT;
ALTER TABLE public.edu_voting_votes ADD COLUMN IF NOT EXISTS coordinator_vote TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_edu_vote_election_cpf
  ON public.edu_voting_votes (election_id, voter_cpf_clean);
