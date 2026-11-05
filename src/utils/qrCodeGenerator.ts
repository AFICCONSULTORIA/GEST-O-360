/**
 * Utilitário de Geração de QR Code 100% Local / Offline (SVG e DataURI)
 * Garante que autorizações e ordens de abastecimento exibam o QR Code instantaneamente (0ms)
 * sem nenhuma requisição de rede para APIs externas (ex: qrserver).
 */

import QRCode from 'qrcode';

/**
 * Gera um elemento SVG inline completo do QR Code de forma 100% síncrona.
 * Renderiza nativamente no DOM/HTML sem depender de carregamento de imagem.
 */
export function generateQrSvgSync(text: string, sizePx: number = 85): string {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const moduleCount = qr.modules.size;
    const data = qr.modules.data;
    let path = '';
    
    // Adiciona margem de 1 módulo (quiet zone)
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (data[r * moduleCount + c]) {
          path += `M${c + 1},${r + 1}h1v1h-1z `;
        }
      }
    }
    const viewSize = moduleCount + 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" style="display:block;margin:0 auto;background:#ffffff;"><rect width="100%" height="100%" fill="#ffffff"/><path fill="#000000" d="${path.trim()}"/></svg>`;
  } catch (err) {
    console.error('Erro ao gerar QR Code SVG síncrono:', err);
    return `<div style="width:${sizePx}px;height:${sizePx}px;border:1px dashed #94a3b8;display:flex;align-items:center;justify-content:center;font-size:8px;font-family:sans-serif;color:#64748b;">QR CODE</div>`;
  }
}

/**
 * Gera Data URL base64 do QR Code para uso em tags <img> caso necessário.
 */
export async function generateQrDataUrl(text: string, width: number = 200): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Erro ao gerar QR Code Data URL:', err);
    return '';
  }
}

