import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => {
  const i = l.indexOf('=');
  return [l.substring(0,i).trim(), l.substring(i+1).trim()];
}));

const supabaseUrl = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  console.log('--- Fetching OpenAPI Spec to list RPCs ---');
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const data = await res.json();
    
    console.log('Exposed paths/RPCs:');
    const paths = Object.keys(data.paths);
    const rpcs = paths.filter(p => p.startsWith('/rpc/'));
    console.log(rpcs);
    
    // Check if there is any rpc that might be useful
    const execRpcs = rpcs.filter(r => r.toLowerCase().includes('sql') || r.toLowerCase().includes('exec') || r.toLowerCase().includes('run'));
    console.log('Matching RPCs for SQL/execution:', execRpcs);
  } catch (err) {
    console.error('Error fetching OpenAPI spec:', err);
  }
}

run();
