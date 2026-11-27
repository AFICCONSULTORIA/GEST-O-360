import React from 'react';
import { CertificateTemplate, IssuedCertificate, getActivityTypeLabel } from '../types/certificates';
import { Institution } from '../../../types';

interface CertificateBackPageProps {
  certificate: IssuedCertificate;
  template: CertificateTemplate;
  institution?: Institution | null;
  logoSrc: string;
  qrUrl: string;
  dateRangeText: string;
  selectedTheme: {
    outerBorderColor: string;
    innerBorderColor: string;
    titleColor: string;
    gradient: string;
  };
}

function parseProgramItems(raw?: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/\r?\n|;+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export const CertificateBackPage: React.FC<CertificateBackPageProps> = ({
  certificate,
  template,
  institution,
  logoSrc,
  qrUrl,
  dateRangeText,
  selectedTheme
}) => {
  const programItems = parseProgramItems(template.program_content);
  const activityLabel = getActivityTypeLabel(template.event_type);
  const secretariat =
    template.secretariat_name?.trim() ||
    (template.issuer_role.toLowerCase().includes('secret') ? template.issuer_role : '') ||
    'Secretaria Municipal de Educação';
  const issueDateStr = certificate.created_at
    ? new Date(certificate.created_at).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  return (
    <div
      data-cert-page="back"
      style={{
        width: '1122px',
        height: '794px',
        backgroundColor: '#ffffff',
        color: '#1f2937'
      }}
      className="relative overflow-hidden flex flex-col justify-between p-12 box-border font-sans select-none"
    >
      {/* Moldura coordenada com a Frente */}
      <div
        className="absolute inset-4 z-0 pointer-events-none"
        style={{ borderWidth: '4px', borderStyle: 'solid', borderColor: selectedTheme.outerBorderColor }}
      />
      <div
        className="absolute inset-6 z-0 pointer-events-none"
        style={{ borderWidth: '1px', borderStyle: 'dashed', borderColor: selectedTheme.innerBorderColor }}
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: selectedTheme.gradient }}
      />

      {/* Camada de Conteúdo do Verso */}
      <div className="relative z-10 h-full flex flex-col justify-between gap-5">
        {/* Cabeçalho do Verso */}
        <div
          className="flex items-center justify-between gap-6 pb-4"
          style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#e2e8f0' }}
        >
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={logoSrc}
              alt="Brasão Institucional"
              style={{ maxHeight: '54px', maxWidth: '140px', objectFit: 'contain' }}
            />
            <div
              className="pl-4"
              style={{ borderLeftWidth: '2px', borderLeftStyle: 'solid', borderLeftColor: '#cbd5e1' }}
            >
              <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: '#475569' }}>
                {institution?.name || 'Prefeitura Municipal'}
              </p>
              <p className="text-xs font-black uppercase tracking-wide" style={{ color: '#0f172a' }}>
                {secretariat}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              className="inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
              style={{
                backgroundColor: '#f1f5f9',
                color: selectedTheme.titleColor,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#cbd5e1'
              }}
            >
              Verso · Registro & Conteúdo
            </span>
          </div>
        </div>

        {/* Corpo: Conteúdo Programático + Ficha de Registro */}
        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Coluna Principal: Conteúdo Programático / Ementa */}
          <div
            className="col-span-8 rounded-2xl p-6 flex flex-col justify-between"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: '#e2e8f0'
            }}
          >
            <div>
              <h3
                className="text-sm font-black uppercase tracking-widest mb-1"
                style={{ color: selectedTheme.titleColor }}
              >
                Conteúdo Programático / Ementa Formativa
              </h3>
              <p className="text-xs font-bold mb-4" style={{ color: '#64748b' }}>
                {activityLabel}: "{template.title}"
              </p>

              {programItems.length > 0 ? (
                <ul className="space-y-2.5 text-xs leading-relaxed" style={{ color: '#334155' }}>
                  {programItems.slice(0, 12).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: selectedTheme.titleColor
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3 text-xs leading-relaxed" style={{ color: '#475569' }}>
                  <p>
                    Ação formativa integrante do programa oficial de capacitação, atualização e desenvolvimento
                    profissional promovido pela <strong>{secretariat}</strong>.
                  </p>
                  <p>
                    O(A) cursista cumpriu integralmente as atividades propostas ({dateRangeText}), com frequência e
                    aproveitamento satisfatórios equivalentes à carga horária de{' '}
                    <strong>{template.workload_hours} horas</strong>.
                  </p>
                </div>
              )}
            </div>

            <div
              className="pt-3 mt-4 text-[10px] flex items-center justify-between"
              style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#e2e8f0', color: '#64748b' }}
            >
              <span>Carga Horária Certificada: <strong style={{ color: '#0f172a' }}>{template.workload_hours}h</strong></span>
              <span>Responsável Técnico: <strong style={{ color: '#0f172a' }}>{template.issuer_name}</strong></span>
            </div>
          </div>

          {/* Coluna Lateral: Ficha de Registro Oficial e QR Code */}
          <div
            className="col-span-4 rounded-2xl p-5 flex flex-col justify-between"
            style={{
              backgroundColor: '#f8fafc',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: '#cbd5e1'
            }}
          >
            <div className="space-y-3">
              <h4
                className="text-xs font-black uppercase tracking-wider pb-2"
                style={{
                  color: selectedTheme.titleColor,
                  borderBottomWidth: '1px',
                  borderBottomStyle: 'solid',
                  borderBottomColor: '#cbd5e1'
                }}
              >
                Registro de Expedição
              </h4>

              <div className="text-[11px] space-y-2" style={{ color: '#475569' }}>
                <div>
                  <span className="block text-[9px] font-bold uppercase" style={{ color: '#94a3b8' }}>
                    Titular Certificado
                  </span>
                  <strong className="block text-xs" style={{ color: '#0f172a' }}>
                    {certificate.recipient_name}
                  </strong>
                </div>

                <div>
                  <span className="block text-[9px] font-bold uppercase" style={{ color: '#94a3b8' }}>
                    Documento (CPF / Matrícula)
                  </span>
                  <strong className="font-mono" style={{ color: '#0f172a' }}>
                    {certificate.recipient_document}
                  </strong>
                </div>

                <div>
                  <span className="block text-[9px] font-bold uppercase" style={{ color: '#94a3b8' }}>
                    Data de Registro
                  </span>
                  <strong style={{ color: '#0f172a' }}>{issueDateStr}</strong>
                </div>

                <div>
                  <span className="block text-[9px] font-bold uppercase" style={{ color: '#94a3b8' }}>
                    Chave de Autenticidade
                  </span>
                  <strong className="font-mono text-xs" style={{ color: selectedTheme.titleColor }}>
                    {certificate.validation_hash}
                  </strong>
                </div>
              </div>
            </div>

            <div
              className="pt-3 flex flex-col items-center text-center gap-2"
              style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#cbd5e1' }}
            >
              <div
                className="w-24 h-24 p-1.5 rounded-xl"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#cbd5e1'
                }}
              >
                <img src={qrUrl} alt="QR Code de Autenticidade" className="w-full h-full object-contain" />
              </div>
              <p className="text-[9px] leading-tight" style={{ color: '#64748b' }}>
                Valide este documento em{' '}
                <span className="font-mono break-all" style={{ color: '#334155' }}>
                  {certificate.qr_code_url}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé Legal */}
        <div
          className="pt-3 flex items-center justify-between text-[10px]"
          style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#e2e8f0', color: '#64748b' }}
        >
          <span>Documento eletrônico emitido com assinatura eletrônica avançada (Lei Federal nº 14.063/2020).</span>
          <span className="font-mono font-bold" style={{ color: '#334155' }}>
            {certificate.validation_hash}
          </span>
        </div>
      </div>
    </div>
  );
};
