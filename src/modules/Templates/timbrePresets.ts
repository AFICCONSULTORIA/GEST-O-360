import React from 'react';
import { TimbreData, TimbreStyle, WatermarkConfig, MarginPreset, MarginConfig } from './types';
import { Institution } from '../../types';

export const DEFAULT_BRASAO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="70" height="70"><path d="M50 5 L85 20 L85 60 C85 80 50 95 50 95 C50 95 15 80 15 60 L15 20 Z" fill="%231e3a8a" stroke="%23fbbf24" stroke-width="2.5"/><path d="M50 15 L75 27 L75 57 C75 72 50 83 50 83 C50 83 25 72 25 57 L25 27 Z" fill="%23ffffff" stroke="%231e3a8a" stroke-width="1.5"/><circle cx="50" cy="45" r="14" fill="%23fbbf24"/><path d="M50 35 L53 42 L60 43 L55 48 L56 55 L50 51 L44 55 L45 48 L40 43 L47 42 Z" fill="%231e3a8a"/><rect x="35" y="65" width="30" height="6" rx="2" fill="%231e3a8a"/></svg>`;

export const MARGIN_PRESETS: Record<MarginPreset, MarginConfig> = {
  abnt: { label: 'Oficial ABNT (3cm sup / 3cm esq / 2cm dir / 2cm inf)', top: '3cm', bottom: '2cm', left: '3cm', right: '2cm' },
  normal: { label: 'Normal (~2cm)', top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
  narrow: { label: 'Estreita (~1.2cm)', top: '1.2cm', bottom: '1.2cm', left: '1.5cm', right: '1.5cm' },
  wide: { label: 'Larga (~2.8cm)', top: '2.5cm', bottom: '2.5cm', left: '3.2cm', right: '3.2cm' },
};

export const createDefaultTimbreData = (institution?: Institution | null): TimbreData => {
  const muni = institution?.name || 'MUNICÍPIO';
  const logo = institution?.logo_url || DEFAULT_BRASAO_SVG;

  return {
    id: 'timbre-default',
    name: 'Oficial Municipal (Padrão)',
    style: 'classico',
    municipio: muni,
    estado: 'MATO GROSSO',
    prefeitura: `PREFEITURA MUNICIPAL DE ${muni.toUpperCase()}`,
    secretaria: 'GABINETE DO PREFEITO',
    departamento: 'ADMINISTRAÇÃO GERAL',
    endereco: 'Praça dos Três Poderes, nº 100 - Centro',
    cep: '78.000-000',
    cnpj: '00.000.000/0001-00',
    telefone: '(66) 3000-0000',
    email: `contato@${muni.toLowerCase().replace(/\s+/g, '')}.mt.gov.br`,
    site: `www.${muni.toLowerCase().replace(/\s+/g, '')}.mt.gov.br`,
    logoUrl: logo,
    accentColor: '#1e3a8a',
    backgroundOpacity: 0.08,
  };
};

export const BUILTIN_TIMBRE_PRESETS: { id: string; name: string; description: string; style: TimbreStyle; thumbnail: string }[] = [
  {
    id: 'classico',
    name: 'Clássico Executivo',
    description: 'Brasão centralizado no topo, identificação formal e linhas pretas duplas oficiais.',
    style: 'classico',
    thumbnail: '🏛️',
  },
  {
    id: 'gabinete',
    name: 'Gabinete do Prefeito',
    description: 'Brasão executivo no topo com selo nobre e tipografia de alto padrão.',
    style: 'gabinete',
    thumbnail: '📜',
  },
  {
    id: 'secretaria',
    name: 'Secretaria com Brasão Lateral',
    description: 'Brasão à esquerda, dados do órgão alinhados e barra vertical divisória.',
    style: 'secretaria',
    thumbnail: '🏢',
  },
  {
    id: 'moderno',
    name: 'Moderno Institucional',
    description: 'Tipografia limpa, logotipo moderno e barra inferior colorida.',
    style: 'moderno',
    thumbnail: '✨',
  },
  {
    id: 'imagem_cabecalho',
    name: 'Timbre por Imagem de Cabeçalho',
    description: 'Use a imagem oficial do cabeçalho da sua prefeitura na largura exata da folha.',
    style: 'imagem_cabecalho',
    thumbnail: '🖼️',
  },
  {
    id: 'fundo_completo',
    name: 'Papel Timbrado Completo (Fundo A4)',
    description: 'Upload de arte A4 pronta (cabeçalho + rodapé na própria imagem de fundo).',
    style: 'fundo_completo',
    thumbnail: '📄',
  },
];

export const generateHeaderHtml = (timbre: TimbreData): string => {
  if (timbre.style === 'nenhum') return '<p><br></p>';

  if (timbre.style === 'imagem_cabecalho') {
    if (timbre.headerImageUrl) {
      return `<div style="text-align: center; margin-bottom: 12px;" data-timbre-header="true">
        <img src="${timbre.headerImageUrl}" alt="Cabeçalho Oficial" style="width: 100%; max-height: 140px; object-fit: contain;" />
      </div>`;
    }
    // Fallback se ainda não tiver imagem
    return `<div style="text-align: center; border: 2px dashed #94a3b8; padding: 20px; border-radius: 8px; font-family: Inter, sans-serif; color: #64748b;" data-timbre-header="true">
      <p style="margin: 0; font-size: 11pt; font-weight: bold;">🖼️ Imagem do Cabeçalho Oficial</p>
      <p style="margin: 4px 0 0 0; font-size: 9pt;">Clique em "Timbre & Papel Timbrado" para fazer o upload da imagem do cabeçalho da sua prefeitura.</p>
    </div>`;
  }

  if (timbre.style === 'fundo_completo') {
    // Quando usa fundo completo, o cabeçalho fica com espaçador transparente
    return `<div style="height: 60px; min-height: 60px;" data-timbre-header="true">&nbsp;</div>`;
  }

  const logoHtml = timbre.logoUrl 
    ? `<img src="${timbre.logoUrl}" alt="Brasão Oficial" style="height: 65px; max-width: 90px; object-fit: contain; margin-bottom: 6px; display: inline-block;" />`
    : '';

  const muniName = timbre.municipio?.toUpperCase() || 'MUNICÍPIO';
  const ufName = timbre.estado?.toUpperCase() || 'ESTADO';
  const prefName = timbre.prefeitura || `PREFEITURA MUNICIPAL DE ${muniName}`;
  const secName = timbre.secretaria ? `<p style="margin: 1px 0 0 0; font-size: 11pt; font-weight: bold; color: #1e293b;">${timbre.secretaria.toUpperCase()}</p>` : '';
  const depName = timbre.departamento ? `<p style="margin: 1px 0 0 0; font-size: 9pt; color: #475569;">${timbre.departamento.toUpperCase()}</p>` : '';

  if (timbre.style === 'secretaria') {
    return `<div style="font-family: 'Times New Roman', serif; border-bottom: 2px solid ${timbre.accentColor || '#1e3a8a'}; padding-bottom: 10px; margin-bottom: 16px;" data-timbre-header="true">
      <table style="width: 100%; border-collapse: collapse; border: none;">
        <tr>
          ${logoHtml ? `<td style="width: 80px; vertical-align: middle; border: none; padding: 0 16px 0 0;">${logoHtml}</td>` : ''}
          <td style="vertical-align: middle; border: none; padding: 0; border-left: 2px solid #e2e8f0; padding-left: 14px;">
            <h3 style="margin: 0; font-size: 12pt; font-weight: bold; color: #0f172a; text-transform: uppercase;">${prefName}</h3>
            <p style="margin: 2px 0 0 0; font-size: 10pt; color: #334155;">ESTADO DE ${ufName}</p>
            ${secName}
            ${depName}
          </td>
        </tr>
      </table>
    </div>`;
  }

  if (timbre.style === 'gabinete') {
    return `<div style="text-align: center; font-family: 'Times New Roman', serif; margin-bottom: 16px;" data-timbre-header="true">
      ${logoHtml}
      <h3 style="margin: 2px 0 0 0; font-size: 13pt; font-weight: bold; letter-spacing: 1px; color: #0f172a;">${prefName}</h3>
      <p style="margin: 2px 0 0 0; font-size: 11pt; font-weight: bold; color: ${timbre.accentColor || '#1e3a8a'}; text-transform: uppercase;">GABINETE DO PREFEITO</p>
      <p style="margin: 1px 0 0 0; font-size: 9.5pt; color: #64748b;">ESTADO DE ${ufName}</p>
      <div style="width: 60%; height: 1.5px; background: ${timbre.accentColor || '#1e3a8a'}; margin: 10px auto 3px auto;"></div>
      <div style="width: 30%; height: 1px; background: #94a3b8; margin: 0 auto;"></div>
    </div>`;
  }

  if (timbre.style === 'moderno') {
    return `<div style="font-family: 'Inter', sans-serif; margin-bottom: 18px; border-bottom: 3px solid ${timbre.accentColor || '#0284c7'}; padding-bottom: 12px;" data-timbre-header="true">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${logoHtml}
          <div>
            <h3 style="margin: 0; font-size: 12pt; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">${prefName}</h3>
            <p style="margin: 2px 0 0 0; font-size: 10pt; font-weight: 600; color: ${timbre.accentColor || '#0284c7'};">${timbre.secretaria || 'Administração Geral'}</p>
            <p style="margin: 1px 0 0 0; font-size: 8.5pt; color: #64748b;">Estado de ${ufName.charAt(0) + ufName.slice(1).toLowerCase()}</p>
          </div>
        </div>
      </div>
    </div>`;
  }

  // Padrão: 'classico'
  return `<div style="text-align: center; font-family: 'Times New Roman', serif; margin-bottom: 16px;" data-timbre-header="true">
    ${logoHtml}
    <h3 style="margin: 0; font-size: 13pt; font-weight: bold; color: #000; text-transform: uppercase;">${prefName}</h3>
    <p style="margin: 1px 0 0 0; font-size: 11pt; color: #111;">ESTADO DE ${ufName}</p>
    ${secName}
    <div style="width: 100%; border-bottom: 2px solid #000; margin-top: 10px; margin-bottom: 2px;"></div>
    <div style="width: 100%; border-bottom: 0.75px solid #000;"></div>
  </div>`;
};

export const generateFooterHtml = (timbre: TimbreData): string => {
  if (timbre.style === 'nenhum') return '<p><br></p>';

  if (timbre.style === 'imagem_cabecalho') {
    if (timbre.footerImageUrl) {
      return `<div style="text-align: center; margin-top: 10px;" data-timbre-footer="true">
        <img src="${timbre.footerImageUrl}" alt="Rodapé Oficial" style="width: 100%; max-height: 80px; object-fit: contain;" />
      </div>`;
    }
  }

  if (timbre.style === 'fundo_completo') {
    return `<div style="height: 40px; min-height: 40px;" data-timbre-footer="true">&nbsp;</div>`;
  }

  const parts: string[] = [];
  if (timbre.endereco) parts.push(timbre.endereco);
  if (timbre.cep) parts.push(`CEP: ${timbre.cep}`);
  if (timbre.cnpj) parts.push(`CNPJ: ${timbre.cnpj}`);
  if (timbre.telefone) parts.push(`Tel: ${timbre.telefone}`);
  if (timbre.email) parts.push(`E-mail: ${timbre.email}`);
  if (timbre.site) parts.push(timbre.site);

  const contactLine = parts.length > 0 ? parts.join(' &nbsp;•&nbsp; ') : 'Documento Oficial Eletrônico';

  return `<div style="text-align: center; font-family: 'Times New Roman', serif; font-size: 8.5pt; color: #475569; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 16px;" data-timbre-footer="true">
    <p style="margin: 0; font-weight: bold; color: #334155;">${timbre.prefeitura || 'Prefeitura Municipal'}</p>
    <p style="margin: 2px 0 0 0; font-size: 8pt; color: #64748b; line-height: 1.4;">${contactLine}</p>
  </div>`;
};

export const getWatermarkStyles = (watermark?: WatermarkConfig, timbre?: TimbreData): React.CSSProperties | null => {
  if (!watermark || watermark.type === 'none') return null;

  return {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-35deg)',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 1,
    opacity: watermark.opacity || 0.1,
    fontWeight: 900,
    fontSize: '5rem',
    color: '#000000',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  };
};

export const getWatermarkText = (watermark?: WatermarkConfig): string => {
  if (!watermark || watermark.type === 'none') return '';
  switch (watermark.type) {
    case 'minuta': return 'MINUTA';
    case 'confidencial': return 'CONFIDENCIAL';
    case 'copia': return 'CÓPIA NÃO OFICIAL';
    case 'urgente': return 'URGENTE';
    case 'custom': return watermark.customText || 'DOCUMENTO';
    default: return '';
  }
};
