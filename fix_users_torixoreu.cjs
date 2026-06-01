const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gtltiyshhjsizazriwma.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LIrECfYIC7SpP4tK0mXSkA_yTkx7LhH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Atualizando todos os usuários para o município de Torixoréu (inst_1)...');
  
  // Atualiza todos os usuários, exceto o Super Admin, para 'inst_1' (Torixoréu)
  const { data, error } = await supabase
    .from('admin_users')
    .update({ institution_id: 'inst_1' })
    .neq('email', 'aficconsultoria@gmail.com')
    .select();

  if (error) {
    console.error('Erro ao atualizar usuários:', error);
  } else {
    console.log(`Sucesso! ${data.length} usuário(s) atualizado(s) para Torixoréu.`);
    for (const user of data) {
      console.log(`- ${user.name} (${user.email}) -> institution_id: ${user.institution_id}`);
    }
  }
}

main();
