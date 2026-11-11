import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CheckSquare, Loader2, Send, Square, UploadCloud, X } from 'lucide-react';
import {
  GazetteEditionType,
  OfficialGazetteAct,
  OfficialGazetteEdition,
} from '../../../types';
import {
  generateGazetteVerificationCode,
  generateNextEditionInfo,
} from '../../../lib/api/officialGazette';
import { showToast } from '../../../components/ui/Toast';

interface GazetteEditionModalProps {
  editionToEdit?: OfficialGazetteEdition | null;
  allEditions: OfficialGazetteEdition[];
  allActs: OfficialGazetteAct[];
  defaultSignerName?: string;
  onClose: () => void;
  onSave: (
    editionData: Partial<OfficialGazetteEdition>,
    actIdsToLink: string[],
    pdfFile?: File | null
  ) => Promise<void>;
}

export const GazetteEditionModal: React.FC<GazetteEditionModalProps> = ({
  editionToEdit,
  allEditions,
  allActs,
  defaultSignerName = '',
  onClose,
  onSave,
}) => {
  const currentYear = new Date().getFullYear();
  const nextInfo = useMemo(
    () => generateNextEditionInfo(allEditions, currentYear),
    [allEditions, currentYear]
  );

  const [editionNumber, setEditionNumber] = useState(
    editionToEdit?.edition_number || nextInfo.editionNumber
  );
  const [sequenceNumber, setSequenceNumber] = useState<number>(
    editionToEdit?.sequence_number || nextInfo.sequenceNumber
  );
  const [editionType, setEditionType] = useState<GazetteEditionType>(
    editionToEdit?.edition_type || 'Ordinária'
  );
  const [publicationDate, setPublicationDate] = useState(
    editionToEdit?.publication_date || new Date().toISOString().slice(0, 10)
  );
  const [title, setTitle] = useState(
    editionToEdit?.title || `Diário Oficial Eletrônico — Edição Nº ${nextInfo.editionNumber}`
  );
  const [summary, setSummary] = useState(editionToEdit?.summary || '');
  const [signedBy, setSignedBy] = useState(editionToEdit?.signed_by || defaultSignerName);
  const [signedRole, setSignedRole] = useState(
    editionToEdit?.signed_role || 'Secretaria Municipal de Administração / Imprensa Oficial'
  );
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [savingMode, setSavingMode] = useState<'draft' | 'published' | null>(null);

  // Atos disponíveis: já vinculados a esta edição OU na fila sem edição
  const candidateActs = useMemo(() => {
    return allActs.filter(
      (act) => !act.edition_id || (editionToEdit && act.edition_id === editionToEdit.id)
    );
  }, [allActs, editionToEdit]);

  const [selectedActIds, setSelectedActIds] = useState<string[]>(() => {
    if (editionToEdit) {
      return allActs.filter((a) => a.edition_id === editionToEdit.id).map((a) => a.id);
    }
    return allActs.filter((a) => !a.edition_id).map((a) => a.id);
  });

  const toggleAct = (id: string) => {
    setSelectedActIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async (targetStatus: 'draft' | 'published') => {
    if (!editionNumber.trim() || !title.trim()) {
      showToast('Preencha o número e o título da edição.', 'warning');
      return;
    }

    if (targetStatus === 'published' && selectedActIds.length === 0 && !pdfFile && !editionToEdit?.pdf_url) {
      showToast('Selecione ao menos 1 ato na fila ou anexe o PDF completo da edição antes de publicar.', 'warning');
      return;
    }

    setSavingMode(targetStatus);
    try {
      const year = Number(publicationDate.slice(0, 4)) || currentYear;
      await onSave(
        {
          ...(editionToEdit ? { id: editionToEdit.id } : {}),
          edition_number: editionNumber.trim(),
          sequence_number: Number(sequenceNumber) || 1,
          year,
          edition_type: editionType,
          publication_date: publicationDate,
          title: title.trim(),
          summary: summary.trim(),
          status: targetStatus,
          signed_by: signedBy.trim(),
          signed_role: signedRole.trim(),
          pdf_url: editionToEdit?.pdf_url,
          verification_code:
            editionToEdit?.verification_code ||
            generateGazetteVerificationCode(editionNumber.trim(), year),
          published_at:
            targetStatus === 'published'
              ? editionToEdit?.published_at || new Date().toISOString()
              : editionToEdit?.published_at,
        },
        selectedActIds,
        pdfFile
      );
    } finally {
      setSavingMode(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-neutral-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gazette-edition-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 id="gazette-edition-modal-title" className="text-base font-black">
                {editionToEdit ? `Editar Edição Nº ${editionToEdit.edition_number}` : 'Nova Edição do Diário Oficial'}
              </h3>
              <p className="text-xs text-neutral-500">
                Agrupe os atos oficiais do dia, gere o caderno diagramado A4 com código verificador ou anexe PDF assinado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Nº da Edição *
              </label>
              <input
                type="text"
                value={editionNumber}
                onChange={(e) => setEditionNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-black font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Sequencial
              </label>
              <input
                type="number"
                min={1}
                value={sequenceNumber}
                onChange={(e) => setSequenceNumber(Number(e.target.value) || 1)}
                className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Tipo de Edição
              </label>
              <select
                value={editionType}
                onChange={(e) => setEditionType(e.target.value as GazetteEditionType)}
                className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="Ordinária">Edição Ordinária</option>
                <option value="Extraordinária">Edição Extraordinária</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Data de Circulação *
              </label>
              <input
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Título / Cabeçalho da Edição *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Resumo da Edição (Opcional)
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ex: Decretos municipais, extratos de contratos e avisos de licitação"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Responsável pela Publicação / Assinatura
              </label>
              <input
                type="text"
                value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                placeholder="Nome do Prefeito(a) ou Secretário(a) Responsável"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Cargo / Órgão Publicador
              </label>
              <input
                type="text"
                value={signedRole}
                onChange={(e) => setSignedRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Seleção de Atos para compor a edição */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-500">
                Atos Incluídos nesta Edição ({selectedActIds.length} selecionados)
              </label>
              {candidateActs.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedActIds((prev) =>
                      prev.length === candidateActs.length ? [] : candidateActs.map((a) => a.id)
                    )
                  }
                  className="text-[11px] font-black text-emerald-600 hover:underline cursor-pointer"
                >
                  {selectedActIds.length === candidateActs.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              )}
            </div>

            {candidateActs.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 text-center">
                Nenhuma matéria na fila no momento. Você ainda pode publicar anexando o PDF completo abaixo ou cadastrar matérias antes de publicar.
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {candidateActs.map((act) => {
                  const checked = selectedActIds.includes(act.id);
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => toggleAct(act.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition flex items-start gap-2.5 cursor-pointer ${
                        checked
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                          : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <span className="mt-0.5 text-emerald-600 shrink-0">
                        {checked ? <CheckSquare size={16} /> : <Square size={16} className="text-neutral-400" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-[10px] font-black">
                            {act.category}
                          </span>
                          <span className="text-xs font-black truncate">{act.title}</span>
                        </div>
                        {act.department && (
                          <p className="text-[11px] text-neutral-500 mt-0.5">{act.department}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upload opcional de PDF assinado ICP-Brasil */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              PDF Completo da Edição (Opcional — ex.: arquivo assinado com certificado ICP-Brasil)
            </label>
            <label className="flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-emerald-400 cursor-pointer transition bg-neutral-50/70 dark:bg-neutral-950/60">
              <UploadCloud size={18} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 truncate">
                {pdfFile
                  ? pdfFile.name
                  : editionToEdit?.pdf_url
                  ? 'PDF da edição já anexado (clique para substituir)'
                  : 'Clique para anexar PDF assinado da edição (se não enviar, o caderno A4 automático é gerado pelos atos acima)'}
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={savingMode !== null}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-neutral-200 dark:bg-neutral-800 hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {savingMode === 'draft' ? 'Salvando...' : 'Salvar Rascunho'}
          </button>
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={savingMode !== null}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-black shadow-md cursor-pointer"
          >
            {savingMode === 'published' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>Publicar Edição no Diário Oficial</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

