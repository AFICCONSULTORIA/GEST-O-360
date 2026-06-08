import { AdminUser, View } from '../types';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

/**
 * Retorna o nível de permissão exato de um usuário para um determinado módulo.
 * Suporta o formato granular moderno "modulo:nivel" (ex: "protocol:edit")
 * e mantém total compatibilidade com o formato clássico "modulo", associando
 * o nível ao papel (role) global do usuário.
 */
export function getModulePermissionLevel(user: AdminUser | null | undefined, moduleId: View): PermissionLevel {
  if (!user) return 'none';
  
  // Super Admin tem acesso total a tudo por definição
  if (user.role === 'Super Admin') return 'admin';

  // Se o usuário estiver inativo, ele não tem acesso a nada
  if (user.status === 'Inativo') return 'none';

  // O módulo de suporte é sempre acessível a todos os usuários ativos
  if (moduleId === 'support') return 'admin';

  const permissions = user.permissions || [];

  // 1. Procurar por permissão granular específica no formato "modulo:nivel"
  const adminPattern = `${moduleId}:admin`;
  const editPattern = `${moduleId}:edit`;
  const viewPattern = `${moduleId}:view`;

  if (permissions.includes(adminPattern as any)) return 'admin';
  if (permissions.includes(editPattern as any)) return 'edit';
  if (permissions.includes(viewPattern as any)) return 'view';

  // 2. Procurar por permissão no formato clássico "modulo" (compatibilidade retroativa)
  if (permissions.includes(moduleId)) {
    // Associa o nível ao papel global do usuário
    if (user.role === 'Admin') return 'admin';
    if (user.role === 'Editor') return 'edit';
    if (user.role === 'Visualizador') return 'view';
    return 'view'; // Fallback seguro
  }

  // 3. Sem permissão declarada para este módulo
  return 'none';
}

/**
 * Verifica se o usuário tem o nível de permissão necessário (ou superior) para um módulo.
 * A hierarquia é: admin > edit > view > none.
 */
export function hasPermission(
  user: AdminUser | null | undefined,
  moduleId: View,
  requiredLevel: PermissionLevel
): boolean {
  if (!user) return false;
  if (user.role === 'Super Admin') return true;
  if (user.status === 'Inativo') return false;

  // O módulo de suporte é sempre acessível a todos os usuários ativos
  if (moduleId === 'support') return true;

  const currentLevel = getModulePermissionLevel(user, moduleId);

  const levels: Record<PermissionLevel, number> = {
    'none': 0,
    'view': 1,
    'edit': 2,
    'admin': 3
  };

  return levels[currentLevel] >= levels[requiredLevel];
}

/**
 * Traduz o nível de permissão para uma string amigável em português.
 */
export function getPermissionLevelLabel(level: PermissionLevel): string {
  switch (level) {
    case 'none': return 'Sem Acesso';
    case 'view': return 'Visualizar';
    case 'edit': return 'Editar';
    case 'admin': return 'Administrar';
  }
}
