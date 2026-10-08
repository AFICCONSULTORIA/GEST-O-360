import { RegistroAlteracaoContabil, ACOES_CONTADORA_CONFIG } from '../types/livroContadora';

interface FichaResguardoOptions {
  municipioNome?: string;
  estadoNome?: string;
  contadoraNome?: string;
  contadoraCrc?: string;
}

export function gerarFichaResguardoHtml(
  registro: RegistroAlteracaoContabil,
  options: FichaResguardoOptions = {}
): string {
  const municipio = options.municipioNome || 'PREFEITURA MUNICIPAL';
  const estado = options.estadoNome || 'ESTADO DE MATO GROSSO';
  const contadora = options.contadoraNome || 'Contadoria Geral do Município';
  const crc = options.contadoraCrc || 'CRC/MT';

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDateExact = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    } catch {}
    return isoStr;
  };

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  };

  const emissaoNow = new Date().toLocaleString('pt-BR');
  const acaoConf = ACOES_CONTADORA_CONFIG[registro.acaoDaContadora] || { label: registro.acaoDaContadora };

  // Verifica se o comprovante é imagem para incorporação direta
  const isImage = registro.comprovanteUrl && (
    registro.comprovanteUrl.startsWith('data:image/') ||
    registro.comprovanteTipo?.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif)$/i.test(registro.comprovanteNome || '')
  );

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Ficha de Resguardo Contábil - ${registro.documentoAfetado}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 14mm 14mm 14mm; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
          margin: 0; padding: 0; color: #0f172a; font-size: 10.5px; line-height: 1.35; 
        }
        .header { 
          text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; 
        }
        .header h1 { margin: 0; font-size: 14px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px; }
        .header h2 { margin: 2px 0 0 0; font-size: 11.5px; color: #334155; font-weight: 800; text-transform: uppercase; }
        .header h3 { margin: 4px 0 0 0; font-size: 11px; color: #4338ca; font-weight: 800; }
        .header p { margin: 3px 0 0 0; font-size: 9px; color: #64748b; }
        
        .badge-box {
          display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 10px;
          text-transform: uppercase; border: 1px solid #cbd5e1;
        }
        .badge-feita { background-color: #ecfdf5; color: #047857; border-color: #a7f3d0; }
        .badge-recusada { background-color: #fff1f2; color: #be123c; border-color: #fecdd3; }
        .badge-ressalva { background-color: #fffbeb; color: #b45309; border-color: #fde68a; }

        .section { margin-bottom: 11px; }
        .section-title { 
          font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a; 
          background: #f1f5f9; padding: 4px 8px; border-left: 4px solid #4338ca; margin-bottom: 6px; 
          display: flex; justify-content: space-between; align-items: center;
        }
        
        .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .grid-table td { 
          padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 10px; vertical-align: top; 
        }
        .grid-table td.label { 
          font-weight: 800; color: #475569; width: 25%; background: #f8fafc; font-size: 9.5px; text-transform: uppercase;
        }
        .grid-table td.val { font-weight: 600; color: #0f172a; }

        .highlight-box {
          background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 6px;
          margin-top: 4px; font-size: 10px; line-height: 1.4;
        }
        .alert-declaration {
          background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; padding: 8px 10px; border-radius: 6px;
          font-size: 9.5px; line-height: 1.4; margin-top: 8px; font-style: italic;
        }

        .comprovante-wrapper {
          text-align: center; margin: 8px 0; padding: 8px; background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 6px;
        }
        .comprovante-img {
          max-width: 100%; max-height: 290px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .signatures { margin-top: 18px; width: 100%; border-collapse: collapse; }
        .signatures td { width: 50%; text-align: center; padding: 0 20px; vertical-align: top; }
        .sign-line { border-top: 1px solid #0f172a; margin-top: 36px; padding-top: 4px; font-size: 9.5px; font-weight: 800; color: #0f172a; }
        .sign-sub { font-size: 8.5px; color: #64748b; font-weight: normal; margin-top: 1px; }

        .footer { 
          margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 8px; color: #94a3b8; 
          display: flex; justify-content: space-between; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${municipio}</h1>
        <h2>${estado} • DEPARTAMENTO DE CONTABILIDADE GERAL</h2>
        <h3>FICHA OFICIAL DE RESGUARDO CONTÁBIL</h3>
        <p>Documento comprobatório de solicitação externa de alteração contábil para fins de fiscalização do Tribunal de Contas (TCE)</p>
      </div>

      <!-- SEÇÃO 1: DADOS DO SOLICITANTE E ORIGEM -->
      <div class="section">
        <div class="section-title">
          <span>1. Dados da Solicitação Recebida</span>
          <span style="font-size: 8.5px; font-weight: normal; color: #475569;">Registro: #${registro.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <table class="grid-table">
          <tr>
            <td class="label">Quem Solicitou:</td>
            <td class="val"><strong style="font-size: 11px;">${registro.solicitanteNome}</strong></td>
            <td class="label">Cargo / Setor:</td>
            <td class="val">${registro.solicitanteSetorCargo}</td>
          </tr>
          <tr>
            <td class="label">Canal de Comunicação:</td>
            <td class="val"><strong>${registro.canalSolicitacao}</strong></td>
            <td class="label">Data da Solicitação:</td>
            <td class="val"><strong>${formatDateOnly(registro.dataPedido)}</strong></td>
          </tr>
          <tr>
            <td class="label">Documento Afetado:</td>
            <td class="val"><strong style="color: #4338ca; font-size: 11px;">${registro.documentoAfetado}</strong></td>
            <td class="label">Valor Envolvido:</td>
            <td class="val"><strong>${registro.valorEnvolvido && registro.valorEnvolvido > 0 ? formatCurrency(registro.valorEnvolvido) : 'Não se aplica'}</strong></td>
          </tr>
        </table>
      </div>

      <!-- SEÇÃO 2: TEOR DO PEDIDO -->
      <div class="section">
        <div class="section-title">2. Teor do Pedido e Justificativa Apresentada pelo Terceiro</div>
        <div class="highlight-box">
          <strong style="display: block; font-size: 9px; color: #475569; text-transform: uppercase; margin-bottom: 2px;">O Que Foi Pedido para Alterar:</strong>
          <p style="margin: 0; font-size: 10px; font-weight: 600; color: #0f172a;">${registro.oQueFoiPedido}</p>
        </div>
        ${registro.justificativaAlegada ? `
          <div class="highlight-box" style="margin-top: 4px; background: #fafafa;">
            <strong style="display: block; font-size: 9px; color: #475569; text-transform: uppercase; margin-bottom: 2px;">Motivo / Justificativa Alegada:</strong>
            <p style="margin: 0; font-size: 9.5px; color: #334155; font-style: italic;">"${registro.justificativaAlegada}"</p>
          </div>
        ` : ''}
      </div>

      <!-- SEÇÃO 3: DESPACHO E AÇÃO DA CONTADORA -->
      <div class="section">
        <div class="section-title">3. Decisão Técnica e Execução no ERP Contábil</div>
        <table class="grid-table">
          <tr>
            <td class="label">Ação da Contadora:</td>
            <td class="val">
              <span class="badge-box ${
                registro.acaoDaContadora === 'Aprovado e Feito' ? 'badge-feita' :
                registro.acaoDaContadora === 'Recusado' ? 'badge-recusada' : 'badge-ressalva'
              }">
                ${acaoConf.label}
              </span>
            </td>
            <td class="label">Data/Hora Execução:</td>
            <td class="val">${registro.dataHoraExecucao ? formatDateExact(registro.dataHoraExecucao) : 'Pendente / Não executado'}</td>
          </tr>
          ${registro.observacaoTecnicaContadora ? `
            <tr>
              <td class="label">Nota de Resguardo:</td>
              <td class="val" colspan="3" style="font-style: italic; color: #334155;">
                "${registro.observacaoTecnicaContadora}"
              </td>
            </tr>
          ` : ''}
        </table>
      </div>

      <!-- SEÇÃO 4: COMPROVANTE INCORPORADO (PRINT WHATSAPP OU DOCUMENTO) -->
      <div class="section">
        <div class="section-title">
          <span>4. Prova Material Anexa (Print de Mensagem / Ofício)</span>
          <span style="font-size: 8.5px; font-weight: normal; color: #475569;">${registro.comprovanteNome || 'Sem anexo'}</span>
        </div>
        
        ${isImage ? `
          <div class="comprovante-wrapper">
            <img src="${registro.comprovanteUrl}" class="comprovante-img" alt="Comprovante de Solicitação" />
            <div style="font-size: 8.5px; color: #64748b; margin-top: 4px;">
              Comprovante original: <strong>${registro.comprovanteNome}</strong> (Captura fiel da solicitação)
            </div>
          </div>
        ` : registro.comprovanteNome ? `
          <div class="highlight-box" style="text-align: center; padding: 12px; background: #f8fafc;">
            <p style="margin: 0; font-weight: bold; color: #1e293b;">📄 Documento Anexo Vinculado: ${registro.comprovanteNome}</p>
            <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">Tipo: ${registro.comprovanteTipo || 'Documento PDF/Ofício'} • Arquivado digitalmente no sistema da Contabilidade.</p>
          </div>
        ` : `
          <div class="highlight-box" style="text-align: center; color: #94a3b8; font-style: italic;">
            Nenhum arquivo de imagem/comprovante anexado a este registro.
          </div>
        `}
      </div>

      <!-- DECLARAÇÃO DE RESGUARDO JURÍDICO -->
      <div class="alert-declaration">
        <strong>DECLARAÇÃO DE RESGUARDO CONTÁBIL:</strong> Atesto para os devidos fins de direito, controle interno e fiscalização do Tribunal de Contas do Estado (TCE) que a retificação/alteração contábil supracitada foi realizada estritamente sob requisição do terceiro identificado, não decorrendo de iniciativa unilateral deste setor contábil.
      </div>

      <!-- ASSINATURAS -->
      <table class="signatures">
        <tr>
          <td>
            <div class="sign-line">${registro.solicitanteNome}</div>
            <div class="sign-sub">${registro.solicitanteSetorCargo}</div>
            <div class="sign-sub">Solicitante da Alteração</div>
          </td>
          <td>
            <div class="sign-line">${contadora}</div>
            <div class="sign-sub">Contador(a) Municipal • ${crc}</div>
            <div class="sign-sub">Data da Emissão: ${emissaoNow}</div>
          </td>
        </tr>
      </table>

      <div class="footer">
        <span>Sistema de Gestão Contábil 360 • Módulo de Resguardo da Contadora</span>
        <span>ID Registro: ${registro.id} • Emitido em: ${emissaoNow}</span>
      </div>
    </body>
    </html>
  `;
}
