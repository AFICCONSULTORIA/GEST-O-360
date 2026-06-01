const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gtltiyshhjsizazriwma.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LIrECfYIC7SpP4tK0mXSkA_yTkx7LhH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Fetching institutions...");
  const { data: insts, error: e1 } = await supabase.from('institutions').select('*');
  if (e1) console.error("Error fetching institutions:", e1);
  else console.log(insts);

  console.log("Fetching admin_users...");
  const { data: users, error: e2 } = await supabase.from('admin_users').select('*');
  if (e2) console.error("Error fetching admin_users:", e2);
  else console.log(users);
}
main();
