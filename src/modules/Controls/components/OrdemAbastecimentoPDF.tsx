/**
 * Componente e Utilitário de Geração da Ordem de Abastecimento Oficial (PDF / Impressão A4)
 * Padrão TCE / Liquidação de Despesa Pública com Brasão Municipal, QR Code e Canhoto Destacável
 */

import { FuelSupplyOrder, FleetVehicle } from '../../../lib/api/fleetFuel';

interface OrdemAbastecimentoOptions {
  municipioNome?: string;
  estadoNome?: string;
  secretariaNome?: string;
  sistemaUrl?: string;
}

export function gerarOrdemAbastecimentoHtml(
  order: FuelSupplyOrder,
  vehicle?: FleetVehicle,
  options: OrdemAbastecimentoOptions = {}
): string {
  const municipio = options.municipioNome || 'PREFEITURA MUNICIPAL';
  const estado = options.estadoNome || 'ESTADO DE MATO GROSSO';
  const secretaria = vehicle?.department ? `SECRETARIA MUNICIPAL DE ${vehicle.department.toUpperCase()}` : (options.secretariaNome || 'DEPARTAMENTO DE GESTÃO DE FROTAS');
  
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

  const formatFuelName = (fuel: string) => {
    switch (fuel) {
      case 'diesel_s10': return 'DIESEL S-10';
      case 'diesel_s500': return 'DIESEL S-500';
      case 'gasolina': return 'GASOLINA COMUM';
      case 'etanol': return 'ETANOL HIDRATADO';
      case 'arla32': return 'ARLA 32';
      default: return fuel.toUpperCase();
    }
  };

  const plateFormatted = vehicle?.plate || 'SEM PLACA';
  const prefixFormatted = vehicle?.prefix_code || 'FROTA';
  const metricLabel = vehicle?.metric_type === 'horimetro' ? 'HORÍMETRO' : 'ODÔMETRO (KM)';
  const metricUnit = vehicle?.metric_type === 'horimetro' ? 'horas' : 'km';

  // URL para autenticação via QR Code
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://gestao360.gov.br'}/valida-abastecimento/${order.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}&color=0-0-0&bgcolor=255-255-255`;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Ordem de Abastecimento - ${order.order_number}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
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
          font-size: 11px;
          line-height: 1.35;
        }
        .order-container {
          width: 100%;
          border: 1.5px solid #0f172a;
          padding: 14px;
          background: #ffffff;
          border-radius: 4px;
        }

        /* CABEÇALHO OFICIAL */
        .header-table {
          width: 100%;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .header-logo {
          width: 72px;
          height: 72px;
          object-fit: contain;
        }
        .header-titles {
          text-align: center;
          padding: 0 10px;
        }
        .header-titles h1 {
          font-size: 15px;
          font-weight: 900;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
        }
        .header-titles h2 {
          font-size: 11px;
          font-weight: 700;
          margin: 2px 0 0 0;
          text-transform: uppercase;
          color: #334155;
        }
        .header-titles .dept-tag {
          font-size: 9.5px;
          font-weight: 600;
          color: #475569;
          margin-top: 3px;
        }
        .header-badge {
          text-align: right;
          width: 140px;
        }
        .order-tag-box {
          background: #f1f5f9;
          border: 1.5px solid #0f172a;
          padding: 6px 8px;
          border-radius: 4px;
          text-align: center;
        }
        .order-tag-title {
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
        }
        .order-tag-number {
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.5px;
        }

        /* SEÇÃO DE TÍTULO PRINCIPAL */
        .title-bar {
          background: #0f172a;
          color: #ffffff;
          text-align: center;
          padding: 6px;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          border-radius: 2px;
        }

        /* TABELAS E GRIDS */
        .section-box {
          border: 1px solid #cbd5e1;
          margin-bottom: 10px;
          background: #ffffff;
          border-radius: 4px;
          overflow: hidden;
        }
        .section-head {
          background: #f8fafc;
          border-bottom: 1px solid #cbd5e1;
          padding: 4px 10px;
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #1e293b;
        }
        .section-content {
          padding: 8px 10px;
        }

        .data-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px 12px;
        }
        .data-item {
          display: flex;
          flex-direction: column;
        }
        .data-item.span-2 {
          grid-column: span 2;
        }
        .data-item.span-3 {
          grid-column: span 3;
        }
        .data-item.span-4 {
          grid-column: span 4;
        }
        .data-label {
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 2px;
        }
        .data-value {
          font-size: 11px;
          font-weight: 600;
          color: #0f172a;
        }
        .data-value.highlight {
          font-weight: 800;
          font-size: 13px;
          color: #0f172a;
        }

        /* PLACA MERCOSUL ESTILIZADA */
        .mercosul-plate {
          display: inline-block;
          border: 1.5px solid #000;
          border-radius: 4px;
          background: #fff;
          width: 115px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          text-align: center;
          overflow: hidden;
        }
        .mercosul-top {
          background: #003399;
          color: #fff;
          font-size: 7px;
          font-weight: 900;
          padding: 1px 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          letter-spacing: 0.5px;
        }
        .mercosul-body {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 1px;
          color: #000;
          padding: 2px 0;
        }

        /* CAIXA DE AUTORIZAÇÃO / LIMITES */
        .auth-banner {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 10px;
          background: #f8fafc;
          border: 1.5px dashed #0f172a;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 12px;
          align-items: center;
        }
        .auth-item {
          text-align: center;
        }
        .auth-item-title {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
        }
        .auth-item-val {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 2px;
        }

        /* QR CODE E AUTENTICIDADE */
        .auth-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          margin-bottom: 16px;
        }
        .auth-qr-block {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .qr-img {
          width: 64px;
          height: 64px;
          border: 1px solid #0f172a;
          border-radius: 4px;
          padding: 2px;
          background: #fff;
        }
        .auth-text {
          font-size: 9px;
          color: #475569;
          max-width: 440px;
        }

        /* LINHA PICOTADA PARA DESTACAR CANHOTO */
        .cut-line-wrapper {
          position: relative;
          text-align: center;
          margin: 18px 0 14px 0;
        }
        .cut-line {
          border-top: 1.5px dashed #475569;
          width: 100%;
        }
        .cut-badge {
          position: absolute;
          top: -9px;
          left: 50%;
          transform: translateX(-50%);
          background: #ffffff;
          padding: 0 10px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* CANHOTO DE ABASTECIMENTO (RODAPÉ DESTACÁVEL) */
        .canhoto-container {
          border: 2px solid #0f172a;
          border-radius: 4px;
          background: #fff;
          padding: 10px 12px;
        }
        .canhoto-title {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          text-align: center;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 6px;
          margin-bottom: 8px;
          color: #0f172a;
        }
        .canhoto-fill-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 14px;
        }
        .fill-box {
          border: 1px solid #94a3b8;
          padding: 4px 6px;
          border-radius: 3px;
          background: #f8fafc;
          min-height: 40px;
        }
        .fill-label {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
        }
        .fill-blank {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 6px;
        }

        /* ASSINATURAS DO CANHOTO */
        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 8px;
          padding-top: 8px;
        }
        .sig-block {
          text-align: center;
        }
        .sig-line {
          border-top: 1.2px solid #0f172a;
          margin: 28px 10px 4px 10px;
        }
        .sig-name {
          font-size: 9.5px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
        }
        .sig-role {
          font-size: 8px;
          font-weight: 600;
          color: #64748b;
        }

        .legal-notice {
          font-size: 7.5px;
          color: #64748b;
          text-align: center;
          margin-top: 8px;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="order-container">
        <!-- 1. CABEÇALHO OFICIAL COM BRASÃO -->
        <table class="header-table">
          <tr>
            <td style="width: 80px;">
              <img src="/brasao-municipio.png" alt="Brasão Oficial" class="header-logo" onerror="this.src='/icon.svg';" />
            </td>
            <td class="header-titles">
              <h1>${municipio}</h1>
              <h2>${estado}</h2>
              <div class="dept-tag">${secretaria}</div>
              <div style="font-size: 8px; color: #64748b; margin-top: 2px;">SISTEMA INTEGRADO DE GESTÃO E CONTROLE DE FROTAS • GESTÃO 360</div>
            </td>
            <td class="header-badge">
              <div class="order-tag-box">
                <div class="order-tag-title">Ordem de Abastecimento</div>
                <div class="order-tag-number">${order.order_number}</div>
                <div style="font-size: 8px; color: #475569; margin-top: 2px;">${formatDate(order.created_at)}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- 2. BARRA DE IDENTIFICAÇÃO -->
        <div class="title-bar">
          Autorização Prévia de Fornecimento de Combustível
        </div>

        <!-- 3. DADOS DO ESTABELECIMENTO CREDENCIADO -->
        <div class="section-box">
          <div class="section-head">1. Estabelecimento Fornecedor Credenciado</div>
          <div class="section-content">
            <div class="data-grid">
              <div class="data-item span-3">
                <span class="data-label">Posto Conveniado Autorizado</span>
                <span class="data-value highlight">${order.station_name}</span>
              </div>
              <div class="data-item">
                <span class="data-label">Tipo de Contrato</span>
                <span class="data-value">Registro de Preços / Pregão Presencial</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. DADOS DO VEÍCULO E OPERADOR -->
        <div class="section-box">
          <div class="section-head">2. Identificação Técnica do Veículo / Máquina e Condutor</div>
          <div class="section-content">
            <div class="data-grid">
              <div class="data-item">
                <span class="data-label">Placa Oficial</span>
                <div class="mercosul-plate">
                  <div class="mercosul-top">
                    <span>BRASIL</span>
                    <span>🇧🇷</span>
                  </div>
                  <div class="mercosul-body">${plateFormatted}</div>
                </div>
              </div>

              <div class="data-item">
                <span class="data-label">Prefixo / Código</span>
                <span class="data-value highlight">${prefixFormatted}</span>
              </div>

              <div class="data-item span-2">
                <span class="data-label">Modelo / Marca / Fabricante</span>
                <span class="data-value highlight">${vehicle?.model || 'Veículo Municipal'}</span>
              </div>

              <div class="data-item span-2">
                <span class="data-label">Motorista / Operador Autorizado</span>
                <span class="data-value highlight">${order.driver_name}</span>
              </div>

              <div class="data-item">
                <span class="data-label">Matrícula / Documento</span>
                <span class="data-value">${order.driver_document || 'Não informada'}</span>
              </div>

              <div class="data-item">
                <span class="data-label">Secretaria / Lotação</span>
                <span class="data-value">${vehicle?.department || 'Administração'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. PARÂMETROS E LIMITES DE FORNECIMENTO -->
        <div class="auth-banner">
          <div class="auth-item" style="text-align: left; padding-left: 8px;">
            <div class="auth-item-title">Combustível Homologado</div>
            <div class="auth-item-val" style="color: #0369a1;">${formatFuelName(order.fuel_type)}</div>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Capacidade Máxima do Tanque: <strong>${vehicle?.tank_capacity.toFixed(2) || '0.00'} Litros</strong></div>
          </div>

          <div class="auth-item">
            <div class="auth-item-title">Litragem Máxima Autorizada</div>
            <div class="auth-item-val" style="color: #15803d;">${order.liters_authorized.toFixed(2)} L</div>
            <div style="font-size: 8.5px; color: #15803d; font-weight: 700; margin-top: 2px;">PROIBIDO EXCEDER</div>
          </div>

          <div class="auth-item">
            <div class="auth-item-title">${metricLabel} Anterior</div>
            <div class="auth-item-val" style="color: #334155;">${order.previous_odometer.toLocaleString('pt-BR')} ${metricUnit}</div>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Consumo Ref.: ${vehicle?.expected_consumption.toFixed(2) || '0.00'} ${vehicle?.metric_type === 'horimetro' ? 'l/h' : 'km/l'}</div>
          </div>
        </div>

        <!-- 6. QR CODE E AUTENTICAÇÃO DIGITAL -->
        <div class="auth-footer">
          <div class="auth-qr-block">
            <img src="${qrCodeUrl}" alt="QR Code de Validação" class="qr-img" />
            <div class="auth-text">
              <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 2px;">
                Validação Digital e Controle em Tempo Real
              </div>
              <div>Aponte a câmera do celular no QR Code para verificar a autenticidade e status desta autorização. Documento eletrônico rastreável em conformidade com as Instruções Normativas do Tribunal de Contas.</div>
              <div style="font-size: 8px; color: #94a3b8; margin-top: 3px;">Hash de Autenticidade: ${order.id}</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 8px; color: #64748b;">
            <div>Emissão: <strong>${formatDate(order.created_at)}</strong></div>
            <div>Gestor Responsável: <strong>Controle de Frotas</strong></div>
          </div>
        </div>

        <!-- 7. LINHA DE CORTE PICOTADA -->
        <div class="cut-line-wrapper">
          <div class="cut-line"></div>
          <div class="cut-badge">
            <span>✂️</span>
            <span>DESTACAR NO ATO DO FORNECIMENTO PELO POSTO CONVENIADO</span>
          </div>
        </div>

        <!-- 8. CANHOTO DESTACÁVEL DE ABASTECIMENTO -->
        <div class="canhoto-container">
          <div class="canhoto-title">
            CANHOTO OFICIAL DE COMPROVAÇÃO DE FORNECIMENTO (VIA DO CONTROLE INTERNO / PREFEITURA)
          </div>

          <div style="font-size: 8.5px; color: #334155; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>Ordem: <strong>${order.order_number}</strong> | Veículo: <strong>${plateFormatted} (${prefixFormatted})</strong></span>
            <span>Posto: <strong>${order.station_name}</strong> | Data: <strong>____/____/2026</strong></span>
          </div>

          <!-- CAMPOS DE PREENCHIMENTO MANUAL PELO FRENTISTA -->
          <div class="canhoto-fill-grid">
            <div class="fill-box">
              <div class="fill-label">1. Litros Abastecidos</div>
              <div class="fill-blank">${order.liters_supplied ? `${order.liters_supplied.toFixed(2)} L` : '___________ Litros'}</div>
            </div>

            <div class="fill-box">
              <div class="fill-label">2. Preço Unitário (R$)</div>
              <div class="fill-blank">${order.unit_price ? `R$ ${order.unit_price.toFixed(3)}` : 'R$ _________'}</div>
            </div>

            <div class="fill-box">
              <div class="fill-label">3. Valor Total (R$)</div>
              <div class="fill-blank">${order.total_value ? `R$ ${order.total_value.toFixed(2)}` : 'R$ _________'}</div>
            </div>

            <div class="fill-box">
              <div class="fill-label">4. ${metricLabel} no Ato</div>
              <div class="fill-blank">${order.liters_supplied && order.current_odometer ? `${order.current_odometer} ${metricUnit}` : '___________ ' + metricUnit}</div>
            </div>

            <div class="fill-box">
              <div class="fill-label">5. Cupom / NF-e Nº</div>
              <div class="fill-blank">${order.invoice_number ? order.invoice_number : 'Nº ____________'}</div>
            </div>
          </div>

          <!-- ASSINATURAS OBRIGATÓRIAS -->
          <div class="signatures-grid">
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-name">${order.driver_name}</div>
              <div class="sig-role">Assinatura do Motorista / Condutor Autorizado</div>
            </div>

            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-name">Responsável / Frentista do Posto</div>
              <div class="sig-role">Carimbo e Assinatura do Estabelecimento Credenciado</div>
            </div>
          </div>

          <div class="legal-notice">
            Atesto que o combustível acima especificado foi efetivamente fornecido diretamente no tanque do veículo oficial indicado, estando o odômetro e os valores devidamente conferidos. A adulteração ou fornecimento fora do tanque constitui crime contra a administração pública (Lei 8.429/92 e Código Penal).
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Abre a janela nativa do navegador para impressão oficial ou exportação em PDF
 */
export function imprimirOrdemAbastecimento(
  order: FuelSupplyOrder,
  vehicle?: FleetVehicle,
  options: OrdemAbastecimentoOptions = {}
): void {
  const html = gerarOrdemAbastecimentoHtml(order, vehicle, options);
  const printWindow = window.open('', '_blank', 'width=900,height=800,top=50,left=50');

  if (!printWindow) {
    alert('Por favor, permita pop-ups no seu navegador para imprimir a Ordem de Abastecimento.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Aguarda carregamento de imagens (brasão e QR code) antes de disparar o print
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
