-- ============================================================================
-- MIGRAÇÃO: AUTENTICAÇÃO DEDICADA PARA AMBIENTE WEBMAIL INSTITUCIONAL
-- Data: 2026-11-16
-- Descrição: Adiciona suporte a senha com hash (password_hash) e registro de
--            último acesso (last_login_at) nas contas de e-mail institucional
--            para acesso direto no portal /webmail sem entrar no ERP.
-- ============================================================================

ALTER TABLE public.institutional_email_accounts
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
