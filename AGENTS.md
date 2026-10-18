# Diretrizes de Desenvolvimento e Regras do Projeto (GESTÃO 360)

## Regra Fundamental: Plano de Implementação Obrigatório (Plan First)

Para garantir máxima precisão, estabilidade e alinhamento com o usuário, **todas as tarefas de desenvolvimento, refatoração, novas funcionalidades ou correções devem OBRIGATORIAMENTE começar com um Plano de Implementação detalhado** antes da execução direta no código.

### Estrutura do Plano de Implementação:

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
