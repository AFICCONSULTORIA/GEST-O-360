import { MunicipalLaw } from '../../../types';

export const INITIAL_MOCK_LAWS: MunicipalLaw[] = [
  {
    id: 'law_1',
    number: '001/1990',
    title: 'Lei Orgânica do Município',
    type: 'Lei Orgânica',
    category: 'Administração Geral',
    publication_date: '1990-04-05',
    status: 'Em Vigor',
    author: 'Câmara Municipal Constituinte',
    origin_power: 'legislativo',
    materia_numero: 'Emenda Constitucional Municipal 01/1990',
    ementa: 'Dispõe sobre a organização política, administrativa e financeira do Município, fixando direitos, garantias fundamentais e diretrizes gerais dos poderes municipais.',
    full_text: `PREÂMBULO: Nós, os representantes do povo do Município, reunidos em Câmara Municipal Constituinte, invocando a proteção de Deus, promulgamos a seguinte LEI ORGÂNICA:

TÍTULO I - DAS DISPOSIÇÕES PRELIMINARES

Art. 1º O Município é uma unidade territorial que integra a organização político-administrativa da República Federativa do Brasil, dotado de autonomia política, administrativa e financeira.
§ 1º Todo o poder emana do povo, que o exerce por meio de representantes eleitos ou diretamente, nos termos da Constituição.
§ 2º A ação municipal desenvolve-se em todo o seu território, sem privilégio de distritos ou bairros.

Art. 2º São Poderes do Município, independentes e harmônicos entre si: o Legislativo e o Executivo.
Parágrafo único. É vedado a qualquer dos Poderes delegar atribuições, e quem for investido na função de um deles não poderá exercer a do outro.

Art. 3º A sede do Município dá-lhe o nome e tem a categoria de Cidade.

Art. 4º São símbolos do Município a Bandeira, o Brasão e o Hino representativos de sua cultura, história e valores cívicos.

TÍTULO II - DA COMPETÊNCIA MUNICIPAL

Art. 5º Ao Município compete prover a tudo quanto diga respeito ao seu peculiar interesse e ao bem-estar de sua população, cabendo-lhe, privativamente:
I - legislar sobre assuntos de interesse local;
II - suplementar a legislação federal e a estadual no que couber;
III - instituir e arrecadar os tributos de sua competência;
IV - criar, organizar e suprimir distritos, observada a legislação estadual;
V - organizar e prestar, diretamente ou sob regime de concessão ou permissão, os serviços públicos locais.`,
    compiled_text: `PREÂMBULO: Nós, os representantes do povo do Município, reunidos em Câmara Municipal Constituinte, invocando a proteção de Deus, promulgamos a seguinte LEI ORGÂNICA:

TÍTULO I - DAS DISPOSIÇÕES PRELIMINARES

Art. 1º O Município é uma unidade territorial que integra a organização político-administrativa da República Federativa do Brasil, dotado de autonomia política, administrativa e financeira.
§ 1º Todo o poder emana do povo, que o exerce por meio de representantes eleitos ou diretamente, nos termos da Constituição.
§ 2º A ação municipal desenvolve-se em todo o seu território, sem privilégio de distritos ou bairros.

Art. 2º São Poderes do Município, independentes e harmônicos entre si: o Legislativo e o Executivo.
Parágrafo único. É vedado a qualquer dos Poderes delegar atribuições, e quem for investido na função de um deles não poderá exercer a do outro.

Art. 3º A sede do Município dá-lhe o nome e tem a categoria de Cidade.

Art. 4º São símbolos do Município a Bandeira, o Brasão e o Hino representativos de sua cultura, história e valores cívicos.

TÍTULO II - DA COMPETÊNCIA MUNICIPAL

Art. 5º Ao Município compete prover a tudo quanto diga respeito ao seu peculiar interesse e ao bem-estar de sua população, cabendo-lhe, privativamente:
I - legislar sobre assuntos de interesse local;
II - suplementar a legislação federal e a estadual no que couber;
III - instituir e arrecadar os tributos de sua competência;
IV - criar, organizar e suprimir distritos, observada a legislação estadual;
V - organizar e prestar, diretamente ou sob regime de concessão ou permissão, os serviços públicos locais;
VI - manter, com a cooperação técnica e financeira da União e do Estado, programas de educação infantil e de ensino fundamental. *(Inciso acrescentado pela Emenda à LOM nº 004/2008)*`,
    is_compiled: true,
    tags: ['Lei Orgânica', 'Autonomia Municipal', 'Poderes', 'Constituição Local', 'Fundamental'],
    external_link: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm'
  },
  {
    id: 'law_2',
    number: '045/2021',
    title: 'Código Tributário Municipal',
    type: 'Lei Complementar',
    category: 'Finanças e Tributos',
    publication_date: '2021-12-20',
    status: 'Em Vigor',
    author: 'Poder Executivo Municipal',
    origin_power: 'executivo',
    materia_numero: 'PLC 008/2021 (Câmara Municipal)',
    ementa: 'Institui o Código Tributário do Município, regulando as normas relativas ao ISSQN, IPTU, ITBI, Taxas de Licenciamento, Contribuição de Melhoria e Fiscalização Tributária.',
    full_text: `LIVRO I - DO SISTEMA TRIBUTÁRIO MUNICIPAL
TÍTULO I - DAS DISPOSIÇÕES GERAIS

Art. 1º Esta Lei Complementar regula os direitos e obrigações que emanam das relações jurídicas tributárias entre o Município e os sujeitos passivos, bem como estabelece as normas gerais de arrecadação e fiscalização.

Art. 2º Integram o Sistema Tributário do Município os seguintes tributos:
I - Impostos:
a) Imposto sobre a Propriedade Predial e Territorial Urbana (IPTU);
b) Imposto sobre Serviços de Qualquer Natureza (ISSQN);
c) Imposto sobre a Transmissão Inter Vivos de Bens Imóveis (ITBI);
II - Taxas pelo exercício regular do Poder de Polícia e pela utilização efetiva ou potencial de serviços públicos;
III - Contribuição de Melhoria decorrente de obras públicas;
IV - Contribuição para Custeio da Iluminação Pública (CIP).

TÍTULO II - DO IMPOSTO SOBRE A PROPRIEDADE PREDIAL E TERRITORIAL URBANA (IPTU)

Art. 3º O IPTU tem como fato gerador a propriedade, o domínio útil ou a posse de bem imóvel por natureza ou por acessão física, localizado na zona urbana do Município.
§ 1º Considera-se zona urbana a definida em lei municipal onde existam pelo menos dois dos seguintes melhoramentos:
I - meio-fio ou calçamento, com canalização de águas pluviais;
II - abastecimento de água tratada;
III - sistema de esgotos sanitários;
IV - rede de iluminação pública;
V - escola primária ou posto de saúde a uma distância máxima de 3 (três) quilômetros.

Art. 4º A base de cálculo do imposto é o valor venal do imóvel, apurado conforme Planta Genérica de Valores aprovada pelo Poder Legislativo.

Art. 5º As alíquotas do IPTU são:
I - Para imóveis prediais residenciais: 1,0% (um por cento);
II - Para imóveis comerciais e industriais: 1,5% (um vírgula cinco por cento);
III - Para imóveis territoriais sem edificação: 2,0% (dois por cento).`,
    compiled_text: `LIVRO I - DO SISTEMA TRIBUTÁRIO MUNICIPAL
TÍTULO I - DAS DISPOSIÇÕES GERAIS

Art. 1º Esta Lei Complementar regula os direitos e obrigações que emanam das relações jurídicas tributárias entre o Município e os sujeitos passivos, bem como estabelece as normas gerais de arrecadação e fiscalização.

Art. 2º Integram o Sistema Tributário do Município os seguintes tributos:
I - Impostos:
a) Imposto sobre a Propriedade Predial e Territorial Urbana (IPTU);
b) Imposto sobre Serviços de Qualquer Natureza (ISSQN);
c) Imposto sobre a Transmissão Inter Vivos de Bens Imóveis (ITBI);
II - Taxas pelo exercício regular do Poder de Polícia e pela utilização efetiva ou potencial de serviços públicos;
III - Contribuição de Melhoria decorrente de obras públicas;
IV - Contribuição para Custeio da Iluminação Pública (CIP).

TÍTULO II - DO IMPOSTO SOBRE A PROPRIEDADE PREDIAL E TERRITORIAL URBANA (IPTU)

Art. 3º O IPTU tem como fato gerador a propriedade, o domínio útil ou a posse de bem imóvel por natureza ou por acessão física, localizado na zona urbana do Município.
§ 1º Considera-se zona urbana a definida em lei municipal onde existam pelo menos dois dos seguintes melhoramentos:
I - meio-fio ou calçamento, com canalização de águas pluviais;
II - abastecimento de água tratada;
III - sistema de esgotos sanitários;
IV - rede de iluminação pública;
V - escola primária ou posto de saúde a uma distância máxima de 3 (três) quilômetros.

Art. 4º A base de cálculo do imposto é o valor venal do imóvel, apurado conforme Planta Genérica de Valores aprovada pelo Poder Legislativo.

Art. 5º As alíquotas do IPTU são:
I - Para imóveis prediais residenciais: 1,0% (um por cento);
II - Para imóveis comerciais e industriais: 1,5% (um vírgula cinco por cento);
~~III - Para imóveis territoriais sem edificação: 2,0% (dois por cento).~~
III - Para imóveis territoriais sem edificação: 2,5% (dois vírgula cinco por cento), com alíquota progressiva no tempo nos termos do Estatuto da Cidade. *(Redação dada pela Lei Complementar nº 058/2023)*
§ 1º Fica isento do imposto o proprietário de único imóvel estritamente residencial com renda familiar de até 2 (dois) salários mínimos. *(Parágrafo acrescentado pela LC nº 058/2023)*`,
    is_compiled: true,
    tags: ['Tributos', 'ISSQN', 'IPTU', 'ITBI', 'Arrecadação', 'Fiscal', 'Código Tributário'],
    external_link: ''
  },
  {
    id: 'law_3',
    number: '1.420/2023',
    title: 'Estatuto dos Servidores Públicos Municipais',
    type: 'Lei Ordinária',
    category: 'Servidores e RH',
    publication_date: '2023-05-18',
    status: 'Regulamentada',
    author: 'Poder Executivo Municipal',
    origin_power: 'executivo',
    materia_numero: 'PL 022/2023 (Aprovado com Redação Final)',
    ementa: 'Dispõe sobre o Regime Jurídico Único dos Servidores Públicos do Município, prevendo direitos, vantagens, deveres, regime disciplinar, estágio probatório e plano de desenvolvimento funcional.',
    full_text: `TÍTULO I - DAS DISPOSIÇÕES PRELIMINARES

Art. 1º Esta Lei institui o Regime Jurídico Único dos Servidores Públicos da Administração Direta, Autárquica e Fundacional do Município.

Art. 2º Para os efeitos deste Estatuto, servidor é a pessoa legalmente investida em cargo público mediante aprovação prévia em concurso público de provas ou de provas e títulos.

Art. 3º Cargo público é o conjunto de atribuições e responsabilidades criadas por lei, com denominação própria, número certo e vencimento pago pelos cofres municipais.

TÍTULO II - DO PROVIMENTO, VACÂNCIA E DESENVOLVIMENTO

Art. 4º São requisitos básicos para investidura em cargo público municipal:
I - a nacionalidade brasileira;
II - o gozo dos direitos políticos;
III - a quitação com as obrigações militares e eleitorais;
IV - o nível de escolaridade e habilitação profissional exigidos para o exercício do cargo;
V - a idade mínima de dezoito anos;
VI - aptidão física e mental comprovada por junta médica oficial.

Art. 5º O servidor nomeado para cargo de provimento efetivo fica sujeito a estágio probatório por período de 36 (trinta e seis) meses, durante o qual sua aptidão e capacidade serão objeto de avaliação periódica.`,
    is_compiled: false,
    tags: ['RH', 'Servidores', 'Estatuto', 'Regime Jurídico', 'Concurso Público', 'Direitos'],
    external_link: ''
  },
  {
    id: 'law_4',
    number: '089/2024',
    title: 'Regulamento da Nova Lei de Licitações (Lei Federal nº 14.133/2021)',
    type: 'Decreto',
    category: 'Administração Geral',
    publication_date: '2024-01-15',
    status: 'Em Vigor',
    author: 'Gabinete do Prefeito',
    origin_power: 'executivo',
    ementa: 'Regulamenta no âmbito da Administração Pública Municipal Direta e Indireta a aplicação da Lei Federal nº 14.133/2021 para licitações, contratação direta por dispensa ou inexigibilidade, atuação do agente de contratação e gestão contratual.',
    full_text: `DECRETO MUNICIPAL Nº 089/2024

O PREFEITO MUNICIPAL, no uso das atribuições legais que lhe confere a Lei Orgânica do Município,

DECRETA:

Art. 1º Este Decreto regulamenta as regras de transição, a atuação dos agentes de contratação, comissão de contratação, equipe de apoio, fiscais e gestores de contrato no âmbito da Lei Federal nº 14.133, de 1º de abril de 2021.

Art. 2º É obrigatório o uso da modalidade pregão ou concorrência, preferencialmente sob a forma eletrônica, para aquisições de bens e serviços comuns, ressalvadas as hipóteses devidamente justificadas no processo administrativo.

Art. 3º O Estudo Técnico Preliminar (ETP) e o Termo de Referência (TR) deverão ser elaborados com suporte na plataforma oficial de gestão e aprovados pela autoridade competente antes da abertura do certame.

Art. 4º Fica autorizada a dispensa de licitação física e eletrônica nos valores previstos no art. 75, incisos I e II da Lei Federal nº 14.133/2021, com controle contínuo de fracionamento de despesa pelo Sistema de Controle Interno.`,
    is_compiled: false,
    tags: ['Licitações', 'Contratos', 'Lei 14.133', 'Compras Públicas', 'Decreto Regulamentador'],
    external_link: ''
  },
  {
    id: 'law_5',
    number: '1.380/2022',
    title: 'Plano Diretor de Desenvolvimento Urbano e Ambiental',
    type: 'Lei Ordinária',
    category: 'Urbanismo e Patrimônio',
    publication_date: '2022-09-10',
    status: 'Em Vigor',
    author: 'Poder Executivo Municipal',
    origin_power: 'conjunto',
    materia_numero: 'PL 035/2022 (Audiências Públicas Conjuntas)',
    ementa: 'Estabelece as diretrizes de expansão urbana, ordenamento do uso e ocupação do solo, mobilidade urbana sustentável, proteção das bacias hidrográficas e zoneamento ambiental do Município.',
    full_text: `PLANO DIRETOR MUNICIPAL DE DESENVOLVIMENTO SUSTENTÁVEL

CAPÍTULO I - DOS PRINCÍPIOS FUNDAMENTAIS

Art. 1º O Plano Diretor é o instrumento básico da política de desenvolvimento urbano e de expansão do Município, determinante para todos os agentes públicos e privados que atuam no território municipal.

Art. 2º A política urbana municipal tem por objetivo ordenar o pleno desenvolvimento das funções sociais da cidade e da propriedade urbana, mediante as seguintes diretrizes gerais:
I - garantia do direito a cidades sustentáveis;
II - gestão democrática por meio de audiências públicas periódicas;
III - cooperação entre o Poder Executivo, o Poder Legislativo e a iniciativa privada;
IV - planejamento do desenvolvimento da cidade, da distribuição espacial da população e das atividades econômicas.

Art. 3º Fica dividido o território municipal em macrozonas urbana, rural e de preservação ambiental permanente.`,
    is_compiled: false,
    tags: ['Urbanismo', 'Plano Diretor', 'Zoneamento', 'Obras', 'Meio Ambiente', 'Urbano'],
    external_link: ''
  },
  {
    id: 'law_6',
    number: '012/2024',
    title: 'Instituição do Diário Oficial Eletrônico do Município',
    type: 'Decreto',
    category: 'Administração Geral',
    publication_date: '2024-02-01',
    status: 'Em Vigor',
    author: 'Gabinete do Prefeito',
    origin_power: 'executivo',
    parent_law_number: 'Lei nº 001/1990 (Lei Orgânica)',
    ementa: 'Institui o Diário Oficial Eletrônico como meio oficial de publicação e divulgação dos atos normativos, administrativos e processuais dos Poderes Executivo e Legislativo Municipais.',
    full_text: `DECRETO MUNICIPAL Nº 012/2024

Art. 1º Fica instituído o Diário Oficial Eletrônico do Município, veiculado no portal oficial na internet, como meio oficial de publicação, divulgação e publicidade de leis, decretos, portarias, avisos de licitação e demais atos administrativos municipais.

Art. 2º As edições do Diário Oficial Eletrônico serão assinadas digitalmente com certificado padrão ICP-Brasil, garantindo autenticidade, integridade e validade jurídica plena a todos os atos publicados.

Art. 3º As publicações no Diário Oficial Eletrônico substituem qualquer outro meio de publicação oficial para todos os efeitos legais, inclusive contagem de prazos recursais e de vigência.`,
    is_compiled: false,
    tags: ['Diário Oficial', 'Transparência', 'Publicidade', 'Certificação ICP', 'Decreto'],
    external_link: ''
  },
  {
    id: 'law_7',
    number: '034/2025',
    title: 'Nomeação da Comissão Técnica do Radar PNTP',
    type: 'Portaria',
    category: 'Administração Geral',
    publication_date: '2025-03-10',
    status: 'Em Vigor',
    author: 'Secretário Municipal de Administração',
    origin_power: 'executivo',
    ementa: 'Designa servidores para compor a Comissão Especial responsável pelo envio de evidências e auditoria contínua dos critérios do Radar PNTP (Tribunal de Contas / Atricon).',
    full_text: `PORTARIA MUNICIPAL Nº 034/2025

Art. 1º Designar os servidores municipais abaixo relacionados para integrarem a Comissão Especial de Transparência Pública, com foco na alimentação contínua do Programa Nacional de Transparência Pública (PNTP):
I - Titular da Unidade Central de Controle Interno;
II - Procurador Geral do Município;
III - Encarregado pelo Tratamento de Dados Pessoais (DPO/LGPD);
IV - Diretor de Tecnologia da Informação e Modernização.

Art. 2º A comissão responderá pela validação dos links, integridade dos metadados e publicação pontual de todas as informações contábeis, de frotas, saúde, educação e atos normativos.`,
    is_compiled: false,
    tags: ['PNTP', 'Portaria', 'Comissão', 'Transparência', 'TCE'],
    external_link: ''
  },
  {
    id: 'law_8',
    number: '1.102/2018',
    title: 'Antigo Código de Posturas e Licenciamento Ambiental',
    type: 'Lei Ordinária',
    category: 'Meio Ambiente',
    publication_date: '2018-06-14',
    status: 'Alterada',
    author: 'Câmara Municipal',
    origin_power: 'legislativo',
    materia_numero: 'PL 005/2018',
    ementa: 'Regulamentava o licenciamento ambiental simplificado e posturas urbanas. Alterada parcialmente pela Lei nº 1.380/2022 (Plano Diretor).',
    full_text: `LEI MUNICIPAL Nº 1.102/2018

Art. 1º Nenhuma atividade comercial, industrial ou prestadora de serviços poderá funcionar no Município sem a licença prévia de localização e vistoria ambiental expedida pela Secretaria Municipal competente.

Art. 2º É dever de todo munícipe manter calçadas, muros e fachadas limpos e em perfeito estado de conservação, sob pena de notificação e multa administrativa.`,
    compiled_text: `LEI MUNICIPAL Nº 1.102/2018 (Com alterações da Lei nº 1.380/2022)

Art. 1º Nenhuma atividade comercial, industrial ou prestadora de serviços poderá funcionar no Município sem a licença prévia de localização e vistoria ambiental expedida pela Secretaria Municipal competente.

~~Art. 2º É dever de todo munícipe manter calçadas, muros e fachadas limpos e em perfeito estado de conservação, sob pena de notificação e multa administrativa.~~
Art. 2º O ordenamento das calçadas e fachadas observará as diretrizes de acessibilidade e mobilidade universal estabelecidas no Plano Diretor Sustentável. *(Redação dada pela Lei nº 1.380/2022)*`,
    is_compiled: true,
    tags: ['Licenciamento', 'Meio Ambiente', 'Alterada', 'Posturas'],
    external_link: ''
  },
  {
    id: 'law_9',
    number: '052/2024',
    title: 'Regulamentação do Teletrabalho e Produtividade no Serviço Público',
    type: 'Decreto',
    category: 'Servidores e RH',
    publication_date: '2024-04-10',
    status: 'Em Vigor',
    author: 'Gabinete do Prefeito',
    origin_power: 'executivo',
    parent_law_id: 'law_3',
    parent_law_number: 'Lei nº 1.420/2023 (Estatuto dos Servidores)',
    parent_law_title: 'Estatuto dos Servidores Públicos Municipais',
    ementa: 'Regulamenta o regime de teletrabalho e acompanhamento por metas de desempenho para os servidores públicos municipais, nos termos do art. 42 da Lei Municipal nº 1.420/2023.',
    full_text: `DECRETO MUNICIPAL Nº 052/2024

O PREFEITO MUNICIPAL, no uso das atribuições que lhe confere a Lei Orgânica e considerando o art. 42 do Estatuto dos Servidores (Lei nº 1.420/2023),

DECRETA:

Art. 1º Fica instituído o Programa de Gestão e Desempenho no regime de teletrabalho para os servidores públicos da Administração Direta do Município.

Art. 2º A adesão ao teletrabalho é facultativa, mediante plano de trabalho aprovado pela chefia imediata e compromisso formal de entrega de resultados superiores à média presencial.

Art. 3º As atividades de atendimento presencial ao público e serviços essenciais de saúde e segurança patrimonial não poderão operar em regime de teletrabalho.`,
    is_compiled: false,
    tags: ['Teletrabalho', 'Decreto Regulamentador', 'Servidores', 'Produtividade', 'RH'],
    external_link: ''
  }
];

