import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const supabaseUrl = urlMatch[1].trim().replace(/^['"]|['"]$/g, '');
const supabaseAnonKey = keyMatch[1].trim().replace(/^['"]|['"]$/g, '');

async function testAnonUpdate() {
  const updatePayload = {
    status: 'abastecido',
    liters_supplied: 48.5,
    current_odometer: 1500,
    pump_photo_url: 'https://example.com/pump.jpg',
    supplied_at: new Date().toISOString()
  };

  const url = `${supabaseUrl}/rest/v1/fuel_supply_orders?order_number=eq.AUT-2026-0002`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(updatePayload)
  });

  console.log('Update Status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Update Result:', text);
}
testAnonUpdate();

