-- ==========================================
-- Whatsapp Integration Schema (Evolution API)
-- ==========================================

-- 1. Tabelas de Instâncias (Celulares Conectados)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Ex: "Secretaria de Saúde"
    status TEXT NOT NULL DEFAULT 'close', -- 'close', 'connecting', 'open'
    phone TEXT, -- Opcional, guarda o número conectado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    category_color TEXT NOT NULL DEFAULT 'emerald',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir templates iniciais se a tabela estiver vazia
INSERT INTO public.whatsapp_templates (id, name, category, category_color, content)
SELECT 
    gen_random_uuid(), 
    'Lembrete Consulta', 
    'Saúde', 
    'blue', 
    'Olá {{nome_paciente}}, tudo bem? \n\nEste é um lembrete da sua consulta na especialidade {{especialidade}} no dia {{data}} às {{hora}}. \n\nPara confirmar, responda SIM. Para cancelar, responda CANCELAR.'
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_templates WHERE name = 'Lembrete Consulta');

INSERT INTO public.whatsapp_templates (id, name, category, category_color, content)
SELECT 
    gen_random_uuid(), 
    'Atualização de Status', 
    'Protocolo', 
    'amber', 
    'Olá {{nome_cidadao}}!\n\nSeu protocolo Nº {{num_protocolo}} teve uma atualização de status para: *{{novo_status}}*.\n\nVocê pode acompanhar os detalhes no Portal do Cidadão.'
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_templates WHERE name = 'Atualização de Status');

-- 3. Tabela de Logs (Envios)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text', -- text, template, etc.
    content TEXT,
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Configurações da API
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    api_url TEXT,
    global_api_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. RLS (Row Level Security) - Habilitando acesso anon/autenticado para MVP
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso irrestrito para MVP (Modifique para produção)
CREATE POLICY "Enable all access for instances" ON public.whatsapp_instances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for templates" ON public.whatsapp_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for logs" ON public.whatsapp_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for settings" ON public.whatsapp_settings FOR ALL USING (true) WITH CHECK (true);
