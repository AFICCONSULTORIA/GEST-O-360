/**
 * Componente e Motor de Impressão do Canhoto Oficial em Duas Vias
 * Arquivo: src/modules/Controls/components/FuelAuthorizationVoucherPDF.tsx
 * Sistema GESTÃO 360 - Módulo de Frotas / Controles Internos
 * Documento Oficial A4: 1ª Via (Controle Interno) + 2ª Via (Motorista / Posto Credenciado)
 * Sem campo de frentista: Assinaturas estritas do Gestor Emissor e do Motorista/Condutor.
 */

import React from 'react';
import { TwoWayFuelOrder } from '../../../lib/api/fleetFuelAudit';
import { FleetVehicle, getLocalBudgetClassifications, toBudgetUUID } from '../../../lib/api/fleetFuel';
import { BRASAO_BASE64 } from '../../../utils/brasaoBase64';
import { generateQrSvgSync } from '../../../utils/qrCodeGenerator';

export interface FuelVoucherOptions {
  municipioNome?: string;
  estadoNome?: string;
  secretariaNome?: string;
  brasaoUrl?: string;
}

/**
 * Tradução amigável do tipo de combustível
 */
export function formatFuelLabel(fuel: string): string {
  switch (fuel) {
    case 'diesel_s10': return 'DIESEL S-10 ESPECIAL';
    case 'diesel_s500': return 'DIESEL S-500 COMUM';
    case 'gasolina': return 'GASOLINA COMUM';
    case 'etanol': return 'ETANOL HIDRATADO';
    case 'arla32': return 'ARLA 32 (ARREFECIMENTO)';
    default: return (fuel || '').toUpperCase();
  }
}

/**
 * Gera o HTML oficial em folha A4 com duas vias e canhoto destacável
 */
export function gerarCanhotoDuasViasHtml(
  order: TwoWayFuelOrder,
  vehicle?: FleetVehicle,
  options: FuelVoucherOptions = {}
): string {
  const targetVehicle = vehicle || order.vehicle;
  const municipio = options.municipioNome || 'PREFEITURA MUNICIPAL DE TORIXORÉU';
  const estado = options.estadoNome || 'ESTADO DE MATO GROSSO';
  const secretaria = targetVehicle?.department 
    ? `SECRETARIA MUNICIPAL DE ${targetVehicle.department.toUpperCase()}`
    : (options.secretariaNome || 'DEPARTAMENTO DE GESTÃO DE FROTAS & CONTROLES');
  
  const brasao = options.brasaoUrl || BRASAO_BASE64;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gestao360.gov.br';
  const validationUrl = `${origin}/validar-abastecimento?order=${encodeURIComponent(order.order_number)}`;
  const qrSvg = generateQrSvgSync(validationUrl, 82);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return new Date().toLocaleString('pt-BR');
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // Dados Orçamentários da Autorização
  const localBudgets = getLocalBudgetClassifications();
  const rawBudgetId = order.budget_classification_id || (order.budget_classification as any)?.id || targetVehicle?.budget_classification_id;
  const budget = order.budget_classification || 
    targetVehicle?.budget_classification || 
    localBudgets.find(b => b.id === rawBudgetId || b.invoice_sheet === rawBudgetId || (rawBudgetId && b.id === toBudgetUUID(rawBudgetId)));

  const localOrcamentario = budget?.department_local || targetVehicle?.department || 'Geral';
  const fichaOrcamentaria = budget?.invoice_sheet || (rawBudgetId ? String(rawBudgetId) : '—');
  const fonteRecurso = budget?.funding_source || '1.1.500.0';
  const dotacaoCode = budget?.budget_code ? `Cód: ${budget.budget_code}` : '';

  const isTopOff = order.supply_mode === 'encher_tanque' || !!order.is_full_tank_order;
  const tankCapacity = Number(targetVehicle?.tank_capacity || 0);

  const gestorEmissor = order.authorized_by_name || 'Departamento de Frotas';
  const cargoEmissor = order.authorized_by_role || 'Gestor Responsável pela Autorização';

  const renderViaBlock = (viaTitulo: string, viaBadge: string) => `
    <div class="voucher-box">
      <!-- CABEÇALHO OFICIAL -->
      <table class="header-table">
        <tr>
          <td style="width: 75px; text-align: center; vertical-align: middle;">
            <img src="${brasao}" alt="Brasão Oficial" class="brasao-img" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <div class="inst-mun">${municipio}</div>
            <div class="inst-state">${estado}</div>
            <div class="inst-sec">${secretaria}</div>
            <div class="inst-doc-title">AUTORIZAÇÃO OFICIAL DE FORNECIMENTO DE COMBUSTÍVEL</div>
            <div class="inst-subtitle">Contrato Licitatório Homologado • Lei Federal nº 14.133/2021 e Lei 4.320/64</div>
          </td>
          <td style="width: 200px; text-align: right; vertical-align: middle;">
            <div class="badge-via">${viaBadge}</div>
            <div class="order-num-box">
              <span class="order-num-label">AUTORIZAÇÃO Nº</span>
              <span class="order-num-val">${order.order_number}</span>
            </div>
            <div class="date-issue">Emissão: ${formatDate(order.created_at)}</div>
          </td>
        </tr>
      </table>

      <!-- CLASSIFICAÇÃO ORÇAMENTÁRIA (CENTRO DE CUSTO / LEI 4.320) -->
      <div class="budget-bar">
        <span class="budget-tag">CLASSIFICAÇÃO ORÇAMENTÁRIA:</span>
        <span class="budget-item"><strong>Local:</strong> ${localOrcamentario}</span>
        <span class="budget-item"><strong>Ficha:</strong> <span class="badge-ficha">${fichaOrcamentaria}</span></span>
        <span class="budget-item"><strong>Fonte:</strong> ${fonteRecurso}</span>
        ${dotacaoCode ? `<span class="budget-item"><strong>${dotacaoCode}</strong></span>` : ''}
      </div>

      <!-- GRID DE INFORMAÇÕES CONTRATUAIS E VEÍCULO -->
      <table class="data-table">
        <tr>
          <td style="width: 60%;">
            <span class="data-label">POSTO CREDENCIADO CONTRATADO:</span>
            <span class="data-value font-bold">${order.station_name || 'POSTO CONVENIADO OFICIAL'}</span>
          </td>
          <td style="width: 40%;">
            <span class="data-label">MODALIDADE DE FORNECIMENTO:</span>
            <span class="data-value font-bold" style="color: ${isTopOff ? '#047857' : '#1e3a8a'};">
              ${isTopOff ? '⛽ COMPLETAR TANQUE (TOP-OFF - ATÉ DESARME)' : 'LITRAGEM FIXA PRÉ-AUTORIZADA'}
            </span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="data-label">PLACA / PREFIXO / VEÍCULO:</span>
            <span class="data-value font-bold font-mono">${targetVehicle?.plate || 'SEM PLACA'} ${targetVehicle?.prefix_code ? `(${targetVehicle.prefix_code})` : ''}</span>
            <span class="data-value text-muted" style="margin-left: 8px;">• ${targetVehicle?.model || 'Veículo Municipal'}</span>
          </td>
          <td>
            <span class="data-label">MOTORISTA / CONDUTOR OFICIAL:</span>
            <span class="data-value font-bold">${order.driver_name} ${order.driver_document ? `(CPF: ${order.driver_document})` : ''}</span>
          </td>
        </tr>
      </table>

      <!-- QUADRO FINANCEIRO E VOLUMÉTRICO TRAVADO (SEM CAMPOS EM BRANCO) -->
      <div class="values-grid">
        <div class="value-card">
          <div class="val-title">COMBUSTÍVEL CONTRATUAL</div>
          <div class="val-number fuel-name">${formatFuelLabel(order.fuel_type)}</div>
          <div class="val-sub">Homologado p/ Veículo</div>
        </div>
        
        <div class="value-card ${isTopOff ? 'highlight-amber' : 'highlight-blue'}">
          <div class="val-title">${isTopOff ? 'REGIME DE LITRAGEM' : 'QUANTIDADE AUTORIZADA'}</div>
          <div class="val-number" style="${isTopOff ? 'font-size: 8.5px; color: #92400e; padding-top: 2px;' : ''}">
            ${isTopOff ? 'COMPLETAR TANQUE' : `${Number(order.liters_authorized).toFixed(2)} L`}
          </div>
          <div class="val-sub">${isTopOff ? `Até Desarme (Tanque: ${tankCapacity.toFixed(0)}L)` : `Capacidade Tanque: ${tankCapacity.toFixed(0)}L`}</div>
        </div>

        <div class="value-card">
          <div class="val-title">PREÇO LICITADO (R$/L)</div>
          <div class="val-number font-mono">R$ ${Number(order.bidded_unit_price).toFixed(3)}</div>
          <div class="val-sub">Contratual Fixo</div>
        </div>

        <div class="value-card ${isTopOff ? 'highlight-amber' : 'highlight-green'}">
          <div class="val-title">${isTopOff ? 'VALOR DA AUTORIZAÇÃO' : 'TOTAL AUTORIZADO (R$)'}</div>
          <div class="val-number font-mono" style="${isTopOff ? 'font-size: 8.5px; color: #b45309; padding-top: 3px;' : ''}">
            ${isTopOff ? 'A APURAR NA BOMBA' : `R$ ${Number(order.total_authorized_value).toFixed(2)}`}
          </div>
          <div class="val-sub">${isTopOff ? 'Regime Top-Off (Sem valor pré-fixado)' : 'Trava Máxima Homologada'}</div>
        </div>

        <div class="value-card">
          <div class="val-title">ODÔMETRO ANTERIOR (KM)</div>
          <div class="val-number font-mono">${Number(order.previous_odometer).toLocaleString('pt-BR')} KM</div>
          <div class="val-sub">Histórico do Sistema</div>
        </div>
      </div>

      <!-- COMPROVAÇÃO DE FORNECIMENTO NO ATO DO ABASTECIMENTO COM QR CODE -->
      <table class="act-table">
        <tr>
          <td style="width: 96px; text-align: center; vertical-align: middle; border-right: 1px dashed #cbd5e1; padding: 4px;">
            <div style="width: 82px; height: 82px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
              ${qrSvg}
            </div>
            <div style="font-size: 7px; color: #475569; margin-top: 2px; font-weight: 800; letter-spacing: 0.3px;">VALIDAÇÃO DIGITAL</div>
          </td>
          <td style="padding-left: 10px; vertical-align: middle;">
            <div style="font-size: 8.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 3px;">
              Conferência Presencial na Bomba pelo Motorista:
            </div>
            <div class="act-fields-grid">
              <div class="act-field-box">
                <span class="act-label">1. ODÔMETRO ATUAL NO PAINEL DO VEÍCULO (KM):</span>
                <span class="act-blank-val">${order.current_odometer ? `${Number(order.current_odometer).toLocaleString('pt-BR')} KM` : '____________________________________ KM'}</span>
              </div>
              <div class="act-field-box">
                <span class="act-label">2. LITRAGEM REAL FORNECIDA NA BOMBA (L):</span>
                <span class="act-blank-val">${order.liters_supplied ? `${Number(order.liters_supplied).toFixed(2)} L` : (isTopOff ? '_______ Litros (Registro da Bomba)' : `${Number(order.liters_authorized).toFixed(2)} Litros`)}</span>
              </div>
            </div>
            <div style="font-size: 7.5px; color: #475569; margin-top: 4px; line-height: 1.2;">
              * A Nota Fiscal é processada e conciliada internamente pelo Controle Interno da Prefeitura para liquidação contábil.
            </div>
          </td>
        </tr>
      </table>

      <!-- ASSINATURAS OBRIGATÓRIAS (AUTORIZADOR E CONDUTOR) - SEM FRENTISTA -->
      <table class="signatures-table">
        <tr>
          <td style="width: 50%; text-align: center; vertical-align: bottom; padding: 0 15px;">
            <div class="sig-line"></div>
            <div class="sig-name">${gestorEmissor}</div>
            <div class="sig-role">${cargoEmissor}</div>
          </td>
          <td style="width: 50%; text-align: center; vertical-align: bottom; padding: 0 15px;">
            <div class="sig-line"></div>
            <div class="sig-name">${order.driver_name}</div>
            <div class="sig-role">Motorista / Condutor no Ato do Abastecimento</div>
          </td>
        </tr>
      </table>

      <div class="legal-footer">
        Atesto que o combustível foi fornecido diretamente no tanque do veículo oficial acima identificado. O abastecimento fora do tanque ou divergência de odômetro configura infração disciplinar grave e crime de peculato/desvio (Lei 8.429/92 e Código Penal).
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Canhoto Oficial de Combustível - ${order.order_number}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 4mm 6mm 4mm 6mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          font-size: 9.5px;
          line-height: 1.25;
        }

        .page-container {
          width: 100%;
          height: 288mm;
          max-height: 288mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0;
          box-sizing: border-box;
        }

        .voucher-box {
          border: 1.5px solid #0f172a;
          border-radius: 6px;
          padding: 8px 12px;
          background: #ffffff;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          page-break-inside: avoid;
        }

        .header-table {
          width: 100%;
          border-collapse: collapse;
          border-bottom: 1.5px solid #0f172a;
          padding-bottom: 3px;
          margin-bottom: 4px;
        }
        .brasao-img {
          max-height: 52px;
          max-width: 65px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }
        .inst-mun {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #0f172a;
        }
        .inst-state {
          font-size: 8.5px;
          font-weight: 700;
          color: #475569;
        }
        .inst-sec {
          font-size: 9.5px;
          font-weight: 800;
          color: #1e3a8a;
          margin-top: 1px;
        }
        .inst-doc-title {
          font-size: 10.5px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 2px;
        }
        .inst-subtitle {
          font-size: 7.5px;
          color: #64748b;
        }

        .badge-via {
          display: inline-block;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          background: #0f172a;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 3px;
          margin-bottom: 3px;
        }
        .order-num-box {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 2px 6px;
          border-radius: 4px;
          text-align: right;
        }
        .order-num-label {
          display: block;
          font-size: 6.5px;
          font-weight: 800;
          color: #64748b;
        }
        .order-num-val {
          font-size: 12.5px;
          font-weight: 900;
          font-family: monospace;
          color: #b91c1c;
        }
        .date-issue {
          font-size: 7.5px;
          color: #64748b;
          margin-top: 2px;
        }

        .budget-bar {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 8.5px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }
        .budget-tag {
          font-weight: 900;
          color: #1e3a8a;
          text-transform: uppercase;
          font-size: 8px;
        }
        .badge-ficha {
          background: #e2e8f0;
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: 900;
          color: #0f172a;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4px;
        }
        .data-table td {
          border: 1px solid #e2e8f0;
          padding: 4px 7px;
          background: #ffffff;
        }
        .data-label {
          display: block;
          font-size: 7px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
        }
        .data-value {
          font-size: 9.5px;
          color: #0f172a;
        }
        .text-muted { color: #64748b; }
        .font-bold { font-weight: 800; }
        .font-mono { font-family: monospace; }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 5px;
          margin-bottom: 4px;
        }
        .value-card {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 4px 5px;
          text-align: center;
          background: #ffffff;
        }
        .value-card.highlight-blue {
          background: #eff6ff;
          border-color: #93c5fd;
        }
        .value-card.highlight-green {
          background: #f0fdf4;
          border-color: #86efac;
        }
        .value-card.highlight-amber {
          background: #fffbeb;
          border-color: #fde68a;
        }
        .val-title {
          font-size: 7px;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
        }
        .val-number {
          font-size: 11px;
          font-weight: 900;
          color: #0f172a;
          margin: 1px 0;
        }
        .val-number.fuel-name {
          font-size: 8.5px;
          color: #1e3a8a;
        }
        .val-sub {
          font-size: 7px;
          color: #64748b;
        }

        .act-table {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          border-collapse: separate;
          background: #ffffff;
          margin-bottom: 4px;
        }
        .act-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .act-field-box {
          border: 1px solid #94a3b8;
          padding: 4px 6px;
          border-radius: 3px;
          background: #f8fafc;
        }
        .act-label {
          display: block;
          font-size: 7px;
          font-weight: 800;
          color: #1e293b;
        }
        .act-blank-val {
          display: block;
          font-size: 10.5px;
          font-weight: 900;
          color: #0f172a;
          font-family: monospace;
          margin-top: 1px;
        }

        .signatures-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          margin-bottom: 4px;
        }
        .sig-line {
          width: 80%;
          border-bottom: 1.5px solid #0f172a;
          margin: 0 auto 3px auto;
        }
        .sig-name {
          font-size: 9px;
          font-weight: 800;
          color: #0f172a;
        }
        .sig-role {
          font-size: 7.5px;
          color: #475569;
        }

        .legal-footer {
          font-size: 6.5px;
          color: #64748b;
          text-align: justify;
          line-height: 1.15;
          border-top: 1px dashed #cbd5e1;
          padding-top: 3px;
          margin-top: 3px;
        }

        /* LINHA DE CORTE DESTACÁVEL ENTRE AS VIAS */
        .cut-divider {
          text-align: center;
          position: relative;
          margin: 4px 0;
        }
        .cut-line {
          border-top: 1.5px dashed #94a3b8;
          width: 100%;
          margin: 0;
        }
        .cut-badge {
          display: inline-block;
          background: #ffffff;
          padding: 0 10px;
          font-size: 8px;
          font-weight: 800;
          color: #64748b;
          position: relative;
          top: -7px;
          letter-spacing: 0.5px;
        }
      </style>
      <script>
        window.addEventListener('load', function() {
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 120);
            });
          } else {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 180);
          }
        });
      </script>
    </head>
    <body>
      <div class="page-container">
        <!-- 1ª VIA - CONTROLE INTERNO / PREFEITURA -->
        ${renderViaBlock(
          'AUTORIZAÇÃO DE FORNECIMENTO DE COMBUSTÍVEL',
          '1ª VIA - CONTROLE INTERNO / ARQUIVO'
        )}

        <!-- LINHA DE CORTE OFICIAL -->
        <div class="cut-divider">
          <hr class="cut-line" />
          <span class="cut-badge">✂ DESTACAR AQUI — CANHOTO OFICIAL PARA O MOTORISTA / CONDUTOR NO FORNECIMENTO</span>
        </div>

        <!-- 2ª VIA - MOTORISTA / CONDUTOR -->
        ${renderViaBlock(
          'AUTORIZAÇÃO DE FORNECIMENTO DE COMBUSTÍVEL',
          '2ª VIA - MOTORISTA / VIA DO CONDUTOR'
        )}
      </div>
    </body>
    </html>
  `;
}

/**
 * Dispara impressão ou exportação em PDF da folha A4 com as 2 vias
 */
export function imprimirCanhotoDuasVias(
  order: TwoWayFuelOrder,
  vehicle?: FleetVehicle,
  options: FuelVoucherOptions = {}
): void {
  const html = gerarCanhotoDuasViasHtml(order, vehicle, options);
  const printWindow = window.open('', '_blank', 'width=1000,height=900,top=30,left=30');

  if (!printWindow) {
    alert('Por favor, permita pop-ups no seu navegador para imprimir a Autorização em Duas Vias.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Fallback para caso evento onload não dispare no documento filho
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 200);
  };
}

/**
 * Componente React para Preview na tela de Frotas
 */
export const FuelAuthorizationVoucherPDF: React.FC<{
  order: TwoWayFuelOrder;
  vehicle?: FleetVehicle;
  options?: FuelVoucherOptions;
  onClose?: () => void;
}> = ({ order, vehicle, options, onClose }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center bg-neutral-100 dark:bg-neutral-800 p-4 rounded-xl">
        <div>
          <h3 className="text-base font-black text-neutral-900 dark:text-white">
            Canhoto Oficial em Duas Vias (A4)
          </h3>
          <p className="text-xs text-neutral-500">
            Autorização nº <span className="font-mono font-bold text-amber-600">{order.order_number}</span> • Gestor Emissor + Motorista (Sem campo de frentista)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => imprimirCanhotoDuasVias(order, vehicle, options)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-all"
          >
            Imprimir Duas Vias (A4 / PDF)
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 text-xs font-bold px-3 py-2 rounded-lg transition-all"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      <div className="border border-neutral-300 dark:border-neutral-700 rounded-xl overflow-hidden bg-white shadow-inner">
        <iframe
          title="Pré-visualização do Canhoto"
          srcDoc={gerarCanhotoDuasViasHtml(order, vehicle, options)}
          className="w-full h-[600px] border-none"
        />
      </div>
    </div>
  );
};
