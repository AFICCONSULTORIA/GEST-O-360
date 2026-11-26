/**
 * Guarda contra emissão duplicada de requisições de abastecimento:
 * 1. Trava em memória por chave de abastecimento (evita duplo clique / chamadas paralelas).
 * 2. Classificador de colisão 23505 (UNIQUE order_number): distingue reenvio acidental
 *    da mesma requisição vs. colisão legítima de número sequencial entre veículos distintos.
 */

const inFlightOrderIssuance = new Set<string>();

export interface OrderDedupeCandidate {
  institutionId: string;
  targetKey: string;
  currentOdometer: number;
  litersAuthorized: number;
}

export interface ExistingOrderSummary {
  id?: string;
  order_number?: string;
  vehicle_id?: string | null;
  galao_label?: string | null;
  current_odometer?: number | null;
  liters_authorized?: number | null;
  created_at?: string | null;
}

export function buildOrderIssuanceKey(c: OrderDedupeCandidate): string {
  return [
    (c.institutionId || 'inst_1').trim(),
    c.targetKey.trim().toLowerCase(),
    Number(c.currentOdometer || 0),
    Number(c.litersAuthorized || 0).toFixed(4),
  ].join('|');
}

export function acquireOrderIssuanceLock(key: string): boolean {
  if (inFlightOrderIssuance.has(key)) {
    return false;
  }
  inFlightOrderIssuance.add(key);
  return true;
}

export function releaseOrderIssuanceLock(key: string): void {
  inFlightOrderIssuance.delete(key);
}

export function isDuplicateFuelOrderCollision(
  existing: ExistingOrderSummary | null | undefined,
  candidate: {
    vehicleId: string | null;
    galaoLabel?: string | null;
    currentOdometer: number;
    litersAuthorized: number;
  },
): boolean {
  if (!existing) return false;

  const sameTarget = candidate.vehicleId
    ? existing.vehicle_id === candidate.vehicleId
    : Boolean(candidate.galaoLabel) &&
      (existing.galao_label || '').trim().toLowerCase() === candidate.galaoLabel!.trim().toLowerCase();

  if (!sameTarget) return false;

  const sameOdometer = Number(existing.current_odometer || 0) === Number(candidate.currentOdometer || 0);
  const sameLiters = Math.abs(Number(existing.liters_authorized || 0) - Number(candidate.litersAuthorized || 0)) < 0.001;

  return sameOdometer && sameLiters;
}
