-- ==============================================================================
-- MIGRAÇÃO: ADIÇÃO DE INSTITUTION_ID EM MEIO_AMBIENTE_DENUNCIAS
-- Garante isolamento multitenant e evita erro 400 por coluna inexistente
-- ==============================================================================

ALTER TABLE public.meio_ambiente_denuncias
ADD COLUMN IF NOT EXISTS institution_id TEXT;

CREATE INDEX IF NOT EXISTS idx_meio_ambiente_denuncias_inst 
ON public.meio_ambiente_denuncias(institution_id, status);

