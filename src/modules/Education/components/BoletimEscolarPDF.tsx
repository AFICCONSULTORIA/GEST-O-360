import React from 'react';
import { Printer, X, Award, CheckCircle, AlertTriangle, FileText, Sparkles, BookOpen, User } from 'lucide-react';
import { 
  StudentReportCardData, 
  ProficiencyLevel, 
  PROFICIENCY_LABELS 
} from '../../../lib/api/education';

interface BoletimEscolarPDFProps {
  reportCard: StudentReportCardData;
  onClose?: () => void;
}

export const BoletimEscolarPDF: React.FC<BoletimEscolarPDFProps> = ({
  reportCard,
  onClose
}) => {
  const { 
    enrollment, 
    subjects, 
    totalAbsences, 
    totalClasses, 
    attendanceRate, 
    finalStatus,
    overallProficiency = 'adequado',
    opinions = []
  } = reportCard;

  const handlePrint = () => {
    window.print();
  };

  const renderProficiencyBadge = (level?: ProficiencyLevel | null, isCompact = false) => {
    if (!level) {
      return <span className="text-neutral-400 font-medium text-xs">-</span>;
    }

    const conf = PROFICIENCY_LABELS[level] || PROFICIENCY_LABELS.adequado;
    
    // Print-friendly classes with clear borders and background
    let colorStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (level === 'abaixo_do_basico') colorStyle = 'bg-rose-50 text-rose-800 border-rose-300';
    if (level === 'basico') colorStyle = 'bg-amber-50 text-amber-800 border-amber-300';
    if (level === 'avancado') colorStyle = 'bg-blue-50 text-blue-800 border-blue-300';

    if (isCompact) {
      return (
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${colorStyle}`}>
          {conf.shortLabel}
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${colorStyle}`}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: conf.color }} />
        {conf.label}
      </span>
    );
  };

  // Coleta opiniões também de subjects se existirem
  const allOpinions = [...opinions];
  subjects.forEach(s => {
    if (s.descriptiveOpinion && !allOpinions.some(o => o.subject === s.subject && o.opinion === s.descriptiveOpinion)) {
      allOpinions.push({
        bimester: 4,
        subject: s.subject,
        opinion: s.descriptiveOpinion,
        teacherName: 'Professor(a) Regente'
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Modal Container */}
      <div className="bg-white text-neutral-900 w-full max-w-4xl rounded-[28px] shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Action Bar (Hidden in print) */}
        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">
            <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Boletim Escolar Oficial (Escala SAEB) • Ano Letivo {enrollment.academic_year}</span>
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
                {enrollment.school_name || 'Escola Municipal de Educação Básica'} • Cadastro MEC/INEP
              </p>
              <div className="inline-block mt-2 px-3 py-0.5 border border-neutral-900 text-neutral-900 rounded font-black text-xs uppercase tracking-widest">
                Boletim de Rendimento Escolar • Escala de Proficiência SAEB / BNCC ({enrollment.academic_year})
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
              <span className="text-[10px] font-bold uppercase text-neutral-500 block">Nível Global SAEB</span>
              <div className="mt-0.5">
                {renderProficiencyBadge(overallProficiency)}
              </div>
            </div>
          </div>

          {/* Tabela de Avaliação por Proficiência SAEB */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-neutral-300 text-xs text-left">
              <thead>
                <tr className="bg-neutral-100 text-neutral-800 font-black uppercase text-[10px] tracking-wider border-b border-neutral-300">
                  <th className="p-2.5 border-r border-neutral-300">Componente Curricular</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-28">1º Bimestre</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-28">2º Bimestre</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-28">3º Bimestre</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-28">4º Bimestre</th>
                  <th className="p-2.5 text-center border-r border-neutral-300 w-32 bg-neutral-200/80 font-black">Nível Consolidado</th>
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
                    <td className="p-2 text-center border-r border-neutral-300">
                      {renderProficiencyBadge(sub.b1Proficiency, true)}
                    </td>
                    <td className="p-2 text-center border-r border-neutral-300">
                      {renderProficiencyBadge(sub.b2Proficiency, true)}
                    </td>
                    <td className="p-2 text-center border-r border-neutral-300">
                      {renderProficiencyBadge(sub.b3Proficiency, true)}
                    </td>
                    <td className="p-2 text-center border-r border-neutral-300">
                      {renderProficiencyBadge(sub.b4Proficiency, true)}
                    </td>
                    <td className="p-2 text-center border-r border-neutral-300 bg-neutral-100/50">
                      {renderProficiencyBadge(sub.proficiencyLevel || 'adequado')}
                    </td>
                    <td className="p-2.5 text-center border-r border-neutral-300 text-neutral-700 font-semibold">
                      {sub.totalAbsences}
                    </td>
                    <td className="p-2.5 text-center font-bold text-[11px]">
                      <span className={
                        sub.status === 'Aprovado' || sub.status === 'Em Curso' 
                          ? 'text-emerald-700 font-black' 
                          : sub.status === 'Recuperação' ? 'text-amber-700' : 'text-rose-700'
                      }>
                        {sub.status === 'Aprovado' ? 'Promovido' : sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-100 font-black text-neutral-900 border-t-2 border-neutral-400">
                  <td className="p-2.5 uppercase tracking-wider text-[11px] border-r border-neutral-300">
                    Desempenho Geral do Ano Letivo
                  </td>
                  <td colSpan={4} className="p-2.5 text-center border-r border-neutral-300 text-neutral-600 font-medium">
                    Avaliação Baseada na Matriz Curricular SAEB / BNCC
                  </td>
                  <td className="p-2 text-center border-r border-neutral-300 bg-indigo-50/80">
                    {renderProficiencyBadge(overallProficiency)}
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

          {/* Seção de Pareceres Descritivos / Observações Pedagógicas */}
          {allOpinions.length > 0 && (
            <div className="border border-neutral-300 rounded-2xl p-4 bg-neutral-50/50 space-y-3">
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                <FileText size={16} className="text-indigo-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
                  Pareceres Pedagógicos Descritivos Bimestrais
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {allOpinions.map((op, oIdx) => (
                  <div key={oIdx} className="bg-white p-3 rounded-xl border border-neutral-200 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-900">{op.subject}</span>
                      <span className="px-2 py-0.5 bg-neutral-100 rounded text-[10px] font-semibold text-neutral-600">
                        {op.bimester}º Bimestre
                      </span>
                    </div>
                    <p className="text-neutral-700 text-xs italic leading-relaxed">
                      "{op.opinion}"
                    </p>
                    {op.teacherName && (
                      <p className="text-[10px] text-neutral-400 font-medium pt-1 text-right">
                        Docente: {op.teacherName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legenda Oficial da Escala de Proficiência SAEB (MEC / INEP) */}
          <div className="p-4 border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50/80 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                Legenda Oficial • Escala de Proficiência SAEB (MEC / INEP)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>Abaixo do Básico</span>
                </div>
                <p className="text-[10px] text-rose-900 leading-snug">
                  O estudante ainda não desenvolveu as habilidades essenciais esperadas para a etapa escolar; requer intervenção pedagógica prioritária.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Básico</span>
                </div>
                <p className="text-[10px] text-amber-900 leading-snug">
                  O estudante desenvolveu aprendizagens essenciais elementares, ainda em processo de consolidação.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Adequado</span>
                </div>
                <p className="text-[10px] text-emerald-900 leading-snug">
                  O estudante consolidou plenamente as competências e habilidades curriculares esperadas para o ano escolar.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>Avançado</span>
                </div>
                <p className="text-[10px] text-blue-900 leading-snug">
                  O estudante demonstra domínio aprofundado, autonomia crítica e superação dos objetivos curriculares.
                </p>
              </div>
            </div>
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
              <p className="text-[11px] text-neutral-600 mt-0.5">Mínimo de 75% do total de horas letivas para promoção escolar.</p>
            </div>
          </div>

          {/* Assinaturas Oficiais */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
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

