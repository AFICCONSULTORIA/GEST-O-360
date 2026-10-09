import React from 'react';
import { Printer, X, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { ClassAttendanceSheetData } from '../../../lib/api/education';

interface DiarioOficialPDFProps {
  sheetData: ClassAttendanceSheetData;
  onClose?: () => void;
}

export const DiarioOficialPDF: React.FC<DiarioOficialPDFProps> = ({
  sheetData,
  onClose
}) => {
  const { className, month, year, daysInMonth, students, classAverageRate } = sheetData;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrint = () => {
    window.print();
  };

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Modal Container */}
      <div className="bg-white text-neutral-900 w-full max-w-6xl rounded-[28px] shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Action Bar (Hidden in print) */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">
            <FileSpreadsheet size={18} className="text-emerald-600 dark:text-emerald-400" />
            <span>Diário Oficial de Classe - Frequência Mensal ({monthNames[month - 1]} de {year})</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer size={16} />
              <span>Imprimir / Salvar Diário</span>
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

        {/* Printable Document Body (Landscape Orientation Optimal) */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 font-sans text-neutral-900 bg-white print:p-4 print:overflow-visible">
          
          {/* Header Oficial Timbrado */}
          <div className="border-b-2 border-neutral-900 pb-4 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
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

            <div className="flex-1 text-center">
              <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-neutral-900">
                Prefeitura Municipal • Secretaria Municipal de Educação
              </h1>
              <h2 className="text-base sm:text-lg font-black uppercase text-neutral-900 mt-0.5">
                Diário Oficial de Frequência e Rendimento da Turma
              </h2>
              <p className="text-xs text-neutral-600">
                Escola Municipal Monteiro Lobato • Matriz de Presença Bimestral
              </p>
            </div>

            <div className="text-right text-xs">
              <span className="font-bold text-neutral-700 block">Turma: <strong>{className}</strong></span>
              <span className="text-neutral-600 block">Mês: <strong>{monthNames[month - 1]} / {year}</strong></span>
              <span className="text-emerald-700 font-bold block">Média Turma: {classAverageRate}%</span>
            </div>
          </div>

          {/* Grade Mensal de Frequência */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-neutral-300 text-[11px] text-left">
              <thead>
                <tr className="bg-neutral-100 text-neutral-800 font-black text-[9px] uppercase border-b border-neutral-300">
                  <th className="p-1.5 border-r border-neutral-300 w-8 text-center">Nº</th>
                  <th className="p-1.5 border-r border-neutral-300 min-w-[140px]">Estudante</th>
                  {daysArray.map((day) => {
                    const dateObj = new Date(year, month - 1, day);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    return (
                      <th 
                        key={day} 
                        className={`p-1 text-center border-r border-neutral-300 w-5 ${
                          isWeekend ? 'bg-neutral-200 text-neutral-500' : ''
                        }`}
                      >
                        {day}
                      </th>
                    );
                  })}
                  <th className="p-1 text-center border-r border-neutral-300 w-10 bg-emerald-50 text-emerald-800">Pres.</th>
                  <th className="p-1 text-center border-r border-neutral-300 w-10 bg-rose-50 text-rose-800">Falt.</th>
                  <th className="p-1 text-center w-12 bg-neutral-200 font-bold">% Freq.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {students.map((st, sIdx) => (
                  <tr key={st.enrollmentId} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                    <td className="p-1.5 text-center font-bold text-neutral-500 border-r border-neutral-300">
                      {String(sIdx + 1).padStart(2, '0')}
                    </td>
                    <td className="p-1.5 font-bold text-neutral-900 border-r border-neutral-300 truncate max-w-[180px]">
                      {st.studentName}
                    </td>
                    {daysArray.map((day) => {
                      const dateObj = new Date(year, month - 1, day);
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                      const val = st.attendanceMap[day];

                      let content = '';
                      let colorClass = '';

                      if (isWeekend) {
                        content = '•';
                        colorClass = 'text-neutral-300 bg-neutral-100';
                      } else if (val === 'presente') {
                        content = 'P';
                        colorClass = 'text-emerald-700 font-bold';
                      } else if (val === 'falta') {
                        content = 'F';
                        colorClass = 'text-rose-600 font-black bg-rose-50';
                      } else if (val === 'justificada') {
                        content = 'J';
                        colorClass = 'text-amber-600 font-bold bg-amber-50';
                      }

                      return (
                        <td 
                          key={day} 
                          className={`p-1 text-center text-[10px] border-r border-neutral-300 ${colorClass}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-r border-neutral-300 font-bold text-emerald-800 bg-emerald-50/40">
                      {st.totalPresences}
                    </td>
                    <td className="p-1 text-center border-r border-neutral-300 font-bold text-rose-700 bg-rose-50/40">
                      {st.totalAbsences}
                    </td>
                    <td className={`p-1 text-center font-black ${
                      st.attendanceRate < 75 ? 'text-rose-600 bg-rose-50' : 'text-neutral-900 bg-neutral-100/50'
                    }`}>
                      {st.attendanceRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legenda e Resumo */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 border border-neutral-200 rounded-xl bg-neutral-50 text-[11px] text-neutral-600">
            <div className="flex items-center gap-4">
              <span className="font-bold text-neutral-800 uppercase text-[10px]">Legenda:</span>
              <span className="flex items-center gap-1"><strong className="text-emerald-700">P</strong> = Presente</span>
              <span className="flex items-center gap-1"><strong className="text-rose-600">F</strong> = Falta</span>
              <span className="flex items-center gap-1"><strong className="text-amber-600">J</strong> = Falta Justificada</span>
              <span className="flex items-center gap-1 text-neutral-400"><strong>•</strong> = Fim de Semana / Recesso</span>
            </div>
            <div>
              <span>Total de Alunos: <strong>{students.length}</strong></span> • 
              <span className="ml-2">Percentual Geral de Presença: <strong className="text-emerald-700">{classAverageRate}%</strong></span>
            </div>
          </div>

          {/* Termo de Fechamento e Assinatura */}
          <div className="pt-8 border-t border-neutral-300 space-y-6">
            <p className="text-xs text-neutral-600 leading-relaxed italic text-center">
              "Atesto a exatidão das presenças e faltas lançadas neste Diário de Classe Oficial referente ao mês de {monthNames[month - 1]} de {year}, estando em conformidade com as diretrizes da Secretaria Municipal de Educação."
            </p>

            <div className="grid grid-cols-2 gap-12 text-center text-xs pt-4">
              <div className="border-t border-neutral-700 pt-2">
                <p className="font-bold text-neutral-900">Professor(a) Regente</p>
                <p className="text-[10px] text-neutral-500">Matrícula Funcional do Educador</p>
              </div>
              <div className="border-t border-neutral-700 pt-2">
                <p className="font-bold text-neutral-900">Coordenação Pedagógica / Direção</p>
                <p className="text-[10px] text-neutral-500">Visto e Homologação Institucional</p>
              </div>
            </div>
          </div>

          {/* Rodapé técnico */}
          <div className="pt-4 border-t border-neutral-200 text-[10px] text-neutral-400 flex justify-between items-center">
            <span>Sistema GESTÃO 360 • Diário de Classe Eletrônico</span>
            <span>Data de Homologação: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>

        </div>

      </div>

    </div>
  );
};
