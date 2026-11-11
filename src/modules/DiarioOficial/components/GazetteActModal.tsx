import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Loader2, Save, UploadCloud, X } from 'lucide-react';
import {
  GazetteActCategory,
  Institution,
  OfficialGazetteAct,
  OfficialGazetteEdition,
} from '../../../types';
import { GAZETTE_ACT_CATEGORIES } from '../../../lib/api/officialGazette';
import { useMunicipalDepartments } from '../../../lib/api/departments';
import { showToast } from '../../../components/ui/Toast';

interface GazetteActModalProps {
  actToEdit?: OfficialGazetteAct | null;
  editions: OfficialGazetteEdition[];
  institution?: Institution | null;
  defaultEditionId?: string | null;
  onClose: () => void;
  onSave: (actData: Partial<OfficialGazetteAct>, pdfFile?: File | null) => Promise<void>;
}

export const GazetteActModal: React.FC<GazetteActModalProps> = ({
  actToEdit,
  editions,
  institution,
  defaultEditionId = null,
  onClose,
  onSave,
}) => {
  const { departmentNames } = useMunicipalDepartments(institution?.id);
  const [category, setCategory] = useState<GazetteActCategory>(
    actToEdit?.category || 'Decreto'
  );
  const [actNumber, setActNumber] = useState(actToEdit?.act_number || '');
  const [department, setDepartment] = useState(actToEdit?.department || '');
  const [title, setTitle] = useState(actToEdit?.title || '');
  const [summary, setSummary] = useState(actToEdit?.summary || '');
  const [content, setContent] = useState(actToEdit?.content || '');
  const [editionId, setEditionId] = useState<string>(
    actToEdit?.edition_id || defaultEditionId || ''
  );
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Informe o título / assunto do ato oficial.', 'warning');
      return;
    }
    if (!content.trim() && !pdfFile && !actToEdit?.attachment_url) {
      showToast('Preencha o texto oficial do ato ou anexe um arquivo PDF.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const targetEdition = editions.find((ed) => ed.id === editionId);
      const nextStatus = targetEdition
        ? targetEdition.status === 'published'
          ? 'published'
          : 'queued'
        : 'queued';

      await onSave(
        {
          ...(actToEdit ? { id: actToEdit.id } : {}),
          category,
          act_number: actNumber.trim() || 'S/N',
          department: department.trim(),
          title: title.trim(),
          summary: summary.trim(),
          content: content.trim(),
          edition_id: editionId || null,
          attachment_url: actToEdit?.attachment_url,
          status: nextStatus,
        },
        pdfFile
      );
    } finally {
      setSaving(false);
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
        aria-labelledby="gazette-act-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 id="gazette-act-modal-title" className="text-base font-black">
                {actToEdit ? 'Editar Matéria / Ato Oficial' : 'Nova Matéria para o Diário Oficial'}
              </h3>
              <p className="text-xs text-neutral-500">
                Cadastre decretos, portarias, licitações, extratos ou avisos para compor a edição.
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

        <form id="gazette-act-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Categoria do Ato *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GazetteActCategory)}
                className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none focus:border-emerald-500"
              >
                {GAZETTE_ACT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Número / Identificador
              </label>
              <input
                type="text"
                value={actNumber}
                onChange={(e) => setActNumber(e.target.value)}
                placeholder="Ex: 042/2026 ou Pregão 012"
                className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Secretaria / Órgão Emissor
              </label>
              <input
                type="text"
                list="gazette-departments-list"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: Gabinete do Prefeito"
                className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
              <datalist id="gazette-departments-list">
                {departmentNames.map((dept) => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Título / Epígrafe do Ato *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Decreto nº 042/2026 — Ponto Facultativo Municipal"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                Vincular à Edição
              </label>
              <select
                value={editionId}
                onChange={(e) => setEditionId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="">Fila de Publicação (Aguardando Edição)</option>
                {editions.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    Edição Nº {ed.edition_number} ({ed.status === 'published' ? 'Publicada' : 'Rascunho'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Súmula / Ementa Resumida (Exibida no Sumário)
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ex: Dispõe sobre homologação de resultado final do Pregão Eletrônico nº 012/2026..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
              Conteúdo Oficial do Ato (Texto Completo para Diagramação A4)
            </label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cole ou digite aqui a íntegra do decreto, portaria, extrato de contrato ou aviso de licitação..."
              className="w-full px-4 py-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-serif leading-relaxed focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Anexo PDF Oficial (Opcional)
            </label>
            <label className="flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-emerald-400 cursor-pointer transition bg-neutral-50/70 dark:bg-neutral-950/60">
              <UploadCloud size={18} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 truncate">
                {pdfFile
                  ? pdfFile.name
                  : actToEdit?.attachment_url
                  ? 'PDF já anexado (clique para substituir)'
                  : 'Selecionar PDF deste ato / edital (opcional)'}
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="gazette-act-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-black shadow-md cursor-pointer"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{actToEdit ? 'Salvar Alterações' : 'Salvar Matéria Oficial'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

