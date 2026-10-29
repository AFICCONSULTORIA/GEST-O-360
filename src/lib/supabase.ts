import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('As variáveis de ambiente do Supabase estão ausentes. Certifique-se de configurar o arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => {
      return fetch(url, { ...options, cache: 'no-store' });
    }
  }
});

export const signUpNewUser = async (email: string, password?: string) => {
  const secondary = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const defaultInitialPassword = import.meta.env.VITE_DEFAULT_TEMP_PASSWORD || 'gestao123@';
  return secondary.auth.signUp({ email, password: password || defaultInitialPassword });
};
