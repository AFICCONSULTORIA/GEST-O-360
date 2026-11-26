-- ==============================================================================
-- MIGRAÇÃO FASE 1: REMOÇÃO DA FUNÇÃO INSEGURA reset_user_password E AUDITORIA
-- Motivo:
--   1. `database/setup_reset_password_rpc.sql` criava `public.reset_user_password(text)`
--      como SECURITY DEFINER com `GRANT EXECUTE ... TO anon`, alterando `auth.users`
--      diretamente para uma senha fixa conhecida ('gestao123@') sem validar quem chamou.
--   2. Esta migration revoga permissões de forma idempotente, remove as sobrecargas
--      de `public.reset_user_password` do banco e cria a tabela append-only de
--      auditoria administrativa (`security_admin_audit_logs`) usada pelo endpoint
--      servidor `/api/admin-reset-password`.
-- ==============================================================================

-- 1. Tabela append-only para auditoria de ações administrativas sensíveis (ex.: reset de senha)
CREATE TABLE IF NOT EXISTS public.security_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL,
  actor_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_security_admin_audit_logs_inst
  ON public.security_admin_audit_logs (institution_id, created_at DESC);

ALTER TABLE public.security_admin_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.security_admin_audit_logs FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.security_admin_audit_logs FROM authenticated;
GRANT SELECT ON TABLE public.security_admin_audit_logs TO authenticated;

DROP POLICY IF EXISTS security_admin_audit_logs_tenant_select ON public.security_admin_audit_logs;
CREATE POLICY security_admin_audit_logs_tenant_select
  ON public.security_admin_audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );

-- 2. Substituição defensiva idempotente seguida de REVOKE ALL e remoção definitiva da RPC
DROP FUNCTION IF EXISTS public.reset_user_password(uuid);

CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_caller_inst text := public.get_current_user_institution_id();
BEGIN
  IF v_caller_uid IS NULL OR v_caller_inst IS NULL OR target_user_id IS NULL THEN
    RAISE EXCEPTION 'Operação bloqueada: utilize o endpoint seguro /api/admin-reset-password.';
  END IF;
  RAISE EXCEPTION 'Função public.reset_user_password removida por segurança. Utilize /api/admin-reset-password.';
END;
$$;

REVOKE ALL ON FUNCTION public.reset_user_password(text) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.reset_user_password(text);
