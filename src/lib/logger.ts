/**
 * Logger estruturado do cliente com proteção LGPD e integração opcional com Toast.
 * - `reportError(context, error, options)`: registra falhas de rede/banco/regra sem vazar PII/tokens
 *   e opcionalmente exibe feedback amigável ao servidor público via `showToast`.
 * - `bestEffort(reason)`: marcador explícito e sem custo para operações best-effort legítimas
 *   (ex.: `localStorage` indisponível em navegação privada/SSR, autoplay bloqueado pelo navegador).
 */
import { showToast, type ToastType } from '../components/ui/Toast';

export interface ReportErrorOptions {
  /** Mensagem amigável opcional exibida ao usuário via Toast. */
  toastMessage?: string;
  /** Tipo visual do Toast (padrão: 'error'). */
  toastType?: ToastType;
}

const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._-]+/gi;
const CPF_FORMATTED_RE = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
const CPF_DIGITS_RE = /\b\d{11}\b/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function sanitizeErrorSummary(error: unknown): string {
  let raw: string;
  if (error instanceof Error) {
    raw = `${error.name}: ${error.message}`;
  } else if (typeof error === 'object' && error !== null) {
    const maybeMsg = (error as { message?: unknown; code?: unknown });
    const codePart = typeof maybeMsg.code === 'string' ? `[${maybeMsg.code}] ` : '';
    const msgPart = typeof maybeMsg.message === 'string' ? maybeMsg.message : 'Erro inesperado de objeto';
    raw = `${codePart}${msgPart}`;
  } else {
    raw = String(error ?? 'Erro desconhecido');
  }

  return raw
    .replace(JWT_RE, '[JWT_REDACTED]')
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(CPF_FORMATTED_RE, '[CPF_REDACTED]')
    .replace(CPF_DIGITS_RE, '[DOC_REDACTED]')
    .replace(EMAIL_RE, '[EMAIL_REDACTED]')
    .slice(0, 400);
}

export function reportError(context: string, error: unknown, options?: ReportErrorOptions): void {
  const summary = sanitizeErrorSummary(error);
  console.error(`[Gestão360][${context}] ${summary}`);

  if (options?.toastMessage) {
    showToast(options.toastMessage, options.toastType ?? 'error');
  }
}

/**
 * Documenta explicitamente em tempo de leitura que uma exceção de infraestrutura local
 * (como `localStorage`/`sessionStorage`/`BroadcastChannel`/autoplay) foi ignorada de propósito
 * por existir fallback seguro imediato.
 */
export function bestEffort(_reason: string, _error?: unknown): void {
  // no-op intencional documentado
}
