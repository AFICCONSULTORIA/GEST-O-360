-- ==============================================================================
-- SCHEMA: PORTAL DE NOTÍCIAS & PROJETOS MUNICIPAIS (GESTÃO 360)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.municipal_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT,
    subtitle TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Obras & Infraestrutura',
    department TEXT,
    cover_image_url TEXT,
    gallery_urls JSONB DEFAULT '[]'::jsonb,
    is_featured BOOLEAN DEFAULT false,
    badge TEXT, -- ex: 'Obra Entregue', 'Novo Projeto', 'Inscrições Abertas', 'Nota Oficial'
    project_status TEXT, -- 'Planejamento', 'Em Execução', 'Concluído', 'Contínuo'
    project_budget NUMERIC(15, 2),
    status TEXT NOT NULL DEFAULT 'published', -- 'published', 'draft', 'archived'
    author_name TEXT DEFAULT 'Assessoria de Comunicação',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_municipal_news_institution ON public.municipal_news(institution_id);
CREATE INDEX IF NOT EXISTS idx_municipal_news_status ON public.municipal_news(status);
CREATE INDEX IF NOT EXISTS idx_municipal_news_category ON public.municipal_news(category);
CREATE INDEX IF NOT EXISTS idx_municipal_news_published_at ON public.municipal_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_municipal_news_featured ON public.municipal_news(is_featured);

-- Habilitar RLS
ALTER TABLE public.municipal_news ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Permitir leitura pública de notícias" ON public.municipal_news;
CREATE POLICY "Permitir leitura pública de notícias" ON public.municipal_news 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de notícias" ON public.municipal_news;
CREATE POLICY "Permitir inserção de notícias" ON public.municipal_news 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir atualização de notícias" ON public.municipal_news;
CREATE POLICY "Permitir atualização de notícias" ON public.municipal_news 
FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir exclusão de notícias" ON public.municipal_news;
CREATE POLICY "Permitir exclusão de notícias" ON public.municipal_news 
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Função para incrementar visualizações atomicamente
CREATE OR REPLACE FUNCTION increment_news_views(news_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.municipal_news
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = news_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
