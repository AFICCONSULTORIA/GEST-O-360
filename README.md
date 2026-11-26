# GESTÃO 360 — Plataforma Integrada de Governança Municipal

Plataforma SaaS multi-prefeitura (`institution_id`) para administração pública municipal (Controle Interno, Frotas & Abastecimento, Contabilidade/LRF, Educação, Saúde/SUS, Licitações, Ouvidoria, Transparência PNTP e Câmara Municipal).

---

## 1. Pré-requisitos e Execução Local

- **Node.js** 20+
- Copie `.env.example` para `.env.local` e preencha as variáveis necessárias (**nunca** exponha `SUPABASE_SERVICE_ROLE_KEY` ou `GEMINI_API_KEY` com prefixo `VITE_`).

```bash
npm ci
npm run dev
```

---

## 2. Variáveis de Ambiente Principais

| Variável | Escopo | Finalidade |
| --- | --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Navegador | Conexão autenticada ao Supabase (sujeita a RLS) |
| `VITE_SUPER_ADMIN_EMAIL` | Navegador | Identificação do e-mail administrativo raiz |
| `VITE_GOOGLE_MAPS_API_KEY` | Navegador | Mapas e rotas do Transporte Escolar |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Servidor (`api/*`) | Validação de JWT nas Serverless/Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | **Somente servidor** | Redefinição segura de senha (`api/admin-reset-password`) e rate limit distribuído |
| `GEMINI_API_KEY` | **Somente servidor** | Assistente IA, extração OCR de PDFs e auditoria fiscal |
| `ALLOWED_ORIGINS` / `VERCEL_PROJECT_SLUG` | Servidor (`api/*`) | Allowlist estrita de origens CORS |

Consulte `.env.example` para a lista completa (incluindo `RLS_TEST_*` para testes de staging).

---

## 3. Scripts e Testes

```bash
npm run dev               # Servidor de desenvolvimento Vite
npm run build             # Bump de versão + tsc --noEmit + vite build
npx tsc --noEmit          # Checagem estrita de tipos TypeScript
npm test                  # Suíte completa (regras de negócio, API, RLS estático e saúde do código)
npm run test:security     # Auditoria de políticas RLS, GRANTs e endpoints serverless
npm run test:rls-live     # Teste de integração de isolamento multi-tenant contra banco de staging
npm run test:baseline     # Atualiza baselines em src/__tests__/baselines/ (somente após reduzir dívida)
```

O pipeline em `.github/workflows/ci.yml` executa `npm ci`, `npx tsc --noEmit` e `npm test` automaticamente a cada push e Pull Request.

---

## 4. Banco de Dados (Fonte Única da Verdade: `supabase/migrations/`)

Toda alteração de schema, RLS, índices ou funções `RPC` **deve** ser criada exclusivamente como migration idempotente em `supabase/migrations/<YYYYMMDDHHMMSS>_descricao.sql`. Não utilize scripts SQL manuais soltos fora de `supabase/migrations/`.

### Fluxo obrigatório (Staging antes de Produção)

1. **Vincular e aplicar primeiro no projeto de Staging:**
   ```bash
   npx supabase link --project-ref <STAGING_PROJECT_REF>
   npx supabase db push
   ```
2. **Validar isolamento multi-tenant e auditoria de segurança em Staging:**
   - Execute `scripts/audit-supabase.sql` (somente leitura) no SQL Editor de Staging e confirme ausência de tabelas sem RLS ou escrita aberta indevida para `anon`.
   - Rode `npm run test:rls-live` apontando `RLS_TEST_URL` e `RLS_TEST_ANON_KEY` para o ambiente de Staging.
3. **Promover para Produção somente após Staging verde:**
   ```bash
   npx supabase link --project-ref <PRODUCTION_PROJECT_REF>
   npx supabase db push
   ```
