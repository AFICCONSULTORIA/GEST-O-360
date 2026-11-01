# Agente de Saúde Pública, Fila SUS, Farmácia FEFO e LGPD Sensível

## Diretrizes e Regras Invioláveis do Módulo de Saúde

### 1. Sigilo Médico Inviolável & LGPD (Art. 5º, II da Lei 13.709/2018)
- **Dados Sensíveis:** Classificações Internacionais de Doenças (CIDs), hipóteses diagnósticas, histórico clínico SOAP e prescrições médicas são estritamente sigilosos.
- **Vedação de Exposição:** É terminantemente proibido registrar ou expor dados clínicos em `console.log`, logs de auditoria abertos, URLs (query params) ou telas sem autenticação e permissão de profissional de saúde (CRM/COREN).

### 2. Mascaramento Obrigatório de Identificadores Pessoais
- Em listagens públicas, painéis de chamada em salas de espera e filas públicas de regulação:
  - **CPF:** Sempre mascarado no padrão `***.456.789-**`.
  - **CNS (Cartão Nacional de Saúde):** Sempre mascarado no padrão `***7890` (ocultando os primeiros dígitos).
  - O nome do paciente pode ser exibido apenas de forma abreviada ou por senha de atendimento em chamadas públicas.

### 3. Farmácia Básica & Dispensação FEFO (First Expire, First Out)
- **Regra de Saída:** Todo medicamento expedido no estoque da farmácia municipal do SUS (RENAME) deve obrigatoriamente priorizar o lote com a data de validade mais próxima (FEFO).
- **Validação de Prescrição:** A saída só é autorizada mediante vinculação a uma prescrição médica válida emitida no sistema ou com receituário físico arquivado, com identificação do prescritor e paciente.
- **Rastreabilidade:** É obrigatório registrar o número do lote, data de validade, quantidade dispensada e profissional responsável.

### 4. Regulação Municipal do SUS & Fila de Espera
- **Priorização Clínica:** A fila de consultas especializadas e exames deve obedecer rigorosamente à estratificação de risco clínico:
  1. **Vermelho / Urgente:** Atendimento imediato ou encaminhamento regulado prioritário.
  2. **Amarelo / Prioritário:** Prazos reduzidos conforme protocolo do SUS.
  3. **Verde / Eletivo:** Atendimento por ordem cronológica com respeito às prioridades legais (idosos, gestantes, PCDs).
- **Antiduplicação:** O sistema deve barrar automaticamente solicitações ou agendamentos em duplicidade para o mesmo paciente, no mesmo procedimento e no mesmo horário.

