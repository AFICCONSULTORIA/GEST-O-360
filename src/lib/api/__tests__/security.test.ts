import { describe, it, expect } from 'vitest';
import {
  resolveAllowedOrigin,
  checkRateLimit,
  isPayloadTooLarge,
} from '../../../../api/_utils/security';
import { sanitizeRichHtml, escapeHtmlText } from '../../../utils/sanitizeHtml';
import { sanitizeGazetteHtml } from '../../../modules/DiarioOficial/utils/sanitizeGazetteHtml';

describe('Blindagem de Cibersegurança (CORS, Rate Limit, Payload e Anti-XSS)', () => {
  describe('resolveAllowedOrigin', () => {
    it('aceita domínios oficiais e localhost', () => {
      expect(resolveAllowedOrigin('https://gestao360sistema.com.br')).toBe('https://gestao360sistema.com.br');
      expect(resolveAllowedOrigin('https://torixoreu.gestao360sistema.com.br')).toBe('https://torixoreu.gestao360sistema.com.br');
      expect(resolveAllowedOrigin('https://preview-123.vercel.app')).toBe('https://preview-123.vercel.app');
      expect(resolveAllowedOrigin('http://localhost:5173')).toBe('http://localhost:5173');
    });

    it('rejeita origens externas ou domínios spoofing e cai no domínio oficial', () => {
      expect(resolveAllowedOrigin('https://evil.com')).toBe('https://gestao360sistema.com.br');
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
  });
});
