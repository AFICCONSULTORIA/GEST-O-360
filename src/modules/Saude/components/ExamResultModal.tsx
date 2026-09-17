import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, XCircle, Plus, Trash2, Activity, FileText, 
  Building2, User, Sparkles, AlertCircle, RefreshCw, Check
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/ui/Toast';
import { ExamRequest, ExamParameterResult, ParameterStatus, generateUUID } from '../types';
import { 
  getTemplateForExam, evaluateParameterStatus, 
  parseExamResult, serializeExamResult 
} from '../utils/examTemplates';

interface ExamResultModalProps {
  req: ExamRequest;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExamResultModal: React.FC<ExamResultModalProps> = ({ req, onClose, onSuccess }) => {
  const existingResult = parseExamResult(req.result_notes);

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
  const [notes, setNotes] = useState<string>(
    existingResult?.notes || ''
  );

  // Parâmetros laboratoriais estruturados
  const [parameters, setParameters] = useState<ExamParameterResult[]>(() => {
    if (existingResult && existingResult.parameters && existingResult.parameters.length > 0) {
      return existingResult.parameters;
    }
    // Carregar template pré-configurado para o exame
    return getTemplateForExam(req.exam_name);
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manipular alteração de valor de um parâmetro
  const handleValueChange = (id: string, newValue: string) => {
    setParameters(prev => prev.map(p => {
      if (p.id === id) {
        const autoStatus = evaluateParameterStatus(newValue, p.min_ref, p.max_ref);
        return { ...p, value: newValue, status: autoStatus };
      }
      return p;
    }));
  };

  // Alterar status manualmente se necessário
  const handleStatusToggle = (id: string, status: ParameterStatus) => {
    setParameters(prev => prev.map(p => (p.id === id ? { ...p, status } : p)));
  };

  // Adicionar novo parâmetro livre
  const handleAddParameter = () => {
    const newParam: ExamParameterResult = {
      id: generateUUID(),
      name: '',
      value: '',
      unit: '',
      reference_range: '',
      status: 'normal'
    };
    setParameters(prev => [...prev, newParam]);
  };

  // Remover parâmetro
  const handleRemoveParameter = (id: string) => {
    setParameters(prev => prev.filter(p => p.id !== id));
  };

  // Restaurar template padrão
  const handleResetTemplate = () => {
    if (window.confirm('Deseja recarregar o modelo padrão de parâmetros para este exame?')) {
      setParameters(getTemplateForExam(req.exam_name));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!performedDate) {
      showToast('Informe a data de realização do exame.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadData = {
        performed_date: performedDate,
        executing_unit: executingUnit,
        professional_name: professionalName,
        professional_council: professionalCouncil,
        conclusion: conclusion || 'Laudo concluído e liberado para o prontuário do munícipe.',
        parameters,
        notes,
        recorded_at: new Date().toISOString()
      };

      const serialized = serializeExamResult(payloadData);

      const { error } = await supabase
        .from('exam_requests')
        .update({
          performed_date: performedDate,
          executing_unit: executingUnit,
          result_notes: serialized,
          status: 'Realizado'
        })
        .eq('id', req.id);

      if (error) throw error;

      showToast('Resultado e laudo registrados com sucesso!', 'success');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao salvar resultado: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                  {req.category}
                </span>
                <span className="text-xs text-neutral-400 font-mono">ID: {req.id.substring(0, 8)}</span>
              </div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white mt-0.5">{req.exam_name}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Paciente: <strong className="text-neutral-700 dark:text-neutral-300">{req.patient_name}</strong> · CPF: {req.patient_cpf}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-xl">
            <XCircle size={22} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Dados Gerais de Execução */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Data de Realização *</label>
              <input 
                type="date" required
                value={performedDate}
                onChange={e => setPerformedDate(e.target.value)}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Unidade / Laboratório Executor *</label>
              <input 
                type="text" required
                value={executingUnit}
                onChange={e => setExecutingUnit(e.target.value)}
                placeholder="Ex: Laboratório Central Municipal"
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Responsável Técnico / Conselho</label>
              <div className="flex gap-1.5">
                <input 
                  type="text"
                  value={professionalName}
                  onChange={e => setProfessionalName(e.target.value)}
                  placeholder="Nome (Dr./Bioq.)"
                  className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-2 rounded-xl text-xs outline-none dark:text-white"
                />
                <input 
                  type="text"
                  value={professionalCouncil}
                  onChange={e => setProfessionalCouncil(e.target.value)}
                  placeholder="CRM/CRBM"
                  className="w-24 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-2 py-2 rounded-xl text-xs outline-none dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Parâmetros Medidos */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-emerald-600" />
                  Parâmetros e Valores Medidos ({parameters.length})
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Insira os valores obtidos na análise laboratorial para comparação clínica automática.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  title="Restaurar padrão"
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={12} /> Modelo Padrão
                </button>
                <button
                  type="button"
                  onClick={handleAddParameter}
                  className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors border border-emerald-200 dark:border-emerald-500/20"
                >
                  <Plus size={13} /> Adicionar Parâmetro
                </button>
              </div>
            </div>

            {parameters.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500">Nenhum parâmetro adicionado. Você pode preencher apenas o Laudo Conclusivo ou adicionar parâmetros.</p>
                <button
                  type="button"
                  onClick={handleAddParameter}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  + Adicionar Primeiro Parâmetro
                </button>
              </div>
            ) : (
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-700 text-[10px] font-black uppercase tracking-wider text-neutral-500">
                      <th className="p-3">Parâmetro</th>
                      <th className="p-3 w-36">Valor Encontrado</th>
                      <th className="p-3 w-24">Unidade</th>
                      <th className="p-3">Referência</th>
                      <th className="p-3 w-28 text-center">Status</th>
                      <th className="p-3 w-10 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {parameters.map(param => (
                      <tr key={param.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                        {/* Nome do Parâmetro */}
                        <td className="p-2.5">
                          <input 
                            type="text"
                            value={param.name}
                            onChange={e => {
                              const val = e.target.value;
                              setParameters(prev => prev.map(p => p.id === param.id ? { ...p, name: val } : p));
                            }}
                            placeholder="Nome do Parâmetro"
                            className="w-full bg-transparent font-bold text-neutral-900 dark:text-white outline-none border-b border-transparent focus:border-emerald-500 text-xs"
                          />
                        </td>

                        {/* Valor Encontrado */}
                        <td className="p-2.5">
                          <input 
                            type="text"
                            value={param.value}
                            onChange={e => handleValueChange(param.id, e.target.value)}
                            placeholder="Ex: 92 ou Normal"
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 rounded-xl font-bold text-xs text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </td>

                        {/* Unidade */}
                        <td className="p-2.5">
                          <input 
                            type="text"
                            value={param.unit || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setParameters(prev => prev.map(p => p.id === param.id ? { ...p, unit: val } : p));
                            }}
                            placeholder="mg/dL"
                            className="w-full bg-transparent text-neutral-500 font-mono outline-none text-xs"
                          />
                        </td>

                        {/* Faixa de Referência */}
                        <td className="p-2.5">
                          <input 
                            type="text"
                            value={param.reference_range || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setParameters(prev => prev.map(p => p.id === param.id ? { ...p, reference_range: val } : p));
                            }}
                            placeholder="Ex: 70 a 99 mg/dL"
                            className="w-full bg-transparent text-neutral-400 text-xs outline-none"
                          />
                        </td>

                        {/* Status (Badge / Selector) */}
                        <td className="p-2.5 text-center">
                          <select
                            value={param.status}
                            onChange={e => handleStatusToggle(param.id, e.target.value as ParameterStatus)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider outline-none border cursor-pointer ${
                              param.status === 'normal' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' 
                                : param.status === 'alto' 
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
                                : param.status === 'baixo'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                            }`}
                          >
                            <option value="normal">Normal</option>
                            <option value="alto">Alto ↑</option>
                            <option value="baixo">Baixo ↓</option>
                            <option value="alterado">Alterado</option>
                          </select>
                        </td>

                        {/* Botão Remover */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveParameter(param.id)}
                            className="text-neutral-400 hover:text-rose-600 p-1 transition-colors"
                            title="Remover parâmetro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Conclusão Geral e Observações */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Laudo Conclusivo / Parecer Diagnóstico Geral
              </label>
              <textarea 
                rows={3}
                value={conclusion}
                onChange={e => setConclusion(e.target.value)}
                placeholder="Descreva a conclusão médica ou resumo do laudo (ex: Exame sem alterações significativas; glicemia de jejum mantida dentro da faixa terapêutica...)"
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Observações Técnicas / Recomendações
              </label>
              <input 
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Coleta realizada sem intercorrências. Repetição sugerida em 6 meses."
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-2.5 rounded-xl text-xs outline-none dark:text-white"
              />
            </div>
          </div>

          {/* Rodapé e Botões */}
          <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              {isSubmitting ? 'Salvando Laudo...' : 'Confirmar e Publicar Resultado'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
