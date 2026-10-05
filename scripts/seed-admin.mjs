import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = 'EO1303@universumk9.local';
const { data: list } = await sb.auth.admin.listUsers();
let user = list.users.find(u => u.email === email);
if (!user) {
  const { data, error } = await sb.auth.admin.createUser({
    email, password: 'Solutions115.', email_confirm: true,
    user_metadata: { employee_number: 'EO1303', first_name: 'Elihu', last_name: 'Ochoa', role: 'admin' }
  });
  if (error) { console.error(error); process.exit(1); }
  user = data.user;
  console.log('created', user.id);
} else { console.log('exists', user.id); }
await sb.from('user_roles').upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id,role' });
await sb.from('employees').upsert({ id: user.id, employee_number: 'EO1303', first_name: 'Elihu', last_name: 'Ochoa', status: 'active' });
const { data: roles } = await sb.from('user_roles').select('*').eq('user_id', user.id);
const { data: emp } = await sb.from('employees').select('*').eq('id', user.id);
console.log(JSON.stringify({ roles, emp }, null, 2));
