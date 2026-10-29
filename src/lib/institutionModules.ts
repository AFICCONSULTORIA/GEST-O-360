import { Institution } from '../types';
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

  return normalizedSet.has(moduleId.toLowerCase().trim());
}

// Preserva o parâmetro ?inst= nos links públicos quando o acesso não for via subdomínio direto
export function withInstitutionQuery(path: string, institution?: Institution | null): string {
  if (typeof window === 'undefined') return path;
  const params = new URLSearchParams(window.location.search);
  const instParam = params.get('inst') || params.get('subdomain') || params.get('municipio');
  if (!instParam && !institution?.subdomain) return path;

  // Se o acesso atual usa ?inst= na URL, preserva no link de destino
  if (instParam) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}inst=${encodeURIComponent(instParam)}`;
  }

  return path;
}

