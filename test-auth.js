import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => {
  const i = l.indexOf('=');
  return [l.substring(0,i).trim(), l.substring(i+1).trim()];
}));

const supabaseUrl = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await sb.auth.signInWithPassword({
    email: 'eo1303@universumk9.local',
    password: 'Solutions115.'
  });
  if (error) console.error('Sign in error:', error);
  else console.log('Sign in success! Session user:', data.user.id);
}

run();
