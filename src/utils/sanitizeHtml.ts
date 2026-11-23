/**
 * Utilitário centralizado de sanitização HTML anti-XSS usando DOMPurify no navegador
 * com fallback seguro para ambientes Node/SSR sem DOM.
 */

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a', 'b', 'strong', 'i', 'em', 'u', 's', 'p', 'br', 'div', 'span',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'blockquote', 'hr', 'img'
];

const ALLOWED_ATTR = [
  'style', 'class', 'align', 'colspan', 'rowspan',
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
  'data-smart-var'
];

export function escapeHtmlText(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeRichHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  if (typeof window !== 'undefined' && typeof DOMPurify?.sanitize === 'function') {
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|data:image\/(?:png|jpeg|jpg|gif|webp);base64,|\/)/i,
    });
  }

  // Fallback determinístico em ambiente Node/SSR sem DOM
  return rawHtml
    .replace(/<(script|style|iframe|object|embed|form|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|input|link|meta)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\b(?:javascript|vbscript)\s*:/gi, 'blocked:')
    .replace(/data\s*:\s*text\/html/gi, 'blocked:');
}
