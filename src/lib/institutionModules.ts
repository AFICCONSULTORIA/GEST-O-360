import { Institution } from '../types';
import { isDedicatedTenantHost } from './subdomain';
import { isDemoEnvironment } from './demoManager';

// Módulos que ainda são apenas Placeholders ("Em Desenvolvimento") e nunca devem aparecer para prefeituras reais
export const UNFINISHED_PLACEHOLDER_MODULES: string[] = [
  'obras',
  'tributos',
  'agricultura',
  'esporte',
  'planejamento'
];

// Extrai a lista de módulos contratados/ativos da prefeitura (suporta coluna dedicada active_modules, cert_links.__active_modules ou cache local)
export function getInstitutionActiveModules(institution?: Institution | null): string[] | null {
  if (!institution) return null;

  if (Array.isArray(institution.active_modules) && institution.active_modules.length > 0) {
    return institution.active_modules;
  }

  try {
    const certLinks = typeof institution.cert_links === 'string'
      ? JSON.parse(institution.cert_links)
      : institution.cert_links;
    if (certLinks && Array.isArray(certLinks.__active_modules) && certLinks.__active_modules.length > 0) {
      return certLinks.__active_modules;
    }
  } catch {
    // ignore JSON error
  }

  try {
    const localSaved = localStorage.getItem(`@gestao360:active_modules_${institution.id}`);
    if (localSaved) {
      const parsed = JSON.parse(localSaved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore localStorage error
  }

  return null;
}

// Verifica se um determinado módulo está habilitado para a prefeitura atual
export function isInstitutionModuleActive(
  institution: Institution | null | undefined,
  moduleId: string
): boolean {
  // Módulos estruturais básicos sempre disponíveis no painel interno
  if (moduleId === 'home' || moduleId === 'settings' || moduleId === 'support') {
    return true;
  }

  // Ocultar módulos inacabados ("Botão em desenvolvimento") em produção
  if (UNFINISHED_PLACEHOLDER_MODULES.includes(moduleId) && !isDemoEnvironment(institution)) {
    return false;
  }

  const activeList = getInstitutionActiveModules(institution);
  // Se a prefeitura ainda não tiver restrição explícita configurada no SaaS Control Center, libera os módulos prontos
  if (!activeList) {
    return true;
  }

  const normalizedSet = new Set(activeList.map(m => m.toLowerCase().trim()));

  // Equivalências entre sub-views e módulos principais
  if (moduleId === 'consultorio_medico') return normalizedSet.has('saude') || normalizedSet.has('consultorio_medico');
  if (moduleId === 'admin_financas') return normalizedSet.has('financas') || normalizedSet.has('admin_financas');
  if (moduleId === 'fleet_fuel') return normalizedSet.has('fleet_fuel') || normalizedSet.has('patrimonio') || normalizedSet.has('controls');
  if (moduleId === 'education') return normalizedSet.has('education') || normalizedSet.has('educacao');
  if (moduleId === 'course_certificates') return normalizedSet.has('certificates') || normalizedSet.has('education') || normalizedSet.has('course_certificates') || normalizedSet.has('gestao');

  return normalizedSet.has(moduleId.toLowerCase().trim());
}

// Organiza links públicos de município por caminho limpo no '/' (ex: /torixoreu, /torixoreu/diario)
// quando no domínio principal, mantendo rotas raiz quando em subdomínio ou domínio próprio.
export function withInstitutionQuery(path: string, institution?: Institution | null): string {
  const [rawPathPart, rawSearchPart] = path.split('?');
  const normalizedPath = rawPathPart
    ? rawPathPart.startsWith('/')
      ? rawPathPart
      : `/${rawPathPart}`
    : '/';

  if (typeof window === 'undefined') return path;

  const currentParams = new URLSearchParams(window.location.search);
  const instParam =
    currentParams.get('inst') || currentParams.get('subdomain') || currentParams.get('municipio');
  const isDemoQuery = currentParams.get('demo') === 'true';

  const appendParams = (targetPath: string) => {
    const outParams = new URLSearchParams(rawSearchPart || '');
    if (isDemoQuery && !outParams.has('demo')) {
      outParams.set('demo', 'true');
    }
    const qs = outParams.toString();
    return qs ? `${targetPath}?${qs}` : targetPath;
  };

  if (isDedicatedTenantHost()) {
    return appendParams(normalizedPath);
  }

  const slug = (institution?.subdomain || institution?.id || instParam || '').trim().toLowerCase();
  if (!slug || slug === 'demo') {
    if (instParam) {
      const outParams = new URLSearchParams(rawSearchPart || '');
      outParams.set('inst', instParam);
      if (isDemoQuery) outParams.set('demo', 'true');
      return `${normalizedPath}?${outParams.toString()}`;
    }
    return appendParams(normalizedPath);
  }

  const tenantPrefix = `/${encodeURIComponent(slug)}`;
  if (normalizedPath === '/' || normalizedPath === '/site' || normalizedPath === '/portal-oficial') {
    return appendParams(tenantPrefix);
  }

  if (normalizedPath === tenantPrefix || normalizedPath.startsWith(`${tenantPrefix}/`)) {
    return appendParams(normalizedPath);
  }

  return appendParams(`${tenantPrefix}${normalizedPath}`);
}

