-- ==============================================================================
-- CÂMARA 360 - BANCO DE DADOS LEGISLATIVO MUNICIPAL (SUPABASE)
-- ==============================================================================

-- 1. Tabela de Vereadores e Mesa Diretora
CREATE TABLE IF NOT EXISTS camara_vereadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    nome_parlamentar VARCHAR(150) NOT NULL,
    partido VARCHAR(50) NOT NULL,
    numero_urna VARCHAR(10),
    cargo_mesa VARCHAR(100) DEFAULT 'Vereador(a)', -- 'Presidente', 'Vice-Presidente', '1º Secretário', '2º Secretário', 'Vereador(a)', 'Líder de Bancada'
    bancada VARCHAR(50),
    foto_url TEXT,
    email VARCHAR(255),
    telefone VARCHAR(50),
    gabinete VARCHAR(50),
    biografia TEXT,
    redes_sociais JSONB DEFAULT '{}'::jsonb,
    mandato_inicio DATE DEFAULT '2025-01-01',
    mandato_fim DATE DEFAULT '2028-12-31',
    ativo BOOLEAN DEFAULT TRUE,
    institution_id VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Comissões Permanentes e Temporárias
CREATE TABLE IF NOT EXISTS camara_comissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    sigla VARCHAR(50) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Permanente', -- 'Permanente', 'Especial', 'CPI', 'Representação'
    descricao TEXT,
    presidente_id UUID REFERENCES camara_vereadores(id) ON DELETE SET NULL,
    vice_presidente_id UUID REFERENCES camara_vereadores(id) ON DELETE SET NULL,
    membros_ids JSONB DEFAULT '[]'::jsonb,
    ativo BOOLEAN DEFAULT TRUE,
    institution_id VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Matérias Legislativas (Processo Legislativo Eletrônico / SAPL)
CREATE TABLE IF NOT EXISTS camara_materias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(50) NOT NULL,
    ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    tipo VARCHAR(100) NOT NULL, -- 'Projeto de Lei Ordinária', 'Projeto de Lei Complementar', 'Decreto Legislativo', 'Projeto de Resolução', 'Emenda à LOM', 'Moção', 'Requerimento', 'Pedido de Informação', 'Veto'
    ementa TEXT NOT NULL,
    texto_integral TEXT,
    autor_id UUID REFERENCES camara_vereadores(id) ON DELETE SET NULL,
    autor_nome VARCHAR(255) NOT NULL,
    regime VARCHAR(50) DEFAULT 'Ordinário', -- 'Ordinário', 'Urgência', 'Urgência Urgentíssima'
    status VARCHAR(100) DEFAULT 'Protocolado', -- 'Protocolado', 'Lido no Expediente', 'Em Comissão', 'Apto para Ordem do Dia', '1ª Votação Aprovada', '2ª Votação Aprovada', 'Aprovado em Redação Final', 'Enviado ao Executivo', 'Sancionado', 'Promulgado', 'Vetado', 'Rejeitado', 'Arquivado'
    comissao_atual_id UUID REFERENCES camara_comissoes(id) ON DELETE SET NULL,
    relator_id UUID REFERENCES camara_vereadores(id) ON DELETE SET NULL,
    data_protocolo DATE DEFAULT CURRENT_DATE,
    data_limite_comissao DATE,
    link_anexo TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    institution_id VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Histórico de Tramitação
CREATE TABLE IF NOT EXISTS camara_tramitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    materia_id UUID REFERENCES camara_materias(id) ON DELETE CASCADE,
    data_tramitacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fase VARCHAR(150) NOT NULL,
    despacho TEXT NOT NULL,
    responsavel VARCHAR(150) NOT NULL,
    status_resultante VARCHAR(100) NOT NULL,
    documento_anexo TEXT,
    institution_id VARCHAR(100) DEFAULT 'default'
);

-- 5. Tabela de Pareceres das Comissões
CREATE TABLE IF NOT EXISTS camara_pareceres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comissao_id UUID REFERENCES camara_comissoes(id) ON DELETE CASCADE,
    materia_id UUID REFERENCES camara_materias(id) ON DELETE CASCADE,
    relator_id UUID REFERENCES camara_vereadores(id) ON DELETE SET NULL,
    conclusao VARCHAR(100) NOT NULL, -- 'Favorável', 'Contrário', 'Favorável com Emenda Substitutiva', 'Favorável com Emenda Aditiva'
    relatorio TEXT,
    voto_relator TEXT,
    data_emissao DATE DEFAULT CURRENT_DATE,
    aprovado_comissao BOOLEAN DEFAULT TRUE,
    documento_url TEXT,
    institution_id VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Sessões Plenárias
CREATE TABLE IF NOT EXISTS camara_sessoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER NOT NULL,
    ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    tipo VARCHAR(100) DEFAULT 'Ordinária', -- 'Ordinária', 'Extraordinária', 'Solene', 'Audiência Pública'
    data_sessao DATE NOT NULL,
    hora_inicio VARCHAR(10) NOT NULL DEFAULT '19:00',
    hora_fim VARCHAR(10),
    status VARCHAR(50) DEFAULT 'Agendada', -- 'Agendada', 'Em Andamento', 'Suspensa', 'Encerrada', 'Cancelada'
    quorum_abertura INTEGER DEFAULT 0,
    presencas JSONB DEFAULT '[]'::jsonb, -- Array de { vereador_id, presente, justificativa }
    pauta_expediente JSONB DEFAULT '[]'::jsonb, -- Array de materia_ids
    pauta_ordem_dia JSONB DEFAULT '[]'::jsonb, -- Array de materia_ids
    ata_resumida TEXT,
    video_transmissao_url TEXT,
    institution_id VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Votações Eletrônicas em Plenário
CREATE TABLE IF NOT EXISTS camara_votacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID REFERENCES camara_sessoes(id) ON DELETE CASCADE,
    materia_id UUID REFERENCES camara_materias(id) ON DELETE CASCADE,
    tipo_votacao VARCHAR(50) DEFAULT 'Nominal', -- 'Nominal', 'Secreta', 'Simbólica'
    tipo_quorum VARCHAR(50) DEFAULT 'Maioria Simples', -- 'Maioria Simples', 'Maioria Absoluta', 'Dois Terços (2/3)'
    turno VARCHAR(50) DEFAULT 'Único', -- '1º Turno', '2º Turno', 'Único', 'Redação Final'
    resultado VARCHAR(50) NOT NULL, -- 'Aprovado', 'Rejeitado', 'Empatado', 'Retirado de Pauta'
    votos_sim INTEGER DEFAULT 0,
    votos_nao INTEGER DEFAULT 0,
    votos_abstencao INTEGER DEFAULT 0,
    detalhes_votos JSONB DEFAULT '[]'::jsonb, -- Array de { vereador_id, nome, voto: 'SIM'|'NAO'|'ABSTENCAO'|'AUSENTE' }
    data_votacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    institution_id VARCHAR(100) DEFAULT 'default'
);

-- 8. Tabela de Indicações e Requerimentos à Prefeitura
CREATE TABLE IF NOT EXISTS camara_indicacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(50) NOT NULL,
    ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    tipo VARCHAR(50) DEFAULT 'Indicação', -- 'Indicação', 'Requerimento', 'Pedido de Providência'
    vereador_id UUID REFERENCES camara_vereadores(id) ON DELETE SET NULL,
    vereador_nome VARCHAR(255) NOT NULL,
    bairro VARCHAR(150),
    secretaria_destino VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    data_envio DATE DEFAULT CURRENT_DATE,
    prazo_resposta_dias INTEGER DEFAULT 30,
    data_limite_resposta DATE,
    data_resposta DATE,
    resposta_executivo TEXT,
    status VARCHAR(50) DEFAULT 'Encaminhado', -- 'Aguardando Envio', 'Encaminhado', 'Em Análise', 'Respondido', 'Atendido', 'Vencido'
    anexo_resposta TEXT,
    institution_id VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Sugestões Populares (Portal do Cidadão)
CREATE TABLE IF NOT EXISTS camara_sugestoes_populares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_cidadao VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(50),
    bairro VARCHAR(150),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Infraestrutura',
    vereador_destinatario_id UUID REFERENCES camara_vereadores(id) ON DELETE SET NULL,
    apoios_count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Em Avaliação', -- 'Em Avaliação', 'Acolhida pelo Vereador', 'Convertida em PL', 'Arquivada'
    resposta_gabinete TEXT,
    institution_id VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para Performance
CREATE INDEX IF NOT EXISTS idx_camara_vereadores_inst ON camara_vereadores(institution_id);
CREATE INDEX IF NOT EXISTS idx_camara_materias_inst ON camara_materias(institution_id, ano);
CREATE INDEX IF NOT EXISTS idx_camara_materias_status ON camara_materias(status);
CREATE INDEX IF NOT EXISTS idx_camara_sessoes_inst ON camara_sessoes(institution_id, data_sessao);
CREATE INDEX IF NOT EXISTS idx_camara_indicacoes_inst ON camara_indicacoes(institution_id, status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE camara_vereadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE camara_comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE camara_materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE camara_tramitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE camara_pareceres ENABLE ROW LEVEL SECURITY;
ALTER TABLE camara_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE camara_votacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE camara_indicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE camara_sugestoes_populares ENABLE ROW LEVEL SECURITY;

-- Políticas de Permissão Pública / Geral
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Read Camara Vereadores" ON camara_vereadores;
    CREATE POLICY "Public Read Camara Vereadores" ON camara_vereadores FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Read Camara Materias" ON camara_materias;
    CREATE POLICY "Public Read Camara Materias" ON camara_materias FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Read Camara Sessoes" ON camara_sessoes;
    CREATE POLICY "Public Read Camara Sessoes" ON camara_sessoes FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Read Camara Indicacoes" ON camara_indicacoes;
    CREATE POLICY "Public Read Camara Indicacoes" ON camara_indicacoes FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Read Camara Comissoes" ON camara_comissoes;
    CREATE POLICY "Public Read Camara Comissoes" ON camara_comissoes FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Read Camara Pareceres" ON camara_pareceres;
    CREATE POLICY "Public Read Camara Pareceres" ON camara_pareceres FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Read Camara Votacoes" ON camara_votacoes;
    CREATE POLICY "Public Read Camara Votacoes" ON camara_votacoes FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Read Camara Sugestoes" ON camara_sugestoes_populares;
    CREATE POLICY "Public Read Camara Sugestoes" ON camara_sugestoes_populares FOR ALL USING (true);
END $$;
