import { supabase } from './supabase';
import { Institution } from '../types';

const RESERVED_PATH_PREFIXES = new Set([
  'site',
  'portal-oficial',
  'diario',
  'diario-oficial',
  'noticias',
  'agendamento',
  'farmaciasus',
  'servicos',
  'educacao',
  'cmei',
  'votacao',
  'votação',
  'meio-ambiente',
  'ouvidoria',
  'validar',
  'validar-documento',
  'validar-certificado',
  'autenticidade',
  'validar-abastecimento',
  'validar-combustivel',
  'valida-abastecimento',
  'notafiscal',
  'nota-fiscal',
  'formulario',
  'form',
  'responder',
  'servidores',
  'login',
  'entrar',
  'landingpage',
  'lanningpage',
  'landing',
  'lanning',
  'vendas',
  'apresentacao',
  'institucional',
  'proposta',
  'proposta-comercial',
  'apresentacao-comercial',
  'proposta-prefeitura',
  'admin',
  'api',
  'assets',
]);

const PORTAL_HOST_PREFIXES = new Set(['diario', 'diariooficial', 'site']);

const cleanHostname = (rawHost?: string): string => {
  const host = (rawHost ?? (typeof window !== 'undefined' ? window.location.hostname : ''))
    .toLowerCase()
    .trim()
    .replace(/:\d+$/, '');
  return host.startsWith('www.') ? host.slice(4) : host;
};

/**
 * Extrai prefixo de subdomínio de portal (ex: 'diario.torixoreu.gestao360sistema.com.br' -> 'diario').
 */
export const getPortalHostPrefix = (rawHost?: string): 'diario' | 'site' | null => {
  const hostname = cleanHostname(rawHost);
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return null;

  const parts = hostname.split('.');
  const first = parts[0];
  if (first === 'diario' || first === 'diariooficial') {
    if (hostname.endsWith('.vercel.app') && parts.length <= 3) return null;
    return parts.length >= 3 ? 'diario' : null;
  }
  if (first === 'site') {
    if (hostname.endsWith('.vercel.app') && parts.length <= 3) return null;
    return parts.length >= 3 ? 'site' : null;
  }
  return null;
};

/**
 * Extrai o subdomínio de município apenas do hostname (ex: 'torixoreu.gestao360sistema.com.br' -> 'torixoreu').
 */
export const getHostnameSubdomain = (rawHost?: string): string | null => {
  const hostname = cleanHostname(rawHost);
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'localhost.localdomain') {
    return null;
  }

  const parts = hostname.split('.');

  // Ignora host padrão de preview da Vercel (<projeto>.vercel.app tem 3 partes)
  if (hostname.endsWith('.vercel.app')) {
    if (parts.length <= 3) return null;
    if (PORTAL_HOST_PREFIXES.has(parts[0]) && parts.length > 4) {
      return parts[1].toLowerCase();
    }
    return parts[0].toLowerCase();
  }

  // Desenvolvimento com subdomínios locais (ex: torixoreu.localhost ou diario.torixoreu.localhost)
  if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
    if (PORTAL_HOST_PREFIXES.has(parts[0]) && parts.length > 2) {
      return parts[1].toLowerCase();
    }
    return parts[0].toLowerCase();
  }

  // Produção (ex: torixoreu.gestao360sistema.com.br ou diario.torixoreu.gestao360sistema.com.br)
  const isMultiPartTld = hostname.endsWith('.com.br') || hostname.endsWith('.gov.br') || hostname.endsWith('.leg.br');
  const basePartsCount = isMultiPartTld ? 3 : 2;

  if (parts.length > basePartsCount + 1 && PORTAL_HOST_PREFIXES.has(parts[0])) {
    return parts[1].toLowerCase();
  }

  if (parts.length > basePartsCount) {
    return parts[0].toLowerCase();
  }

  return null;
};

/**
 * Extrai slug de município do primeiro segmento de rota no '/' (ex: '/torixoreu', '/torixoreu/diario' -> 'torixoreu').
 */
export const extractPathTenantSlug = (
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/'
): string | null => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const first = decodeURIComponent(segments[0]).toLowerCase().trim();
  if (!first || first.includes('.') || RESERVED_PATH_PREFIXES.has(first)) {
    return null;
  }

  return /^[a-z0-9_-]{2,64}$/i.test(first) ? first : null;
};

/**
 * Remove o prefixo '/<municipio>' do pathname para roteamento interno limpo (ex: '/torixoreu/diario' -> '/diario').
 */
export const stripTenantFromPath = (
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/',
  tenantSlug?: string | null
): string => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  const first = decodeURIComponent(segments[0]).toLowerCase().trim();
  if (RESERVED_PATH_PREFIXES.has(first)) {
    return `/${segments.join('/')}`;
  }

  const candidateSlug = extractPathTenantSlug(pathname);
  const normalizedTarget = tenantSlug?.toLowerCase().trim();

  if ((normalizedTarget && first === normalizedTarget) || (!normalizedTarget && candidateSlug === first)) {
    const rest = segments.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }

  return `/${segments.join('/')}`;
};

/**
 * Indica se o acesso já ocorre em um host dedicado do município (subdomínio ou domínio próprio).
 */
export const isDedicatedTenantHost = (rawHost?: string): boolean => {
  const hostname = rawHost ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  if (!hostname) return false;
  return isCustomMunicipalDomain(hostname) || Boolean(getHostnameSubdomain(hostname));
};

/**
 * Extrai o identificador do município (por query ?inst=, subdomínio de host ou slug no '/').
 */
export const getSubdomain = (): string | null => {
  if (typeof window === 'undefined') return null;

  // 1. Prioridade Máxima: Parâmetros explícitos na URL (?inst=, ?subdomain=, ?municipio=)
  if (window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const paramInst = params.get('inst') || params.get('subdomain') || params.get('municipio');
    if (paramInst && paramInst.trim() !== '') {
      return paramInst.trim().toLowerCase();
    }
  }

  // 2. Subdomínio no hostname (ex: torixoreu.gestao360sistema.com.br)
  const hostSub = getHostnameSubdomain();
  if (hostSub) return hostSub;

  // 3. Slug de município organizado diretamente no '/' (ex: /torixoreu ou /torixoreu/diario)
  return extractPathTenantSlug(window.location.pathname);
};

const PLATFORM_HOST_SUFFIXES = ['gestao360sistema.com.br', 'vercel.app', 'localhost', '127.0.0.1'];

export const isCustomMunicipalDomain = (hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''): boolean => {
  const clean = hostname.toLowerCase().trim();
  if (!clean) return false;
  return !PLATFORM_HOST_SUFFIXES.some(suffix => clean === suffix || clean.endsWith(`.${suffix}`));
};

/**
 * Busca uma instituição cadastrada pelo domínio próprio configurado no Site Institucional (ex: www.municipio.mt.gov.br).
 */
export const fetchInstitutionByCustomDomain = async (
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''
): Promise<Institution | null> => {
  const cleanHost = hostname.toLowerCase().trim().replace(/:\d+$/, '');
  if (!cleanHost || !isCustomMunicipalDomain(cleanHost)) return null;

  const bareHost = cleanHost.startsWith('www.') ? cleanHost.slice(4) : cleanHost;
  const withWwwHost = cleanHost.startsWith('www.') ? cleanHost : `www.${cleanHost}`;

  try {
    const { data, error } = await supabase.from('institutions').select('*');
    if (error || !data) return null;

    const matched = (data as Institution[]).find((inst) => {
      const candidates: string[] = [];
      if (inst.custom_domain) candidates.push(inst.custom_domain.toLowerCase().trim());

      try {
        const certLinks = typeof inst.cert_links === 'string' ? JSON.parse(inst.cert_links) : inst.cert_links;
        const siteDomain = certLinks?.__institutional_site?.customDomain;
        if (typeof siteDomain === 'string' && siteDomain.trim()) {
          candidates.push(siteDomain.toLowerCase().trim());
        }
      } catch {
        // ignora JSON inválido
      }

      return candidates.some((c) => {
        const normalized = c.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        const cBare = normalized.startsWith('www.') ? normalized.slice(4) : normalized;
        return normalized === cleanHost || normalized === bareHost || normalized === withWwwHost || cBare === bareHost;
      });
    });

    return matched || null;
  } catch (err) {
    console.warn('Erro ao resolver domínio próprio institucional:', err);
    return null;
  }
};

/**
 * Busca os detalhes da instituição (município) correspondente ao subdomínio ou ID no Supabase.
 */
export const fetchInstitutionBySubdomain = async (subdomain: string): Promise<Institution | null> => {
  const cleanSubdomain = subdomain.toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .or(`subdomain.ilike.${cleanSubdomain},id.eq.${cleanSubdomain}`)
      .maybeSingle();

    if (!error && data) {
      return data as Institution;
    }

    if (error) {
      console.warn(`Consulta ao Supabase para instituição '${cleanSubdomain}':`, error.message);
    }
  } catch (err) {
    console.error('Erro de conexão ao buscar instituição pelo subdomínio:', err);
  }

  // Fallback para o município oficial ativo em produção
  const fallbackMunicipalities: Institution[] = [
    {
      id: 'inst_1',
      name: 'Prefeitura Municipal de Torixoréu',
      subdomain: 'torixoreu',
      logo_url: 'https://www.torixoreu.mt.gov.br/images/logoHeadernovo.png'
    }
  ];

  const matched = fallbackMunicipalities.find(
    m => m.subdomain.toLowerCase() === cleanSubdomain || m.id.toLowerCase() === cleanSubdomain
  );

  return matched || null;
};
