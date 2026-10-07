-- ====================================================================
-- GESTÃO 360 · MÓDULO DE VOTAÇÃO E ELEIÇÃO DE DIRETORES ESCOLARES
-- ====================================================================
-- Este script cria as tabelas no Supabase para sincronização em nuvem
-- das escolas, eleições, candidatos e apuração dos votos em tempo real,
-- permitindo que funcione em qualquer computador, celular ou tablet.
--
-- COMO EXECUTAR:
-- 1. Acesse o Supabase Dashboard no menu "SQL Editor"
-- 2. Cole este código completo e clique em "Run" (Executar).
-- ====================================================================

-- 1. TABELA DE ESCOLAS PARTICIPANTES DA VOTAÇÃO
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

-- 2. TABELA DE ELEIÇÕES
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

-- 3. TABELA DE CANDIDATOS / CHAPAS
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

-- 4. TABELA DE VOTOS COMPUTADOS NA URNA
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

-- ÍNDICES DE PERFORMANCE E PESQUISA
CREATE INDEX IF NOT EXISTS idx_edu_voting_candidates_school ON public.edu_voting_candidates(school_id);
CREATE INDEX IF NOT EXISTS idx_edu_voting_candidates_election ON public.edu_voting_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_edu_voting_votes_school ON public.edu_voting_votes(school_id);
CREATE INDEX IF NOT EXISTS idx_edu_voting_votes_election ON public.edu_voting_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_edu_voting_votes_cpf ON public.edu_voting_votes(voter_cpf_clean);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.edu_voting_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_voting_votes ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO LIVRE (PÚBLICO E ADMINISTRATIVO)
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

-- HABILITAR REALTIME (Para apuração ao vivo em múltiplos computadores e celulares)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.edu_voting_schools;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.edu_voting_elections;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.edu_voting_candidates;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.edu_voting_votes;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
