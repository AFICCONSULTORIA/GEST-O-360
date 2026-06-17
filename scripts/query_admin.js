import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtltiyshhjsizazriwma.supabase.co';
const supabaseAnonKey = 'sb_publishable_LIrECfYIC7SpP4tK0mXSkA_yTkx7LhH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.from('admin_users').select('*').eq('email', 'aficconsultoria@gmail.com');
  console.log('User found in admin_users:', data, error);
}

main();
