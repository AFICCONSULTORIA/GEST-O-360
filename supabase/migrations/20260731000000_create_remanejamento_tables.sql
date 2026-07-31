-- Criação da tabela de Contas de Origem
create table public.fin_remanejamento_origens (
  id uuid default gen_random_uuid() primary key,
  code text,
  name text not null,
  bank text,
  initial_balance numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criação da tabela de Demandas de Destino
create table public.fin_remanejamento_destinos (
  id uuid default gen_random_uuid() primary key,
  code text,
  name text not null,
  department text,
  total_required numeric not null default 0,
  priority text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criação da tabela de Alocações (Histórico de Remanejamento)
create table public.fin_remanejamento_alocacoes (
  id uuid default gen_random_uuid() primary key,
  origin_id uuid references public.fin_remanejamento_origens(id) on delete cascade not null,
  destination_id uuid references public.fin_remanejamento_destinos(id) on delete cascade not null,
  amount numeric not null,
  observation text,
  timestamp_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security)
alter table public.fin_remanejamento_origens enable row level security;
alter table public.fin_remanejamento_destinos enable row level security;
alter table public.fin_remanejamento_alocacoes enable row level security;

-- Políticas de Acesso (Inicialmente abertas para leitura e escrita, pode ser restrito posteriormente)
-- Origens
create policy "Allow public read access to origens" on public.fin_remanejamento_origens for select using (true);
create policy "Allow public insert to origens" on public.fin_remanejamento_origens for insert with check (true);
create policy "Allow public update to origens" on public.fin_remanejamento_origens for update using (true);
create policy "Allow public delete to origens" on public.fin_remanejamento_origens for delete using (true);

-- Destinos
create policy "Allow public read access to destinos" on public.fin_remanejamento_destinos for select using (true);
create policy "Allow public insert to destinos" on public.fin_remanejamento_destinos for insert with check (true);
create policy "Allow public update to destinos" on public.fin_remanejamento_destinos for update using (true);
create policy "Allow public delete to destinos" on public.fin_remanejamento_destinos for delete using (true);

-- Alocacoes
create policy "Allow public read access to alocacoes" on public.fin_remanejamento_alocacoes for select using (true);
create policy "Allow public insert to alocacoes" on public.fin_remanejamento_alocacoes for insert with check (true);
create policy "Allow public update to alocacoes" on public.fin_remanejamento_alocacoes for update using (true);
create policy "Allow public delete to alocacoes" on public.fin_remanejamento_alocacoes for delete using (true);
