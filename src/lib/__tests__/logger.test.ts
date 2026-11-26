import { describe, it, expect, vi, afterEach } from 'vitest';

const showToastMock = vi.fn();
vi.mock('../../components/ui/Toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

import { reportError, sanitizeErrorSummary, bestEffort } from '../logger';

afterEach(() => {
  vi.restoreAllMocks();
  showToastMock.mockClear();
});

describe('logger (reportError & LGPD)', () => {
  it('mascara CPF, e-mail, Bearer token e JWT no resumo de erro (LGPD)', () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlMTIzNDU2';
    const err = new Error(
      `Falha ao sincronizar CPF 123.456.789-00 (doc 98765432100), email servidor@prefeitura.gov.br com Bearer segredo123 e ${fakeJwt}`,
    );
    const clean = sanitizeErrorSummary(err);
    expect(clean).not.toContain('123.456.789-00');
    expect(clean).not.toContain('98765432100');
    expect(clean).not.toContain('servidor@prefeitura.gov.br');
    expect(clean).not.toContain('segredo123');
    expect(clean).not.toContain(fakeJwt);
    expect(clean).toContain('[CPF_REDACTED]');
    expect(clean).toContain('[EMAIL_REDACTED]');
    expect(clean).toContain('[JWT_REDACTED]');
  });

  it('registra no console.error e aciona showToast apenas quando toastMessage é informado', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    reportError('fleetFuel.sync', new Error('Timeout de rede'));
    expect(errSpy).toHaveBeenCalledTimes(1);
    expect(showToastMock).not.toHaveBeenCalled();

    reportError('fleetFuel.save', new Error('Permissão negada'), {
      toastMessage: 'Não foi possível salvar os dados da frota.',
      toastType: 'warning',
    });
    expect(errSpy).toHaveBeenCalledTimes(2);
    expect(showToastMock).toHaveBeenCalledWith('Não foi possível salvar os dados da frota.', 'warning');

    expect(() => bestEffort('localStorage indisponível')).not.toThrow();
  });
});
