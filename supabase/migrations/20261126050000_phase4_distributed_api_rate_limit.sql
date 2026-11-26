-- ==============================================================================
-- MIGRAÇÃO FASE 4: RATE LIMIT DISTRIBUÍDO PARA ENDPOINTS SERVERLESS / EDGE (api/*)
-- Versão: 20261126050000
-- Objetivo:
--   Permitir que os endpoints serverless/edge (`api/*`) consumam de forma atômica
--   e distribuída a função `public.check_public_rpc_rate_limit` via `service_role`
--   (compartilhando janelas entre instâncias efêmeras da Vercel), mantendo a
--   função revogada para `PUBLIC`, `anon` e `authenticated`.
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_security_rpc_rate_limits_window_start
  ON public.security_rpc_rate_limits (window_start);

REVOKE ALL ON FUNCTION public.check_public_rpc_rate_limit(TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_public_rpc_rate_limit(TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;
