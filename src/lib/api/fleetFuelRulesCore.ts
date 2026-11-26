/**
 * Núcleo puro de validação contábil, datas estritas e matriz antifraude de Frotas & Combustível.
 * Sem efeitos colaterais de rede ou storage para máxima testabilidade e determinismo.
 */
import type { AnomalyLevel, ConsumptionAuditCalculation } from './fleetFuelAudit';

/**
 * Valida se ano, mês (1..12) e dia formam uma data real do calendário gregoriano via Date.UTC.
 */
function buildStrictISODate(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1900 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const utcMs = Date.UTC(year, month - 1, day);
  const check = new Date(utcMs);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formata litragem sem arredondamento destrutivo para preservação contábil exata.
 * Mantém no mínimo `minDecimals` casas decimais e preserva até 6 casas reais se existirem,
 * nunca gerando ponto decimal solto quando `minDecimals = 0`.
 */
export function formatExactLiters(value: number | string | null | undefined, minDecimals: number = 2): string {
  const safeMin = Math.max(0, Math.floor(minDecimals));
  const num = Number(value ?? 0);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return safeMin > 0 ? `0.${'0'.repeat(safeMin)}` : '0';
  }
  const clean = Number(num.toFixed(6));
  const parts = clean.toString().split('.');
  const intPart = parts[0];
  const decPart = parts[1] || '';
  const targetDecimals = Math.max(decPart.length, safeMin);
  if (targetDecimals === 0) {
    return intPart;
  }
  return `${intPart}.${decPart.padEnd(targetDecimals, '0')}`;
}

/**
 * Sanitiza datas (DD/MM/YYYY, YYYY-MM-DD, YYYY/M/D, serial Excel ou ISO timestamp)
 * para 'YYYY-MM-DD' validando existência real no calendário via Date.UTC.
 * Retorna `null` para datas inexistentes (ex.: 31/02/2026, 2026-13-45).
 */
export function sanitizeDateToISO(dateVal?: string | number | null): string | null {
  if (dateVal === null || dateVal === undefined) return null;

  if (typeof dateVal === 'number') {
    if (!Number.isFinite(dateVal) || dateVal <= 1000 || dateVal >= 100000) return null;
    const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    if (Number.isNaN(date.getTime())) return null;
    return buildStrictISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  // 1. Formato 'YYYY-MM-DD' ou 'YYYY/M/D'
  const revMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (revMatch) {
    return buildStrictISODate(Number(revMatch[1]), Number(revMatch[2]), Number(revMatch[3]));
  }

  // 2. Formato brasileiro 'DD/MM/YYYY' ou 'DD-MM-YYYY'
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    return buildStrictISODate(Number(brMatch[3]), Number(brMatch[2]), Number(brMatch[1]));
  }

  // 3. Serial numérico do Excel em string (ex: "45000")
  if (/^\d+(?:\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (Number.isFinite(num) && num > 1000 && num < 100000) {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!Number.isNaN(date.getTime())) {
        return buildStrictISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
      }
    }
    return null;
  }

  // 4. Timestamp ISO completo ('YYYY-MM-DDTHH:mm...')
  const isoTsMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
  if (isoTsMatch) {
    const validDatePart = buildStrictISODate(
      Number(isoTsMatch[1]),
      Number(isoTsMatch[2]),
      Number(isoTsMatch[3]),
    );
    if (!validDatePart) return null;
    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? null : validDatePart;
  }

  return null;
}

/**
 * Converte data de planilha/canhoto legado (serial Excel, Date, BR com ou sem hora, ou ISO)
 * em ISO String válido. Retorna `""` (string vazia) para entradas inválidas — NUNCA fabrica
 * silenciosamente a data/hora atual ("agora") em registro contábil.
 */
export function parseExcelDate(raw: unknown): string {
  if (raw === null || raw === undefined) return '';

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 1000 || raw >= 100000) return '';
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? '' : raw.toISOString();
  }

  if (typeof raw !== 'string') return '';
  const str = raw.trim();
  if (!str) return '';

  // Serial Excel como string numérica
  if (/^\d+(?:\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 1000 || num >= 100000) return '';
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  // Formato brasileiro DD/MM/YYYY [HH:mm[:ss]]
  const brMatch = str.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    const hours = brMatch[4] !== undefined ? Number(brMatch[4]) : 12;
    const minutes = brMatch[5] !== undefined ? Number(brMatch[5]) : 0;
    const seconds = brMatch[6] !== undefined ? Number(brMatch[6]) : 0;

    if (!buildStrictISODate(year, month, day)) return '';
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      return '';
    }

    const d = new Date(year, month - 1, day, hours, minutes, seconds);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  // Apenas data ISO YYYY-MM-DD ou YYYY/MM/DD (usa meio-dia local para não deslocar dia em UTC-3)
  const dateOnlyMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    if (!buildStrictISODate(year, month, day)) return '';
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  // Timestamp ISO completo
  const isoTsMatch = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/,
  );
  if (isoTsMatch) {
    if (!buildStrictISODate(Number(isoTsMatch[1]), Number(isoTsMatch[2]), Number(isoTsMatch[3]))) {
      return '';
    }
    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  }

  return '';
}

/**
 * Cálculo dinâmico em tempo real do consumo e matriz antifraude
 */
export function calculateRealtimeMetrics(
  previousOdometer: number,
  currentOdometer: number,
  liters: number,
  expectedConsumption: number,
  tankCapacity: number,
): ConsumptionAuditCalculation {
  const isFirstOdometerRecord = !previousOdometer || previousOdometer <= 0;
  const hasValidLiters = Number.isFinite(liters) && liters > 0;
  const hasTankCapacity = Number.isFinite(tankCapacity) && tankCapacity > 0;

  const delta_km = isFirstOdometerRecord ? 0 : Math.max(0, currentOdometer - previousOdometer);
  const effective_liters = hasValidLiters ? liters : 0;
  const raw_km_per_liter =
    isFirstOdometerRecord || delta_km <= 0 || !hasValidLiters
      ? 0
      : Number((delta_km / effective_liters).toFixed(2));
  const calculated_km_per_liter = isFirstOdometerRecord
    ? 0
    : Math.min(Math.max(raw_km_per_liter, 0), 99.99);

  let deviation_percent = 0;
  if (!isFirstOdometerRecord && expectedConsumption > 0 && calculated_km_per_liter > 0) {
    const raw_dev = Number(
      (((calculated_km_per_liter - expectedConsumption) / expectedConsumption) * 100).toFixed(2),
    );
    deviation_percent = Math.min(Math.max(raw_dev, -999.99), 999.99);
  }

  let anomaly_level: AnomalyLevel = 'none';
  let anomaly_reason: string | undefined = undefined;
  let is_blocked = false;

  // 1. Bloqueio Crítico: Odômetro regressivo ou igual (quando já há leitura anterior)
  if (!isFirstOdometerRecord && currentOdometer <= previousOdometer) {
    anomaly_level = 'bloqueio_critico';
    anomaly_reason = `Odômetro Regressivo ou Inconsistente: KM informado (${currentOdometer}) é menor ou igual ao anterior (${previousOdometer}).`;
    is_blocked = true;
  }
  // 2. Bloqueio Crítico: Litragem nula ou negativa
  else if (!hasValidLiters) {
    anomaly_level = 'bloqueio_critico';
    anomaly_reason = `Litragem Inválida: O volume abastecido (${liters}L) deve ser estritamente maior que zero.`;
    is_blocked = true;
  }
  // 3. Bloqueio Crítico: Volume abastecido superior à capacidade física do tanque (quando cadastrada)
  else if (hasTankCapacity && liters > tankCapacity) {
    anomaly_level = 'bloqueio_critico';
    anomaly_reason = `Volume Superior à Capacidade do Tanque: Foram informados ${liters}L para um tanque de capacidade máxima de ${tankCapacity}L.`;
    is_blocked = true;
  }
  // 4. Bloqueio Crítico: Desvio pior que -25% (suspeita de dreno/desvio)
  else if (!isFirstOdometerRecord && deviation_percent < -25) {
    anomaly_level = 'bloqueio_critico';
    anomaly_reason = `Consumo Crítico: Suspeita de Dreno/Desvio. Consumo apurado de ${calculated_km_per_liter} km/l teve desvio de ${deviation_percent}% em relação ao esperado (${expectedConsumption} km/l).`;
    is_blocked = true;
  }
  // 5. Alerta Amarelo: Desvio entre -15% e -25%
  else if (!isFirstOdometerRecord && deviation_percent < -15 && deviation_percent >= -25) {
    anomaly_level = 'alerta_amarelo';
    anomaly_reason = `Consumo com Desvio Moderado: Rendimento de ${calculated_km_per_liter} km/l teve variação de ${deviation_percent}% da meta (${expectedConsumption} km/l). Justificativa formal exigida.`;
    is_blocked = false;
  }
  // 6. Alerta Amarelo: Consumo mais de 100% acima da meta (possível odômetro adulterado ou litragem subnotificada)
  else if (!isFirstOdometerRecord && expectedConsumption > 0 && deviation_percent > 100) {
    anomaly_level = 'alerta_amarelo';
    anomaly_reason = `Consumo Atipicamente Elevado (+${deviation_percent}%): Rendimento de ${calculated_km_per_liter} km/l supera em mais de 100% a meta (${expectedConsumption} km/l). Auditar leitura de odômetro e litragem.`;
    is_blocked = false;
  }
  // 7. Alerta Amarelo: Veículo sem capacidade de tanque cadastrada (não bloqueia a frota, mas exige regularização)
  else if (!hasTankCapacity) {
    anomaly_level = 'alerta_amarelo';
    anomaly_reason = 'Capacidade do Tanque Não Cadastrada: Regularize o cadastro do veículo para ativar a trava física de litragem máxima.';
    is_blocked = false;
  }

  return {
    delta_km,
    effective_liters,
    calculated_km_per_liter,
    expected_consumption: expectedConsumption,
    deviation_percent,
    anomaly_level,
    anomaly_reason,
    is_blocked,
  };
}
