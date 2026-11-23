import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Calendar,
  Download,
  FileSpreadsheet,
  Fuel,
  Printer,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Filter
} from 'lucide-react';
import { downloadWorkbookXlsx } from '../../../utils/spreadsheet';
import {
  FuelSupplyOrder,
  FleetVehicle,
  FuelType
} from '../../../lib/api/fleetFuel';
import { BiddedPricesMap } from '../../../lib/api/fleetFuelAudit';
import { matchOfficialDepartmentName } from '../../../lib/api/departments';
import { resolveOrderFinancials } from './FleetFuelManager';
import { formatFuelLabel } from './FuelAuthorizationVoucherPDF';

interface FuelCostReportsPanelProps {
  orders: FuelSupplyOrder[];
  vehicles: FleetVehicle[];
  officialDepartments: string[];
  biddedPricesMap?: BiddedPricesMap;
  institutionName?: string;
}

interface NormalizedOrderItem {
  order: FuelSupplyOrder;
  monthKey: string; // YYYY-MM
  year: string; // YYYY
  dateBr: string;
  department: string;
  fuelType: string;
  plate: string;
  liters: number;
  value: number;
}

const MONTH_NAMES_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNum(val: number, decimals = 1): string {
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const idx = Number(m) - 1;
  const name = MONTH_NAMES_PT[idx] || m;
  return `${name}/${y}`;
}

function extractOrderMonthInfo(order: FuelSupplyOrder): { monthKey: string; year: string; dateBr: string } | null {
  const anyOrd = order as any;
  const raw = anyOrd.fueling_date || order.supplied_at || order.created_at;
  if (!raw || typeof raw !== 'string') return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      year: isoMatch[1],
      monthKey: `${isoMatch[1]}-${isoMatch[2]}`,
      dateBr: `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`,
    };
  }

  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return null;
  const y = String(parsed.getFullYear());
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return { year: y, monthKey: `${y}-${m}`, dateBr: `${d}/${m}/${y}` };
}

export const FuelCostReportsPanel: React.FC<FuelCostReportsPanelProps> = ({
  orders,
  vehicles,
  officialDepartments,
  biddedPricesMap,
  institutionName = 'Prefeitura Municipal',
}) => {
  const currentYear = String(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedFuel, setSelectedFuel] = useState<string>('all');
  const [statusScope, setStatusScope] = useState<'all_valid' | 'supplied_only'>('all_valid');
  const [compareMonthA, setCompareMonthA] = useState<string>('');
  const [compareMonthB, setCompareMonthB] = useState<string>('');

  const vehicleMap = useMemo(() => {
    const map = new Map<string, FleetVehicle>();
    for (const v of vehicles) map.set(v.id, v);
    return map;
  }, [vehicles]);

  // Normaliza todas as ordens válidas com secretaria, mês e valor financeiro
  const normalizedOrders = useMemo<NormalizedOrderItem[]>(() => {
    const list: NormalizedOrderItem[] = [];
    for (const ord of orders) {
      if (ord.status === 'cancelado' || ord.status === 'rejeitado') continue;
      if (statusScope === 'supplied_only' && (ord.status === 'autorizado' || ord.status === 'autorizado_pendente')) {
        continue;
      }

      const dateInfo = extractOrderMonthInfo(ord);
      if (!dateInfo) continue;

      const veh = ord.vehicle || (ord.vehicle_id ? vehicleMap.get(ord.vehicle_id) : undefined);
      const rawDept = (ord as any).department || veh?.department || 'Sem Secretaria Definida';
      const resolvedDept = matchOfficialDepartmentName(rawDept, officialDepartments) || rawDept;
      const financials = resolveOrderFinancials(ord, biddedPricesMap);

      list.push({
        order: ord,
        monthKey: dateInfo.monthKey,
        year: dateInfo.year,
        dateBr: dateInfo.dateBr,
        department: resolvedDept,
        fuelType: ord.fuel_type || 'outros',
        plate: veh?.plate || (ord as any).vehicle_plate || '—',
        liters: financials.effectiveLiters,
        value: financials.effectiveValue,
      });
    }
    return list;
  }, [orders, statusScope, vehicleMap, officialDepartments, biddedPricesMap]);

  const availableYears = useMemo(() => {
    const set = new Set<string>([currentYear]);
    for (const item of normalizedOrders) set.add(item.year);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [normalizedOrders, currentYear]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>(officialDepartments);
    for (const item of normalizedOrders) set.add(item.department);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [normalizedOrders, officialDepartments]);

  const availableFuels = useMemo(() => {
    const set = new Set<string>();
    for (const item of normalizedOrders) set.add(item.fuelType);
    return Array.from(set).sort();
  }, [normalizedOrders]);

  // Ordens filtradas por Ano, Secretaria e Combustível
  const filteredItems = useMemo(() => {
    return normalizedOrders.filter((item) => {
      if (selectedYear !== 'all' && item.year !== selectedYear) return false;
      if (selectedDepartment !== 'all' && item.department !== selectedDepartment) return false;
      if (selectedFuel !== 'all' && item.fuelType !== selectedFuel) return false;
      return true;
    });
  }, [normalizedOrders, selectedYear, selectedDepartment, selectedFuel]);

  // Agregação Mês a Mês
  const monthlyRows = useMemo(() => {
    const map = new Map<string, { monthKey: string; ordersCount: number; liters: number; totalValue: number }>();
    for (const item of filteredItems) {
      const prev = map.get(item.monthKey) || {
        monthKey: item.monthKey,
        ordersCount: 0,
        liters: 0,
        totalValue: 0,
      };
      prev.ordersCount += 1;
      prev.liters += item.liters;
      prev.totalValue += item.value;
      map.set(item.monthKey, prev);
    }

    const sorted = Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    return sorted.map((row, idx) => {
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const diffValue = prev ? row.totalValue - prev.totalValue : 0;
      const diffPct = prev && prev.totalValue > 0 ? (diffValue / prev.totalValue) * 100 : null;
      const avgPrice = row.liters > 0 ? row.totalValue / row.liters : 0;
      return {
        ...row,
        label: formatMonthLabel(row.monthKey),
        avgPrice,
        diffValue,
        diffPct,
      };
    });
  }, [filteredItems]);

  const maxMonthlyValue = useMemo(
    () => Math.max(1, ...monthlyRows.map((r) => r.totalValue)),
    [monthlyRows]
  );

  // Meses padrão para comparação direta A vs B
  const effectiveMonthA = compareMonthA && monthlyRows.some((m) => m.monthKey === compareMonthA)
    ? compareMonthA
    : monthlyRows.length >= 2
    ? monthlyRows[monthlyRows.length - 2].monthKey
    : monthlyRows[0]?.monthKey || '';

  const effectiveMonthB = compareMonthB && monthlyRows.some((m) => m.monthKey === compareMonthB)
    ? compareMonthB
    : monthlyRows[monthlyRows.length - 1]?.monthKey || '';

  const monthAData = monthlyRows.find((m) => m.monthKey === effectiveMonthA);
  const monthBData = monthlyRows.find((m) => m.monthKey === effectiveMonthB);

  // Agregação por Secretaria (respeitando Ano, Combustível e Secretaria selecionada se quiser filtrar)
  const departmentRows = useMemo(() => {
    const itemsForDept = normalizedOrders.filter((item) => {
      if (selectedYear !== 'all' && item.year !== selectedYear) return false;
      if (selectedFuel !== 'all' && item.fuelType !== selectedFuel) return false;
      if (selectedDepartment !== 'all' && item.department !== selectedDepartment) return false;
      return true;
    });

    const grandTotal = itemsForDept.reduce((acc, i) => acc + i.value, 0);
    const map = new Map<
      string,
      {
        department: string;
        ordersCount: number;
        liters: number;
        totalValue: number;
        monthValues: Record<string, number>;
      }
    >();

    for (const item of itemsForDept) {
      const prev = map.get(item.department) || {
        department: item.department,
        ordersCount: 0,
        liters: 0,
        totalValue: 0,
        monthValues: {},
      };
      prev.ordersCount += 1;
      prev.liters += item.liters;
      prev.totalValue += item.value;
      prev.monthValues[item.monthKey] = (prev.monthValues[item.monthKey] || 0) + item.value;
      map.set(item.department, prev);
    }

    return Array.from(map.values())
      .map((row) => {
        const sharePct = grandTotal > 0 ? (row.totalValue / grandTotal) * 100 : 0;
        const valA = effectiveMonthA ? row.monthValues[effectiveMonthA] || 0 : 0;
        const valB = effectiveMonthB ? row.monthValues[effectiveMonthB] || 0 : 0;
        const diff = valB - valA;
        const diffPct = valA > 0 ? (diff / valA) * 100 : null;
        return {
          ...row,
          sharePct,
          valA,
          valB,
          diff,
          diffPct,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [normalizedOrders, selectedYear, selectedFuel, selectedDepartment, effectiveMonthA, effectiveMonthB]);

  const kpis = useMemo(() => {
    const totalValue = filteredItems.reduce((acc, i) => acc + i.value, 0);
    const totalLiters = filteredItems.reduce((acc, i) => acc + i.liters, 0);
    const avgPrice = totalLiters > 0 ? totalValue / totalLiters : 0;
    const lastMonth = monthlyRows[monthlyRows.length - 1];
    return {
      totalValue,
      totalLiters,
      avgPrice,
      ordersCount: filteredItems.length,
      lastMonthDiffPct: lastMonth?.diffPct ?? null,
      lastMonthLabel: lastMonth?.label || '—',
    };
  }, [filteredItems, monthlyRows]);

  const handleExportExcel = () => {
    const monthlySheetRows = monthlyRows.map((m) => ({
      'Mês/Ano': m.label,
      'Qtd. Ordens': m.ordersCount,
      'Litros': Number(m.liters.toFixed(2)),
      'Custo Total (R$)': Number(m.totalValue.toFixed(2)),
      'Preço Médio/L (R$)': Number(m.avgPrice.toFixed(3)),
      'Variação vs Mês Anterior (R$)': Number(m.diffValue.toFixed(2)),
      'Variação (%)': m.diffPct !== null ? `${m.diffPct.toFixed(1)}%` : '—',
    }));

    const deptSheetRows = departmentRows.map((d) => ({
      'Secretaria': d.department,
      'Qtd. Ordens': d.ordersCount,
      'Litros': Number(d.liters.toFixed(2)),
      'Gasto Total (R$)': Number(d.totalValue.toFixed(2)),
      'Participação (%)': `${d.sharePct.toFixed(1)}%`,
      ...(effectiveMonthA ? { [`${formatMonthLabel(effectiveMonthA)} (R$)`]: Number(d.valA.toFixed(2)) } : {}),
      ...(effectiveMonthB ? { [`${formatMonthLabel(effectiveMonthB)} (R$)`]: Number(d.valB.toFixed(2)) } : {}),
    }));

    const matrixSheetRows = departmentRows.map((d) => {
      const row: Record<string, string | number> = { Secretaria: d.department };
      for (const m of monthlyRows) {
        row[m.label] = Number((d.monthValues[m.monthKey] || 0).toFixed(2));
      }
      row['Total Geral (R$)'] = Number(d.totalValue.toFixed(2));
      return row;
    });

    const ordersSheetRows = filteredItems.map((i) => ({
      Data: i.dateBr,
      Mês: formatMonthLabel(i.monthKey),
      Secretaria: i.department,
      Placa: i.plate,
      Combustível: formatFuelLabel(i.fuelType as FuelType),
      Litros: Number(i.liters.toFixed(2)),
      'Valor (R$)': Number(i.value.toFixed(2)),
      Status: i.order.status,
    }));

    const suffix = selectedDepartment !== 'all' ? `_${selectedDepartment.replace(/\s+/g, '_')}` : '';
    void downloadWorkbookXlsx(
      [
        { name: 'Comparativo Mês a Mês', rows: monthlySheetRows },
        { name: 'Gastos por Secretaria', rows: deptSheetRows },
        { name: 'Matriz Secretaria x Mês', rows: matrixSheetRows },
        { name: 'Detalhamento', rows: ordersSheetRows },
      ],
      `Relatorio_Combustivel_${selectedYear}${suffix}.xlsx`
    );
  };

  const handlePrintPdf = (onlyDepartment?: string) => {
    const targetDept = onlyDepartment || selectedDepartment;
    const printItems = normalizedOrders.filter((item) => {
      if (selectedYear !== 'all' && item.year !== selectedYear) return false;
      if (targetDept !== 'all' && item.department !== targetDept) return false;
      if (selectedFuel !== 'all' && item.fuelType !== selectedFuel) return false;
      return true;
    });

    const totalVal = printItems.reduce((a, b) => a + b.value, 0);
    const totalLit = printItems.reduce((a, b) => a + b.liters, 0);

    // Recalcula mensal para o recorte impresso
    const mMap = new Map<string, { monthKey: string; count: number; liters: number; val: number }>();
    for (const it of printItems) {
      const p = mMap.get(it.monthKey) || { monthKey: it.monthKey, count: 0, liters: 0, val: 0 };
      p.count += 1;
      p.liters += it.liters;
      p.val += it.value;
      mMap.set(it.monthKey, p);
    }
    const mList = Array.from(mMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Recalcula por secretaria
    const dMap = new Map<string, { dept: string; count: number; liters: number; val: number }>();
    for (const it of printItems) {
      const p = dMap.get(it.department) || { dept: it.department, count: 0, liters: 0, val: 0 };
      p.count += 1;
      p.liters += it.liters;
      p.val += it.value;
      dMap.set(it.department, p);
    }
    const dList = Array.from(dMap.values()).sort((a, b) => b.val - a.val);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Custos de Combustível</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
    .header p { margin: 2px 0 0; color: #475569; font-size: 11px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
    .kpi .lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .kpi .val { font-size: 14px; font-weight: bold; margin-top: 2px; }
    h2 { font-size: 12px; text-transform: uppercase; margin: 14px 0 6px; border-left: 3px solid #4f46e5; padding-left: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
    th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${institutionName} — Relatório de Custos com Combustível</h1>
      <p>Exercício: <strong>${selectedYear === 'all' ? 'Todos' : selectedYear}</strong> • Secretaria: <strong>${targetDept === 'all' ? 'Todas as Secretarias' : targetDept}</strong></p>
    </div>
    <div style="text-align:right;font-size:10px;color:#475569;">
      Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="lbl">Gasto Total</div><div class="val">${formatBRL(totalVal)}</div></div>
    <div class="kpi"><div class="lbl">Litros Totais</div><div class="val">${formatNum(totalLit, 2)} L</div></div>
    <div class="kpi"><div class="lbl">Preço Médio / Litro</div><div class="val">${formatBRL(totalLit > 0 ? totalVal / totalLit : 0)}</div></div>
    <div class="kpi"><div class="lbl">Total de Ordens</div><div class="val">${printItems.length}</div></div>
  </div>

  <h2>1. Comparativo Mês a Mês</h2>
  <table>
    <thead>
      <tr>
        <th>Mês/Ano</th>
        <th class="num">Ordens</th>
        <th class="num">Litros</th>
        <th class="num">Custo Total</th>
        <th class="num">Variação vs Mês Ant.</th>
      </tr>
    </thead>
    <tbody>
      ${mList
        .map((m, i) => {
          const prev = i > 0 ? mList[i - 1] : null;
          const diff = prev ? m.val - prev.val : 0;
          const pct = prev && prev.val > 0 ? `${diff >= 0 ? '+' : ''}${((diff / prev.val) * 100).toFixed(1)}%` : '—';
          return `<tr>
            <td><strong>${formatMonthLabel(m.monthKey)}</strong></td>
            <td class="num">${m.count}</td>
            <td class="num">${formatNum(m.liters, 2)} L</td>
            <td class="num"><strong>${formatBRL(m.val)}</strong></td>
            <td class="num">${prev ? `${diff >= 0 ? '+' : ''}${formatBRL(diff)} (${pct})` : '—'}</td>
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <h2>2. Gastos por Secretaria</h2>
  <table>
    <thead>
      <tr>
        <th>Secretaria</th>
        <th class="num">Ordens</th>
        <th class="num">Litros</th>
        <th class="num">Gasto Total</th>
        <th class="num">Participação</th>
      </tr>
    </thead>
    <tbody>
      ${dList
        .map((d) => {
          const share = totalVal > 0 ? (d.val / totalVal) * 100 : 0;
          return `<tr>
            <td><strong>${d.dept}</strong></td>
            <td class="num">${d.count}</td>
            <td class="num">${formatNum(d.liters, 2)} L</td>
            <td class="num"><strong>${formatBRL(d.val)}</strong></td>
            <td class="num">${share.toFixed(1)}%</td>
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  ${
    targetDept !== 'all'
      ? `<h2>3. Detalhamento de Abastecimentos — ${targetDept}</h2>
         <table>
           <thead>
             <tr><th>Data</th><th>Placa</th><th>Combustível</th><th class="num">Litros</th><th class="num">Valor</th></tr>
           </thead>
           <tbody>
             ${printItems
               .slice(0, 250)
               .map(
                 (it) => `<tr>
                   <td>${it.dateBr}</td>
                   <td>${it.plate}</td>
                   <td>${formatFuelLabel(it.fuelType as FuelType)}</td>
                   <td class="num">${formatNum(it.liters, 2)} L</td>
                   <td class="num">${formatBRL(it.value)}</td>
                 </tr>`
               )
               .join('')}
           </tbody>
         </table>`
      : ''
  }
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1100,height=780');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barra de Filtros e Exportação */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white tracking-tight">
                Relatórios de Custos — Comparativo Mensal &amp; Por Secretaria
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Compare a evolução dos gastos mês a mês e emita relatórios individuais ou consolidados por secretaria.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors disabled:opacity-40"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrintPdf()}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-40"
            >
              <Printer size={15} />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            <label className="flex items-center gap-1 text-[10px] font-black uppercase text-neutral-500 mb-1">
              <Calendar size={11} /> Exercício (Ano)
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-white"
            >
              <option value="all">Todos os Anos</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1 text-[10px] font-black uppercase text-neutral-500 mb-1">
              <Building2 size={11} /> Secretaria
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-white"
            >
              <option value="all">Todas as Secretarias</option>
              {availableDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1 text-[10px] font-black uppercase text-neutral-500 mb-1">
              <Fuel size={11} /> Combustível
            </label>
            <select
              value={selectedFuel}
              onChange={(e) => setSelectedFuel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-white"
            >
              <option value="all">Todos os Combustíveis</option>
              {availableFuels.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {formatFuelLabel(fuel as FuelType)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1 text-[10px] font-black uppercase text-neutral-500 mb-1">
              <Filter size={11} /> Escopo das Ordens
            </label>
            <select
              value={statusScope}
              onChange={(e) => setStatusScope(e.target.value as 'all_valid' | 'supplied_only')}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-bold text-neutral-800 dark:text-white"
            >
              <option value="all_valid">Todas Válidas (Autorizadas + Abastecidas)</option>
              <option value="supplied_only">Somente Abastecidas / Liquidadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-neutral-500">Gasto Total no Recorte</div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1 tabular-nums">
            {formatBRL(kpis.totalValue)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">{kpis.ordersCount} ordem(ns) contabilizada(s)</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-neutral-500">Volume Total</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums">
            {formatNum(kpis.totalLiters, 1)} L
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Consumo acumulado no período</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-neutral-500">Custo Médio por Litro</div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1 tabular-nums">
            {formatBRL(kpis.avgPrice)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Média ponderada pelo volume</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase text-neutral-500">
            Variação ({kpis.lastMonthLabel})
          </div>
          <div className="flex items-center gap-2 mt-1">
            {kpis.lastMonthDiffPct === null ? (
              <span className="text-2xl font-black text-neutral-400">—</span>
            ) : kpis.lastMonthDiffPct > 0 ? (
              <>
                <TrendingUp className="text-rose-500" size={22} />
                <span className="text-2xl font-black text-rose-600 tabular-nums">
                  +{kpis.lastMonthDiffPct.toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="text-emerald-500" size={22} />
                <span className="text-2xl font-black text-emerald-600 tabular-nums">
                  {kpis.lastMonthDiffPct.toFixed(1)}%
                </span>
              </>
            )}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Comparado ao mês anterior</div>
        </div>
      </div>

      {/* Comparativo Mês a Mês */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white">
              1. Comparativo de Custos Mês a Mês
            </h4>
            <p className="text-xs text-neutral-500">
              Evolução mensal de gastos, litros abastecidos e variação percentual em relação ao mês anterior.
            </p>
          </div>

          {monthlyRows.length >= 2 && (
            <div className="flex flex-wrap items-center gap-2 bg-neutral-50 dark:bg-neutral-800/70 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <ArrowRightLeft size={14} className="text-indigo-500" />
              <span className="text-[11px] font-bold text-neutral-500">Comparar:</span>
              <select
                value={effectiveMonthA}
                onChange={(e) => setCompareMonthA(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              >
                {monthlyRows.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-xs font-bold text-neutral-400">vs</span>
              <select
                value={effectiveMonthB}
                onChange={(e) => setCompareMonthB(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
              >
                {monthlyRows.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.label}
                  </option>
                ))}
              </select>
              {monthAData && monthBData && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                    monthBData.totalValue - monthAData.totalValue > 0
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  }`}
                >
                  {monthBData.totalValue - monthAData.totalValue >= 0 ? '+' : ''}
                  {formatBRL(monthBData.totalValue - monthAData.totalValue)}
                  {monthAData.totalValue > 0
                    ? ` (${(((monthBData.totalValue - monthAData.totalValue) / monthAData.totalValue) * 100).toFixed(1)}%)`
                    : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {monthlyRows.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-500">
            Nenhum abastecimento encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-3">
            {monthlyRows.map((m) => {
              const barPct = Math.max(4, Math.round((m.totalValue / maxMonthlyValue) * 100));
              return (
                <div key={m.monthKey} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <div className="col-span-3 sm:col-span-2 font-black text-neutral-800 dark:text-neutral-200">
                    {m.label}
                  </div>
                  <div className="col-span-5 sm:col-span-6">
                    <div className="w-full h-6 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-lg transition-all duration-300 flex items-center px-2"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-neutral-500 mt-0.5">
                      <span>{m.ordersCount} ordens</span>
                      <span>• {formatNum(m.liters, 1)} L</span>
                      <span>• Média {formatBRL(m.avgPrice)}/L</span>
                    </div>
                  </div>
                  <div className="col-span-4 text-right">
                    <div className="font-black text-neutral-900 dark:text-white tabular-nums">
                      {formatBRL(m.totalValue)}
                    </div>
                    {m.diffPct !== null ? (
                      <div
                        className={`text-[10px] font-bold tabular-nums ${
                          m.diffValue > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {m.diffValue >= 0 ? '+' : ''}
                        {formatBRL(m.diffValue)} ({m.diffPct >= 0 ? '+' : ''}
                        {m.diffPct.toFixed(1)}%)
                      </div>
                    ) : (
                      <div className="text-[10px] text-neutral-400">Base inicial</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Relatório por Secretaria */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white">
              2. Gastos por Secretaria
            </h4>
            <p className="text-xs text-neutral-500">
              Acompanhamento de consumo, participação no orçamento e emissão de relatório individual por secretaria.
            </p>
          </div>
          {selectedDepartment !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedDepartment('all')}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Ver todas as secretarias
            </button>
          )}
        </div>

        {departmentRows.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-500">
            Sem movimentações registradas para exibir por secretaria.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-black uppercase text-neutral-500">
                  <th className="py-2.5 px-3">Secretaria</th>
                  <th className="py-2.5 px-2 text-right">Ordens</th>
                  <th className="py-2.5 px-2 text-right">Litros</th>
                  {effectiveMonthA && (
                    <th className="py-2.5 px-2 text-right">{formatMonthLabel(effectiveMonthA)}</th>
                  )}
                  {effectiveMonthB && effectiveMonthB !== effectiveMonthA && (
                    <th className="py-2.5 px-2 text-right">{formatMonthLabel(effectiveMonthB)}</th>
                  )}
                  <th className="py-2.5 px-2 text-right">Total no Período</th>
                  <th className="py-2.5 px-2 text-right">% Gasto</th>
                  <th className="py-2.5 px-3 text-center">Relatório</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {departmentRows.map((d) => (
                  <tr
                    key={d.department}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDepartment((prev) => (prev === d.department ? 'all' : d.department))
                        }
                        className="font-bold text-neutral-900 dark:text-white hover:text-indigo-600 text-left"
                        title="Clique para filtrar por esta secretaria"
                      >
                        {d.department}
                      </button>
                      <div className="w-32 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.round(d.sharePct))}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold tabular-nums">{d.ordersCount}</td>
                    <td className="py-2.5 px-2 text-right font-semibold tabular-nums">
                      {formatNum(d.liters, 1)} L
                    </td>
                    {effectiveMonthA && (
                      <td className="py-2.5 px-2 text-right tabular-nums text-neutral-600 dark:text-neutral-300">
                        {formatBRL(d.valA)}
                      </td>
                    )}
                    {effectiveMonthB && effectiveMonthB !== effectiveMonthA && (
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {formatBRL(d.valB)}
                        </div>
                        {d.diffPct !== null && (
                          <div
                            className={`text-[10px] font-bold ${
                              d.diff > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {d.diffPct >= 0 ? '+' : ''}
                            {d.diffPct.toFixed(1)}%
                          </div>
                        )}
                      </td>
                    )}
                    <td className="py-2.5 px-2 text-right font-black text-neutral-900 dark:text-white tabular-nums">
                      {formatBRL(d.totalValue)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {d.sharePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handlePrintPdf(d.department)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold text-[11px] transition-colors"
                        title={`Emitir relatório PDF da ${d.department}`}
                      >
                        <Download size={12} />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
