-- ====================================================================
-- GESTÃO 360 · FUNÇÃO DE RESTAURAÇÃO DE SENHA (ASSINATURA ÚNICA)
-- ====================================================================
-- Resolve o conflito de sobrecarga ("Could not choose the best candidate").
--
-- COMO EXECUTAR:
-- 1. Acesse o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Vá no menu "SQL Editor"
-- 3. Cole todo este código e clique em "Run" (Executar)
-- ====================================================================

-- 1. Habilita a extensão pgcrypto para criptografia bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Remove as versões anteriores com sobrecarga duplicada para evitar ambiguidade no PostgREST
DROP FUNCTION IF EXISTS public.reset_user_password(uuid);
DROP FUNCTION IF EXISTS public.reset_user_password(text);

-- 3. Cria uma ÚNICA função aceitando TEXT (o formato padrão enviado via JSON pelo client)
CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Atualiza a senha no Supabase Auth para a senha padrão 'gestao123@' criptografada em bcrypt
  UPDATE auth.users
  SET 
    encrypted_password = crypt('gestao123@', gen_salt('bf')),
    updated_at = now()
  WHERE id = target_user_id::uuid;

  -- Atualiza o last_login na tabela admin_users para 'Nunca' (forçando troca no próximo login)
  UPDATE public.admin_users
  SET last_login = 'Nunca'
  WHERE id = target_user_id OR id = target_user_id::uuid::text;
END;
$$;

-- 4. Concede permissão de execução à API
GRANT EXECUTE ON FUNCTION public.reset_user_password(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.reset_user_password(text) IS 'Restaura a senha de um usuário para gestao123@ e define last_login como Nunca.';
