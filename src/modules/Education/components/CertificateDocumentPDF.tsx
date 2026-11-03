import React, { forwardRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { CertificateTemplate, IssuedCertificate } from '../types/certificates';
import { Institution } from '../../../types';

export interface CertificateDocumentPDFProps {
  certificate: IssuedCertificate;
  template: CertificateTemplate;
  institution?: Institution | null;
  /** Se true, adiciona marcação de preview reduzido */
  scale?: number;
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
  scale = 1
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

  return (
    <div
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
      }}
      className="inline-block"
    >
      {/* Folha A4 Paisagem exata: 297mm x 210mm (1122.5px x 793.7px a 96 DPI) */}
      <div
        ref={ref}
        id={`certificate-render-${certificate.id}`}
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
                  {template.issuer_role.toLowerCase().includes('secret') 
                    ? template.issuer_role 
                    : 'Administração & Políticas Públicas Municipais'}
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
                  Registro e Expedição de Certificados Oficiais
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

          {/* Centro: Título CERTIFICADO e Texto Personalizado */}
          <div className="my-auto text-center px-8">
            <div className="mb-4">
              <h1 
                style={{ color: selectedTheme.titleColor }}
                className="text-4xl font-serif font-black tracking-[0.25em] uppercase"
              >
                C E R T I F I C A D O
              </h1>
              <div className="w-24 h-1 mx-auto mt-2 rounded-full" style={{ backgroundColor: '#d97706' }} />
            </div>

            <p className="text-base leading-relaxed font-serif max-w-4xl mx-auto" style={{ color: '#4b5563' }}>
              Certificamos que
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
              Documento: <strong style={{ color: '#1f2937' }}>{certificate.recipient_document}</strong>
            </p>

            <p className="text-base leading-relaxed max-w-4xl mx-auto font-normal" style={{ color: '#374151' }}>
              concluiu com aproveitamento a atividade formativa na modalidade <strong>{template.event_type.toUpperCase()}</strong>:
            </p>

            <p className="text-xl font-bold mt-2 mb-3" style={{ color: '#0f172a' }}>
              "{template.title}"
            </p>

            <p className="text-sm leading-relaxed max-w-3xl mx-auto" style={{ color: '#4b5563' }}>
              {roleText}, {dateRangeText}, totalizando uma carga horária de{' '}
              <strong style={{ color: '#0f172a' }}>{template.workload_hours} horas</strong> de capacitação e desenvolvimento.
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

            {/* Assinatura do Emissor Oficial */}
            <div className="text-center min-w-[260px]">
              <div 
                className="w-64 mb-2 mx-auto" 
                style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#1e293b' }}
              />
              <p className="text-sm font-bold leading-tight" style={{ color: '#0f172a' }}>
                {template.issuer_name}
              </p>
              <p className="text-xs font-medium" style={{ color: '#6b7280' }}>
                {template.issuer_role}
              </p>
            </div>
          </div>
        </div>
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
    const canvas = await html2canvas(element, {
      scale: 2, // Resolução de alta definição (retina)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 6000,
      onclone: (clonedDoc, clonedElement) => {
        // 1. Aplica o interceptor de estilo no iframe clonado também
        if (clonedDoc.defaultView) {
          const iframeOrig = clonedDoc.defaultView.getComputedStyle;
          clonedDoc.defaultView.getComputedStyle = function(el: Element, pseudo?: string | null) {
            const style = iframeOrig.call(clonedDoc.defaultView, el, pseudo);
            return wrapStyleDeclaration(style);
          } as any;
        }

        // 2. Força documentElement e body do clone com cores sRGB explícitas
        if (clonedDoc.documentElement) {
          clonedDoc.documentElement.style.backgroundColor = '#ffffff';
          clonedDoc.documentElement.style.color = '#1f2937';
        }
        if (clonedDoc.body) {
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.color = '#1f2937';
        }

        // 3. Remove sombras, filtros e sanitiza inline styles de todos os elementos para eliminar tokens oklch
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

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
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
  const blob = await generateCertificatePdfBlob(element);
  saveAs(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
