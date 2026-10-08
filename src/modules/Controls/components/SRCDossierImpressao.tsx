import { AccountingChange } from '../types/accountingChanges';

interface DossierPrintOptions {
  municipioNome?: string;
  estadoNome?: string;
}

export function generateSRCDossierHtml(
  change: AccountingChange, 
  options: DossierPrintOptions = {}
): string {
  const municipio = options.municipioNome || 'Prefeitura Municipal';
  const estado = options.estadoNome || 'ESTADO DE MATO GROSSO';

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

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Dossiê de Retificação Contábil - ${change.protocolNumber}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
          margin: 0; padding: 0; color: #0f172a; font-size: 10.5px; line-height: 1.35; 
        }
        .header { 
          text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; 
        }
        .republic { 
          font-size: 8.5px; letter-spacing: 1.5px; font-weight: bold; color: #475569; text-transform: uppercase; 
        }
        .header h1 { 
          margin: 2px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; 
        }
        .header h2 { 
          margin: 1px 0; font-size: 11px; font-weight: 600; color: #334155; 
        }
        .doc-badge {
          display: inline-block; background: #1e1b4b; color: #ffffff; padding: 3px 10px; border-radius: 4px; 
          font-size: 11px; font-weight: 800; letter-spacing: 0.5px; margin-top: 5px; text-transform: uppercase;
        }
        .protocol-bar {
          display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; 
          padding: 6px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10px;
        }
        .section-title {
          font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #1e1b4b;
          border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px; margin: 12px 0 6px 0;
        }
        table { 
          width: 100%; border-collapse: collapse; margin-bottom: 10px; 
        }
        th, td { 
          padding: 5px 7px; border: 1px solid #cbd5e1; vertical-align: top; font-size: 9.5px; 
        }
        th { 
          background: #f1f5f9; font-weight: 700; text-align: left; text-transform: uppercase; font-size: 8.5px; 
        }
        .partidas-grid {
          display: flex; gap: 8px; margin-bottom: 10px;
        }
        .partida-col {
          flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px;
        }
        .partida-col.antes { background: #fffbeb; border-color: #fde68a; }
        .partida-col.depois { background: #f0fdf4; border-color: #bbf7d0; }
        .partida-title {
          font-size: 9px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px;
        }
        .partida-col.antes .partida-title { color: #b45309; }
        .partida-col.depois .partida-title { color: #15803d; }
        .hash-box {
          font-family: monospace; font-size: 8px; word-break: break-all; background: #f8fafc; 
          padding: 3px 6px; border: 1px dashed #cbd5e1; border-radius: 4px; color: #334155;
        }
        .signatures { 
          display: flex; justify-content: space-between; margin-top: 35px; page-break-inside: avoid; 
        }
        .sig-box { 
          width: 30%; text-align: center; border-top: 1px solid #475569; padding-top: 5px; font-size: 9px; 
        }
        .sig-box strong { display: block; font-size: 10px; color: #0f172a; }
        .sig-box span { color: #64748b; font-size: 8px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <!-- Cabeçalho Oficial Municipal -->
      <div class="header">
        <div class="republic">REPÚBLICA FEDERATIVA DO BRASIL • ${estado}</div>
        <h1>${municipio} • SECRETARIA MUNICIPAL DE FINANÇAS</h1>
        <h2>SETOR DE CONTABILIDADE GERAL & UNIDADE CENTRAL DE CONTROLE INTERNO</h2>
        <div class="doc-badge">DOSSIÊ DE RETIFICAÇÃO CONTÁBIL (SRC)</div>
        <p style="margin: 3px 0 0 0; font-size: 8.5px; color: #64748b;">
          Atendimento à Lei Federal nº 4.320/1964, LC 101/2000 (LRF), NBC TSP e Resoluções Normativas do TCE
        </p>
      </div>

      <!-- Barra de Identificação do Processo -->
      <div class="protocol-bar">
        <div><strong>Processo:</strong> ${change.protocolNumber}</div>
        <div><strong>Exercício / Competência:</strong> ${change.fiscalYear} • ${change.monthRef || '-'}</div>
        <div><strong>Status:</strong> ${change.status === 'approved' || change.status === 'completed' ? 'HOMOLOGADO / EFETIVADO' : 'EM TRAMITAÇÃO'}</div>
        <div><strong>Emissão:</strong> ${emissaoNow}</div>
      </div>

      <!-- 1. IDENTIFICAÇÃO E RIGOR TEMPORAL -->
      <div class="section-title">1. Identificação dos Atores e Rigor Temporal de Tramitação</div>
      <table>
        <tr>
          <th style="width: 25%;">Secretaria Solicitante</th>
          <td style="width: 25%; font-weight: bold; color: #4338ca;">${change.requesterDepartment}</td>
          <th style="width: 25%;">Servidor Solicitante</th>
          <td style="width: 25%;"><strong>${change.requesterName}</strong> (${change.requesterRole})</td>
        </tr>
        <tr>
          <th>Data do Fato Gerador</th>
          <td style="font-family: monospace; font-weight: bold;">📅 ${formatDateOnly(change.dataFatoGerador || change.changeDate)}</td>
          <th>Data Documento Primitivo</th>
          <td style="font-family: monospace; font-weight: bold;">📅 ${formatDateOnly(change.dataDocumentoOrigem || change.changeDate)}</td>
        </tr>
        <tr>
          <th>Data/Hora da Solicitação</th>
          <td style="font-family: monospace;">${formatDateExact(change.dataHoraSolicitacao || change.createdAt)}</td>
          <th>Data Lançamento Efetivo (Razão)</th>
          <td style="font-family: monospace; font-weight: bold; color: #15803d;">📅 ${formatDateOnly(change.dataLancamentoEfetivo || change.changeDate)}</td>
        </tr>
        <tr>
          <th>Contador Geral / Homologador</th>
          <td><strong>${change.accountantName || 'Pendente de homologação'}</strong> ${change.accountantCrc ? `(${change.accountantCrc})` : ''}</td>
          <th>Data/Hora Homologação</th>
          <td style="font-family: monospace;">${formatDateExact(change.dataHoraHomologacao || change.reviewedAt)}</td>
        </tr>
      </table>

      <!-- 2. OBJETO DA RETIFICAÇÃO E FUNDAMENTAÇÃO LEGAL -->
      <div class="section-title">2. Objeto da Retificação e Fundamentação Legal (MCASP)</div>
      <table>
        <tr>
          <th style="width: 25%;">Tipo de Documento</th>
          <td style="width: 25%;"><strong>${change.tipoDocumentoSRC || 'Empenho'}</strong></td>
          <th style="width: 25%;">Documento de Referência</th>
          <td style="width: 25%; font-family: monospace; font-weight: bold;">${change.referenceDoc}</td>
        </tr>
        <tr>
          <th>Tipo de Ajuste Contábil</th>
          <td><strong>${change.tipoAjusteSRC || change.changeType}</strong></td>
          <th>Valor da Operação</th>
          <td style="font-family: monospace; font-weight: bold; color: #0f172a; font-size: 11px;">${formatCurrency(change.amount)}</td>
        </tr>
        <tr>
          <th>Base Legal / Citação MCASP</th>
          <td colspan="3">${change.baseLegalMcasp || 'Art. 63 da Lei Federal nº 4.320/1964; MCASP 9ª Edição'}</td>
        </tr>
        <tr>
          <th>Justificativa Circunstanciada</th>
          <td colspan="3" style="font-style: italic; background: #f8fafc;">"${change.reason}"</td>
        </tr>
      </table>

      <!-- 3. HISTÓRICO PADRÃO PARA O DIÁRIO / RAZÃO -->
      <div class="section-title">3. Histórico Padrão Oficial para o Diário / Razão Municipal (NBC TSP)</div>
      <div style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; font-family: monospace; font-size: 9px; line-height: 1.4; color: #1e293b; margin-bottom: 10px;">
        ${change.historicoPadraoRazao || `Estorno/Retificação ref. ao ${change.tipoDocumentoSRC || 'Documento'} nº ${change.referenceDoc}, Proc. SRC nº ${change.protocolNumber}, de ${formatDateOnly(change.dataLancamentoEfetivo || change.changeDate)}. Motivo: ${change.reason}`}
      </div>

      <!-- 4. COMPARATIVO DE PARTIDAS CONTÁBEIS (PCASP) -->
      <div class="section-title">4. Partidas Contábeis (PCASP): Lançamento Primitivo versus Retificador</div>
      <div class="partidas-grid">
        <div class="partida-col antes">
          <div class="partida-title">Situação Primitiva (Como Estava - DE)</div>
          ${change.partidaOriginal ? `
            <div><strong>Conta Débito:</strong> ${change.partidaOriginal.contaDebitoCodigo || '-'} - ${change.partidaOriginal.contaDebitoNome || ''}</div>
            <div><strong>Conta Crédito:</strong> ${change.partidaOriginal.contaCreditoCodigo || '-'} - ${change.partidaOriginal.contaCreditoNome || ''}</div>
            <div><strong>Fonte:</strong> ${change.partidaOriginal.fonteRecursoCodigo || '-'} | <strong>Elemento:</strong> ${change.partidaOriginal.elementoDespesaCodigo || '-'}</div>
            <div><strong>Valor:</strong> ${formatCurrency(change.valorOriginal || change.amount)}</div>
          ` : `
            <p style="margin: 0; font-size: 9px;">${change.currentState || 'Registro primitivo conforme documento original.'}</p>
          `}
        </div>

        <div class="partida-col depois">
          <div class="partida-title">Situação Retificadora (Como Fica - PARA)</div>
          ${change.partidaProposta ? `
            <div><strong>Nova Conta Débito:</strong> ${change.partidaProposta.contaDebitoCodigo || '-'} - ${change.partidaProposta.contaDebitoNome || ''}</div>
            <div><strong>Nova Conta Crédito:</strong> ${change.partidaProposta.contaCreditoCodigo || '-'} - ${change.partidaProposta.contaCreditoNome || ''}</div>
            <div><strong>Nova Fonte:</strong> ${change.partidaProposta.fonteRecursoCodigo || '-'} | <strong>Novo Elemento:</strong> ${change.partidaProposta.elementoDespesaCodigo || '-'}</div>
            <div><strong>Valor do Ajuste:</strong> ${formatCurrency(change.amount)}</div>
          ` : `
            <p style="margin: 0; font-size: 9px;">${change.proposedState || 'Lançamento corretivo com estorno autônomo no Razão Contábil.'}</p>
          `}
        </div>
      </div>

      <!-- 5. DOCUMENTOS COMPROBATÓRIOS E HASHES SHA-256 -->
      <div class="section-title">5. Integridade Documental e Hashes Criptográficos SHA-256</div>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Tipo de Comprovante</th>
            <th style="width: 35%;">Nome do Arquivo</th>
            <th style="width: 40%;">Hash SHA-256 de Autenticidade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Documento Primitivo (Antes)</td>
            <td>${change.attachmentBeforeName || 'Anexo Original do Processo'}</td>
            <td class="hash-box">${change.attachmentBeforeHash || 'sha256-original-autenticado-tce'}</td>
          </tr>
          <tr>
            <td>Documento Retificado (Depois)</td>
            <td>${change.attachmentAfterName || 'Anexo Retificado do Processo'}</td>
            <td class="hash-box">${change.attachmentAfterHash || 'sha256-retificado-autenticado-tce'}</td>
          </tr>
        </tbody>
      </table>

      <!-- 6. DESPACHO DA HOMOLOGAÇÃO -->
      <div class="section-title">6. Despacho / Parecer do Setor Contábil Municipal</div>
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 9.5px; margin-bottom: 12px;">
        <strong>Parecer Técnico:</strong> ${change.accountantNotes || 'Certifico que a presente retificação contábil atende às diretrizes do MCASP e da Lei 4.320/64, inexistindo sobreposição de registros ou burla orçamentária.'}
      </div>

      <!-- 7. ASSINATURAS E SEGREGAÇÃO DE FUNÇÕES -->
      <div class="signatures">
        <div class="sig-box">
          <strong>${change.requesterName}</strong>
          <span>${change.requesterRole}</span>
          <span style="display: block; font-size: 7.5px; color: #94a3b8;">Servidor Solicitante</span>
        </div>
        <div class="sig-box">
          <strong>${change.accountantName || 'Contador(a) Geral'}</strong>
          <span>${change.accountantCrc ? `Contador Geral • CRC ${change.accountantCrc}` : 'Responsável Técnico Contábil'}</span>
          <span style="display: block; font-size: 7.5px; color: #94a3b8;">Homologação Técnica</span>
        </div>
        <div class="sig-box">
          <strong>Controladoria Geral do Município</strong>
          <span>Unidade de Controle Interno</span>
          <span style="display: block; font-size: 7.5px; color: #94a3b8;">Auditoria & Conformidade</span>
        </div>
      </div>
    </body>
    </html>
  `;
}
