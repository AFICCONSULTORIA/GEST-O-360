import { describe, it, expect } from 'vitest';
import {
  resolveAllowedOrigin,
  checkRateLimit,
  isPayloadTooLarge,
} from '../../../../api/_utils/security';
import { sanitizeRichHtml, sanitizeSvgHtml, escapeHtmlText } from '../../../utils/sanitizeHtml';
import { generateHeaderHtml, generateFooterHtml, createDefaultTimbreData } from '../../../modules/Templates/timbrePresets';
import { sanitizeGazetteHtml } from '../../../modules/DiarioOficial/utils/sanitizeGazetteHtml';

describe('Blindagem de Cibersegurança (CORS, Rate Limit, Payload e Anti-XSS)', () => {
  describe('resolveAllowedOrigin', () => {
    it('aceita domínios oficiais, previews explícitos do projeto e localhost', () => {
      expect(resolveAllowedOrigin('https://gestao360sistema.com.br')).toBe('https://gestao360sistema.com.br');
      expect(resolveAllowedOrigin('https://torixoreu.gestao360sistema.com.br')).toBe('https://torixoreu.gestao360sistema.com.br');
      expect(resolveAllowedOrigin('http://localhost:5173')).toBe('http://localhost:5173');

      const prevVercelUrl = process.env.VERCEL_URL;
      process.env.VERCEL_URL = 'preview-123.vercel.app';
      try {
        expect(resolveAllowedOrigin('https://preview-123.vercel.app')).toBe('https://preview-123.vercel.app');
      } finally {
        if (prevVercelUrl === undefined) delete process.env.VERCEL_URL;
        else process.env.VERCEL_URL = prevVercelUrl;
      }
    });

    it('rejeita origens externas, *.vercel.app arbitrários ou domínios spoofing e cai no domínio oficial', () => {
      expect(resolveAllowedOrigin('https://evil.com')).toBe('https://gestao360sistema.com.br');
      expect(resolveAllowedOrigin('https://atacante.vercel.app')).toBe('https://gestao360sistema.com.br');
      expect(resolveAllowedOrigin('https://gestao360sistema.com.br.evil.com')).toBe('https://gestao360sistema.com.br');
      expect(resolveAllowedOrigin('not-a-valid-url')).toBe('https://gestao360sistema.com.br');
    });
  });

  describe('checkRateLimit', () => {
    it('permite requisições dentro do limite e bloqueia ao exceder', () => {
      const key = `test-rl-${Date.now()}`;
      expect(checkRateLimit(key, 3, 60_000)).toBe(true);
      expect(checkRateLimit(key, 3, 60_000)).toBe(true);
      expect(checkRateLimit(key, 3, 60_000)).toBe(true);
      expect(checkRateLimit(key, 3, 60_000)).toBe(false);
    });
  });

  describe('isPayloadTooLarge', () => {
    it('detecta payloads que excedem o limite em bytes', () => {
      expect(isPayloadTooLarge('abc', 10)).toBe(false);
      expect(isPayloadTooLarge('a'.repeat(100), 50)).toBe(true);
      expect(isPayloadTooLarge({ text: 'a'.repeat(100) }, 50)).toBe(true);
    });
  });

  describe('Sanitização anti-XSS (sanitizeRichHtml & sanitizeGazetteHtml)', () => {
    it('remove scripts, iframes, event handlers e URLs javascript:', () => {
      const malicious =
        '<p>Texto <strong>oficial</strong></p>' +
        '<script>alert(1)</script>' +
        '<img src="x" onerror="fetch(\'https://evil.com\')" />' +
        '<a href="javascript:alert(2)">Clique</a>' +
        '<iframe src="https://evil.com"></iframe>';

      const cleanRich = sanitizeRichHtml(malicious);
      expect(cleanRich).not.toContain('<script');
      expect(cleanRich).not.toContain('<iframe');
      expect(cleanRich).not.toContain('onerror=');
      expect(cleanRich).not.toContain('javascript:');
      expect(cleanRich).toContain('<strong>oficial</strong>');

      const cleanGazette = sanitizeGazetteHtml(malicious);
      expect(cleanGazette).not.toContain('<script');
      expect(cleanGazette).not.toContain('<iframe');
      expect(cleanGazette).not.toContain('onerror=');
      expect(cleanGazette).not.toContain('javascript:');
    });

    it('escapa caracteres especiais em textos de variáveis', () => {
      expect(escapeHtmlText('<img src=x onerror=alert(1)>')).toBe(
        '&lt;img src=x onerror=alert(1)&gt;'
      );
    });

    it('sanitizeSvgHtml preserva QR Code SVG e remove scripts, foreignObject e event handlers', () => {
      const svg =
        '<svg viewBox="0 0 21 21" width="210" height="210">' +
        '<rect width="21" height="21" fill="#fff"/>' +
        '<path d="M0 0h7v7H0z" fill="#000" onclick="alert(1)"/>' +
        '<script>alert(2)</script>' +
        '<foreignObject><div>xss</div></foreignObject>' +
        '</svg>';
      const clean = sanitizeSvgHtml(svg);
      expect(clean).toContain('<svg');
      expect(clean).toContain('<path');
      expect(clean).not.toContain('<script');
      expect(clean).not.toContain('foreignObject');
      expect(clean).not.toContain('onclick');
    });

    it('generateHeaderHtml e generateFooterHtml escapam campos de usuário contra XSS', () => {
      const base = createDefaultTimbreData(null);
      const hostile = {
        ...base,
        prefeitura: '<img src=x onerror=alert(1)>Prefeitura',
        secretaria: '<script>alert(2)</script>Educação',
        endereco: 'Rua A <svg onload=alert(3)>',
        logoUrl: 'javascript:alert(4)',
        accentColor: 'red; background:url(javascript:alert(5))',
      };
      const header = sanitizeRichHtml(generateHeaderHtml(hostile));
      const footer = sanitizeRichHtml(generateFooterHtml(hostile));
      expect(header).not.toContain('<script');
      expect(header).not.toContain('onerror=');
      expect(header).not.toContain('javascript:');
      expect(header).toContain('&lt;img');
      expect(footer).not.toContain('onload=');
      expect(footer).toContain('&lt;svg');
    });
  });
});
