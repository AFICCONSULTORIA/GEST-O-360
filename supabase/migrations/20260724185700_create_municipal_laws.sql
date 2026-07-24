-- Create municipal_laws table
create table public.municipal_laws (
  id uuid default gen_random_uuid() primary key,
  institution_id uuid, -- Assuming there's a link to institutions, nullable if not strictly required or not all have it
  number text not null,
  title text not null,
  type text not null,
  category text not null,
  publication_date date,
  status text not null,
  author text,
  ementa text not null,
  full_text text,
  tags text[],
  file_url text,
  external_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.municipal_laws enable row level security;

-- Create basic policies (assuming anon can read, authenticated can insert/update/delete)
-- You may need to adjust these policies based on your specific auth setup
create policy "Allow public read access"
  on public.municipal_laws for select
  using (true);

create policy "Allow authenticated users to insert"
  on public.municipal_laws for insert
  with check (auth.role() = 'authenticated');

create policy "Allow authenticated users to update"
  on public.municipal_laws for update
  using (auth.role() = 'authenticated');

create policy "Allow authenticated users to delete"
  on public.municipal_laws for delete
  using (auth.role() = 'authenticated');
