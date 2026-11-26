/**
 * Utilitários compartilhados de segurança para endpoints Serverless / Edge (api/*)
 * - Validação de origem CORS com allowlist estrita (sem wildcard '*' nem *.vercel.app aberto)
 * - Verificação de JWT do Supabase Auth no servidor
 * - Rate limiting em duas camadas: L1 em memória + L2 distribuído no Supabase (`service_role`)
 */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function normalizeEnvHost(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedProjectVercelHost(host: string): boolean {
  const deploymentHosts = [
    normalizeEnvHost(process.env.VERCEL_URL),
    normalizeEnvHost(process.env.VERCEL_BRANCH_URL),
    normalizeEnvHost(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ].filter((h): h is string => Boolean(h));

  if (deploymentHosts.includes(host)) {
    return true;
  }

  const slug = (process.env.VERCEL_PROJECT_SLUG || '').trim().toLowerCase();
  if (slug && /^[a-z0-9-]+$/.test(slug)) {
    if (host === `${slug}.vercel.app`) return true;
    if (host.startsWith(`${slug}-`) && host.endsWith('.vercel.app')) return true;
  }

  return false;
}

export function resolveAllowedOrigin(originHeader?: string | null): string {
  if (!originHeader) return 'https://gestao360sistema.com.br';
  const clean = originHeader.trim();

  const customOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (customOrigins.includes(clean)) {
    return clean;
  }

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase();
    const isOfficial =
      host === 'gestao360sistema.com.br' ||
      host.endsWith('.gestao360sistema.com.br') ||
      isAllowedProjectVercelHost(host) ||
      host === 'localhost' ||
      host === '127.0.0.1';

    if (isOfficial) {
      return clean;
    }
  } catch {
    // Origem malformada cai no domínio padrão seguro
  }

  return 'https://gestao360sistema.com.br';
}

export function checkRateLimit(key: string, maxRequests: number = 30, windowMs: number = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Rate limit distribuído (multi-instância serverless) apoiado na tabela
 * `public.security_rpc_rate_limits` via RPC `check_public_rpc_rate_limit` com `service_role`.
 * Mantém L1 local (`checkRateLimit`) como barreira imediata e fallback resiliente.
 */
export async function checkRateLimitAsync(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000,
): Promise<boolean> {
  if (!checkRateLimit(key, maxRequests, windowMs)) {
    return false;
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return true;
  }

  const separatorIdx = key.indexOf(':');
  const bucket = separatorIdx > 0 ? `api:${key.slice(0, separatorIdx)}` : 'api:default';
  const subject = separatorIdx > 0 ? key.slice(separatorIdx + 1) : key;
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_public_rpc_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_bucket: bucket,
        p_subject: subject,
        p_max_attempts: maxRequests,
        p_window_seconds: windowSeconds,
      }),
    });

    if (!resp.ok) {
      return true;
    }

    const allowed = (await resp.json()) as unknown;
    if (allowed === false) {
      rateLimitStore.set(key, { count: maxRequests, resetAt: Date.now() + windowMs });
      return false;
    }

    return true;
  } catch {
    // Fallback resiliente: se o RPC distribuído falhar por rede, vale a trava L1 já aplicada
    return true;
  }
}

export function isPayloadTooLarge(value: unknown, maxBytes: number): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    return new TextEncoder().encode(value).length > maxBytes;
  }
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length > maxBytes;
  } catch {
    return true;
  }
}

export async function verifySupabaseAuthHeader(
  authHeader?: string | null
): Promise<{ ok: boolean; userId?: string; status?: number; error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Autenticação obrigatória (token Bearer ausente).' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Token de autenticação vazio.' };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: 'Configuração do Supabase ausente no servidor.' };
  }

  try {
    const resp = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`
      }
    });

    if (!resp.ok) {
      return { ok: false, status: 401, error: 'Sessão inválida ou expirada. Faça login novamente.' };
    }

    const user = (await resp.json()) as { id?: string };
    if (!user?.id) {
      return { ok: false, status: 401, error: 'Usuário não identificado no token.' };
    }

    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, status: 503, error: 'Falha ao validar sessão no servidor de autenticação.' };
  }
}
