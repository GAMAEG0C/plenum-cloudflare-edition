import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vvfuioynvugksmwucuge.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZnVpb3ludnVna3Ntd3VjdWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgyMjY0OSwiZXhwIjoyMDk1Mzk4NjQ5fQ.FtW5vQH8K6hgkTdcem79fntQrFt7IeJL8hM0Bg7Q74w";
const sb = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: list, error } = await sb.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  console.log('Total users:', list.users.length);
  list.users.forEach(u => {
    console.log(`User ID: ${u.id}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Confirmed At: ${u.confirmed_at}`);
    console.log(`  Last Sign In: ${u.last_sign_in_at}`);
    console.log(`  Metadata:`, u.user_metadata);
  });
}

run();
