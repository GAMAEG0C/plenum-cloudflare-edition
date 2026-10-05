import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vvfuioynvugksmwucuge.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZnVpb3ludnVna3Ntd3VjdWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgyMjY0OSwiZXhwIjoyMDk1Mzk4NjQ5fQ.FtW5vQH8K6hgkTdcem79fntQrFt7IeJL8hM0Bg7Q74w";
const sb = createClient(supabaseUrl, supabaseKey);

const email = 'testadmin@universumk9.local';
const password = 'Solutions115.';

async function run() {
  const { data: list } = await sb.auth.admin.listUsers();
  let user = list.users.find(u => u.email.toLowerCase() === email);
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { employee_number: 'TA9999', first_name: 'Test', last_name: 'Admin', role: 'admin' }
    });
    if (error) { console.error(error); process.exit(1); }
    user = data.user;
    console.log('Created user:', user.id);
  } else {
    console.log('User already exists:', user.id);
  }
  
  // Update role and employee records
  const { error: rErr } = await sb.from('user_roles').upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' });
  if (rErr) console.error('user_roles error:', rErr);

  const { error: eErr } = await sb.from('employees').upsert({ id: user.id, employee_number: 'TA9999', first_name: 'Test', last_name: 'Admin', status: 'active' });
  if (eErr) console.error('employees error:', eErr);

  console.log('User TA9999 is set up!');
}

run();
