import { MedicationDispensation, ExamRequest, Appointment } from '../types';

/**
 * Utilitário de Impressão Direta e Isolada via Iframe Oculto.
 * Garante que APENAS o documento/comprovante seja impresso,
 * sem barra de navegação, sem fundos escuros, sem modais ou elementos da interface.
 */
export const printCleanDocument = (contentHtml: string, title: string = 'Documento') => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('Falha ao obter contexto do iframe para impressão.');
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #111827;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .receipt-container {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
        }
        .receipt-card {
          border: 1.5px solid #374151;
          border-radius: 8px;
          padding: 14px 18px;
          margin-bottom: 14px;
          background: #ffffff;
          page-break-inside: avoid;
        }
        .header {
          text-align: center;
          border-bottom: 1.5px solid #111827;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .header h1 {
          font-size: 14px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #111827;
        }
        .header h2 {
          font-size: 11px;
          font-weight: 700;
          color: #374151;
          margin-top: 2px;
        }
        .header .doc-type {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          display: inline-block;
          background: #f3f4f6;
          padding: 2px 10px;
          border-radius: 4px;
          border: 1px solid #d1d5db;
          margin-top: 4px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #4b5563;
          margin-top: 4px;
          font-family: monospace;
        }
        .section-title {
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #374151;
          background: #f9fafb;
          padding: 2px 6px;
          border-left: 3px solid #111827;
          margin: 8px 0 4px 0;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px 12px;
          margin-bottom: 8px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-label {
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
          color: #6b7280;
        }
        .info-value {
          font-size: 11px;
          font-weight: 600;
          color: #111827;
        }
        .info-value-bold {
          font-size: 12px;
          font-weight: 800;
          color: #047857;
        }
        .med-highlight {
          border: 1.5px solid #059669;
          background: #f0fdf4;
          border-radius: 6px;
          padding: 8px 12px;
          margin: 6px 0;
        }
        .warning-box {
          border: 1.5px solid #b45309;
          background: #fffbeb;
          border-radius: 6px;
          padding: 6px 10px;
          margin: 6px 0;
          font-size: 10px;
        }
        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 18px;
          padding-top: 4px;
          text-align: center;
        }
        .sig-line {
          border-top: 1px solid #111827;
          padding-top: 4px;
          font-size: 9.5px;
          font-weight: 700;
        }
        .sig-sub {
          font-size: 8px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .cut-line {
          border-top: 1.5px dashed #9ca3af;
          text-align: center;
          margin: 14px 0;
          position: relative;
        }
        .cut-line span {
          position: relative;
          top: -8px;
          background: #ffffff;
          padding: 0 10px;
          font-size: 8.5px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 1px;
        }
      </style>
    </head>
    <body>
      ${contentHtml}
    </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
};

// =========================================================
// GERADOR DO COMPROVANTE DE DISPENSAÇÃO (FARMÁCIA POPULAR)
// Imprime em 2 vias (1ª Via: Paciente | 2ª Via: Farmácia)
// =========================================================
export const printDispensationReceipt = (
  disp: MedicationDispensation, 
  institutionName: string = 'Prefeitura Municipal'
) => {
  const dateFormatted = disp.created_at 
    ? new Date(disp.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const nextDateFormatted = disp.next_allowed_dispensation_date 
    ? disp.next_allowed_dispensation_date.split('-').reverse().join('/') 
    : '---';

  const renderVia = (viaTitle: string) => `
    <div class="receipt-card">
      <div class="header">
        <h1>${institutionName}</h1>
        <h2>SECRETARIA MUNICIPAL DE SAÚDE · FARMÁCIA POPULAR / SUS</h2>
        <div class="doc-type">Comprovante de Retirada de Medicamentos</div>
        <div class="meta-row">
          <span><strong>CONTROLE Nº:</strong> ${disp.id.substring(0, 13).toUpperCase()}</span>
          <span><strong>DATA/HORA:</strong> ${dateFormatted}</span>
          <span><strong>VIA:</strong> ${viaTitle}</span>
        </div>
      </div>

      <div class="section-title">Identificação do Munícipe / Paciente</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Nome Completo</span>
          <span class="info-value">${disp.patient_name}</span>
        </div>
        <div class="info-item">
          <span class="info-label">CPF / Cartão SUS</span>
          <span class="info-value" style="font-family: monospace;">${disp.patient_cpf || '---'} · ${disp.patient_sus || '---'}</span>
        </div>
      </div>

      <div class="section-title">Medicamento Dispensado</div>
      <div class="med-highlight">
        <div class="info-grid" style="margin-bottom: 0;">
          <div class="info-item" style="grid-column: span 2;">
            <span class="info-label">Fármaco / Medicamento</span>
            <span class="info-value-bold">${disp.medication_name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Dosagem & Apresentação</span>
            <span class="info-value">${disp.dosage} · ${disp.form}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Quantidade Entregue</span>
            <span class="info-value" style="font-size: 13px; font-weight: 900; color: #047857;">${disp.quantity_dispensed} UNIDADES</span>
          </div>
          <div class="info-item">
            <span class="info-label">Lote Registrado</span>
            <span class="info-value" style="font-family: monospace;">${disp.batch_number || 'Lote Padrão'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Tempo de Tratamento Coberto</span>
            <span class="info-value">${disp.days_of_treatment} dias de uso</span>
          </div>
        </div>
      </div>

      <div class="warning-box">
        <strong>📅 PRÓXIMA RETIRADA AUTORIZADA:</strong> A partir de <strong>${nextDateFormatted}</strong> (Sistema bloqueia retiradas antecipadas antes deste prazo).
      </div>

      <div class="section-title">Dados da Prescrição & Dispensação</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Médico Prescritor</span>
          <span class="info-value">${disp.doctor_name || 'Médico da Rede'} ${disp.doctor_crm ? `(${disp.doctor_crm})` : ''}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Receita Nº / Data</span>
          <span class="info-value">${disp.prescription_number || 'S/N'} (${disp.prescription_date ? disp.prescription_date.split('-').reverse().join('/') : 'Recente'})</span>
        </div>
        <div class="info-item">
          <span class="info-label">Unidade Dispensadora</span>
          <span class="info-value">${disp.dispensing_unit || 'Farmácia Central'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Dispensador Responsável</span>
          <span class="info-value">${disp.pharmacist_name || 'Farmacêutico(a) Municipal'}</span>
        </div>
      </div>

      ${disp.notes ? `<div style="font-size: 9px; color: #4b5563; margin-top: 4px; padding: 4px; background: #f3f4f6; border-radius: 4px;"><strong>Observações:</strong> ${disp.notes}</div>` : ''}

      <div class="signatures">
        <div>
          <div class="sig-line">${disp.patient_name}</div>
          <div class="sig-sub">Assinatura do Munícipe / Retirante</div>
        </div>
        <div>
          <div class="sig-line">${disp.pharmacist_name || 'Farmácia Municipal'}</div>
          <div class="sig-sub">Carimbo / Assinatura do Dispensador</div>
        </div>
      </div>
    </div>
  `;

  const html = `
    <div class="receipt-container">
      ${renderVia('1ª VIA — MUNÍCIPE / PACIENTE')}
      <div class="cut-line">
        <span>✄ Destaque Aqui (Corte) ✄</span>
      </div>
      ${renderVia('2ª VIA — CONTROLE DA FARMÁCIA MUNICIPAL')}
    </div>
  `;

  printCleanDocument(html, `Comprovante_Dispensacao_${disp.patient_name.replace(/\s+/g, '_')}`);
};

// =========================================================
// GERADOR DA GUIA DE ENCAMINHAMENTO / AUTORIZAÇÃO DE EXAME
// =========================================================
export const printExamGuide = (
  req: ExamRequest, 
  institutionName: string = 'Prefeitura Municipal'
) => {
  const reqDateFormatted = req.requested_date 
    ? req.requested_date.split('-').reverse().join('/') 
    : new Date().toLocaleDateString('pt-BR');

  const schedDateFormatted = req.scheduled_date 
    ? req.scheduled_date.split('-').reverse().join('/') 
    : 'A Definir pela Central de Regulação';

  const html = `
    <div class="receipt-container">
      <div class="receipt-card">
        <div class="header">
          <h1>${institutionName}</h1>
          <h2>SECRETARIA MUNICIPAL DE SAÚDE · CENTRAL DE REGULAÇÃO MUNICIPAL</h2>
          <div class="doc-type">Guia de Encaminhamento e Autorização de Exame</div>
          <div class="meta-row">
            <span><strong>GUIA Nº:</strong> ${req.id.substring(0, 13).toUpperCase()}</span>
            <span><strong>EMISSÃO:</strong> ${reqDateFormatted}</span>
            <span><strong>STATUS:</strong> ${req.status.toUpperCase()}</span>
          </div>
        </div>

        <div class="section-title">Dados do Paciente</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Nome do Paciente</span>
            <span class="info-value" style="font-size: 12px; font-weight: 800;">${req.patient_name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">CPF / Cartão SUS</span>
            <span class="info-value" style="font-family: monospace;">${req.patient_cpf} · ${req.patient_sus}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Telefone de Contato</span>
            <span class="info-value">${req.patient_phone || 'Não informado'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Unidade Solicitante (Origem)</span>
            <span class="info-value">${req.requesting_unit || 'UBS Central'}</span>
          </div>
        </div>

        <div class="section-title">Procedimento / Exame Autorizado</div>
        <div class="med-highlight" style="border-color: #2563eb; background: #eff6ff;">
          <div class="info-grid" style="margin-bottom: 0;">
            <div class="info-item" style="grid-column: span 2;">
              <span class="info-label">Nome do Procedimento / Exame</span>
              <span class="info-value-bold" style="color: #1d4ed8; font-size: 13px;">${req.exam_name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Categoria</span>
              <span class="info-value">${req.category}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Prioridade / Urgência</span>
              <span class="info-value">${req.is_urgent ? '🚨 URGÊNCIA MÉDICA' : 'Eletivo / Rotina'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Local de Execução</span>
              <span class="info-value">${req.executing_unit || 'Laboratório Central / Prestador Conveniado'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Data Agendada</span>
              <span class="info-value" style="font-weight: 800; color: #7e22ce;">${schedDateFormatted}</span>
            </div>
          </div>
        </div>

        ${req.clinical_indication ? `
          <div style="font-size: 10px; color: #374151; margin: 6px 0; padding: 6px; background: #f9fafb; border-radius: 4px; border: 1px solid #e5e7eb;">
            <strong>Indicação Clínica:</strong> ${req.clinical_indication}
          </div>
        ` : ''}

        <div class="warning-box" style="border-color: #4b5563; background: #f9fafb;">
          <strong>INSTRUÇÕES OBRIGATÓRIAS AO PACIENTE:</strong>
          <ul style="margin-left: 16px; margin-top: 4px; line-height: 1.3;">
            <li>Apresentar esta Guia impressa juntamente com <strong>Documento com Foto</strong> e <strong>Cartão SUS</strong> no dia do exame.</li>
            <li>Chegar com 20 minutos de antecedência no local indicado.</li>
            <li>Respeitar as orientações de preparo e jejum indicadas pela equipe médica.</li>
          </ul>
        </div>

        <div class="signatures" style="margin-top: 24px;">
          <div>
            <div class="sig-line">${req.doctor_name} ${req.doctor_crm ? `(${req.doctor_crm})` : ''}</div>
            <div class="sig-sub">Médico(a) Solicitante</div>
          </div>
          <div>
            <div class="sig-line">Regulação Municipal de Saúde</div>
            <div class="sig-sub">Autorização / Carimbo Regulador</div>
          </div>
        </div>
      </div>
    </div>
  `;

  printCleanDocument(html, `Guia_Exame_${req.patient_name.replace(/\s+/g, '_')}`);
};

// =========================================================
// GERADOR DA LISTA DIÁRIA DE AGENDAMENTOS (AGENDA DA SAÚDE)
// =========================================================
export const printDailyAgendaList = (
  appointments: Appointment[],
  date: string,
  institutionName: string = 'Prefeitura Municipal'
) => {
  const dateFormatted = date.split('-').reverse().join('/');

  const rows = appointments.map((apt, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb; font-size: 10px;">
      <td style="padding: 6px 8px; font-weight: 700;">${idx + 1}</td>
      <td style="padding: 6px 8px; font-weight: 800;">${apt.appointment_time || '08:00'}</td>
      <td style="padding: 6px 8px; font-weight: 700;">${apt.patient_name}</td>
      <td style="padding: 6px 8px; font-family: monospace;">${apt.patient_cpf || '-'}</td>
      <td style="padding: 6px 8px;">${apt.specialty}</td>
      <td style="padding: 6px 8px;">${apt.unit_name || 'UBS'}</td>
      <td style="padding: 6px 8px; font-weight: 700;">${apt.status}</td>
      <td style="padding: 6px 8px; border-bottom: 1px dashed #9ca3af; width: 140px;"></td>
    </tr>
  `).join('');

  const html = `
    <div class="receipt-container">
      <div class="receipt-card" style="border: none; padding: 0;">
        <div class="header">
          <h1>${institutionName}</h1>
          <h2>SECRETARIA MUNICIPAL DE SAÚDE · AGENDA DE ATENDIMENTOS</h2>
          <div class="doc-type">Lista Diária de Recepção e Atendimento</div>
          <div class="meta-row">
            <span><strong>DATA:</strong> ${dateFormatted}</span>
            <span><strong>TOTAL DE AGENDAMENTOS:</strong> ${appointments.length}</span>
            <span><strong>EMISSÃO:</strong> ${new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #111827; font-size: 9px; text-transform: uppercase;">
              <th style="padding: 6px 8px;">#</th>
              <th style="padding: 6px 8px;">Hora</th>
              <th style="padding: 6px 8px;">Paciente</th>
              <th style="padding: 6px 8px;">CPF</th>
              <th style="padding: 6px 8px;">Especialidade</th>
              <th style="padding: 6px 8px;">Unidade</th>
              <th style="padding: 6px 8px;">Status</th>
              <th style="padding: 6px 8px;">Assinatura / Presença</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  printCleanDocument(html, `Lista_Atendimentos_${date}`);
};
