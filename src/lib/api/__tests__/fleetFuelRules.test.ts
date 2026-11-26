/**
 * Regras críticas de Frotas e Combustível (antifraude, datas, numeração oficial).
 * Funções PURAS: não exigem banco. O cliente Supabase é mockado só para permitir o import.
 *
 * Convenção:
 *  - `it(...)`        -> comportamento que DEVE continuar valendo.
 *  - `it.fails(...)`  -> BUG CONHECIDO: o teste descreve o comportamento correto e hoje falha.
 *                        Quando o bug for corrigido o vitest acusa; aí troque `it.fails` por `it`.
 *  - `it.todo(...)`   -> decisão de negócio pendente.
 */
process.env.TZ = 'America/Sao_Paulo'; // regra de datas do sistema (UTC-3)

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../supabase', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn(), auth: { getUser: vi.fn(), getSession: vi.fn() } },
  supabaseAnon: { rpc: vi.fn(), from: vi.fn() },
}));
vi.mock('../../imageUpload', () => ({
  compressImageFile: vi.fn(),
  uploadOptimizedImageToStorage: vi.fn(),
}));

import {
  formatExactLiters,
  formatOrderNumber7Digits,
  isValidUUID,
  toBudgetUUID,
  sanitizeDateToISO,
} from '../fleetFuel';
import {
  calculateRealtimeMetrics,
  extractOrderDateYYYYMMDD,
  formatDateBRFromRaw,
  parseExcelDate,
  registerLegacyFuelOrdersBatch,
} from '../fleetFuelAudit';

describe('calculateRealtimeMetrics: matriz antifraude de combustível', () => {
  // veículo: tanque 50 L, meta 10 km/L
  const calc = (prev: number, cur: number, liters: number, expected = 10, tank = 50) =>
    calculateRealtimeMetrics(prev, cur, liters, expected, tank);

  it('consumo na meta: sem anomalia e sem bloqueio', () => {
    const r = calc(1000, 1100, 10);
    expect(r).toMatchObject({ delta_km: 100, calculated_km_per_liter: 10, deviation_percent: 0, anomaly_level: 'none', is_blocked: false });
  });

  it('primeiro registro do veículo (sem odômetro anterior): não calcula consumo nem bloqueia', () => {
    const r = calc(0, 500, 20);
    expect(r).toMatchObject({ delta_km: 0, calculated_km_per_liter: 0, anomaly_level: 'none', is_blocked: false });
  });

  it('odômetro regressivo OU igual ao anterior -> bloqueio crítico', () => {
    for (const cur of [900, 1000]) {
      const r = calc(1000, cur, 10);
      expect(r.anomaly_level).toBe('bloqueio_critico');
      expect(r.is_blocked).toBe(true);
      expect(r.anomaly_reason).toMatch(/Odômetro/);
    }
  });

  it('litros acima da capacidade do tanque -> bloqueio crítico (inclusive no 1º registro)', () => {
    expect(calc(1000, 1100, 60).is_blocked).toBe(true);
    expect(calc(0, 500, 60).is_blocked).toBe(true);
    expect(calc(1000, 1500, 50).is_blocked).toBe(false); // exatamente a capacidade (500 km / 50 L = 10 km/L) é permitido
  });

  it('fronteiras do semáforo: -15% ok, -15,01% amarelo, -25% amarelo, abaixo de -25% bloqueio', () => {
    expect(calc(0 + 1000, 1085, 10).deviation_percent).toBe(-15); // 8,5 km/L
    expect(calc(1000, 1085, 10).anomaly_level).toBe('none');
    expect(calc(1000, 1080, 10)).toMatchObject({ deviation_percent: -20, anomaly_level: 'alerta_amarelo', is_blocked: false });
    expect(calc(1000, 1075, 10)).toMatchObject({ deviation_percent: -25, anomaly_level: 'alerta_amarelo', is_blocked: false });
    expect(calc(1000, 1070, 10)).toMatchObject({ deviation_percent: -30, anomaly_level: 'bloqueio_critico', is_blocked: true });
  });

  it('consumo melhor que a meta nunca bloqueia por si só', () => {
    expect(calc(1000, 1150, 10)).toMatchObject({ deviation_percent: 50, is_blocked: false });
  });

  it('limita km/L a 99,99 e o desvio a ±999,99 (cabem nas colunas numéricas do banco)', () => {
    const r = calc(1000, 5000, 10, 0.5);
    expect(r.calculated_km_per_liter).toBe(99.99);
    expect(r.deviation_percent).toBeLessThanOrEqual(999.99);
  });

  it('prioridade das regras: odômetro regressivo vence capacidade e consumo', () => {
    expect(calc(1000, 900, 80).anomaly_reason).toMatch(/Odômetro/);
  });

  it('litros = 0 deve ser bloqueado (nunca vira 1 L "efetivo")', () => {
    const r = calc(1000, 1100, 0);
    expect(r.is_blocked).toBe(true);
    expect(r.anomaly_level).toBe('bloqueio_critico');
    expect(r.effective_liters).toBe(0);
    expect(r.calculated_km_per_liter).toBe(0);
  });

  it('litros negativos devem ser bloqueados', () => {
    const r = calc(1000, 1100, -5);
    expect(r.is_blocked).toBe(true);
    expect(r.anomaly_level).toBe('bloqueio_critico');
  });

  it('regra de negócio: consumo MUITO acima da meta (> +100%) gera alerta_amarelo para auditoria sem bloquear', () => {
    const r = calc(1000, 1250, 10, 10, 50); // 25 km/L vs meta 10 km/L (+150%)
    expect(r.deviation_percent).toBe(150);
    expect(r.anomaly_level).toBe('alerta_amarelo');
    expect(r.is_blocked).toBe(false);
    expect(r.anomaly_reason).toMatch(/100%/);
  });

  it('tanque com capacidade 0/não cadastrada: permite com alerta_amarelo de regularização (não bloqueia a frota)', () => {
    const r = calc(1000, 1350, 35, 10, 0); // 350 km / 35 L = 10 km/L (na meta), tanque 0
    expect(r.is_blocked).toBe(false);
    expect(r.anomaly_level).toBe('alerta_amarelo');
    expect(r.anomaly_reason).toMatch(/Capacidade do Tanque Não Cadastrada/i);

    const rFirst = calc(0, 500, 35, 10, 0); // 1º registro, tanque 0
    expect(rFirst.is_blocked).toBe(false);
    expect(rFirst.anomaly_level).toBe('alerta_amarelo');
    expect(rFirst.anomaly_reason).toMatch(/Capacidade do Tanque Não Cadastrada/i);
  });
});

describe('formatExactLiters (preservação contábil exata)', () => {
  it('mantém no mínimo 2 casas e preserva até 6 casas reais', () => {
    expect(formatExactLiters(48.5)).toBe('48.50');
    expect(formatExactLiters('10')).toBe('10.00');
    expect(formatExactLiters(48.123456)).toBe('48.123456');
    expect(formatExactLiters(1.1234567)).toBe('1.123457'); // corta na 6ª casa
  });

  it('entradas inválidas viram zero formatado, nunca "NaN"', () => {
    expect(formatExactLiters(null)).toBe('0.00');
    expect(formatExactLiters(undefined)).toBe('0.00');
    expect(formatExactLiters('abc')).toBe('0.00');
  });

  it('com minDecimals = 0 e valor inteiro não deve gerar "10." (ponto solto)', () => {
    expect(formatExactLiters(10, 0)).toBe('10');
    expect(formatExactLiters(10.5, 0)).toBe('10.5');
  });
});

describe('formatOrderNumber7Digits (numeração oficial)', () => {
  it('padroniza números com 7 dígitos', () => {
    expect(formatOrderNumber7Digits(22464)).toBe('0022464');
    expect(formatOrderNumber7Digits('0022464')).toBe('0022464');
    expect(formatOrderNumber7Digits(' 12 ')).toBe('0000012');
  });
  it('mantém identificadores alfanuméricos em maiúsculas e trata vazio', () => {
    expect(formatOrderNumber7Digits('adv-001')).toBe('ADV-001');
    expect(formatOrderNumber7Digits(null)).toBe('');
    expect(formatOrderNumber7Digits('   ')).toBe('');
  });
  it('é idempotente', () => {
    const once = formatOrderNumber7Digits(7);
    expect(formatOrderNumber7Digits(once)).toBe(once);
  });
});

describe('UUIDs de fichas orçamentárias', () => {
  it('isValidUUID', () => {
    expect(isValidUUID('00000000-0000-4000-8000-000000000011')).toBe(true);
    expect(isValidUUID('nao-e-uuid')).toBe(false);
    expect(isValidUUID(undefined)).toBe(false);
    expect(isValidUUID('')).toBe(false);
  });
  it('toBudgetUUID: determinístico a partir da ficha e sempre válido', () => {
    expect(toBudgetUUID('57')).toBe('00000000-0000-4000-8000-000000000057');
    expect(toBudgetUUID('Ficha 152')).toBe('00000000-0000-4000-8000-000000000152');
    expect(toBudgetUUID(undefined)).toBe('00000000-0000-4000-8000-000000000011');
    expect(toBudgetUUID('abc')).toBe('00000000-0000-4000-8000-000000000011');
    for (const v of ['1', '99', 'x', '00000000-0000-4000-8000-000000000011']) {
      expect(isValidUUID(toBudgetUUID(v))).toBe(true);
    }
  });
  it('preserva UUID já válido', () => {
    const u = '123e4567-e89b-42d3-a456-426614174000';
    expect(toBudgetUUID(u)).toBe(u);
  });
});

describe('sanitizeDateToISO (data para coluna DATE do Postgres)', () => {
  it('aceita ISO, BR (/ e -) e invertida', () => {
    expect(sanitizeDateToISO('2026-03-05')).toBe('2026-03-05');
    expect(sanitizeDateToISO('05/03/2026')).toBe('2026-03-05');
    expect(sanitizeDateToISO('5-3-2026')).toBe('2026-03-05');
    expect(sanitizeDateToISO('2026/3/5')).toBe('2026-03-05');
  });
  it('converte serial do Excel', () => {
    expect(sanitizeDateToISO(45000)).toBe('2023-03-15');
    expect(sanitizeDateToISO('45000')).toBe('2023-03-15');
  });
  it('vazio, nulo e lixo -> null', () => {
    expect(sanitizeDateToISO(null)).toBeNull();
    expect(sanitizeDateToISO('')).toBeNull();
    expect(sanitizeDateToISO('   ')).toBeNull();
    expect(sanitizeDateToISO('lixo')).toBeNull();
  });
  it('data inexistente (31/02/2026) deve virar null, não "2026-02-31" (o Postgres vai rejeitar o INSERT)', () => {
    expect(sanitizeDateToISO('31/02/2026')).toBeNull();
    expect(sanitizeDateToISO('29/02/2026')).toBeNull(); // 2026 não é bissexto
    expect(sanitizeDateToISO('29/02/2024')).toBe('2024-02-29'); // 2024 é bissexto
  });
  it('mês/dia inválidos em ISO (2026-13-45) devem virar null', () => {
    expect(sanitizeDateToISO('2026-13-45')).toBeNull();
    expect(sanitizeDateToISO('2026-02-31')).toBeNull();
  });
});

describe('Datas sem deslocamento de fuso (UTC-3)', () => {
  it('extractOrderDateYYYYMMDD', () => {
    expect(extractOrderDateYYYYMMDD('')).toBe('');
    expect(extractOrderDateYYYYMMDD(null)).toBe('');
    expect(extractOrderDateYYYYMMDD('2026-03-05')).toBe('2026-03-05');
    expect(extractOrderDateYYYYMMDD('2026-03-05T12:00:00.000Z')).toBe('2026-03-05'); // padrão meio-dia: não volta 1 dia
  });
  it('timestamp UTC de madrugada cai no dia anterior local (comportamento esperado em UTC-3)', () => {
    expect(extractOrderDateYYYYMMDD('2026-03-05T02:00:00.000Z')).toBe('2026-03-04');
  });
  it('formatDateBRFromRaw', () => {
    expect(formatDateBRFromRaw('2026-03-05')).toBe('05/03/2026');
    expect(formatDateBRFromRaw('')).toBe('-');
    expect(formatDateBRFromRaw(null)).toBe('-');
  });
});

describe('parseExcelDate (importação de canhotos legados)', () => {
  it('serial numérico, data BR e objeto Date', () => {
    expect(parseExcelDate(45000).startsWith('2023-03-15')).toBe(true);
    expect(parseExcelDate('05/03/2026').startsWith('2026-03-05')).toBe(true);
    expect(parseExcelDate('05/03/2026 14:30')).toMatch(/^2026-03-05T17:30/); // 14:30 local = 17:30Z
    expect(parseExcelDate(new Date('2026-03-05T10:00:00Z'))).toBe('2026-03-05T10:00:00.000Z');
  });
  it('valor inválido NÃO pode virar "agora" silenciosamente (fabrica data de abastecimento em dado contábil)', () => {
    const r = parseExcelDate('texto-invalido');
    const now = Date.now();
    expect(Math.abs(new Date(r).getTime() - now) < 60_000).toBe(false);
    expect(r).toBe('');
    expect(parseExcelDate('31/02/2026')).toBe('');
    expect(parseExcelDate('')).toBe('');
  });

  it('registerLegacyFuelOrdersBatch rejeita e lista linhas com data inválida preservando o número real da linha', async () => {
    const res = await registerLegacyFuelOrdersBatch([
      {
        plate: 'AAA-1111',
        driver_name: 'Condutor 1',
        station_name: 'Posto 1',
        supplied_at: 'data-invalida-linha-1',
        liters_supplied: 20,
        unit_price: 6.19,
        odometer_reading: 10000,
      },
      {
        plate: 'BBB-2222',
        driver_name: 'Condutor 2',
        station_name: 'Posto 1',
        supplied_at: '31/02/2026',
        liters_supplied: 30,
        unit_price: 6.19,
        odometer_reading: 20000,
      },
    ]);

    expect(res.successCount).toBe(0);
    expect(res.rejectedRows).toHaveLength(2);
    expect(res.rejectedRows[0]).toMatchObject({ rowNumber: 1, identifier: 'AAA-1111' });
    expect(res.rejectedRows[1]).toMatchObject({ rowNumber: 2, identifier: 'BBB-2222' });
    expect(res.errors[0]).toContain('Linha 1 (AAA-1111)');
    expect(res.errors[1]).toContain('Linha 2 (BBB-2222)');
  });
});

describe('Guarda anti-duplicação na emissão de requisições de abastecimento', () => {
  it('bloqueia chamadas concorrentes para o mesmo veículo, odômetro e litragem (duplo clique)', async () => {
    const { acquireOrderIssuanceLock, buildOrderIssuanceKey, releaseOrderIssuanceLock } = await import('../fleetOrderIssuanceGuard');
    const key = buildOrderIssuanceKey({
      institutionId: 'prefeitura-1',
      targetKey: 'veh-123',
      currentOdometer: 31401,
      litersAuthorized: 34.3,
    });
    expect(acquireOrderIssuanceLock(key)).toBe(true);
    expect(acquireOrderIssuanceLock(key)).toBe(false);
    releaseOrderIssuanceLock(key);
    expect(acquireOrderIssuanceLock(key)).toBe(true);
    releaseOrderIssuanceLock(key);
  });

  it('distingue colisão 23505 de requisição duplicada (mesmo veículo/odômetro/litros) vs. colisão legítima entre veículos distintos', async () => {
    const { isDuplicateFuelOrderCollision } = await import('../fleetOrderIssuanceGuard');
    const existing = {
      id: 'ord-1',
      order_number: '0022494',
      vehicle_id: 'veh-onix',
      current_odometer: 31401,
      liters_authorized: 34.3,
    };
    expect(
      isDuplicateFuelOrderCollision(existing, {
        vehicleId: 'veh-onix',
        currentOdometer: 31401,
        litersAuthorized: 34.3,
      }),
    ).toBe(true);

    expect(
      isDuplicateFuelOrderCollision(existing, {
        vehicleId: 'veh-outro-caminhao',
        currentOdometer: 88200,
        litersAuthorized: 120,
      }),
    ).toBe(false);
  });
});
