import React, { useEffect, useMemo, useState } from 'react';
import {
  Database,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Save
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { EnrollmentRecord, getEnrollments } from '../../../lib/api/education';
import { showToast } from '../../../components/ui/Toast';

interface EducationEducacensoExportProps {
  institutionId?: string;
  municipalityName?: string;
}

interface StudentCensoRow {
  student_id: string;
  student_name: string;
  class_name: string;
  school_name: string;
  shift: string;
  academic_year: number;
  cpf: string;
  birth_date: string;
  inep_code: string;
  mother_name: string;
}

function onlyDigits(v?: string | null): string {
  return String(v || '').replace(/\D/g, '');
}

function formatDateBr(iso?: string | null): string {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
}

export const EducationEducacensoExport: React.FC<EducationEducacensoExportProps> = ({
  institutionId = 'inst_1',
  municipalityName = 'Município'
}) => {
  const [schoolInepCode, setSchoolInepCode] = useState<string>('51000001');
  const [rows, setRows] = useState<StudentCensoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const enrollments: EnrollmentRecord[] = await getEnrollments({ status: 'matriculado' });
      const studentMap = new Map<string, any>();

      try {
        const { data } = await supabase
          .from('education_students')
          .select('id, cpf, birth_date, inep_code, mother_name')
          .eq('institution_id', institutionId)
          .limit(1000);
        if (Array.isArray(data)) {
          data.forEach((s: any) => studentMap.set(String(s.id), s));
        }
      } catch {
        // fallback sem colunas extras
      }

      const merged: StudentCensoRow[] = enrollments.map((e) => {
        const st = studentMap.get(String(e.student_id));
        return {
          student_id: e.student_id,
          student_name: e.student_name,
          class_name: e.class_name,
          school_name: e.school_name || 'Escola Municipal',
          shift: e.shift || 'Matutino',
          academic_year: e.academic_year || 2026,
          cpf: st?.cpf || '',
          birth_date: st?.birth_date || '',
          inep_code: st?.inep_code || '',
          mother_name: st?.mother_name || ''
        };
      });

      setRows(merged);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [institutionId]);

  const stats = useMemo(() => {
    const total = rows.length;
    const withCpf = rows.filter((r) => onlyDigits(r.cpf).length === 11).length;
    const withBirth = rows.filter((r) => Boolean(r.birth_date)).length;
    const withInep = rows.filter((r) => onlyDigits(r.inep_code).length >= 8).length;
    const ready = rows.filter(
      (r) => onlyDigits(r.cpf).length === 11 && Boolean(r.birth_date)
    ).length;
    return { total, withCpf, withBirth, withInep, ready };
  }, [rows]);

  const handleSaveStudentInep = async (row: StudentCensoRow) => {
    setSavingStudentId(row.student_id);
    try {
      await supabase
        .from('education_students')
        .update({
          inep_code: onlyDigits(row.inep_code) || null,
          cpf: onlyDigits(row.cpf) || null,
          birth_date: row.birth_date || null,
          mother_name: row.mother_name || null
        })
        .eq('id', row.student_id);
      showToast(`Dados INEP de ${row.student_name} salvos!`, 'success');
    } catch {
      showToast('Não foi possível salvar no Supabase (verifique a migração da Fase 2).', 'warning');
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleDownloadEducacensoTxt = () => {
    const cleanSchoolInep = onlyDigits(schoolInepCode).padStart(8, '0').slice(0, 8);
    const lines: string[] = [];

    // Registro 00 — Identificação da Escola (layout pipe-delimited Educacenso)
    const schoolName = (rows[0]?.school_name || `ESCOLA MUNICIPAL ${municipalityName}`).toUpperCase();
    lines.push(`00|${cleanSchoolInep}|1|${schoolName}|${municipalityName.toUpperCase()}|1`);

    // Registro 20 — Turmas distintas
    const classes: string[] = Array.from(new Set<string>(rows.map((r) => String(r.class_name || 'TURMA'))));
    classes.forEach((cls, idx) => {
      const classCode = `TURMA${String(idx + 1).padStart(3, '0')}`;
      lines.push(`20|${cleanSchoolInep}|${classCode}|${cls.toUpperCase()}|1|07:00|11:30|1`);
    });

    // Registro 60 — Alunos / Matrículas
    rows.forEach((r, idx) => {
      const classIdx = Math.max(0, classes.indexOf(r.class_name));
      const classCode = `TURMA${String(classIdx + 1).padStart(3, '0')}`;
      const studentInep = onlyDigits(r.inep_code) || '';
      const cpf = onlyDigits(r.cpf);
      const birth = formatDateBr(r.birth_date);
      const mother = (r.mother_name || 'NAO DECLARADO').toUpperCase();
      lines.push(
        `60|${cleanSchoolInep}|${String(idx + 1).padStart(6, '0')}|${studentInep}|${r.student_name.toUpperCase()}|${birth}|${cpf}|${mother}|${classCode}`
      );
    });

    // Registro 99 — Encerramento do Arquivo
    lines.push(`99|${lines.length + 1}`);

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `educacenso_${cleanSchoolInep}_${new Date().getFullYear()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Arquivo Educacenso (${rows.length} matrículas) gerado com sucesso!`, 'success');
  };

  const handleDownloadCsv = () => {
    const header = 'Aluno;Turma;Escola;CPF;Data Nascimento;Codigo INEP;Nome da Mae';
    const body = rows.map(
      (r) =>
        `"${r.student_name}";"${r.class_name}";"${r.school_name}";"${onlyDigits(r.cpf)}";"${formatDateBr(r.birth_date)}";"${onlyDigits(r.inep_code)}";"${r.mother_name}"`
    );
    const blob = new Blob(['\uFEFF' + [header, ...body].join('\r\n')], {
      type: 'text/csv;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_censo_escolar_${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Database size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
              Censo Escolar / Educacenso (INEP)
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Auditoria cadastral de CPF, data de nascimento e código INEP com exportação de arquivo TXT estruturado (Registros 00, 20, 60 e 99).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-black uppercase text-neutral-500">INEP Escola:</span>
            <input
              type="text"
              value={schoolInepCode}
              onChange={(e) => setSchoolInepCode(onlyDigits(e.target.value).slice(0, 8))}
              className="w-24 bg-transparent text-xs font-black text-neutral-900 dark:text-white focus:outline-none"
              placeholder="51000001"
            />
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={14} />
            <span>CSV Conferência</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadEducacensoTxt}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download size={14} />
            <span>Exportar TXT Educacenso</span>
          </button>
        </div>
      </div>

      {/* KPIs de Prontidão */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Matrículas Ativas</div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Com CPF Válido</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {stats.withCpf} / {stats.total}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Com Data Nasc.</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            {stats.withBirth} / {stats.total}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Com Código INEP</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {stats.withInep} / {stats.total}
          </div>
        </div>
      </div>

      {/* Tabela de Conferência & Edição Rápida */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
            Conferência Cadastral de Estudantes
          </span>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-bold text-indigo-600 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> Recarregar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-[10px] font-black uppercase text-neutral-500">
              <tr>
                <th className="p-3">Estudante / Turma</th>
                <th className="p-3">CPF (11 dígitos)</th>
                <th className="p-3">Nascimento</th>
                <th className="p-3">Código INEP (12 dígitos)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((row) => {
                const ok = onlyDigits(row.cpf).length === 11 && Boolean(row.birth_date);
                return (
                  <tr key={row.student_id}>
                    <td className="p-3">
                      <div className="font-bold text-neutral-900 dark:text-white">{row.student_name}</div>
                      <div className="text-[11px] text-neutral-400">{row.class_name}</div>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.cpf}
                        onChange={(e) => {
                          const v = onlyDigits(e.target.value).slice(0, 11);
                          setRows((prev) =>
                            prev.map((x) => (x.student_id === row.student_id ? { ...x, cpf: v } : x))
                          );
                        }}
                        placeholder="00000000000"
                        className="w-32 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono text-xs"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={row.birth_date ? String(row.birth_date).slice(0, 10) : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((x) =>
                              x.student_id === row.student_id ? { ...x, birth_date: v } : x
                            )
                          );
                        }}
                        className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.inep_code}
                        onChange={(e) => {
                          const v = onlyDigits(e.target.value).slice(0, 12);
                          setRows((prev) =>
                            prev.map((x) =>
                              x.student_id === row.student_id ? { ...x, inep_code: v } : x
                            )
                          );
                        }}
                        placeholder="Opcional INEP"
                        className="w-32 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono text-xs"
                      />
                    </td>
                    <td className="p-3 text-center">
                      {ok ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px]">
                          <CheckCircle2 size={11} /> Pronto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px]">
                          <AlertTriangle size={11} /> Pendente
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        disabled={savingStudentId === row.student_id}
                        onClick={() => handleSaveStudentInep(row)}
                        className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-black inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Save size={12} />
                        <span>Salvar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
