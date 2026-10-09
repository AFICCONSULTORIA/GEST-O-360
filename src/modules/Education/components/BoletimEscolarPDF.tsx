import React from 'react';
import { Printer, X, Download, Award, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { StudentReportCardData } from '../../../lib/api/education';

interface BoletimEscolarPDFProps {
  reportCard: StudentReportCardData;
  onClose?: () => void;
}

export const BoletimEscolarPDF: React.FC<BoletimEscolarPDFProps> = ({
  reportCard,
  onClose
}) => {
  const { enrollment, subjects, overallAverage, totalAbsences, totalClasses, attendanceRate, finalStatus } = reportCard;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Modal Container */}
      <div className="bg-white text-neutral-900 w-full max-w-4xl rounded-[28px] shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Action Bar (Hidden in print) */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">
            <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Boletim Escolar Oficial - Ano Letivo {enrollment.academic_year}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer size={16} />
              <span>Imprimir / Salvar PDF</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto space-y-6 font-sans text-neutral-900 bg-white print:p-6 print:overflow-visible">
          
          {/* Header Oficial Timbrado */}
          <div className="border-b-2 border-neutral-900 pb-5 text-center relative flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-20 h-20 shrink-0 flex items-center justify-center">
              <img 
                src="/brasao-municipio.png" 
                alt="Brasão Municipal" 
                className="max-h-20 max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="flex-1 text-center">
              <h1 className="text-base font-black uppercase tracking-wider text-neutral-900">
                República Federativa do Brasil
              </h1>
              <h2 className="text-sm font-bold uppercase text-neutral-800">
                Prefeitura Municipal • Secretaria Municipal de Educação
              </h2>
              <p className="text-xs font-semibold text-neutral-600 mt-0.5">
                {enrollment.school_name || 'Escola Municipal Monteiro Lobato'} • Cadastro MEC/INEP
              </p>
              <div className="inline-block mt-2 px-3 py-0.5 border border-neutral-900 text-neutral-900 rounded font-black text-xs uppercase tracking-widest">
                Boletim de Rendimento Escolar • Ano Letivo {enrollment.academic_year}
              </div>
            </div>

            <div className="w-20 hidden sm:block"></div>
          </div>

          {/* Dados do Aluno e Turma */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Estudante</span>
              <strong className="text-neutral-900 text-sm block truncate">{enrollment.student_name}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Matrícula / ID</span>
              <strong className="text-neutral-800">{enrollment.student_id.substring(0, 8).toUpperCase()}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Turma & Turno</span>
              <strong className="text-neutral-800">{enrollment.class_name} • {enrollment.shift || 'Matutino'}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Situação Geral</span>
              <span className={`inline-block font-black px-2 py-0.5 rounded text-[11px] ${
                finalStatus === 'Aprovado' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : finalStatus === 'Recuperação' 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                {finalStatus}
              </span>
            </div>
          </div>

          {/* Tabela de Notas por Disciplina */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-neutral-300 text-xs text-left">
              <thead>
                <tr className="bg-neutral-100 text-neutral-800 font-black uppercase text-[10px] tracking-wider border-b border-neutral-300">
                  <th className="p-2.5 border-r border-neutral-300">Componente Curricular</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-16">1º Bim</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-16">2º Bim</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-16">3º Bim</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-16">4º Bim</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-16 bg-neutral-200">Recup.</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-20 bg-neutral-200 font-bold">Média</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-16">Faltas</th>
                  <th className="p-2.5 text-center w-24">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {subjects.map((sub, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                    <td className="p-2.5 font-bold text-neutral-900 border-r border-neutral-300">
                      {sub.subject}
                    </td>
                    <td className="p-2.5 text-center border-r border-neutral-300 font-semibold">
                      {sub.b1 !== null ? sub.b1.toFixed(1) : '-'}
                    </td>
                    <td className="p-2.5 text-center border-r border-neutral-300 font-semibold">
                      {sub.b2 !== null ? sub.b2.toFixed(1) : '-'}
                    </td>
                    <td className="p-2.5 text-center border-r border-neutral-300 font-semibold">
                      {sub.b3 !== null ? sub.b3.toFixed(1) : '-'}
                    </td>
                    <td className="p-2.5 text-center border-r border-neutral-300 font-semibold">
                      {sub.b4 !== null ? sub.b4.toFixed(1) : '-'}
                    </td>
                    <td className="p-2.5 text-center border-r border-neutral-300 font-medium text-neutral-500 bg-neutral-50">
                      {sub.recovery !== null ? sub.recovery.toFixed(1) : '-'}
                    </td>
                    <td className={`p-2.5 text-center border-r border-neutral-300 font-black ${
                      sub.finalAverage < 6.0 ? 'text-rose-600 bg-rose-50' : 'text-neutral-900 bg-neutral-100/60'
                    }`}>
                      {sub.finalAverage.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-center border-r border-neutral-300 text-neutral-700">
                      {sub.totalAbsences}
                    </td>
                    <td className="p-2.5 text-center font-bold text-[11px]">
                      <span className={
                        sub.status === 'Aprovado' ? 'text-emerald-700' :
                        sub.status === 'Recuperação' ? 'text-amber-700' : 'text-neutral-700'
                      }>
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-100 font-black text-neutral-900 border-t-2 border-neutral-400">
                  <td className="p-2.5 uppercase tracking-wider text-[11px] border-r border-neutral-300">
                    Média Geral e Totalizadores
                  </td>
                  <td colSpan={4} className="p-2.5 text-center border-r border-neutral-300 text-neutral-500 font-normal">
                    Critério de aprovação: Média ≥ 6.0
                  </td>
                  <td className="p-2.5 border-r border-neutral-300"></td>
                  <td className="p-2.5 text-center border-r border-neutral-300 text-sm font-black text-indigo-900 bg-indigo-50">
                    {overallAverage.toFixed(1)}
                  </td>
                  <td className="p-2.5 text-center border-r border-neutral-300 font-black text-rose-700">
                    {totalAbsences}
                  </td>
                  <td className="p-2.5 text-center font-black text-emerald-700">
                    {finalStatus}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Resumo de Frequência e Observações Legais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-neutral-300 rounded-2xl bg-neutral-50 text-xs">
            <div>
              <span className="font-bold text-neutral-700 block uppercase tracking-wider text-[10px]">Total de Dias Letivos</span>
              <strong className="text-sm text-neutral-900">{totalClasses} dias</strong>
            </div>
            <div>
              <span className="font-bold text-neutral-700 block uppercase tracking-wider text-[10px]">Frequência Apurada</span>
              <strong className={`text-sm ${attendanceRate < 75 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {attendanceRate}% de Presença ({totalClasses - totalAbsences} dias presentes)
              </strong>
            </div>
            <div>
              <span className="font-bold text-neutral-700 block uppercase tracking-wider text-[10px]">Exigência Legal (LDB 9.394/96)</span>
              <p className="text-[11px] text-neutral-600 mt-0.5">Mínimo de 75% do total de horas letivas para aprovação.</p>
            </div>
          </div>

          {/* Assinaturas Oficiais */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-neutral-700 pt-2">
              <p className="font-bold text-neutral-900">Secretário(a) Escolar</p>
              <p className="text-[10px] text-neutral-500">Registro Funcional / Matrícula</p>
            </div>
            <div className="border-t border-neutral-700 pt-2">
              <p className="font-bold text-neutral-900">Diretor(a) Escolar</p>
              <p className="text-[10px] text-neutral-500">Portaria de Nomeação Municipal</p>
            </div>
          </div>

          {/* Rodapé e Autenticação */}
          <div className="pt-6 border-t border-neutral-200 text-[10px] text-neutral-400 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Emitido eletronicamente via Sistema GESTÃO 360 Educação em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</span>
            <span className="font-mono">Chave de Validação: {enrollment.id.substring(0, 12).toUpperCase()}</span>
          </div>

        </div>

      </div>

    </div>
  );
};
