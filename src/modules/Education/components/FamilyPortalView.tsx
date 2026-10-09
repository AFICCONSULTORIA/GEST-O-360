import React, { useState, useEffect } from 'react';
import { 
  Users, Bell, Calendar, AlertCircle, FileText, Download, 
  Printer, CheckCircle2, TrendingUp, Clock, AlertTriangle, 
  MessageSquare, Sparkles, BookOpen, ChevronRight, ShieldCheck
} from 'lucide-react';
import { 
  AnnouncementRecord, 
  StudentReportCardData, 
  getFamilyAnnouncements, 
  getStudentReportCardData,
  getEnrollments,
  EnrollmentRecord
} from '../../../lib/api/education';
import { BoletimEscolarPDF } from './BoletimEscolarPDF';

interface FamilyPortalViewProps {
  initialStudentId?: string;
}

export const FamilyPortalView: React.FC<FamilyPortalViewProps> = ({
  initialStudentId = '00000000-0000-0000-0000-000000000001'
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [studentsList, setStudentsList] = useState<EnrollmentRecord[]>([]);
  const [reportCard, setReportCard] = useState<StudentReportCardData | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBoletimModalOpen, setIsBoletimModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const enrollments = await getEnrollments();
        setStudentsList(enrollments);

        const currentStudent = enrollments.find(e => e.student_id === selectedStudentId) || enrollments[0];
        const studentIdToUse = currentStudent ? currentStudent.student_id : selectedStudentId;

        const [cardData, annData] = await Promise.all([
          getStudentReportCardData(studentIdToUse, 2026),
          getFamilyAnnouncements(studentIdToUse, currentStudent?.class_name)
        ]);

        setReportCard(cardData);
        setAnnouncements(annData);
      } catch (err) {
        console.error('Erro ao carregar dados do Portal da Família:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    const handleAnnouncementCreated = () => {
      loadData();
    };
    window.addEventListener('school-announcement-created', handleAnnouncementCreated);
    return () => window.removeEventListener('school-announcement-created', handleAnnouncementCreated);
  }, [selectedStudentId]);

  const activeStudent = studentsList.find(s => s.student_id === selectedStudentId) || studentsList[0];

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'urgente':
        return {
          label: 'Urgente',
          bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse',
          icon: <AlertCircle size={14} className="text-rose-600" />
        };
      case 'reuniao':
        return {
          label: 'Reunião de Pais',
          bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          icon: <Calendar size={14} className="text-amber-600" />
        };
      case 'falta':
        return {
          label: 'Alerta de Frequência',
          bg: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800',
          icon: <AlertTriangle size={14} className="text-orange-600" />
        };
      default:
        return {
          label: 'Comunicado Geral',
          bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
          icon: <Bell size={14} className="text-indigo-600" />
        };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto w-full pb-12">
      
      {/* Top Banner: Portal da Família */}
      <div className="bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-700 rounded-[32px] p-6 sm:p-10 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
            <Users size={32} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Portal da Família & Comunicação
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md">
                <ShieldCheck size={12} /> Acompanhamento Escolar
              </span>
            </div>
            <p className="text-indigo-100 text-sm mt-1 max-w-xl font-medium">
              Acesso transparente à vida escolar do seu filho: boletim bimestral oficial, frequência em tempo real e avisos da coordenação.
            </p>
          </div>
        </div>

        {/* Seletor de Filho/Estudante */}
        <div className="relative z-10 w-full md:w-auto bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex flex-col gap-1 min-w-[240px]">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-100 px-2">
            Selecionar Estudante
          </span>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-2 bg-white text-neutral-900 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
          >
            {studentsList.map(st => (
              <option key={st.student_id} value={st.student_id}>
                {st.student_name} ({st.class_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Principal: Frequência + Resumo de Notas */}
      {reportCard && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card de Frequência do Mês e Alerta Legal */}
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 sm:p-7 rounded-[28px] border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
                  Frequência Escolar
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  reportCard.attendanceRate >= 75
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                }`}>
                  {reportCard.attendanceRate >= 75 ? 'Frequência Regular' : 'Atenção: Risco'}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-neutral-900 dark:text-white">
                  {reportCard.attendanceRate}%
                </span>
                <span className="text-xs text-neutral-500 font-semibold">
                  presença acumulada em 2026
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-3 rounded-full mt-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    reportCard.attendanceRate >= 75 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                      : 'bg-gradient-to-r from-rose-500 to-amber-500'
                  }`}
                  style={{ width: `${reportCard.attendanceRate}%` }}
                />
              </div>

              <div className="mt-5 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Dias letivos cumpridos:</span>
                  <strong className="text-neutral-900 dark:text-white">
                    {reportCard.totalClasses - reportCard.totalAbsences} de {reportCard.totalClasses} dias
                  </strong>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Total de faltas acumuladas:</span>
                  <strong className={reportCard.totalAbsences > 10 ? 'text-rose-600' : 'text-neutral-900 dark:text-white'}>
                    {reportCard.totalAbsences} faltas
                  </strong>
                </div>
              </div>
            </div>

            {/* Aviso Informativo LDB */}
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 space-y-1">
              <strong className="text-neutral-700 dark:text-neutral-300 block">Exigência de Presença (LDB):</strong>
              <p>Mínimo de 75% de presença para aprovação direta ao término do ano letivo.</p>
            </div>
          </div>

          {/* Mini-Boletim Interativo */}
          <div className="lg:col-span-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 sm:p-7 rounded-[28px] border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                    Rendimento Escolar Bimestral
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {reportCard.enrollment.class_name} • Ano Letivo {reportCard.enrollment.academic_year}
                  </p>
                </div>

                <button
                  onClick={() => setIsBoletimModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Baixar / Imprimir Boletim em PDF</span>
                </button>
              </div>

              {/* Tabela Resumida de Médias */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      <th className="p-3">Componente Curricular</th>
                      <th className="p-3 text-center">1º Bim</th>
                      <th className="p-3 text-center">2º Bim</th>
                      <th className="p-3 text-center">3º Bim</th>
                      <th className="p-3 text-center">4º Bim</th>
                      <th className="p-3 text-center bg-indigo-50/50 dark:bg-indigo-950/20 font-bold text-indigo-700 dark:text-indigo-300">Média</th>
                      <th className="p-3 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-semibold">
                    {reportCard.subjects.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="p-3 font-bold text-neutral-900 dark:text-white">
                          {sub.subject}
                        </td>
                        <td className="p-3 text-center text-neutral-600 dark:text-neutral-400">
                          {sub.b1 !== null ? sub.b1.toFixed(1) : '-'}
                        </td>
                        <td className="p-3 text-center text-neutral-600 dark:text-neutral-400">
                          {sub.b2 !== null ? sub.b2.toFixed(1) : '-'}
                        </td>
                        <td className="p-3 text-center text-neutral-600 dark:text-neutral-400">
                          {sub.b3 !== null ? sub.b3.toFixed(1) : '-'}
                        </td>
                        <td className="p-3 text-center text-neutral-600 dark:text-neutral-400">
                          {sub.b4 !== null ? sub.b4.toFixed(1) : '-'}
                        </td>
                        <td className={`p-3 text-center font-black ${
                          sub.finalAverage < 6.0 
                            ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-950/20' 
                            : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20'
                        }`}>
                          {sub.finalAverage.toFixed(1)}
                        </td>
                        <td className="p-3 text-center font-bold text-[11px]">
                          <span className={sub.status === 'Aprovado' ? 'text-emerald-600' : 'text-amber-600'}>
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totalizador Footer */}
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-400">
              <span>Média Geral das Disciplinas: <strong className="text-neutral-900 dark:text-white text-sm">{reportCard.overallAverage.toFixed(1)}</strong></span>
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={16} /> Desempenho Homologado
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Mural de Avisos e Comunicados Oficiais */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                Mural de Comunicados Oficiais
              </h3>
              <p className="text-xs text-neutral-500">
                Avisos emitidos pela Secretaria de Educação e pelo Corpo Docente
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-neutral-400">
            {announcements.length} comunicados disponíveis
          </span>
        </div>

        {/* Lista de Avisos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((ann) => {
            const badge = getCategoryBadge(ann.category);
            return (
              <div 
                key={ann.id}
                className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl p-6 rounded-3xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.bg}`}>
                      {badge.icon}
                      {badge.label}
                    </span>

                    <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(ann.publish_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <h4 className="font-black text-base text-neutral-900 dark:text-white leading-tight">
                    {ann.title}
                  </h4>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                    {ann.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-semibold">
                  <span>Por: <strong>{ann.author_name}</strong></span>
                  {ann.target_class ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">Turma: {ann.target_class}</span>
                  ) : (
                    <span className="text-neutral-400 font-medium">Toda a Escola</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Visualizador e Impressão do Boletim Oficial */}
      {isBoletimModalOpen && reportCard && (
        <BoletimEscolarPDF
          reportCard={reportCard}
          onClose={() => setIsBoletimModalOpen(false)}
        />
      )}

    </div>
  );
};
