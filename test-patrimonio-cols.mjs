import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCols() {
  const { data, error } = await supabase.from('patrimonio').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(data[0] || {}));
}

checkCols();
