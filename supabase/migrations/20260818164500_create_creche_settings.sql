-- Create creche_settings table
CREATE TABLE IF NOT EXISTS creche_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bercario_total INTEGER NOT NULL DEFAULT 20,
    bercario_occupied INTEGER NOT NULL DEFAULT 0,
    maternal1_total INTEGER NOT NULL DEFAULT 35,
    maternal1_occupied INTEGER NOT NULL DEFAULT 0,
    maternal2_total INTEGER NOT NULL DEFAULT 45,
    maternal2_occupied INTEGER NOT NULL DEFAULT 0,
    decreto_url TEXT,
    decreto_name TEXT NOT NULL DEFAULT 'Decreto Municipal nº 035/2024',
    decreto_description TEXT NOT NULL DEFAULT 'Regulamentação do Acesso à Educação Infantil e Fila Única dos CMEIs.',
    is_open BOOLEAN NOT NULL DEFAULT true,
    ficha_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO creche_settings (id)
SELECT '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM creche_settings LIMIT 1);

-- RLS for creche_settings
ALTER TABLE creche_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Allow public read access to creche_settings"
    ON creche_settings FOR SELECT
    USING (true);

-- Allow admins to update settings (assume authenticated users for now, adjust based on existing RLS)
CREATE POLICY "Allow authenticated users to update creche_settings"
    ON creche_settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to insert (if needed for setup)
CREATE POLICY "Allow authenticated users to insert creche_settings"
    ON creche_settings FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create storage bucket for CMEI documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('creche_documents', 'creche_documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for creche_documents bucket
-- Allow public to read files
CREATE POLICY "Public Access to creche_documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'creche_documents');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to creche_documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'creche_documents');

-- Allow authenticated users to update/delete files
CREATE POLICY "Authenticated users can update creche_documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'creche_documents');

CREATE POLICY "Authenticated users can delete creche_documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'creche_documents');
