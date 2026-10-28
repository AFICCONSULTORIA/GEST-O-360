---
name: supabase-data-guard
description: Boas práticas de modelagem, migrações e políticas de segurança RLS (Row Level Security) no Supabase para o Gestão 360.
---

# Skill: Supabase Data Guard (Gestão 360)

Esta skill define as regras de integridade e segurança de dados para o banco de dados Supabase do Gestão 360, com foco especial no isolamento multi-inquilino (multi-tenant) entre prefeituras/órgãos.

## Regras Obrigatórias de Modelagem:
1. **Multi-tenancy Rigoroso:**
   - Toda tabela com dados operacionais DEVE possuir uma coluna `tenant_id` ou `municipio_id` (UUID referenciando a tabela de organizações/municípios).
2. **Row Level Security (RLS):**
   - RLS deve estar SEMPRE habilitado em toda tabela nova:
     ```sql
     ALTER TABLE public.nome_tabela ENABLE ROW LEVEL SECURITY;
     ```
   - Políticas de SELECT/INSERT/UPDATE/DELETE devem validar se o usuário autenticado pertence ao município correspondente:
     ```sql
     CREATE POLICY "Acesso por inquilino" ON public.nome_tabela
     FOR ALL TO authenticated
     USING (municipio_id = auth.jwt() ->> 'municipio_id');
     ```
3. **Auditoria e Rastreabilidade:**
   - Tabelas críticas (Contratos, Despesas, Licitações, Decretos) devem registrar `created_by` e `updated_by`.
4. **Boas Práticas de Query no Frontend:**
   - Sempre tratar erros de resposta do Supabase (`error`).
   - Evitar `select('*')` irrestrito em tabelas com alto volume de registros; sempre paginar (`range(start, end)`) ou limitar (`limit(50)`).
