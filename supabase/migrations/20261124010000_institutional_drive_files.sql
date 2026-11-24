-- ==============================================================================
-- MÓDULO: BANCO DE ARQUIVOS INSTITUCIONAL (INTEGRAÇÃO GOOGLE DRIVE 5 TB)
-- Versão: 20261124010000
-- Descrição: Índice de arquivos armazenados no Google Drive por prefeitura
--            (institution_id), com isolamento RLS multi-tenant e auditoria.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.institutional_drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id TEXT NOT NULL DEFAULT 'inst_1',
  drive_file_id TEXT NOT NULL,
  drive_folder_id TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  folder_category TEXT NOT NULL DEFAULT 'Geral',
  description TEXT,
  web_view_link TEXT,
  web_content_link TEXT,
  uploaded_by_id TEXT,
  uploaded_by_name TEXT NOT NULL DEFAULT 'Servidor Público',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_drive_files_tenant
  ON public.institutional_drive_files (institution_id, folder_category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inst_drive_files_drive_id
  ON public.institutional_drive_files (drive_file_id);

ALTER TABLE public.institutional_drive_files ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.institutional_drive_files FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.institutional_drive_files TO authenticated;

DROP POLICY IF EXISTS "institutional_drive_files_tenant_strict" ON public.institutional_drive_files;
CREATE POLICY "institutional_drive_files_tenant_strict"
  ON public.institutional_drive_files
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR institution_id = public.get_current_user_institution_id()
  );
