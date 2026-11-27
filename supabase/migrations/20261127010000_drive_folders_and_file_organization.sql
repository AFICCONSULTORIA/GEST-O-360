-- ==============================================================================
-- MÓDULO: BANCO DE ARQUIVOS — PASTAS PERSONALIZADAS, SUBPASTAS E ORGANIZAÇÃO
-- Versão: 20261127010000
-- Objetivo:
--   1. Criar tabela `institutional_drive_folders` com suporte a hierarquia
--      (parent_id), cores personalizadas e vínculo com o Google Drive.
--   2. Adicionar colunas de organização em `institutional_drive_files`
--      (`folder_id`, `is_starred`, `tags`, `updated_at`) e conceder GRANT UPDATE
--      para permitir mover, renomear, favoritar e etiquetar arquivos.
--   3. Aplicar RLS multi-tenant estrito com padrão InitPlan `(SELECT ...)`.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.institutional_drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.institutional_drive_folders(id) ON DELETE CASCADE,
  color TEXT NOT NULL DEFAULT 'blue',
  drive_folder_id TEXT,
  created_by_id TEXT,
  created_by_name TEXT NOT NULL DEFAULT 'Servidor Público',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_drive_folders_tenant
  ON public.institutional_drive_folders (institution_id, parent_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inst_drive_folders_sibling_name
  ON public.institutional_drive_folders (
    institution_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(trim(name))
  );

ALTER TABLE public.institutional_drive_folders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.institutional_drive_folders FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.institutional_drive_folders TO authenticated;

DROP POLICY IF EXISTS "institutional_drive_folders_tenant_strict" ON public.institutional_drive_folders;
CREATE POLICY "institutional_drive_folders_tenant_strict"
  ON public.institutional_drive_folders
  FOR ALL
  TO authenticated
  USING (
    (SELECT public.is_super_admin())
    OR institution_id = (SELECT public.get_current_user_institution_id())
  )
  WITH CHECK (
    (SELECT public.is_super_admin())
    OR institution_id = (SELECT public.get_current_user_institution_id())
  );

-- Extensões de organização na tabela de arquivos já existente
ALTER TABLE public.institutional_drive_files
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.institutional_drive_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_inst_drive_files_folder
  ON public.institutional_drive_files (institution_id, folder_id);

CREATE INDEX IF NOT EXISTS idx_inst_drive_files_starred
  ON public.institutional_drive_files (institution_id, is_starred)
  WHERE is_starred = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.institutional_drive_files TO authenticated;

NOTIFY pgrst, 'reload schema';
