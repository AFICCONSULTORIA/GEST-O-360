/**
 * Serviço de Configuração e Leitura do Site Institucional Oficial do Município.
 * Persiste preferencialmente em `public.institutions.cert_links.__institutional_site`
 * (garantindo compatibilidade imediata sem dependência de migração prévia) e sincroniza com
 * `custom_domain` / `site_config` quando disponíveis no banco, além de fallback localStorage.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Institution } from '../../types';
import { isDemoEnvironment } from '../demoManager';
import { isCustomMunicipalDomain } from '../subdomain';

export type SiteThemeColor = 'emerald' | 'sky' | 'indigo' | 'amber' | 'slate';

export const DEFAULT_CND_MUNICIPAL_URL = '';
export const MAX_SITE_POPUPS = 10;
export const DEFAULT_POPUP_DURATION_SECONDS = 6;

export interface SitePopupItem {
  id: string;
  enabled: boolean;
  title: string;
  badge: string;
  description: string;
  imageUrl: string;
  actionLabel: string;
  actionUrl: string;
  durationSeconds: number;
  startDate: string;
  endDate: string;
}

export interface PopupCarouselConfig {
  enabled: boolean;
  autoplay: boolean;
  autoCloseSeconds: number;
  items: SitePopupItem[];
}

export interface MourningModeConfig {
  enabled: boolean;
  personName: string;
  titleOrRole: string;
  message: string;
  decreeInfo: string;
}

export type UsefulLinkCategory = 'transparencia' | 'cidadao' | 'governo' | 'controle';

export interface UsefulLinkItem {
  id: string;
  label: string;
  description?: string;
  url: string;
  category: UsefulLinkCategory;
  enabled: boolean;
}

export interface SecretariatServiceItem {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  channel?: string;
  sla?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface SecretariatIndicatorItem {
  id: string;
  name: string;
  value: string;
  target?: string;
  progress?: number;
  period?: string;
  source?: string;
  trend?: 'up' | 'stable' | 'highlight';
}

export interface SecretariatResultItem {
  id: string;
  title: string;
  metric: string;
  description: string;
  year?: string;
  category?: string;
}

export interface SecretariatAwardItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
  category?: string;
  description?: string;
}

export interface SecretariatProfileConfig {
  slug: string;
  departmentName: string;
  secretaryName?: string;
  secretaryRole?: string;
  secretaryBio?: string;
  secretaryPhotoUrl?: string;
  resultsSummary?: string;
  mission?: string;
  vision?: string;
  overview?: string;
  competencies?: string[];
  address?: string;
  phone?: string;
  email?: string;
  serviceHours?: string;
  services?: SecretariatServiceItem[];
  indicators?: SecretariatIndicatorItem[];
  results?: SecretariatResultItem[];
  awards?: SecretariatAwardItem[];
}

export interface InstitutionalSiteConfig {
  enabled: boolean;
  customDomain: string;
  tagline: string;
  heroSubtitle: string;
  primaryColor: SiteThemeColor;
  customColor: string;
  mayorName: string;
  viceMayorName: string;
  mayorMessage: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  serviceHours: string;
  cndMunicipalUrl: string;
  transparencyUrl: string;
  officialGazetteUrl: string;
  dpoName?: string;
  dpoEmail?: string;
  electoralMode?: boolean;
  usefulLinks?: UsefulLinkItem[];
  secretariatProfiles?: Record<string, Partial<SecretariatProfileConfig>>;
  mourningMode: MourningModeConfig;
  popupCarousel: PopupCarouselConfig;
  socialLinks: {
    instagram: string;
    facebook: string;
    youtube: string;
  };
  sections: {
    showHeroServices: boolean;
    showNews: boolean;
    showOfficialGazette?: boolean;
    showLaws: boolean;
    showDepartments: boolean;
    showUsefulLinks?: boolean;
    showGovernmentInfo: boolean;
    showValidators: boolean;
    enableAccessibilityBar: boolean;
    enableVLibras: boolean;
    showCookieBanner?: boolean;
  };
  updatedAt?: string;
}

export const SITE_CONFIG_UPDATED_EVENT = 'gestao360:site-config-updated';

const storageKey = (institutionId: string) => `gestao360_institutional_site_${institutionId}`;

export const THEME_COLOR_HEX_MAP: Record<SiteThemeColor, string> = {
  emerald: '#059669',
  sky: '#0284c7',
  indigo: '#4f46e5',
  amber: '#d97706',
  slate: '#1e293b',
};

export function resolveSiteAccentHex(config?: Partial<InstitutionalSiteConfig> | null): string {
  const custom = (config?.customColor || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(custom)) return custom;
  const key = (config?.primaryColor || 'emerald') as SiteThemeColor;
  return THEME_COLOR_HEX_MAP[key] || '#059669';
}

export function buildDefaultSiteConfig(institution?: Institution | null): InstitutionalSiteConfig {
  const instName = institution?.name || 'Prefeitura Municipal';
  return {
    enabled: true,
    customDomain: institution?.custom_domain || '',
    tagline: 'Transparência, Eficiência e Compromisso com o Cidadão',
    heroSubtitle: `Portal Oficial da ${instName}. Serviços digitais, legislação municipal, notícias e acesso à informação em um único lugar.`,
    primaryColor: 'emerald',
    customColor: '#059669',
    mayorName: '',
    viceMayorName: '',
    mayorMessage:
      'Trabalhamos diariamente para modernizar a gestão pública, garantir transparência nos gastos e oferecer serviços digitais ágeis para toda a população.',
    cnpj: institution?.cnpj || '',
    address: '',
    phone: institution?.contact_phone || '',
    email: '',
    serviceHours: 'Segunda a Sexta, das 07h00 às 13h00',
    cndMunicipalUrl: DEFAULT_CND_MUNICIPAL_URL,
    transparencyUrl: '',
    officialGazetteUrl: '',
    dpoName: '',
    dpoEmail: '',
    electoralMode: false,
    usefulLinks: buildDefaultUsefulLinks(),
    secretariatProfiles: {},
    mourningMode: {
      enabled: false,
      personName: '',
      titleOrRole: '',
      message:
        'A Administração Municipal manifesta profundo pesar pelo falecimento e presta suas sinceras condolências aos familiares e amigos neste momento de dor.',
      decreeInfo: '',
    },
    popupCarousel: {
      enabled: true,
      autoplay: true,
      autoCloseSeconds: 0,
      items: [],
    },
    socialLinks: {
      instagram: '',
      facebook: '',
      youtube: '',
    },
    sections: {
      showHeroServices: true,
      showNews: true,
      showOfficialGazette: true,
      showLaws: true,
      showDepartments: true,
      showUsefulLinks: true,
      showGovernmentInfo: true,
      showValidators: true,
      enableAccessibilityBar: true,
      enableVLibras: true,
      showCookieBanner: true,
    },
  };
}

function parseCertLinks(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? { ...(raw as Record<string, any>) } : {};
}

export function getGestao360LandingUrl(): string {
  if (typeof window !== 'undefined' && isCustomMunicipalDomain(window.location.hostname)) {
    return 'https://gestao360sistema.com.br/landingpage';
  }
  return '/landingpage';
}

export function normalizeSecretariatSlug(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'secretaria';
}

export function buildDefaultUsefulLinks(): UsefulLinkItem[] {
  return [
    {
      id: 'ul_pncp',
      label: 'PNCP — Contratações Públicas',
      description: 'Portal Nacional de Contratações Públicas (Lei nº 14.133/2021).',
      url: 'https://www.gov.br/pncp/pt-br',
      category: 'transparencia',
      enabled: true,
    },
    {
      id: 'ul_cgu_transparencia',
      label: 'Portal da Transparência Federal',
      description: 'Consulta de repasses federais, convênios e execução pública (CGU).',
      url: 'https://portaldatransparencia.gov.br',
      category: 'controle',
      enabled: true,
    },
    {
      id: 'ul_receita_federal',
      label: 'Receita Federal — Certidões & CNPJ',
      description: 'Emissão de Certidão Negativa Federal, CPF e situação cadastral de CNPJ.',
      url: 'https://www.gov.br/receitafederal/pt-br',
      category: 'cidadao',
      enabled: true,
    },
    {
      id: 'ul_govbr',
      label: 'Gov.br — Serviços Digitais',
      description: 'Portal unificado de serviços públicos digitais ao cidadão brasileiro.',
      url: 'https://www.gov.br',
      category: 'governo',
      enabled: true,
    },
    {
      id: 'ul_planalto_leis',
      label: 'Planalto — Legislação Federal',
      description: 'Consulta oficial à Constituição Federal, códigos e leis federais.',
      url: 'https://www.planalto.gov.br/ccivil_03/',
      category: 'controle',
      enabled: true,
    },
    {
      id: 'ul_dou',
      label: 'Imprensa Nacional (DOU)',
      description: 'Publicações do Diário Oficial da União.',
      url: 'https://www.in.gov.br',
      category: 'governo',
      enabled: true,
    },
  ];
}

export function resolveEffectiveUsefulLinks(config?: Partial<InstitutionalSiteConfig> | null): UsefulLinkItem[] {
  const list = Array.isArray(config?.usefulLinks) ? config!.usefulLinks : buildDefaultUsefulLinks();
  return list.filter((item) => item && item.enabled !== false && Boolean(item.label?.trim()) && Boolean(item.url?.trim()));
}

export function buildDefaultSecretariatProfile(
  departmentName: string,
  institution?: Institution | null,
  siteConfig?: Partial<InstitutionalSiteConfig> | null
): SecretariatProfileConfig {
  const slug = normalizeSecretariatSlug(departmentName);
  const norm = slug;
  const instName = institution?.name || 'Prefeitura Municipal';
  const baseHours = siteConfig?.serviceHours || 'Segunda a Sexta, das 07h00 às 13h00';
  const baseAddress = siteConfig?.address || `Sede Administrativa — ${instName}`;
  const basePhone = siteConfig?.phone || institution?.contact_phone || '';
  const baseEmail = siteConfig?.email || '';

  if (norm.includes('saude')) {
    return {
      slug,
      departmentName,
      secretaryRole: 'Secretário(a) Municipal de Saúde',
      overview: `Responsável pela gestão do Sistema Único de Saúde (SUS) no âmbito de ${instName}, garantindo atenção básica, média complexidade, vigilância epidemiológica e assistência farmacêutica.`,
      mission: 'Promover, proteger e recuperar a saúde da população municipal com atendimento humanizado, equânime, ágil e resolutivo na rede SUS.',
      vision: 'Consolidar uma rede municipal de saúde preventiva, digitalizada e resolutiva, com acesso transparente a consultas, exames e medicamentos.',
      competencies: [
        'Gestão das Unidades Básicas de Saúde (UBS), ESF e pronto atendimento.',
        'Regulação de agendamentos médicos, exames e transporte sanitário.',
        'Assistência farmacêutica com controle RENAME/FEFO e dispensação à população.',
        'Vigilância sanitária, epidemiológica e campanhas de imunização.',
      ],
      address: baseAddress,
      phone: basePhone,
      email: baseEmail,
      serviceHours: baseHours,
      services: [
        {
          id: 'srv_saude_agendamento',
          title: 'Agendamento de Consultas & Exames SUS',
          description: 'Solicitação e acompanhamento de consultas médicas e procedimentos na rede municipal.',
          requirements: 'Cartão SUS, CPF e documento com foto.',
          channel: 'Online e presencial nas UBS',
          sla: 'Conforme disponibilidade da regulação',
          actionUrl: '/agendamento',
          actionLabel: 'Acessar Portal da Saúde',
        },
        {
          id: 'srv_saude_farmacia',
          title: 'Consulta de Medicamentos — Farmácia SUS',
          description: 'Verificação em tempo real da disponibilidade de medicamentos básicos na Farmácia Municipal.',
          requirements: 'Receituário médico válido, CPF e Cartão SUS.',
          channel: 'Online (consulta) e retirada presencial',
          sla: 'Atendimento imediato no balcão',
          actionUrl: '/farmaciasus',
          actionLabel: 'Consultar Estoque SUS',
        },
      ],
    };
  }

  if (norm.includes('educa') || norm.includes('ensino')) {
    return {
      slug,
      departmentName,
      secretaryRole: 'Secretário(a) Municipal de Educação',
      overview: `Coordena a Rede Municipal de Ensino de ${instName}, abrangendo educação infantil (creches e pré-escolas), ensino fundamental, transporte escolar e alimentação escolar.`,
      mission: 'Garantir educação pública inclusiva, gratuita e de qualidade social, assegurando aprendizagem integral, valorização profissional e transparência nas vagas.',
      vision: 'Elevar os indicadores educacionais do município (SAEB/IDEB) com gestão pedagógica moderna e acesso equitativo à escola.',
      competencies: [
        'Organização da rede escolar, matrículas, transferências e fila única da creche (CMEI).',
        'Acompanhamento pedagógico, formação docente, calendário letivo e frequência escolar.',
        'Gestão da merenda escolar (PNAE) e do transporte escolar rural e urbano.',
        'Emissão de certificados e histórico acadêmico da rede municipal.',
      ],
      address: baseAddress,
      phone: basePhone,
      email: baseEmail,
      serviceHours: baseHours,
      services: [
        {
          id: 'srv_edu_portal',
          title: 'Portal da Educação & Validação Escolar',
          description: 'Consulta ao calendário letivo, documentos e serviços educacionais da rede municipal.',
          requirements: 'Dados do aluno ou responsável legal.',
          channel: 'Portal Digital da Educação',
          sla: 'Disponível 24h online',
          actionUrl: '/educacao',
          actionLabel: 'Abrir Portal da Educação',
        },
        {
          id: 'srv_edu_creche',
          title: 'Fila Única da Creche / CMEI (Transparência)',
          description: 'Acompanhamento público e transparente da fila de vagas na educação infantil municipal.',
          requirements: 'CPF do responsável e protocolo de inscrição.',
          channel: 'Online (Portal CMEI) e presencial na Secretaria',
          sla: 'Atualização contínua conforme classificação',
          actionUrl: '/cmei',
          actionLabel: 'Consultar Fila CMEI',
        },
      ],
    };
  }

  if (norm.includes('fazenda') || norm.includes('financa') || norm.includes('tributo') || norm.includes('arrecad')) {
    return {
      slug,
      departmentName,
      secretaryRole: 'Secretário(a) Municipal de Fazenda / Finanças',
      overview: `Administra as finanças públicas, orçamento, contabilidade, arrecadação tributária e atendimento fiscal aos contribuintes e fornecedores de ${instName}.`,
      mission: 'Assegurar o equilíbrio fiscal, a justiça tributária e a transparência na aplicação dos recursos públicos em benefício da coletividade.',
      vision: 'Ser referência em gestão fazendária eficiente, digital e aderente aos padrões da Lei de Responsabilidade Fiscal e Transparência.',
      competencies: [
        'Arrecadação, fiscalização e cobrança de tributos municipais (IPTU, ISS, ITBI e taxas).',
        'Execução orçamentária, financeira, tesouraria e prestação de contas (RREO/RGF).',
        'Emissão de Certidões Negativas de Débitos (CND) e atendimento fiscal digital.',
        'Auditoria fiscal e conferência de Notas Fiscais de Serviços Eletrônicas (NFS-e).',
      ],
      address: baseAddress,
      phone: basePhone,
      email: baseEmail,
      serviceHours: baseHours,
      services: [
        ...(siteConfig?.cndMunicipalUrl
          ? [
              {
                id: 'srv_faz_cnd',
                title: 'Certidão Negativa de Débitos (CND Municipal)',
                description: 'Emissão de certidão fiscal municipal para cidadãos e empresas contribuintes.',
                requirements: 'CPF ou CNPJ e inscrição municipal/imobiliária.',
                channel: 'Online no portal tributário',
                sla: 'Emissão imediata para contribuintes regulares',
                actionUrl: siteConfig.cndMunicipalUrl,
                actionLabel: 'Emitir CND',
              },
            ]
          : []),
        {
          id: 'srv_faz_nf',
          title: 'Portal / Auditoria de Nota Fiscal Municipal',
          description: 'Consulta e conferência de documentos fiscais eletrônicos vinculados ao município.',
          requirements: 'Chave de acesso, número da nota ou CNPJ prestador.',
          channel: 'Portal Digital Tributário',
          sla: 'Disponível 24h',
          actionUrl: '/notafiscal',
          actionLabel: 'Acessar Portal Fiscal',
        },
      ],
    };
  }

  if (norm.includes('meio-ambiente') || norm.includes('ambiental') || norm.includes('sustentab')) {
    return {
      slug,
      departmentName,
      secretaryRole: 'Secretário(a) Municipal de Meio Ambiente',
      overview: `Conduz as políticas de preservação ambiental, licenciamento local, educação ambiental e fiscalização sustentável no território de ${instName}.`,
      mission: 'Conciliar desenvolvimento municipal e proteção dos recursos naturais por meio do licenciamento ágil e da educação ambiental.',
      vision: 'Promover um município ambientalmente equilibrado, com coleta, arborização e gestão hídrica sustentáveis.',
      competencies: [
        'Licenciamento e orientações ambientais de competência municipal.',
        'Proteção de nascentes, áreas verdes urbanas e arborização pública.',
        'Apoio à coleta seletiva, educação ambiental e denúncias de infrações.',
      ],
      address: baseAddress,
      phone: basePhone,
      email: baseEmail,
      serviceHours: baseHours,
      services: [
        {
          id: 'srv_amb_portal',
          title: 'Portal & Serviços Ambientais',
          description: 'Orientações sobre licenças, podas, denúncias ambientais e programas de sustentabilidade.',
          requirements: 'Dados do requerente e localização da área/ocorrência.',
          channel: 'Portal Ambiental e Ouvidoria',
          sla: 'Análise técnica conforme protocolo',
          actionUrl: '/meio-ambiente',
          actionLabel: 'Abrir Portal Ambiental',
        },
      ],
    };
  }

  if (norm.includes('assistencia') || norm.includes('social')) {
    return {
      slug,
      departmentName,
      secretaryRole: 'Secretário(a) Municipal de Assistência Social',
      overview: `Executa a Política Nacional de Assistência Social (SUAS) em ${instName}, operando os equipamentos CRAS, CREAS, Cadastro Único e proteção social básica e especial.`,
      mission: 'Garantir proteção social, acolhimento e fortalecimento de vínculos familiares e comunitários às famílias em situação de vulnerabilidade.',
      vision: 'Assegurar acesso digno aos direitos socioassistenciais, benefícios eventuais e inclusão produtiva.',
      competencies: [
        'Gestão do Cadastro Único (CadÚnico) e acompanhamento de programas de transferência de renda.',
        'Atendimento psicossocial nos equipamentos CRAS e CREAS.',
        'Apoio a conselhos municipais (CMAS, CMDCA, Conselho Tutelar) e serviços de convivência.',
      ],
      address: baseAddress,
      phone: basePhone,
      email: baseEmail,
      serviceHours: baseHours,
      services: [
        {
          id: 'srv_soc_cadunico',
          title: 'Atualização e Inclusão no Cadastro Único',
          description: 'Orientação e agendamento para atualização cadastral de programas sociais.',
          requirements: 'RG, CPF e comprovante de residência de todos os membros da família.',
          channel: 'Presencial no CRAS / Secretaria',
          sla: 'Atendimento por ordem ou agendamento local',
          actionUrl: '/ouvidoria',
          actionLabel: 'Falar com Atendimento',
        },
      ],
    };
  }

  if (norm.includes('obra') || norm.includes('infraestrutura') || norm.includes('servicos-publicos') || norm.includes('urbanismo')) {
    return {
      slug,
      departmentName,
      secretaryRole: 'Secretário(a) Municipal de Obras e Serviços Públicos',
      overview: `Executa a manutenção urbana e rural, infraestrutura viária, iluminação pública, drenagem, limpeza urbana e fiscalização de obras públicas de ${instName}.`,
      mission: 'Manter a cidade e as vias rurais limpas, seguras, iluminadas e estruturadas para a mobilidade e qualidade de vida dos cidadãos.',
      vision: 'Modernizar os serviços urbanos com atendimento ágil às demandas de manutenção comunicadas pela população.',
      competencies: [
        'Manutenção de iluminação pública, vias urbanas, estradas vicinais e pontes.',
        'Limpeza urbana, coleta de resíduos e zeladoria de praças e prédios públicos.',
        'Acompanhamento técnico de projetos, medições e obras contratadas.',
      ],
      address: baseAddress,
      phone: basePhone,
      email: baseEmail,
      serviceHours: baseHours,
      services: [
        {
          id: 'srv_obras_zeladoria',
          title: 'Solicitação de Manutenção Urbana & Iluminação',
          description: 'Registro de pedidos de reparo em iluminação pública, pavimentação, limpeza e vias.',
          requirements: 'Endereço exato ou ponto de referência e descrição da ocorrência.',
          channel: 'Portal de Serviços Públicos Digitais',
          sla: 'Vistoria programada após protocolo',
          actionUrl: '/servicos',
          actionLabel: 'Abrir Solicitação',
        },
      ],
    };
  }

  return {
    slug,
    departmentName,
    secretaryRole: `Titular / Direção — ${departmentName}`,
    overview: `Órgão integrante da estrutura administrativa da ${instName}, dedicado ao planejamento, execução e atendimento direto aos cidadãos e servidores nas atribuições de ${departmentName}.`,
    mission: `Executar as políticas públicas e rotinas administrativas de ${departmentName} com legalidade, transparência, economicidade e foco no atendimento ao cidadão.`,
    vision: 'Ofertar serviços públicos cada vez mais ágeis, acessíveis e integrados aos canais digitais do município.',
    competencies: [
      `Planejamento e coordenação das ações e programas vinculados à pasta de ${departmentName}.`,
      'Atendimento presencial e digital de requerimentos, protocolos e informações públicas.',
      'Publicação regular de portarias, editais e atos administrativos no Diário Oficial do Município.',
    ],
    address: baseAddress,
    phone: basePhone,
    email: baseEmail,
    serviceHours: baseHours,
    services: [
      {
        id: `srv_gen_atendimento_${slug.slice(0, 18)}`,
        title: `Protocolo e Informações — ${departmentName}`,
        description: `Solicitações, pedidos de acesso à informação (e-SIC) e atendimento ao cidadão referentes à pasta de ${departmentName}.`,
        requirements: 'Documento de identificação e descrição clara da solicitação.',
        channel: 'Ouvidoria / e-SIC Online e atendimento presencial',
        sla: 'Conforme prazo legal da Lei de Acesso à Informação',
        actionUrl: '/ouvidoria',
        actionLabel: 'Acessar Ouvidoria / e-SIC',
      },
    ],
  };
}

export function resolveSecretariatProfile(
  departmentName: string,
  config?: Partial<InstitutionalSiteConfig> | null,
  institution?: Institution | null
): SecretariatProfileConfig {
  const base = buildDefaultSecretariatProfile(departmentName, institution, config);
  const slug = base.slug;
  const custom = config?.secretariatProfiles?.[slug];
  if (!custom) return base;

  const customCompetencies = Array.isArray(custom.competencies)
    ? custom.competencies.map((c) => c.trim()).filter(Boolean)
    : [];
  const customServices = Array.isArray(custom.services)
    ? custom.services.filter((s) => s && s.title?.trim())
    : [];
  const customIndicators = Array.isArray(custom.indicators)
    ? custom.indicators.filter((i) => i && i.name?.trim())
    : [];
  const customResults = Array.isArray(custom.results)
    ? custom.results.filter((r) => r && r.title?.trim())
    : [];
  const customAwards = Array.isArray(custom.awards)
    ? custom.awards.filter((a) => a && a.title?.trim())
    : [];

  return {
    ...base,
    ...custom,
    slug,
    departmentName,
    secretaryName: custom.secretaryName?.trim() || base.secretaryName,
    secretaryRole: custom.secretaryRole?.trim() || base.secretaryRole,
    secretaryBio: custom.secretaryBio?.trim() || '',
    secretaryPhotoUrl: custom.secretaryPhotoUrl?.trim() || '',
    resultsSummary: custom.resultsSummary?.trim() || '',
    overview: custom.overview?.trim() || base.overview,
    mission: custom.mission?.trim() || base.mission,
    vision: custom.vision?.trim() || base.vision,
    address: custom.address?.trim() || base.address,
    phone: custom.phone?.trim() || base.phone,
    email: custom.email?.trim() || base.email,
    serviceHours: custom.serviceHours?.trim() || base.serviceHours,
    competencies: customCompetencies.length > 0 ? customCompetencies : base.competencies,
    services: customServices.length > 0 ? customServices : base.services,
    indicators: customIndicators,
    results: customResults,
    awards: customAwards,
  };
}

export function getSuggestedIndicatorsForDepartment(departmentName: string): SecretariatIndicatorItem[] {
  const norm = normalizeSecretariatSlug(departmentName);
  const currentYear = String(new Date().getFullYear());

  if (norm.includes('saude')) {
    return [
      {
        id: 'ind_saude_esf',
        name: 'Cobertura Atenção Básica (ESF)',
        value: 'Informar %',
        target: 'Meta SUS: 85%+',
        progress: 0,
        period: currentYear,
        source: 'e-SUS / Ministério da Saúde',
        trend: 'up',
      },
      {
        id: 'ind_saude_vac',
        name: 'Cobertura Vacinal Infantil',
        value: 'Informar %',
        target: 'Meta PNI: 95%',
        progress: 0,
        period: currentYear,
        source: 'SI-PNI / Ministério da Saúde',
        trend: 'highlight',
      },
      {
        id: 'ind_saude_previne',
        name: 'Indicador Sintético Final (ISF)',
        value: 'Informar nota',
        target: 'Meta nacional: 7.0+',
        progress: 0,
        period: currentYear,
        source: 'SISAB / Atenção Primária',
        trend: 'up',
      },
    ];
  }

  if (norm.includes('educa') || norm.includes('ensino')) {
    return [
      {
        id: 'ind_edu_ideb_ai',
        name: 'IDEB — Anos Iniciais',
        value: 'Informar nota',
        target: 'Meta INEP projetada',
        progress: 0,
        period: currentYear,
        source: 'INEP / MEC',
        trend: 'highlight',
      },
      {
        id: 'ind_edu_alfab',
        name: 'Taxa de Alfabetização na Idade Certa',
        value: 'Informar %',
        target: 'Meta Compromisso Criança Alfabetizada',
        progress: 0,
        period: currentYear,
        source: 'SAEB / Secretaria de Educação',
        trend: 'up',
      },
      {
        id: 'ind_edu_freq',
        name: 'Frequência Escolar Média (LDB)',
        value: 'Informar %',
        target: 'Mínimo legal: 75%',
        progress: 75,
        period: currentYear,
        source: 'Diário Escolar / Gestão 360',
        trend: 'stable',
      },
    ];
  }

  if (norm.includes('fazenda') || norm.includes('financa') || norm.includes('tributo')) {
    return [
      {
        id: 'ind_faz_iegm',
        name: 'IEGM Fiscal (Índice de Efetividade)',
        value: 'Informar nota',
        target: 'Faixa A / B+',
        progress: 0,
        period: currentYear,
        source: 'Tribunal de Contas (TCE)',
        trend: 'highlight',
      },
      {
        id: 'ind_faz_pntp',
        name: 'Nível Transparência Pública (PNTP)',
        value: 'Informar selo',
        target: 'Diamante / Ouro / Prata',
        progress: 0,
        period: currentYear,
        source: 'ATRICON / TCE',
        trend: 'up',
      },
    ];
  }

  return [
    {
      id: `ind_gen_atend_${norm.slice(0, 12)}`,
      name: 'Índice de Resolubilidade de Demandas',
      value: 'Informar %',
      target: 'Meta da Gestão: 90%+',
      progress: 0,
      period: currentYear,
      source: `Controle Interno — ${departmentName}`,
      trend: 'up',
    },
    {
      id: `ind_gen_prazo_${norm.slice(0, 12)}`,
      name: 'Tempo Médio de Atendimento ao Cidadão',
      value: 'Informar dias',
      target: 'Padrão Carta de Serviços',
      progress: 0,
      period: currentYear,
      source: 'Ouvidoria / e-SIC',
      trend: 'highlight',
    },
  ];
}

export function clampPopupDuration(seconds: unknown): number {
  const num = Number(seconds);
  if (!Number.isFinite(num)) return DEFAULT_POPUP_DURATION_SECONDS;
  return Math.min(120, Math.max(2, Math.round(num)));
}

export function clampPopupAutoClose(seconds: unknown): number {
  const num = Number(seconds);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(600, Math.max(5, Math.round(num)));
}

export function createEmptySitePopup(index = 0): SitePopupItem {
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `popup_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    enabled: true,
    title: '',
    badge: 'Aviso Oficial',
    description: '',
    imageUrl: '',
    actionLabel: '',
    actionUrl: '',
    durationSeconds: DEFAULT_POPUP_DURATION_SECONDS,
    startDate: '',
    endDate: '',
  };
}

export function normalizePopupItem(raw: Partial<SitePopupItem> | null | undefined, index = 0): SitePopupItem {
  const base = createEmptySitePopup(index);
  if (!raw || typeof raw !== 'object') return base;
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : base.id,
    enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : true,
    title: typeof raw.title === 'string' ? raw.title : '',
    badge: typeof raw.badge === 'string' ? raw.badge : base.badge,
    description: typeof raw.description === 'string' ? raw.description : '',
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
    actionLabel: typeof raw.actionLabel === 'string' ? raw.actionLabel : '',
    actionUrl: typeof raw.actionUrl === 'string' ? raw.actionUrl : '',
    durationSeconds: clampPopupDuration(raw.durationSeconds),
    startDate: typeof raw.startDate === 'string' ? raw.startDate : '',
    endDate: typeof raw.endDate === 'string' ? raw.endDate : '',
  };
}

export function normalizePopupCarousel(partial?: Partial<PopupCarouselConfig> | null): PopupCarouselConfig {
  const rawItems = Array.isArray(partial?.items) ? partial.items : [];
  return {
    enabled: partial?.enabled !== undefined ? Boolean(partial.enabled) : true,
    autoplay: partial?.autoplay !== undefined ? Boolean(partial.autoplay) : true,
    autoCloseSeconds: clampPopupAutoClose(partial?.autoCloseSeconds),
    items: rawItems.slice(0, MAX_SITE_POPUPS).map((item, idx) => normalizePopupItem(item, idx)),
  };
}

function getLocalIsoDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPopupScheduleStatus(
  item: SitePopupItem,
  nowDate = new Date()
): 'inactive' | 'scheduled' | 'expired' | 'empty' | 'active' {
  if (!item.enabled) return 'inactive';
  const hasContent = Boolean(item.title.trim() || item.description.trim() || item.imageUrl.trim());
  if (!hasContent) return 'empty';
  const today = getLocalIsoDate(nowDate);
  if (item.startDate && today < item.startDate) return 'scheduled';
  if (item.endDate && today > item.endDate) return 'expired';
  return 'active';
}

export function getActiveSitePopups(
  config?: Partial<InstitutionalSiteConfig> | null,
  nowDate = new Date()
): SitePopupItem[] {
  const carousel = normalizePopupCarousel(config?.popupCarousel);
  if (!carousel.enabled) return [];
  return carousel.items.filter((item) => getPopupScheduleStatus(item, nowDate) === 'active');
}

export function mergeSiteConfig(
  institution: Institution | null | undefined,
  partial?: Partial<InstitutionalSiteConfig> | null
): InstitutionalSiteConfig {
  const defaults = buildDefaultSiteConfig(institution);
  if (!partial) return defaults;

  return {
    ...defaults,
    ...partial,
    customColor: partial.customColor || (partial.primaryColor ? THEME_COLOR_HEX_MAP[partial.primaryColor] : defaults.customColor),
    cndMunicipalUrl: partial.cndMunicipalUrl !== undefined ? partial.cndMunicipalUrl : defaults.cndMunicipalUrl,
    usefulLinks: Array.isArray(partial.usefulLinks) ? partial.usefulLinks : defaults.usefulLinks,
    secretariatProfiles:
      partial.secretariatProfiles && typeof partial.secretariatProfiles === 'object'
        ? partial.secretariatProfiles
        : defaults.secretariatProfiles,
    mourningMode: {
      ...defaults.mourningMode,
      ...(partial.mourningMode || {}),
    },
    popupCarousel: normalizePopupCarousel(partial.popupCarousel),
    socialLinks: {
      ...defaults.socialLinks,
      ...(partial.socialLinks || {}),
    },
    sections: {
      ...defaults.sections,
      ...(partial.sections || {}),
    },
  };
}

export function extractSiteConfigFromInstitution(institution?: Institution | null): InstitutionalSiteConfig {
  const certLinks = parseCertLinks(institution?.cert_links);
  const fromCertLinks = certLinks.__institutional_site as Partial<InstitutionalSiteConfig> | undefined;
  const fromColumn = (institution as any)?.site_config as Partial<InstitutionalSiteConfig> | undefined;

  let fromLocal: Partial<InstitutionalSiteConfig> | undefined;
  if (institution?.id && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey(institution.id));
      if (raw) fromLocal = JSON.parse(raw);
    } catch {
      // ignora erro de localStorage
    }
  }

  return mergeSiteConfig(institution, {
    ...(fromColumn || {}),
    ...(fromCertLinks || {}),
    ...(fromLocal && (!fromCertLinks?.updatedAt || (fromLocal.updatedAt && fromLocal.updatedAt > fromCertLinks.updatedAt))
      ? fromLocal
      : {}),
  });
}

export function normalizeCustomDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export async function saveInstitutionalSiteConfig(
  institution: Institution,
  config: InstitutionalSiteConfig
): Promise<{ success: boolean; error?: string; savedConfig: InstitutionalSiteConfig }> {
  const normalizedDomain = normalizeCustomDomain(config.customDomain || '');
  const payload: InstitutionalSiteConfig = {
    ...config,
    customDomain: normalizedDomain,
    popupCarousel: normalizePopupCarousel(config.popupCarousel),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey(institution.id), JSON.stringify(payload));
    } catch {
      // ignora erro de quota
    }
  }

  if (!institution.id || isDemoEnvironment(institution)) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SITE_CONFIG_UPDATED_EVENT, {
          detail: { institutionId: institution.id, config: payload },
        })
      );
    }
    return { success: true, savedConfig: payload };
  }

  const existingCertLinks = parseCertLinks(institution.cert_links);
  const nextCertLinks = {
    ...existingCertLinks,
    __institutional_site: payload,
  };

  try {
    // Primeiro tenta salvar também cnpj/contact_phone/cert_links (colunas existentes em public.institutions)
    const updatePayload: Record<string, any> = {
      cert_links: nextCertLinks,
    };
    if (payload.cnpj) updatePayload.cnpj = payload.cnpj;
    if (payload.phone) updatePayload.contact_phone = payload.phone;

    const { error } = await supabase
      .from('institutions')
      .update(updatePayload)
      .eq('id', institution.id);

    if (error) {
      return { success: false, error: error.message, savedConfig: payload };
    }

    // Tentativa best-effort para colunas opcionais custom_domain e site_config (caso migração aplicada)
    await supabase
      .from('institutions')
      .update({
        custom_domain: normalizedDomain || null,
        site_config: payload,
      })
      .eq('id', institution.id);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SITE_CONFIG_UPDATED_EVENT, {
          detail: { institutionId: institution.id, config: payload },
        })
      );
    }

    return { success: true, savedConfig: payload };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar configurações do site', savedConfig: payload };
  }
}

export function useInstitutionalSiteConfig(institution?: Institution | null) {
  const [config, setConfig] = useState<InstitutionalSiteConfig>(() =>
    extractSiteConfigFromInstitution(institution)
  );
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const initial = extractSiteConfigFromInstitution(institution);
    setConfig(initial);

    if (!institution?.id || isDemoEnvironment(institution)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name, subdomain, logo_url, cnpj, contact_phone, cert_links')
        .eq('id', institution.id)
        .maybeSingle();

      if (!error && data) {
        const mergedInst = { ...institution, ...data } as Institution;
        setConfig(extractSiteConfigFromInstitution(mergedInst));
      }
    } catch {
      // mantém estado inicial se offline
    } finally {
      setLoading(false);
    }
  }, [institution?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.institutionId || detail.institutionId === institution?.id) {
        if (detail?.config) {
          setConfig(mergeSiteConfig(institution, detail.config));
        } else {
          reload();
        }
      }
    };
    window.addEventListener(SITE_CONFIG_UPDATED_EVENT, handler);
    return () => window.removeEventListener(SITE_CONFIG_UPDATED_EVENT, handler);
  }, [institution, reload]);

  return { config, setConfig, loading, reload };
}

