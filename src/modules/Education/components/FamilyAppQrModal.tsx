import React, { useMemo, useState } from 'react';
import { X, QrCode, Printer, Download, Copy, Check, ExternalLink, Smartphone } from 'lucide-react';
import { generateQrSvgSync, generateQrDataUrl } from '../../../utils/qrCodeGenerator';
import { escapeHtmlText, sanitizeSvgHtml } from '../../../utils/sanitizeHtml';

interface FamilyAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionName?: string;
}

export const FamilyAppQrModal: React.FC<FamilyAppQrModalProps> = ({
  isOpen,
  onClose,
  institutionName = 'Rede Municipal de Ensino'
}) => {
  const [copied, setCopied] = useState(false);

  const portalUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/familia';
    const url = new URL('/familia', window.location.origin);
    const currentParams = new URLSearchParams(window.location.search);
    const instParam = currentParams.get('institution');
    if (instParam) {
      url.searchParams.set('institution', instParam);
    }
    return url.toString();
  }, []);

  const qrSvg = useMemo(() => generateQrSvgSync(portalUrl, 210), [portalUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  const handleDownloadPng = async () => {
    const dataUrl = await generateQrDataUrl(portalUrl, 600);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'qrcode-app-familia-escola.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPoster = () => {
    const printWindow = window.open('', '_blank', 'width=820,height=980');
    if (!printWindow) return;

    const svgLarge = sanitizeSvgHtml(generateQrSvgSync(portalUrl, 260));
    const safeInstitution = escapeHtmlText(institutionName);
    const safeUrl = escapeHtmlText(portalUrl);

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>App Família e Escola - QR Code</title>
  <style>
    @page { size: A4 portrait; margin: 16mm; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
    body { margin: 0; color: #0f172a; background: #fff; }
    .sheet {
      border: 2px solid #e2e8f0;
      border-radius: 24px;
      padding: 32px;
      text-align: center;
      max-width: 680px;
      margin: 0 auto;
    }
    .badge {
      display: inline-block;
      background: #eef2ff;
      color: #4338ca;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
    h1 { font-size: 28px; margin: 0 0 8px; font-weight: 900; color: #1e1b4b; }
    .subtitle { font-size: 15px; color: #475569; margin: 0 0 24px; }
    .qr-box {
      display: inline-block;
      padding: 20px;
      border: 3px dashed #6366f1;
      border-radius: 24px;
      background: #fff;
      margin-bottom: 18px;
    }
    .url {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 14px;
      display: inline-block;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .steps {
      text-align: left;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px 24px;
      margin-top: 8px;
    }
    .steps h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #4338ca; margin: 0 0 12px; }
    .steps ol { margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.7; color: #1e293b; }
    .footer { margin-top: 20px; font-size: 12px; color: #64748b; }
    @media print {
      .no-print { display: none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="badge">${safeInstitution}</div>
    <h1>App Família &amp; Escola</h1>
    <p class="subtitle">Acompanhe notas, frequência, comunicados e a rotina escolar do seu filho direto no celular.</p>
    <div class="qr-box">${svgLarge}</div>
    <div><span class="url">${safeUrl}</span></div>
    <div class="steps">
      <h2>Como instalar no celular em 3 passos</h2>
      <ol>
        <li><strong>Aponte a câmera</strong> do celular para o QR Code acima e toque no link que aparecer na tela.</li>
        <li><strong>Entre com os dados do aluno:</strong> digite o CPF e a data de nascimento do estudante.</li>
        <li><strong>Instale o App:</strong> no Android toque em <em>"Instalar Aplicativo"</em>; no iPhone toque em <em>Compartilhar &rarr; Adicionar à Tela de Início</em>.</li>
      </ol>
    </div>
    <div class="footer">Secretaria Municipal de Educação • Acesso gratuito e protegido pela LGPD</div>
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 250); };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <QrCode size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                QR Code — App dos Pais
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Para os pais baixarem o Portal Família &amp; Escola direto no celular
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-dashed border-indigo-300 dark:border-indigo-800">
          <div
            className="p-3 bg-white rounded-2xl shadow-sm"
            dangerouslySetInnerHTML={{ __html: sanitizeSvgHtml(qrSvg) }}
          />
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
            <Smartphone size={13} />
            <span>Aponte a câmera para abrir e instalar</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <span className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 truncate flex-1 select-all">
            {portalUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white text-[11px] font-bold hover:bg-neutral-50 transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="py-2.5 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download size={14} />
            <span>Baixar PNG</span>
          </button>

          <button
            type="button"
            onClick={() => window.open(portalUrl, '_blank', 'noopener,noreferrer')}
            className="py-2.5 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <ExternalLink size={14} />
            <span>Abrir Portal</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handlePrintPoster}
          className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Printer size={15} />
          <span>Imprimir Cartaz / Folheto para Pais (A4)</span>
        </button>
      </div>
    </div>
  );
};
