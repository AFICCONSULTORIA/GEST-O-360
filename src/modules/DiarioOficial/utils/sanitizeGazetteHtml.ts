/**
 * Utilitário leve e seguro para formatar e sanitizar conteúdos oficiais do Diário Oficial
 * (aceita tanto texto simples quanto HTML básico de formatação vindo do editor com timbre).
 */

const ALLOWED_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'p',
  'br',
  'div',
  'span',
  'ul',
  'ol',
  'li',
  'h3',
  'h4',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'blockquote',
  'hr',
]);

const ALLOWED_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify']);

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const looksLikeHtmlContent = (value?: string): boolean => {
  if (!value) return false;
  return /<\/?(p|div|br|b|strong|i|em|u|ul|ol|li|table|tr|td|th|h3|h4|span)\b[^>]*>/i.test(value);
};

export const plainTextToRichHtml = (text: string): string => {
  if (!text) return '';
  if (looksLikeHtmlContent(text)) return sanitizeGazetteHtml(text);
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
};

export const sanitizeGazetteHtml = (rawHtml: string): string => {
  if (!rawHtml) return '';
  if (!looksLikeHtmlContent(rawHtml)) {
    return plainTextToRichHtml(rawHtml);
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(rawHtml);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  const sanitizeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object') {
      return '';
    }

    const childrenHtml = Array.from(el.childNodes).map(sanitizeNode).join('');

    if (!ALLOWED_TAGS.has(tag)) {
      return childrenHtml;
    }

    if (tag === 'br' || tag === 'hr') {
      return `<${tag} />`;
    }

    const attrs: string[] = [];

    const alignAttr = el.getAttribute('align')?.toLowerCase();
    const styleAlign = el.style?.textAlign?.toLowerCase();
    const resolvedAlign = ALLOWED_ALIGN_VALUES.has(styleAlign || '')
      ? styleAlign
      : ALLOWED_ALIGN_VALUES.has(alignAttr || '')
      ? alignAttr
      : '';

    if (resolvedAlign) {
      attrs.push(`style="text-align: ${resolvedAlign};"`);
    }

    if (tag === 'td' || tag === 'th') {
      const colspan = Number(el.getAttribute('colspan'));
      if (Number.isInteger(colspan) && colspan > 1 && colspan <= 10) {
        attrs.push(`colspan="${colspan}"`);
      }
    }

    const attrString = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
    return `<${tag}${attrString}>${childrenHtml}</${tag}>`;
  };

  return Array.from(doc.body.childNodes).map(sanitizeNode).join('');
};

