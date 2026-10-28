---
name: module-scaffolding
description: Guia e padronização para criação ou expansão de novos módulos funcionais no Gestão 360.
---

# Skill: Criação de Novos Módulos no Gestão 360

Esta skill orienta a adição padronizada de novos módulos municipais no Gestão 360, garantindo integração com a navegação, controle de permissões e padrão visual.

## Estrutura Recomendada para um Módulo
Cada módulo deve residir em `src/modules/<NomeDoModulo>/`:
```
src/modules/<NomeDoModulo>/
├── components/          # Componentes internos exclusivos do módulo
│   ├── FormModal.tsx
│   └── TableFilter.tsx
├── hooks/               # Custom hooks com lógica de negócio e queries
│   └── use<NomeDoModulo>.ts
├── types.ts             # Interfaces TypeScript específicas do módulo
└── index.tsx            # Ponto de entrada do módulo (Página principal)
```

## Checklist de Implementação:
1. **Tipos:** Definir o modelo de dados em `types.ts` com campos de auditoria (`id`, `created_at`, `updated_at`, `municipio_id`, `status`).
2. **Componente Principal (`index.tsx`):**
   - Header com título, descrição resumida, badge do módulo e botões de ação primária (ex: "Novo Registro", "Exportar Relatório").
   - Barra de filtros rápidos (busca por texto, data, status).
   - Tabela responsiva com estados visuais de loading (esqueletos) e empty state amigável.
3. **Registro na Navegação Global (`src/App.tsx`):**
   - Adicionar o identificador do módulo nas listas de menus e rotas ativas.
   - Associar o ícone correspondente do `lucide-react`.
4. **Segurança & Permissões:**
   - Conferir se o usuário logado possui a permissão necessária para acessar o módulo.
