# Diretrizes de Desenvolvimento e Regras do Projeto (GESTÃO 360)

## Plano de Implementação (Apenas sob Demanda)

O Plano de Implementação detalhado deve ser elaborado **apenas quando explicitamente solicitado pelo usuário** (ou através de comandos como `/plan`). Nas demais situações, prossiga diretamente com a execução e resolução ágil da tarefa, mantendo a qualidade do código e a verificação de integridade.

### Estrutura do Plano de Implementação (Quando solicitado):

1. **Objetivo & Diagnóstico:**
   - Descrição clara da necessidade ou do problema identificado.
   - Diagnóstico da causa raiz (em caso de bugs).

2. **Arquivos Afetados:**
   - Lista explícita dos arquivos que serão criados, modificados ou removidos, com links clicáveis quando aplicável.

3. **Etapas de Execução (Passo a Passo):**
   - Sequência lógica e ordenada de ações a serem executadas.
   - O que cada etapa realiza e quais componentes/serviços são impactados.

4. **Critérios de Validação e Testes:**
   - Como a funcionalidade ou correção será validada após a execução.
   - Verificação de tipos TypeScript (`npm run lint` ou `npx tsc --noEmit`).
   - Testes de interface ou verificação de fluxos críticos.

5. **Riscos e Pontos de Atenção:**
   - Possíveis efeitos colaterais em outras partes do sistema.
   - Dependências de banco de dados (Supabase), variáveis de ambiente ou APIs externas.

---

## Boas Práticas do Projeto:
- **Stack Tecnológico:** React 19, TypeScript, Tailwind CSS, Vite, Supabase.
- **Tipagem Estrita:** Não introduzir `any` desnecessários; garantir que a checagem de tipos continue passando.
- **Preservação de Código:** Manter comentários existentes, convenções arquiteturais e evitar alterações desnecessárias fora do escopo da solicitação.

---

## Agente Especialista e Skills do Projeto (.agents)
O projeto conta com regras e procedimentos personalizados para orientar o desenvolvimento:
- [Regras de Domínio e Arquitetura Gestão 360](file:///.agents/rules/gestao360-domain.md): Diretrizes de negócio da administração pública (LRF, Lei 14.133, PNTP) e convenções arquiteturais.
- [Skill: Criação de Módulos (module-scaffolding)](file:///.agents/skills/module-scaffolding/SKILL.md): Padrão estrutural para desenvolvimento de novos módulos municipais.
- [Skill: Segurança de Dados Supabase (supabase-data-guard)](file:///.agents/skills/supabase-data-guard/SKILL.md): Diretrizes para RLS, multi-tenancy e consultas seguras no Supabase.

