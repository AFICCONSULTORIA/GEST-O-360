import { MunicipalNews } from '../../types';

export const MOCK_MUNICIPAL_NEWS: MunicipalNews[] = [
  {
    id: 'news-1',
    title: 'Prefeitura entrega modernização e ampliação da Unidade Central de Saúde com novo Centro de Especialidades',
    slug: 'prefeitura-entrega-modernizacao-unidade-central-saude',
    subtitle: 'Com investimento superior a R$ 1,8 milhão, novo espaço amplia capacidade de consultas em 40% e passa a oferecer exames de imagem digitais e telemedicina.',
    content: `A administração municipal realizou na manhã desta semana a entrega oficial das obras de reforma, ampliação e modernização estrutural da Unidade Básica Central de Saúde. 

O projeto contou com a reestruturação completa de consultórios médicos e odontológicos, implantação de uma sala climatizada de vacinação com controle inteligente de temperatura e a inauguração de uma ala exclusiva para coleta de exames laboratoriais.

### Mais agilidade e conforto para a população
Com as novas instalações, a expectativa da Secretaria Municipal de Saúde é zerar a fila de espera por consultas especializadas e agilizar em até 70% a liberação de resultados diagnósticos.

"Nosso compromisso é levar dignidade e atendimento humanizado para cada família do nosso município. Essa entrega representa o resultado de um planejamento financeiro rigoroso e transparência na aplicação dos recursos públicos", destacou a gestão municipal durante o ato inaugural.

### Principais melhorias entregues:
- 6 novos consultórios médicos totalmente equipados com prontuário eletrônico integrado;
- Sala de triagem com classificação de risco e recepção com painel digital;
- Nova frota de ambulâncias de suporte básico integradas à central de regulação;
- Acessibilidade plena com rampas padronizadas, piso tátil e banheiros adaptados.`,
    category: 'Saúde',
    department: 'Secretaria Municipal de Saúde',
    cover_image_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [
      'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80'
    ],
    is_featured: true,
    badge: 'Obra Entregue',
    project_status: 'Concluído',
    project_budget: 1850000,
    status: 'published',
    author_name: 'Assessoria de Comunicação',
    published_at: '2026-08-27T10:00:00Z',
    views_count: 1420
  },
  {
    id: 'news-2',
    title: 'Avançam as obras do Programa Pavimenta Mais: mais de 25 ruas recebem drenagem pluvial e asfalto novo',
    slug: 'avancam-obras-programa-pavimenta-mais-drenagem-asfalto',
    subtitle: 'Maior pacote de infraestrutura da história do município já transformou a mobilidade urbana em quatro bairros, com calçadas ecológicas e iluminação 100% LED.',
    content: `As equipes da Secretaria Municipal de Viação e Obras seguem em ritmo acelerado nas frentes de trabalho do programa "Pavimenta Mais". Nesta etapa, as intervenções concentram-se na implantação da rede de galerias pluviais subterrâneas, preparando a base para a camada asfáltica definitiva com CBUQ de alta durabilidade.

Além do asfaltamento, o projeto inclui acessibilidade completa com guias rebaixadas, sinalização viária horizontal e vertical em termoplástico refletivo e a substituição das antigas luminárias por lâmpadas de LED de alta eficiência energética.

Moradores da região celebraram o fim da poeira no período de seca e dos atoleiros nos dias de chuva intensa, valorizando os imóveis e garantindo segurança no tráfego de pedestres e veículos.`,
    category: 'Obras & Infraestrutura',
    department: 'Secretaria de Viação e Obras',
    cover_image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [
      'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80'
    ],
    is_featured: false,
    badge: 'Em Execução',
    project_status: 'Em Execução',
    project_budget: 3400000,
    status: 'published',
    author_name: 'Coordenação de Infraestrutura',
    published_at: '2026-08-25T14:30:00Z',
    views_count: 980
  },
  {
    id: 'news-3',
    title: 'Educação 360: todas as escolas da rede municipal recebem Laboratórios de Robótica e Chromebooks novos',
    slug: 'educacao-360-laboratorios-robotica-chromebooks',
    subtitle: 'Iniciativa pioneira conecta tecnologia de ponta, metodologia ativa e internet de alta velocidade nas salas de aula para mais de 3.500 estudantes.',
    content: `A Secretaria de Educação concluiu a entrega de kits modernos de robótica educacional e estações móveis de informática com Chromebooks para todas as turmas do Ensino Fundamental.

O programa faz parte do Plano Municipal de Desenvolvimento da Educação e busca estimular o raciocínio lógico, a criatividade e a formação científica das crianças e jovens do município desde os primeiros anos escolares.

Paralelamente, todos os professores da rede passaram por uma capacitação pedagógica continuada de 40 horas para aplicação prática das ferramentas no planejamento diário de aulas.`,
    category: 'Educação',
    department: 'Secretaria Municipal de Educação',
    cover_image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80'
    ],
    is_featured: true,
    badge: 'Novo Projeto',
    project_status: 'Em Execução',
    project_budget: 720000,
    status: 'published',
    author_name: 'Secretaria de Educação',
    published_at: '2026-08-24T09:15:00Z',
    views_count: 1150
  },
  {
    id: 'news-4',
    title: 'Prefeitura lança Plano Estratégico Municipal de Apoio à Agricultura Familiar e Recuperação de Estradas',
    slug: 'plano-estrategico-apoio-agricultura-familiar',
    subtitle: 'Patrulha mecanizada atua diretamente nas propriedades rurais garantindo preparo de solo, escoamento de safras e reformas de pontes.',
    content: `Os pequenos produtores rurais contam agora com reforço de maquinários pesados disponibilizados pela prefeitura. A frota de motoniveladoras e pás-carregadeiras iniciou a recuperação preventiva de mais de 120 km de estradas vicinais.

O objetivo é assegurar o tráfego regular do transporte escolar e o escoamento diário da produção leiteira, de hortaliças e grãos que abastecem a merenda escolar e a feira municipal.`,
    category: 'Agricultura & Rural',
    department: 'Secretaria de Agricultura e Meio Ambiente',
    cover_image_url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [],
    is_featured: false,
    badge: 'Programa Permanente',
    project_status: 'Contínuo',
    project_budget: 450000,
    status: 'published',
    author_name: 'Assessoria de Comunicação',
    published_at: '2026-08-22T16:00:00Z',
    views_count: 640
  },
  {
    id: 'news-5',
    title: 'Gestão 360 no combate à burocracia: novo Portal do Cidadão atinge marca de 15 mil acessos em tempo recorde',
    slug: 'gestao-360-novo-portal-cidadao-15-mil-acessos',
    subtitle: 'Serviços como agendamento de consultas, consulta de medicamentos, abertura de protocolos e demandas públicas agora são 100% digitais.',
    content: `O investimento em governança digital, transparência ativa e modernização administrativa colocou o município em posição de destaque no Índice de Transparência Pública (PNTP).

A população agora pode solicitar reparos na iluminação pública, acompanhar o estoque de remédios do SUS e consultar leis municipais diretamente pelo celular, sem filas ou burocracia.`,
    category: 'Projetos & Planos',
    department: 'Gabinete do Prefeito',
    cover_image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [],
    is_featured: false,
    badge: 'Transparência',
    project_status: 'Concluído',
    status: 'published',
    author_name: 'Secretaria de Administração',
    published_at: '2026-08-20T11:00:00Z',
    views_count: 2100
  }
];
