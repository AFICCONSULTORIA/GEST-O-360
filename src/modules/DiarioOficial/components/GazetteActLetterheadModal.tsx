import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  ExternalLink,
  FileText,
  Palette,
  Printer,
  ShieldCheck,
  Stamp,
  X,
} from 'lucide-react';
import {
  Institution,
  OfficialGazetteAct,
  OfficialGazetteEdition,
} from '../../../types';
import { LogoCompass } from '../../../components/LogoCompass';
import { resolveSiteAccentHex, useInstitutionalSiteConfig } from '../../../lib/api/institutionalSite';
import { sanitizeGazetteHtml } from '../utils/sanitizeGazetteHtml';
import {
  extractCityFromInstitutionName,
  formatExtensoDatePtBr,
} from '../templates/gazetteTemplates';

interface GazetteActLetterheadModalProps {
  act: Partial<OfficialGazetteAct>;
  institution: Institution;
  edition?: OfficialGazetteEdition | null;
  onClose: () => void;
}

export const GazetteActLetterheadModal: React.FC<GazetteActLetterheadModalProps> = ({
  act,
  institution,
  edition,
  onClose,
}) => {
  const { config } = useInstitutionalSiteConfig(institution);
  const accentHex = resolveSiteAccentHex(config);

  const cityName = useMemo(
    () => extractCityFromInstitutionName(institution.name),
    [institution.name]
  );

  const [sphereLabel, setSphereLabel] = useState(
    institution.uf ? `ESTADO DE ${institution.uf.toUpperCase()} • PODER EXECUTIVO` : 'PODER EXECUTIVO MUNICIPAL'
  );
  const [showWatermark, setShowWatermark] = useState(true);
  const [useAccentColor, setUseAccentColor] = useState(false);
  const [showSignatureBlock, setShowSignatureBlock] = useState(true);
  const [signerName, setSignerName] = useState(config.mayorName || '');
  const [signerRole, setSignerRole] = useState(
    act.department?.trim() ? `Prefeito Municipal / ${act.department.trim()}` : 'Prefeito Municipal'
  );

  const sanitizedBodyHtml = useMemo(
    () => sanitizeGazetteHtml(act.content || ''),
    [act.content]
  );

  const actDateLabel = useMemo(() => {
    const raw = edition?.publication_date || act.created_at;
    if (!raw) return formatExtensoDatePtBr(new Date());
    const dt = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw);
    if (Number.isNaN(dt.getTime())) return formatExtensoDatePtBr(new Date());
    return formatExtensoDatePtBr(dt);
  }, [edition?.publication_date, act.created_at]);

  const letterheadStroke = useAccentColor ? accentHex : '#111827';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <style>{`
        #gazette-act-printable-sheet .gazette-rich-body p {
          margin-bottom: 0.75rem;
          text-align: justify;
          line-height: 1.68;
        }
        #gazette-act-printable-sheet .gazette-rich-body p:last-child {
          margin-bottom: 0;
        }
        #gazette-act-printable-sheet .gazette-rich-body ul,
        #gazette-act-printable-sheet .gazette-rich-body ol {
          margin: 0.65rem 0 0.9rem 1.4rem;
          text-align: justify;
          line-height: 1.65;
        }
        #gazette-act-printable-sheet .gazette-rich-body ul {
          list-style-type: disc;
        }
        #gazette-act-printable-sheet .gazette-rich-body ol {
          list-style-type: decimal;
        }
        #gazette-act-printable-sheet .gazette-rich-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.9rem 0;
          font-size: 12px;
        }
        #gazette-act-printable-sheet .gazette-rich-body td,
        #gazette-act-printable-sheet .gazette-rich-body th {
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          vertical-align: top;
          text-align: left;
        }
        #gazette-act-printable-sheet .gazette-rich-body th {
          background-color: #f3f4f6;
          font-weight: 700;
        }
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #gazette-act-printable-sheet,
          #gazette-act-printable-sheet * {
            visibility: visible !important;
          }
          #gazette-act-printable-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 268mm !important;
            margin: 0 !important;
            padding: 10mm 14mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
          }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gazette-letterhead-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden"
      >
        {/* Barra Superior de Ações */}
        <div className="px-5 py-3.5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                Documento Timbrado A4
              </span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold">
                {act.category || 'Ato Oficial'} {act.act_number ? `· Nº ${act.act_number}` : ''}
              </span>
            </div>
            <h3 id="gazette-letterhead-title" className="text-sm font-black truncate mt-0.5">
              {act.title || 'Pré-visualização com Timbre Oficial do Município'}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir / Salvar em PDF</span>
            </button>

            {act.attachment_url && (
              <a
                href={act.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black"
              >
                <Download size={14} />
                <span>Baixar Anexo PDF</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar pré-visualização timbrada"
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Ajustes Rápidos do Timbre (não impresso) */}
        <div className="px-5 py-3 bg-white/80 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-12 gap-2.5 text-xs shrink-0">
          <div className="md:col-span-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Esfera / Cabeçalho Superior
            </label>
            <input
              type="text"
              value={sphereLabel}
              onChange={(e) => setSphereLabel(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-bold text-xs"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Signatário (Opcional)
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Nome da autoridade"
              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-semibold text-xs"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Cargo / Secretaria
            </label>
            <input
              type="text"
              value={signerRole}
              onChange={(e) => setSignerRole(e.target.value)}
              placeholder="Cargo oficial"
              className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-semibold text-xs"
            />
          </div>

          <div className="md:col-span-3 flex flex-wrap items-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowWatermark((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer ${
                showWatermark
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-500 dark:bg-neutral-950 dark:border-neutral-800'
              }`}
              title="Exibir ou ocultar brasão como marca d'água no fundo da página"
            >
              <Stamp size={13} />
              <span>Marca d&apos;água</span>
            </button>

            <button
              type="button"
              onClick={() => setUseAccentColor((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer ${
                useAccentColor
                  ? 'bg-sky-50 border-sky-300 text-sky-700 dark:bg-sky-500/15 dark:border-sky-500/30 dark:text-sky-300'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-300'
              }`}
              title="Alternar entre timbre preto oficial e cor institucional"
            >
              <Palette size={13} />
              <span>{useAccentColor ? 'Cor Portal' : 'Clássico P&B'}</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={showSignatureBlock}
                onChange={(e) => setShowSignatureBlock(e.target.checked)}
                className="accent-emerald-600 cursor-pointer"
              />
              <span>Rodapé Assinatura</span>
            </label>
          </div>
        </div>

        {/* Folha A4 com Timbre Municipal */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1">
          <article
            id="gazette-act-printable-sheet"
            className="relative max-w-[210mm] min-h-[272mm] mx-auto bg-white text-neutral-900 border border-neutral-300 shadow-xl px-8 sm:px-14 py-10 flex flex-col justify-between overflow-hidden"
          >
            {/* Marca d'água central do Brasão */}
            {showWatermark && institution.logo_url && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
                <img
                  src={institution.logo_url}
                  alt=""
                  aria-hidden="true"
                  className="w-80 h-80 object-contain opacity-[0.055] select-none"
                />
              </div>
            )}

            <div className="relative z-10 space-y-6">
              {/* Cabeçalho Timbrado Oficial */}
              <header
                className="pb-4 border-b-[3px]"
                style={{ borderColor: letterheadStroke }}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-20 h-20 flex items-center justify-center">
                    {institution.logo_url ? (
                      <img
                        src={institution.logo_url}
                        alt={`Brasão ${institution.name}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <LogoCompass size={44} />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <p
                      className="text-[11px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: useAccentColor ? accentHex : '#374151' }}
                    >
                      {sphereLabel}
                    </p>
                    <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight font-serif text-neutral-950">
                      {institution.name}
                    </h1>
                    {act.department && (
                      <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                        {act.department}
                      </p>
                    )}
                  </div>

                  {(config.cnpj || institution.cnpj || config.address || config.phone || config.email) && (
                    <p className="text-[10px] text-neutral-500 pt-1">
                      {[
                        config.cnpj || institution.cnpj ? `CNPJ: ${config.cnpj || institution.cnpj}` : '',
                        config.address || '',
                        config.phone ? `Tel.: ${config.phone}` : '',
                        config.email || '',
                      ]
                        .filter(Boolean)
                        .join('  •  ')}
                    </p>
                  )}
                </div>
              </header>

              {/* Epígrafe + Categoria + Ementa Jurídica */}
              <section className="space-y-4 pt-1">
                <div className="text-center space-y-1">
                  <span className="inline-block px-2.5 py-0.5 border border-neutral-300 rounded text-[10px] font-black uppercase tracking-widest text-neutral-600">
                    {act.category || 'Ato Oficial'}
                    {act.act_number ? ` · Nº ${act.act_number}` : ''}
                  </span>

                  <h2 className="text-base sm:text-[17px] font-black uppercase font-serif tracking-tight text-neutral-950 leading-snug pt-1">
                    {act.title || 'TÍTULO DO ATO OFICIAL'}
                  </h2>
                </div>

                {act.summary && (
                  <div className="ml-auto max-w-[78%] sm:max-w-[66%] border-l-2 border-neutral-400 pl-3.5 py-1 text-[12px] italic font-serif text-neutral-700 text-justify leading-relaxed">
                    “{act.summary}”
                  </div>
                )}
              </section>

              {/* Texto Oficial do Ato */}
              <section className="pt-2 text-[13px] font-serif text-neutral-900">
                {sanitizedBodyHtml ? (
                  <div
                    className="gazette-rich-body"
                    dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
                  />
                ) : (
                  <p className="text-center text-xs text-neutral-400 italic py-10 border border-dashed border-neutral-300 rounded-xl">
                    O conteúdo textual deste ato está vazio ou consta exclusivamente no anexo PDF.
                  </p>
                )}

                {act.attachment_url && (
                  <div className="mt-5 p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-2 text-xs print:hidden">
                    <span className="inline-flex items-center gap-1.5 font-sans font-bold text-neutral-700">
                      <FileText size={14} className="text-emerald-600" />
                      Este ato também possui documento PDF anexado.
                    </span>
                    <a
                      href={act.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-sans font-black text-emerald-700 hover:underline"
                    >
                      Abrir Anexo <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </section>
            </div>

            {/* Bloco de Assinatura + Rodapé Timbrado */}
            <footer className="relative z-10 pt-10 space-y-6">
              {showSignatureBlock && (
                <div className="space-y-6">
                  <p className="text-[12px] font-serif text-right text-neutral-800">
                    {cityName}
                    {institution.uf ? ` - ${institution.uf.toUpperCase()}` : ''}, {actDateLabel}.
                  </p>

                  <div className="max-w-xs mx-auto text-center pt-4">
                    <div className="border-t border-neutral-900 pt-1.5">
                      <div className="text-xs font-black uppercase text-neutral-900">
                        {signerName.trim() || institution.name}
                      </div>
                      <div className="text-[11px] text-neutral-600">
                        {signerRole.trim() || 'Autoridade Competente'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="pt-3 border-t border-neutral-300 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500"
              >
                <span>
                  {institution.name} • Documento gerado em papel timbrado oficial
                </span>
                {edition ? (
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-neutral-800">
                    <ShieldCheck size={12} className="text-emerald-700" />
                    Edição Nº {edition.edition_number} • Código {edition.verification_code}
                  </span>
                ) : (
                  <span className="font-mono font-bold text-neutral-600">
                    Pronto para publicação no Diário Oficial
                  </span>
                )}
              </div>
            </footer>
          </article>
        </div>
      </div>
    </div>,
    document.body
  );
};
