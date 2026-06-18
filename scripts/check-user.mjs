import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data } = await supabase.from('admin_users').select('*').eq('email', 'educacaosm24@gmail.com').single();
  console.log('User department_id:', data.department_id);
  if (data.department_id) {
    const { data: dept } = await supabase.from('departments').select('*').eq('id', data.department_id).single();
    console.log('Dept found in DB?', !!dept, dept?.name);
  }
}
check();
