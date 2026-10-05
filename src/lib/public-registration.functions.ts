import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const employeeNumberRegex = /^[A-Z]{2}\d{4}$/;
const registerSchema = z.object({
  employee_number: z.string().trim().toUpperCase().regex(employeeNumberRegex),
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  password: z.string().min(6).max(72),
  role: z.enum(["admin", "manager", "empleado"]),
});

export const publicRegisterEmployee = createServerFn({ method: "POST" })
  .inputValidator((data) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    const email = `${data.employee_number}@universumk9.local`.toLowerCase();
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
    if (error) throw new Error(error.message.includes("registered") ? "Ese No. de empleado ya existe." : error.message);

    const userId = created.user?.id;
    if (!userId) throw new Error("No se pudo crear el usuario.");

    await supabaseAdmin.from("employees").upsert({
      id: userId,
      employee_number: data.employee_number,
      first_name: data.first_name,
      last_name: data.last_name,
      status: "active",
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    return { employee_number: data.employee_number };
  });