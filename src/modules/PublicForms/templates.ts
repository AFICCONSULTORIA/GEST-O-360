import { PublicForm } from '../../types';

export const MOCK_DEFAULT_FORMS: PublicForm[] = [
  {
    id: 'form_saude_satisfacao_1',
    title: 'Pesquisa de Satisfação · Atendimento no Posto de Saúde (UBS)',
    description: 'Queremos ouvir você! Avalie o acolhimento, tempo de espera, atendimento médico e disponibilidade de remédios em nossa unidade.',
    category: 'Saúde',
    slug: 'satisfacao-saude-ubs',
    cover_theme: 'emerald_health',
    status: 'published',
    is_anonymous: false,
    require_cpf: false,
    max_responses: 500,
    thank_you_title: 'Muito obrigado pela sua avaliação!',
    thank_you_message: 'Sua opinião é fundamental para aprimorarmos as escalas médicas e o fornecimento de medicamentos na nossa rede municipal.',
    redirect_url: '',
    questions: [
      {
        id: 'q_ubs_unidade',
        type: 'select',
        label: 'Qual Unidade de Saúde (UBS) você visitou?',
        required: true,
        options: [
          'UBS Central - Dr. Alberto',
          'UBS Vila Nova',
          'UBS Jardim Imperial',
          'ESF Zona Rural',
          'Hospital Municipal / Pronto Atendimento'
        ]
      },
      {
        id: 'q_ubs_tipo_atendimento',
        type: 'radio',
        label: 'Qual serviço você utilizou hoje?',
        required: true,
        options: [
          'Consulta Médica (Clínico/Pediatra)',
          'Atendimento Odontológico (Dentista)',
          'Vacinação ou Curativo',
          'Retirada de Medicamentos na Farmácia',
          'Agendamento de Exames / TFD'
        ],
        allowOther: true
      },
      {
        id: 'q_ubs_tempo_espera',
        type: 'radio',
        label: 'Quanto tempo você aguardou para ser atendido(a)?',
        required: true,
        options: [
          'Menos de 15 minutos (Muito Rápido)',
          'Entre 15 e 30 minutos',
          'Entre 30 e 60 minutos',
          'Mais de 1 hora'
        ]
      },
      {
        id: 'q_ubs_estrelas_equipe',
        type: 'rating_stars',
        label: 'Como você avalia a atenção e respeito da equipe de saúde?',
        description: 'Classifique de 1 a 5 estrelas',
        required: true,
        min: 1,
        max: 5
      },
      {
        id: 'q_ubs_remedios',
        type: 'yes_no',
        label: 'Conseguiu retirar todos os remédios prescritos na Farmácia Básica?',
        required: true
      },
      {
        id: 'q_ubs_emojis_geral',
        type: 'rating_emojis',
        label: 'Qual seu nível geral de satisfação com a saúde municipal?',
        required: true
      },
      {
        id: 'q_ubs_sugestoes',
        type: 'textarea',
        label: 'Tem algum elogio, crítica ou sugestão de melhoria?',
        placeholder: 'Escreva com suas palavras...',
        required: false
      }
    ],
    created_by: 'Secretaria de Saúde',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    response_count: 38
  },
  {
    id: 'form_orcamento_participativo_2',
    title: 'Consulta Pública · Orçamento Participativo 2026 / 2027',
    description: 'Participe da definição dos investimentos prioritários da nossa cidade na Lei Orçamentária Anual (LOA) e PPA.',
    category: 'Finanças & Planejamento',
    slug: 'orcamento-participativo-2026',
    cover_theme: 'blue_ocean',
    status: 'published',
    is_anonymous: false,
    require_cpf: true,
    thank_you_title: 'Sua voz faz a diferença!',
    thank_you_message: 'Sua prioridade foi registrada e será analisada pela equipe econômica da Prefeitura e enviada para a audiência pública na Câmara.',
    questions: [
      {
        id: 'q_op_bairro',
        type: 'neighborhood',
        label: 'Em qual bairro ou comunidade você mora?',
        required: true
      },
      {
        id: 'q_op_prioridades',
        type: 'checkbox',
        label: 'Quais áreas você considera mais urgentes para novos investimentos?',
        description: 'Selecione até 3 opções principais',
        required: true,
        options: [
          'Pavimentação asfáltica e recapeamento',
          'Ampliação de vagas em Creches e Escolas',
          'Mais médicos especialistas e exames na Saúde',
          'Iluminação pública em LED e Segurança',
          'Apoio à agricultura familiar e estradas rurais',
          'Áreas de lazer, praças e parques infantis',
          'Saneamento básico e drenagem de águas pluviais'
        ]
      },
      {
        id: 'q_op_obra_especifica',
        type: 'textarea',
        label: 'Qual obra ou ação prioritária você gostaria de ver no seu bairro?',
        placeholder: 'Ex: Construção de uma rotatória na Av. Principal ou reforma da praça...',
        required: true
      },
      {
        id: 'q_op_nps',
        type: 'scale_nps',
        label: 'De 0 a 10, qual nota você dá para a gestão pública municipal nos últimos meses?',
        required: true,
        min: 0,
        max: 10
      }
    ],
    created_by: 'Secretaria de Planejamento e Finanças',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    response_count: 94
  },
  {
    id: 'form_servicos_urbanos_3',
    title: 'Ouvidoria de Serviços Públicos · Vias, Iluminação e Limpeza',
    description: 'Canal direto para solicitar reparos de postes apagados, tapa-buracos, coleta de entulhos e roçagem de praças.',
    category: 'Serviços Públicos',
    slug: 'servicos-urbanos-iluminacao-vias',
    cover_theme: 'amber_citizen',
    status: 'published',
    is_anonymous: false,
    require_cpf: false,
    thank_you_title: 'Solicitação registrada com sucesso!',
    thank_you_message: 'A equipe de obras e serviços públicos já recebeu o seu chamado com prioridade.',
    questions: [
      {
        id: 'q_serv_tipo',
        type: 'radio',
        label: 'Qual o tipo de serviço necessário?',
        required: true,
        options: [
          'Lâmpada de poste queimada / Iluminação escura',
          'Buraco no asfalto / Pavimentação danificada',
          'Coleta de galhos ou entulhos acumulados',
          'Boca de lobo entupida / Bueiro sem tampa',
          'Limpeza e roçagem de praça ou canteiro central'
        ],
        allowOther: true
      },
      {
        id: 'q_serv_endereco',
        type: 'text',
        label: 'Endereço exato (Rua, Número e Ponto de Referência)',
        placeholder: 'Ex: Rua das Flores, nº 140 - Em frente ao mercado',
        required: true
      },
      {
        id: 'q_serv_bairro',
        type: 'neighborhood',
        label: 'Bairro',
        required: true
      },
      {
        id: 'q_serv_descricao',
        type: 'textarea',
        label: 'Detalhes adicionais da situação',
        placeholder: 'Ex: Poste piscando há 3 noites, deixando a esquina perigosa...',
        required: false
      },
      {
        id: 'q_serv_foto',
        type: 'file_link',
        label: 'Deseja anexar foto do local?',
        description: 'Uma foto ajuda a equipe a levar o maquinário certo',
        required: false
      }
    ],
    created_by: 'Secretaria de Serviços Públicos',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    response_count: 52
  },
  {
    id: 'form_censo_educacao_4',
    title: 'Censo da Educação Infantil & Demanda por Vagas em Creches',
    description: 'Levantamento oficial para mapeamento de crianças em idade de creche (0 a 3 anos) e planejamento das turmas para o próximo semestre.',
    category: 'Educação',
    slug: 'censo-creches-educacao-infantil',
    cover_theme: 'purple_modern',
    status: 'published',
    is_anonymous: false,
    require_cpf: true,
    thank_you_title: 'Cadastro no Censo Concluído!',
    thank_you_message: 'As informações da criança foram salvas no banco de dados da Secretaria Municipal de Educação.',
    questions: [
      {
        id: 'q_edu_nome_crianca',
        type: 'text',
        label: 'Nome completo da criança',
        placeholder: 'Digite o nome da criança',
        required: true
      },
      {
        id: 'q_edu_data_nascimento',
        type: 'date',
        label: 'Data de nascimento da criança',
        required: true
      },
      {
        id: 'q_edu_turno',
        type: 'radio',
        label: 'Turno de preferência da família',
        required: true,
        options: [
          'Integral (Manhã e Tarde)',
          'Matutino (Manhã)',
          'Vespertino (Tarde)'
        ]
      },
      {
        id: 'q_edu_transporte',
        type: 'yes_no',
        label: 'A criança necessita do Ônibus Escolar Municipal?',
        required: true
      },
      {
        id: 'q_edu_bairro',
        type: 'neighborhood',
        label: 'Bairro da residência',
        required: true
      }
    ],
    created_by: 'Secretaria de Educação',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    response_count: 67
  }
];

export const TEMPLATE_PRESETS = [
  {
    id: 'tpl_saude',
    title: 'Pesquisa de Satisfação em Saúde (UBS / Hospital)',
    description: 'Mede tempo de espera, acolhimento, remédios e cordialidade médica.',
    category: 'Saúde',
    cover_theme: 'emerald_health',
    badge: 'Mais Utilizado',
    iconName: 'HeartPulse'
  },
  {
    id: 'tpl_orcamento',
    title: 'Consulta de Orçamento Participativo (PPA / LOA)',
    description: 'Enquetes públicas para priorização de investimentos por bairro.',
    category: 'Planejamento',
    cover_theme: 'blue_ocean',
    badge: 'Obrigatório LRF',
    iconName: 'Landmark'
  },
  {
    id: 'tpl_servicos',
    title: 'Chamados de Iluminação, Asfalto e Limpeza',
    description: 'Ouvidoria rápida com fotos e localização para serviços públicos.',
    category: 'Obras',
    cover_theme: 'amber_citizen',
    badge: 'Alto Impacto',
    iconName: 'Wrench'
  },
  {
    id: 'tpl_educacao',
    title: 'Censo Escolar & Cadastro de Creche',
    description: 'Pesquisa com pais para projeção de matrículas e transporte escolar.',
    category: 'Educação',
    cover_theme: 'purple_modern',
    badge: 'Início de Ano',
    iconName: 'GraduationCap'
  },
  {
    id: 'tpl_eventos',
    title: 'Inscrição para Cursos, Oficinas e Eventos Esportivos',
    description: 'Formulário com limite de vagas e envio de comprovante.',
    category: 'Cultura & Esporte',
    cover_theme: 'rose_social',
    badge: 'Inscrições',
    iconName: 'Trophy'
  }
];
