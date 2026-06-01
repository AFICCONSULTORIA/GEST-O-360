const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gtltiyshhjsizazriwma.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LIrECfYIC7SpP4tK0mXSkA_yTkx7LhH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', 'educacaosm24@gmail.com');

  if (error) {
    console.error('Erro na consulta:', error);
  } else {
    console.log(`Resultado da busca na tabela admin_users para 'educacaosm24@gmail.com':`, data);
  }
}

main();
