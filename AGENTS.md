# Diretrizes de Desenvolvimento e Regras do Projeto (GESTÃO 360)

## Orquestrador Global & Arquitetura Multiagente

O GESTÃO 360 opera sob uma arquitetura de múltiplos agentes especialistas distribuídos por domínio municipal. Cada módulo possui autonomia de contexto governada por seu respectivo arquivo local `AGENTS.md`:

### Fluxo de Roteamento de Contexto & Agentes Especialistas:
- `src/modules/Saude/`: **Agente de Saúde Pública, Fila SUS, Farmácia FEFO e LGPD Sensível**
  - Sigilo médico inviolável, prontuário PEP SOAP, dispensação farmacêutica RENAME/FEFO e regulação com mascaramento de dados (LGPD).
- `src/modules/Education/`: **Agente Educacional (Escala SAEB, Matrículas e Diários Oficiais)**
  - Regulação da fila da creche (TAC-MP), controle de 75% da frequência LDB, avaliação SAEB/BNCC e governança pedagógica.
- `src/modules/Controls/`: **Agente de Frotas & Fiscal (Trava de Tanque, Top-Off e Reforma Tributária)**
  - Auditoria de abastecimento, trava física do tanque, protocolo Top-Off para socorro contínuo, semáforo antifraude e validação da Reforma Tributária (NT 2026.010 / NT 008).
- `src/modules/SaaSControlCenter/`: **Agente de Superadmin & Operações GovTech**
  - Provisionamento multi-tenant de prefeituras, monitoramento de saúde de instâncias, auditoria de licenças e governança de suporte (`saas_support_tickets`).
- `src/components/AIAssistant/`: **Agente Copilot do Servidor Público (Interface & Atendimento)**
  - Interação direta em linguagem natural, tradução de necessidades em ações executáveis de 1 clique, barramento `AssistantActionPayload` e sem jargões técnicos.
- `supabase/migrations/`: **Agente de Banco de Dados, RLS e RPCs Atômicas**
  - Segurança de dados por tenant (`institution_id`), funções de persistência transacional com RPCs atômicas e auditoria imutável.

---

## Catálogo de Capacidades e Skills
O catálogo centralizado de skills do ecossistema encontra-se registrado em [skills-catalog.json](file:///.agents/skills-catalog.json).

---

## Plano de Implementação (Apenas sob Demanda)

O Plano de Implementação detalhado deve ser elaborado **apenas quando explicitamente solicitado pelo usuário** (ou através de comandos como `/plan`). Nas demais situações, prossiga diretamente com a execução e resolução ágil da tarefa, mantendo a qualidade do código e a verificação de integridade.

### Estrutura do Plano de Implementação (Quando solicitado):
1. **Objetivo & Diagnóstico:** Descrição clara da necessidade ou do problema identificado.
2. **Arquivos Afetados:** Lista explícita dos arquivos que serão criados, modificados ou removidos.
3. **Etapas de Execução (Passo a Passo):** Sequência lógica e ordenada de ações a serem executadas.
4. **Critérios de Validação e Testes:** Como a funcionalidade ou correção será validada após a execução (`tsc --noEmit`, etc.).
5. **Riscos e Pontos de Atenção:** Efeitos colaterais, Supabase RLS, APIs externas.

---

## Boas Práticas do Projeto:
- **Stack Tecnológico:** React 19, TypeScript, Tailwind CSS, Vite, Supabase, Gemini API (`@google/genai`).
- **Tipagem Estrita:** Não introduzir `any` desnecessários; garantir que a checagem de tipos continue passando.
- **Preservação de Código:** Manter comentários existentes, convenções arquiteturais e integridade dos testes.

---

## Agente Especialista e Skills do Projeto (.agents)
- [Regras de Domínio e Arquitetura Gestão 360](file:///.agents/rules/gestao360-domain.md): Diretrizes de negócio da administração pública (LRF, Lei 14.133, PNTP) e convenções arquiteturais.
- [Skill: Criação de Módulos (module-scaffolding)](file:///.agents/skills/module-scaffolding/SKILL.md): Padrão estrutural para desenvolvimento de novos módulos municipais.
- [Skill: Segurança de Dados Supabase (supabase-data-guard)](file:///.agents/skills/supabase-data-guard/SKILL.md): Diretrizes para RLS, multi-tenancy e consultas seguras no Supabase.
