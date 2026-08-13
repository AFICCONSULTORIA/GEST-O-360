import React, { useState, useEffect } from 'react';
import { PublicForm, Institution } from '../../types';
import { PublicRespondentView } from './PublicRespondentView';
import { MOCK_DEFAULT_FORMS } from './templates';
import { supabase } from '../../lib/supabase';
import { FileQuestion, ArrowLeft, Home, Sun, Moon } from 'lucide-react';

interface PublicFormRouteLoaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  currentInstitution?: Institution | null;
}

export const PublicFormRouteLoader: React.FC<PublicFormRouteLoaderProps> = ({
  darkMode,
  setDarkMode,
  currentInstitution
}) => {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const resolveForm = async () => {
      setLoading(true);
      const path = window.location.pathname;
      const search = new URLSearchParams(window.location.search);

      let targetIdOrSlug = search.get('form') || search.get('id');

      if (!targetIdOrSlug) {
        if (path.startsWith('/formulario/')) {
          targetIdOrSlug = path.replace('/formulario/', '').replace(/\/$/, '');
        } else if (path.startsWith('/form/')) {
          targetIdOrSlug = path.replace('/form/', '').replace(/\/$/, '');
        } else if (path.startsWith('/responder/')) {
          targetIdOrSlug = path.replace('/responder/', '').replace(/\/$/, '');
        }
      }

      // If no ID is specified, default to first active form
      if (!targetIdOrSlug || targetIdOrSlug === 'default' || targetIdOrSlug === 'formulario') {
        const saved = localStorage.getItem('gestao360_public_forms');
        const list = saved ? JSON.parse(saved) : MOCK_DEFAULT_FORMS;
        setForm(list[0]);
        setLoading(false);
        return;
      }

      try {
        // 1. Check Supabase
        const { data, error } = await supabase
          .from('public_forms')
          .select('*')
          .or(`id.eq.${targetIdOrSlug},slug.eq.${targetIdOrSlug}`)
          .maybeSingle();

        if (!error && data) {
          const resolved: PublicForm = {
            ...data,
            questions: typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions
          };
          setForm(resolved);
          setLoading(false);
          return;
        }

        // 2. Check LocalStorage
        const saved = localStorage.getItem('gestao360_public_forms');
        if (saved) {
          const parsed: PublicForm[] = JSON.parse(saved);
          const found = parsed.find(f => f.id === targetIdOrSlug || f.slug === targetIdOrSlug);
          if (found) {
            setForm(found);
            setLoading(false);
            return;
          }
        }

        // 3. Check MOCK_DEFAULT_FORMS
        const mockFound = MOCK_DEFAULT_FORMS.find(f => f.id === targetIdOrSlug || f.slug === targetIdOrSlug);
        if (mockFound) {
          setForm(mockFound);
          setLoading(false);
          return;
        }

        setNotFound(true);
      } catch (err) {
        console.error('Erro ao resolver formulário:', err);
        // Fallback to first mock
        setForm(MOCK_DEFAULT_FORMS[0]);
      } finally {
        setLoading(false);
      }
    };

    resolveForm();
  }, []);

  if (loading) {
    return (
      <div className={`min-h-dvh flex items-center justify-center ${darkMode ? 'dark bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Carregando Formulário Oficial...</p>
        </div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className={`min-h-dvh flex items-center justify-center p-4 ${darkMode ? 'dark bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
        <div className="bg-white dark:bg-neutral-900 max-w-md w-full p-8 rounded-[36px] border border-neutral-200 dark:border-neutral-800 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-400">
            <FileQuestion size={40} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black">Formulário Não Encontrado</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              O link acessado não corresponde a uma consulta pública ativa ou expirou. Verifique o endereço e tente novamente.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="/"
              className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Home size={15} /> Voltar à Página Principal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicRespondentView
      form={form}
      institution={currentInstitution}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
    />
  );
};
