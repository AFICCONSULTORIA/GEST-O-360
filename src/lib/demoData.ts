import { 
  CheckItem, OrderItem, DocumentRecord, PatrimonioItem, Contract, 
  MunicipalLaw, CompanyCertificates, MunicipalNews, EnvironmentalReport,
  AdminUser, Institution
} from '../types';

// ==========================================
// USUÁRIO & INSTITUIÇÃO DE DEMONSTRAÇÃO
// ==========================================

export const DEMO_USER: AdminUser = {
  id: 'demo-user-1',
  name: 'Gestor Municipal (Demonstração)',
  email: 'demo@gestao360.com.br',
  role: 'Super Admin',
  status: 'Ativo',
  lastLogin: 'Agora',
  permissions: [
    'home', 'mayor', 'controls', 'calendar', 'norms', 'risk', 'pntp',
    'protocol', 'contracts', 'education', 'orders', 'doc_numbers', 'reports',
    'certificates', 'laws', 'obras', 'administracao', 'financas', 'saude',
    'servicos_publicos', 'meio_ambiente', 'tributos', 'agricultura',
    'assistencia_social', 'esporte', 'planejamento', 'camara', 'noticias',
    'forms', 'communication', 'settings', 'support', 'patrimonio', 'templates'
  ] as any
};

export const DEMO_INSTITUTION: Institution = {
  id: 'inst_demo_360',
  name: 'Município Modelo de Demonstração',
  subdomain: 'demo',
  logo_url: '/brasao-municipio.png',
  theme_color: '#10b981'
};

// ==========================================
// 1. PATRIMÔNIO & FROTAS
// ==========================================

export const DEMO_PATRIMONIO: PatrimonioItem[] = [
  {
    id: 'pat-001',
    code: 'PAT-2026-001',
    itemType: 'Veículo',
    objectName: 'Ambulância UTI Móvel SAMU Mercedes Sprinter',
    location: 'Base Central do SAMU / Garagem Municipal',
    status: 'Servível',
    condition: 'Excelente',
    department: 'Secretaria Municipal de Saúde',
    year: 2025,
    plate: 'GOV-2A26',
    model: 'Mercedes-Benz Sprinter 416 Furgão',
    chassis: '9BM906633KP123456',
    renavam: '12345678901',
    fuelType: 'Diesel S10',
    color: 'Branco / Vermelho SAMU',
    powerCv: '163 cv',
    imageUrls: ['https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&q=80&w=800'],
    createdByName: 'Coordenadoria de Frotas'
  },
  {
    id: 'pat-002',
    code: 'PAT-2026-002',
    itemType: 'Veículo',
    objectName: 'Trator Agrícola 4x4 com Grade Aradora',
    location: 'Pátio da Secretaria de Agricultura',
    status: 'Servível',
    condition: 'Bom',
    department: 'Secretaria de Agricultura e Meio Ambiente',
    year: 2024,
    plate: 'AGR-4040',
    model: 'John Deere 6110M Cabinado',
    fuelType: 'Diesel',
    color: 'Verde / Amarelo',
    powerCv: '110 cv',
    imageUrls: ['https://images.unsplash.com/photo-1530267981375-f0de937f5f13?auto=format&fit=crop&q=80&w=800'],
    createdByName: 'Patrulha Mecanizada Rural'
  },
  {
    id: 'pat-003',
    code: 'PAT-2026-003',
    itemType: 'Veículo',
    objectName: 'Micro-ônibus Escolar Acessível (Caminho da Escola)',
    location: 'Garagem da Educação',
    status: 'Servível',
    condition: 'Excelente',
    department: 'Secretaria Municipal de Educação',
    year: 2024,
    plate: 'ESC-2026',
    model: 'Volare V8L 4x4 Escolarbus',
    fuelType: 'Diesel',
    color: 'Amarelo Escolar',
    powerCv: '152 cv',
    imageUrls: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800'],
    createdByName: 'Transporte Escolar'
  },
  {
    id: 'pat-004',
    code: 'PAT-2026-004',
    itemType: 'Geral',
    objectName: 'Estação de Trabalho Dell OptiPlex Core i7 32GB',
    location: 'Setor de Contabilidade e Empenhos',
    status: 'Servível',
    condition: 'Excelente',
    department: 'Secretaria de Administração e Finanças',
    year: 2025,
    model: 'OptiPlex 7010 Micro',
    createdByName: 'Departamento de TI'
  },
  {
    id: 'pat-005',
    code: 'PAT-2026-005',
    itemType: 'Geral',
    objectName: 'Sistema de Ultrassonografia Digital Diagnóstica',
    location: 'Centro de Especialidades Médicas (CEM)',
    status: 'Servível',
    condition: 'Excelente',
    department: 'Secretaria Municipal de Saúde',
    year: 2024,
    model: 'GE Healthcare Voluson E8',
    createdByName: 'Engenharia Clínica'
  },
  {
    id: 'pat-006',
    code: 'PAT-2026-006',
    itemType: 'Veículo',
    objectName: 'Motoniveladora Patrol Hidráulica Pesada',
    location: 'Usina de Asfalto e Obras',
    status: 'Servível',
    condition: 'Bom',
    department: 'Secretaria de Viação e Obras',
    year: 2023,
    plate: 'OBR-7788',
    model: 'Caterpillar 120K',
    fuelType: 'Diesel S10',
    color: 'Amarelo',
    powerCv: '145 cv',
    imageUrls: ['https://images.unsplash.com/photo-1579273166152-d725a4e2b755?auto=format&fit=crop&q=80&w=800'],
    createdByName: 'Diretoria de Obras'
  }
];

// ==========================================
// 2. PEDIDOS (OBRAS, VEÍCULOS & MERENDA)
// ==========================================

export const DEMO_ORDERS: OrderItem[] = [
  {
    id: 'ord-001',
    type: 'obras_abrange',
    description: 'Aquisição de 450 toneladas de CBUQ faixa C para pavimentação asfáltica do Bairro São José',
    requester: 'Eng. Roberto Alcantara (Obras)',
    dateRequested: '2026-08-15',
    quotationNumber: 'COT-2026-0182',
    winningSupplier: 'Pavimax Asfaltos e Engenharia Ltda',
    status: 'concluido'
  },
  {
    id: 'ord-002',
    type: 'veiculos_gtf',
    description: 'Revisão preventiva de 20.000 km, troca de correias, pastilhas e filtros da Van Renault Master Placa GOV-2A26',
    requester: 'Coord. Silvana - Transporte Saúde',
    dateRequested: '2026-09-02',
    quotationNumber: 'COT-2026-0195',
    winningSupplier: 'Auto Mecânica e Peças Central',
    status: 'em_cotacao'
  },
  {
    id: 'ord-003',
    type: 'obras_abrange',
    description: 'Fornecimento parcelado de gêneros alimentícios frescos da agricultura familiar para merenda escolar das creches municipais',
    requester: 'Nutricionista Camila Santos (Educação)',
    dateRequested: '2026-08-28',
    quotationNumber: 'COT-2026-0188',
    winningSupplier: 'Cooperativa Agrícola dos Produtores Rurais',
    status: 'concluido'
  },
  {
    id: 'ord-004',
    type: 'obras_abrange',
    description: 'Medicamentos essenciais da farmácia básica: Losartana 50mg, Dipirona 500mg, Amoxicilina 500mg (Lote Emergencial Trimestral)',
    requester: 'Dr. Lucas Silveira (Farmácia Básica)',
    dateRequested: '2026-09-10',
    quotationNumber: 'COT-2026-0204',
    winningSupplier: 'Distribuidora Farmacêutica Nacional S/A',
    status: 'em_cotacao'
  }
];

// ==========================================
// 3. CONTROLES INTERNOS (COMPLIANCE MUNICIPAL)
// ==========================================

export const DEMO_CONTROLS: CheckItem[] = [
  {
    id: 'ctrl-001',
    task: 'Auditoria Mensal da Folha de Pagamento vs e-Social',
    status: 'completed',
    department: 'RH e Controladoria',
    deadline: '2026-09-05',
    notes: 'Batimento de 100% dos servidores ativos, comissionados e contratados sem inconsistências cadastrais ou acúmulo ilícito.',
    history: [
      { id: 'h1', user: 'Controlador Geral', date: '01/09/2026 09:00', action: 'Criação', changes: 'Auditoria bimestral aberta.' },
      { id: 'h2', user: 'Ana Paula (RH)', date: '04/09/2026 14:30', action: 'Conferência', changes: 'Relatório cruzado validado no sistema da folha.' },
      { id: 'h3', user: 'Controlador Geral', date: '05/09/2026 16:45', action: 'Finalização', changes: 'Aprovado sem ressalvas.' }
    ]
  },
  {
    id: 'ctrl-002',
    task: 'Prestação de Contas Mensal no Sistema de Auditoria do TCE',
    status: 'urgent',
    department: 'Contabilidade e Finanças',
    deadline: '2026-09-30',
    notes: 'Prazo fatal de envio da remessa mensal contábil e extratos bancários conciliados.',
    history: [
      { id: 'h4', user: 'Contador Geral', date: '10/09/2026 11:15', action: 'Criação', changes: 'Remessa gerada no formato AUDESP/TCE.' }
    ]
  },
  {
    id: 'ctrl-003',
    task: 'Fiscalização de Frotas e Diários de Bordo Digital (Consumo Km/Litro)',
    status: 'pending',
    department: 'Transportes e Logística',
    deadline: '2026-10-05',
    notes: 'Conferência dos checklists dos veículos de saúde e obras para apuração de média de combustível.',
    history: [
      { id: 'h5', user: 'Fiscal de Frotas', date: '15/09/2026 08:30', action: 'Criação', changes: 'Auditoria de quilometragem iniciada.' }
    ]
  },
  {
    id: 'ctrl-004',
    task: 'Inventário Físico do Almoxarifado Central e Merenda Escolar',
    status: 'pending',
    department: 'Administração',
    deadline: '2026-10-10',
    notes: 'Contagem rotativa trimestral de materiais de consumo e alimentos armazenados.'
  },
  {
    id: 'ctrl-005',
    task: 'Alimentação Regular de Evidências no Radar da Transparência PNTP',
    status: 'completed',
    department: 'Ouvidoria e Transparência',
    deadline: '2026-09-15',
    notes: 'Atualização dos links de contratos, licitações e receitas do exercício 2026 atingindo 94% de conformidade.'
  }
];

// ==========================================
// 4. PROTOCOLO DIGITAL
// ==========================================

export const DEMO_PROTOCOLS = [
  {
    id: 'prt-001',
    subject: 'Solicitação de Alvará Sanitário e Licença de Funcionamento - Panificadora Pão Dourado',
    type: 'Alvará & Tributos',
    from: 'Marcos Vinicius Pereira (Proprietário)',
    to: 'Vigilância Sanitária / Tributos',
    status: 'Em Análise',
    date: '2026-09-18',
    department: 'Saúde / Vigilância',
    description: 'Requerimento formal com anexos de memorial descritivo, ART e planta baixa do estabelecimento comercial.',
    protocol_number: 'PROT-2026/0489',
    history: [
      { date: '18/09/2026 09:12', user: 'Atendimento ao Cidadão', action: 'Protocolo gerado e taxa GRU quitada.' },
      { date: '19/09/2026 14:00', user: 'Fiscal Sanitário', action: 'Vistoria presencial agendada para 25/09.' }
    ]
  },
  {
    id: 'prt-002',
    subject: 'Requerimento de Certidão Negativa de Débitos de Imóvel Urbano (CND IPTU)',
    type: 'Certidões',
    from: 'Mariana Duarte Souza',
    to: 'Secretaria de Administração e Finanças',
    status: 'Concluído',
    date: '2026-09-20',
    department: 'Tributação',
    description: 'Pedido de certidão do imóvel inscrição cadastral 01.04.120.0034 para fins de inventário e escritura.',
    protocol_number: 'PROT-2026/0490'
  },
  {
    id: 'prt-003',
    subject: 'Solicitação de Instalação de Braço de Iluminação LED e Quebra-molas na Rua das Palmeiras',
    type: 'Serviços Públicos',
    from: 'Associação de Moradores do Bairro Primavera',
    to: 'Secretaria de Viação e Obras',
    status: 'Em Andamento',
    date: '2026-09-15',
    department: 'Obras Públicas',
    description: 'Abaixo-assinado com 42 assinaturas solicitando melhoria na segurança viária próxima à escola infantil.',
    protocol_number: 'PROT-2026/0485'
  }
];

// ==========================================
// 5. CONTRATOS & LICITAÇÕES (LEI 14.133/21)
// ==========================================

export const DEMO_CONTRACTS: Contract[] = [
  {
    id: 'cnt-001',
    number: '018/2026',
    object: 'Fornecimento contínuo de gêneros alimentícios perecíveis e não perecíveis para a alimentação escolar da rede municipal',
    vendorName: 'Distribuidora São Paulo de Alimentos Ltda',
    amount: 890000.00,
    category: 'Licitação',
    status: 'active',
    deadline: '2026-12-31'
  },
  {
    id: 'cnt-002',
    number: '022/2026',
    object: 'Contratação de empresa especializada em engenharia para execução de obras de pavimentação asfáltica em CBUQ e drenagem pluvial',
    vendorName: 'Pavimax Asfaltos e Engenharia Ltda',
    amount: 2450000.00,
    category: 'Licitação',
    status: 'active',
    deadline: '2027-04-15'
  },
  {
    id: 'cnt-003',
    number: '007/2026-D',
    object: 'Prestação de serviços contínuos de suporte técnico, manutenção preventiva e corretiva da frota de ambulâncias e viaturas',
    vendorName: 'Auto Mecânica e Peças Central Ltda',
    amount: 145000.00,
    category: 'Dispensa',
    status: 'active',
    deadline: '2026-11-20'
  },
  {
    id: 'cnt-004',
    number: '012/2025',
    object: 'Locação de licença de uso de software de gestão pública municipal integrada (SaaS Gestão 360)',
    vendorName: 'TechGov Tecnologia e Inovação Pública S/A',
    amount: 180000.00,
    category: 'Inexigibilidade',
    status: 'active',
    deadline: '2027-01-10'
  },
  {
    id: 'cnt-005',
    number: '031/2025',
    object: 'Serviços de transporte escolar rural de alunos do ensino fundamental e médio em estradas vicinais',
    vendorName: 'Expresso Vale dos Rios Transportes Eireli',
    amount: 420000.00,
    category: 'Licitação',
    status: 'risk',
    deadline: '2026-10-15'
  }
];

// ==========================================
// 6. SAÚDE PÚBLICA & FARMÁCIA MUNICIPAL
// ==========================================

export const DEMO_PATIENTS = [
  {
    id: 'pat-1',
    name: 'Maria Antonieta Silva',
    cpf: '111.111.111-11',
    sus_number: '700101234567890',
    birth_date: '1985-04-12',
    gender: 'F',
    mother_name: 'Ana Maria Silva',
    phone: '(11) 99999-9999',
    address: 'Rua das Palmeiras, 120',
    neighborhood: 'Centro',
    ubs_reference: 'UBS Central Dr. Arnaldo',
    blood_type: 'O+',
    conditions: 'Hipertensão Arterial, Diabetes Mellitus Tipo 2',
    is_pregnant: false,
    is_pcd: false
  },
  {
    id: 'pat-2',
    name: 'José Ferreira dos Santos',
    cpf: '222.222.222-22',
    sus_number: '700201987654321',
    birth_date: '1962-11-20',
    gender: 'M',
    mother_name: 'Francisca Ferreira',
    phone: '(11) 98888-8888',
    address: 'Av. Brasil, 450',
    neighborhood: 'Bairro São José',
    ubs_reference: 'UBS Bairro São José',
    blood_type: 'A+',
    conditions: 'Cardiopatia Crônica, Hipertensão Arterial',
    is_pregnant: false,
    is_pcd: false
  },
  {
    id: 'pat-3',
    name: 'Luciana Camargo de Oliveira',
    cpf: '333.333.333-33',
    sus_number: '700301456789123',
    birth_date: '1998-07-03',
    gender: 'F',
    mother_name: 'Roseli Camargo',
    phone: '(11) 97777-6655',
    address: 'Rua São Paulo, 78',
    neighborhood: 'Vila Esperança',
    ubs_reference: 'UBS Central Dr. Arnaldo',
    blood_type: 'B+',
    conditions: 'Gestante de Alto Risco (28 semanas)',
    is_pregnant: true,
    is_pcd: false
  }
];

const today = new Date().toISOString().split('T')[0];

export const DEMO_APPOINTMENTS = [
  {
    id: 'apt-001',
    appointment_date: today,
    appointment_time: '08:30',
    patient_name: 'Maria Antonieta Silva',
    patient_phone: '11999999999',
    patient_cpf: '111.111.111-11',
    patient_sus: '700101234567890',
    patient_birth_date: '1985-04-12',
    is_pregnant: false,
    is_urgent: false,
    specialty: 'Clínico Geral',
    status: 'Atendido',
    unit_name: 'UBS Central Dr. Arnaldo',
    doctor_name: 'Dr. Lucas Silveira'
  },
  {
    id: 'apt-002',
    appointment_date: today,
    appointment_time: '10:00',
    patient_name: 'José Ferreira dos Santos',
    patient_phone: '11888888888',
    patient_cpf: '222.222.222-22',
    patient_sus: '700201987654321',
    patient_birth_date: '1962-11-20',
    is_pregnant: false,
    is_urgent: false,
    specialty: 'Cardiologia',
    status: 'Agendado',
    unit_name: 'Centro de Especialidades Médicas (CEM)',
    doctor_name: 'Dra. Beatriz Santos'
  },
  {
    id: 'apt-003',
    appointment_date: today,
    appointment_time: '14:00',
    patient_name: 'Luciana Camargo de Oliveira',
    patient_phone: '11977776655',
    patient_cpf: '333.333.333-33',
    patient_sus: '700301456789123',
    patient_birth_date: '1998-07-03',
    is_pregnant: true,
    is_urgent: true,
    specialty: 'Ginecologia e Obstetrícia',
    status: 'Agendado',
    unit_name: 'UBS Central Dr. Arnaldo',
    doctor_name: 'Dra. Mariana Fontana'
  }
];

export const DEMO_MEDICATIONS = [
  {
    id: 'med-001',
    name: 'Losartana Potássica 50mg',
    active_ingredient: 'Losartana Potássica',
    dosage: '50mg',
    form: 'Comprimido',
    batch_number: 'LT-LOS2026A',
    expiration_date: '2027-06-30',
    quantity: 4200
  },
  {
    id: 'med-002',
    name: 'Dipirona Monoidratada 500mg',
    active_ingredient: 'Dipirona Sódica',
    dosage: '500mg',
    form: 'Comprimido',
    batch_number: 'LT-DIP2026B',
    expiration_date: '2027-02-15',
    quantity: 5800
  },
  {
    id: 'med-003',
    name: 'Amoxicilina 500mg',
    active_ingredient: 'Amoxicilina Tri-hidratada',
    dosage: '500mg',
    form: 'Cápsula',
    batch_number: 'LT-AMX2026C',
    expiration_date: '2026-11-30',
    quantity: 1250
  },
  {
    id: 'med-004',
    name: 'Omeprazol 20mg',
    active_ingredient: 'Omeprazol',
    dosage: '20mg',
    form: 'Cápsula',
    batch_number: 'LT-OME2026D',
    expiration_date: '2027-08-20',
    quantity: 3100
  },
  {
    id: 'med-005',
    name: 'Metformina 850mg',
    active_ingredient: 'Cloridrato de Metformina',
    dosage: '850mg',
    form: 'Comprimido',
    batch_number: 'LT-MET2026E',
    expiration_date: '2027-04-10',
    quantity: 2900
  }
];

export const DEMO_EXAMS = [
  {
    id: 'ex-001',
    patient_name: 'Maria Antonieta Silva',
    patient_cpf: '111.111.111-11',
    patient_sus: '700101234567890',
    patient_phone: '11999999999',
    patient_birth_date: '1985-04-12',
    exam_name: 'Hemograma Completo',
    category: 'Laboratorial',
    doctor_name: 'Dr. Lucas Silveira',
    doctor_crm: 'CRM 45890/SP',
    requesting_unit: 'UBS Central Dr. Arnaldo',
    executing_unit: 'Laboratório Central Municipal',
    requested_date: '2026-09-12',
    performed_date: '2026-09-14',
    status: 'Realizado',
    clinical_indication: 'Rotina de controle de diabetes e hipertensão.',
    result_notes: 'Hemoglobina 13.5 g/dL, Leucócitos 6.200/mm³, Plaquetas 240.000/mm³. Valores dentro dos limites de normalidade.'
  },
  {
    id: 'ex-002',
    patient_name: 'José Ferreira dos Santos',
    patient_cpf: '222.222.222-22',
    patient_sus: '700201987654321',
    patient_phone: '11888888888',
    patient_birth_date: '1962-11-20',
    exam_name: 'Eletrocardiograma (ECG)',
    category: 'Cardiológico',
    doctor_name: 'Dra. Beatriz Santos',
    doctor_crm: 'CRM 33211/SP',
    requesting_unit: 'Centro de Especialidades Médicas (CEM)',
    executing_unit: 'Policlínica Municipal',
    requested_date: today,
    scheduled_date: today,
    status: 'Agendado',
    clinical_indication: 'Avaliação cardiológica de rotina em paciente com histórico de hipertensão.'
  }
];

// ==========================================
// 7. CÂMARA MUNICIPAL 360 (LEGISLATIVO)
// ==========================================

export const DEMO_VEREADORES = [
  {
    id: 'ver-1',
    nome: 'Carlos Eduardo Nogueira',
    nome_parlamentar: 'Dr. Carlos Nogueira',
    partido: 'PSD',
    numero_urna: '55123',
    cargo_mesa: 'Presidente',
    bancada: 'Bancada do Desenvolvimento',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    email: 'presidente@camara.gov.br',
    telefone: '(11) 98765-4321',
    gabinete: 'Gabinete da Presidência',
    biografia: 'Advogado, especialista em Direito Público e Gestão Municipal. 3º mandato parlamentar.',
    mandato_inicio: '2025-01-01',
    mandato_fim: '2028-12-31',
    ativo: true,
    estatisticas: {
      pls_apresentados: 18,
      indicacoes_protocoladas: 42,
      presenca_percent: 100,
      verba_gabinete_utilizada: 4200.00
    }
  },
  {
    id: 'ver-2',
    nome: 'Maria Aparecida Silveira',
    nome_parlamentar: 'Professora Cida',
    partido: 'MDB',
    numero_urna: '15456',
    cargo_mesa: 'Vice-Presidente',
    bancada: 'Bancada da Educação e Saúde',
    foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    email: 'profcida@camara.gov.br',
    telefone: '(11) 98111-2233',
    gabinete: 'Gabinete 04',
    biografia: 'Pedagoga e defensora da valorização do magistério e da primeira infância.',
    mandato_inicio: '2025-01-01',
    mandato_fim: '2028-12-31',
    ativo: true,
    estatisticas: {
      pls_apresentados: 14,
      indicacoes_protocoladas: 38,
      presenca_percent: 96,
      verba_gabinete_utilizada: 3800.00
    }
  },
  {
    id: 'ver-3',
    nome: 'Antônio Marcos Andrade',
    nome_parlamentar: 'Sargento Andrade',
    partido: 'PL',
    numero_urna: '22000',
    cargo_mesa: '1º Secretário',
    bancada: 'Bancada da Segurança e Ordem Pública',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    email: 'sgtandrade@camara.gov.br',
    telefone: '(11) 98222-3344',
    gabinete: 'Gabinete 02',
    biografia: 'Militar da reserva, com foco em segurança comunitária, iluminação e patrulha escolar.',
    mandato_inicio: '2025-01-01',
    mandato_fim: '2028-12-31',
    ativo: true,
    estatisticas: {
      pls_apresentados: 11,
      indicacoes_protocoladas: 29,
      presenca_percent: 92,
      verba_gabinete_utilizada: 3100.00
    }
  }
];

export const DEMO_MATERIAS = [
  {
    id: 'mat-001',
    tipo: 'Projeto de Lei Ordinária',
    numero: 'PL 014/2026',
    ano: 2026,
    autor: 'Professora Cida',
    ementa: 'Institui o Programa Municipal "Educação Conectada" com fornecimento gratuito de internet e laboratórios de robótica para escolas municipais.',
    status: 'Em Tramitação',
    data_apresentacao: '2026-08-10',
    urgencia: false,
    regime: 'Ordinário',
    fase_atual: 'Comissão de Educação e Saúde',
    autores: ['Professora Cida', 'Dr. Carlos Nogueira']
  },
  {
    id: 'mat-002',
    tipo: 'Projeto de Lei Complementar',
    numero: 'PLC 003/2026',
    ano: 2026,
    autor: 'Poder Executivo Municipal',
    ementa: 'Dispõe sobre o incentivo fiscal com redução de alíquota do ISSQN para empresas de base tecnológica, startups e inovação.',
    status: 'Aprovado',
    data_apresentacao: '2026-06-15',
    urgencia: true,
    regime: 'Urgência Especial',
    fase_atual: 'Aprovado em 2º Turno - Autógrafo Enviado',
    autores: ['Poder Executivo Municipal']
  }
];

// ==========================================
// 8. NOTÍCIAS & PROJETOS MUNICIPAIS
// ==========================================

export const DEMO_NEWS: MunicipalNews[] = [
  {
    id: 'news-demo-1',
    title: 'Prefeitura entrega modernização completa da Unidade Básica Central de Saúde com novos consultórios',
    slug: 'prefeitura-entrega-modernizacao-unidade-central-saude',
    subtitle: 'Com investimento de R$ 1,8 milhão, espaço amplia capacidade em 40% e passa a oferecer exames digitais e telemedicina.',
    content: `A administração municipal realizou a entrega oficial das obras de reforma, ampliação e modernização estrutural da Unidade Básica Central de Saúde. 

O projeto contou com a reestruturação completa de consultórios médicos e odontológicos, implantação de sala climatizada de vacinas e nova ala para exames diagnósticos com prontuário eletrônico unificado.`,
    category: 'Saúde',
    department: 'Secretaria Municipal de Saúde',
    cover_image_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [
      'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80'
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
    id: 'news-demo-2',
    title: 'Programa Pavimenta Mais conclui asfaltamento e drenagem pluvial em 25 ruas do município',
    slug: 'programa-pavimenta-mais-conclui-asfalto-drenagem',
    subtitle: 'Pacote de infraestrutura transforma a mobilidade urbana com calçadas acessíveis e iluminação 100% LED.',
    content: `As equipes da Secretaria Municipal de Viação e Obras concluíram mais uma etapa estratégica do programa Pavimenta Mais. As intervenções resolveram problemas históricos de alagamentos e atoleiros nos períodos chuvosos.`,
    category: 'Obras & Infraestrutura',
    department: 'Secretaria de Viação e Obras',
    cover_image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [],
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
    id: 'news-demo-3',
    title: 'Educação 360: todas as escolas da rede municipal recebem Laboratórios de Robótica e Chromebooks',
    slug: 'educacao-360-laboratorios-robotica-chromebooks',
    subtitle: 'Tecnologia educacional, internet fibra óptica e formação continuada para mais de 3.500 estudantes.',
    content: `A Secretaria de Educação equipou todas as turmas de Ensino Fundamental com estações móveis de informática e kits inovadores de robótica educacional para estimular o aprendizado científico das crianças.`,
    category: 'Educação',
    department: 'Secretaria Municipal de Educação',
    cover_image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
    gallery_urls: [],
    is_featured: true,
    badge: 'Novo Projeto',
    project_status: 'Em Execução',
    project_budget: 720000,
    status: 'published',
    author_name: 'Secretaria de Educação',
    published_at: '2026-08-24T09:15:00Z',
    views_count: 1150
  }
];

// ==========================================
// 9. CERTIDÕES DE FORNECEDORES
// ==========================================

export const DEMO_COMPANIES: CompanyCertificates[] = [
  {
    id: 'comp-001',
    companyName: 'Construtora e Pavimentadora Alfa Ltda',
    cnpj: '12.345.678/0001-90',
    certificates: {
      Trabalhista: { issueDate: '2026-01-15', expiryDate: '2026-12-31' },
      Federal: { issueDate: '2026-02-10', expiryDate: '2026-11-20' },
      Estadual: { issueDate: '2026-03-20', expiryDate: '2026-12-15' },
      Municipal: { issueDate: '2026-01-20', expiryDate: '2026-12-31' },
      FGTS: { issueDate: '2026-08-18', expiryDate: '2026-10-18' }
    }
  },
  {
    id: 'comp-002',
    companyName: 'Tecnologias Silva e Sistemas Gov S/A',
    cnpj: '98.765.432/0001-10',
    certificates: {
      Trabalhista: { issueDate: '2026-04-10', expiryDate: '2026-10-10' },
      Federal: { issueDate: '2026-05-15', expiryDate: '2026-11-15' },
      Estadual: { issueDate: '2026-05-16', expiryDate: '2026-11-16' },
      Municipal: { issueDate: '2026-05-17', expiryDate: '2026-11-17' },
      FGTS: { issueDate: '2026-08-18', expiryDate: '2026-09-18' }
    }
  },
  {
    id: 'comp-003',
    companyName: 'Distribuidora Farmacêutica Nacional Ltda',
    cnpj: '55.666.777/0001-22',
    certificates: {
      Trabalhista: { issueDate: '2026-03-10', expiryDate: '2026-12-10' },
      Federal: { issueDate: '2026-03-15', expiryDate: '2026-12-15' },
      Estadual: { issueDate: '2026-03-16', expiryDate: '2026-12-16' },
      Municipal: { issueDate: '2026-03-17', expiryDate: '2026-12-17' },
      FGTS: { issueDate: '2026-08-20', expiryDate: '2026-10-20' }
    }
  }
];

// ==========================================
// 10. SERVIÇOS PÚBLICOS (DEMANDAS DA CIDADE)
// ==========================================

export const DEMO_DEMANDAS = [
  {
    id: 'sp-001',
    protocolo: 'SP-2026-0101',
    categoria: 'Iluminação',
    descricao: 'Lâmpada do poste de iluminação pública queimada, gerando escuridão na esquina da escola.',
    endereco: 'Rua das Flores, altura do nº 140 - Bairro Centro',
    solicitante: 'Maria José dos Santos',
    telefone: '(11) 98765-4321',
    status: 'Aberto',
    data_solicitacao: '20/09/2026'
  },
  {
    id: 'sp-002',
    protocolo: 'SP-2026-0102',
    categoria: 'Tapa buraco',
    descricao: 'Buraco de grande profundidade aberto no asfalto após fortes chuvas, danificando veículos.',
    endereco: 'Av. Brasil, próximo ao nº 850 - Bairro São José',
    solicitante: 'Carlos Eduardo Mendes',
    telefone: '(11) 99888-7766',
    status: 'Em Andamento',
    data_solicitacao: '18/09/2026'
  },
  {
    id: 'sp-003',
    protocolo: 'SP-2026-0103',
    categoria: 'Poda de Árvore',
    descricao: 'Galhos de árvore de grande porte encostando na fiação elétrica de alta tensão.',
    endereco: 'Rua São Paulo, nº 45 - Vila Esperança',
    solicitante: 'Roberto Almeida',
    telefone: '(11) 97777-1234',
    status: 'Concluído',
    data_solicitacao: '15/09/2026'
  },
  {
    id: 'sp-004',
    protocolo: 'SP-2026-0104',
    categoria: 'Remoção de Entulho',
    descricao: 'Descarte irregular de entulho e galhadas na calçada pública obstruindo a passagem de pedestres.',
    endereco: 'Rua 7 de Setembro, esquina com Rua Amazonas',
    solicitante: 'Luciana Ferreira',
    telefone: '(11) 99123-4567',
    status: 'Aberto',
    data_solicitacao: '21/09/2026'
  }
];

// ==========================================
// 11. MEIO AMBIENTE & FISCALIZAÇÃO
// ==========================================

export const DEMO_ENVIRONMENTAL_REPORTS: EnvironmentalReport[] = [
  {
    id: 'amb-001',
    protocolo: 'AMB-2026-0045',
    description: 'Fumaça densa e queima irregular de resíduos e lixo em terreno baldio próximo à creche municipal.',
    location: 'Rua dos Jacarandás, lote 12, Bairro Jardim Primavera',
    referencePoint: 'Atrás do CMEI Pequeno Aprendiz',
    isAnonymous: false,
    reporterName: 'Cláudia Regina de Barros',
    reporterContact: '(11) 98765-1122',
    status: 'Pendente',
    dateReported: new Date().toISOString()
  },
  {
    id: 'amb-002',
    protocolo: 'AMB-2026-0046',
    description: 'Despejo de resíduos da construção civil em área de preservação permanente (APP) às margens do Córrego das Pedras.',
    location: 'Estrada Municipal KM 4, próximo à ponte de concreto',
    isAnonymous: true,
    status: 'Em Análise',
    dateReported: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'amb-003',
    protocolo: 'AMB-2026-0047',
    description: 'Corte e erradicação de duas árvores nativas sem autorização prévia da Secretaria de Meio Ambiente.',
    location: 'Av. Governador Valadares, 310, Centro',
    isAnonymous: false,
    reporterName: 'Fernando Henrique Dias',
    status: 'Resolvido',
    dateReported: new Date(Date.now() - 172800000).toISOString()
  }
];

// ==========================================
// 12. CONTROLE DE NUMERAÇÃO OFICIAL
// ==========================================

export const DEMO_DOC_RECORDS: DocumentRecord[] = [
  {
    id: 'doc-001',
    type: 'Ofício',
    number: 142,
    year: 2026,
    requester: 'Gabinete do Prefeito',
    subject: 'Solicitação de audiência com o Governador do Estado para tratar de recursos de infraestrutura hídrica',
    dateCreated: '2026-09-15'
  },
  {
    id: 'doc-002',
    type: 'Decreto',
    number: 48,
    year: 2026,
    requester: 'Procuradoria Geral do Município',
    subject: 'Regulamenta o Programa de Governança Digital e Modernização dos Serviços Públicos Municipais',
    dateCreated: '2026-09-10'
  },
  {
    id: 'doc-003',
    type: 'Portaria',
    number: 112,
    year: 2026,
    requester: 'Secretaria de Administração',
    subject: 'Designa servidores para a Comissão Especial do Radar PNTP e Transparência Governamental',
    dateCreated: '2026-09-08'
  },
  {
    id: 'doc-004',
    type: 'Memorando',
    number: 215,
    year: 2026,
    requester: 'Secretaria de Educação',
    subject: 'Cronograma oficial de entrega dos uniformes escolares e kits de robótica nas unidades de ensino',
    dateCreated: '2026-09-02'
  }
];
