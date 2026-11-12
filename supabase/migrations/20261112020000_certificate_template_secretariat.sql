-- Adiciona coluna secretariat_name em education_certificate_templates para exibir a secretaria escolhida no cabeçalho do certificado
ALTER TABLE public.education_certificate_templates
  ADD COLUMN IF NOT EXISTS secretariat_name TEXT;

