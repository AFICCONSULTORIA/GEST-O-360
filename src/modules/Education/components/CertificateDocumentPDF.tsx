import React, { forwardRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { CertificateTemplate, IssuedCertificate, getActivityTypeLabel } from '../types/certificates';
import { Institution } from '../../../types';
import { CertificateBackPage } from './CertificateBackPage';

export interface CertificateDocumentPDFProps {
  certificate: IssuedCertificate;
  template: CertificateTemplate;
  institution?: Institution | null;
  /** Se true, adiciona marcação de preview reduzido */
  scale?: number;
  /** Permite exibir apenas frente, apenas verso ou ambos (padrão 'both' para gerar PDF completo) */
  side?: 'front' | 'back' | 'both';
  /** Evita colisão de DOM id quando usado em modais de pré-visualização */
  disableRenderId?: boolean;
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato extenso em pt-BR
 */
function formatDateExtenso(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Conversor matemático estrito de OKLAB e OKLCH para sRGB para compatibilidade total com html2canvas
function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = +4.0767434099 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toSrgb = (c: number) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * (c ** (1 / 2.4)) - 0.055;
  };

  return [
    Math.round(toSrgb(r) * 255),
    Math.round(toSrgb(g) * 255),
    Math.round(toSrgb(bl) * 255)
  ];
}

function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
  const hRad = ((h || 0) * Math.PI) / 180;
  const a = (C || 0) * Math.cos(hRad);
  const b = (C || 0) * Math.sin(hRad);
  return oklabToRgb(L, a, b);
}

function replaceColorMix(str: string): string {
  while (str.includes('color-mix(')) {
    const idx = str.indexOf('color-mix(');
    let depth = 1;
    let end = -1;
    for (let i = idx + 10; i < str.length; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) {
      str = str.slice(0, idx) + 'rgba(0, 0, 0, 0.05)' + str.slice(end + 1);
    } else {
      break;
    }
  }
  return str;
}

export function convertCssColorToRgb(str: string): string {
  if (!str || typeof str !== 'string') return str;
  if (!str.includes('oklch') && !str.includes('oklab') && !str.includes('color-mix')) return str;

  // 1. Converter oklch(...) para rgb(...) ou rgba(...)
  let res = str.replace(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi, (_, lStr, cStr, hStr, aStr) => {
    let L = parseFloat(lStr);
    if (lStr.includes('%')) L /= 100;
    const C = parseFloat(cStr);
    const H = parseFloat(hStr);
    let alpha = 1;
    if (aStr) {
      alpha = parseFloat(aStr);
      if (aStr.includes('%')) alpha /= 100;
    }
    const [r, g, b] = oklchToRgb(L, C, H);
    return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
  });

  // 2. Converter oklab(...) para rgb(...) ou rgba(...)
  res = res.replace(/oklab\(\s*([\d.]+%?)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi, (_, lStr, aStrVal, bStrVal, aStr) => {
    let L = parseFloat(lStr);
    if (lStr.includes('%')) L /= 100;
    const aVal = parseFloat(aStrVal);
    const bVal = parseFloat(bStrVal);
    let alpha = 1;
    if (aStr) {
      alpha = parseFloat(aStr);
      if (aStr.includes('%')) alpha /= 100;
    }
    const [r, g, b] = oklabToRgb(L, aVal, bVal);
    return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
  });

  // 3. Sanitizar color-mix(...)
  if (res.includes('color-mix(')) {
    res = replaceColorMix(res);
  }

  return res;
}

function wrapStyleDeclaration(origStyle: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(origStyle, {
    get(target, prop, _receiver) {
      const origVal = Reflect.get(target, prop, target);
      if (typeof origVal === 'function') {
        if (prop === 'getPropertyValue') {
          return (propertyName: string) => {
            const raw = target.getPropertyValue(propertyName);
            return convertCssColorToRgb(raw);
          };
        }
        return origVal.bind(target);
      }
      if (typeof origVal === 'string') {
        return convertCssColorToRgb(origVal);
      }
      return origVal;
    }
  });
}

export const CertificateDocumentPDF = forwardRef<HTMLDivElement, CertificateDocumentPDFProps>(({
  certificate,
  template,
  institution,
  scale = 1,
  side = 'both',
  disableRenderId = false
}, ref) => {
  const isSecondIssue = (certificate.download_count || 1) > 1;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(certificate.qr_code_url)}&color=0-0-0&bgcolor=255-255-255`;

  // Sanitização de Logo para evitar bloqueios de CORS por domínios municipais externos sem cabeçalho
  const isExternalBlocked = Boolean(institution?.logo_url && institution.logo_url.includes('torixoreu.mt.gov.br'));
  const initialLogo = (!institution?.logo_url || isExternalBlocked) ? '/brasao-municipio.png' : institution.logo_url;
  const [logoSrc, setLogoSrc] = useState<string>(initialLogo);

  const dateRangeText = template.event_date_end && template.event_date_end !== template.event_date_start
    ? `realizado no período de ${formatDateExtenso(template.event_date_start)} a ${formatDateExtenso(template.event_date_end)}`
    : `realizado em ${formatDateExtenso(template.event_date_start)}`;

  const roleText = certificate.recipient_role === 'palestrante'
    ? 'na qualidade de Palestrante / Instrutor(a)'
    : certificate.recipient_role === 'monitor'
    ? 'na qualidade de Monitor(a) e Equipe de Apoio'
    : 'na condição de Participante';

  // Configurações de cores dos temas pré-definidos (Cores puras e gradientes CSS padrão para 100% de compatibilidade com html2canvas)
  const themeStyles = {
    classico_azul: {
      outerBorderColor: '#0f2b5c',
      innerBorderColor: '#d97706',
      titleColor: '#0f2b5c',
      gradient: 'linear-gradient(135deg, rgba(15, 43, 92, 0.04) 0%, #ffffff 50%, rgba(15, 43, 92, 0.04) 100%)'
    },
    verde_institucional: {
      outerBorderColor: '#064e3b',
      innerBorderColor: '#10b981',
      titleColor: '#064e3b',
      gradient: 'linear-gradient(135deg, rgba(6, 78, 59, 0.04) 0%, #ffffff 50%, rgba(6, 78, 59, 0.04) 100%)'
    },
    elegante_dourado: {
      outerBorderColor: '#78350f',
      innerBorderColor: '#d97706',
      titleColor: '#92400e',
      gradient: 'linear-gradient(135deg, rgba(217, 119, 6, 0.07) 0%, rgba(255, 251, 235, 0.6) 50%, rgba(217, 119, 6, 0.07) 100%)'
    }
  };

  const selectedTheme = themeStyles[template.preset_theme] || themeStyles.classico_azul;
  const isDeclaration =
    template.document_kind === 'declaracao' ||
    certificate.document_kind === 'declaracao' ||
    (certificate.validation_hash || '').toUpperCase().startsWith('DECL-');

  const organizingSecretariat =
    template.secretariat_name?.trim() ||
    (template.issuer_role.toLowerCase().includes('secret') ? template.issuer_role : '') ||
    'Secretaria Municipal Organizadora';

  const activityLabel = getActivityTypeLabel(template.event_type);
  const titleAlreadyMentionsType = (template.title || '')
    .toLowerCase()
    .includes(activityLabel.toLowerCase());

  const todayExtenso = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  if (isDeclaration) {
    return (
      <div
        style={{
          display: 'inline-block',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        {/* Folha A4 Retrato (Papel Timbrado Oficial da Prefeitura): 210mm x 297mm (794px x 1123px) */}
        <div
          ref={ref}
          id={disableRenderId ? undefined : `certificate-render-${certificate.id}`}
          data-orientation="portrait"
          style={{
            position: 'relative',
            width: '794px',
            height: '1123px',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            padding: '52px 60px 44px 60px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
            fontFamily: 'Arial, Helvetica, sans-serif'
          }}
        >
          {/* Barra superior institucional */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '8px',
              backgroundColor: selectedTheme.titleColor
            }}
          />

          {/* TIMBRE OFICIAL DA PREFEITURA & SECRETARIA ORGANIZADORA */}
          <div style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                paddingBottom: '18px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  maxWidth: '170px',
                  minWidth: '76px',
                  height: '76px'
                }}
              >
                <img
                  src={logoSrc}
                  alt="Brasão Oficial da Prefeitura"
                  style={{
                    maxHeight: '74px',
                    maxWidth: '170px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                  onError={() => {
                    if (logoSrc !== '/brasao-municipio.png') {
                      setLogoSrc('/brasao-municipio.png');
                    }
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderLeftWidth: '2px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: '#cbd5e1',
                  paddingLeft: '18px'
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: '#64748b',
                    margin: 0
                  }}
                >
                  República Federativa do Brasil
                </div>
                <div
                  style={{
                    fontSize: '19px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: '#0f172a',
                    lineHeight: 1.2,
                    marginTop: '3px'
                  }}
                >
                  {institution?.name || 'Prefeitura Municipal'}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: selectedTheme.titleColor,
                    marginTop: '3px'
                  }}
                >
                  {organizingSecretariat}
                </div>
                {(institution?.cnpj || institution?.city) && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                    {institution?.cnpj ? `CNPJ: ${institution.cnpj}` : ''}
                    {institution?.cnpj && institution?.city ? ' · ' : ''}
                    {institution?.city ? `${institution.city}${institution.state ? ` - ${institution.state}` : ''}` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Filete duplo oficial de papel timbrado */}
            <div style={{ borderTopWidth: '2.5px', borderTopStyle: 'solid', borderTopColor: selectedTheme.titleColor }} />
            <div style={{ marginTop: '3px', borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#cbd5e1' }} />
          </div>

          {/* CORPO DA DECLARAÇÃO OFICIAL */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '44px' }}>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: '#0f172a',
                  margin: 0
                }}
              >
                DECLARAÇÃO DE PARTICIPAÇÃO
              </h1>
              <div
                style={{
                  width: '90px',
                  height: '3px',
                  backgroundColor: selectedTheme.titleColor,
                  margin: '12px auto 0 auto'
                }}
              />
            </div>

            <div
              style={{
                fontSize: '16px',
                lineHeight: 1.9,
                textAlign: 'justify',
                color: '#1e293b',
                fontFamily: 'Georgia, Cambria, "Times New Roman", serif'
              }}
            >
              <p style={{ textIndent: '44px', margin: '0 0 22px 0' }}>
                Declaramos, para os devidos fins que se fizerem necessários, que{' '}
                <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>
                  {certificate.recipient_name}
                </strong>
                , inscrito(a) no CPF sob o nº{' '}
                <strong style={{ color: '#0f172a' }}>{certificate.recipient_document}</strong>,{' '}
                {titleAlreadyMentionsType ? (
                  <>participou da ação formativa intitulada </>
                ) : (
                  <>
                    participou da atividade de{' '}
                    <strong style={{ color: '#0f172a' }}>{activityLabel}</strong> intitulada{' '}
                  </>
                )}
                <strong style={{ color: '#0f172a' }}>"{template.title}"</strong>,
                promovida pela{' '}
                <strong style={{ color: '#0f172a' }}>{organizingSecretariat}</strong>,{' '}
                {dateRangeText}, totalizando uma carga horária de{' '}
                <strong style={{ color: '#0f172a' }}>{template.workload_hours} horas</strong>.
              </p>

              <p style={{ textIndent: '44px', margin: 0 }}>
                Por ser expressão da verdade, firmamos a presente declaração para que produza os seus
                devidos efeitos legais.
              </p>
            </div>

            <p
              style={{
                textAlign: 'right',
                fontSize: '15px',
                marginTop: '44px',
                marginBottom: 0,
                color: '#334155',
                fontFamily: 'Georgia, Cambria, "Times New Roman", serif'
              }}
            >
              {institution?.city ? `${institution.city}${institution.state ? ` - ${institution.state}` : ''}` : (institution?.name || 'Município')},{' '}
              {todayExtenso}.
            </p>

            {/* BLOCO DE ASSINATURA DO SECRETÁRIO(A) */}
            <div
              style={{
                marginTop: '56px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              {template.secretary_signature_url ? (
                <img
                  src={template.secretary_signature_url}
                  alt={`Assinatura de ${template.issuer_name}`}
                  style={{
                    maxHeight: '70px',
                    maxWidth: '240px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    marginBottom: '-6px'
                  }}
                />
              ) : (
                <div
                  style={{
                    marginBottom: '6px',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    borderWidth: '1px',
                    borderStyle: 'dashed',
                    borderColor: '#cbd5e1'
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#64748b'
                    }}
                  >
                    Assinado eletronicamente por {template.issuer_name}
                  </span>
                </div>
              )}

              <div
                style={{
                  width: '320px',
                  borderBottomWidth: '1.5px',
                  borderBottomStyle: 'solid',
                  borderBottomColor: '#0f172a',
                  marginBottom: '8px'
                }}
              />
              <div style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
                {template.issuer_name}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
                {template.issuer_role || 'Secretário(a) Municipal'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', marginTop: '2px' }}>
                {organizingSecretariat}
              </div>
            </div>
          </div>

          {/* RODAPÉ OFICIAL COM QR CODE DE AUTENTICIDADE */}
          <div
            style={{
              paddingTop: '14px',
              borderTopWidth: '1px',
              borderTopStyle: 'solid',
              borderTopColor: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  padding: '4px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#cbd5e1',
                  flexShrink: 0,
                  boxSizing: 'border-box'
                }}
              >
                <img
                  src={qrUrl}
                  alt="QR Code de Autenticidade"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
              <div style={{ textAlign: 'left', fontSize: '10px', lineHeight: 1.4, color: '#64748b' }}>
                <div style={{ fontWeight: 800, fontSize: '11px', fontFamily: 'monospace', color: '#0f172a' }}>
                  AUTENTICIDADE: {certificate.validation_hash}
                </div>
                <div style={{ marginTop: '2px' }}>
                  Documento oficial validável conforme a Lei Federal nº 14.063/2020.
                </div>
                <div style={{ fontSize: '9px', marginTop: '2px', color: '#94a3b8', wordBreak: 'break-all' }}>
                  Conferência: {certificate.qr_code_url}
                </div>
              </div>
            </div>

            {isSecondIssue && (
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  textAlign: 'right',
                  flexShrink: 0,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#fca5a5',
                  backgroundColor: '#fff1f2',
                  color: '#be123c'
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                  2ª Via
                </div>
                <div style={{ fontSize: '9px' }}>{new Date().toLocaleDateString('pt-BR')}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
      }}
      className="inline-block"
    >
      <div
        ref={ref}
        id={disableRenderId ? undefined : `certificate-render-${certificate.id}`}
        className="flex flex-col gap-6"
      >
        {side !== 'back' && (
          /* Folha A4 Paisagem exata (Frente): 297mm x 210mm (1122.5px x 793.7px a 96 DPI) */
          <div
            data-cert-page="front"
            style={{
              width: '1122px',
              height: '794px',
              backgroundColor: '#ffffff',
              color: '#1f2937'
            }}
            className="relative overflow-hidden flex flex-col justify-between p-12 box-border font-sans select-none"
          >
        {/* Fundo Customizado enviado pelo usuário OU Moldura Clássica */}
        {template.background_mode === 'custom_upload' && template.custom_background_url ? (
          <img
            src={template.custom_background_url}
            alt="Fundo do Certificado"
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
          />
        ) : (
          <>
            {/* Moldura dupla clássica ornamental com cores hexadecimais puras */}
            <div 
              className="absolute inset-4 z-0 pointer-events-none"
              style={{ borderWidth: '6px', borderStyle: 'solid', borderColor: selectedTheme.outerBorderColor }}
            />
            <div 
              className="absolute inset-6 z-0 pointer-events-none"
              style={{ borderWidth: '2px', borderStyle: 'dashed', borderColor: selectedTheme.innerBorderColor }}
            />
            <div 
              className="absolute inset-0 z-0 pointer-events-none"
              style={{ background: selectedTheme.gradient }}
            />
          </>
        )}

        {/* Camada de Conteúdo */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Topo: Brasão/Logotipo Institucional, Cabeçalho e Carimbo de 2ª Via */}
          <div className="flex items-center justify-between gap-6 pt-1 pb-2">
            <div className="flex items-center gap-5 min-w-0 max-w-2xl">
              {/* Contêiner de Enquadramento da Logo com suporte otimizado a logos horizontais e brasões */}
              <div 
                className="flex items-center justify-center shrink-0"
                style={{ 
                  height: '80px', 
                  minWidth: '80px',
                  maxWidth: '260px' 
                }}
              >
                <img
                  src={logoSrc}
                  alt="Brasão / Logotipo Oficial do Município"
                  style={{
                    maxHeight: '78px',
                    maxWidth: '250px',
                    height: 'auto',
                    width: 'auto',
                    objectFit: 'contain',
                    objectPosition: 'left center'
                  }}
                  onError={() => {
                    if (logoSrc !== '/brasao-municipio.png') {
                      setLogoSrc('/brasao-municipio.png');
                    }
                  }}
                />
              </div>

              {/* Divisória Vertical Nobre e Identificação do Órgão Expedidor */}
              <div 
                className="pl-5 flex flex-col justify-center"
                style={{ 
                  borderLeftWidth: '2px', 
                  borderLeftStyle: 'solid', 
                  borderLeftColor: '#cbd5e1',
                  minHeight: '72px',
                  overflow: 'visible'
                }}
              >
                <h4 
                  className="text-xs font-black uppercase tracking-wider" 
                  style={{ 
                    color: '#475569', 
                    letterSpacing: '0.08em',
                    lineHeight: '1.45',
                    marginBottom: '3px',
                    overflow: 'visible'
                  }}
                >
                  {institution?.name || 'Prefeitura Municipal'}
                </h4>
                <p 
                  className="text-sm font-black uppercase tracking-wide" 
                  style={{ 
                    color: '#0f172a',
                    lineHeight: '1.35',
                    marginBottom: '3px',
                    overflow: 'visible'
                  }}
                >
                  {template.secretariat_name?.trim()
                    || (template.issuer_role.toLowerCase().includes('secret') ? template.issuer_role : '')
                    || 'Administração & Políticas Públicas Municipais'}
                </p>
                <p 
                  className="text-[10px] uppercase font-mono tracking-widest" 
                  style={{ 
                    color: '#94a3b8', 
                    letterSpacing: '0.06em',
                    lineHeight: '1.3',
                    overflow: 'visible'
                  }}
                >
                  {isDeclaration
                    ? 'Registro e Expedição de Declarações Oficiais'
                    : 'Registro e Expedição de Certificados Oficiais'}
                </p>
              </div>
            </div>

            {/* Selo de 2ª Via Oficial se download_count > 1 */}
            {isSecondIssue && (
              <div 
                style={{ 
                  borderWidth: '1px', 
                  borderStyle: 'solid', 
                  borderColor: '#fca5a5', 
                  backgroundColor: '#fff1f2', 
                  color: '#be123c' 
                }}
                className="px-3.5 py-2 rounded-xl text-right shrink-0"
              >
                <span className="text-[10px] font-black uppercase tracking-wider block font-mono">
                  2ª Via Oficial
                </span>
                <span className="text-[9px] block font-medium" style={{ color: '#e11d48' }}>
                  Emitida em {new Date().toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>

          {/* Centro: Título CERTIFICADO / DECLARAÇÃO e Texto Personalizado */}
          <div className="my-auto text-center px-8">
            <div className="mb-4">
              <h1 
                style={{ color: selectedTheme.titleColor }}
                className="text-4xl font-serif font-black tracking-[0.25em] uppercase"
              >
                {isDeclaration ? 'D E C L A R A Ç Ã O' : 'C E R T I F I C A D O'}
              </h1>
              {isDeclaration && (
                <p
                  className="text-xs font-bold uppercase tracking-[0.35em] mt-1"
                  style={{ color: '#64748b' }}
                >
                  DE PARTICIPAÇÃO
                </p>
              )}
              <div className="w-24 h-1 mx-auto mt-2 rounded-full" style={{ backgroundColor: '#d97706' }} />
            </div>

            <p className="text-base leading-relaxed font-serif max-w-4xl mx-auto" style={{ color: '#4b5563' }}>
              {isDeclaration ? 'Declaramos, para os devidos fins, que' : 'Certificamos que'}
            </p>

            <h2 
              className="text-3xl font-serif font-black my-3 tracking-wide"
              style={{ 
                color: '#0f172a',
                textDecoration: 'underline',
                textDecorationColor: '#d97706',
                textUnderlineOffset: '8px'
              }}
            >
              {certificate.recipient_name}
            </h2>

            <p className="text-sm font-mono mb-4" style={{ color: '#6b7280' }}>
              {isDeclaration ? 'CPF: ' : 'Documento: '}
              <strong style={{ color: '#1f2937' }}>{certificate.recipient_document}</strong>
            </p>

            <p className="text-base leading-relaxed max-w-4xl mx-auto font-normal" style={{ color: '#374151' }}>
              {isDeclaration ? (
                titleAlreadyMentionsType ? (
                  <>participou da ação formativa intitulada</>
                ) : (
                  <>
                    participou da atividade de <strong>{activityLabel}</strong> intitulada
                  </>
                )
              ) : titleAlreadyMentionsType ? (
                <>concluiu com aproveitamento a ação formativa intitulada</>
              ) : (
                <>
                  concluiu com aproveitamento a ação formativa de <strong>{activityLabel}</strong> intitulada
                </>
              )}
            </p>

            <p className="text-xl font-bold mt-2 mb-3" style={{ color: '#0f172a' }}>
              "{template.title}"
            </p>

            <p className="text-sm leading-relaxed max-w-3xl mx-auto" style={{ color: '#4b5563' }}>
              {roleText}, {dateRangeText}, totalizando uma carga horária de{' '}
              <strong style={{ color: '#0f172a' }}>{template.workload_hours} horas</strong>
              {isDeclaration ? '.' : ' de capacitação e desenvolvimento.'}
            </p>
          </div>

          {/* Rodapé: Assinatura e Bloco de Autenticidade com QR Code */}
          <div 
            className="pt-4 flex items-end justify-between gap-6"
            style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#e5e7eb' }}
          >
            {/* Bloco de Validação e QR Code Oficial (Lei 14.063/2020) */}
            <div className="flex items-center gap-3">
              <div 
                className="w-20 h-20 p-1 rounded-lg shrink-0"
                style={{ backgroundColor: '#ffffff', borderWidth: '1px', borderStyle: 'solid', borderColor: '#cbd5e1' }}
              >
                <img
                  src={qrUrl}
                  alt="QR Code de Autenticidade"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-left text-[10px] leading-tight" style={{ color: '#6b7280' }}>
                <span className="font-bold block text-[11px] font-mono" style={{ color: '#1f2937' }}>
                  CHAVE: {certificate.validation_hash}
                </span>
                <span className="block mt-0.5" style={{ color: '#4b5563' }}>
                  Autenticidade rastreável conforme a Lei Federal 14.063/2020.
                </span>
                <span className="block text-[9px] mt-0.5" style={{ color: '#9ca3af' }}>
                  Conferência pública: {certificate.qr_code_url}
                </span>
              </div>
            </div>

            {/* Assinaturas Obrigatórias: Formador(a) e Secretaria Responsável pela Formação */}
            <div className="flex items-end gap-8">
              <div className="text-center min-w-[200px]">
                <div 
                  className="w-48 mb-2 mx-auto" 
                  style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#1e293b' }}
                />
                <p className="text-xs font-bold leading-tight" style={{ color: '#0f172a' }}>
                  {template.issuer_name}
                </p>
                <p className="text-[11px] font-medium uppercase" style={{ color: '#6b7280' }}>
                  {template.issuer_role || 'Formador(a)'}
                </p>
              </div>

              <div className="text-center min-w-[220px]">
                <div 
                  className="w-56 mb-2 mx-auto" 
                  style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#1e293b' }}
                />
                <p className="text-xs font-bold leading-tight uppercase" style={{ color: '#0f172a' }}>
                  {template.secretariat_name?.trim()
                    || (template.issuer_role.toLowerCase().includes('secret') ? template.issuer_role : '')
                    || 'Secretaria Responsável'}
                </p>
                <p className="text-[11px] font-medium" style={{ color: '#6b7280' }}>
                  Secretaria Responsável pela Formação
                </p>
              </div>
            </div>
          </div>
        </div>
          </div>
        )}

        {side !== 'front' && (
          <CertificateBackPage
            certificate={certificate}
            template={template}
            institution={institution}
            logoSrc={logoSrc}
            qrUrl={qrUrl}
            dateRangeText={dateRangeText}
            selectedTheme={selectedTheme}
          />
        )}
      </div>
    </div>
  );
});

CertificateDocumentPDF.displayName = 'CertificateDocumentPDF';

/**
 * Renderiza o elemento HTML em canvas e gera um Blob de PDF (A4 Paisagem)
 */
export async function generateCertificatePdfBlob(element: HTMLElement): Promise<Blob> {
  const origGetComputedStyle = window.getComputedStyle;

  // Intercepta window.getComputedStyle durante a execução do html2canvas para blindar contra oklch/oklab do Tailwind v4
  window.getComputedStyle = function(el: Element, pseudo?: string | null) {
    const style = origGetComputedStyle.call(window, el, pseudo);
    return wrapStyleDeclaration(style);
  } as any;

  try {
    const pageNodes = Array.from(element.querySelectorAll('[data-cert-page]')) as HTMLElement[];
    const targets = pageNodes.length > 0 ? pageNodes : [element];

    const renderPageCanvas = (targetEl: HTMLElement) =>
      html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 6000,
        onclone: (clonedDoc, clonedElement) => {
          if (clonedDoc.defaultView) {
            const iframeOrig = clonedDoc.defaultView.getComputedStyle;
            clonedDoc.defaultView.getComputedStyle = function(el: Element, pseudo?: string | null) {
              const style = iframeOrig.call(clonedDoc.defaultView, el, pseudo);
              return wrapStyleDeclaration(style);
            } as any;
          }

          if (clonedDoc.documentElement) {
            clonedDoc.documentElement.style.backgroundColor = '#ffffff';
            clonedDoc.documentElement.style.color = '#1f2937';
          }
          if (clonedDoc.body) {
            clonedDoc.body.style.backgroundColor = '#ffffff';
            clonedDoc.body.style.color = '#1f2937';
          }

          const allClonedNodes = [clonedElement, ...Array.from(clonedElement.getElementsByTagName('*'))];
          allClonedNodes.forEach((node) => {
            const el = node as HTMLElement;
            el.style.boxShadow = 'none';
            el.style.textShadow = 'none';
            el.style.filter = 'none';
            if (el.style.cssText && (el.style.cssText.includes('oklch') || el.style.cssText.includes('oklab') || el.style.cssText.includes('color-mix'))) {
              el.style.cssText = convertCssColorToRgb(el.style.cssText);
            }
          });
        }
      });

    const firstTarget = targets[0];
    const isPortrait =
      firstTarget.dataset?.orientation === 'portrait' || firstTarget.offsetHeight > firstTarget.offsetWidth;

    const pdf = new jsPDF({
      orientation: isPortrait ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    for (let i = 0; i < targets.length; i++) {
      const targetEl = targets[i];
      if (i > 0) {
        const pagePortrait =
          targetEl.dataset?.orientation === 'portrait' || targetEl.offsetHeight > targetEl.offsetWidth;
        pdf.addPage('a4', pagePortrait ? 'portrait' : 'landscape');
      }
      const canvas = await renderPageCanvas(targetEl);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    return pdf.output('blob');
  } finally {
    // Restaura getComputedStyle original
    window.getComputedStyle = origGetComputedStyle;
  }
}

/**
 * Dispara o download direto de um único certificado
 */
export async function downloadCertificatePdf(
  element: HTMLElement,
  filename: string = 'Certificado.pdf'
): Promise<void> {
  const imgs = Array.from(element.querySelectorAll('img'));
  await Promise.race([
    Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            })
      )
    ),
    new Promise<void>((resolve) => setTimeout(resolve, 1500))
  ]);
  const blob = await generateCertificatePdfBlob(element);
  saveAs(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
