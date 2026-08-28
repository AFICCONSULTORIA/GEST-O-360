import { supabase } from '../../../lib/supabase';
import { 
  Vereador, MateriaLegislativa, Comissao, SessaoPlenaria, 
  Votacao, Indicacao, SugestaoPopular, CriterioPNTPCamara,
  Tramitacao, Parecer
} from '../types';

// ==========================================
// DADOS MOCK INICIAIS ULTRA REALISTAS E RICOS
// ==========================================

export const INITIAL_VEREADORES: Vereador[] = [
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
    nome: 'Roberto Santos Lima',
    nome_parlamentar: 'Beto Santos',
    partido: 'PL',
    numero_urna: '22000',
    cargo_mesa: '1º Secretário',
    bancada: 'Bancada Comercial',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    email: 'betosantos@camara.gov.br',
    telefone: '(11) 97654-3210',
    gabinete: 'Gabinete 02',
    biografia: 'Comerciante e líder comunitário da Zona Leste. Foco em geração de empregos.',
    mandato_inicio: '2025-01-01',
    mandato_fim: '2028-12-31',
    ativo: true,
    estatisticas: {
      pls_apresentados: 9,
      indicacoes_protocoladas: 56,
      presenca_percent: 92,
      verba_gabinete_utilizada: 5100.00
    }
  },
  {
    id: 'ver-4',
    nome: 'Juliana Mendes Rocha',
    nome_parlamentar: 'Dra. Juliana Rocha',
    partido: 'UNIÃO',
    numero_urna: '44555',
    cargo_mesa: '2º Secretário',
    bancada: 'Bancada Independente',
    foto_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=300',
    email: 'juliana.rocha@camara.gov.br',
    telefone: '(11) 99887-6655',
    gabinete: 'Gabinete 07',
    biografia: 'Médica sanitarista, atuante na fiscalização de postos de saúde e UPAs.',
    mandato_inicio: '2025-01-01',
    mandato_fim: '2028-12-31',
    ativo: true,
    estatisticas: {
      pls_apresentados: 12,
      indicacoes_protocoladas: 29,
      presenca_percent: 98,
      verba_gabinete_utilizada: 2900.00
    }
  },
  {
    id: 'ver-5',
    nome: 'Marcos Vinícius de Andrade',
    nome_parlamentar: 'Marquinhos da Zona Rural',
    partido: 'PP',
    numero_urna: '11111',
    cargo_mesa: 'Líder de Bancada',
    bancada: 'Bancada Ruralista e Meio Ambiente',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
    email: 'marquinhos@camara.gov.br',
    telefone: '(11) 97412-5896',
    gabinete: 'Gabinete 05',
    biografia: 'Agricultor familiar e defensor de estradas vicinais e eletrificação rural.',
    mandato_inicio: '2025-01-01',
    mandato_fim: '2028-12-31',
    ativo: true,
    estatisticas: {
      pls_apresentados: 8,
      indicacoes_protocoladas: 64,
      presenca_percent: 88,
      verba_gabinete_utilizada: 4600.00
    }
  },
  {
    id: 'ver-6',
    nome: 'Fernando Alencar Filho',
    nome_parlamentar: 'Pastor Fernando',
    partido: 'REPUBLICANOS',
    numero_urna: '10777',
    cargo_mesa: 'Vereador(a)',
    bancada: 'Bancada Social',
    foto_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300',
    email: 'pastorfernando@camara.gov.br',
    telefone: '(11) 98523-6987',
    gabinete: 'Gabinete 03',
    biografia: 'Líder religioso e comunitário com trabalho em recuperação de dependentes químicos.',
    mandato_inicio: '2025-01-01',
    mandato_fim: '2028-12-31',
    ativo: true,
    estatisticas: {
      pls_apresentados: 6,
      indicacoes_protocoladas: 31,
      presenca_percent: 95,
      verba_gabinete_utilizada: 3100.00
    }
  },
  {
    id: 'ver-7',
    nome: 'Ana Carolina Bastos',
    nome_parlamentar: 'Carol Bastos',
    partido: 'PSOL',
    numero_urna: '50123',
    cargo_mesa: 'Líder de Bancada',
    bancada: 'Bancada dos Direitos Humanos',
    foto_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
    email: 'carolbastos@camara.gov.br',
    telefone: '(11) 99123-4567',
    gabinete: 'Gabinete 09',
    biografia: 'Assistente social e ativista da causa animal e direitos das mulheres.',
    mandato_inicio: '2025-01-01',
    mandato_fim: '2028-12-31',
    ativo: true,
    estatisticas: {
      pls_apresentados: 16,
      indicacoes_protocoladas: 22,
      presenca_percent: 100,
      verba_gabinete_utilizada: 1950.00
    }
  }
];

export const INITIAL_COMISSOES: Comissao[] = [
  {
    id: 'com-ccj',
    nome: 'Comissão de Constituição, Justiça e Redação',
    sigla: 'CCJR',
    tipo: 'Permanente',
    descricao: 'Analisa a constitucionalidade, legalidade, juridicidade e técnica legislativa de todas as proposições.',
    presidente_id: 'ver-1',
    presidente_nome: 'Dr. Carlos Nogueira',
    vice_presidente_id: 'ver-4',
    vice_presidente_nome: 'Dra. Juliana Rocha',
    relator_padrao_id: 'ver-4',
    membros_ids: ['ver-1', 'ver-4', 'ver-7'],
    membros_nomes: ['Dr. Carlos Nogueira', 'Dra. Juliana Rocha', 'Carol Bastos'],
    materias_em_analise_count: 3,
    ativo: true
  },
  {
    id: 'com-cfo',
    nome: 'Comissão de Finanças, Orçamento e Tomada de Contas',
    sigla: 'CFOTC',
    tipo: 'Permanente',
    descricao: 'Examina matérias tributárias, orçamento municipal (PPA, LDO, LOA) e prestação de contas do Poder Executivo.',
    presidente_id: 'ver-3',
    presidente_nome: 'Beto Santos',
    vice_presidente_id: 'ver-5',
    vice_presidente_nome: 'Marquinhos da Zona Rural',
    relator_padrao_id: 'ver-3',
    membros_ids: ['ver-3', 'ver-5', 'ver-6'],
    membros_nomes: ['Beto Santos', 'Marquinhos da Zona Rural', 'Pastor Fernando'],
    materias_em_analise_count: 2,
    ativo: true
  },
  {
    id: 'com-ceos',
    nome: 'Comissão de Educação, Obras, Saúde e Serviços Públicos',
    sigla: 'CEOS',
    tipo: 'Permanente',
    descricao: 'Fiscaliza e opina sobre obras públicas, transporte, sistema municipal de saúde e rede pública de ensino.',
    presidente_id: 'ver-2',
    presidente_nome: 'Professora Cida',
    vice_presidente_id: 'ver-7',
    vice_presidente_nome: 'Carol Bastos',
    relator_padrao_id: 'ver-2',
    membros_ids: ['ver-2', 'ver-7', 'ver-4'],
    membros_nomes: ['Professora Cida', 'Carol Bastos', 'Dra. Juliana Rocha'],
    materias_em_analise_count: 4,
    ativo: true
  }
];

export const INITIAL_MATERIAS: MateriaLegislativa[] = [
  {
    id: 'mat-1',
    numero: 'PLO 014/2026',
    ano: 2026,
    tipo: 'Projeto de Lei Ordinária',
    ementa: 'Institui o Programa Municipal "Escola Conectada" e dispõe sobre a disponibilização de internet de alta velocidade e tablets educativos nas escolas da rede municipal.',
    texto_integral: `Art. 1º Fica instituído no âmbito do Município o Programa "Escola Conectada", com o objetivo de universalizar o acesso à internet de alta velocidade para alunos e professores da rede municipal de ensino fundamental.\n\nArt. 2º O Poder Executivo fornecerá infraestrutura tecnológica e equipamentos portáteis pedagógicos.\n\nArt. 3º As despesas decorrentes da execução desta Lei correrão por conta de dotações orçamentárias próprias suplementadas se necessário.\n\nArt. 4º Esta Lei entra em vigor na data de sua publicação.`,
    autor_id: 'ver-2',
    autor_nome: 'Professora Cida',
    coautores: ['Dr. Carlos Nogueira', 'Carol Bastos'],
    regime: 'Ordinário',
    status: 'Apto para Ordem do Dia',
    comissao_atual_id: 'com-ceos',
    comissao_atual_nome: 'Comissão de Educação, Obras, Saúde e Serviços Públicos',
    relator_id: 'ver-2',
    relator_nome: 'Professora Cida',
    data_protocolo: '2026-02-10',
    data_limite_comissao: '2026-03-10',
    tags: ['Educação', 'Tecnologia', 'Inclusão Digital'],
    tramitacoes: [
      {
        id: 'tram-1',
        materia_id: 'mat-1',
        data_tramitacao: '2026-02-10 10:00:00',
        fase: 'Protocolo Geral',
        despacho: 'Matéria protocolada sob o nº 014/2026.',
        responsavel: 'Secretaria Legislativa',
        status_resultante: 'Protocolado'
      },
      {
        id: 'tram-2',
        materia_id: 'mat-1',
        data_tramitacao: '2026-02-15 19:30:00',
        fase: 'Leitura em Plenário',
        despacho: 'Lido no Pequeno Expediente da 2ª Sessão Ordinária. Encaminhado à CCJR.',
        responsavel: 'Mesa Diretora',
        status_resultante: 'Lido no Expediente'
      },
      {
        id: 'tram-3',
        materia_id: 'mat-1',
        data_tramitacao: '2026-02-22 14:00:00',
        fase: 'Parecer da CCJR',
        despacho: 'Parecer Favorável pela Constitucionalidade e Legalidade aprovado por unanimidade.',
        responsavel: 'Dr. Carlos Nogueira (Presidente CCJR)',
        status_resultante: 'Em Comissão'
      },
      {
        id: 'tram-4',
        materia_id: 'mat-1',
        data_tramitacao: '2026-03-01 16:00:00',
        fase: 'Parecer da CEOS',
        despacho: 'Parecer do Mérito aprovado favorável. Matéria incluída para a Ordem do Dia.',
        responsavel: 'Professora Cida (Relatora CEOS)',
        status_resultante: 'Apto para Ordem do Dia'
      }
    ],
    pareceres: [
      {
        id: 'par-1',
        comissao_id: 'com-ccj',
        comissao_nome: 'CCJR',
        materia_id: 'mat-1',
        relator_id: 'ver-4',
        relator_nome: 'Dra. Juliana Rocha',
        conclusao: 'Favorável',
        relatorio: 'O projeto respeita a competência legislativa municipal e os ditames da Lei Orgânica.',
        voto_relator: 'Pela aprovação integral sem emendas.',
        data_emissao: '2026-02-22',
        aprovado_comissao: true
      }
    ]
  },
  {
    id: 'mat-2',
    numero: 'PLC 003/2026',
    ano: 2026,
    tipo: 'Projeto de Lei Complementar',
    ementa: 'Altera o Código Tributário Municipal (Lei Complementar nº 45/2018) para instituir isenção de IPTU a portadores de doenças graves e incapacitantes.',
    texto_integral: `Art. 1º Fica isento do pagamento do Imposto Predial e Territorial Urbano (IPTU) o imóvel residencial pertencente a portador de neoplasia maligna, insuficiência renal crônica ou esclerose múltipla.\n\nArt. 2º A comprovação será realizada anualmente perante a Secretaria Municipal de Finanças mediante laudo pericial oficial.\n\nArt. 3º Esta Lei Complementar entra em vigor no primeiro dia do exercício seguinte.`,
    autor_id: 'ver-4',
    autor_nome: 'Dra. Juliana Rocha',
    regime: 'Ordinário',
    status: 'Em Comissão',
    comissao_atual_id: 'com-cfo',
    comissao_atual_nome: 'Comissão de Finanças, Orçamento e Tomada de Contas',
    relator_id: 'ver-3',
    relator_nome: 'Beto Santos',
    data_protocolo: '2026-02-18',
    data_limite_comissao: '2026-03-25',
    tags: ['Tributário', 'Saúde', 'Benefício Social'],
    tramitacoes: [
      {
        id: 'tram-5',
        materia_id: 'mat-2',
        data_tramitacao: '2026-02-18 11:20:00',
        fase: 'Protocolo Geral',
        despacho: 'Matéria protocolada sob o nº 003/2026.',
        responsavel: 'Secretaria Legislativa',
        status_resultante: 'Protocolado'
      },
      {
        id: 'tram-6',
        materia_id: 'mat-2',
        data_tramitacao: '2026-02-23 19:40:00',
        fase: 'Leitura em Plenário',
        despacho: 'Lido em Plenário e encaminhado para CCJR e Comissão de Finanças.',
        responsavel: 'Mesa Diretora',
        status_resultante: 'Em Comissão'
      }
    ]
  },
  {
    id: 'mat-3',
    numero: 'PDL 001/2026',
    ano: 2026,
    tipo: 'Decreto Legislativo',
    ementa: 'Concede o Título de Cidadão Honorário do Município ao Ilustríssimo Sr. Doutor Antônio Pereira pelos relevantes serviços prestados à saúde comunitária.',
    texto_integral: `Art. 1º Fica concedido o Título de Cidadão Honorário ao Dr. Antônio Pereira.\n\nArt. 2º A entrega da honraria será realizada em Sessão Solene especialmente convocada pela Mesa Diretora.`,
    autor_id: 'ver-6',
    autor_nome: 'Pastor Fernando',
    regime: 'Ordinário',
    status: 'Sancionado',
    data_protocolo: '2026-01-15',
    tags: ['Honraria', 'Homenagem'],
    tramitacoes: [
      {
        id: 'tram-7',
        materia_id: 'mat-3',
        data_tramitacao: '2026-01-15 09:00:00',
        fase: 'Protocolo',
        despacho: 'Protocolo realizado.',
        responsavel: 'Secretaria Legislativa',
        status_resultante: 'Protocolado'
      },
      {
        id: 'tram-8',
        materia_id: 'mat-3',
        data_tramitacao: '2026-02-05 20:10:00',
        fase: 'Votação Única em Plenário',
        despacho: 'Aprovado por unanimidade (7x0) dos vereadores.',
        responsavel: 'Plenário',
        status_resultante: 'Promulgado'
      }
    ]
  },
  {
    id: 'mat-4',
    numero: 'REQ 045/2026',
    ano: 2026,
    tipo: 'Pedido de Informação',
    ementa: 'Requer ao Chefe do Poder Executivo informações detalhadas sobre a aplicação dos recursos do FUNDEB no exercício de 2025 e cronograma de reforma das creches.',
    texto_integral: `Requer-se, nos termos regimentais, envio de ofício ao Prefeito Municipal solicitando: 1. Balancete detalhado do FUNDEB 2025; 2. Lista de reformas licitadas para 2026 com prazos e valores.`,
    autor_id: 'ver-7',
    autor_nome: 'Carol Bastos',
    regime: 'Urgência',
    status: 'Enviado ao Executivo',
    data_protocolo: '2026-02-25',
    tags: ['Fiscalização', 'Educação', 'Transparência'],
    tramitacoes: [
      {
        id: 'tram-9',
        materia_id: 'mat-4',
        data_tramitacao: '2026-02-25 15:00:00',
        fase: 'Aprovação em Plenário',
        despacho: 'Requerimento aprovado. Ofício nº 082/2026 expedido ao Gabinete do Prefeito.',
        responsavel: 'Mesa Diretora',
        status_resultante: 'Enviado ao Executivo'
      }
    ]
  }
];

export const INITIAL_SESSOES: SessaoPlenaria[] = [
  {
    id: 'ses-1',
    numero: 4,
    ano: 2026,
    tipo: 'Ordinária',
    data_sessao: new Date().toISOString().split('T')[0], // Hoje
    hora_inicio: '19:00',
    status: 'Em Andamento',
    quorum_abertura: 7,
    presencas: [
      { vereador_id: 'ver-1', nome_parlamentar: 'Dr. Carlos Nogueira', partido: 'PSD', presente: true, horario_registro: '18:50' },
      { vereador_id: 'ver-2', nome_parlamentar: 'Professora Cida', partido: 'MDB', presente: true, horario_registro: '18:52' },
      { vereador_id: 'ver-3', nome_parlamentar: 'Beto Santos', partido: 'PL', presente: true, horario_registro: '18:55' },
      { vereador_id: 'ver-4', nome_parlamentar: 'Dra. Juliana Rocha', partido: 'UNIÃO', presente: true, horario_registro: '18:58' },
      { vereador_id: 'ver-5', nome_parlamentar: 'Marquinhos da Zona Rural', partido: 'PP', presente: true, horario_registro: '19:02' },
      { vereador_id: 'ver-6', nome_parlamentar: 'Pastor Fernando', partido: 'REPUBLICANOS', presente: true, horario_registro: '18:45' },
      { vereador_id: 'ver-7', nome_parlamentar: 'Carol Bastos', partido: 'PSOL', presente: true, horario_registro: '18:59' }
    ],
    pauta_expediente: ['mat-2', 'mat-4'],
    pauta_ordem_dia: ['mat-1'],
    materia_em_discussao_id: 'mat-1',
    ata_resumida: 'Sessão Ordinária aberta sob a proteção de Deus e em nome do povo. Quórum de 7 vereadores presentes.'
  },
  {
    id: 'ses-2',
    numero: 3,
    ano: 2026,
    tipo: 'Ordinária',
    data_sessao: '2026-02-18',
    hora_inicio: '19:00',
    hora_fim: '21:30',
    status: 'Encerrada',
    quorum_abertura: 7,
    presencas: [
      { vereador_id: 'ver-1', nome_parlamentar: 'Dr. Carlos Nogueira', partido: 'PSD', presente: true },
      { vereador_id: 'ver-2', nome_parlamentar: 'Professora Cida', partido: 'MDB', presente: true },
      { vereador_id: 'ver-3', nome_parlamentar: 'Beto Santos', partido: 'PL', presente: true },
      { vereador_id: 'ver-4', nome_parlamentar: 'Dra. Juliana Rocha', partido: 'UNIÃO', presente: true },
      { vereador_id: 'ver-5', nome_parlamentar: 'Marquinhos da Zona Rural', partido: 'PP', presente: false, justificativa: 'Compromisso em Brasília' },
      { vereador_id: 'ver-6', nome_parlamentar: 'Pastor Fernando', partido: 'REPUBLICANOS', presente: true },
      { vereador_id: 'ver-7', nome_parlamentar: 'Carol Bastos', partido: 'PSOL', presente: true }
    ],
    pauta_expediente: [],
    pauta_ordem_dia: ['mat-3'],
    ata_resumida: 'Ata da 3ª Sessão Ordinária: Aprovado o PDL 001/2026 em votação única.'
  }
];

export const INITIAL_INDICACOES: Indicacao[] = [
  {
    id: 'ind-1',
    numero: 'IND 112/2026',
    ano: 2026,
    tipo: 'Indicação',
    vereador_id: 'ver-5',
    vereador_nome: 'Marquinhos da Zona Rural',
    bairro: 'Córrego Fundo (Zona Rural)',
    secretaria_destino: 'Secretaria Municipal de Obras e Serviços Públicos',
    descricao: 'Solicita com urgência o patrolamento e cascalhamento da estrada vicinal da linha 4, trecho da ponte de madeira.',
    data_envio: '2026-02-10',
    prazo_resposta_dias: 30,
    data_limite_resposta: '2026-03-12',
    status: 'Encaminhado'
  },
  {
    id: 'ind-2',
    numero: 'IND 115/2026',
    ano: 2026,
    tipo: 'Indicação',
    vereador_id: 'ver-3',
    vereador_nome: 'Beto Santos',
    bairro: 'Centro',
    secretaria_destino: 'Secretaria Municipal de Trânsito e Mobilidade',
    descricao: 'Instalação de semáforo para pedestres e faixa elevada no cruzamento da Av. Brasil com Rua 7 de Setembro.',
    data_envio: '2026-01-20',
    prazo_resposta_dias: 30,
    data_limite_resposta: '2026-02-19',
    data_resposta: '2026-02-15',
    resposta_executivo: 'Ofício SMOB nº 45/26: Solicitação incluída no cronograma de obras de sinalização do mês de Março/2026.',
    status: 'Atendido'
  },
  {
    id: 'ind-3',
    numero: 'IND 119/2026',
    ano: 2026,
    tipo: 'Indicação',
    vereador_id: 'ver-7',
    vereador_nome: 'Carol Bastos',
    bairro: 'Jardim Primavera',
    secretaria_destino: 'Secretaria Municipal de Meio Ambiente',
    descricao: 'Criação de ecoponto para descarte de entulho e implantação de mutirão de castração gratuita para animais de rua.',
    data_envio: '2026-01-05',
    prazo_resposta_dias: 30,
    data_limite_resposta: '2026-02-04',
    status: 'Vencido'
  }
];

export const INITIAL_SUGESTOES: SugestaoPopular[] = [
  {
    id: 'sug-1',
    nome_cidadao: 'Lucas Mendonça de Souza',
    email: 'lucas.mendonca@gmail.com',
    telefone: '(11) 97788-9900',
    bairro: 'Vila Nova',
    titulo: 'Ampliação do horário de atendimento do Posto de Saúde para 22h',
    descricao: 'Trabalhadores do comércio e fábricas não conseguem levar os filhos ao médico durante o dia. Um horário estendido facilitaria muito.',
    categoria: 'Saúde',
    vereador_destinatario_id: 'ver-4',
    vereador_destinatario_nome: 'Dra. Juliana Rocha',
    apoios_count: 142,
    status: 'Acolhida pelo Gabinete',
    resposta_gabinete: 'Excelente proposta do munícipe! Transformamos em Indicação protocolada nº 124/2026 e estamos dialogando com o Secretário de Saúde.',
    created_at: '2026-02-12'
  },
  {
    id: 'sug-2',
    nome_cidadao: 'Renata Figueiredo',
    email: 'renata.fig@hotmail.com',
    telefone: '(11) 98877-6655',
    bairro: 'Parque das Árvores',
    titulo: 'Revitalização da Praça Central com Iluminação LED e Wi-Fi Público',
    descricao: 'A praça central está muito escura à noite, gerando insegurança para as famílias e jovens.',
    categoria: 'Infraestrutura',
    apoios_count: 89,
    status: 'Em Avaliação',
    created_at: '2026-02-20'
  }
];

export const INITIAL_PNTP_CRITERIOS: CriterioPNTPCamara[] = [
  {
    id: 'pntp-1',
    categoria: 'Informações Institucionais',
    item: 'Estrutura Organizacional e Mesa Diretora',
    criterio_atricon: 'Divulgação dos membros da Mesa Diretora, vereadores em exercício, partidos, biografias e comissões.',
    peso: 10,
    atendido: true,
    obrigatorio: true,
    evidencia: 'Aba Vereadores e Mesa Diretora com perfis completos.'
  },
  {
    id: 'pntp-2',
    categoria: 'Atividade Legislativa',
    item: 'Pautas das Sessões e Presença dos Parlamentares',
    criterio_atricon: 'Publicação da ordem do dia com antecedência mínima de 24h e registro nominal de presença em sessões.',
    peso: 15,
    atendido: true,
    obrigatorio: true,
    evidencia: 'Módulo Plenário com Quórum e Pauta da Sessão Pública.'
  },
  {
    id: 'pntp-3',
    categoria: 'Atividade Legislativa',
    item: 'Processo Legislativo e Votações Nominais',
    criterio_atricon: 'Disponibilização integral dos Projetos de Lei, pareceres das comissões e resultado nominal das votações.',
    peso: 15,
    atendido: true,
    obrigatorio: true,
    evidencia: 'SAPL Processo Legislativo Eletrônico completo com votação nominal.'
  },
  {
    id: 'pntp-4',
    categoria: 'Receitas e Despesas',
    item: 'Execução Orçamentária e Duodécimo',
    criterio_atricon: 'Demonstrativo mensal do repasse do duodécimo pelo Executivo e despesas liquidadas/pagas da Câmara.',
    peso: 15,
    atendido: true,
    obrigatorio: true,
    evidencia: 'Relatórios de despesa e duodécimo integrados à SMAF.'
  },
  {
    id: 'pntp-5',
    categoria: 'Recursos Humanos',
    item: 'Folha de Pagamento e Verbas Indenizatórias',
    criterio_atricon: 'Tabela nominal de subsídios dos vereadores, vencimentos de servidores e prestação de contas de diárias.',
    peso: 15,
    atendido: true,
    obrigatorio: true,
    evidencia: 'Controle de verbas indenizatórias e diárias transparente.'
  },
  {
    id: 'pntp-6',
    categoria: 'Licitações e Contratos',
    item: 'Editais, Dispensas e Contratos Administrativos',
    criterio_atricon: 'Publicação dos avisos de contratação direta, pregões, contratos vigentes e fiscais designados.',
    peso: 10,
    atendido: true,
    obrigatorio: true,
    evidencia: 'Módulo Contratos e Licitações integrado ao portal da câmara.'
  },
  {
    id: 'pntp-7',
    categoria: 'Serviço de Informação ao Cidadão (e-SIC) & Ouvidoria',
    item: 'Canal Eletrônico de Pedidos de Acesso à Informação',
    criterio_atricon: 'Formulário online de pedido de informação com prazo de resposta regido pela LAI (Lei nº 12.527/2011).',
    peso: 10,
    atendido: true,
    obrigatorio: true,
    evidencia: 'Portal do Cidadão e Ouvidoria com rastreamento de protocolo.'
  },
  {
    id: 'pntp-8',
    categoria: 'Acessibilidade & Dados Abertos',
    item: 'Exportação em Formatos Abertos (CSV/JSON/PDF)',
    criterio_atricon: 'Permitir download automatizado das proposições, leis municipais e relatórios sem necessidade de login.',
    peso: 10,
    atendido: true,
    obrigatorio: false,
    evidencia: 'Geração de documentos, PDFs e tabelas exportáveis.'
  }
];

// ==========================================
// STORAGE KEYS & HELPERS
// ==========================================

const STORAGE_KEYS = {
  VEREADORES: 'camara_360_vereadores_v2',
  MATERIAS: 'camara_360_materias_v2',
  COMISSOES: 'camara_360_comissoes_v2',
  SESSOES: 'camara_360_sessoes_v2',
  INDICACOES: 'camara_360_indicacoes_v2',
  SUGESTOES: 'camara_360_sugestoes_v2',
  PNTP: 'camara_360_pntp_v2',
};

export class CamaraService {
  private static getStored<T>(key: string, defaultData: T): T {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn(`Erro ao ler ${key} do localStorage`, e);
    }
    return defaultData;
  }

  private static setStored<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Erro ao salvar ${key} no localStorage`, e);
    }
  }

  // --- VEREADORES ---
  static async getVereadores(): Promise<Vereador[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('camara_vereadores')
          .select('*')
          .order('nome', { ascending: true });
        if (!error && data && data.length > 0) {
          this.setStored(STORAGE_KEYS.VEREADORES, data);
          return data;
        }
      }
    } catch (err) {
      console.debug('Usando storage local para vereadores:', err);
    }
    return this.getStored(STORAGE_KEYS.VEREADORES, INITIAL_VEREADORES);
  }

  static async saveVereador(vereador: Vereador): Promise<Vereador> {
    const vereadores = await this.getVereadores();
    const index = vereadores.findIndex(v => v.id === vereador.id);
    let updatedList: Vereador[];
    if (index >= 0) {
      updatedList = [...vereadores];
      updatedList[index] = vereador;
    } else {
      updatedList = [vereador, ...vereadores];
    }
    this.setStored(STORAGE_KEYS.VEREADORES, updatedList);

    try {
      if (supabase) {
        await supabase.from('camara_vereadores').upsert(vereador);
      }
    } catch (e) {
      console.debug('Supabase sync bypass:', e);
    }
    return vereador;
  }

  // --- COMISSÕES ---
  static async getComissoes(): Promise<Comissao[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('camara_comissoes')
          .select('*');
        if (!error && data && data.length > 0) {
          this.setStored(STORAGE_KEYS.COMISSOES, data);
          return data;
        }
      }
    } catch (err) {
      console.debug('Usando storage local para comissões:', err);
    }
    return this.getStored(STORAGE_KEYS.COMISSOES, INITIAL_COMISSOES);
  }

  static async saveComissao(comissao: Comissao): Promise<Comissao> {
    const list = await this.getComissoes();
    const index = list.findIndex(c => c.id === comissao.id);
    let updatedList: Comissao[];
    if (index >= 0) {
      updatedList = [...list];
      updatedList[index] = comissao;
    } else {
      updatedList = [comissao, ...list];
    }
    this.setStored(STORAGE_KEYS.COMISSOES, updatedList);
    return comissao;
  }

  // --- MATÉRIAS LEGISLATIVAS (SAPL) ---
  static async getMaterias(): Promise<MateriaLegislativa[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('camara_materias')
          .select('*')
          .order('data_protocolo', { ascending: false });
        if (!error && data && data.length > 0) {
          this.setStored(STORAGE_KEYS.MATERIAS, data);
          return data;
        }
      }
    } catch (err) {
      console.debug('Usando storage local para matérias:', err);
    }
    return this.getStored(STORAGE_KEYS.MATERIAS, INITIAL_MATERIAS);
  }

  static async saveMateria(materia: MateriaLegislativa): Promise<MateriaLegislativa> {
    const list = await this.getMaterias();
    const index = list.findIndex(m => m.id === materia.id);
    let updatedList: MateriaLegislativa[];
    if (index >= 0) {
      updatedList = [...list];
      updatedList[index] = materia;
    } else {
      // Cria tramitação inicial automática se for nova
      if (!materia.tramitacoes || materia.tramitacoes.length === 0) {
        materia.tramitacoes = [{
          id: `tram-${Date.now()}`,
          materia_id: materia.id,
          data_tramitacao: new Date().toISOString().replace('T', ' ').substring(0, 19),
          fase: 'Protocolo Geral',
          despacho: `Matéria autuada sob nº ${materia.numero}`,
          responsavel: 'Secretaria Legislativa',
          status_resultante: 'Protocolado'
        }];
      }
      updatedList = [materia, ...list];
    }
    this.setStored(STORAGE_KEYS.MATERIAS, updatedList);
    return materia;
  }

  static async addTramitacao(materiaId: string, tramitacao: Omit<Tramitacao, 'id' | 'materia_id'>): Promise<MateriaLegislativa | null> {
    const list = await this.getMaterias();
    const index = list.findIndex(m => m.id === materiaId);
    if (index === -1) return null;

    const novaTramitacao: Tramitacao = {
      id: `tram-${Date.now()}`,
      materia_id: materiaId,
      ...tramitacao
    };

    const materia = { ...list[index] };
    materia.tramitacoes = [...(materia.tramitacoes || []), novaTramitacao];
    materia.status = tramitacao.status_resultante;
    
    list[index] = materia;
    this.setStored(STORAGE_KEYS.MATERIAS, list);
    return materia;
  }

  static async addParecer(materiaId: string, parecer: Omit<Parecer, 'id' | 'materia_id'>): Promise<MateriaLegislativa | null> {
    const list = await this.getMaterias();
    const index = list.findIndex(m => m.id === materiaId);
    if (index === -1) return null;

    const novoParecer: Parecer = {
      id: `par-${Date.now()}`,
      materia_id: materiaId,
      ...parecer
    };

    const materia = { ...list[index] };
    materia.pareceres = [...(materia.pareceres || []), novoParecer];
    
    list[index] = materia;
    this.setStored(STORAGE_KEYS.MATERIAS, list);
    return materia;
  }

  // --- SESSÕES PLENÁRIAS ---
  static async getSessoes(): Promise<SessaoPlenaria[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('camara_sessoes')
          .select('*')
          .order('data_sessao', { ascending: false });
        if (!error && data && data.length > 0) {
          this.setStored(STORAGE_KEYS.SESSOES, data);
          return data;
        }
      }
    } catch (err) {
      console.debug('Usando storage local para sessões:', err);
    }
    return this.getStored(STORAGE_KEYS.SESSOES, INITIAL_SESSOES);
  }

  static async saveSessao(sessao: SessaoPlenaria): Promise<SessaoPlenaria> {
    const list = await this.getSessoes();
    const index = list.findIndex(s => s.id === sessao.id);
    let updatedList: SessaoPlenaria[];
    if (index >= 0) {
      updatedList = [...list];
      updatedList[index] = sessao;
    } else {
      updatedList = [sessao, ...list];
    }
    this.setStored(STORAGE_KEYS.SESSOES, updatedList);
    return sessao;
  }

  // --- INDICAÇÕES E REQUERIMENTOS ---
  static async getIndicacoes(): Promise<Indicacao[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('camara_indicacoes')
          .select('*')
          .order('data_envio', { ascending: false });
        if (!error && data && data.length > 0) {
          this.setStored(STORAGE_KEYS.INDICACOES, data);
          return data;
        }
      }
    } catch (err) {
      console.debug('Usando storage local para indicações:', err);
    }
    return this.getStored(STORAGE_KEYS.INDICACOES, INITIAL_INDICACOES);
  }

  static async saveIndicacao(indicacao: Indicacao): Promise<Indicacao> {
    const list = await this.getIndicacoes();
    const index = list.findIndex(i => i.id === indicacao.id);
    let updatedList: Indicacao[];
    if (index >= 0) {
      updatedList = [...list];
      updatedList[index] = indicacao;
    } else {
      updatedList = [indicacao, ...list];
    }
    this.setStored(STORAGE_KEYS.INDICACOES, updatedList);
    return indicacao;
  }

  // --- SUGESTÕES POPULARES (PORTAL DO CIDADÃO) ---
  static async getSugestoes(): Promise<SugestaoPopular[]> {
    return this.getStored(STORAGE_KEYS.SUGESTOES, INITIAL_SUGESTOES);
  }

  static async saveSugestao(sugestao: SugestaoPopular): Promise<SugestaoPopular> {
    const list = await this.getSugestoes();
    const index = list.findIndex(s => s.id === sugestao.id);
    let updatedList: SugestaoPopular[];
    if (index >= 0) {
      updatedList = [...list];
      updatedList[index] = sugestao;
    } else {
      updatedList = [sugestao, ...list];
    }
    this.setStored(STORAGE_KEYS.SUGESTOES, updatedList);
    return sugestao;
  }

  static async apoiarSugestao(sugestaoId: string): Promise<SugestaoPopular | null> {
    const list = await this.getSugestoes();
    const index = list.findIndex(s => s.id === sugestaoId);
    if (index === -1) return null;

    const sugestao = { ...list[index], apoios_count: (list[index].apoios_count || 0) + 1 };
    list[index] = sugestao;
    this.setStored(STORAGE_KEYS.SUGESTOES, list);
    return sugestao;
  }

  // --- PNTP ATRICON CHECKLIST ---
  static async getPNTPChecklist(): Promise<CriterioPNTPCamara[]> {
    return this.getStored(STORAGE_KEYS.PNTP, INITIAL_PNTP_CRITERIOS);
  }

  static async toggleCriterioPNTP(criterioId: string): Promise<CriterioPNTPCamara[]> {
    const list = await this.getPNTPChecklist();
    const updated = list.map(c => c.id === criterioId ? { ...c, atendido: !c.atendido } : c);
    this.setStored(STORAGE_KEYS.PNTP, updated);
    return updated;
  }
}
