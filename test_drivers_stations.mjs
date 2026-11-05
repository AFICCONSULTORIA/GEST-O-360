import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gtltiyshhjsizazriwma.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LIrECfYIC7SpP4tK0mXSkA_yTkx7LhH';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log('--- TESTANDO FLEET_DRIVERS ---');
  const { data: dSelect, error: dSelectErr } = await supabase.from('fleet_drivers').select('*');
  console.log('SELECT fleet_drivers:', { count: dSelect?.length, data: dSelect, error: dSelectErr });

  const testDriver = {
    id: '00000000-0000-4000-a000-000000000001',
    institution_id: 'inst_1',
    full_name: 'TESTE MOTORISTA SUPABASE',
    cpf: '123.456.789-00',
    department: 'Saúde',
    status: 'ativo'
  };
  const { data: dInsert, error: dInsertErr } = await supabase.from('fleet_drivers').insert([testDriver]).select().single();
  console.log('INSERT fleet_drivers:', { data: dInsert, error: dInsertErr });

  if (dInsert) {
    await supabase.from('fleet_drivers').delete().eq('id', testDriver.id);
  }

  console.log('\n--- TESTANDO FLEET_FUEL_STATIONS ---');
  const { data: sSelect, error: sSelectErr } = await supabase.from('fleet_fuel_stations').select('*');
  console.log('SELECT fleet_fuel_stations:', { count: sSelect?.length, data: sSelect, error: sSelectErr });

  const testStation = {
    id: '00000000-0000-4000-a000-000000000002',
    institution_id: 'inst_1',
    name: 'POSTO TESTE SUPABASE',
    cnpj: '12.345.678/0001-99',
    status: 'ativo'
  };
  const { data: sInsert, error: sInsertErr } = await supabase.from('fleet_fuel_stations').insert([testStation]).select().single();
  console.log('INSERT fleet_fuel_stations:', { data: sInsert, error: sInsertErr });

  if (sInsert) {
    await supabase.from('fleet_fuel_stations').delete().eq('id', testStation.id);
  }
}

check().catch(console.error);

