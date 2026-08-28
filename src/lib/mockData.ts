import { 
  ShieldAlert, 
  ClipboardCheck, 
  Calendar, 
  BookText, 
  Globe, 
  FileCheck, 
  FileText, 
  ShoppingCart, 
  Target, 
  PieChart as PieChartIcon, 
  Package, 
  FileBadge, 
  GraduationCap, 
  HardHat, 
  Briefcase, 
  HeartPulse, 
  Wrench, 
  TreePine, 
  Calculator, 
  Tractor, 
  HeartHandshake, 
  Trophy, 
  Map, 
  Landmark, 
  BookOpen, 
  Users2,
  MessageSquare,
  Scale,
  Activity,
  ClipboardList,
  Newspaper
} from 'lucide-react';


import { 
  DocumentRecord, 
  OrderItem, 
  CheckItem, 
  CompanyCertificates, 
  Institution, 
  AdminUser, 
  DocumentTemplate, 
  View,
  PNTPCategory
} from '../types';

export const MOCK_DOCUMENTS: DocumentRecord[] = [
  { id: 'd1', type: 'Ofício', number: 1, year: 2026, requester: 'Maria - Gabinete', subject: 'Solicitação de agendamento de reunião', dateCreated: '2026-05-18' },
  { id: 'd2', type: 'Decreto', number: 1, year: 2026, requester: 'Prefeito', subject: 'Nomeação de servidores', dateCreated: '2026-05-18' },
];

export const MOCK_ORDERS: OrderItem[] = [
  {
    id: '1',
    type: 'obras_abrange',
    description: 'Cimento, areia e brita para reforma do posto de saúde',
    requester: 'João - Obras',
    dateRequested: '2024-05-15',
    quotationNumber: 'COT-2024-055',
    winningSupplier: 'Construmax Materiais',
    status: 'concluido'
  },
  {
    id: '2',
    type: 'veiculos_gtf',
    description: 'Troca de óleo e filtros da ambulância placa XYZ-1234',
    requester: 'Maria - Saúde',
    dateRequested: '2024-05-18',
    status: 'em_cotacao'
  }
];

export const MOCK_CONTROLS: CheckItem[] = [
  { 
    id: '1', 
    task: 'Revisão de Folha de Pagamento', 
    status: 'completed', 
    department: 'RH', 
    deadline: '2024-05-30', 
    notes: 'Confrontado com o e-Social e sem divergências.',
    history: [
      { id: 'h1', user: 'Carlos Mendes', date: '10/05/2024 14:20', action: 'Criação', changes: 'Procedimento inicializado no sistema.' },
      { id: 'h2', user: 'Ana Paula (RH)', date: '12/05/2024 09:15', action: 'Atualização', changes: 'Status alterado para em andamento. Notas adicionadas.' },
      { id: 'h3', user: 'Dr. Afonso', date: '14/05/2024 16:00', action: 'Finalização', changes: 'Conformidade validada e status alterado para concluído.' }
    ]
  },
  { 
    id: '2', 
    task: 'Auditoria de Frotas - Maio', 
    status: 'pending', 
    department: 'Transportes', 
    deadline: '2024-05-15', 
    notes: 'Aguardando envio dos diários de bordo da Secretaria de Saúde.',
    history: [
      { id: 'h4', user: 'Roberto Silva', date: '08/05/2024 10:00', action: 'Criação', changes: 'Auditoria mensal agendada.' }
    ]
  },
  { 
    id: '3', 
    task: 'Prestação de Contas TCE', 
    status: 'urgent', 
    department: 'Contabilidade', 
    deadline: '2024-05-10', 
    notes: 'Faltam anexos dos convênios federais.',
    history: [
      { id: 'h5', user: 'Julia Santos', date: '05/05/2024 11:30', action: 'Criação', changes: 'Processo de prestação de contas iniciado.' },
      { id: 'h6', user: 'Julia Santos', date: '07/05/2024 15:45', action: 'Alerta', changes: 'Status alterado para urgente devido a atrasos em anexos.' }
    ]
  },
  { id: '4', task: 'Fiscalização de Obras - Unidade de Saúde', status: 'pending', department: 'Obras', deadline: '2024-05-20', notes: 'Medição agendada para sexta-feira.' },
  { id: '5', task: 'Conferência de Almoxarifado', status: 'pending', department: 'Administração', deadline: '2024-05-25', notes: 'Iniciado processo de contagem física.' },
];

export const COMPLIANCE_DATA = [
  { name: 'Jan', value: 85 },
  { name: 'Fev', value: 88 },
  { name: 'Mar', value: 82 },
  { name: 'Abr', value: 91 },
  { name: 'Mai', value: 95 },
];

export const DEPT_DISTRIBUTION = [
  { name: 'RH', value: 400 },
  { name: 'Obras', value: 300 },
  { name: 'Saúde', value: 300 },
  { name: 'Finanças', value: 200 },
];

export const COLORS = ['#1a1a1a', '#4a4a4a', '#8e8e8e', '#cccccc'];

export const getComplianceDataForYear = (year: string) => {
  const seeds: Record<string, number[]> = {
    '2026': [75, 82, 78, 88, 92],
    '2025': [70, 75, 72, 80, 85],
    '2024': [85, 88, 82, 91, 95],
    '2023': [60, 65, 70, 68, 75],
    '2022': [40, 55, 52, 60, 65]
  };
  const base = seeds[year] || seeds['2024'];
  return [
    { name: 'Jan', value: base[0] },
    { name: 'Fev', value: base[1] },
    { name: 'Mar', value: base[2] },
    { name: 'Abr', value: base[3] },
    { name: 'Mai', value: base[4] },
  ];
};

export const NAVBAR_CATEGORIES = [
  {
    id: 'controle',
    label: 'Controles',
    icon: ShieldAlert,
    items: [
      { id: 'controls', label: 'Controles Internos', icon: ClipboardCheck },
      { id: 'calendar', label: 'Calendário TCE', icon: Calendar },
      { id: 'norms', label: 'Normativas', icon: BookText },
      { id: 'risk', label: 'Análise de Risco', icon: ShieldAlert },
      { id: 'pntp', label: 'Radar PNTP', icon: Globe },
    ]
  },
  {
    id: 'gestao',
    label: 'Gestão',
    icon: BookOpen,
    items: [
      { id: 'mayor', label: 'Visão do Prefeito', icon: Activity },
      { id: 'certificates', label: 'Banco de Certidões', icon: FileCheck },
      { id: 'laws', label: 'Banco de Leis', icon: Scale },
      { id: 'protocol', label: 'Protocolo Digital', icon: ClipboardCheck },
      { id: 'doc_numbers', label: 'Controle de Numeração', icon: FileText },
      { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
      { id: 'contracts', label: 'Licitações & Contratos', icon: Target },
      { id: 'reports', label: 'Relatórios', icon: PieChartIcon },
      { id: 'patrimonio', label: 'Patrimônio', icon: Package },
      { id: 'templates', label: 'Modelos', icon: FileBadge },
    ]
  },
  {
    id: 'secretarias',
    label: 'Secretarias',
    icon: Users2,
    items: [
      { id: 'education', label: 'Educação', icon: GraduationCap },
      { id: 'obras', label: 'Viação e Obras', icon: HardHat },
      { id: 'administracao', label: 'Administração', icon: Briefcase },
      { id: 'financas', label: 'Finanças', icon: Landmark },
      { id: 'saude', label: 'Saúde', icon: HeartPulse },
      { id: 'servicos_publicos', label: 'Serviços Públicos', icon: Wrench },
      { id: 'meio_ambiente', label: 'Meio Ambiente', icon: TreePine },
      { id: 'tributos', label: 'Tributos', icon: Calculator },
      { id: 'agricultura', label: 'Agricultura', icon: Tractor },
      { id: 'assistencia_social', label: 'Assistência Social', icon: HeartHandshake },
      { id: 'esporte', label: 'Esporte', icon: Trophy },
      { id: 'planejamento', label: 'Planejamento', icon: Map },
    ]
  },
  {
    id: 'comunicacao',
    label: 'Comunicação & População',
    icon: MessageSquare,
    items: [
      { id: 'noticias', label: 'Notícias & Projetos', icon: Newspaper },
      { id: 'forms', label: 'Formulários & Consultas', icon: ClipboardList },
      { id: 'communication', label: 'Central WhatsApp', icon: MessageSquare },
    ]
  },
  {
    id: 'legislativo',
    label: 'Poder Legislativo',
    icon: Landmark,
    items: [
      { id: 'camara', label: 'Câmara 360', icon: Landmark },
    ]
  }
];

export const AVAILABLE_PERMISSIONS: { id: View; label: string }[] = [
  { id: 'home', label: 'Início (Dashboard)' },
  { id: 'mayor', label: 'Visão do Prefeito' },
  { id: 'controls', label: 'Controles Internos' },
  { id: 'calendar', label: 'Calendário Oficial' },
  { id: 'norms', label: 'Atos Normativos' },
  { id: 'risk', label: 'Gestão de Riscos' },
  { id: 'pntp', label: 'Radar PNTP' },
  { id: 'protocol', label: 'Protocolo' },
  { id: 'contracts', label: 'Contratos e Licitações' },
  { id: 'education', label: 'Educação' },
  { id: 'orders', label: 'Pedidos (Obras/Veículos)' },
  { id: 'doc_numbers', label: 'Controle de Numeração' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'certificates', label: 'Certidões' },
  { id: 'laws', label: 'Banco de Leis' },
  { id: 'obras', label: 'Obras e Inf.' },
  { id: 'administracao', label: 'Administração' },
  { id: 'financas', label: 'Finanças' },
  { id: 'saude', label: 'Saúde' },
  { id: 'servicos_publicos', label: 'Serviços Públicos' },
  { id: 'meio_ambiente', label: 'Meio Ambiente' },
  { id: 'tributos', label: 'Tributos' },
  { id: 'agricultura', label: 'Agricultura' },
  { id: 'assistencia_social', label: 'Assistência Social' },
  { id: 'esporte', label: 'Esporte' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'camara', label: 'Câmara Municipal' },
  { id: 'noticias', label: 'Notícias & Divulgação Municipal' },
  { id: 'forms', label: 'Formulários & Consultas Populares' },
  { id: 'communication', label: 'Comunicação WhatsApp' },
  { id: 'settings', label: 'Configurações' }
];

export const MOCK_INSTITUTIONS: Institution[] = [
  { id: 'inst_4', name: 'Prefeitura de Torixoréu/MT' }
];

export const MOCK_USERS: AdminUser[] = [
  { id: '1', name: 'Administrador Principal', email: 'admin@gestao360.com.br', role: 'Admin', status: 'Ativo', lastLogin: 'Hoje, 09:41', permissions: ['home', 'mayor', 'controls', 'calendar', 'norms', 'risk', 'pntp', 'protocol', 'contracts', 'education', 'orders', 'doc_numbers', 'reports', 'certificates', 'laws', 'obras', 'administracao', 'financas', 'saude', 'servicos_publicos', 'meio_ambiente', 'tributos', 'agricultura', 'assistencia_social', 'esporte', 'planejamento', 'settings', 'patrimonio', 'camara', 'communication', 'forms', 'noticias'], institution_id: 'inst_1' },
  { id: '2', name: 'João Silva', email: 'joao.silva@gestao360.com.br', role: 'Editor', status: 'Ativo', lastLogin: 'Ontem, 15:30', permissions: ['home', 'controls', 'protocol'], institution_id: 'inst_1' },
  { id: '3', name: 'Maria Souza', email: 'maria.souza@gestao360.com.br', role: 'Visualizador', status: 'Inativo', lastLogin: '10/05/2026', permissions: ['home', 'calendar'], institution_id: 'inst_2' }
];

export const MOCK_COMPANIES: CompanyCertificates[] = [
  {
    id: '1', companyName: 'Construtora Alfa Ltda', cnpj: '12.345.678/0001-90',
    certificates: {
      Trabalhista: { issueDate: '2024-01-15', expiryDate: '2025-01-15' },
      Federal: { issueDate: '2024-01-10', expiryDate: '2024-12-10' },
      Estadual: { issueDate: '2024-03-20', expiryDate: '2024-09-20' },
      Municipal: { issueDate: '2023-11-20', expiryDate: '2024-05-10' },
      FGTS: { issueDate: '2024-05-18', expiryDate: '2024-06-18' },
    }
  },
  {
    id: '2', companyName: 'Tecnologias Silva', cnpj: '98.765.432/0001-10',
    certificates: {
      Trabalhista: { issueDate: '2023-11-20', expiryDate: '2024-11-20' },
      Federal: null,
      Estadual: { issueDate: '2024-03-20', expiryDate: '2024-09-20' },
      Municipal: null,
      FGTS: { issueDate: '2024-05-18', expiryDate: '2024-06-18' },
    }
  },
  {
    id: '3', companyName: 'Serviços Gerais Oliveira', cnpj: '55.666.777/0001-22',
    certificates: {
      Trabalhista: { issueDate: '2024-05-10', expiryDate: '2024-11-10' },
      Federal: { issueDate: '2024-05-15', expiryDate: '2024-11-15' },
      Estadual: { issueDate: '2024-05-16', expiryDate: '2024-11-16' },
      Municipal: { issueDate: '2024-05-17', expiryDate: '2024-11-17' },
      FGTS: { issueDate: '2024-05-18', expiryDate: '2024-06-18' },
    }
  }
];

export const MOCK_TEMPLATES: DocumentTemplate[] = [
  { 
    id: 'tpl1', 
    title: 'Ofício de Solicitação / Encaminhamento', 
    description: 'Ofício padrão para comunicação oficial externa ou envio de demandas a outros órgãos.', 
    category: 'Ofícios', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-04-10', 
    content: '<p style="text-align: right;">{{NOME_MUNICIPIO}}, {{DATA_EXTENSO}}</p><br><p><b>OFÍCIO Nº XXXX/2026/{{NOME_SECRETARIA_SIGLA}}</b></p><br><p>A Sua Senhoria o(a) Senhor(a),</p><p><b>[NOME DO DESTINATÁRIO]</b></p><p>[Cargo do Destinatário]</p><p>[Órgão/Entidade]</p><br><p><b>Assunto: Solicitação de providências referente a [Tema]</b></p><br><p>Senhor(a) [Cargo],</p><p style="text-align: justify; text-indent: 40px;">Ao cumprimentá-lo(a) cordialmente, sirvo-me do presente para solicitar a Vossa Senhoria as providências necessárias visando [descrever o pedido de forma clara e objetiva].</p><p style="text-align: justify; text-indent: 40px;">Ressaltamos que a referida solicitação se faz necessária em virtude de [apresentar a justificativa principal da demanda].</p><p style="text-align: justify; text-indent: 40px;">Certos de contarmos com vossa habitual atenção e colaboração, colocamo-nos à inteira disposição para eventuais esclarecimentos adicionais que se fizerem necessários.</p><br><p>Respeitosamente,</p><br>{{ASSINATURA}}' 
  },
  { 
    id: 'tpl2', 
    title: 'Memorando Interno', 
    description: 'Documento ágil para comunicação direta entre setores e departamentos da mesma secretaria.', 
    category: 'Ofícios', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-04-12', 
    content: '<p><b>MEMORANDO Nº XXX/2026/{{NOME_SECRETARIA_SIGLA}}</b></p><br><p><b>De:</b> {{NOME_USUARIO}} - {{CARGO_USUARIO}}</p><p><b>Para:</b> [Setor / Destinatário]</p><p><b>Data:</b> {{DATA_CURTA}}</p><p><b>Assunto:</b> [Assunto do Memorando]</p><hr><br><p style="text-align: justify; text-indent: 40px;">Comunico a Vossa Senhoria que [inserir o conteúdo do comunicado interno, solicitações ou informações de forma direta e objetiva].</p><p style="text-align: justify; text-indent: 40px;">Solicitamos que as devidas providências sejam adotadas com a maior brevidade possível, visando [justificativa ou objetivo do memorando].</p><br><p>Atenciosamente,</p><br>{{ASSINATURA}}' 
  },
  { 
    id: 'tpl3', 
    title: 'Portaria de Nomeação / Exoneração', 
    description: 'Minuta oficial para atos administrativos de pessoal (nomeação, exoneração, designação).', 
    category: 'RH', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-05-01', 
    content: '<h2 style="text-align: center;">PORTARIA Nº XXX, DE {{DATA_EXTENSO}}</h2><br><p style="text-align: justify;"><i>Dispõe sobre a [Nomeação/Exoneração/Designação] de servidor(a) que especifica e dá outras providências.</i></p><br><p style="text-align: justify;">O(A) <b>Prefeito(a) do Município de {{NOME_MUNICIPIO}}</b>, no uso das atribuições legais que lhe são conferidas pela Lei Orgânica do Município e legislação em vigor,</p><br><p style="text-align: center;"><b>RESOLVE:</b></p><br><p style="text-align: justify; text-indent: 40px;"><b>Art. 1º</b> Fica [nomeado(a)/exonerado(a)] o(a) Senhor(a) <b>[NOME COMPLETO DO SERVIDOR]</b>, portador(a) do CPF nº [000.000.000-00], para exercer o Cargo de Provimento em Comissão de [NOME DO CARGO], Símbolo [SÍMBOLO], lotado(a) na [NOME DA SECRETARIA].</p><p style="text-align: justify; text-indent: 40px;"><b>Art. 2º</b> As despesas decorrentes da execução desta Portaria correrão por conta de dotações orçamentárias próprias.</p><p style="text-align: justify; text-indent: 40px;"><b>Art. 3º</b> Esta Portaria entra em vigor na data de sua publicação, revogando-se as disposições em contrário.</p><br><p style="text-align: right;">Gabinete do Prefeito, {{DATA_EXTENSO}}.</p><br><br><br><p style="text-align: center;"><b>[NOME DO PREFEITO(A)]</b><br>Prefeito(a) Municipal</p>' 
  },
  { 
    id: 'tpl4', 
    title: 'Termo de Referência (Simplificado)', 
    description: 'Documento base para iniciar processo licitatório ou contratação direta.', 
    category: 'Licitações', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-02-15', 
    content: '<h2 style="text-align: center;">TERMO DE REFERÊNCIA</h2><br><h3>1. DO OBJETO</h3><p style="text-align: justify;">O presente Termo de Referência tem por objeto a contratação de empresa especializada para o fornecimento de [descrever o objeto principal], visando atender às necessidades da {{NOME_SECRETARIA}} do município de {{NOME_MUNICIPIO}}.</p><br><h3>2. DA JUSTIFICATIVA</h3><p style="text-align: justify;">A aquisição justifica-se pela necessidade contínua de [explicar o motivo e os benefícios da contratação para a administração pública e sociedade].</p><br><h3>3. DAS ESPECIFICAÇÕES TÉCNICAS</h3><table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;"><tbody><tr><td style="border: 1px solid #d4d4d8; padding: 0.75rem; font-weight: bold; background-color: #f3f4f6;">Item</td><td style="border: 1px solid #d4d4d8; padding: 0.75rem; font-weight: bold; background-color: #f3f4f6;">Descrição / Especificação do Produto ou Serviço</td><td style="border: 1px solid #d4d4d8; padding: 0.75rem; font-weight: bold; background-color: #f3f4f6;">Unid.</td><td style="border: 1px solid #d4d4d8; padding: 0.75rem; font-weight: bold; background-color: #f3f4f6;">Quant.</td></tr><tr><td style="border: 1px solid #d4d4d8; padding: 0.75rem;">1</td><td style="border: 1px solid #d4d4d8; padding: 0.75rem;">[Especificação completa]</td><td style="border: 1px solid #d4d4d8; padding: 0.75rem;">UND</td><td style="border: 1px solid #d4d4d8; padding: 0.75rem;">00</td></tr></tbody></table><br><h3>4. OBRIGAÇÕES DA CONTRATADA E DA CONTRATANTE</h3><p style="text-align: justify;">A Contratada compromete-se a entregar os itens no prazo máximo de X dias após a assinatura do termo. A Contratante fica responsável pelo acompanhamento e fiscalização.</p><br>{{ASSINATURA}}' 
  },
  { 
    id: 'tpl5', 
    title: 'Atestado de Lotação e Exercício', 
    description: 'Documento oficial do RH para atestar o vínculo e exercício atual do servidor.', 
    category: 'RH', 
    format: 'Editor Web', 
    fileUrl: '#', 
    updatedAt: '2026-03-20', 
    content: '<h2 style="text-align: center;">ATESTADO DE LOTAÇÃO E EXERCÍCIO</h2><br><br><p style="text-align: justify; text-indent: 40px; line-height: 2;">Atesto para os devidos fins e a quem possa interessar, que o(a) Sr(a). <b>[NOME DO SERVIDOR]</b>, inscrito(a) no CPF sob o nº <b>[000.000.000-00]</b>, matrícula nº <b>[0000]</b>, é servidor(a) público(a) municipal pertencente ao Quadro Pessoal desta Prefeitura, exercendo o cargo de <b>[CARGO DO SERVIDOR]</b>, com carga horária de [XX] horas semanais.</p><p style="text-align: justify; text-indent: 40px; line-height: 2;">Atesto ainda que o(a) referido(a) servidor(a) encontra-se atualmente lotado(a) e em pleno exercício de suas funções na <b>{{NOME_SECRETARIA}}</b>.</p><p style="text-align: justify; text-indent: 40px; line-height: 2;">Por ser verdade, firmo o presente atestado.</p><br><br><p style="text-align: right;">{{NOME_MUNICIPIO}}, {{DATA_EXTENSO}}.</p><br><br><br><br>{{ASSINATURA}}' 
  }
];

export const RADAR_DATA: PNTPCategory[] = [
  {
    category: 'Prioritários',
    score: 82,
    items: [
      { 
        name: 'Receitas', 
        status: 'compliant', 
        score: 100, 
        weight: 10,
        evidences: [
          { label: 'Portal da Transparência - Receitas 2024', type: 'URL', link: '#' },
          { label: 'Relatório Trimestral de Arrecadação', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Despesas', 
        status: 'compliant', 
        score: 95, 
        weight: 10,
        evidences: [
          { label: 'Empenhos e Liquidações em Tempo Real', type: 'URL', link: '#' },
          { label: 'Manual de Procedimentos de Despesa', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Licitações', 
        status: 'partial', 
        score: 60, 
        weight: 15,
        evidences: [
          { label: 'Editais Publicados - Primeiro Trimestre', type: 'URL', link: '#' },
          { label: 'Termos de Referência Padronizados', type: 'DOCX', link: '#' }
        ]
      },
      { 
        name: 'Contratos', 
        status: 'partial', 
        score: 70, 
        weight: 15,
        evidences: [
          { label: 'Relação de Contratos e Aditivos', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Folha de Pagamento', 
        status: 'compliant', 
        score: 85, 
        weight: 10,
        evidences: [
          { label: 'Tabela de Cargos e Salários Atualizada', type: 'PDF', link: '#' }
        ]
      },
    ]
  },
  {
    category: 'Essenciais',
    score: 75,
    items: [
      { 
        name: 'Obras Públicas', 
        status: 'non-compliant', 
        score: 20, 
        weight: 12,
        evidences: [
          { label: 'Plano de Obras 2024 (Incompleto)', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Diárias', 
        status: 'compliant', 
        score: 100, 
        weight: 8,
        evidences: [
          { label: 'Portal de Consultas de Diárias', type: 'URL', link: '#' }
        ]
      },
      { 
        name: 'Convênios', 
        status: 'partial', 
        score: 55, 
        weight: 10,
        evidences: [
          { label: 'SICONV - Acompanhamento Local', type: 'URL', link: '#' }
        ]
      },
      { 
        name: 'Relatórios Fiscais', 
        status: 'compliant', 
        score: 90, 
        weight: 10,
        evidences: [
          { label: 'RREO - 1º Bimestre Publicado', type: 'PDF', link: '#' }
        ]
      },
    ]
  },
  {
    category: 'Obrigatórios',
    score: 68,
    items: [
      { 
        name: 'Ouvidoria/e-SIC', 
        status: 'compliant', 
        score: 100, 
        weight: 8,
        evidences: [
          { label: 'Sistema Eletrônico do SIC', type: 'URL', link: '#' },
          { label: 'Relatórios Anuais de Pedidos', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Estrutura Organizacional', 
        status: 'compliant', 
        score: 80, 
        weight: 7,
        evidences: [
          { label: 'Organograma Municipal 2024', type: 'PDF', link: '#' }
        ]
      },
      { 
        name: 'Perguntas Frequentes', 
        status: 'non-compliant', 
        score: 0, 
        weight: 5,
        evidences: []
      },
    ]
  }
];
