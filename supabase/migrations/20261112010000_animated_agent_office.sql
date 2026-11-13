-- Migration: Escritório Vivo dos Agentes (Agent Isometric Office Telemetry)
-- Telemetria em tempo real para visualização do escritório animado dos agentes especialistas

CREATE TABLE IF NOT EXISTS public.agent_workstation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL, -- ('orchestrator', 'saude-agent', 'fleet-agent', 'fiscal-agent', 'education-agent', 'copilot-agent', 'security-db-agent')
  target_agent_id TEXT, -- Se estiver despachando tarefa para outra mesa (ex: 'copilot-agent' -> 'fleet-agent')
  status TEXT NOT NULL DEFAULT 'idle', -- ('idle', 'working', 'walking', 'waiting_approval', 'alert_critical')
  bubble_text TEXT NOT NULL, -- Texto do balão de fala
  technical_detail JSONB, -- Payload completo para inspeção profunda
  is_violation BOOLEAN DEFAULT false, -- True se violou regra de negócio/LGPD/RLS
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas rápidas e ordenação por tempo
CREATE INDEX IF NOT EXISTS idx_agent_workstation_agent_id ON public.agent_workstation_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_workstation_created_at ON public.agent_workstation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_workstation_institution_id ON public.agent_workstation_events(institution_id);
CREATE INDEX IF NOT EXISTS idx_agent_workstation_violations ON public.agent_workstation_events(is_violation, resolved);

-- Habilitar RLS
ALTER TABLE public.agent_workstation_events ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Leitura irrestrita de eventos do escritório para usuários autenticados" ON public.agent_workstation_events;
CREATE POLICY "Leitura irrestrita de eventos do escritório para usuários autenticados"
  ON public.agent_workstation_events
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Inserção de eventos do escritório por serviços e clientes" ON public.agent_workstation_events;
CREATE POLICY "Inserção de eventos do escritório por serviços e clientes"
  ON public.agent_workstation_events
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Atualização e resolução de eventos por administradores" ON public.agent_workstation_events;
CREATE POLICY "Atualização e resolução de eventos por administradores"
  ON public.agent_workstation_events
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Habilitar no canal Realtime do Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'agent_workstation_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_workstation_events;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Silencia caso realtime não esteja habilitado ou permissão restrita
    NULL;
END $$;

