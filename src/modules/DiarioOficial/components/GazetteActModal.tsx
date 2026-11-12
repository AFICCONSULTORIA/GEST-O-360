import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  Bold,
  CheckCircle2,
  FileText,
  Italic,
  List,
  Loader2,
  Printer,
  Save,
  Sparkles,
  Table2,
  Underline,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  GazetteActCategory,
  Institution,
  OfficialGazetteAct,
  OfficialGazetteEdition,
} from '../../../types';
import { GAZETTE_ACT_CATEGORIES } from '../../../lib/api/officialGazette';
import { useMunicipalDepartments } from '../../../lib/api/departments';
import { useInstitutionalSiteConfig } from '../../../lib/api/institutionalSite';
import { showToast } from '../../../components/ui/Toast';
import {
  GAZETTE_PUBLICATION_TEMPLATES,
  extractCityFromInstitutionName,
  formatExtensoDatePtBr,
} from '../templates/gazetteTemplates';
import { plainTextToRichHtml, sanitizeGazetteHtml } from '../utils/sanitizeGazetteHtml';
import { GazetteActLetterheadModal } from './GazetteActLetterheadModal';

interface GazetteActModalProps {
  actToEdit?: OfficialGazetteAct | null;
  editions: OfficialGazetteEdition[];
  institution?: Institution | null;
  defaultEditionId?: string | null;
  initialTemplateId?: string | null;
  onClose: () => void;
  onSave: (actData: Partial<OfficialGazetteAct>, pdfFile?: File | null) => Promise<void>;
}

export const GazetteActModal: React.FC<GazetteActModalProps> = ({
  actToEdit,
  editions,
  institution,
  defaultEditionId = null,
  initialTemplateId = null,
  onClose,
  onSave,
}) => {
  const { departmentNames } = useMunicipalDepartments(institution?.id);
  const { config } = useInstitutionalSiteConfig(institution);

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
  const [inputMode, setInputMode] = useState<'editor' | 'pdf'>(
    actToEdit?.attachment_url && !actToEdit?.content ? 'pdf' : 'editor'
  );
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLetterheadPreview, setShowLetterheadPreview] = useState(false);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  const resolvedInstitution: Institution = useMemo(
    () =>
      institution || {
        id: 'default',
        name: 'Prefeitura Municipal',
      },
    [institution]
  );

  const setEditorHtml = (rawContent: string) => {
    const safeHtml = rawContent ? plainTextToRichHtml(rawContent) : '';
    if (editorRef.current) {
      editorRef.current.innerHTML = safeHtml;
    }
    setContent(safeHtml);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = GAZETTE_PUBLICATION_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;

    const now = new Date();
    const draft = tpl.build({
      institutionName: resolvedInstitution.name,
      cityName: extractCityFromInstitutionName(resolvedInstitution.name),
      cnpj: config.cnpj || resolvedInstitution.cnpj,
      mayorName: config.mayorName,
      dateExtenso: formatExtensoDatePtBr(now),
      year: now.getFullYear(),
    });

    setCategory(draft.category);
    setActNumber(draft.actNumber);
    setDepartment(draft.department);
    setTitle(draft.title);
    setSummary(draft.summary);
    setInputMode('editor');
    setEditorHtml(draft.content);
    showToast(`Modelo "${tpl.label}" aplicado com timbre de ${resolvedInstitution.name}.`, 'success');
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (initialTemplateId && !actToEdit) {
      applyTemplate(initialTemplateId);
      return;
    }

    if (editorRef.current && actToEdit?.content) {
      editorRef.current.innerHTML = plainTextToRichHtml(actToEdit.content);
    }
  }, [initialTemplateId, actToEdit]);

  const execFormat = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setContent(sanitizeGazetteHtml(editorRef.current.innerHTML));
  };

  const insertContractTable = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const tableHtml = `
      <table>
        <tbody>
          <tr><td><strong>Objeto</strong></td><td>Descreva o objeto</td></tr>
          <tr><td><strong>Contratado / Partes</strong></td><td>Razão Social — CNPJ</td></tr>
          <tr><td><strong>Valor / Vigência</strong></td><td>R$ 0,00 · Vigência até 31/12/${new Date().getFullYear()}</td></tr>
        </tbody>
      </table><p><br /></p>`;
    document.execCommand('insertHTML', false, tableHtml);
    setContent(sanitizeGazetteHtml(editorRef.current.innerHTML));
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    setContent(editorRef.current.innerHTML);
  };

  const targetEdition = useMemo(
    () => editions.find((ed) => ed.id === editionId) || null,
    [editions, editionId]
  );

  const hasContentReady = Boolean(title.trim() && (content.replace(/<[^>]+>/g, '').trim() || pdfFile || actToEdit?.attachment_url));
  const stepStatus = {
    content: hasContentReady,
    dateOrEdition: Boolean(editionId || hasContentReady),
    queued: Boolean(actToEdit || hasContentReady),
    published: targetEdition?.status === 'published',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Informe o título / epígrafe do ato oficial.', 'warning');
      return;
    }

    const sanitizedFinal = editorRef.current
      ? sanitizeGazetteHtml(editorRef.current.innerHTML)
      : sanitizeGazetteHtml(content);

    const hasPlainText = sanitizedFinal.replace(/<[^>]+>/g, '').trim().length > 0;
    if (!hasPlainText && !pdfFile && !actToEdit?.attachment_url) {
      showToast('Preencha o texto oficial do ato ou anexe um arquivo PDF.', 'warning');
      return;
    }

    setSaving(true);
    try {
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
          content: sanitizedFinal.trim(),
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

  const previewDraftAct: Partial<OfficialGazetteAct> = {
    ...(actToEdit || {}),
    category,
    act_number: actNumber.trim() || 'S/N',
    department: department.trim(),
    title: title.trim() || 'MINUTA DE PUBLICAÇÃO OFICIAL',
    summary: summary.trim(),
    content: editorRef.current ? sanitizeGazetteHtml(editorRef.current.innerHTML) : content,
    attachment_url: actToEdit?.attachment_url,
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] bg-neutral-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gazette-act-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <h3 id="gazette-act-modal-title" className="text-base font-black">
                  {actToEdit ? 'Editar Publicação / Ato Oficial' : 'Nova Publicação para o Diário Oficial'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Use um modelo padrão com timbre municipal, edite o texto e salve em PDF ou envie à fila do Diário.
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
            {/* Progresso e Situação da Publicação (inspirado no fluxo publicador) */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950/80 border border-neutral-200/80 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500">
                Fluxo da Publicação
              </span>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
                <span className={`inline-flex items-center gap-1 ${stepStatus.content ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}>
                  <CheckCircle2 size={13} /> 1. Conteúdo
                </span>
                <span className="text-neutral-300">→</span>
                <span className={`inline-flex items-center gap-1 ${stepStatus.dateOrEdition ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}>
                  <CheckCircle2 size={13} /> 2. Data / Edição
                </span>
                <span className="text-neutral-300">→</span>
                <span className={`inline-flex items-center gap-1 ${stepStatus.queued ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}>
                  <CheckCircle2 size={13} /> 3. Na Fila
                </span>
                <span className="text-neutral-300">→</span>
                <span className={`inline-flex items-center gap-1 ${stepStatus.published ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}>
                  <CheckCircle2 size={13} /> 4. Online
                </span>
              </div>
            </div>

            {/* Modelos Padrão em 1 Clique */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  <Sparkles size={13} />
                  <span>Modelos Padrão com Timbre de {extractCityFromInstitutionName(resolvedInstitution.name)}</span>
                </span>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-semibold">
                  Clique para preencher a estrutura oficial automaticamente
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GAZETTE_PUBLICATION_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-[11px] font-bold text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
                    title={tpl.description}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Metadados do Ato */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                  Tipo / Categoria do Ato *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GazetteActCategory)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none focus:border-emerald-500"
                >
                  {GAZETTE_ACT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'Licitação & Edital' ? 'Atos de Contratação (Licitação & Edital)' : cat}
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
                  Título / Epígrafe da Publicação *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: DECRETO Nº 083/2026, DE 11 DE NOVEMBRO DE 2026"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                  Vincular à Edição do Diário
                </label>
                <select
                  value={editionId}
                  onChange={(e) => setEditionId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Enviar para a Fila (Pronta p/ Próxima Edição)</option>
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
                Ementa / Súmula (Exibida em destaque no Timbre e no Sumário)
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ex: Dispõe sobre homologação de resultado final do Pregão Eletrônico nº 012/2026..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Alternador: Editor de Texto Timbrado vs Envio de PDF */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInputMode('editor')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                      inputMode === 'editor'
                        ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'text-neutral-500'
                    }`}
                  >
                    <FileText size={13} />
                    <span>Editor de Texto com Timbre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('pdf')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                      inputMode === 'pdf'
                        ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'text-neutral-500'
                    }`}
                  >
                    <UploadCloud size={13} />
                    <span>Enviar Arquivo PDF</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLetterheadPreview(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 hover:bg-sky-100 text-xs font-black cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Pré-visualizar com Timbre / Salvar PDF</span>
                </button>
              </div>

              {inputMode === 'editor' ? (
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50 dark:bg-neutral-950">
                  {/* Barra de Formatação */}
                  <div className="px-3 py-2 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => execFormat('bold')}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="Negrito"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => execFormat('italic')}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="Itálico"
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => execFormat('underline')}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="Sublinhado"
                    >
                      <Underline size={14} />
                    </button>

                    <span className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

                    <button
                      type="button"
                      onClick={() => execFormat('justifyLeft')}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="Alinhar à esquerda"
                    >
                      <AlignLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => execFormat('justifyCenter')}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="Centralizar"
                    >
                      <AlignCenter size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => execFormat('justifyFull')}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="Justificar texto"
                    >
                      <AlignJustify size={14} />
                    </button>

                    <span className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

                    <button
                      type="button"
                      onClick={() => execFormat('insertUnorderedList')}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="Lista com marcadores"
                    >
                      <List size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={insertContractTable}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-bold cursor-pointer"
                      title="Inserir tabela estruturada para extratos e licitações"
                    >
                      <Table2 size={13} />
                      <span>Inserir Tabela</span>
                    </button>
                  </div>

                  {/* Área Editável */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    data-placeholder="Escolha um modelo padrão acima ou digite aqui o texto oficial da publicação..."
                    className="min-h-[220px] max-h-[340px] overflow-y-auto px-5 py-4 text-[13px] font-serif leading-relaxed text-neutral-900 dark:text-neutral-100 focus:outline-none [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_td]:border [&_td]:border-neutral-300 dark:[&_td]:border-neutral-700 [&_td]:px-2.5 [&_td]:py-1.5"
                  />
                </div>
              ) : (
                <div>
                  <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-emerald-400 cursor-pointer transition bg-neutral-50/70 dark:bg-neutral-950/60">
                    <UploadCloud size={24} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200 text-center">
                      {pdfFile
                        ? pdfFile.name
                        : actToEdit?.attachment_url
                        ? 'PDF já anexado (clique para substituir)'
                        : 'Clique para enviar o PDF oficial desta publicação'}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Aceita arquivos PDF assinados ou gerados no editor timbrado
                    </span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => setShowLetterheadPreview(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-emerald-400 text-xs font-black cursor-pointer"
            >
              <Printer size={14} className="text-emerald-600" />
              <span>Gerar PDF Timbrado A4</span>
            </button>

            <div className="flex items-center gap-2.5">
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
                <span>{actToEdit ? 'Salvar Alterações' : 'Enviar p/ Fila / Publicar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showLetterheadPreview && (
        <GazetteActLetterheadModal
          act={previewDraftAct}
          institution={resolvedInstitution}
          edition={targetEdition}
          onClose={() => setShowLetterheadPreview(false)}
        />
      )}
    </>,
    document.body
  );
};
