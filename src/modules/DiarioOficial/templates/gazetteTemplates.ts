import { GazetteActCategory } from '../../../types';

export interface GazetteTemplateContext {
  institutionName: string;
  cityName: string;
  cnpj?: string;
  mayorName?: string;
  dateExtenso: string;
  year: number;
}

export interface GazetteGeneratedDraft {
  category: GazetteActCategory;
  actNumber: string;
  department: string;
  title: string;
  summary: string;
  content: string;
}

export interface GazettePublicationTemplate {
  id: string;
  label: string;
  shortTag: string;
  category: GazetteActCategory;
  description: string;
  build: (ctx: GazetteTemplateContext) => GazetteGeneratedDraft;
}

export const extractCityFromInstitutionName = (name?: string): string => {
  if (!name) return 'Município';
  const cleaned = name
    .replace(/^prefeitura\s+municipal\s+de\s+/i, '')
    .replace(/^prefeitura\s+de\s+/i, '')
    .replace(/^munic[ií]pio\s+de\s+/i, '')
    .replace(/^c[aâ]mara\s+municipal\s+de\s+/i, '')
    .trim();
  return cleaned || name;
};

export const formatExtensoDatePtBr = (date: Date = new Date()): string =>
  date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export const GAZETTE_PUBLICATION_TEMPLATES: GazettePublicationTemplate[] = [
  {
    id: 'decreto',
    label: 'Decreto Municipal',
    shortTag: 'Executivo',
    category: 'Decreto',
    description: 'Estrutura oficial com Considerandos, Artigos, Vigência e Assinatura do Prefeito.',
    build: ({ cityName, year, dateExtenso, mayorName }) => ({
      category: 'Decreto',
      actNumber: `001/${year}`,
      department: 'Gabinete do Prefeito',
      title: `DECRETO Nº 001/${year}, DE ${dateExtenso.toUpperCase()}`,
      summary: `Dispõe sobre medidas administrativas no âmbito do Poder Executivo Municipal de ${cityName} e dá outras providências.`,
      content: `<p>O <strong>PREFEITO MUNICIPAL DE ${cityName.toUpperCase()}</strong>, no uso das atribuições que lhe confere a Lei Orgânica do Município e demais disposições legais vigentes;</p>
<p><strong>CONSIDERANDO</strong> a necessidade de assegurar a continuidade, a eficiência e a transparência dos serviços públicos prestados à população;</p>
<p><strong>CONSIDERANDO</strong> os princípios constitucionais da legalidade, impessoalidade, moralidade e publicidade previstos no art. 37 da Constituição Federal;</p>
<p style="text-align: center;"><strong>DECRETA:</strong></p>
<p><strong>Art. 1º</strong> Fica instituído/regulamentado, no âmbito da Administração Pública Direta do Município de ${cityName}, o procedimento administrativo descrito neste ato, observadas as normas da legislação vigente.</p>
<p><strong>Art. 2º</strong> Compete aos titulares das Secretarias Municipais adotar as providências operacionais necessárias ao fiel cumprimento do disposto neste Decreto.</p>
<p><strong>Art. 3º</strong> Este Decreto entra em vigor na data de sua publicação, revogadas as disposições em contrário.</p>
<p>Gabinete do Prefeito Municipal de ${cityName}, ${dateExtenso}.</p>
<p style="text-align: center;"><strong>${(mayorName || 'PREFEITO MUNICIPAL').toUpperCase()}</strong><br />Prefeito Municipal</p>`,
    }),
  },
  {
    id: 'portaria_nomeacao',
    label: 'Portaria de Nomeação / RH',
    shortTag: 'Pessoal',
    category: 'Portaria',
    description: 'Modelo pronto para nomeação, designação de comissão, férias ou lotação de servidor.',
    build: ({ cityName, year, dateExtenso, mayorName }) => ({
      category: 'Portaria',
      actNumber: `001/${year}`,
      department: 'Secretaria Municipal de Administração',
      title: `PORTARIA Nº 001/${year}, DE ${dateExtenso.toUpperCase()}`,
      summary: 'Dispõe sobre nomeação/designação de servidor público municipal e dá outras providências.',
      content: `<p>O <strong>PREFEITO MUNICIPAL DE ${cityName.toUpperCase()}</strong>, no uso das atribuições legais que lhe são conferidas pela Lei Orgânica Municipal e pelo Estatuto dos Servidores Públicos Municipais;</p>
<p style="text-align: center;"><strong>RESOLVE:</strong></p>
<p><strong>Art. 1º</strong> <strong>NOMEAR</strong> o(a) Sr.(a) <strong>[NOME COMPLETO DO SERVIDOR]</strong>, inscrito(a) no CPF sob o nº <strong>000.000.000-00</strong>, para exercer o cargo de <strong>[DENOMINAÇÃO DO CARGO / FUNÇÃO]</strong>, com lotação junto à <strong>[SECRETARIA MUNICIPAL DE ...]</strong>.</p>
<p><strong>Art. 2º</strong> O Departamento de Recursos Humanos adotará as medidas de posse, registro funcional e inclusão em folha de pagamento na forma da lei.</p>
<p><strong>Art. 3º</strong> Esta Portaria entra em vigor na data de sua publicação, retroagindo seus efeitos se aplicável.</p>
<p>${cityName}, ${dateExtenso}.</p>
<p style="text-align: center;"><strong>${(mayorName || 'PREFEITO MUNICIPAL').toUpperCase()}</strong><br />Prefeito Municipal</p>`,
    }),
  },
  {
    id: 'resolucao_conselho',
    label: 'Resolução de Conselho / Órgão',
    shortTag: 'Conselhos',
    category: 'Resolução & Instrução',
    description: 'Para resoluções do CMAS, CMDCA, CME, Conselho de Saúde e instruções normativas.',
    build: ({ cityName, year, dateExtenso }) => ({
      category: 'Resolução & Instrução',
      actNumber: `001/CMAS/${year}`,
      department: 'Secretaria Municipal de Assistência Social',
      title: `RESOLUÇÃO Nº 001/CMAS/${year}, DE ${dateExtenso.toUpperCase()}`,
      summary: `Dispõe sobre a aprovação de plano de ação e deliberações do Conselho Municipal em ${cityName}.`,
      content: `<p>O <strong>CONSELHO MUNICIPAL DE ASSISTÊNCIA SOCIAL DE ${cityName.toUpperCase()}</strong>, no uso de suas atribuições legais conferidas pela Lei Municipal de criação e seu Regimento Interno, em reunião ordinária realizada em ${dateExtenso};</p>
<p><strong>CONSIDERANDO</strong> a deliberação favorável registrada em Ata nº ___/${year};</p>
<p style="text-align: center;"><strong>RESOLVE:</strong></p>
<p><strong>Art. 1º</strong> Aprovar o relatório técnico e a reprogramação de ações submetidos pelo órgão gestor municipal referente ao exercício de ${year}.</p>
<p><strong>Art. 2º</strong> Encaminhe-se cópia desta Resolução aos órgãos competentes para ciência, registro e cumprimento.</p>
<p><strong>Art. 3º</strong> Esta Resolução entra em vigor na data de sua publicação no Diário Oficial Eletrônico do Município.</p>
<p>${cityName}, ${dateExtenso}.</p>
<p style="text-align: center;"><strong>[NOME DO(A) PRESIDENTE DO CONSELHO]</strong><br />Presidente do Conselho Municipal</p>`,
    }),
  },
  {
    id: 'extrato_contrato',
    label: 'Extrato de Contrato / Aditivo',
    shortTag: 'Contratos',
    category: 'Contrato & Extrato',
    description: 'Tabela estruturada com partes, CNPJ, objeto, valor global, dotação e Lei nº 14.133/2021.',
    build: ({ institutionName, cityName, year, dateExtenso }) => ({
      category: 'Contrato & Extrato',
      actNumber: `001/${year}`,
      department: 'Departamento de Contratos e Licitações',
      title: `EXTRATO DO CONTRATO ADMINISTRATIVO Nº 001/${year}`,
      summary: `Extrato resumido de instrumento contratual firmado pelo Município de ${cityName} nos termos da Lei nº 14.133/2021.`,
      content: `<p>Em atendimento ao princípio da publicidade previsto no art. 94 da Lei Federal nº 14.133/2021, torna-se público o extrato do instrumento contratual abaixo especificado:</p>
<table>
  <tbody>
    <tr><td><strong>Instrumento</strong></td><td>Contrato Administrativo nº 001/${year}</td></tr>
    <tr><td><strong>Contratante</strong></td><td>${institutionName}</td></tr>
    <tr><td><strong>Contratada</strong></td><td>[RAZÃO SOCIAL DA EMPRESA] — CNPJ: 00.000.000/0001-00</td></tr>
    <tr><td><strong>Processo Licitatório</strong></td><td>Pregão Eletrônico / Dispensa nº ___/${year}</td></tr>
    <tr><td><strong>Objeto Resumido</strong></td><td>[Descrever sucintamente o objeto contratado ou serviços prestados]</td></tr>
    <tr><td><strong>Valor Global</strong></td><td>R$ 0,00 (valor por extenso)</td></tr>
    <tr><td><strong>Vigência</strong></td><td>${dateExtenso} a 31/12/${year}</td></tr>
    <tr><td><strong>Dotação Orçamentária</strong></td><td>Órgão: __ | Unidade: __ | Elemento: 3.3.90.39.00 | Fonte: ___</td></tr>
    <tr><td><strong>Fiscal do Contrato</strong></td><td>[Nome do Servidor Designado / Matrícula]</td></tr>
  </tbody>
</table>
<p>${cityName}, ${dateExtenso}.</p>`,
    }),
  },
  {
    id: 'ato_contratacao',
    label: 'Atos de Contratação / Aviso de Licitação',
    shortTag: 'Licitação',
    category: 'Licitação & Edital',
    description: 'Aviso de abertura, prorrogação ou edital de Pregão Eletrônico / Concorrência.',
    build: ({ institutionName, cityName, year, dateExtenso }) => ({
      category: 'Licitação & Edital',
      actNumber: `PE 001/${year}`,
      department: 'Comissão de Contratação e Licitações',
      title: `AVISO DE LICITAÇÃO — PREGÃO ELETRÔNICO Nº 001/${year}`,
      summary: `Abertura de certame licitatório visando à aquisição/contratação de interesse do Município de ${cityName}.`,
      content: `<p>A <strong>${institutionName.toUpperCase()}</strong>, por intermédio do Agente de Contratação / Pregoeiro Oficial, torna público aos interessados que realizará licitação na modalidade <strong>PREGÃO ELETRÔNICO Nº 001/${year}</strong> (Processo Administrativo nº ___/${year}), regido pela Lei Federal nº 14.133/2021.</p>
<p><strong>OBJETO:</strong> [Descrever detalhadamente o objeto do edital, especificando lotes ou registro de preços, se aplicável].</p>
<p><strong>CRITÉRIO DE JULGAMENTO:</strong> Menor Preço por Item / Global.</p>
<p><strong>DATA E HORÁRIO DA SESSÃO PÚBLICA:</strong> [DD/MM/${year}], às [08h30min] (horário oficial de Brasília/DF).</p>
<p><strong>EDITAL E INFORMAÇÕES:</strong> A íntegra do Edital e seus anexos encontra-se disponível gratuitamente no Portal da Transparência Municipal e na sala da Comissão de Contratação, em dias úteis, das 07h às 13h.</p>
<p>${cityName}, ${dateExtenso}.</p>
<p style="text-align: center;"><strong>[NOME DO(A) PREGOEIRO(A) / AGENTE DE CONTRATAÇÃO]</strong><br />Portaria de Designação nº ___/${year}</p>`,
    }),
  },
  {
    id: 'termo_homologacao',
    label: 'Termo de Homologação / Resultado',
    shortTag: 'Licitação',
    category: 'Licitação & Edital',
    description: 'Homologação e adjudicação de edital, pregão ou concurso/processo seletivo.',
    build: ({ cityName, year, dateExtenso, mayorName }) => ({
      category: 'Licitação & Edital',
      actNumber: `EDITAL 001/${year}`,
      department: 'Gabinete do Prefeito',
      title: `TERMO DE HOMOLOGAÇÃO E ADJUDICAÇÃO — EDITAL Nº 001/${year}`,
      summary: 'Homologa o resultado final do certame/seleção e autoriza a convocação do(s) vencedor(es).',
      content: `<p>O <strong>PREFEITO MUNICIPAL DE ${cityName.toUpperCase()}</strong>, no uso de suas atribuições legais e à vista dos autos do Processo Administrativo nº ___/${year}, considerando a regularidade dos atos praticados pela Comissão responsável e o parecer jurídico favorável;</p>
<p style="text-align: center;"><strong>RESOLVE:</strong></p>
<p><strong>I – HOMOLOGAR</strong> o resultado final referente ao <strong>EDITAL Nº 001/${year}</strong>, declarando vencedora/classificada a proponente/candidato(a) relacionado(a) no relatório oficial anexo aos autos;</p>
<p><strong>II – ADJUDICAR</strong> o objeto em favor da vencedora, no valor total de <strong>R$ 0,00</strong>, autorizando a emissão da nota de empenho e formalização do respectivo termo;</p>
<p><strong>III – DETERMINAR</strong> a publicação deste Termo no Diário Oficial Eletrônico do Município para que surta seus efeitos legais.</p>
<p>${cityName}, ${dateExtenso}.</p>
<p style="text-align: center;"><strong>${(mayorName || 'PREFEITO MUNICIPAL').toUpperCase()}</strong><br />Prefeito Municipal</p>`,
    }),
  },
  {
    id: 'lei_municipal',
    label: 'Lei Municipal Promulgada',
    shortTag: 'Legislativo',
    category: 'Lei',
    description: 'Texto padrão de sanção de Lei Municipal aprovada pela Câmara de Vereadores.',
    build: ({ cityName, year, dateExtenso, mayorName }) => ({
      category: 'Lei',
      actNumber: `001/${year}`,
      department: 'Gabinete do Prefeito',
      title: `LEI MUNICIPAL Nº 001/${year}, DE ${dateExtenso.toUpperCase()}`,
      summary: `Dispõe sobre autorização legislativa no Município de ${cityName} e dá outras providências.`,
      content: `<p>O <strong>PREFEITO MUNICIPAL DE ${cityName.toUpperCase()}</strong>, no uso das atribuições legais, faz saber que a Câmara Municipal aprovou e eu sanciono a seguinte Lei:</p>
<p><strong>Art. 1º</strong> Fica o Poder Executivo Municipal autorizado a [descrever a finalidade principal desta Lei Municipal].</p>
<p><strong>Art. 2º</strong> As despesas decorrentes da execução desta Lei correrão por conta de dotações próprias consignadas no orçamento vigente, podendo ser suplementadas caso necessário.</p>
<p><strong>Art. 3º</strong> Esta Lei entra em vigor na data de sua publicação, revogadas as disposições em contrário.</p>
<p>Gabinete do Prefeito Municipal de ${cityName}, em ${dateExtenso}.</p>
<p style="text-align: center;"><strong>${(mayorName || 'PREFEITO MUNICIPAL').toUpperCase()}</strong><br />Prefeito Municipal</p>`,
    }),
  },
  {
    id: 'aviso_comunicado',
    label: 'Aviso / Comunicado / Errata',
    shortTag: 'Avisos',
    category: 'Aviso & Comunicado',
    description: 'Para gabaritos, erratas de contrato, audiências públicas e comunicados gerais.',
    build: ({ institutionName, cityName, year, dateExtenso }) => ({
      category: 'Aviso & Comunicado',
      actNumber: `001/${year}`,
      department: 'Secretaria Municipal de Administração',
      title: `COMUNICADO OFICIAL Nº 001/${year}`,
      summary: `Torna pública informação oficial de interesse da população e servidores de ${cityName}.`,
      content: `<p>A <strong>${institutionName.toUpperCase()}</strong>, por meio da Secretaria Municipal competente, torna público à população e aos interessados que:</p>
<ul>
  <li><strong>Assunto / Referência:</strong> [Indicar edital, contrato ou evento público];</li>
  <li><strong>Data / Prazo:</strong> [Informar data, horário e local de comparecimento ou protocolo];</li>
  <li><strong>Observações:</strong> Os interessados poderão obter mais informações na sede da Prefeitura Municipal ou pelos canais oficiais de atendimento ao cidadão.</li>
</ul>
<p>${cityName}, ${dateExtenso}.</p>`,
    }),
  },
];
