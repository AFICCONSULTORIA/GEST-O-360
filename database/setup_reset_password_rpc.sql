-- ====================================================================
-- GESTÃO 360 · FUNÇÃO DE RESTAURAÇÃO DE SENHA PARA ADMINISTRADORES
-- ====================================================================
-- Esta função permite que o Super Admin / Administrador restaure a senha
-- de qualquer usuário para a senha padrão 'gestao123@' e force a troca
-- de senha no próximo login ('Nunca').
--
-- COMO EXECUTAR:
-- 1. Acesse o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Vá no menu "SQL Editor" (ícone de terminal)
-- 3. Cole todo este código e clique em "Run" (Executar)
-- ====================================================================

-- 1. Habilita a extensão pgcrypto para criptografia bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Cria a função principal para UUID
CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id UUID)
RETURNS VOID
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
  WHERE id = target_user_id;

  -- Atualiza o last_login na tabela admin_users para 'Nunca' (forçando a troca no próximo login)
  UPDATE public.admin_users
  SET last_login = 'Nunca'
  WHERE id = target_user_id::text OR id = target_user_id::uuid::text;
END;
$$;

-- 3. Cria a sobrecarga para TEXT (caso o client passe target_user_id como string)
CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  PERFORM public.reset_user_password(target_user_id::UUID);
END;
$$;

-- 4. Concede permissão de execução para a API pública (anon e authenticated)
GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_user_password(TEXT) TO anon, authenticated, service_role;

-- 5. Comentário explicativo na função
COMMENT ON FUNCTION public.reset_user_password(UUID) IS 'Restaura a senha de um usuário para gestao123@ e define last_login como Nunca.';
