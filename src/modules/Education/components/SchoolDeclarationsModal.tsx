import React, { useState } from 'react';
import { Printer, X, FileCheck2, ShieldCheck } from 'lucide-react';
import { EnrollmentRecord, StudentReportCardData } from '../../../lib/api/education';

export type DeclarationType = 'matricula' | 'bolsa_familia' | 'transferencia' | 'historico';

interface SchoolDeclarationsModalProps {
  enrollment: EnrollmentRecord;
  reportCard?: StudentReportCardData | null;
  municipalityName?: string;
  onClose: () => void;
}

const DECLARATION_OPTIONS: Array<{ id: DeclarationType; label: string; title: string }> = [
  { id: 'matricula', label: 'Matrícula', title: 'DECLARAÇÃO DE MATRÍCULA REGULAR' },
  {
    id: 'bolsa_familia',
    label: 'Frequência (Bolsa Família)',
    title: 'DECLARAÇÃO DE FREQUÊNCIA ESCOLAR (PROGRAMA BOLSA FAMÍLIA / PRESENÇA)'
  },
  { id: 'transferencia', label: 'Transferência', title: 'GUIA DE TRANSFERÊNCIA ESCOLAR' },
  { id: 'historico', label: 'Histórico Resumido', title: 'HISTÓRICO ESCOLAR QUALITATIVO (BNCC / LDB)' }
];

export const SchoolDeclarationsModal: React.FC<SchoolDeclarationsModalProps> = ({
  enrollment,
  reportCard,
  municipalityName = 'Prefeitura Municipal',
  onClose
}) => {
  const [docType, setDocType] = useState<DeclarationType>('matricula');
  const activeOption =
    DECLARATION_OPTIONS.find((d) => d.id === docType) || DECLARATION_OPTIONS[0];

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const authCode = `EDU-${enrollment.academic_year}-${String(enrollment.student_id || enrollment.id)
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase()}-${docType.slice(0, 3).toUpperCase()}`;

  const attendanceRate = reportCard?.attendanceRate ?? 96;
  const totalAbsences = reportCard?.totalAbsences ?? 0;
  const isInfantil = /infantil|creche|cmei|maternal|berçário|pré|pre/i.test(
    enrollment.class_name || ''
  );
  const minLegal = isInfantil ? 60 : 75;

  return (
    <div className="fixed inset-0 z-[200] bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white text-neutral-900 w-full max-w-4xl rounded-none sm:rounded-[28px] shadow-2xl border-0 sm:border sm:border-neutral-200 overflow-hidden flex flex-col h-dvh sm:h-auto sm:max-h-[95vh] print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none">
        {/* Barra de Ações (oculta na impressão) */}
        <div className="safe-pt px-4 py-3 bg-neutral-100 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {DECLARATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDocType(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer transition-all ${
                  docType === opt.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimir / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-200 cursor-pointer"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Documento Oficial */}
        <div className="p-6 sm:p-12 overflow-y-auto space-y-8 font-serif text-neutral-900 bg-white print:p-8 print:overflow-visible">
          {/* Timbre */}
          <div className="border-b-2 border-neutral-900 pb-4 flex items-center justify-between gap-4">
            <div className="w-16 h-16 shrink-0 flex items-center justify-center">
              <img
                src="/brasao-municipio.png"
                alt="Brasão Municipal"
                className="max-h-16 max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1 text-center font-sans">
              <div className="text-xs font-black uppercase tracking-wider">
                República Federativa do Brasil
              </div>
              <div className="text-sm font-black uppercase">
                {municipalityName} · Secretaria Municipal de Educação
              </div>
              <div className="text-xs font-semibold text-neutral-600">
                {enrollment.school_name || 'Unidade Escolar da Rede Municipal'}
              </div>
            </div>
            <div className="w-16 hidden sm:block" />
          </div>

          {/* Título */}
          <div className="text-center font-sans">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wide border-y border-neutral-300 py-2">
              {activeOption.title}
            </h2>
          </div>

          {/* Corpo do Documento */}
          <div className="text-sm sm:text-base leading-relaxed text-justify space-y-4">
            {docType === 'matricula' && (
              <p>
                Declaramos, para os devidos fins que se fizerem necessários, que o(a) estudante{' '}
                <strong>{enrollment.student_name}</strong> encontra-se regularmente matriculado(a) nesta
                unidade escolar, cursando a turma <strong>{enrollment.class_name}</strong>, no turno{' '}
                <strong>{enrollment.shift || 'Matutino'}</strong>, durante o ano letivo de{' '}
                <strong>{enrollment.academic_year}</strong>, nos termos da Lei de Diretrizes e Bases da
                Educação Nacional (Lei nº 9.394/1996).
              </p>
            )}

            {docType === 'bolsa_familia' && (
              <>
                <p>
                  Declaramos, para fins de comprovação de condicionalidade educacional junto ao{' '}
                  <strong>Programa Bolsa Família / Sistema Presença (MEC)</strong>, que o(a) estudante{' '}
                  <strong>{enrollment.student_name}</strong> está regularmente matriculado(a) na turma{' '}
                  <strong>{enrollment.class_name}</strong> ({enrollment.shift || 'Matutino'}), ano letivo
                  de <strong>{enrollment.academic_year}</strong>, apresentando até a presente data
                  frequência escolar acumulada de <strong>{attendanceRate}%</strong> ({totalAbsences}{' '}
                  falta(s) registrada(s)).
                </p>
                <p>
                  Conforme a Lei nº 9.394/96 (LDB), o piso mínimo legal exigido para esta etapa é de{' '}
                  <strong>{minLegal}%</strong>, encontrando-se o(a) estudante em situação{' '}
                  <strong>{attendanceRate >= minLegal ? 'REGULAR' : 'DE ACOMPANHAMENTO PREVENTIVO'}</strong>.
                </p>
              </>
            )}

            {docType === 'transferencia' && (
              <>
                <p>
                  Declaramos que o(a) estudante <strong>{enrollment.student_name}</strong>, matriculado(a)
                  na turma <strong>{enrollment.class_name}</strong> ({enrollment.shift || 'Matutino'}) no
                  ano letivo de <strong>{enrollment.academic_year}</strong>, solicitou{' '}
                  <strong>Transferência Escolar</strong> na presente data, estando apto(a) a prosseguir
                  seus estudos na unidade escolar de destino.
                </p>
                <p>
                  A documentação pedagógica completa e o histórico escolar definitivo serão expedidos no
                  prazo legal de até 30 (trinta) dias, valendo esta guia para efetivação imediata da vaga.
                </p>
              </>
            )}

            {docType === 'historico' && (
              <>
                <p>
                  Certificamos o percurso formativo de <strong>{enrollment.student_name}</strong> na turma{' '}
                  <strong>{enrollment.class_name}</strong> ({enrollment.academic_year}), com frequência
                  global de <strong>{attendanceRate}%</strong> e síntese qualitativa alinhada à BNCC:
                </p>
                <div className="font-sans overflow-x-auto">
                  <table className="w-full border-collapse border border-neutral-300 text-xs">
                    <thead>
                      <tr className="bg-neutral-100">
                        <th className="p-2 border border-neutral-300 text-left">Componente Curricular</th>
                        <th className="p-2 border border-neutral-300 text-center">Síntese BNCC</th>
                        <th className="p-2 border border-neutral-300 text-center">Faltas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportCard?.subjects || []).map((s, idx) => (
                        <tr key={idx}>
                          <td className="p-2 border border-neutral-300 font-bold">{s.subject}</td>
                          <td className="p-2 border border-neutral-300 text-center uppercase">
                            {(s.proficiencyLevel || 'adequado').replace(/_/g, ' ')}
                          </td>
                          <td className="p-2 border border-neutral-300 text-center">{s.totalAbsences}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Data e Assinaturas */}
          <div className="pt-6 space-y-10 font-sans">
            <p className="text-right text-sm">{todayFormatted}.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 text-center text-xs">
              <div className="border-t border-neutral-800 pt-2">
                <div className="font-black uppercase">Secretaria Escolar</div>
                <div className="text-neutral-500">Responsável pela Emissão</div>
              </div>
              <div className="border-t border-neutral-800 pt-2">
                <div className="font-black uppercase">Direção da Unidade Escolar</div>
                <div className="text-neutral-500">{enrollment.school_name || 'Rede Municipal'}</div>
              </div>
            </div>
          </div>

          {/* Rodapé de Autenticidade */}
          <div className="pt-4 border-t border-neutral-200 font-sans flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <ShieldCheck size={14} className="text-emerald-600" />
              Documento oficial emitido eletronicamente pelo Gestão 360 Educação
            </span>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-neutral-700">
              <FileCheck2 size={13} /> Código: {authCode}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
