import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vvfuioynvugksmwucuge.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZnVpb3ludnVna3Ntd3VjdWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgyMjY0OSwiZXhwIjoyMDk1Mzk4NjQ5fQ.FtW5vQH8K6hgkTdcem79fntQrFt7IeJL8hM0Bg7Q74w";
const sb = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: list } = await sb.auth.admin.listUsers();
  const user = list.users.find(u => u.email.toLowerCase() === 'eo1303@universumk9.local');
  if (user) {
    console.log('Found user:', user.id);
    const { data, error } = await sb.auth.admin.updateUserById(user.id, { password: 'Solutions115.' });
    if (error) console.error('Error updating password:', error);
    else console.log('Password updated successfully!');
  } else {
    console.log('User not found in list!');
  }
}

run();
