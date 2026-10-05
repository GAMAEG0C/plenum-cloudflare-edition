import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vvfuioynvugksmwucuge.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Fetching employees...");
  const { data, error } = await supabaseAdmin.from("employees").select("*");
  if (error) {
    console.error("Error fetching employees:", error);
  } else {
    console.log("Employees found:", data?.length);
    console.log(data);
  }
}

run();
