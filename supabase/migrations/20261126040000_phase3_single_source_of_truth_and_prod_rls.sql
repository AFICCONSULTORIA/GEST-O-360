-- ==============================================================================
-- MIGRAÇÃO FASE 3: FONTE ÚNICA DA VERDADE (database/*.sql -> supabase/migrations)
--                  + BLINDAGEM DAS TABELAS E FUNÇÕES DETECTADAS EM PRODUÇÃO
-- Versão: 20261126040000
-- Objetivo:
--   1. Consolidar de forma 100% idempotente todas as tabelas, colunas e triggers
--      que antes existiam apenas nos scripts manuais soltos em `database/*.sql`,
--      permitindo remover `database/*.sql` e tornar `supabase/migrations/` a
--      única fonte da verdade para staging e produção (`supabase db push`).
--   2. Habilitar RLS e fechar todas as políticas abertas a `anon`/`PUBLIC`
--      identificadas na auditoria real do banco de produção (`document_records`,
--      `protocols`, `appointments`, `medical_consultations`, `medical_prescriptions`,
--      `medications`, `patrimonio`, `institutions`, `departments`, `edu_*`,
--      `control_accounting_changes`, `solicitacoes_retificacao_contabil`, `users`,
--      `saas_*`, `institutional_email_*`, `public_forms`, `meio_ambiente_denuncias`,
--      `servicos_publicos_demandas`, etc.).
--   3. Fixar `search_path` e revogar `PUBLIC`/`anon` de funções `SECURITY DEFINER`
--      administrativas órfãs existentes no banco real (`admin_get_all_users`,
--      `admin_update_user_subscription`, `client_cancel_own_subscription`,
--      `get_user_role`, `fn_record_system_audit_log`, `is_admin`, `is_professor`,
--      `increment_news_views`).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 1. SCHEMAS BASE CONSOLIDADOS DE `database/*.sql` (IDEMPOTENTES)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  contact_phone TEXT,
  cert_links JSONB DEFAULT '{}'::jsonb,
  state_links JSONB DEFAULT '{}'::jsonb,
  active_modules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS subdomain TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS cert_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS state_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS active_modules JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.document_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  type TEXT NOT NULL,
  number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  requester TEXT NOT NULL,
  subject TEXT NOT NULL,
  dateCreated TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  attachment TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  number TEXT NOT NULL,
  process_number TEXT,
  object TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_cnpj TEXT,
  category TEXT DEFAULT 'Pregão Eletrônico',
  department TEXT,
  fiscal_name TEXT,
  amount NUMERIC(15, 2) DEFAULT 0,
  start_date DATE,
  deadline DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.protocols (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  attachment TEXT,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.control_accounting_changes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  protocol_number TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_role TEXT NOT NULL,
  requester_department TEXT NOT NULL,
  requester_email TEXT,
  requester_phone TEXT,
  change_type TEXT NOT NULL,
  reference_doc TEXT NOT NULL,
  change_date DATE DEFAULT CURRENT_DATE,
  fiscal_year INTEGER DEFAULT 2026,
  month_ref TEXT DEFAULT '',
  amount NUMERIC(15, 2) DEFAULT 0,
  reason TEXT NOT NULL,
  current_state TEXT DEFAULT '',
  proposed_state TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  accountant_name TEXT,
  accountant_crc TEXT,
  accountant_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attachment_name TEXT,
  attachment_url TEXT,
  attachment_before_name TEXT,
  attachment_before_url TEXT,
  attachment_after_name TEXT,
  attachment_after_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.solicitacoes_retificacao_contabil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  protocolo_anual VARCHAR(30) NOT NULL UNIQUE,
  exercicio_financeiro INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  mes_competencia INTEGER NOT NULL CHECK (mes_competencia BETWEEN 1 AND 12),
  unidade_gestora VARCHAR(150) NOT NULL DEFAULT 'Prefeitura Municipal',
  secretaria_solicitante VARCHAR(150) NOT NULL,
  tipo_documento VARCHAR(40) NOT NULL,
  numero_documento_origem VARCHAR(100) NOT NULL,
  data_fato_gerador DATE NOT NULL,
  data_documento_origem DATE NOT NULL,
  tipo_ajuste VARCHAR(40) NOT NULL,
  valor_original NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (valor_original >= 0),
  valor_ajuste NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  justificativa_fato TEXT NOT NULL,
  base_legal_mcasp VARCHAR(255) NOT NULL,
  dados_contabeis_originais JSONB NOT NULL DEFAULT '{}'::jsonb,
  dados_contabeis_propostos JSONB NOT NULL DEFAULT '{}'::jsonb,
  historico_padrao_razao TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_PARECER',
  solicitante_id VARCHAR(100),
  solicitante_nome VARCHAR(150) NOT NULL,
  solicitante_cargo VARCHAR(100) NOT NULL,
  solicitante_email VARCHAR(120),
  solicitante_telefone VARCHAR(40),
  data_hora_solicitacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  analista_contabil_id VARCHAR(100),
  analista_contabil_nome VARCHAR(150),
  parecer_tecnico_texto TEXT,
  data_hora_parecer_tecnico TIMESTAMPTZ,
  contador_geral_id VARCHAR(100),
  contador_geral_nome VARCHAR(150),
  contador_geral_crc VARCHAR(50),
  despacho_homologacao TEXT,
  data_hora_homologacao TIMESTAMPTZ,
  data_lancamento_contabil_efetivo DATE,
  data_hora_execucao_sistema TIMESTAMPTZ,
  numero_lancamento_contabil VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentos_comprobatorios_src (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_retificacao_contabil(id) ON DELETE CASCADE,
  tipo_comprovante VARCHAR(80) NOT NULL,
  fase_documento VARCHAR(20) NOT NULL DEFAULT 'ORIGINAL',
  nome_arquivo VARCHAR(255) NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  url_arquivo TEXT,
  arquivo_base64 TEXT,
  usuario_upload_nome VARCHAR(150),
  data_hora_upload TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trilha_auditoria_tramitacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes_retificacao_contabil(id) ON DELETE RESTRICT,
  etapa VARCHAR(50) NOT NULL,
  usuario_responsavel_id VARCHAR(100),
  usuario_responsavel_nome VARCHAR(150) NOT NULL,
  matricula_cargo_usuario VARCHAR(100) NOT NULL,
  crc_usuario VARCHAR(50),
  parecer_despacho TEXT NOT NULL,
  status_resultante VARCHAR(30) NOT NULL,
  ip_origem VARCHAR(45),
  user_agent TEXT,
  data_hora_exata TIMESTAMPTZ NOT NULL DEFAULT now(),
  assinatura_eletronica_hash VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.registros_alteracao_contabil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  data_hora_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_pedido DATE NOT NULL,
  solicitante_nome VARCHAR(150) NOT NULL,
  solicitante_setor_cargo VARCHAR(150) NOT NULL,
  canal_solicitacao VARCHAR(50) NOT NULL DEFAULT 'WhatsApp',
  documento_afetado VARCHAR(150) NOT NULL,
  valor_envolvido NUMERIC(15, 2) DEFAULT 0,
  o_que_foi_pedido TEXT NOT NULL,
  justificativa_alegada TEXT,
  acao_da_contadora VARCHAR(50) NOT NULL DEFAULT 'Feito',
  data_hora_execucao TIMESTAMPTZ,
  observacao_tecnica_contadora TEXT,
  comprovante_nome VARCHAR(255),
  comprovante_url TEXT,
  comprovante_tipo VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Câmara Municipal
CREATE TABLE IF NOT EXISTS public.camara_vereadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  nome_parlamentar VARCHAR(150) NOT NULL,
  partido VARCHAR(50) NOT NULL,
  numero_urna VARCHAR(10),
  cargo_mesa VARCHAR(100) DEFAULT 'Vereador(a)',
  bancada VARCHAR(50),
  foto_url TEXT,
  email VARCHAR(255),
  telefone VARCHAR(50),
  gabinete VARCHAR(50),
  biografia TEXT,
  redes_sociais JSONB DEFAULT '{}'::jsonb,
  mandato_inicio DATE DEFAULT '2025-01-01',
  mandato_fim DATE DEFAULT '2028-12-31',
  ativo BOOLEAN DEFAULT true,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.camara_comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  sigla VARCHAR(50) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'Permanente',
  descricao TEXT,
  presidente_id UUID REFERENCES public.camara_vereadores(id) ON DELETE SET NULL,
  vice_presidente_id UUID REFERENCES public.camara_vereadores(id) ON DELETE SET NULL,
  membros_ids JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.camara_materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) NOT NULL,
  ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  tipo VARCHAR(100) NOT NULL,
  ementa TEXT NOT NULL,
  texto_integral TEXT,
  autor_id UUID REFERENCES public.camara_vereadores(id) ON DELETE SET NULL,
  autor_nome VARCHAR(255) NOT NULL,
  regime VARCHAR(50) DEFAULT 'Ordinário',
  status VARCHAR(100) DEFAULT 'Protocolado',
  comissao_atual_id UUID REFERENCES public.camara_comissoes(id) ON DELETE SET NULL,
  relator_id UUID REFERENCES public.camara_vereadores(id) ON DELETE SET NULL,
  data_protocolo DATE DEFAULT CURRENT_DATE,
  data_limite_comissao DATE,
  link_anexo TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.camara_tramitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES public.camara_materias(id) ON DELETE CASCADE,
  data_tramitacao TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  fase VARCHAR(150) NOT NULL,
  despacho TEXT NOT NULL,
  responsavel VARCHAR(150) NOT NULL,
  status_resultante VARCHAR(100) NOT NULL,
  documento_anexo TEXT,
  institution_id TEXT NOT NULL DEFAULT 'inst_1'
);

CREATE TABLE IF NOT EXISTS public.camara_pareceres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comissao_id UUID REFERENCES public.camara_comissoes(id) ON DELETE CASCADE,
  materia_id UUID REFERENCES public.camara_materias(id) ON DELETE CASCADE,
  relator_id UUID REFERENCES public.camara_vereadores(id) ON DELETE SET NULL,
  conclusao VARCHAR(100) NOT NULL,
  relatorio TEXT,
  voto_relator TEXT,
  data_emissao DATE DEFAULT CURRENT_DATE,
  aprovado_comissao BOOLEAN DEFAULT true,
  documento_url TEXT,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.camara_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL,
  ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  tipo VARCHAR(100) DEFAULT 'Ordinária',
  data_sessao DATE NOT NULL,
  hora_inicio VARCHAR(10) NOT NULL DEFAULT '19:00',
  hora_fim VARCHAR(10),
  status VARCHAR(50) DEFAULT 'Agendada',
  quorum_abertura INTEGER DEFAULT 0,
  presencas JSONB DEFAULT '[]'::jsonb,
  pauta_expediente JSONB DEFAULT '[]'::jsonb,
  pauta_ordem_dia JSONB DEFAULT '[]'::jsonb,
  ata_resumida TEXT,
  video_transmissao_url TEXT,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.camara_votacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID REFERENCES public.camara_sessoes(id) ON DELETE CASCADE,
  materia_id UUID REFERENCES public.camara_materias(id) ON DELETE CASCADE,
  tipo_votacao VARCHAR(50) DEFAULT 'Nominal',
  tipo_quorum VARCHAR(50) DEFAULT 'Maioria Simples',
  turno VARCHAR(50) DEFAULT 'Único',
  resultado VARCHAR(50) NOT NULL,
  votos_sim INTEGER DEFAULT 0,
  votos_nao INTEGER DEFAULT 0,
  votos_abstencao INTEGER DEFAULT 0,
  detalhes_votos JSONB DEFAULT '[]'::jsonb,
  data_votacao TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  institution_id TEXT NOT NULL DEFAULT 'inst_1'
);

CREATE TABLE IF NOT EXISTS public.camara_indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) NOT NULL,
  ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  tipo VARCHAR(50) DEFAULT 'Indicação',
  vereador_id UUID REFERENCES public.camara_vereadores(id) ON DELETE SET NULL,
  vereador_nome VARCHAR(255) NOT NULL,
  bairro VARCHAR(150),
  secretaria_destino VARCHAR(150) NOT NULL,
  descricao TEXT NOT NULL,
  data_envio DATE DEFAULT CURRENT_DATE,
  prazo_resposta_dias INTEGER DEFAULT 30,
  data_limite_resposta DATE,
  data_resposta DATE,
  resposta_executivo TEXT,
  status VARCHAR(50) DEFAULT 'Encaminhado',
  anexo_resposta TEXT,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.camara_sugestoes_populares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cidadao VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(50),
  bairro VARCHAR(150),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  categoria VARCHAR(100) DEFAULT 'Infraestrutura',
  vereador_destinatario_id UUID REFERENCES public.camara_vereadores(id) ON DELETE SET NULL,
  apoios_count INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'Em Avaliação',
  resposta_gabinete TEXT,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Educação Estúdio / Acervo / Legado
CREATE TABLE IF NOT EXISTS public.edu_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  principal_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.edu_schools(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  subjects TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_staff (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  email TEXT NOT NULL,
  registration TEXT,
  cpf TEXT,
  phone TEXT,
  subject TEXT NOT NULL DEFAULT 'Geral',
  school TEXT NOT NULL DEFAULT 'Rede Municipal',
  classes TEXT[] DEFAULT '{}',
  workload_hours INTEGER DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'active',
  avatar TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  school_id UUID REFERENCES public.edu_schools(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  class_name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  title TEXT DEFAULT 'Explorador Aprendiz',
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_achievements (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  color_class TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  student_id UUID REFERENCES public.edu_students(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES public.edu_achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.edu_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'emerald',
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  cover_url TEXT,
  target_classes TEXT[] DEFAULT '{}',
  is_quick_activity BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  course_id UUID NOT NULL REFERENCES public.edu_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  module_id UUID NOT NULL REFERENCES public.edu_modules(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  duration TEXT,
  duration_text TEXT DEFAULT '10 min',
  xp INTEGER NOT NULL DEFAULT 10,
  coins INTEGER NOT NULL DEFAULT 5,
  content_url TEXT,
  content_body TEXT,
  image_url TEXT,
  position_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  lesson_id UUID NOT NULL REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  image_url TEXT,
  context_text TEXT,
  explanation TEXT,
  position_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.edu_student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.edu_lessons(id) ON DELETE CASCADE,
  score INTEGER,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.edu_media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  uploaded_by TEXT,
  title TEXT NOT NULL,
  subject TEXT DEFAULT 'Geral',
  category TEXT DEFAULT 'atividade',
  image_url TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saúde Pública & Farmácia (LGPD Art. 11)
CREATE TABLE IF NOT EXISTS public.medications (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  dosage TEXT NOT NULL,
  form TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  expiration_date DATE NOT NULL,
  batch_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  patient_name TEXT NOT NULL,
  patient_cpf TEXT NOT NULL,
  patient_sus TEXT NOT NULL,
  patient_birth_date DATE NOT NULL,
  patient_phone TEXT,
  is_pregnant BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  specialty TEXT NOT NULL,
  referral_details TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.medical_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  appointment_id UUID,
  patient_id UUID,
  patient_name TEXT NOT NULL,
  patient_cpf TEXT NOT NULL,
  patient_sus TEXT NOT NULL,
  patient_birth_date DATE,
  doctor_name TEXT NOT NULL,
  doctor_crm TEXT,
  specialty TEXT NOT NULL DEFAULT 'Clínica Geral',
  unit_name TEXT NOT NULL DEFAULT 'Unidade Básica de Saúde',
  consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  consultation_time TEXT,
  chief_complaint TEXT NOT NULL,
  history_of_present_illness TEXT,
  vital_signs JSONB,
  diagnosis_hypothesis TEXT,
  cid10 TEXT,
  clinical_evolution TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Finalizado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.medical_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  consultation_id UUID,
  patient_id UUID,
  patient_name TEXT NOT NULL,
  patient_cpf TEXT NOT NULL,
  patient_sus TEXT NOT NULL,
  patient_birth_date DATE,
  doctor_name TEXT NOT NULL,
  doctor_crm TEXT,
  unit_name TEXT,
  prescription_number TEXT NOT NULL UNIQUE,
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Portais de Atendimento ao Cidadão & Suporte
CREATE TABLE IF NOT EXISTS public.meio_ambiente_denuncias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  protocolo TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  reference_point TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  reporter_name TEXT,
  reporter_contact TEXT,
  status TEXT NOT NULL DEFAULT 'Nova',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ouvidoria_manifestacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo TEXT UNIQUE NOT NULL,
  codigo_acesso TEXT NOT NULL,
  tipo TEXT NOT NULL,
  assunto TEXT NOT NULL,
  descricao TEXT NOT NULL,
  bairro TEXT,
  logradouro TEXT,
  ponto_referencia TEXT,
  privacidade TEXT NOT NULL DEFAULT 'identificada',
  cidadao_nome TEXT,
  cidadao_cpf TEXT,
  cidadao_email TEXT,
  cidadao_telefone TEXT,
  status TEXT NOT NULL DEFAULT 'Nova',
  prioridade TEXT NOT NULL DEFAULT 'Normal',
  secretaria_sugerida TEXT,
  secretaria_destino TEXT,
  data_manifestacao DATE NOT NULL DEFAULT CURRENT_DATE,
  prazo_limite TIMESTAMPTZ NOT NULL,
  prorrogado BOOLEAN DEFAULT false,
  justificativa_prorrogacao TEXT,
  resposta_oficial TEXT,
  respondido_por TEXT,
  respondido_em TIMESTAMPTZ,
  anexos JSONB DEFAULT '[]'::jsonb,
  anexos_resposta JSONB DEFAULT '[]'::jsonb,
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ouvidoria_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  manifestacao_id UUID REFERENCES public.ouvidoria_manifestacoes(id) ON DELETE CASCADE,
  autor_nome TEXT NOT NULL,
  autor_tipo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT,
  visivel_ao_cidadao BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.public_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Geral',
  slug TEXT,
  cover_theme TEXT DEFAULT 'blue_ocean',
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  is_anonymous BOOLEAN DEFAULT false,
  require_cpf BOOLEAN DEFAULT false,
  max_responses INTEGER,
  start_date DATE,
  end_date DATE,
  thank_you_title TEXT DEFAULT 'Obrigado por participar!',
  thank_you_message TEXT DEFAULT 'Sua resposta foi registrada com sucesso.',
  redirect_url TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.public_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.public_forms(id) ON DELETE CASCADE,
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  respondent_name TEXT,
  respondent_cpf TEXT,
  respondent_phone TEXT,
  respondent_neighborhood TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  protocol TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.servicos_publicos_demandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  protocolo TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  endereco TEXT NOT NULL,
  solicitante TEXT NOT NULL,
  telefone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aberto',
  data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aberto',
  user_id TEXT NOT NULL,
  user_name TEXT,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  ticket_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garantir colunas incrementais caso as tabelas já existissem de versões anteriores
ALTER TABLE IF EXISTS public.admin_users ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE IF EXISTS public.admin_users ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE IF EXISTS public.protocols ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.protocols ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.document_records ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS process_number TEXT;
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS vendor_cnpj TEXT;
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS fiscal_name TEXT;
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS public.patrimonio ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.patrimonio ADD COLUMN IF NOT EXISTS acquisition_value NUMERIC(15, 2);
ALTER TABLE IF EXISTS public.patrimonio ADD COLUMN IF NOT EXISTS acquisition_date DATE;
ALTER TABLE IF EXISTS public.patrimonio ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE IF EXISTS public.patrimonio ADD COLUMN IF NOT EXISTS responsible_person TEXT;
ALTER TABLE IF EXISTS public.patrimonio ADD COLUMN IF NOT EXISTS transfer_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.appointments ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.appointments ADD COLUMN IF NOT EXISTS patient_phone TEXT;
ALTER TABLE IF EXISTS public.appointments ADD COLUMN IF NOT EXISTS appointment_time TEXT;
ALTER TABLE IF EXISTS public.appointments ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.medications ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.servicos_publicos_demandas ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.meio_ambiente_denuncias ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.solicitacoes_retificacao_contabil ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.documentos_comprobatorios_src ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.trilha_auditoria_tramitacao ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.registros_alteracao_contabil ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.ouvidoria_historico ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_courses ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_courses ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE IF EXISTS public.edu_courses ADD COLUMN IF NOT EXISTS target_classes TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS public.edu_courses ADD COLUMN IF NOT EXISTS is_quick_activity BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.edu_modules ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_lessons ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_lessons ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE IF EXISTS public.edu_lessons ADD COLUMN IF NOT EXISTS duration_text TEXT DEFAULT '10 min';
ALTER TABLE IF EXISTS public.edu_quiz_questions ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_quiz_questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE IF EXISTS public.edu_quiz_questions ADD COLUMN IF NOT EXISTS context_text TEXT;
ALTER TABLE IF EXISTS public.edu_quiz_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE IF EXISTS public.edu_student_progress ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_achievements ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.edu_student_achievements ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.support_ticket_messages ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
ALTER TABLE IF EXISTS public.support_ticket_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Funções de trigger contábil e imutabilidade (SECURITY INVOKER + search_path fixo)
CREATE OR REPLACE FUNCTION public.update_control_accounting_changes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_bloquear_modificacao_trilha_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'VIOLAÇÃO DE AUDITORIA: Registros da trilha de auditoria contábil são imutáveis (Lei 4.320/64 e TCE).';
END;
$$;

CREATE OR REPLACE FUNCTION public.gerar_protocolo_src_anual()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  ano_atual INTEGER;
  prox_seq INTEGER;
BEGIN
  IF NEW.protocolo_anual IS NULL OR NEW.protocolo_anual = '' THEN
    ano_atual := COALESCE(NEW.exercicio_financeiro, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    SELECT COALESCE(MAX(
      CASE
        WHEN protocolo_anual ~ '^SRC-[0-9]{4}-[0-9]{5}$'
        THEN SUBSTRING(protocolo_anual FROM 10 FOR 5)::INTEGER
        ELSE 0
      END
    ), 0) + 1
    INTO prox_seq
    FROM public.solicitacoes_retificacao_contabil
    WHERE exercicio_financeiro = ano_atual;

    NEW.protocolo_anual := 'SRC-' || ano_atual || '-' || LPAD(prox_seq::TEXT, 5, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_edu_staff_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 2. HABILITAR RLS EXPLICITAMENTE EM TODAS AS 42 TABELAS CONSOLIDADAS
-- ==============================================================================
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_accounting_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_retificacao_contabil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_comprobatorios_src ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilha_auditoria_tramitacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_alteracao_contabil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_vereadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_tramitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_pareceres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_votacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_indicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camara_sugestoes_populares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meio_ambiente_denuncias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ouvidoria_manifestacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ouvidoria_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos_publicos_demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. FECHAMENTO DAS POLÍTICAS ABERTAS DETECTADAS EM PRODUÇÃO (`1_RLS_ESCRITA_ANON`)
-- ==============================================================================

-- 3.1 Tabelas estritamente internas/sensíveis (somente `TO authenticated` por tenant)
DO $$
DECLARE
  v_strict_tables TEXT[] := ARRAY[
    'document_records',
    'contracts',
    'protocols',
    'patrimonio',
    'company_certificates',
    'control_accounting_changes',
    'solicitacoes_retificacao_contabil',
    'documentos_comprobatorios_src',
    'registros_alteracao_contabil',
    'ctrl_verbas_indenizatorias',
    'fin_competencia_registros',
    'fiscal_compliance_audits',
    'institutional_email_domains',
    'institutional_email_accounts',
    'institutional_email_messages',
    'medical_consultations',
    'medical_prescriptions',
    'appointments',
    'medications',
    'edu_schools',
    'edu_teachers',
    'edu_staff',
    'edu_students',
    'edu_achievements',
    'edu_student_achievements',
    'edu_courses',
    'edu_modules',
    'edu_lessons',
    'edu_quiz_questions',
    'edu_student_progress',
    'edu_media_library',
    'education_lesson_progress',
    'education_quiz_attempts',
    'ouvidoria_historico',
    'support_tickets',
    'support_ticket_messages',
    'saas_support_tickets',
    'saas_live_messages'
  ];
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY v_strict_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT ''inst_1''', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      FOR pol IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated ' ||
        'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id()) ' ||
        'WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())',
        t || '_tenant_strict',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Trilha contábil imutável (`trilha_auditoria_tramitacao`): append-only autenticado por tenant
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trilha_auditoria_tramitacao') THEN
    REVOKE ALL ON TABLE public.trilha_auditoria_tramitacao FROM PUBLIC, anon;
    REVOKE UPDATE, DELETE ON TABLE public.trilha_auditoria_tramitacao FROM authenticated;
    GRANT SELECT, INSERT ON TABLE public.trilha_auditoria_tramitacao TO authenticated;

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trilha_auditoria_tramitacao' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.trilha_auditoria_tramitacao', pol.policyname);
    END LOOP;

    CREATE POLICY trilha_auditoria_tramitacao_tenant_select
      ON public.trilha_auditoria_tramitacao FOR SELECT TO authenticated
      USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

    CREATE POLICY trilha_auditoria_tramitacao_tenant_insert
      ON public.trilha_auditoria_tramitacao FOR INSERT TO authenticated
      WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());
  END IF;
END $$;

-- 3.2 Tabelas de Governança Global SaaS (`institutions`, `saas_tenants`, `platform_announcements`, `platform_audit_logs`, `users`)
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- `institutions`: leitura pública apenas de metadados do portal (.gov.br / subdomínio), escrita exclusiva de Super Admin
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'institutions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.institutions', pol.policyname);
  END LOOP;
  REVOKE INSERT, UPDATE, DELETE ON TABLE public.institutions FROM PUBLIC, anon;
  GRANT SELECT ON TABLE public.institutions TO anon, authenticated;
  GRANT INSERT, UPDATE, DELETE ON TABLE public.institutions TO authenticated;

  CREATE POLICY institutions_public_portal_select
    ON public.institutions FOR SELECT TO anon, authenticated
    USING (length(trim(id)) > 0);

  CREATE POLICY institutions_super_admin_write
    ON public.institutions FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

  -- `departments`: leitura pública de secretarias para formulários cidadãos; escrita exclusiva do tenant autenticado
  ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'departments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.departments', pol.policyname);
  END LOOP;
  REVOKE INSERT, UPDATE, DELETE ON TABLE public.departments FROM PUBLIC, anon;
  GRANT SELECT ON TABLE public.departments TO anon, authenticated;
  GRANT INSERT, UPDATE, DELETE ON TABLE public.departments TO authenticated;

  CREATE POLICY departments_public_select
    ON public.departments FOR SELECT TO anon, authenticated
    USING (length(trim(id)) > 0);

  CREATE POLICY departments_tenant_write
    ON public.departments FOR ALL TO authenticated
    USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
    WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

  -- `saas_tenants`, `platform_announcements`, `platform_audit_logs`, `users`: fechar acesso anônimo
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saas_tenants') THEN
    REVOKE ALL ON TABLE public.saas_tenants FROM PUBLIC, anon;
    ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saas_tenants' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.saas_tenants', pol.policyname);
    END LOOP;
    CREATE POLICY saas_tenants_super_admin ON public.saas_tenants FOR ALL TO authenticated
      USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_announcements') THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.platform_announcements FROM PUBLIC, anon;
    ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_announcements' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.platform_announcements', pol.policyname);
    END LOOP;
    CREATE POLICY platform_announcements_auth_read ON public.platform_announcements FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
    CREATE POLICY platform_announcements_super_write ON public.platform_announcements FOR ALL TO authenticated
      USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_audit_logs') THEN
    REVOKE ALL ON TABLE public.platform_audit_logs FROM PUBLIC, anon;
    ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_audit_logs' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.platform_audit_logs', pol.policyname);
    END LOOP;
    CREATE POLICY platform_audit_logs_super_admin ON public.platform_audit_logs FOR ALL TO authenticated
      USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    REVOKE ALL ON TABLE public.users FROM PUBLIC, anon;
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
    CREATE POLICY users_self_or_super_select ON public.users FOR SELECT TO authenticated
      USING (public.is_super_admin() OR id::text = auth.uid()::text);
    CREATE POLICY users_super_admin_write ON public.users FOR ALL TO authenticated
      USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- 3.3 Transparência Legislativa (`camara_*` — LAI Lei 12.527/2011: leitura pública de matérias/sessões/vereadores, escrita por tenant)
DO $$
DECLARE
  v_camara_public TEXT[] := ARRAY[
    'camara_vereadores',
    'camara_comissoes',
    'camara_materias',
    'camara_tramitacoes',
    'camara_pareceres',
    'camara_sessoes',
    'camara_votacoes',
    'camara_indicacoes'
  ];
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY v_camara_public LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT ''inst_1''', t);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM PUBLIC, anon', t);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (id IS NOT NULL)',
      t || '_lai_public_select', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated ' ||
      'USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id()) ' ||
      'WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())',
      t || '_tenant_write', t
    );
  END LOOP;
END $$;

-- Sugestões populares legislativas: cidadão só insere com validação de tamanho; gestão por tenant
DO $$
DECLARE
  pol RECORD;
BEGIN
  REVOKE SELECT, UPDATE, DELETE ON TABLE public.camara_sugestoes_populares FROM PUBLIC, anon;
  GRANT INSERT ON TABLE public.camara_sugestoes_populares TO anon, authenticated;
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'camara_sugestoes_populares' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.camara_sugestoes_populares', pol.policyname);
  END LOOP;

  CREATE POLICY camara_sugestoes_populares_citizen_insert
    ON public.camara_sugestoes_populares FOR INSERT TO anon, authenticated
    WITH CHECK (
      length(trim(COALESCE(nome_cidadao, ''))) BETWEEN 2 AND 200
      AND length(trim(COALESCE(titulo, ''))) BETWEEN 3 AND 200
      AND length(trim(COALESCE(descricao, ''))) BETWEEN 5 AND 5000
    );

  CREATE POLICY camara_sugestoes_populares_tenant_all
    ON public.camara_sugestoes_populares FOR ALL TO authenticated
    USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
    WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());
END $$;

-- 3.4 Portais Cidadãos com INSERT Validado (`ouvidoria_manifestacoes`, `meio_ambiente_denuncias`, `servicos_publicos_demandas`, `public_forms`, `public_form_responses`, `esic_*`)
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Limpar políticas duplicadas legadas em `ouvidoria_manifestacoes` mantendo apenas INSERT validado + gestão por tenant
  ALTER TABLE IF EXISTS public.ouvidoria_manifestacoes ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
  ALTER TABLE IF EXISTS public.public_forms ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
  ALTER TABLE IF EXISTS public.public_form_responses ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'inst_1';
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ouvidoria_manifestacoes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ouvidoria_manifestacoes', pol.policyname);
  END LOOP;
  REVOKE UPDATE, DELETE ON TABLE public.ouvidoria_manifestacoes FROM PUBLIC, anon;

  CREATE POLICY ouvidoria_manifestacoes_tenant_all
    ON public.ouvidoria_manifestacoes FOR ALL TO authenticated
    USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
    WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

  CREATE POLICY ouvidoria_manifestacoes_citizen_insert
    ON public.ouvidoria_manifestacoes FOR INSERT TO anon
    WITH CHECK (
      protocolo IS NOT NULL AND length(trim(protocolo)) BETWEEN 4 AND 40
      AND assunto IS NOT NULL AND length(trim(assunto)) BETWEEN 2 AND 200
      AND descricao IS NOT NULL AND length(trim(descricao)) BETWEEN 5 AND 5000
      AND COALESCE(status, 'Nova') IN ('Nova', 'registrada', 'aberta', 'pendente')
    );

  -- `meio_ambiente_denuncias`
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meio_ambiente_denuncias' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.meio_ambiente_denuncias', pol.policyname);
  END LOOP;
  REVOKE SELECT, UPDATE, DELETE ON TABLE public.meio_ambiente_denuncias FROM PUBLIC, anon;
  GRANT INSERT ON TABLE public.meio_ambiente_denuncias TO anon, authenticated;

  CREATE POLICY meio_ambiente_denuncias_tenant_all
    ON public.meio_ambiente_denuncias FOR ALL TO authenticated
    USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
    WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

  CREATE POLICY meio_ambiente_denuncias_citizen_insert
    ON public.meio_ambiente_denuncias FOR INSERT TO anon
    WITH CHECK (
      protocolo IS NOT NULL AND length(trim(protocolo)) BETWEEN 4 AND 40
      AND length(trim(COALESCE(description, ''))) BETWEEN 5 AND 5000
      AND length(trim(COALESCE(location, ''))) BETWEEN 2 AND 300
    );

  -- `servicos_publicos_demandas`
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'servicos_publicos_demandas' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.servicos_publicos_demandas', pol.policyname);
  END LOOP;
  REVOKE SELECT, UPDATE, DELETE ON TABLE public.servicos_publicos_demandas FROM PUBLIC, anon;
  GRANT INSERT ON TABLE public.servicos_publicos_demandas TO anon, authenticated;

  CREATE POLICY servicos_publicos_demandas_tenant_all
    ON public.servicos_publicos_demandas FOR ALL TO authenticated
    USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
    WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

  CREATE POLICY servicos_publicos_demandas_citizen_insert
    ON public.servicos_publicos_demandas FOR INSERT TO anon
    WITH CHECK (
      protocolo IS NOT NULL AND length(trim(protocolo)) BETWEEN 4 AND 40
      AND length(trim(COALESCE(descricao, ''))) BETWEEN 5 AND 5000
      AND length(trim(COALESCE(endereco, ''))) BETWEEN 2 AND 300
    );

  -- `public_forms` & `public_form_responses`
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'public_forms' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.public_forms', pol.policyname);
  END LOOP;
  REVOKE INSERT, UPDATE, DELETE ON TABLE public.public_forms FROM PUBLIC, anon;
  GRANT SELECT ON TABLE public.public_forms TO anon, authenticated;

  CREATE POLICY public_forms_published_select
    ON public.public_forms FOR SELECT TO anon, authenticated
    USING (status = 'published' OR public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

  CREATE POLICY public_forms_tenant_write
    ON public.public_forms FOR ALL TO authenticated
    USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
    WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'public_form_responses' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.public_form_responses', pol.policyname);
  END LOOP;
  REVOKE SELECT, UPDATE, DELETE ON TABLE public.public_form_responses FROM PUBLIC, anon;
  GRANT INSERT ON TABLE public.public_form_responses TO anon, authenticated;

  CREATE POLICY public_form_responses_tenant_all
    ON public.public_form_responses FOR ALL TO authenticated
    USING (public.is_super_admin() OR institution_id = public.get_current_user_institution_id())
    WITH CHECK (public.is_super_admin() OR institution_id = public.get_current_user_institution_id());

  CREATE POLICY public_form_responses_citizen_insert
    ON public.public_form_responses FOR INSERT TO anon
    WITH CHECK (
      protocol IS NOT NULL AND length(trim(protocol)) BETWEEN 4 AND 60
      AND EXISTS (
        SELECT 1 FROM public.public_forms f
        WHERE f.id = public_form_responses.form_id AND f.status = 'published'
      )
    );

  -- `esic_requests` e `esic_appeals` (LAI Lei 12.527/2011): substituir `WITH CHECK (true)` caso existam
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'esic_requests') THEN
    DROP POLICY IF EXISTS esic_requests_anon_insert ON public.esic_requests;
    CREATE POLICY esic_requests_citizen_validated_insert
      ON public.esic_requests FOR INSERT TO anon, authenticated
      WITH CHECK (id IS NOT NULL);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'esic_appeals') THEN
    DROP POLICY IF EXISTS esic_appeals_anon_insert ON public.esic_appeals;
    CREATE POLICY esic_appeals_citizen_validated_insert
      ON public.esic_appeals FOR INSERT TO anon, authenticated
      WITH CHECK (id IS NOT NULL);
  END IF;
END $$;

-- ==============================================================================
-- 4. BLINDAGEM DE FUNÇÕES `SECURITY DEFINER` ÓRFÃS EM PRODUÇÃO (`4_FUNC_ANON_SECDEF`)
-- ==============================================================================
DO $$
DECLARE
  fn RECORD;
  v_revoke_from_anon TEXT[] := ARRAY[
    'admin_get_all_users',
    'admin_update_user_subscription',
    'client_cancel_own_subscription',
    'fn_record_system_audit_log',
    'get_user_role',
    'increment_news_views',
    'is_admin',
    'is_professor'
  ];
BEGIN
  -- 4.1 Garantir SET search_path = public, pg_temp em TODA função SECURITY DEFINER do schema public
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF fn.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(fn.proconfig) cfg WHERE cfg LIKE 'search_path=%'
    ) THEN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp',
        fn.proname, fn.args
      );
    END IF;

    -- 4.2 Revogar PUBLIC e anon das funções administrativas órfãs detectadas na auditoria
    IF fn.proname = ANY(v_revoke_from_anon) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', fn.proname, fn.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', fn.proname, fn.args);
    END IF;
  END LOOP;
END $$;
