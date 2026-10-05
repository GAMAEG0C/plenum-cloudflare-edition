import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => {
  const i = l.indexOf('=');
  return [l.substring(0,i).trim(), l.substring(i+1).trim()];
}));

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const query = `
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Todos pueden leer roles" ON public.user_roles;
    CREATE POLICY "Todos pueden leer roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
  `;
  // Supabase JS client doesn't have a direct raw SQL query method on the REST API.
  // We can use the rpc endpoint, but we don't have a generic exec_sql function.
  // Let me just tell the user to run it in the SQL Editor OR I can use the Supabase CLI if it's installed.
}
run();
