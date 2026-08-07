import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('municipal_laws').select('*').eq('institution_id', 'inst_1').limit(1);
  if (error) {
    console.error('Error fetching from municipal_laws:', error);
  } else {
    console.log('Success, data:', data);
  }
}

test();
