import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Institution, OfficialGazetteAct, OfficialGazetteEdition } from '../../../types';
import { LogoCompass } from '../../../components/LogoCompass';
import { sanitizeGazetteHtml } from '../utils/sanitizeGazetteHtml';

interface OfficialGazetteReaderModalProps {
  edition: OfficialGazetteEdition;
  acts: OfficialGazetteAct[];
  institution: Institution;
  onClose: () => void;
}

const formatLongDate = (isoDate?: string) => {
  if (!isoDate) return '';
  const dt = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const OfficialGazetteReaderModal: React.FC<OfficialGazetteReaderModalProps> = ({
  edition,
  acts,
  institution,
  onClose,
}) => {
  const [viewTab, setViewTab] = useState<'caderno' | 'pdf'>(
    acts.length === 0 && edition.pdf_url ? 'pdf' : 'caderno'
  );
  const [copiedCode, setCopiedCode] = useState(false);

  const groupedActs = useMemo(() => {
    const map = new Map<string, OfficialGazetteAct[]>();
    acts.forEach((act) => {
      const group = act.department?.trim() || 'Atos do Poder Executivo Municipal';
      const list = map.get(group) || [];
      list.push(act);
      map.set(group, list);
    });
    return Array.from(map.entries());
  }, [acts]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(edition.verification_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #gazette-printable-sheet, #gazette-printable-sheet * { visibility: visible !important; }
          #gazette-printable-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #111827 !important;
          }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gazette-reader-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden"
      >
        {/* Barra Superior de Ações */}
        <div className="px-5 py-3.5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                Edição {edition.edition_type} Nº {edition.edition_number}
              </span>
              <span className="text-xs font-mono font-bold text-neutral-500">
                Código: {edition.verification_code}
              </span>
            </div>
            <h3 id="gazette-reader-title" className="text-sm font-black truncate mt-0.5">
              {edition.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {edition.pdf_url && (
              <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewTab('caderno')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${viewTab === 'caderno'
                      ? 'bg-white dark:bg-neutral-900 shadow-xs text-neutral-900 dark:text-white'
                      : 'text-neutral-500'
                    }`}
                >
                  Caderno A4
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('pdf')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${viewTab === 'pdf'
                      ? 'bg-white dark:bg-neutral-900 shadow-xs text-neutral-900 dark:text-white'
                      : 'text-neutral-500'
                    }`}
                >
                  PDF Assinado
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-bold cursor-pointer"
            >
              {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedCode ? 'Código Copiado' : 'Copiar Autenticidade'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir / Salvar PDF</span>
            </button>

            {edition.pdf_url && (
              <a
                href={edition.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                download={`Diario_Oficial_${edition.edition_number.replace(/\W+/g, '_')}.pdf`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-black"
              >
                <Download size={14} />
                <span>Baixar PDF</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar leitor do Diário Oficial"
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo da Visualização */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1">
          {viewTab === 'pdf' && edition.pdf_url ? (
            <div className="w-full h-[72vh] rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white">
              <iframe
                title={`PDF Edição ${edition.edition_number}`}
                src={edition.pdf_url}
                className="w-full h-full"
              />
            </div>
          ) : (
            <article
              id="gazette-printable-sheet"
              className="max-w-4xl mx-auto bg-white text-neutral-900 rounded-2xl border border-neutral-300 shadow-lg p-6 sm:p-12 space-y-8"
            >
              {/* Cabeçalho Oficial de Jornal Oficial A4 */}
              <header className="border-b-4 border-neutral-900 pb-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl border border-neutral-200 p-1.5 flex items-center justify-center bg-white shrink-0">
                      {institution.logo_url ? (
                        <img
                          src={institution.logo_url}
                          alt={`Brasão ${institution.name}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <LogoCompass size={34} />
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                        {institution.name}
                      </p>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase font-serif">
                        Diário Oficial Eletrônico do Município
                      </h1>
                    </div>
                  </div>

                  <div className="text-center sm:text-right border border-neutral-300 rounded-xl px-4 py-2 bg-neutral-50 shrink-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      Edição {edition.edition_type}
                    </div>
                    <div className="text-lg font-black font-mono">Nº {edition.edition_number}</div>
                    <div className="text-[10px] font-semibold text-neutral-500 capitalize">
                      {formatLongDate(edition.publication_date)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-200 text-[11px] font-semibold text-neutral-600">
                  <span>Instituído conforme Princípio da Publicidade (Art. 37, CF/88) e LAI nº 12.527/2011</span>
                  <span className="font-mono font-bold text-neutral-800">
                    Autenticidade: {edition.verification_code}
                  </span>
                </div>
              </header>

              {edition.summary && (
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 leading-relaxed">
                  <strong className="uppercase tracking-wider text-[10px] block mb-1 text-neutral-500">
                    Resumo da Edição
                  </strong>
                  {edition.summary}
                </div>
              )}

              {/* Sumário Automático */}
              {acts.length > 0 && (
                <section className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2">
                  <h2 className="text-xs font-black uppercase tracking-widest text-neutral-700">
                    Sumário dos Atos Publicados ({acts.length})
                  </h2>
                  <ul className="space-y-1 text-xs text-neutral-700">
                    {acts.map((act, idx) => (
                      <li key={act.id} className="flex items-baseline justify-between gap-3 border-b border-dotted border-neutral-300 pb-1">
                        <span>
                          <strong className="font-black">{idx + 1}. [{act.category}]</strong> {act.title}
                        </span>
                        <span className="text-[11px] text-neutral-500 shrink-0">
                          {act.department || 'Executivo'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Matérias Agrupadas por Secretaria */}
              {groupedActs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-neutral-300 rounded-xl text-xs text-neutral-500">
                  {edition.pdf_url
                    ? 'Os atos desta edição constam integralmente no documento PDF assinado anexo.'
                    : 'Esta edição ainda não possui matérias textuais diagramadas.'}
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedActs.map(([deptName, deptActs]) => (
                    <section key={deptName} className="space-y-5">
                      <div className="px-4 py-2 bg-neutral-900 text-white text-xs font-black uppercase tracking-widest rounded-lg">
                        {deptName}
                      </div>

                      <div className="space-y-6">
                        {deptActs.map((act) => (
                          <div
                            key={act.id}
                            className="pb-6 border-b border-neutral-200 last:border-b-0 space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="px-2.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-[10px] font-black uppercase tracking-wider">
                                {act.category} {act.act_number ? `· Nº ${act.act_number}` : ''}
                              </span>
                              {act.attachment_url && (
                                <a
                                  href={act.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                                >
                                  <FileText size={12} />
                                  <span>Anexo PDF</span>
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>

                            <h3 className="text-base font-black font-serif leading-snug">
                              {act.title}
                            </h3>

                            {act.summary && (
                              <p className="text-xs italic text-neutral-600 border-l-2 border-neutral-300 pl-3">
                                {act.summary}
                              </p>
                            )}

                            {act.content && (
                              <div
                                className="text-xs sm:text-[13px] font-serif text-neutral-800 leading-relaxed text-justify [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_td]:border [&_td]:border-neutral-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-neutral-300 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-neutral-100"
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeGazetteHtml(act.content),
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {/* Rodapé com Validação e Assinatura */}
              <footer className="pt-6 border-t-2 border-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] text-neutral-600">
                <div className="space-y-0.5">
                  <div className="font-black text-neutral-900 uppercase">
                    {edition.signed_by || institution.name}
                  </div>
                  <div>{edition.signed_role || 'Publicação Oficial Eletrônica'}</div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-800">
                  <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                  <div>
                    <div className="text-[10px] font-black uppercase">Código Verificador</div>
                    <div className="font-mono font-black text-xs">{edition.verification_code}</div>
                  </div>
                </div>
              </footer>
            </article>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

