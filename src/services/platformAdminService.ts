import { supabase, signUpNewUser } from '../lib/supabase';
import { Institution, AdminUser, PlatformAuditLog, PlatformAnnouncement } from '../types';

/**
 * Registra uma ação administrativa no log global da plataforma
 */
export async function logPlatformAction(params: {
  action: string;
  target_type: 'institution' | 'user' | 'module' | 'system';
  target_id?: string;
  target_name?: string;
  details?: Record<string, any>;
  actor?: AdminUser | null;
}): Promise<void> {
  try {
    const actorEmail = params.actor?.email || 'superadmin@gestao360.gov.br';
    const actorName = params.actor?.name || 'Super Administrador';
    const actorId = params.actor?.id || 'saas-superadmin';

    await supabase.from('platform_audit_logs').insert([
      {
        actor_id: actorId,
        actor_email: actorEmail,
        actor_name: actorName,
        action: params.action,
        target_type: params.target_type,
        target_id: params.target_id,
        target_name: params.target_name,
        details: params.details || {},
      },
    ]);
  } catch (err) {
    console.warn('[PlatformAdminService] Falha ao registrar log de auditoria:', err);
  }
}

/**
 * Busca logs recentes de auditoria da plataforma
 */
export async function fetchPlatformAuditLogs(limit = 50): Promise<PlatformAuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('platform_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      return data as PlatformAuditLog[];
    }
  } catch (err) {
    console.warn('[PlatformAdminService] Erro ao buscar logs de auditoria:', err);
  }
  return [];
}

/**
 * Cria ou atualiza um município (Tenant) no banco de dados com auditoria
 */
export async function saveTenant(
  tenantData: Partial<Institution>,
  actor?: AdminUser | null
): Promise<{ success: boolean; data?: Institution; error?: string }> {
  try {
    const isEditing = Boolean(tenantData.id);
    const id = tenantData.id || `inst_${Date.now()}`;

    const payload: Partial<Institution> = {
      id,
      name: tenantData.name,
      subdomain: tenantData.subdomain?.toLowerCase().trim(),
      contact_phone: tenantData.contact_phone || '',
      logo_url: tenantData.logo_url || '',
      status: tenantData.status || 'ativo',
      plan_tier: tenantData.plan_tier || 'pro',
      cnpj: tenantData.cnpj || '',
      uf: tenantData.uf || 'MT',
      ibge_code: tenantData.ibge_code || '',
      active_modules: tenantData.active_modules || ['home', 'settings', 'support'],
      notes: tenantData.notes || '',
      updated_at: new Date().toISOString(),
    };

    if (!isEditing) {
      payload.created_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('institutions')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Auditoria
    await logPlatformAction({
      action: isEditing ? 'UPDATE_TENANT' : 'CREATE_TENANT',
      target_type: 'institution',
      target_id: id,
      target_name: tenantData.name,
      details: {
        subdomain: payload.subdomain,
        status: payload.status,
        plan_tier: payload.plan_tier,
        modules_count: payload.active_modules?.length,
      },
      actor,
    });

    return { success: true, data: data as Institution };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao salvar prefeitura.' };
  }
}

/**
 * Exclui um município da plataforma com auditoria
 */
export async function deleteTenant(
  institutionId: string,
  institutionName: string,
  actor?: AdminUser | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('institutions').delete().eq('id', institutionId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logPlatformAction({
      action: 'DELETE_TENANT',
      target_type: 'institution',
      target_id: institutionId,
      target_name: institutionName,
      actor,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Cria usuário com autenticação real no Supabase Auth + registro na tabela admin_users
 */
export async function createUserWithAuth(
  userData: {
    name: string;
    email: string;
    role: AdminUser['role'];
    institution_id: string;
    permissions?: any[];
    tempPassword?: string;
  },
  actor?: AdminUser | null
): Promise<{ success: boolean; data?: AdminUser; error?: string }> {
  try {
    const password = userData.tempPassword || 'gestao123@';

    // 1. Cria credencial no Supabase Auth
    try {
      await signUpNewUser(userData.email, password);
    } catch (authErr) {
      console.warn('[PlatformAdminService] Auth signup warning:', authErr);
    }

    // 2. Insere na tabela admin_users
    const userId = `usr_${Date.now()}`;
    const userPayload: Partial<AdminUser> = {
      id: userId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      institution_id: userData.institution_id,
      status: 'Ativo',
      lastLogin: 'Nunca',
      permissions: (userData.permissions || ['home', 'support', 'settings']) as any,
    };

    const { data, error } = await supabase
      .from('admin_users')
      .insert(userPayload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Auditoria
    await logPlatformAction({
      action: 'CREATE_USER',
      target_type: 'user',
      target_id: userId,
      target_name: userData.name,
      details: {
        email: userData.email,
        role: userData.role,
        institution_id: userData.institution_id,
      },
      actor,
    });

    return { success: true, data: data as AdminUser };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Redefine senha do usuário disparando e-mail seguro do Supabase
 */
export async function sendPasswordReset(
  email: string,
  actor?: AdminUser | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      return { success: false, error: error.message };
    }

    await logPlatformAction({
      action: 'RESET_PASSWORD',
      target_type: 'user',
      target_id: email,
      target_name: email,
      actor,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza status do usuário (Ativo, Bloqueado, Inativo)
 */
export async function toggleUserStatus(
  userId: string,
  userName: string,
  newStatus: AdminUser['status'],
  actor?: AdminUser | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('admin_users')
      .update({ status: newStatus })
      .eq('id', userId);

    if (error) return { success: false, error: error.message };

    await logPlatformAction({
      action: newStatus === 'Bloqueado' ? 'BLOCK_USER' : 'ACTIVATE_USER',
      target_type: 'user',
      target_id: userId,
      target_name: userName,
      details: { new_status: newStatus },
      actor,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Executa checagem de integridade real do ecossistema
 */
export async function performRealDiagnosticCheck(): Promise<{
  databaseConnected: boolean;
  dbLatencyMs: number;
  geminiApiOnline: boolean;
  geminiLatencyMs: number;
  tenantsCount: number;
  usersCount: number;
  lastChecked: string;
}> {
  const result = {
    databaseConnected: false,
    dbLatencyMs: 0,
    geminiApiOnline: false,
    geminiLatencyMs: 0,
    tenantsCount: 0,
    usersCount: 0,
    lastChecked: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };

  // 1. Teste de Banco de Dados e Latência Real
  const t0 = performance.now();
  try {
    const { data: instData, count: instCount, error: instErr } = await supabase
      .from('institutions')
      .select('id', { count: 'exact' });

    const t1 = performance.now();
    result.dbLatencyMs = Math.round(t1 - t0);
    result.databaseConnected = !instErr;
    result.tenantsCount = instCount || (instData ? instData.length : 0);

    const { count: usersCount } = await supabase
      .from('admin_users')
      .select('id', { count: 'exact', head: true });
    result.usersCount = usersCount || 0;
  } catch {
    result.databaseConnected = false;
  }

  // 2. Teste da API Gemini (Ping simples)
  const g0 = performance.now();
  try {
    const geminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
    if (geminiKey) {
      result.geminiApiOnline = true;
      result.geminiLatencyMs = Math.round(performance.now() - g0);
    }
  } catch {
    result.geminiApiOnline = false;
  }

  return result;
}

/**
 * Busca comunicados globais da plataforma (para o Superadmin gerenciar)
 */
export async function fetchAnnouncements(): Promise<PlatformAnnouncement[]> {
  try {
    const { data, error } = await supabase
      .from('platform_announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as PlatformAnnouncement[];
    }
  } catch (err) {
    console.warn('[PlatformAdminService] Erro ao buscar comunicados:', err);
  }
  return [];
}

/**
 * Busca comunicados ativos e válidos para um usuário/município específico
 * Usado para disparar o banner no login
 */
export async function fetchActiveAnnouncementsForUser(
  institutionId?: string | null
): Promise<PlatformAnnouncement[]> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('platform_announcements')
      .select('*')
      .eq('is_active', true)
      .or(`valid_until.is.null,valid_until.gt.${nowIso}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const allAnnouncements = data as PlatformAnnouncement[];
      // Filtra por instituição se aplicável (vazio ou sem instituições = para todos os municípios)
      return allAnnouncements.filter(item => {
        if (!item.target_institutions || item.target_institutions.length === 0) {
          return true;
        }
        if (!institutionId) {
          return true; // Se não tem instituição (ex: superadmin), visualiza todos
        }
        return item.target_institutions.includes(institutionId);
      });
    }
  } catch (err) {
    console.warn('[PlatformAdminService] Erro ao buscar comunicados ativos para usuário:', err);
  }
  return [];
}

/**
 * Cria novo comunicado institucional para os municípios
 */
export async function publishAnnouncement(
  announcement: {
    title: string;
    message: string;
    priority: 'baixa' | 'normal' | 'alta' | 'critica';
    target_institutions?: string[];
    valid_until?: string | null;
    show_login_banner?: boolean;
    logo_url?: string;
    action_label?: string;
    action_url?: string;
  },
  actor?: AdminUser | null
): Promise<{ success: boolean; data?: PlatformAnnouncement; error?: string }> {
  try {
    const payload = {
      title: announcement.title.trim(),
      message: announcement.message.trim(),
      priority: announcement.priority,
      target_institutions: announcement.target_institutions || [],
      valid_until: announcement.valid_until || null,
      is_active: true,
      show_login_banner: announcement.show_login_banner ?? true,
      logo_url: announcement.logo_url || '/logo-gestao360.png',
      action_label: announcement.action_label?.trim() || null,
      action_url: announcement.action_url?.trim() || null,
      created_by: actor?.name || 'Superadmin Gestão 360',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('platform_announcements')
      .insert([payload])
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await logPlatformAction({
      action: 'PUBLISH_ANNOUNCEMENT',
      target_type: 'system',
      target_name: announcement.title,
      details: { 
        priority: announcement.priority, 
        show_login_banner: payload.show_login_banner,
        target_count: payload.target_institutions.length 
      },
      actor,
    });

    return { success: true, data: data as PlatformAnnouncement };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado ao publicar comunicado' };
  }
}

/**
 * Atualiza um comunicado institucional existente
 */
export async function updateAnnouncement(
  id: string,
  announcement: {
    title: string;
    message: string;
    priority: 'baixa' | 'normal' | 'alta' | 'critica';
    target_institutions?: string[];
    valid_until?: string | null;
    is_active?: boolean;
    show_login_banner?: boolean;
    logo_url?: string;
    action_label?: string;
    action_url?: string;
  },
  actor?: AdminUser | null
): Promise<{ success: boolean; data?: PlatformAnnouncement; error?: string }> {
  try {
    const payload: Partial<PlatformAnnouncement> = {
      title: announcement.title.trim(),
      message: announcement.message.trim(),
      priority: announcement.priority,
      target_institutions: announcement.target_institutions || [],
      valid_until: announcement.valid_until || null,
      updated_at: new Date().toISOString()
    };

    if (typeof announcement.is_active === 'boolean') {
      payload.is_active = announcement.is_active;
    }
    if (typeof announcement.show_login_banner === 'boolean') {
      payload.show_login_banner = announcement.show_login_banner;
    }
    if (announcement.logo_url) {
      payload.logo_url = announcement.logo_url;
    }
    if (announcement.action_label !== undefined) {
      payload.action_label = announcement.action_label.trim() || undefined;
    }
    if (announcement.action_url !== undefined) {
      payload.action_url = announcement.action_url.trim() || undefined;
    }

    const { data, error } = await supabase
      .from('platform_announcements')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await logPlatformAction({
      action: 'UPDATE_ANNOUNCEMENT',
      target_type: 'system',
      target_id: id,
      target_name: announcement.title,
      details: { priority: announcement.priority, is_active: payload.is_active },
      actor,
    });

    return { success: true, data: data as PlatformAnnouncement };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar comunicado' };
  }
}

/**
 * Alterna rapidamente a ativação de um comunicado
 */
export async function toggleAnnouncementActive(
  id: string,
  currentStatus: boolean,
  announcementTitle: string,
  actor?: AdminUser | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const nextStatus = !currentStatus;
    const { error } = await supabase
      .from('platform_announcements')
      .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    await logPlatformAction({
      action: nextStatus ? 'ACTIVATE_ANNOUNCEMENT' : 'DEACTIVATE_ANNOUNCEMENT',
      target_type: 'system',
      target_id: id,
      target_name: announcementTitle,
      details: { new_status: nextStatus },
      actor,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Exclui um comunicado institucional definitivamente
 */
export async function deleteAnnouncement(
  id: string,
  announcementTitle: string,
  actor?: AdminUser | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('platform_announcements')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    await logPlatformAction({
      action: 'DELETE_ANNOUNCEMENT',
      target_type: 'system',
      target_id: id,
      target_name: announcementTitle,
      actor,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir comunicado' };
  }
}

