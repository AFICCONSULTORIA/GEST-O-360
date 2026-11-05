import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gtltiyshhjsizazriwma.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LIrECfYIC7SpP4tK0mXSkA_yTkx7LhH';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log('=== MOTORISTAS NO BANCO SUPABASE (fleet_drivers) ===');
  const { data: dSelect, error: dSelectErr } = await supabase
    .from('fleet_drivers')
    .select('id, full_name, cpf, department, status, created_at')
    .order('full_name', { ascending: true });

  if (dSelectErr) {
    console.error('Erro ao consultar motoristas:', dSelectErr);
  } else {
    console.log(`Total de motoristas cadastrados: ${dSelect?.length || 0}`);
    dSelect?.forEach((d, idx) => {
      console.log(`  [${idx + 1}] ${d.full_name} | CPF: ${d.cpf} | Secretaria: ${d.department} | Status: ${d.status}`);
    });
  }

  console.log('\n=== POSTOS CREDENCIADOS NO SUPABASE (fleet_fuel_stations) ===');
  const { data: sSelect, error: sSelectErr } = await supabase
    .from('fleet_fuel_stations')
    .select('id, name, cnpj, city, status, created_at')
    .order('name', { ascending: true });

  if (sSelectErr) {
    console.error('Erro ao consultar postos:', sSelectErr);
  } else {
    console.log(`Total de postos credenciados: ${sSelect?.length || 0}`);
    sSelect?.forEach((s, idx) => {
      console.log(`  [${idx + 1}] ${s.name} | CNPJ: ${s.cnpj || '-'} | Cidade: ${s.city || '-'} | Status: ${s.status}`);
    });
  }
}

check().catch(console.error);

