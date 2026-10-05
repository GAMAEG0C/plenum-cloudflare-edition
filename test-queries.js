import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => {
  const i = l.indexOf('=');
  return [l.substring(0,i).trim(), l.substring(i+1).trim()];
}));

const supabaseUrl = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Testing patients query ---');
  const { data: pData, error: pErr } = await sb.from('patients').select('*').limit(1);
  if (pErr) console.error('patients error:', pErr);
  else console.log('patients success, found:', pData.length);

  console.log('--- Testing consultations query ---');
  const { data: cData, error: cErr } = await sb.from('consultations').select('*').limit(1);
  if (cErr) console.error('consultations error:', cErr);
  else {
    console.log('consultations success, columns:', Object.keys(cData[0] || {}));
  }

  console.log('--- Testing patient_documents query ---');
  const { data: dData, error: dErr } = await sb.from('patient_documents').select('*').limit(1);
  if (dErr) console.error('patient_documents error:', dErr);
  else console.log('patient_documents success, found:', dData.length);
}

run();
