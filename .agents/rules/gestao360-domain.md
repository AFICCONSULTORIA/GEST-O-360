# Diretrizes de Domínio e Arquitetura do Gestão 360

Este documento orienta o agente em todas as tarefas de desenvolvimento no ecossistema do **Gestão 360**, garantindo aderência rigorosa às regras de negócio da administração pública municipal brasileira e à arquitetura do software.

---

## 1. Visão Geral do Sistema
O **Gestão 360** é uma plataforma SaaS integrada para gestão e governança pública municipal, englobando controle interno, transparência, conformidade legal e prestação de serviços à população.

### Principais Módulos do Sistema:
- **Administração & Finanças:** `AdminFinancas`, `Administracao`, `Contracts` (Contratos e Aditivos), `Orders` (Compras e Licitações), `DocumentNumbers` (Numeração oficial de decretos/portarias).
- **Controle, Risco & Transparência:** `Controls` (Controle Interno Municipal), `Risk` (Matriz de Riscos Operacionais/Fiscais), `PNTP` (Programa Nacional de Transparência Pública - Atricon), `Norms` (Normativas e Resoluções), `Laws` (Legislação Municipal).
- **Atendimento e Participação Cidadã:** `Ouvidoria` (Manifestações Lei 13.460), `Protocol` (Protocolo Geral e Tramitações), `PublicForms` (Formulários públicos), `Noticias` (Comunicação e Portal).
- **Políticas Públicas Setoriais:** `Saude` (Gestão de postos e atendimentos), `Education` (Rede de ensino), `AssistenciaSocial` (Programas sociais e CRAS), `MeioAmbiente`, `ServicosPublicos`, `Patrimonio` (Bens móveis e imóveis).
- **Governança & Gestão:** `Camara` (Poder Legislativo), `Certificates` (Certidões e CNDs), `Templates` (Modelos oficiais de documentos), `SaaSControlCenter` (Gestão multitenant e prefeituras).

---

## 2. Marco Legal e Regras de Negócio
Ao implementar ou refatorar fluxos, sempre respeitar os fundamentos da legislação brasileira:
- **Lei nº 14.133/2021 (Nova Lei de Licitações e Contratos):** Exigências de publicidade, matriz de riscos, planejamento, pesquisa de preços e termos aditivos.
- **LC nº 101/2000 (Lei de Responsabilidade Fiscal - LRF):** Limites com despesa com pessoal, endividamento, prazos do RREO (bimestral) e RGF (quadrimestral).
- **Resoluções ATRICON (PNTP):** Critérios de transparência ativa (receitas, despesas, repasses, diárias, quadro de pessoal e licitações).
- **LGPD (Lei nº 13.709/2018):** Proteção de dados sensíveis de munícipes (especialmente em Saúde, Assistência Social e Ouvidoria).

---

## 3. Padrões Técnicos e de Código
- **Framework:** React 19 com TypeScript estrito (`strict: true`).
- **Estilização:** Tailwind CSS v4. Manter consistência visual com tema escuro/claro, bordas arredondadas suaves (`rounded-xl` ou `rounded-2xl`), estados de hover e tipografia limpa.
- **Ícones:** Sempre utilizar ícones do pacote `lucide-react`.
- **Animações:** Utilizar `motion` (Framer Motion) com transições sutis (`easeOut`, duração 0.2s - 0.3s).
- **Banco de Dados (Supabase):**
  - Todas as tabelas devem conter identificador de tenant/município (`tenant_id` ou `municipio_id`) para isolamento seguro via RLS (Row Level Security).
  - Nunca expor `service_role_key` no cliente frontend.
- **Tipagem:** Nunca utilizar `any` sem justificativa explícita. Manter tipos compartilhados em `src/types/`.
