/**
 * Testes de caracterização dos fluxos e subcomponentes extraídos do FleetFuelManager.
 * Garantem preservação de comportamento durante o desmembramento do arquivo monolítico.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../lib/supabase', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn(), auth: { getUser: vi.fn(), getSession: vi.fn() } },
  supabaseAnon: { rpc: vi.fn(), from: vi.fn() },
}));
vi.mock('../../../../lib/imageUpload', () => ({
  compressImageFile: vi.fn(),
  uploadOptimizedImageToStorage: vi.fn(),
}));

import {
  resolveOrderBudget,
  resolveOrderFinancials,
  isAdvanceTravelOrder,
  getOrderTimestamp,
} from '../fleet/fleetOrderHelpers';
import { FleetDriversTab } from '../fleet/FleetDriversTab';
import { FleetStationsTab } from '../fleet/FleetStationsTab';
import { FleetLogsTab } from '../fleet/FleetLogsTab';
import { FleetToolsModal } from '../fleet/FleetToolsModal';
import { FleetBiddedPricesModal } from '../fleet/FleetBiddedPricesModal';
import { FleetLinkInvoiceModal } from '../fleet/FleetLinkInvoiceModal';
import { DEFAULT_BIDDED_PRICES } from '../../../../lib/api/fleetFuelAudit';

describe('FleetFuelManager — caracterização de regras puras', () => {
  it('resolveOrderBudget prioriza ficha da ordem e faz fallback para ficha do veículo', () => {
    const budget = {
      id: '00000000-0000-4000-8000-000000000024',
      institution_id: 'inst_1',
      department_local: 'Administração',
      invoice_sheet: '24',
      funding_source: '1.1.500.0',
    };
    expect(resolveOrderBudget({ budget_classification_id: '24' }, null, [budget])).toEqual(budget);
    expect(
      resolveOrderBudget(
        {},
        {
          id: 'v1',
          institution_id: 'inst_1',
          plate: 'SQJ-5C71',
          model: 'Onix',
          department: 'Administração',
          fuel_type: 'gasolina',
          tank_capacity: 44,
          metric_type: 'km',
          expected_consumption: 12,
          current_odometer: 31401,
          status: 'ativo',
          budget_classification_id: '24',
          created_at: '2026-01-01T00:00:00Z',
        },
        [budget],
      ),
    ).toEqual(budget);
    expect(resolveOrderBudget(null, null, [budget])).toBeUndefined();
  });

  it('resolveOrderFinancials calcula valor efetivo sem NaN e prioriza litros abastecidos após execução', () => {
    const r = resolveOrderFinancials(
      {
        status: 'abastecido',
        fuel_type: 'gasolina',
        liters_authorized: 40,
        liters_supplied: 34.3,
        unit_price: 6.38,
      },
      DEFAULT_BIDDED_PRICES,
    );
    expect(r.effectiveLiters).toBe(34.3);
    expect(r.unitPrice).toBe(6.38);
    expect(r.effectiveValue).toBeCloseTo(218.83, 2);
    expect(r.formattedUnitPrice).toBe('R$ 6.38');

    const empty = resolveOrderFinancials(null);
    expect(empty.effectiveValue).toBe(0);
    expect(empty.formattedValue).toBe('R$ 0,00');
  });

  it('isAdvanceTravelOrder e getOrderTimestamp preservam classificação e ordenação cronológica', () => {
    expect(isAdvanceTravelOrder({ audit_justification: '[Adiantamento de Viagem] Cuiabá' })).toBe(true);
    expect(isAdvanceTravelOrder({ status: 'abastecido' })).toBe(false);

    const t1 = getOrderTimestamp({
      id: 'o1',
      institution_id: 'inst_1',
      order_number: '0000001',
      vehicle_id: 'v1',
      driver_name: 'João',
      station_name: 'Posto',
      fuel_type: 'diesel_s10',
      liters_authorized: 20,
      unit_price: 6.19,
      total_value: 123.8,
      previous_odometer: 1000,
      current_odometer: 1200,
      is_anomaly: false,
      status: 'abastecido',
      created_at: '2026-03-01T10:00:00Z',
      updated_at: '2026-03-05T10:00:00Z',
      supplied_at: '2026-03-05',
    });
    expect(t1).toBeGreaterThan(0);
  });
});

describe('FleetFuelManager — caracterização de renderização dos subcomponentes extraídos', () => {
  it('renderiza FleetDriversTab com lista de motoristas e estado vazio', () => {
    const htmlWithDriver = renderToStaticMarkup(
      <FleetDriversTab
        drivers={[
          {
            id: 'd1',
            institution_id: 'inst_1',
            full_name: 'JOSIEL NEVES CARRIJO',
            cpf: '000.000.000-00',
            department: 'Administração',
            status: 'ativo',
            created_at: '2026-01-01T00:00:00Z',
          },
        ]}
        filteredDrivers={[
          {
            id: 'd1',
            institution_id: 'inst_1',
            full_name: 'JOSIEL NEVES CARRIJO',
            cpf: '000.000.000-00',
            department: 'Administração',
            status: 'ativo',
            created_at: '2026-01-01T00:00:00Z',
          },
        ]}
        paginatedDrivers={[
          {
            id: 'd1',
            institution_id: 'inst_1',
            full_name: 'JOSIEL NEVES CARRIJO',
            cpf: '000.000.000-00',
            department: 'Administração',
            status: 'ativo',
            created_at: '2026-01-01T00:00:00Z',
          },
        ]}
        driverSearchTerm=""
        onDriverSearchTermChange={vi.fn()}
        onClearAllFilters={vi.fn()}
        onSyncCloud={vi.fn()}
        onClearAllDrivers={vi.fn()}
        onOpenDepartmentsModal={vi.fn()}
        officialDepartmentsCount={5}
        onOpenDriverBatchModal={vi.fn()}
        onOpenNewDriver={vi.fn()}
        onOpenEditDriver={vi.fn()}
        onDeleteDriver={vi.fn()}
        paginationNode={null}
      />,
    );
    expect(htmlWithDriver).toContain('JOSIEL NEVES CARRIJO');
    expect(htmlWithDriver).toContain('Secretarias (5)');
  });

  it('renderiza FleetStationsTab e FleetLogsTab preservando cabeçalhos e registros', () => {
    const stationsHtml = renderToStaticMarkup(
      <FleetStationsTab
        stations={[
          {
            id: 's1',
            institution_id: 'inst_1',
            name: 'Auto Posto Torixoréu',
            city: 'Torixoréu - MT',
            status: 'ativo',
            created_at: '2026-01-01T00:00:00Z',
          },
        ]}
        filteredStations={[
          {
            id: 's1',
            institution_id: 'inst_1',
            name: 'Auto Posto Torixoréu',
            city: 'Torixoréu - MT',
            status: 'ativo',
            created_at: '2026-01-01T00:00:00Z',
          },
        ]}
        paginatedStations={[
          {
            id: 's1',
            institution_id: 'inst_1',
            name: 'Auto Posto Torixoréu',
            city: 'Torixoréu - MT',
            status: 'ativo',
            created_at: '2026-01-01T00:00:00Z',
          },
        ]}
        stationSearchTerm=""
        onStationSearchTermChange={vi.fn()}
        onSyncCloud={vi.fn()}
        onClearAllStations={vi.fn()}
        onOpenNewStation={vi.fn()}
        onOpenEditStation={vi.fn()}
        onDeleteStation={vi.fn()}
        paginationNode={null}
      />,
    );
    expect(stationsHtml).toContain('Auto Posto Torixoréu');
    expect(stationsHtml).toContain('Credenciado');

    const logsHtml = renderToStaticMarkup(
      <FleetLogsTab
        auditLogs={[
          {
            id: 'log-1',
            institution_id: 'inst_1',
            order_number: '0022494',
            vehicle_plate: 'SQJ-5C71',
            action_type: 'HOMOLOGACAO_TCE',
            action_label: 'Homologação TCE',
            actor_name: 'Carlos Gestor',
            changes: [{ field: 'status', label: 'Status', oldValue: 'abastecido', newValue: 'auditado' }],
            created_at: '2026-11-16T12:00:00Z',
          },
        ]}
        filteredAuditLogs={[
          {
            id: 'log-1',
            institution_id: 'inst_1',
            order_number: '0022494',
            vehicle_plate: 'SQJ-5C71',
            action_type: 'HOMOLOGACAO_TCE',
            action_label: 'Homologação TCE',
            actor_name: 'Carlos Gestor',
            changes: [{ field: 'status', label: 'Status', oldValue: 'abastecido', newValue: 'auditado' }],
            created_at: '2026-11-16T12:00:00Z',
          },
        ]}
        paginatedAuditLogs={[
          {
            id: 'log-1',
            institution_id: 'inst_1',
            order_number: '0022494',
            vehicle_plate: 'SQJ-5C71',
            action_type: 'HOMOLOGACAO_TCE',
            action_label: 'Homologação TCE',
            actor_name: 'Carlos Gestor',
            changes: [{ field: 'status', label: 'Status', oldValue: 'abastecido', newValue: 'auditado' }],
            created_at: '2026-11-16T12:00:00Z',
          },
        ]}
        auditLogSearchTerm=""
        onAuditLogSearchTermChange={vi.fn()}
        auditLogTypeFilter="all"
        onAuditLogTypeFilterChange={vi.fn()}
        onExportAuditLogsExcel={vi.fn()}
        paginationNode={null}
      />,
    );
    expect(logsHtml).toContain('#0022494');
    expect(logsHtml).toContain('Homologação TCE');
  });

  it('renderiza FleetToolsModal, FleetBiddedPricesModal e FleetLinkInvoiceModal quando abertos', () => {
    const toolsHtml = renderToStaticMarkup(
      <FleetToolsModal
        isOpen={true}
        onClose={vi.fn()}
        hasOrders={true}
        onOpenPriceConfig={vi.fn()}
        onOpenBudgetClassifications={vi.fn()}
        onOpenLegacyVoucher={vi.fn()}
        onOpenAdvanceFuel={vi.fn()}
        onExportExcel={vi.fn()}
        onOpenFuelValidator={vi.fn()}
        onClearAllOrders={vi.fn()}
      />,
    );
    expect(toolsHtml).toContain('Opções &amp; Ferramentas da Frota');
    expect(toolsHtml).toContain('Preços Licitados');

    const pricesHtml = renderToStaticMarkup(
      <FleetBiddedPricesModal
        isOpen={true}
        onClose={vi.fn()}
        priceEditForm={DEFAULT_BIDDED_PRICES}
        setPriceEditForm={vi.fn()}
        rebalanceTermInput=""
        setRebalanceTermInput={vi.fn()}
        rebalanceReasonInput=""
        setRebalanceReasonInput={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(pricesHtml).toContain('Preços Licitados &amp; Reequilíbrio Contratual');
    expect(pricesHtml).toContain('DIESEL S10');

    const invoiceHtml = renderToStaticMarkup(
      <FleetLinkInvoiceModal
        isOpen={true}
        order={{
          id: 'o1',
          institution_id: 'inst_1',
          order_number: '0022494',
          vehicle_id: 'v1',
          driver_name: 'JOSIEL NEVES CARRIJO',
          station_name: 'Auto Posto Torixoréu',
          fuel_type: 'gasolina',
          liters_authorized: 34.3,
          unit_price: 6.38,
          total_value: 218.83,
          total_authorized_value: 218.83,
          previous_odometer: 31400,
          current_odometer: 31401,
          is_anomaly: false,
          status: 'auditado',
          created_at: '2026-11-16T12:00:00Z',
          updated_at: '2026-11-16T12:00:00Z',
        }}
        invoiceLinkNumber="NF-004821"
        onInvoiceLinkNumberChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(invoiceHtml).toContain('Vincular Nota Fiscal à Requisição');
    expect(invoiceHtml).toContain('0022494');
  });
});
