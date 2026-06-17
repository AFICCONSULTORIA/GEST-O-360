import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtltiyshhjsizazriwma.supabase.co';
const supabaseAnonKey = 'sb_publishable_LIrECfYIC7SpP4tK0mXSkA_yTkx7LhH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  // 1. Sign up the user
  const { data, error } = await supabase.auth.signUp({
    email: 'aficconsultoria@gmail.com',
    password: 'Gestao360@Admin'
  });

  if (error) {
    console.error('Signup error:', error);
    return;
  }
  
  console.log('User signed up!', data.user?.id);
  
  if (!data.user) {
    console.error("No user returned");
    return;
  }

  // 2. Add them to admin_users table
  const { error: dbError } = await supabase.from('admin_users').upsert({
    id: data.user.id,
    name: 'Admin AFIC',
    email: 'aficconsultoria@gmail.com',
    role: 'Super Admin',
    status: 'Ativo',
    permissions: ['home', 'controls', 'calendar', 'norms', 'risk', 'pntp', 'protocol', 'contracts', 'education', 'orders', 'doc_numbers', 'reports', 'certificates', 'obras', 'admin_financas', 'saude', 'servicos_publicos', 'meio_ambiente', 'tributos', 'agricultura', 'assistencia_social', 'esporte', 'planejamento', 'settings', 'patrimonio']
  });

  if (dbError) {
    console.error('DB error:', dbError);
  } else {
    console.log('Admin user added successfully!');
  }
}

main();
