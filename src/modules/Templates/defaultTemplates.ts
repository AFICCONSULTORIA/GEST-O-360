import { DocumentTemplate } from '../../types';

export const OFFICIAL_DEFAULT_TEMPLATES: DocumentTemplate[] = [
  { 
    id: 'tpl-oficio-solicitacao', 
    title: 'Ofício de Solicitação / Encaminhamento', 
    description: 'Comunicação externa padrão para envio de solicitações, providências ou demandas a outros órgãos públicos ou entidades privadas.', 
    category: 'Ofícios', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-06-01', 
    content: `<p style="text-align: right; margin-bottom: 24px;">{{NOME_MUNICIPIO}}, {{DATA_EXTENSO}}.</p>

<p style="margin-bottom: 16px;"><b>OFÍCIO Nº {{NUMERO_DOCUMENTO}}/{{ANO}}/{{NOME_SECRETARIA_SIGLA}}</b></p>

<p style="margin: 0;">A Sua Senhoria o(a) Senhor(a),</p>
<p style="margin: 0; font-weight: bold;">[NOME DO DESTINATÁRIO]</p>
<p style="margin: 0;">[Cargo / Função do Destinatário]</p>
<p style="margin: 0 0 16px 0;">[Nome do Órgão, Empresa ou Entidade]</p>

<p style="margin-bottom: 16px;"><b>Assunto: Solicitação de providências referente a [Tema / Demanda]</b></p>

<p style="margin-bottom: 12px;">Senhor(a) [Cargo / Título],</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  Ao cumprimentá-lo(a) cordialmente, sirvo-me do presente para solicitar a Vossa Senhoria as providências cabíveis visando [descrever o pedido de forma clara, precisa e objetiva].
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  Ressalta-se que a presente solicitação fundamenta-se na necessidade de [apresentar a justificativa fática e jurídica da demanda], visando assegurar a continuidade e a excelência dos serviços prestados à população de nosso Município.
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 24px; line-height: 1.5;">
  Certos de podermos contar com vossa presteza e valiosa colaboração, renovamos nossos protestos de elevada estima e distinta consideração, colocando-nos à disposição para esclarecimentos complementares.
</p>

<p style="margin-bottom: 36px;">Respeitosamente,</p>

<div style="text-align: center; margin-top: 40px;" data-signature-block="true">
  <div style="width: 280px; border-top: 1px solid #000; margin: 0 auto 8px auto;"></div>
  <p style="margin: 0; font-weight: bold;">{{NOME_USUARIO}}</p>
  <p style="margin: 0; font-size: 10.5pt; color: #333;">{{CARGO_USUARIO}}</p>
  <p style="margin: 0; font-size: 9pt; color: #666;">{{NOME_SECRETARIA}}</p>
</div>`
  },
  { 
    id: 'tpl-oficio-resposta', 
    title: 'Ofício de Resposta / Informação', 
    description: 'Modelo formal para responder a pedidos de informação, ofícios recebidos, Ministério Público, Tribunal de Contas ou Câmaras.', 
    category: 'Ofícios', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-06-02', 
    content: `<p style="text-align: right; margin-bottom: 24px;">{{NOME_MUNICIPIO}}, {{DATA_EXTENSO}}.</p>

<p style="margin-bottom: 16px;"><b>OFÍCIO Nº {{NUMERO_DOCUMENTO}}/{{ANO}}/{{NOME_SECRETARIA_SIGLA}}</b></p>
<p style="margin-bottom: 16px; font-size: 10pt; color: #555;"><i>Ref.: Resposta ao Ofício nº [Nº do Ofício Recebido] / Protocolo nº {{PROTOCOLO}}</i></p>

<p style="margin: 0;">A Sua Excelência / Senhoria,</p>
<p style="margin: 0; font-weight: bold;">[NOME DA AUTORIDADE DESTINATÁRIA]</p>
<p style="margin: 0;">[Cargo / Instituição]</p>
<p style="margin: 0 0 16px 0;">[Cidade / UF]</p>

<p style="margin-bottom: 16px;"><b>Assunto: Prestação de informações sobre [Tema / Notificação]</b></p>

<p style="margin-bottom: 12px;">Senhor(a) [Cargo / Autoridade],</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  Em atenção ao expediente referenciado, pelo qual foram solicitadas informações e esclarecimentos acerca de [resumir a solicitação original], passamos a expor e informar o que se segue:
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  <b>1.</b> Quanto ao item principal, informamos que [detalhar a resposta de maneira fundamentada, técnica e clara].
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  <b>2.</b> Seguem anexas as cópias dos documentos comprobatórios pertinentes para instrução do referido processo administrativo.
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 24px; line-height: 1.5;">
  Permanecemos à inteira disposição para quaisquer esclarecimentos adicionais que se fizerem oportunos.
</p>

<p style="margin-bottom: 36px;">Atenciosamente,</p>

<div style="text-align: center; margin-top: 40px;" data-signature-block="true">
  <div style="width: 280px; border-top: 1px solid #000; margin: 0 auto 8px auto;"></div>
  <p style="margin: 0; font-weight: bold;">{{NOME_USUARIO}}</p>
  <p style="margin: 0; font-size: 10.5pt; color: #333;">{{CARGO_USUARIO}}</p>
</div>`
  },
  { 
    id: 'tpl-memorando-interno', 
    title: 'Memorando Interno entre Setores', 
    description: 'Comunicação oficial e ágil entre secretarias, departamentos e setores da administração direta.', 
    category: 'Ofícios', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-06-03', 
    content: `<div style="border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 20px;">
  <h3 style="margin: 0; font-size: 14pt; font-weight: bold;">MEMORANDO Nº {{NUMERO_DOCUMENTO}}/{{ANO}}</h3>
</div>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt;">
  <tr>
    <td style="width: 80px; font-weight: bold; padding: 4px 0;">DE:</td>
    <td style="padding: 4px 0;">{{NOME_USUARIO}} — {{CARGO_USUARIO}} ({{NOME_SECRETARIA}})</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0;">PARA:</td>
    <td style="padding: 4px 0;">[Nome do Destinatário / Setor de Destino]</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0;">DATA:</td>
    <td style="padding: 4px 0;">{{DATA_CURTA}}</td>
  </tr>
  <tr>
    <td style="font-weight: bold; padding: 4px 0;">ASSUNTO:</td>
    <td style="padding: 4px 0;"><b>[Assunto Objetivo do Memorando]</b></td>
  </tr>
</table>

<hr style="border: none; border-top: 1px solid #cbd5e1; margin-bottom: 20px;" />

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  Comunico a Vossa Senhoria que [inserir o teor do comunicado interno, instruções ou solicitações de rotina].
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  Diante do exposto, solicitamos a adoção das medidas cabíveis para [especificar a ação esperada e o prazo para retorno, se houver].
</p>

<p style="margin-bottom: 30px;">Atenciosamente,</p>

<div style="text-align: center; margin-top: 35px;" data-signature-block="true">
  <div style="width: 250px; border-top: 1px solid #000; margin: 0 auto 6px auto;"></div>
  <p style="margin: 0; font-weight: bold;">{{NOME_USUARIO}}</p>
  <p style="margin: 0; font-size: 10pt; color: #444;">{{CARGO_USUARIO}}</p>
</div>`
  },
  { 
    id: 'tpl-portaria-nomeacao', 
    title: 'Portaria de Nomeação / Designação', 
    description: 'Ato normativo de pessoal para nomeação de cargo comissionado, função de confiança ou designação.', 
    category: 'RH', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-06-04', 
    content: `<div style="text-align: center; margin-bottom: 24px;">
  <h2 style="margin: 0; font-size: 13pt; font-weight: bold;">PORTARIA Nº {{NUMERO_DOCUMENTO}}, DE {{DATA_EXTENSO}}</h2>
</div>

<div style="margin-left: 45%; margin-bottom: 24px; text-align: justify; font-size: 10.5pt; font-style: italic; line-height: 1.4;">
  "Dispõe sobre a nomeação de servidor(a) para exercer Cargo de Provimento em Comissão que especifica e dá outras providências."
</div>

<p style="text-align: justify; margin-bottom: 14px; line-height: 1.5;">
  O <b>PREFEITO MUNICIPAL DE {{NOME_MUNICIPIO}}</b>, Estado de {{ESTADO}}, no uso de suas atribuições legais e constitucionais, conferidas pela Lei Orgânica Municipal e legislação vigente,
</p>

<p style="text-align: center; font-weight: bold; margin: 20px 0;">RESOLVE:</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  <b>Art. 1º</b> Fica NOMEADO(A) o(a) Senhor(a) <b>[NOME COMPLETO DO SERVIDOR]</b>, portador(a) do RG nº [00.000.000-0 SSP/UF] e inscrito(a) no CPF/MF sob o nº [000.000.000-00], para exercer o Cargo de Provimento em Comissão de <b>[NOME DO CARGO EM COMISSÃO]</b>, Símbolo [DAS-X / CC-X], com lotação na <b>{{NOME_SECRETARIA}}</b>.
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  <b>Art. 2º</b> As despesas decorrentes da execução desta Portaria correrão por conta das dotações orçamentárias próprias consignadas no orçamento vigente.
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 24px; line-height: 1.5;">
  <b>Art. 3º</b> Esta Portaria entra em vigor na data de sua publicação, retroagindo seus efeitos a [Data de início dos efeitos], revogadas as disposições em contrário.
</p>

<p style="text-align: center; margin-top: 24px; font-weight: bold;">
  Gabinete do Prefeito Municipal de {{NOME_MUNICIPIO}}, {{DATA_EXTENSO}}.
</p>

<div style="text-align: center; margin-top: 50px;" data-signature-block="true">
  <div style="width: 320px; border-top: 1px solid #000; margin: 0 auto 8px auto;"></div>
  <p style="margin: 0; font-weight: bold; font-size: 11pt;">[NOME DO PREFEITO MUNICIPAL]</p>
  <p style="margin: 0; font-size: 10pt; color: #333;">Prefeito Municipal de {{NOME_MUNICIPIO}}</p>
</div>`
  },
  { 
    id: 'tpl-portaria-comissao', 
    title: 'Portaria de Instauração de Comissão', 
    description: 'Designação de comissão especial, processo administrativo disciplinar (PAD) ou comissão de contratação.', 
    category: 'RH', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-06-05', 
    content: `<div style="text-align: center; margin-bottom: 24px;">
  <h2 style="margin: 0; font-size: 13pt; font-weight: bold;">PORTARIA Nº {{NUMERO_DOCUMENTO}}, DE {{DATA_EXTENSO}}</h2>
</div>

<div style="margin-left: 45%; margin-bottom: 24px; text-align: justify; font-size: 10.5pt; font-style: italic; line-height: 1.4;">
  "Designa membros para compor a Comissão de [Finalidade da Comissão / PAD / Contratação] e dá outras providências."
</div>

<p style="text-align: justify; margin-bottom: 14px; line-height: 1.5;">
  O <b>PREFEITO MUNICIPAL DE {{NOME_MUNICIPIO}}</b>, no uso de suas prerrogativas legais,
</p>

<p style="text-align: center; font-weight: bold; margin: 18px 0;">RESOLVE:</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  <b>Art. 1º</b> Fica instituída a Comissão de [Finalidade], composta pelos seguintes servidores:
</p>

<p style="margin-left: 2.5cm; margin-bottom: 6px;"><b>I - Presidente:</b> [Nome do Servidor], matrícula nº [0000];</p>
<p style="margin-left: 2.5cm; margin-bottom: 6px;"><b>II - Membro Secretário:</b> [Nome do Servidor], matrícula nº [0000];</p>
<p style="margin-left: 2.5cm; margin-bottom: 14px;"><b>III - Membro Vogal:</b> [Nome do Servidor], matrícula nº [0000].</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 12px; line-height: 1.5;">
  <b>Art. 2º</b> A Comissão terá o prazo de 60 (sessenta) dias para conclusão dos trabalhos e apresentação do relatório final conclusivo.
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 24px; line-height: 1.5;">
  <b>Art. 3º</b> Esta Portaria entra em vigor na data de sua publicação.
</p>

<p style="text-align: center; margin-top: 24px;">Gabinete do Prefeito, {{DATA_EXTENSO}}.</p>

<div style="text-align: center; margin-top: 45px;" data-signature-block="true">
  <div style="width: 300px; border-top: 1px solid #000; margin: 0 auto 8px auto;"></div>
  <p style="margin: 0; font-weight: bold;">[NOME DO PREFEITO MUNICIPAL]</p>
  <p style="margin: 0; font-size: 10pt;">Prefeito Municipal</p>
</div>`
  },
  { 
    id: 'tpl-termo-referencia', 
    title: 'Termo de Referência (TR - Lei 14.133/21)', 
    description: 'Documento técnico e jurídico para instrução de processos de compras e contratação de serviços.', 
    category: 'Licitações', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-06-06', 
    content: `<div style="text-align: center; margin-bottom: 24px;">
  <h2 style="margin: 0; font-size: 14pt; font-weight: bold;">TERMO DE REFERÊNCIA</h2>
  <p style="margin: 4px 0 0 0; font-size: 10pt; color: #555;">Conforme Art. 6º, XXIII da Lei Federal nº 14.133/2021</p>
</div>

<h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 4px; margin-top: 20px;">1. DO OBJETO</h3>
<p style="text-align: justify; text-indent: 2.5cm; line-height: 1.5;">
  O presente Termo de Referência tem por objeto a contratação de empresa especializada para o fornecimento de [descrever resumidamente os bens ou serviços], para atender às demandas da <b>{{NOME_SECRETARIA}}</b> do Município de {{NOME_MUNICIPIO}}.
</p>

<h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 4px; margin-top: 20px;">2. DA JUSTIFICATIVA E DA NECESSIDADE DA CONTRATAÇÃO</h3>
<p style="text-align: justify; text-indent: 2.5cm; line-height: 1.5;">
  A referida contratação justifica-se pela necessidade contínua de [explicar a motivação administrativa, o interesse público envolvido e os resultados esperados com a aquisição].
</p>

<h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 4px; margin-top: 20px;">3. DA ESPECIFICAÇÃO DOS ITENS E QUANTITATIVOS</h3>
<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10.5pt;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 40px;">Item</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Descrição / Especificação Técnica</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 60px;">Unid.</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 60px;">Qtd.</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; width: 90px;">Valor Unit.</th>
      <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; width: 100px;">Valor Total</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">01</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px;">[Descrição detalhada do item com marca de referência se admitida]</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">UN</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">10</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">R$ 0,00</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">R$ 0,00</td>
    </tr>
  </tbody>
</table>

<h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 4px; margin-top: 20px;">4. DO PRAZO E LOCAL DE ENTREGA</h3>
<p style="text-align: justify; text-indent: 2.5cm; line-height: 1.5;">
  Os materiais deverão ser entregues em até [X] dias úteis após a emissão da Ordem de Fornecimento, no endereço [Local de Entrega], sem custo adicional de frete.
</p>

<p style="text-align: right; margin-top: 30px;">{{NOME_MUNICIPIO}}, {{DATA_EXTENSO}}.</p>

<div style="display: flex; justify-content: space-around; margin-top: 40px;" data-signature-block="true">
  <div style="text-align: center; width: 45%;">
    <div style="border-top: 1px solid #000; margin-bottom: 6px;"></div>
    <p style="margin: 0; font-weight: bold;">{{NOME_USUARIO}}</p>
    <p style="margin: 0; font-size: 9.5pt;">Responsável pela Elaboração / {{CARGO_USUARIO}}</p>
  </div>
  <div style="text-align: center; width: 45%;">
    <div style="border-top: 1px solid #000; margin-bottom: 6px;"></div>
    <p style="margin: 0; font-weight: bold;">[NOME DO SECRETÁRIO(A)]</p>
    <p style="margin: 0; font-size: 9.5pt;">Secretário(a) Municipal — Aprovador</p>
  </div>
</div>`
  },
  { 
    id: 'tpl-atestado-lotacao', 
    title: 'Atestado de Lotação e Exercício', 
    description: 'Documento formal do RH comprovando vínculo empregatício e local de trabalho do servidor.', 
    category: 'RH', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-06-07', 
    content: `<div style="text-align: center; margin-bottom: 30px;">
  <h2 style="margin: 0; font-size: 14pt; font-weight: bold; letter-spacing: 1px;">ATESTADO DE LOTAÇÃO E EXERCÍCIO</h2>
</div>

<p style="text-align: justify; text-indent: 2.5cm; line-height: 2; margin-bottom: 24px;">
  Atesto para os devidos fins e a quem interessar possa, que o(a) Senhor(a) <b>[NOME DO SERVIDOR]</b>, portador(a) do RG nº [00.000.000 SSP/UF] e CPF/MF sob o nº <b>[000.000.000-00]</b>, matrícula funcional nº <b>[0000]</b>, é servidor(a) público(a) municipal pertencente ao Quadro Efetivo/Comissionado desta Prefeitura, exercendo atualmente as atribuições do cargo de <b>[NOME DO CARGO]</b>, com carga horária de [40] horas semanais.
</p>

<p style="text-align: justify; text-indent: 2.5cm; line-height: 2; margin-bottom: 24px;">
  Atesto ainda que o(a) referido(a) servidor(a) encontra-se em pleno e regular exercício de suas funções, estando lotado(a) na <b>{{NOME_SECRETARIA}}</b>, não constando em seus assentamentos funcionais nenhum fato que desabone sua conduta.
</p>

<p style="text-align: justify; text-indent: 2.5cm; line-height: 2; margin-bottom: 36px;">
  Por ser a expressão da verdade, firmo o presente atestado.
</p>

<p style="text-align: right; margin-bottom: 50px;">{{NOME_MUNICIPIO}}, {{DATA_EXTENSO}}.</p>

<div style="text-align: center;" data-signature-block="true">
  <div style="width: 300px; border-top: 1px solid #000; margin: 0 auto 8px auto;"></div>
  <p style="margin: 0; font-weight: bold;">{{NOME_USUARIO}}</p>
  <p style="margin: 0; font-size: 10pt; color: #444;">{{CARGO_USUARIO}}</p>
  <p style="margin: 0; font-size: 9pt; color: #777;">Departamento de Recursos Humanos</p>
</div>`
  },
  { 
    id: 'tpl-despacho-decisorio', 
    title: 'Despacho Decisório / Deferimento', 
    description: 'Despacho administrativo em processo para autorizar, deferir ou encaminhar solicitações.', 
    category: 'Geral', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-06-08', 
    content: `<div style="text-align: center; margin-bottom: 20px;">
  <h3 style="margin: 0; font-size: 13pt; font-weight: bold;">DESPACHO ADMINISTRATIVO</h3>
  <p style="margin: 4px 0 0 0; font-size: 10pt;"><b>Processo Administrativo nº:</b> {{PROTOCOLO}}</p>
  <p style="margin: 2px 0 0 0; font-size: 10pt;"><b>Interessado(a):</b> [Nome do Interessado/Requerente]</p>
  <p style="margin: 2px 0 0 0; font-size: 10pt;"><b>Assunto:</b> [Assunto do Requerimento]</p>
</div>

<hr style="border: none; border-top: 1px solid #cbd5e1; margin-bottom: 20px;" />

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 14px; line-height: 1.5;">
  <b>1. RELATÓRIO:</b> Trata-se de solicitação formulada pelo interessado supra, requerendo [resumir a pretensão do requerente].
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 14px; line-height: 1.5;">
  <b>2. FUNDAMENTAÇÃO:</b> Compulsando os autos, verifica-se que foram cumpridos todos os requisitos legais e regulamentares exigidos pela legislação municipal aplicável, conforme parecer favorável emitido pelo setor competente.
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 24px; line-height: 1.5;">
  <b>3. DECISÃO:</b> Diante do exposto e com base nas informações técnicas acostadas, <b>DEFIRO</b> o pedido formulado.
</p>

<p style="text-align: justify; text-indent: 2.5cm; margin-bottom: 30px; line-height: 1.5;">
  Encaminhe-se ao setor competente para adoção das providências necessárias ao seu efetivo cumprimento e notificação do interessado.
</p>

<p style="text-align: right; margin-bottom: 40px;">{{NOME_MUNICIPIO}}, {{DATA_EXTENSO}}.</p>

<div style="text-align: center;" data-signature-block="true">
  <div style="width: 280px; border-top: 1px solid #000; margin: 0 auto 8px auto;"></div>
  <p style="margin: 0; font-weight: bold;">{{NOME_USUARIO}}</p>
  <p style="margin: 0; font-size: 10pt;">{{CARGO_USUARIO}}</p>
</div>`
  },
  { 
    id: 'tpl-ata-reuniao', 
    title: 'Ata de Reunião Oficial / Conselho', 
    description: 'Registro oficial de reuniões de secretariado, conselhos municipais ou sessões públicas.', 
    category: 'Geral', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-06-09', 
    content: `<div style="text-align: center; margin-bottom: 24px;">
  <h2 style="margin: 0; font-size: 13pt; font-weight: bold;">ATA DA [Nº]ª REUNIÃO ORDINÁRIA DO [NOME DO CONSELHO / COMISSÃO]</h2>
</div>

<p style="text-align: justify; text-indent: 2.5cm; line-height: 1.8; margin-bottom: 16px;">
  Aos <b>{{DATA_EXTENSO}}</b>, às [09h00min], reuniram-se na sala de reuniões da <b>{{NOME_SECRETARIA}}</b> os membros deste Conselho, sob a presidência do(a) Senhor(a) <b>[Nome do Presidente]</b>, com a presença dos seguintes participantes: [Nome dos Presentes].
</p>

<p style="text-align: justify; text-indent: 2.5cm; line-height: 1.8; margin-bottom: 16px;">
  <b>PAUTA:</b> 1. [Item 1 da pauta]; 2. [Item 2 da pauta]; 3. Assuntos gerais.
</p>

<p style="text-align: justify; text-indent: 2.5cm; line-height: 1.8; margin-bottom: 16px;">
  <b>DESENVOLVIMENTO DOS TRABALHOS:</b> Aberta a sessão pelo Presidente, passou-se à deliberação sobre o primeiro item da pauta. Após ampla discussão entre os presentes, restou deliberado e aprovado por unanimidade que [descrever as deliberações e acordos firmados].
</p>

<p style="text-align: justify; text-indent: 2.5cm; line-height: 1.8; margin-bottom: 24px;">
  Nada mais havendo a tratar, o Presidente encerrou a reunião, da qual eu, <b>[Nome do Secretário]</b>, lavrei a presente ata, que lida e achada conforme, vai assinada por todos os presentes.
</p>

<div style="display: flex; flex-wrap: wrap; justify-content: space-around; gap: 30px; margin-top: 40px;" data-signature-block="true">
  <div style="text-align: center; width: 40%;">
    <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
    <p style="margin: 0; font-size: 9.5pt; font-weight: bold;">Presidente</p>
  </div>
  <div style="text-align: center; width: 40%;">
    <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
    <p style="margin: 0; font-size: 9.5pt; font-weight: bold;">Secretário(a)</p>
  </div>
  <div style="text-align: center; width: 40%;">
    <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
    <p style="margin: 0; font-size: 9.5pt; font-weight: bold;">Membro Titular</p>
  </div>
  <div style="text-align: center; width: 40%;">
    <div style="border-top: 1px solid #000; margin-bottom: 4px;"></div>
    <p style="margin: 0; font-size: 9.5pt; font-weight: bold;">Membro Titular</p>
  </div>
</div>`
  }
];
