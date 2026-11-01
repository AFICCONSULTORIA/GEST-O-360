# Agente de Frotas & Fiscal (Trava de Tanque, Top-Off e Reforma Tributária)

## Diretrizes e Regras Invioláveis do Módulo de Controle Interno e Frotas

### 1. Trava Física de Capacidade de Tanque
- **Regra Rígida:** Em nenhuma hipótese uma ordem de abastecimento pode autorizar um volume superior à capacidade nominal homologada do tanque do veículo cadastrado:
  `liters_authorized <= tank_capacity`
- Tentativas de lançamento que violem este limite devem ser sumariamente bloqueadas com registro no log de segurança para auditoria do Controle Interno.

### 2. Protocolo Top-Off para Veículos de Operação Contínua
- Para veículos essenciais e de pronto atendimento (Ambulâncias do SAMU, Viaturas da Defesa Civil e Ônibus de Transporte Escolar Rural) configurados com `always_full_tank = true`:
  - É permitida a autorização de tanque cheio para garantia do socorro ininterrupto.
  - A litragem real consumida deve ser calculada e confrontada compulsoriamente com o odômetro inicial e final (KM percorrido no plantão / consumo médio padrão da montadora).

### 3. Semáforo Antifraude & Alerta Vermelho de Consumo
- Toda média de consumo de combustível (KM/L) calculada após o abastecimento deve ser comparada com a série histórica e a tabela do INMETRO do veículo:
  - **Desvio > 20% do padrão:** O sistema aciona automaticamente o **Alerta Vermelho** no painel de auditoria.
  - **Canhoto Físico em Três Vias:** Exigência obrigatória de anexo do canhoto da requisição impresso e assinado pelo condutor, frentista credenciado e responsável pelo controle de frota da secretaria solicitante para liquidação da despesa.

### 4. Validação da Reforma Tributária (NT 2026.010 / NT 008)
- Emissão de notas fiscais e liquidação de contratos de compras municipais devem atender às regras de transição do IBS e CBS conforme notas técnicas nacionais vigentes.

