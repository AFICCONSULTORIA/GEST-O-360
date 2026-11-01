-- ==============================================================================
-- Migration: 20261031120000_saas_support_tickets_and_live_chat.sql
-- Descrição: Controle de transbordo humano (chat_mode, attendant) e mensagens em tempo real
-- ==============================================================================

-- Garantir existência da tabela base caso não exista
CREATE TABLE IF NOT EXISTS public.saas_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol TEXT,
    institution_id UUID,
    institution_name TEXT,
    requester_name TEXT,
    requester_email TEXT,
    subject TEXT,
    category TEXT DEFAULT 'suporte_geral',
    priority TEXT DEFAULT 'media',
    status TEXT DEFAULT 'aberto',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1. Estender a tabela de tickets com status de controle de transbordo
ALTER TABLE public.saas_support_tickets 
ADD COLUMN IF NOT EXISTS chat_mode TEXT DEFAULT 'bot' CHECK (chat_mode IN ('bot', 'waiting_human', 'human_active', 'closed')),
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS attendant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS attendant_name TEXT;

-- 2. Tabela de Mensagens do Chat em Tempo Real
CREATE TABLE IF NOT EXISTS public.saas_live_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.saas_support_tickets(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'bot', 'admin')),
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar Realtime nas tabelas para escuta instantânea (Idempotente)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.saas_support_tickets;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.saas_live_messages;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;

-- 4. Políticas de RLS
ALTER TABLE public.saas_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_live_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso aos tickets de suporte" ON public.saas_support_tickets;
CREATE POLICY "Acesso aos tickets de suporte" ON public.saas_support_tickets
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'superadmin' 
        OR auth.jwt() ->> 'email' LIKE '%afic%'
        OR requester_email = auth.jwt() ->> 'email'
    );

DROP POLICY IF EXISTS "Acesso as mensagens do chamado" ON public.saas_live_messages;
CREATE POLICY "Acesso as mensagens do chamado" ON public.saas_live_messages
    FOR ALL USING (
        -- Administradores ou o próprio usuário que abriu o ticket
        auth.jwt() ->> 'role' = 'superadmin' 
        OR auth.jwt() ->> 'email' LIKE '%afic%'
        OR ticket_id IN (
            SELECT id FROM public.saas_support_tickets 
            WHERE requester_email = auth.jwt() ->> 'email'
        )
    );

