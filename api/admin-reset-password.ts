import { randomInt } from 'node:crypto';
import {
  checkRateLimitAsync,
  isPayloadTooLarge,
  resolveAllowedOrigin,
  verifySupabaseAuthHeader,
} from './_utils/security.js';

interface NodeRequest {
  method?: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
}

interface NodeResponse {
  setHeader: (name: string, value: string) => NodeResponse;
  status: (code: number) => NodeResponse;
  json: (payload: unknown) => NodeResponse;
  end: () => NodeResponse;
}

interface AdminUserRow {
  id: string;
  role?: string | null;
  status?: string | null;
  institution_id?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeRole(role?: string | null): string {
  return (role || '').trim().toLowerCase();
}

function isSuperAdminRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === 'super admin' || r === 'super_admin';
}

function isInstitutionAdminRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return isSuperAdminRole(role) || r === 'admin' || r === 'administrador' || r === 'prefeito';
}

function generateStrongTemporaryPassword(length: number = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*+-=?';
  const all = upper + lower + digits + symbols;

  const chars: string[] = [
    upper[randomInt(upper.length)],
    lower[randomInt(lower.length)],
    digits[randomInt(digits.length)],
    symbols[randomInt(symbols.length)],
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(all[randomInt(all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}

async function fetchAdminUserById(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
): Promise<{ ok: boolean; row?: AdminUserRow | null }> {
  const url = `${supabaseUrl}/rest/v1/admin_users?id=eq.${encodeURIComponent(userId)}&select=id,role,status,institution_id&limit=1`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) {
    return { ok: false };
  }

  const rows = (await resp.json()) as AdminUserRow[];
  return { ok: true, row: Array.isArray(rows) && rows.length > 0 ? rows[0] : null };
}

export default async function handler(req: NodeRequest, res: NodeResponse) {
  const allowedOrigin = resolveAllowedOrigin(req.headers?.origin);
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = await verifySupabaseAuthHeader(req.headers?.authorization);
  if (!auth.ok || !auth.userId) {
    return res.status(auth.status || 401).json({ error: auth.error || 'Não autorizado.' });
  }

  if (!(await checkRateLimitAsync(`admin-reset-password:${auth.userId}`, 10, 60_000))) {
    return res.status(429).json({ error: 'Muitas tentativas de redefinição. Aguarde um minuto.' });
  }

  if (isPayloadTooLarge(req.body, 4_096)) {
    return res.status(413).json({ error: 'Payload excede o limite permitido.' });
  }

  const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as {
    targetUserId?: unknown;
  };
  const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';

  if (!UUID_RE.test(targetUserId)) {
    return res.status(400).json({ error: 'Identificador do usuário alvo inválido.' });
  }

  const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawSupabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Configuração administrativa do servidor indisponível.' });
  }

  const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, '');

  try {
    // 1. Validar papel e instituição do chamador no banco
    const callerRes = await fetchAdminUserById(supabaseUrl, serviceRoleKey, auth.userId);
    if (!callerRes.ok) {
      return res.status(502).json({ error: 'Falha ao consultar permissões do administrador.' });
    }

    const caller = callerRes.row;
    const callerStatus = (caller?.status || 'Ativo').trim().toLowerCase();
    if (!caller || callerStatus === 'inativo' || callerStatus === 'bloqueado' || !isInstitutionAdminRole(caller.role)) {
      return res.status(403).json({ error: 'Apenas administradores ativos podem redefinir senhas.' });
    }

    // 2. Validar usuário alvo e isolamento entre prefeituras (multi-tenant)
    const targetRes = await fetchAdminUserById(supabaseUrl, serviceRoleKey, targetUserId);
    if (!targetRes.ok) {
      return res.status(502).json({ error: 'Falha ao consultar dados do usuário alvo.' });
    }

    const target = targetRes.row;
    if (!target) {
      return res.status(404).json({ error: 'Usuário alvo não encontrado.' });
    }

    const callerIsSuper = isSuperAdminRole(caller.role);
    const targetIsSuper = isSuperAdminRole(target.role);

    if (targetIsSuper && !callerIsSuper) {
      return res.status(403).json({ error: 'Permissão insuficiente para redefinir senha de Super Admin.' });
    }

    const callerInst = (caller.institution_id || '').trim();
    const targetInst = (target.institution_id || '').trim();

    if (!callerIsSuper && (!callerInst || !targetInst || callerInst !== targetInst)) {
      return res.status(403).json({ error: 'Acesso negado: usuário pertence a outra instituição.' });
    }

    // 3. Gerar senha temporária aleatória forte (nunca fixa) e atualizar via Auth Admin API
    const temporaryPassword = generateStrongTemporaryPassword(16);

    const authUpdateResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(targetUserId)}`, {
      method: 'PUT',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: temporaryPassword,
        user_metadata: {
          must_change_password: true,
          password_reset_at: new Date().toISOString(),
        },
      }),
    });

    if (!authUpdateResp.ok) {
      return res.status(502).json({ error: 'Não foi possível redefinir a senha no serviço de autenticação.' });
    }

    // 4. Marcar troca obrigatória no próximo login (last_login = 'Nunca')
    await fetch(`${supabaseUrl}/rest/v1/admin_users?id=eq.${encodeURIComponent(targetUserId)}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ last_login: 'Nunca' }),
    });

    // 5. Registrar trilha de auditoria imutável (sem gravar a senha nem dados sensíveis)
    await fetch(`${supabaseUrl}/rest/v1/security_admin_audit_logs`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        institution_id: targetInst || callerInst || 'global',
        actor_user_id: auth.userId,
        target_user_id: targetUserId,
        action: 'ADMIN_RESET_PASSWORD',
        metadata: { forced_change_on_next_login: true },
      }),
    });

    return res.status(200).json({
      ok: true,
      temporaryPassword,
      mustChangeOnNextLogin: true,
    });
  } catch (err) {
    console.error('[admin-reset-password] Erro interno ao processar redefinição:', err instanceof Error ? err.name : 'UnknownError');
    return res.status(500).json({ error: 'Erro interno ao processar a redefinição de senha.' });
  }
}
