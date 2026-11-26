/**
 * Helpers puros de resolução financeira, orçamentária, temporal e de notificações
 * do módulo de Frotas & Combustível.
 */
import {
  FuelSupplyOrder,
  FleetVehicle,
  FleetBudgetClassification,
  FuelType,
  toBudgetUUID,
} from '../../../../lib/api/fleetFuel';
import { CONTRACTUAL_BIDDED_PRICES, BiddedPricesMap } from '../../../../lib/api/fleetFuelAudit';
import { AdminUser } from '../../../../types';

export interface FleetNotification {
  id: string;
  orderId?: string;
  orderNumber: string;
  type: 'abastecimento' | 'alerta_auditoria' | 'bloqueio_tce' | 'ordem_emitida';
  title: string;
  message: string;
  plate?: string;
  vehicleModel?: string;
  driverName?: string;
  stationName?: string;
  liters?: number;
  currentOdometer?: number;
  pumpPhotoUrl?: string;
  odometerPhotoUrl?: string;
  timestamp: string;
  read: boolean;
  hasPhotos: boolean;
  anomalyLevel?: 'none' | 'alerta_amarelo' | 'bloqueio_critico';
  anomalyReason?: string;
}

type ExtendedFuelOrder = Omit<Partial<FuelSupplyOrder>, 'supply_mode'> & {
  bidded_unit_price?: number;
  total_authorized_value?: number;
  supply_mode?: string;
  authorized_by_role?: string;
  notes?: string;
  fueling_date?: string;
};

export function formatRelativeNotificationTime(dateIso: string): string {
  try {
    const d = new Date(dateIso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return 'Agora';
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24 && now.getDate() === d.getDate()) {
      return `Hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.getDate() === d.getDate() && yesterday.getMonth() === d.getMonth()) {
      return `Ontem às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recente';
  }
}

export function resolveOrderBudget(
  order?: Partial<FuelSupplyOrder> | null,
  vehicle?: FleetVehicle | null,
  budgetClassifications: FleetBudgetClassification[] = [],
): FleetBudgetClassification | undefined {
  if (!order && !vehicle) return undefined;

  if (order?.budget_classification && order.budget_classification.invoice_sheet) {
    return order.budget_classification;
  }

  if (order?.budget_classification_id) {
    const match = budgetClassifications.find(
      (b) =>
        b.id === order.budget_classification_id ||
        b.invoice_sheet === order.budget_classification_id ||
        b.id === toBudgetUUID(String(order.budget_classification_id)),
    );
    if (match) return match;
  }

  const v = vehicle || order?.vehicle;
  if (v?.budget_classification_id) {
    const match = budgetClassifications.find(
      (b) =>
        b.id === v.budget_classification_id ||
        b.invoice_sheet === v.budget_classification_id ||
        b.id === toBudgetUUID(String(v.budget_classification_id)),
    );
    if (match) return match;
  }

  if (v?.budget_classification && v.budget_classification.invoice_sheet) {
    return v.budget_classification;
  }

  return undefined;
}

/**
 * Resolução segura e à prova de falhas dos valores financeiros da ordem (evita NaN).
 */
export function resolveOrderFinancials(
  order: Partial<FuelSupplyOrder> | null | undefined,
  biddedPricesMap?: BiddedPricesMap,
): {
  unitPrice: number;
  effectiveLiters: number;
  effectiveValue: number;
  formattedValue: string;
  formattedUnitPrice: string;
} {
  if (!order) {
    return {
      unitPrice: 6.19,
      effectiveLiters: 0,
      effectiveValue: 0,
      formattedValue: 'R$ 0,00',
      formattedUnitPrice: 'R$ 6,19',
    };
  }

  const ext = order as ExtendedFuelOrder;
  const isSupplied = order.status !== 'autorizado' && order.status !== 'autorizado_pendente';
  const rawLiters = isSupplied && order.liters_supplied ? order.liters_supplied : order.liters_authorized;
  const numLiters = Number(rawLiters);
  const effectiveLiters = !Number.isNaN(numLiters) && numLiters > 0 ? numLiters : 0;

  const fuelKey = order.fuel_type as FuelType;
  const priceFromConfig =
    fuelKey && biddedPricesMap?.[fuelKey]?.price ? Number(biddedPricesMap[fuelKey].price) : undefined;
  const priceFromContractual =
    fuelKey && CONTRACTUAL_BIDDED_PRICES[fuelKey]?.price
      ? Number(CONTRACTUAL_BIDDED_PRICES[fuelKey].price)
      : undefined;

  let unitPrice = 0;
  const orderBiddedPrice = Number(ext.bidded_unit_price);
  const orderUnitPrice = Number(order.unit_price);

  if (!Number.isNaN(orderBiddedPrice) && orderBiddedPrice > 0) {
    unitPrice = orderBiddedPrice;
  } else if (!Number.isNaN(orderUnitPrice) && orderUnitPrice > 0) {
    unitPrice = orderUnitPrice;
  } else if (typeof priceFromConfig === 'number' && !Number.isNaN(priceFromConfig) && priceFromConfig > 0) {
    unitPrice = priceFromConfig;
  } else if (
    typeof priceFromContractual === 'number' &&
    !Number.isNaN(priceFromContractual) &&
    priceFromContractual > 0
  ) {
    unitPrice = priceFromContractual;
  } else {
    unitPrice = 6.19;
  }

  if (Number.isNaN(unitPrice) || unitPrice <= 0) unitPrice = 6.19;

  const orderTotalValue = Number(order.total_value);
  const orderTotalAuth = Number(ext.total_authorized_value);

  let effectiveValue = 0;
  if (!Number.isNaN(orderTotalValue) && orderTotalValue > 0) {
    effectiveValue = orderTotalValue;
  } else if (!Number.isNaN(orderTotalAuth) && orderTotalAuth > 0) {
    effectiveValue = orderTotalAuth;
  } else {
    effectiveValue = Number((effectiveLiters * unitPrice).toFixed(2));
  }

  if (Number.isNaN(effectiveValue) || effectiveValue < 0) effectiveValue = 0;

  return {
    unitPrice,
    effectiveLiters,
    effectiveValue,
    formattedValue: effectiveValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    formattedUnitPrice: `R$ ${unitPrice.toFixed(2)}`,
  };
}

export function resolveFleetAuthorizedIssuer(user?: AdminUser | null): { name: string; role: string } {
  const name = user?.name?.trim() || 'Gestor da Frota Municipal';
  const role = user?.role === 'Prefeito' ? 'Prefeito Municipal' : 'Responsável pela Frota';
  return { name, role };
}

export function isAdvanceTravelOrder(order?: Partial<FuelSupplyOrder> | null): boolean {
  if (!order) return false;
  const ext = order as ExtendedFuelOrder;
  return (
    ext.supply_mode === 'adiantamento_viagem' ||
    ext.authorized_by_role === 'Adiantamento de Viagem' ||
    String(ext.notes || '').includes('[Adiantamento de Viagem]') ||
    String(ext.audit_justification || '').includes('[Adiantamento de Viagem]')
  );
}

export function getOrderTimestamp(order: FuelSupplyOrder): number {
  const ext = order as ExtendedFuelOrder;
  const raw = ext.fueling_date || order.supplied_at || order.created_at;
  if (!raw) return 0;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const t = new Date(`${raw}T12:00:00`).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
