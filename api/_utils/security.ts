/**
 * Utilitários compartilhados de segurança para endpoints Serverless / Edge (api/*)
 * - Validação de origem CORS (sem wildcard '*' para origens desconhecidas)
 * - Verificação de JWT do Supabase Auth no servidor
 * - Rate limiting básico por IP/usuário em memória
 */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

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
      host.endsWith('.vercel.app') ||
      host === 'localhost' ||
      host === '127.0.0.1';

    if (isOfficial) {
      return clean;
    }
  } catch {
    // Origem malformada
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
