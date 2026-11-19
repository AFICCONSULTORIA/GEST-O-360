import React, { useState } from 'react';
import {
  HeartHandshake,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Smartphone,
  Calendar,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { Institution } from '../../types';
import { supabase, supabaseAnon } from '../../lib/supabase';
import { formatCPF, validateCPF } from '../../lib/masks';
import { FamilyPortalView, FamilyPortalStudentContext } from './components/FamilyPortalView';
import { showToast } from '../../components/ui/Toast';

interface PublicFamilyPortalProps {
  darkMode?: boolean;
  currentInstitution?: Institution | null;
}

const LAST_STUDENT_STORAGE_KEY = 'gestao360_family_portal_student';

function onlyDigits(val?: string | null): string {
  return String(val || '').replace(/\D/g, '');
}

function normalizeDateIso(raw?: string | null): string {
  if (!raw) return '';
  const str = String(raw).trim();
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return '';
}

export const PublicFamilyPortal: React.FC<PublicFamilyPortalProps> = ({
  currentInstitution,
}) => {
  const [cpfInput, setCpfInput] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<FamilyPortalStudentContext | null>(() => {
    try {
      const saved = localStorage.getItem(LAST_STUDENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showInstallTip, setShowInstallTip] = useState(false);

  const openStudentSession = (ctx: FamilyPortalStudentContext) => {
    setSelectedStudent(ctx);
    try {
      localStorage.setItem(LAST_STUDENT_STORAGE_KEY, JSON.stringify(ctx));
    } catch {
      // ignore
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cpfDigits = onlyDigits(cpfInput);
    if (cpfDigits.length !== 11 || !validateCPF(cpfInput)) {
      setLoginError('Informe um CPF válido do aluno (11 dígitos).');
      return;
    }
    if (!birthDateInput) {
      setLoginError('Informe a data de nascimento do aluno.');
      return;
    }

    setLoadingLogin(true);
    try {
      const targetBirth = normalizeDateIso(birthDateInput);
      let matchedStudent: FamilyPortalStudentContext | null = null;

      // 1. Busca nas tabelas de alunos no Supabase (education_students e edu_students)
      const tablesToCheck = ['education_students', 'edu_students'];
      for (const table of tablesToCheck) {
        if (matchedStudent) break;
        try {
          let { data, error } = await supabase.from(table).select('*').limit(500);
          if (error) {
            const retry = await supabaseAnon.from(table).select('*').limit(500);
            data = retry.data;
            error = retry.error;
          }
          if (!error && Array.isArray(data)) {
            const found = data.find((row: any) => {
              const rowCpf = onlyDigits(row.cpf || row.student_cpf || row.document);
              if (!rowCpf || rowCpf !== cpfDigits) return false;
              const rowBirth = normalizeDateIso(row.birth_date || row.data_nascimento);
              return !rowBirth || rowBirth === targetBirth;
            });
            if (found) {
              matchedStudent = {
                id: String(found.id),
                name: String(found.name || found.student_name || 'Aluno'),
                className: found.class_name || found.className || undefined,
                avatar: found.avatar_url || found.avatar || undefined,
              };
            }
          }
        } catch {
          // tenta próxima tabela
        }
      }

      // 2. Fallback no cadastro local (gestao360_students)
      if (!matchedStudent) {
        try {
          const raw = localStorage.getItem('gestao360_students');
          if (raw) {
            const localList = JSON.parse(raw);
            if (Array.isArray(localList)) {
              const found = localList.find((s: any) => {
                const rowCpf = onlyDigits(s.cpf || s.student_cpf || s.document);
                if (!rowCpf || rowCpf !== cpfDigits) return false;
                const rowBirth = normalizeDateIso(s.birth_date || s.birthDate || s.data_nascimento);
                return !rowBirth || rowBirth === targetBirth;
              });
              if (found) {
                matchedStudent = {
                  id: String(found.id),
                  name: String(found.name || 'Aluno'),
                  className: found.className || found.class_name || undefined,
                  avatar: found.avatar || undefined,
                };
              }
            }
          }
        } catch {
          // ignore
        }
      }

      if (!matchedStudent) {
        setLoginError(
          'Aluno não encontrado. Confira o CPF e a data de nascimento ou procure a secretaria da escola.'
        );
        return;
      }

      openStudentSession(matchedStudent);
      showToast(`Bem-vindo(a)! Acompanhando ${matchedStudent.name}.`, 'success');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    setSelectedStudent(null);
    setCpfInput('');
    setBirthDateInput('');
    setLoginError(null);
    try {
      localStorage.removeItem(LAST_STUDENT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  if (selectedStudent) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950">
        {/* Barra Superior Compacta Estilo App */}
        <header className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white flex items-center justify-center shrink-0">
                <HeartHandshake size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-neutral-900 dark:text-white truncate">
                  {currentInstitution?.name || 'Portal dos Pais'}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {selectedStudent.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowInstallTip((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold"
                title="Salvar como aplicativo no celular"
              >
                <Smartphone size={13} />
                <span className="hidden sm:inline">App</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-bold"
              >
                <LogOut size={13} />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {showInstallTip && (
            <div className="max-w-5xl mx-auto px-4 pb-3">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2">
                <span>
                  Toque no menu do navegador e escolha <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong> para usar como aplicativo no celular.
                </span>
                <button
                  type="button"
                  onClick={() => setShowInstallTip(false)}
                  className="font-black text-indigo-700 dark:text-indigo-300 px-2 py-1"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </header>

        <main className="px-3 sm:px-6 py-4 sm:py-6">
          <FamilyPortalView
            mode="student"
            initialStudentId={selectedStudent.id}
            studentProfile={selectedStudent}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-emerald-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex flex-col justify-center px-4 py-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <HeartHandshake size={28} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck size={13} />
            <span>{currentInstitution?.name || 'Educação Municipal'}</span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Portal dos Pais
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Informe o CPF e a data de nascimento do aluno para acompanhar o boletim, frequência e recados.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xl shadow-neutral-200/40 dark:shadow-none space-y-4"
        >
          {loginError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              CPF do Aluno
            </label>
            <div className="relative">
              <CreditCard size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                inputMode="numeric"
                required
                value={cpfInput}
                onChange={(e) => {
                  setCpfInput(formatCPF(e.target.value));
                  setLoginError(null);
                }}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5">
              Data de Nascimento do Aluno
            </label>
            <div className="relative">
              <Calendar size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="date"
                required
                value={birthDateInput}
                onChange={(e) => {
                  setBirthDateInput(e.target.value);
                  setLoginError(null);
                }}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingLogin}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:opacity-95 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span>{loadingLogin ? 'Verificando...' : 'Acessar Boletim'}</span>
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  );
};
