import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vvfuioynvugksmwucuge.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("No service role key provided in env");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    storage: undefined,
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function run() {
  const email = "eo1303@universumk9.local";
  const password = "Universum2026";
  
  console.log("Checking if user exists...");
  const { data: existing, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    console.error("List Users Error:", listErr);
    return;
  }
  
  let user = existing?.users?.find(u => u.email === email);
  
  if (user) {
    console.log("User exists, updating password and confirm...");
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (updateErr) {
      console.error("Update User Error:", updateErr);
      return;
    }
  } else {
    console.log("User does not exist, creating...");
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        employee_number: "EO1303",
        first_name: "Admin",
        last_name: "Universum",
        role: "admin",
      },
    });
    if (createErr) {
      console.error("Create User Error:", createErr);
      return;
    }
    user = created.user;
  }
  
  console.log("User ID:", user.id);
  console.log("Updating role in user_roles table...");
  
  const { error: delErr } = await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
  if (delErr) {
    console.error("Delete Role Error:", delErr);
    return;
  }
  
  const { error: insErr } = await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: "admin" });
  if (insErr) {
    console.error("Insert Role Error:", insErr);
    return;
  }
  
  console.log("SUCCESS! User injected completely.");
}

run();
