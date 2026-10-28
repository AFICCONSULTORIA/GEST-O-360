import { MedicalPrescription, MedicalCertificate, Patient } from '../types';

interface PrintPrescriptionOptions {
  prescription: MedicalPrescription;
  institutionName?: string;
  unitName?: string;
  patient?: Patient | null;
}

interface PrintCertificateOptions {
  certificate: MedicalCertificate;
  institutionName?: string;
  unitName?: string;
}

export const printMedicalPrescription = ({
  prescription,
  institutionName = 'PREFEITURA MUNICIPAL',
  unitName = 'UNIDADE BÁSICA DE SAÚDE',
  patient
}: PrintPrescriptionOptions) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, autorize pop-ups para imprimir a receita médica.');
    return;
  }

  const formattedDate = prescription.prescription_date
    ? prescription.prescription_date.split('-').reverse().join('/')
    : new Date().toLocaleDateString('pt-BR');

  const itemsHtml = prescription.items.map((item, index) => `
    <div class="prescription-item">
      <div class="item-header">
        <span class="item-number">${index + 1}.</span>
        <span class="medication-name">${item.medication_name} ${item.dosage}</span>
        <span class="medication-form">(${item.form})</span>
        <span class="item-qty">Qtde: <strong>${item.quantity}</strong></span>
      </div>
      <div class="item-instructions">
        <strong>Posologia:</strong> ${item.instructions}
      </div>
      ${item.duration_days ? `<div class="item-duration">Duração do tratamento: ${item.duration_days} dias</div>` : ''}
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Receita Médica - ${prescription.prescription_number}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 20mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          line-height: 1.4;
          background: #fff;
          margin: 0;
          padding: 10px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header h1 {
          font-size: 16px;
          text-transform: uppercase;
          margin: 0 0 4px 0;
          letter-spacing: 1px;
          color: #0f172a;
        }
        .header h2 {
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #0284c7;
        }
        .header p {
          font-size: 11px;
          color: #64748b;
          margin: 0;
        }
        .document-title {
          text-align: center;
          font-size: 18px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 15px 0 20px 0;
          color: #0f172a;
        }
        .patient-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 25px;
          font-size: 12px;
        }
        .patient-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 8px;
        }
        .patient-line {
          margin: 2px 0;
        }
        .allergies-alert {
          color: #dc2626;
          font-weight: bold;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px dashed #fca5a5;
        }
        .prescription-container {
          min-height: 380px;
        }
        .prescription-item {
          border-left: 3px solid #0284c7;
          padding-left: 12px;
          margin-bottom: 18px;
        }
        .item-header {
          font-size: 14px;
          margin-bottom: 4px;
        }
        .item-number {
          font-weight: bold;
          color: #0284c7;
        }
        .medication-name {
          font-weight: 700;
          color: #0f172a;
        }
        .medication-form {
          color: #64748b;
          font-size: 12px;
        }
        .item-qty {
          float: right;
          font-size: 12px;
          background: #e0f2fe;
          color: #0369a1;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .item-instructions {
          font-size: 12px;
          color: #334155;
          margin: 4px 0;
        }
        .item-duration {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
        }
        .notes-box {
          margin-top: 20px;
          padding: 8px 12px;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 6px;
          font-size: 11px;
          color: #92400e;
        }
        .footer-section {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .validation-code {
          font-size: 10px;
          color: #64748b;
          font-family: monospace;
        }
        .signature-box {
          text-align: center;
          width: 250px;
        }
        .signature-line {
          border-top: 1px solid #0f172a;
          margin-bottom: 4px;
        }
        .doctor-name {
          font-weight: bold;
          font-size: 12px;
        }
        .doctor-crm {
          font-size: 11px;
          color: #475569;
        }
        .btn-print {
          display: block;
          margin: 20px auto;
          padding: 10px 24px;
          background: #0284c7;
          color: white;
          font-weight: bold;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        @media print {
          .btn-print {
            display: none;
          }
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">Imprimir Receita Médica</button>

      <div class="header">
        <h1>${institutionName}</h1>
        <h2>SISTEMA ÚNICO DE SAÚDE · SUS · GESTÃO 360</h2>
        <p>${unitName || prescription.unit_name || 'Unidade Básica de Saúde'}</p>
      </div>

      <div class="document-title">Receituário Médico</div>

      <div class="patient-box">
        <div class="patient-grid">
          <div>
            <div class="patient-line"><strong>Paciente:</strong> ${prescription.patient_name}</div>
            <div class="patient-line"><strong>Cartão SUS:</strong> ${prescription.patient_sus}</div>
          </div>
          <div>
            <div class="patient-line"><strong>CPF:</strong> ${prescription.patient_cpf}</div>
            <div class="patient-line"><strong>Data:</strong> ${formattedDate}</div>
          </div>
        </div>
        ${patient?.allergies ? `<div class="allergies-alert">⚠️ Alergias Informadas: ${patient.allergies}</div>` : ''}
      </div>

      <div class="prescription-container">
        ${itemsHtml}

        ${prescription.notes ? `
          <div class="notes-box">
            <strong>Recomendações Clínicas:</strong> ${prescription.notes}
          </div>
        ` : ''}
      </div>

      <div class="footer-section">
        <div class="validation-code">
          <div>Código da Receita: <strong>${prescription.prescription_number}</strong></div>
          <div>Válida em toda a Rede Municipal de Saúde</div>
          <div>Emitida via Gestão 360 Saúde em ${new Date().toLocaleString('pt-BR')}</div>
        </div>

        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="doctor-name">${prescription.doctor_name}</div>
          <div class="doctor-crm">CRM: ${prescription.doctor_crm || 'Não informado'}</div>
          <div class="doctor-crm">${unitName || 'UBS Municipal'}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

export const printMedicalCertificate = ({
  certificate,
  institutionName = 'PREFEITURA MUNICIPAL',
  unitName = 'UNIDADE BÁSICA DE SAÚDE'
}: PrintCertificateOptions) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, autorize pop-ups para imprimir o atestado.');
    return;
  }

  const formattedDate = certificate.issued_date
    ? certificate.issued_date.split('-').reverse().join('/')
    : new Date().toLocaleDateString('pt-BR');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Atestado Médico - ${certificate.patient_name}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 20mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
          background: #fff;
          margin: 0;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 40px;
        }
        .header h1 {
          font-size: 16px;
          text-transform: uppercase;
          margin: 0 0 4px 0;
        }
        .header h2 {
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #0284c7;
        }
        .document-title {
          text-align: center;
          font-size: 22px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 40px;
        }
        .certificate-body {
          font-size: 15px;
          text-align: justify;
          line-height: 2;
          margin: 40px 0;
        }
        .footer {
          margin-top: 80px;
          display: flex;
          justify-content: flex-end;
        }
        .signature-box {
          text-align: center;
          width: 280px;
        }
        .signature-line {
          border-top: 1px solid #0f172a;
          margin-bottom: 6px;
        }
        .btn-print {
          display: block;
          margin: 0 auto 30px auto;
          padding: 10px 24px;
          background: #0284c7;
          color: white;
          font-weight: bold;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
        @media print {
          .btn-print { display: none; }
        }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">Imprimir Atestado Médico</button>

      <div class="header">
        <h1>${institutionName}</h1>
        <h2>SISTEMA ÚNICO DE SAÚDE · SUS · GESTÃO 360</h2>
        <p>${unitName}</p>
      </div>

      <div class="document-title">Atestado Médico</div>

      <div class="certificate-body">
        Atesto para os devidos fins que o(a) Sr.(a) <strong>${certificate.patient_name}</strong>, 
        inscrito(a) no CPF sob o nº <strong>${certificate.patient_cpf}</strong>, foi atendido(a) nesta unidade de saúde nesta data 
        e necessita de <strong>${certificate.days_off} (${certificate.days_off === 1 ? 'um' : certificate.days_off} dia${certificate.days_off > 1 ? 's' : ''})</strong> de afastamento de suas atividades laborais e/ou escolares a contar desta data por motivo de saúde.
        
        ${certificate.cid10 ? `<br><br><strong>Diagnóstico (CID-10):</strong> ${certificate.cid10}` : ''}
        ${certificate.reason ? `<br><strong>Observação médica:</strong> ${certificate.reason}` : ''}
      </div>

      <div style="margin-top: 40px; font-size: 13px;">
        Local e data: ${unitName}, ${formattedDate}.
      </div>

      <div class="footer">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div style="font-weight: bold; font-size: 13px;">${certificate.doctor_name}</div>
          <div style="font-size: 12px; color: #475569;">CRM: ${certificate.doctor_crm || 'Não informado'}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
