import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Edit3,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCPF, validateCPF } from '../../../lib/masks';
import { showToast } from '../../../components/ui/Toast';
import {
  EducationStudentRecord,
  downloadStudentsTemplateExcel,
  exportStudentsToExcel,
  formatBirthDateBR,
  generateStudentEnrollmentCode,
  parseStudentsSpreadsheet
} from '../utils/studentSpreadsheet';

export type { EducationStudentRecord };

interface EducationStudentsManagerProps {
  institutionId?: string;
  institutionName?: string;
}

const PAGE_SIZE = 30;

const SUGGESTED_CLASSES = [
  'Berçário I',
  'Berçário II',
  'Maternal I',
  'Maternal II',
  'Pré I',
  'Pré II',
  '1º Ano A',
  '2º Ano A',
  '3º Ano A',
  '4º Ano A',
  '5º Ano A',
  '6º Ano A',
  '7º Ano A',
  '8º Ano A',
  '9º Ano A'
];

export const EducationStudentsManager: React.FC<EducationStudentsManagerProps> = ({
  institutionId = 'inst_1',
  institutionName = 'Rede Municipal de Ensino'
}) => {
  const storageKey = `gestao360_edu_students_${institutionId}`;

  const [students, setStudents] = useState<EducationStudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('Todas');
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<EducationStudentRecord | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    cpf: '',
    birth_date: '',
    class_name: ''
  });

  const loadStudents = async () => {
    setIsLoading(true);
    let loaded: EducationStudentRecord[] = [];
    try {
      const { data, error } = await supabase
        .from('education_students')
        .select('id, institution_id, name, cpf, birth_date, class_name, enrollment_code')
        .eq('institution_id', institutionId)
        .order('name');
      if (!error && Array.isArray(data)) {
        loaded = data.map((row: {
          id?: string;
          institution_id?: string | null;
          name?: string | null;
          cpf?: string | null;
          birth_date?: string | null;
          class_name?: string | null;
          enrollment_code?: string | null;
        }) => ({
          id: String(row.id || ''),
          institution_id: String(row.institution_id || institutionId),
          name: String(row.name || ''),
          cpf: String(row.cpf || '').replace(/\D/g, ''),
          birth_date: row.birth_date ? String(row.birth_date).slice(0, 10) : '',
          class_name: String(row.class_name || 'Sem Turma'),
          enrollment_code: row.enrollment_code ? String(row.enrollment_code) : undefined
        }));
      }
    } catch {
      // fallback local
    }

    if (loaded.length === 0) {
      try {
        const raw = localStorage.getItem(storageKey);
        loaded = raw ? JSON.parse(raw) : [];
      } catch {
        loaded = [];
      }
    }

    setStudents(loaded);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, [institutionId]);

  const persistLocal = (list: EducationStudentRecord[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>(students.map((s) => s.class_name).filter(Boolean));
    return ['Todas', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))];
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return students.filter((st) => {
      if (classFilter !== 'Todas' && st.class_name !== classFilter) return false;
      if (!q) return true;
      return (
        st.name.toLowerCase().includes(q) ||
        (st.class_name || '').toLowerCase().includes(q) ||
        (digits.length > 0 && (st.cpf || '').replace(/\D/g, '').includes(digits))
      );
    });
  }, [students, searchQuery, classFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter, institutionId]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, safePage]);

  const stats = useMemo(() => {
    const classesCount = new Set(students.map((s) => s.class_name).filter((c) => c && c !== 'Sem Turma')).size;
    const withCpf = students.filter((s) => (s.cpf || '').replace(/\D/g, '').length === 11).length;
    const withBirth = students.filter((s) => Boolean(s.birth_date)).length;
    return { total: students.length, classesCount, withCpf, withBirth };
  }, [students]);

  const openNewModal = () => {
    setEditingStudent(null);
    setForm({ name: '', cpf: '', birth_date: '', class_name: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (st: EducationStudentRecord) => {
    setEditingStudent(st);
    setForm({
      name: st.name,
      cpf: st.cpf ? formatCPF(st.cpf) : '',
      birth_date: st.birth_date || '',
      class_name: st.class_name === 'Sem Turma' ? '' : st.class_name
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = form.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11 || !validateCPF(form.cpf)) {
      showToast('Informe um CPF válido (11 dígitos).', 'warning');
      return;
    }
    if (!form.name.trim() || !form.birth_date || !form.class_name.trim()) {
      showToast('Nome do aluno, Data de nascimento e Turma são obrigatórios.', 'warning');
      return;
    }

    const record: EducationStudentRecord = {
      id: editingStudent?.id || crypto.randomUUID(),
      institution_id: institutionId,
      name: form.name.trim(),
      cpf: cleanCpf,
      birth_date: form.birth_date,
      class_name: form.class_name.trim(),
      enrollment_code: editingStudent?.enrollment_code || generateStudentEnrollmentCode(cleanCpf)
    };

    const next = editingStudent
      ? students.map((x) => (x.id === record.id ? record : x))
      : [...students, record].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    setStudents(next);
    persistLocal(next);
    setIsModalOpen(false);

    const { error: dbError } = await supabase.from('education_students').upsert(
      {
        id: record.id,
        institution_id: record.institution_id,
        name: record.name,
        cpf: record.cpf,
        birth_date: record.birth_date,
        class_name: record.class_name,
        enrollment_code: record.enrollment_code,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );

    if (dbError) {
      showToast(`Salvo apenas localmente (erro no banco: ${dbError.message}).`, 'warning');
      return;
    }

    showToast(
      editingStudent ? 'Aluno atualizado no banco com sucesso!' : 'Aluno cadastrado no banco com sucesso!',
      'success'
    );
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este aluno do cadastro da instituição?')) return;
    const next = students.filter((s) => s.id !== id);
    setStudents(next);
    persistLocal(next);
    const { error: dbError } = await supabase
      .from('education_students')
      .delete()
      .eq('id', id)
      .eq('institution_id', institutionId);
    if (dbError) {
      showToast(`Removido localmente, mas falhou no banco: ${dbError.message}`, 'warning');
      return;
    }
    showToast('Aluno removido do cadastro.', 'info');
  };

  const handleExportExcel = async () => {
    await exportStudentsToExcel(filteredStudents);
  };

  const handleDownloadTemplate = async () => {
    await downloadStudentsTemplateExcel();
    showToast('Planilha modelo de alunos baixada!', 'success');
  };

  const handleImportSpreadsheet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const { incoming, merged } = await parseStudentsSpreadsheet(file, institutionId, students);

      if (incoming.length === 0) {
        showToast(
          'Nenhum aluno válido encontrado. Verifique se a planilha possui Nome, CPF (11 dígitos) e Data de Nascimento.',
          'warning'
        );
        return;
      }

      setStudents(merged);
      persistLocal(merged);

      const payload = incoming.map((rec) => ({
        id: rec.id,
        institution_id: rec.institution_id,
        name: rec.name,
        cpf: rec.cpf,
        birth_date: rec.birth_date,
        class_name: rec.class_name,
        enrollment_code: rec.enrollment_code,
        updated_at: new Date().toISOString()
      }));

      let dbFailedMsg: string | null = null;
      for (let i = 0; i < payload.length; i += 200) {
        const chunk = payload.slice(i, i + 200);
        const { error: dbError } = await supabase
          .from('education_students')
          .upsert(chunk, { onConflict: 'id' });
        if (dbError) {
          dbFailedMsg = dbError.message;
          break;
        }
      }

      if (dbFailedMsg) {
        showToast(
          `${incoming.length} aluno(s) carregados localmente, mas falhou ao gravar no banco: ${dbFailedMsg}`,
          'warning'
        );
      } else {
        showToast(`${incoming.length} aluno(s) importado(s) e salvos no banco com sucesso!`, 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'arquivo inválido';
      showToast('Erro ao importar planilha: ' + msg, 'error');
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <GraduationCap size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white">
              Controle de Alunos por Instituição
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              {institutionName} — Cadastro e importação em lote com Nome, CPF, Data de Nascimento e Turma.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={handleImportSpreadsheet}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <FileSpreadsheet size={14} />
            <span>Planilha Modelo</span>
          </button>

          <button
            type="button"
            disabled={isImporting}
            onClick={() => importInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Upload size={14} />
            <span>{isImporting ? 'Importando...' : 'Importar Planilha'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo Aluno</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Total de Alunos</div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Turmas Ativas</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{stats.classesCount}</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Com CPF Válido</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.withCpf}</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/70 dark:border-neutral-800">
          <div className="text-[10px] font-black uppercase text-neutral-400">Data Nasc. Preenchida</div>
          <div className="text-2xl font-black text-sky-600 mt-1">{stats.withBirth}</div>
        </div>
      </div>

      {/* Filtros + Tabela */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aluno por nome, CPF ou turma..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
            >
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  {c === 'Todas' ? 'Turma: Todas' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-400 uppercase font-black border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4">Nome do Aluno</th>
                <th className="py-3 px-4">CPF</th>
                <th className="py-3 px-4">Data de Nascimento</th>
                <th className="py-3 px-4">Turma</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    Carregando cadastro de alunos...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-neutral-400">
                    <Users size={28} className="mx-auto mb-2 text-neutral-300" />
                    Nenhum aluno encontrado. Clique em <strong>Novo Aluno</strong> ou importe uma planilha.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white">{st.name}</td>
                    <td className="py-3 px-4 font-mono text-neutral-600 dark:text-neutral-300">
                      {st.cpf ? formatCPF(st.cpf) : '—'}
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={12} className="text-neutral-400" />
                        {formatBirthDateBR(st.birth_date)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                        {st.class_name || 'Sem Turma'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(st)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(st.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredStudents.length > 0 && (
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-neutral-500">
              Mostrando{' '}
              <strong className="text-neutral-800 dark:text-neutral-200">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredStudents.length)}
              </strong>{' '}
              de <strong className="text-neutral-800 dark:text-neutral-200">{filteredStudents.length}</strong> alunos
              (máximo {PAGE_SIZE} por página)
            </span>

            {totalPages > 1 && (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft size={14} />
                  <span>Anterior</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-black text-neutral-700 dark:text-neutral-200">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <span>Próxima</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Cadastrar / Editar Aluno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-neutral-900 dark:text-white">
                {editingStudent ? 'Editar Aluno' : 'Cadastrar Aluno'}
              </h4>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X size={18} className="text-neutral-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  Nome do Aluno *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome completo do aluno"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  CPF *
                </label>
                <input
                  required
                  inputMode="numeric"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  Data de Nascimento *
                </label>
                <input
                  required
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                  Turma *
                </label>
                <input
                  required
                  list="edu-student-classes"
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  placeholder="Ex: 5º Ano A, Pré II, Maternal I..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold"
                />
                <datalist id="edu-student-classes">
                  {SUGGESTED_CLASSES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              {editingStudent ? 'Salvar Alterações' : 'Cadastrar Aluno'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
