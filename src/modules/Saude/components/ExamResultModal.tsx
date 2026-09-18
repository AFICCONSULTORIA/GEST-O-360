import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  XCircle, FileText, Upload, Trash2, Eye, Download, 
  CheckCircle2, Clock, Building2, User, Stethoscope, AlertCircle, FileCheck
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { ExamRequest, ExamStatus } from '../types';
import { parseExamResult, serializeExamResult } from '../utils/examTemplates';
import { openPdfInNewTab, downloadPdfFile, formatFileSize } from '../utils/pdfHelper';

interface ExamResultModalProps {
  req: ExamRequest;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExamResultModal: React.FC<ExamResultModalProps> = ({ req, onClose, onSuccess }) => {
  const existingResult = parseExamResult(req.result_notes);

  const [status, setStatus] = useState<ExamStatus>(req.status === 'Solicitado' ? 'Realizado' : req.status);
  const [performedDate, setPerformedDate] = useState<string>(
    req.performed_date || existingResult?.performed_date || new Date().toISOString().split('T')[0]
  );
  const [executingUnit, setExecutingUnit] = useState<string>(
    req.executing_unit || existingResult?.executing_unit || 'Laboratório Central Municipal'
  );
  const [professionalName, setProfessionalName] = useState<string>(
    existingResult?.professional_name || ''
  );
  const [professionalCouncil, setProfessionalCouncil] = useState<string>(
    existingResult?.professional_council || ''
  );
  const [conclusion, setConclusion] = useState<string>(
    existingResult?.conclusion || ''
  );

  // Estados do arquivo PDF
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(existingResult?.pdf_url);
  const [pdfName, setPdfName] = useState<string | undefined>(existingResult?.pdf_name);
  const [pdfSize, setPdfSize] = useState<number | undefined>(existingResult?.pdf_size);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processar arquivo selecionado ou arrastado
  const handleFileProcess = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Por favor, selecione apenas arquivos no formato PDF (.pdf).', 'error');
      return;
    }

    // Limite de 20MB
    if (file.size > 20 * 1024 * 1024) {
      showToast('O arquivo PDF não pode ultrapassar 20MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPdfUrl(dataUrl);
      setPdfName(file.name);
      setPdfSize(file.size);
      setStatus('Realizado');
      showToast(`Arquivo PDF "${file.name}" carregado com sucesso!`, 'success');
    };
    reader.onerror = () => {
      showToast('Falha ao ler o arquivo PDF selecionado.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePdf = () => {
    setPdfUrl(undefined);
    setPdfName(undefined);
    setPdfSize(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payloadData = {
        performed_date: performedDate,
        executing_unit: executingUnit.trim(),
        professional_name: professionalName.trim() || undefined,
        professional_council: professionalCouncil.trim() || undefined,
        conclusion: conclusion.trim() || undefined,
        pdf_url: pdfUrl,
        pdf_name: pdfName,
        pdf_size: pdfSize,
        recorded_at: new Date().toISOString()
      };

      const serialized = serializeExamResult(payloadData);

      const { error } = await supabase
        .from('exam_requests')
        .update({
          status,
          performed_date: status === 'Realizado' ? performedDate : (req.performed_date || null),
          executing_unit: executingUnit.trim() || null,
          result_notes: serialized
        })
        .eq('id', req.id);

      if (error) {
        console.warn('Erro ao atualizar no Supabase:', error);
      }

      showToast(
        pdfUrl 
          ? 'Laudo em PDF e dados do exame salvos com sucesso na ficha!' 
          : 'Controle do pedido de exame atualizado com sucesso!',
        'success'
      );
      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao salvar dados do exame: ' + (err.message || 'Tente novamente.'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
              <FileText size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-blue-100 px-2.5 py-0.5 rounded-full inline-block mb-1">
                Ficha do Exame · {req.category}
              </span>
              <h3 className="text-base font-black tracking-tight">{req.exam_name}</h3>
              <p className="text-xs text-blue-100/80">
                Paciente: <strong>{req.patient_name}</strong> · CPF: {req.patient_cpf}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <XCircle size={22} />
          </button>
        </div>

        {/* Formulário com rolagem */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 text-neutral-800 dark:text-neutral-200">
          
          {/* Seção 1: Status e Datas de Controle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-blue-600" /> Situação / Status do Pedido *
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ExamStatus)}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Solicitado">Solicitado (Aguardando)</option>
                <option value="Agendado">Agendado</option>
                <option value="Realizado">Realizado (Laudo Anexado)</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Clock size={14} className="text-blue-600" /> Data de Realização
              </label>
              <input 
                type="date"
                value={performedDate}
                onChange={e => setPerformedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-600" /> Unidade / Laboratório Executor
              </label>
              <input 
                type="text"
                value={executingUnit}
                onChange={e => setExecutingUnit(e.target.value)}
                placeholder="Ex: Laboratório Central Municipal, Policlínica de Especialidades..."
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Seção 2: ANEXO DO EXAME EM PDF (PRINCIPAL REQUISITO) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <FileText size={15} className="text-rose-600" /> Exame do Paciente em PDF (Laudo Digitalizado)
              </label>
              <span className="text-[11px] text-neutral-400">Armazenado na ficha para controles futuros</span>
            </div>

            {/* Se já existe PDF anexado */}
            {pdfUrl ? (
              <div className="p-4 bg-rose-50/70 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <FileCheck size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block">
                      Documento PDF Anexado
                    </span>
                    <h4 className="font-black text-sm text-neutral-900 dark:text-white truncate max-w-[280px]">
                      {pdfName || `${req.exam_name}.pdf`}
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                      {formatFileSize(pdfSize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => openPdfInNewTab(pdfUrl, pdfName)}
                    className="px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-blue-600 dark:text-blue-400 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Visualizar documento em tela inteira"
                  >
                    <Eye size={13} /> Ver PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadPdfFile(pdfUrl, pdfName)}
                    className="px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Baixar arquivo no computador"
                  >
                    <Download size={13} /> Baixar
                  </button>

                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                    title="Remover ou substituir PDF"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ) : (
              /* Dropzone para selecionar ou soltar arquivo PDF */
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 scale-[1.01]' 
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-500 bg-neutral-50/50 dark:bg-neutral-800/30'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileInputChange} 
                  accept=".pdf,application/pdf" 
                  className="hidden" 
                />

                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
                  <Upload size={22} />
                </div>

                <p className="text-xs font-black text-neutral-800 dark:text-neutral-200">
                  Clique para selecionar o PDF ou arraste o arquivo aqui
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Formatos aceitos: Documento PDF escaneado ou laudo digital do laboratório (até 20MB)
                </p>
              </div>
            )}
          </div>

          {/* Seção 3: Responsável Técnico (Opcional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <User size={13} className="text-neutral-500" /> Médico / Biomédico Responsável
              </label>
              <input 
                type="text"
                value={professionalName}
                onChange={e => setProfessionalName(e.target.value)}
                placeholder="Ex: Dr. Roberto Guimarães"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Stethoscope size={13} className="text-neutral-500" /> Registro Profissional
              </label>
              <input 
                type="text"
                value={professionalCouncil}
                onChange={e => setProfessionalCouncil(e.target.value)}
                placeholder="Ex: CRM 12345/SP, CRBM 5678"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Seção 4: Parecer / Observações do Laudo */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
              <span>Observações / Parecer do Laudo (Opcional)</span>
              <span className="text-[11px] text-neutral-400 font-normal">Para consulta rápida sem abrir o PDF</span>
            </label>
            <textarea 
              value={conclusion}
              onChange={e => setConclusion(e.target.value)}
              rows={2}
              placeholder="Ex: Exame dentro dos padrões de normalidade. Ausência de alterações significativas."
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-blue-600" />
            <span>
              Ao salvar, o arquivo PDF ficará permanentemente disponível na ficha do paciente e na central de controle de exames para consultas da equipe médica.
            </span>
          </div>

          {/* Rodapé de Ações */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              {isSubmitting ? 'Salvando...' : 'Salvar Exame na Ficha'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
