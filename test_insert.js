import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtltiyshhjsizazriwma.supabase.co';
const supabaseAnonKey = 'sb_publishable_LIrECfYIC7SpP4tK0mXSkA_yTkx7LhH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test' + Date.now() + '@gmail.com',
    password: 'Password123!'
  });
  console.log('Signup result:', data.user?.id, error?.message);

  if (data.user) {
    const { error: dbError } = await supabase.from('admin_users').insert({
      id: data.user.id,
      name: 'Test',
      email: data.user.email,
      role: 'Super Admin',
      status: 'Ativo',
      permissions: ['home']
    });
    console.log('Insert result:', dbError?.message || 'Success');
  }
}
main();
