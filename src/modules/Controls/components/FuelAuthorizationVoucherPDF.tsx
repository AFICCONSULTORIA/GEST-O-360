/**
 * Componente e Motor de Impressão do Canhoto Oficial em Duas Vias
 * Arquivo: src/modules/Controls/components/FuelAuthorizationVoucherPDF.tsx
 * Sistema GESTÃO 360 - Módulo de Frotas / Controles Internos
 * Documento Oficial A4: 1ª Via (Controle Interno) + 2ª Via (Motorista / Posto Credenciado)
 */

import React from 'react';
import { TwoWayFuelOrder } from '../../../lib/api/fleetFuelAudit';
import { FleetVehicle } from '../../../lib/api/fleetFuel';

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
  
  const brasao = options.brasaoUrl || '/brasao-municipio.png';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gestao360.gov.br';
  const validationUrl = `${origin}/validar-abastecimento?order=${encodeURIComponent(order.order_number)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(validationUrl)}&color=0-0-0&bgcolor=255-255-255`;

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

  const metricLabel = 'ODÔMETRO (KM)';
  const metricUnit = 'KM';

  const renderViaBlock = (viaTitulo: string, viaBadge: string) => `
    <div class="voucher-box">
      <!-- CABEÇALHO -->
      <table class="header-table">
        <tr>
          <td style="width: 80px; text-align: center; vertical-align: middle;">
            <img src="${brasao}" alt="Brasão Oficial" class="brasao-img" onerror="this.style.display='none'" />
          </td>
          <td style="vertical-align: middle; padding-left: 10px;">
            <div class="inst-mun">${municipio}</div>
            <div class="inst-state">${estado}</div>
            <div class="inst-sec">${secretaria}</div>
            <div class="inst-doc-title">AUTORIZAÇÃO DE FORNECIMENTO DE COMBUSTÍVEL</div>
            <div class="inst-subtitle">Contrato Licitatório Homologado • Lei Federal nº 14.133/2021 e Lei 4.320/64</div>
          </td>
          <td style="width: 190px; text-align: right; vertical-align: middle;">
            <div class="badge-via">${viaBadge}</div>
            <div class="order-num-box">
              <span class="order-num-label">AUTORIZAÇÃO Nº</span>
              <span class="order-num-val">${order.order_number}</span>
            </div>
            <div class="date-issue">Emissão: ${formatDate(order.created_at)}</div>
          </td>
        </tr>
      </table>

      <!-- GRID DE INFORMAÇÕES CONTRATUAIS E VEÍCULO -->
      <table class="data-table">
        <tr>
          <td colspan="2">
            <span class="data-label">POSTO CREDENCIADO CONTRATADO:</span>
            <span class="data-value font-bold">${order.station_name || 'POSTO CONVENIADO OFICIAL'}</span>
          </td>
          <td colspan="2">
            <span class="data-label">STATUS DA AUTORIZAÇÃO:</span>
            <span class="data-value font-bold" style="color: #047857;">${order.status.toUpperCase().replace('_', ' ')}</span>
          </td>
        </tr>
        <tr>
          <td style="width: 25%;">
            <span class="data-label">PLACA / PREFIXO:</span>
            <span class="data-value font-bold font-mono">${targetVehicle?.plate || 'SEM PLACA'} ${targetVehicle?.prefix_code ? `(${targetVehicle.prefix_code})` : ''}</span>
          </td>
          <td style="width: 35%;">
            <span class="data-label">MARCA / MODELO / OBJETO:</span>
            <span class="data-value">${targetVehicle?.model || 'Veículo Municipal'}</span>
          </td>
          <td style="width: 40%;" colspan="2">
            <span class="data-label">MOTORISTA / CONDUTOR DESIGNADO:</span>
            <span class="data-value font-bold">${order.driver_name} ${order.driver_document ? `(CPF/Matr: ${order.driver_document})` : ''}</span>
          </td>
        </tr>
      </table>

      <!-- QUADRO FINANCEIRO E VOLUMÉTRICO TRAVADO (SEM CAMPOS EM BRANCO) -->
      <div class="values-grid">
        <div class="value-card">
          <div class="val-title">COMBUSTÍVEL CONTRATUAL</div>
          <div class="val-number fuel-name">${formatFuelLabel(order.fuel_type)}</div>
          <div class="val-sub">Definido p/ o Veículo</div>
        </div>
        <div class="value-card highlight-blue">
          <div class="val-title">QUANTIDADE AUTORIZADA</div>
          <div class="val-number">${Number(order.liters_authorized).toFixed(2)} L</div>
          <div class="val-sub">Tanque: ${Number(targetVehicle?.tank_capacity || 0).toFixed(0)}L</div>
        </div>
        <div class="value-card">
          <div class="val-title">PREÇO LICITADO (R$/L)</div>
          <div class="val-number font-mono">R$ ${Number(order.bidded_unit_price).toFixed(3)}</div>
          <div class="val-sub">Valor Contratual Fixo</div>
        </div>
        <div class="value-card highlight-green">
          <div class="val-title">TOTAL AUTORIZADO (R$)</div>
          <div class="val-number font-mono">R$ ${Number(order.total_authorized_value).toFixed(2)}</div>
          <div class="val-sub">Trava Máxima Homologada</div>
        </div>
        <div class="value-card">
          <div class="val-title">ODÔMETRO ANTERIOR (KM)</div>
          <div class="val-number font-mono">${Number(order.previous_odometer).toLocaleString('pt-BR')} KM</div>
          <div class="val-sub">Referência Congelada</div>
        </div>
      </div>

      <!-- COMPROVAÇÃO DE FORNECIMENTO NO ATO DO ABASTECIMENTO COM QR CODE -->
      <table class="act-table">
        <tr>
          <td style="width: 100px; text-align: center; vertical-align: middle; border-right: 1px dashed #cbd5e1; padding: 6px;">
            <img src="${qrCodeUrl}" alt="QR Code Autenticidade" style="width: 82px; height: 82px; display: block; margin: 0 auto;" />
            <div style="font-size: 7.5px; color: #64748b; margin-top: 3px; font-weight: bold;">VALIDAÇÃO DIGITAL</div>
          </td>
          <td style="padding-left: 12px; vertical-align: middle;">
            <div style="font-size: 9px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 4px;">
              Conferência Presencial Obrigatória no Ato da Bomba:
            </div>
            <div class="act-field-box">
              <span class="act-label">1. ODÔMETRO ATUAL NO PAINEL DO VEÍCULO (KM):</span>
              <span class="act-blank-val">${order.current_odometer ? `${order.current_odometer} KM` : '____________________________________ KM'}</span>
            </div>
            <div style="font-size: 8px; color: #475569; margin-top: 5px; line-height: 1.2;">
              * A Nota Fiscal faturada pelo posto credenciado é processada e conciliada internamente pelo Controle Interno da Prefeitura para liquidação contábil.
            </div>
          </td>
        </tr>
      </table>

      <!-- ASSINATURAS OBRIGATÓRIAS -->
      <table class="signatures-table">
        <tr>
          <td style="width: 50%; text-align: center; vertical-align: bottom;">
            <div class="sig-line"></div>
            <div class="sig-name">${order.driver_name}</div>
            <div class="sig-role">Assinatura do Motorista / Condutor Autorizado</div>
          </td>
          <td style="width: 50%; text-align: center; vertical-align: bottom;">
            <div class="sig-line"></div>
            <div class="sig-name">Frentista / Posto Credenciado</div>
            <div class="sig-role">Carimbo e Assinatura do Fornecedor</div>
          </td>
        </tr>
      </table>

      <div class="legal-footer">
        Atestamos que o combustível foi fornecido diretamente no tanque do veículo oficial indicado. O abastecimento fora do tanque ou divergência de odômetro configura infração administrativa e crime de peculato/desvio (Lei 8.429/92 e Código Penal).
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
          margin: 8mm 10mm 8mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-size: 9.5px;
          line-height: 1.25;
        }

        .page-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .voucher-box {
          border: 1.5px solid #0f172a;
          border-radius: 6px;
          padding: 8px 10px;
          background: #ffffff;
        }

        .header-table {
          width: 100%;
          border-collapse: collapse;
          border-bottom: 1.5px solid #0f172a;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .brasao-img {
          max-height: 60px;
          max-width: 65px;
          object-fit: contain;
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
          margin-top: 2px;
        }
        .inst-doc-title {
          font-size: 10px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 3px;
        }
        .inst-subtitle {
          font-size: 7.5px;
          color: #64748b;
        }

        .badge-via {
          display: inline-block;
          font-size: 8.5px;
          font-weight: 900;
          text-transform: uppercase;
          background: #0f172a;
          color: #ffffff;
          padding: 2px 7px;
          border-radius: 4px;
          margin-bottom: 4px;
        }
        .order-num-box {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 3px 6px;
          border-radius: 4px;
          text-align: right;
        }
        .order-num-label {
          display: block;
          font-size: 7px;
          font-weight: 800;
          color: #64748b;
        }
        .order-num-val {
          font-size: 12px;
          font-weight: 900;
          font-family: monospace;
          color: #b91c1c;
        }
        .date-issue {
          font-size: 7.5px;
          color: #64748b;
          margin-top: 2px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
        }
        .data-table td {
          border: 1px solid #e2e8f0;
          padding: 3px 6px;
          background: #f8fafc;
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
        .font-bold { font-weight: 800; }
        .font-mono { font-family: monospace; }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          margin-bottom: 6px;
        }
        .value-card {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 4px;
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
          font-size: 9px;
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
          margin-bottom: 6px;
        }
        .act-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .act-field-box {
          border: 1px solid #94a3b8;
          padding: 3px 6px;
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
          font-size: 10px;
          font-weight: 900;
          color: #0f172a;
          font-family: monospace;
          margin-top: 2px;
        }

        .signatures-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          margin-bottom: 4px;
        }
        .sig-line {
          width: 80%;
          border-bottom: 1px solid #0f172a;
          margin: 0 auto 3px auto;
        }
        .sig-name {
          font-size: 8.5px;
          font-weight: 800;
          color: #0f172a;
        }
        .sig-role {
          font-size: 7.5px;
          color: #64748b;
        }

        .legal-footer {
          font-size: 6.5px;
          color: #64748b;
          text-align: justify;
          line-height: 1.1;
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
          padding: 0 8px;
          font-size: 8px;
          font-weight: 800;
          color: #64748b;
          position: relative;
          top: -6px;
          letter-spacing: 0.5px;
        }
      </style>
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
          <span class="cut-badge">✂ DESTACAR AQUI — CANHOTO OFICIAL PARA O MOTORISTA / POSTO FORNECEDOR</span>
        </div>

        <!-- 2ª VIA - MOTORISTA / POSTO CREDENCIADO -->
        ${renderViaBlock(
          'AUTORIZAÇÃO DE FORNECIMENTO DE COMBUSTÍVEL',
          '2ª VIA - MOTORISTA / POSTO CREDENCIADO'
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
  const printWindow = window.open('', '_blank', 'width=950,height=850,top=40,left=40');

  if (!printWindow) {
    alert('Por favor, permita pop-ups no seu navegador para imprimir a Autorização em Duas Vias.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 350);
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
            Autorização nº <span className="font-mono font-bold text-amber-600">{order.order_number}</span> • Dados 100% preenchidos e travados
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

