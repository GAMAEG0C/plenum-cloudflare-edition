import { supabase } from "@/integrations/supabase/client";
import { EMPLOYEE_NUMBER_REGEX, type AppRole, type EmployeeProfile } from "@/contexts/AuthContext";
import {
  adminCreateEmployee,
  adminResetEmployeePassword,
  adminSetEmployeeRole,
  adminSetEmployeeStatus,
} from "@/server/employees.functions";

export interface EmployeeRow extends EmployeeProfile {
  role: AppRole;
  created_at: string;
}

export async function listEmployees(): Promise<EmployeeRow[]> {
  const { data: emps, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (emps ?? []).map((e) => e.id);
  if (ids.length === 0) return [];
  const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
  return (emps ?? []).map((e) => {
    const userRoles = (roles ?? []).filter((r) => r.user_id === e.id);
    let role: AppRole = "empleado";
    if (userRoles.find((r) => r.role === "admin")) role = "admin";
    else if (userRoles.find((r) => r.role === "manager")) role = "manager";
    else if (userRoles.find((r) => r.role === "m\u00e9dico")) role = "m\u00e9dico";
    else if (userRoles.find((r) => r.role === "auxiliar")) role = "auxiliar";
    else if (userRoles.find((r) => r.role === "recepción" || r.role === "recepci\u00f3n")) role = "recepción";
    else if (userRoles[0]?.role) role = userRoles[0].role as AppRole;
    return { ...e, role } as EmployeeRow;
  });
}

export interface CreateEmployeeInput {
  employee_number: string;
  first_name: string;
  last_name: string;
  password: string;
  role: AppRole;
}

function err(e: unknown) {
  return e instanceof Error ? e.message : "Error desconocido";
}

export async function createEmployee(input: CreateEmployeeInput) {
  const num = input.employee_number.toUpperCase();
  if (!EMPLOYEE_NUMBER_REGEX.test(num)) return { error: "Formato inválido. Debe ser 2 letras + 4 dígitos." };
  if (input.password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  try {
    await adminCreateEmployee({ data: { ...input, employee_number: num } });
    return { error: null };
  } catch (e) {
    return { error: err(e) };
  }
}

export async function setEmployeeStatus(userId: string, status: "active" | "disabled") {
  try {
    await adminSetEmployeeStatus({ data: { user_id: userId, status } });
    return { error: null };
  } catch (e) {
    return { error: err(e) };
  }
}

export async function setEmployeeRole(userId: string, role: AppRole) {
  try {
    await adminSetEmployeeRole({ data: { user_id: userId, role } });
    return { error: null };
  } catch (e) {
    return { error: err(e) };
  }
}

export async function resetEmployeePassword(userId: string, password: string) {
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  try {
    await adminResetEmployeePassword({ data: { user_id: userId, password } });
    return { error: null };
  } catch (e) {
    return { error: err(e) };
  }
}
