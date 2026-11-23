import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileWarning,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getEnrollments, getStudentReportCardData } from '../../../lib/api/education';
import { showToast } from '../../../components/ui/Toast';

interface EducationBuscaAtivaPanelProps {
  institutionId?: string;
  municipalityName?: string;
}

interface BuscaAtivaItem {
  student_id: string;
  student_name: string;
  class_name: string;
  school_name: string;
  attendance_rate: number;
  total_absences: number;
  min_legal_rate: number;
  risk_level: 'critico' | 'alerta';
  status: 'aberto' | 'contato_familia' | 'conselho_tutelar' | 'resolvido';
  contact_notes: string;
  case_id?: string;
}

export const EducationBuscaAtivaPanel: React.FC<EducationBuscaAtivaPanelProps> = ({
  institutionId = 'inst_1',
  municipalityName = 'Prefeitura Municipal'
}) => {
  const [items, setItems] = useState<BuscaAtivaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [councilLetterItem, setCouncilLetterItem] = useState<BuscaAtivaItem | null>(null);

  const scanAttendance = async () => {
    setIsLoading(true);
    try {
      const enrollments = await getEnrollments({ status: 'matriculado' });

      // Carrega casos já registrados no Supabase
      const savedCasesMap = new Map<string, any>();
      try {
        const { data } = await supabase
          .from('education_busca_ativa_cases')
          .select('*')
          .eq('institution_id', institutionId);
        if (Array.isArray(data)) {
          data.forEach((row: any) => savedCasesMap.set(String(row.student_id), row));
        }
      } catch {
        // ignore if table not migrated yet
      }

      const evaluated: BuscaAtivaItem[] = [];
      const sample = enrollments.slice(0, 60);

      for (const enr of sample) {
        const card = await getStudentReportCardData(enr.student_id, enr.academic_year || 2026, {
          name: enr.student_name,
          className: enr.class_name
        });
        const isInfantil = /infantil|creche|cmei|maternal|berçário|pré|pre/i.test(
          enr.class_name || ''
        );
        const minLegal = isInfantil ? 60 : 75;
        const rate = card.attendanceRate ?? 100;
        const saved = savedCasesMap.get(String(enr.student_id));

        if (rate < minLegal + 10 || saved) {
          evaluated.push({
            student_id: enr.student_id,
            student_name: enr.student_name,
            class_name: enr.class_name,
            school_name: enr.school_name || 'Escola Municipal',
            attendance_rate: rate,
            total_absences: card.totalAbsences ?? 0,
            min_legal_rate: minLegal,
            risk_level: rate < minLegal ? 'critico' : 'alerta',
            status: saved?.status || 'aberto',
            contact_notes: saved?.contact_notes || '',
            case_id: saved?.id
          });
        }
      }

      evaluated.sort((a, b) => a.attendance_rate - b.attendance_rate);
      setItems(evaluated);
    } catch (err) {
      console.error('Erro na varredura de Busca Ativa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scanAttendance();
  }, [institutionId]);

  const handleUpdateCase = async (
    item: BuscaAtivaItem,
    nextStatus: BuscaAtivaItem['status'],
    notes?: string
  ) => {
    setSavingId(item.student_id);
    const updatedNotes = notes !== undefined ? notes : item.contact_notes;
    try {
      const payload = {
        institution_id: institutionId,
        student_id: item.student_id,
        student_name: item.student_name,
        class_name: item.class_name,
        school_name: item.school_name,
        attendance_rate: item.attendance_rate,
        total_absences: item.total_absences,
        min_legal_rate: item.min_legal_rate,
        risk_level: item.risk_level,
        status: nextStatus,
        contact_notes: updatedNotes,
        council_notified_at: nextStatus === 'conselho_tutelar' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (item.case_id) {
        await supabase
          .from('education_busca_ativa_cases')
          .update(payload)
          .eq('id', item.case_id);
      } else {
        const { data } = await supabase
          .from('education_busca_ativa_cases')
          .insert(payload)
          .select('id')
          .single();
        if (data?.id) item.case_id = data.id;
      }

      setItems((prev) =>
        prev.map((x) =>
          x.student_id === item.student_id
            ? { ...x, status: nextStatus, contact_notes: updatedNotes, case_id: item.case_id }
            : x
        )
      );
      showToast(`Ocorrência de ${item.student_name} atualizada (${nextStatus.replace('_', ' ')}).`, 'success');
    } catch {
      showToast('Status atualizado localmente (verifique a migração do Supabase).', 'warning');
    } finally {
      setSavingId(null);
    }
  };

  const criticalCount = items.filter((i) => i.risk_level === 'critico').length;
  const alertCount = items.filter((i) => i.risk_level === 'alerta').length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
              Busca Ativa Escolar &amp; Alerta LDB (Conselho Tutelar)
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Monitoramento automático do piso legal da LDB (75% Fundamental / 60% Infantil) com emissão de ofício ao Conselho Tutelar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-black border border-rose-200 dark:border-rose-800">
            Críticos: {criticalCount}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-black border border-amber-200 dark:border-amber-800">
            Preventivo: {alertCount}
          </span>
          <button
            type="button"
            onClick={scanAttendance}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Lista de Alunos Monitorados */}
      {isLoading ? (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-12 text-center text-sm text-neutral-400 font-semibold">
          Calculando frequência escolar da rede...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 p-10 text-center space-y-2">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
          <h4 className="text-base font-black text-neutral-900 dark:text-white">
            Nenhum aluno em risco de evasão ou abaixo do piso LDB
          </h4>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Todos os estudantes monitorados estão com frequência acima do limite preventivo (85% Fundamental / 70% Infantil).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.student_id}
              className={`bg-white dark:bg-neutral-900 rounded-3xl border p-5 space-y-4 shadow-xs ${
                item.risk_level === 'critico'
                  ? 'border-rose-300 dark:border-rose-800'
                  : 'border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-black text-neutral-900 dark:text-white truncate">
                      {item.student_name}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.risk_level === 'critico'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.risk_level === 'critico' ? 'Abaixo da LDB' : 'Alerta Preventivo'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {item.school_name} · <strong>{item.class_name}</strong>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-2xl font-black tabular-nums ${
                      item.risk_level === 'critico' ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  >
                    {item.attendance_rate}%
                  </div>
                  <div className="text-[10px] font-bold text-neutral-400">
                    Mín. {item.min_legal_rate}% · {item.total_absences} faltas
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1">
                  Registro de Contato / Busca Ativa
                </label>
                <input
                  type="text"
                  value={item.contact_notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItems((prev) =>
                      prev.map((x) =>
                        x.student_id === item.student_id ? { ...x, contact_notes: val } : x
                      )
                    );
                  }}
                  placeholder="Ex: Contato telefônico com a mãe em 23/11, agendada reunião..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={savingId === item.student_id}
                  onClick={() => handleUpdateCase(item, 'contato_familia')}
                  className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <PhoneCall size={13} />
                  <span>Registrar Contato</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateCase(item, 'conselho_tutelar');
                    setCouncilLetterItem(item);
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <FileWarning size={13} />
                  <span>Ofício Conselho Tutelar</span>
                </button>

                <button
                  type="button"
                  disabled={savingId === item.student_id}
                  onClick={() => handleUpdateCase(item, 'resolvido')}
                  className="ml-auto px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-black cursor-pointer"
                >
                  Regularizado
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Ofício Oficial ao Conselho Tutelar */}
      {councilLetterItem && (
        <div className="fixed inset-0 z-[200] bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white text-neutral-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:rounded-none">
            <div className="p-4 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between print:hidden">
              <span className="text-xs font-black uppercase text-rose-700 flex items-center gap-1.5">
                <AlertTriangle size={15} /> Notificação Preventiva ao Conselho Tutelar (LDB Art. 12, VIII)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} /> Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setCouncilLetterItem(null)}
                  className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-8 sm:p-12 overflow-y-auto space-y-6 font-serif text-sm leading-relaxed text-justify print:p-8 print:overflow-visible">
              <div className="text-center font-sans border-b-2 border-neutral-900 pb-4">
                <div className="text-xs font-black uppercase">{municipalityName}</div>
                <div className="text-sm font-black uppercase">Secretaria Municipal de Educação</div>
                <div className="text-xs text-neutral-600">{councilLetterItem.school_name}</div>
              </div>

              <p className="font-sans font-black text-center uppercase text-base">
                OFÍCIO DE COMUNICAÇÃO DE INFREQUÊNCIA ESCOLAR AO CONSELHO TUTELAR
              </p>

              <p>
                <strong>Ao Conselho Tutelar Municipal,</strong>
              </p>

              <p>
                Em cumprimento ao disposto no <strong>art. 12, inciso VIII da Lei nº 9.394/1996 (LDB)</strong> e no{' '}
                <strong>art. 56, inciso II do Estatuto da Criança e do Adolescente (ECA — Lei nº 8.069/1990)</strong>,
                comunicamos que o(a) estudante <strong>{councilLetterItem.student_name}</strong>, matriculado(a) na
                turma <strong>{councilLetterItem.class_name}</strong> da unidade{' '}
                <strong>{councilLetterItem.school_name}</strong>, apresenta até a presente data{' '}
                <strong>{councilLetterItem.total_absences} falta(s)</strong>, resultando em frequência escolar de{' '}
                <strong>{councilLetterItem.attendance_rate}%</strong> (piso legal mínimo:{' '}
                <strong>{councilLetterItem.min_legal_rate}%</strong>).
              </p>

              <p>
                <strong>Ações prévias de Busca Ativa realizadas pela escola:</strong>{' '}
                {councilLetterItem.contact_notes ||
                  'Tentativas de contato com os responsáveis legais registradas pela coordenação pedagógica.'}
              </p>

              <p>
                Solicitamos a atuação conjunta deste Conselho Tutelar para garantia do direito fundamental à educação
                e retorno regular do(a) estudante às atividades letivas.
              </p>

              <div className="pt-10 grid grid-cols-2 gap-8 text-center font-sans text-xs">
                <div className="border-t border-neutral-800 pt-2">
                  <div className="font-black uppercase">Direção Escolar</div>
                  <div className="text-neutral-500">{councilLetterItem.school_name}</div>
                </div>
                <div className="border-t border-neutral-800 pt-2">
                  <div className="font-black uppercase">Recebido — Conselho Tutelar</div>
                  <div className="text-neutral-500">Data: ____/____/______</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
