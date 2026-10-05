import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];
const email = process.argv[4];
const password = process.argv[5];

if (!supabaseUrl || !supabaseKey || !email || !password) {
  console.error("Uso: node setup-tenant-admin.mjs <SUPABASE_URL> <SUPABASE_SERVICE_ROLE_KEY> <ADMIN_EMAIL> <ADMIN_PASSWORD>");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log(`Creando usuario administrador: ${email}...`);
  
  let { data: { users }, error: listError } = await sb.auth.admin.listUsers();
  if (listError) {
    console.error("Error conectando a Supabase. Revisa tus credenciales.", listError);
    process.exit(1);
  }

  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email, 
      password, 
      email_confirm: true,
      user_metadata: { employee_number: 'ADMIN-01', first_name: 'Admin', last_name: 'Root', role: 'admin' }
    });
    
    if (error) { 
      console.error("Error creando el usuario:", error.message); 
      process.exit(1); 
    }
    user = data.user;
    console.log('Usuario creado exitosamente. ID:', user.id);
  } else {
    console.log('El usuario ya existe. ID:', user.id);
  }
  
  // Asignar rol
  const { error: rErr } = await sb.from('user_roles').upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' });
  if (rErr) console.error('Error asignando rol (user_roles):', rErr);
  else console.log("Rol 'admin' asignado correctamente.");

  // Crear registro de empleado
  const { error: eErr } = await sb.from('employees').upsert({ 
    id: user.id, 
    employee_number: 'ADMIN-01', 
    first_name: 'Admin', 
    last_name: 'Root', 
    status: 'active' 
  });
  if (eErr) console.error('Error creando registro de empleado:', eErr);
  else console.log("Registro de empleado creado correctamente.");

  console.log('\n¡Configuración completada! Ahora puedes iniciar sesión con este usuario.');
}

run();
