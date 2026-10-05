import type { UserRoleType } from "@/lib/roles";

/** Maps route paths to the minimum roles allowed */
const ROUTE_ACCESS: Record<string, UserRoleType[]> = {
  // Operaciones — todos los roles
  "/app/dashboard":        ["admin", "manager", "médico", "auxiliar", "empleado", "recepción"],
  "/app/catalog":          ["admin", "manager", "médico", "auxiliar", "empleado", "recepción"],
  "/app/salidas":          ["admin", "manager", "médico", "auxiliar", "empleado", "recepción"],
  "/app/checador":         ["admin", "manager", "médico", "auxiliar", "empleado", "recepción"],
  "/app/help":             ["admin", "manager", "médico", "auxiliar", "empleado", "recepción"],

  // Clínica — médicos, managers, recepción y admin
  "/app/agenda":           ["admin", "manager", "médico", "recepción"],
  "/app/sala-espera":      ["admin", "manager", "médico", "recepción"],
  "/app/pacientes":        ["admin", "manager", "médico", "recepción"],
  "/app/hospitalizacion":  ["admin", "manager", "médico", "auxiliar"],
  "/app/consultas":        ["admin", "manager", "médico", "recepción"],

  // Historial de movimientos — managers y admin (y ventas/cuentas para recepción)
  "/app/movements":        ["admin", "manager"],
  "/app/locations":        ["admin", "manager"],
  "/app/suppliers":        ["admin", "manager"],
  "/app/purchase-orders":  ["admin", "manager"],
  "/app/analytics":        ["admin", "manager"],
  "/app/finanzas":         ["admin", "manager"],
  "/app/ventas":           ["admin", "manager", "recepción"],
  "/app/cuentas":          ["admin", "manager", "recepción"],

  // Comisiones — solo admin y manager
  "/app/comisiones":       ["admin", "manager"],

  // Administración — solo admin
  "/app/settings":         ["admin"],
  "/app/empleados":        ["admin"],
  "/app/nomina":           ["admin"],
  "/app/activos":          ["admin"],
};

/**
 * Returns true if the given role can access the path.
 * Unknown paths default to admin-only.
 */
export function canAccessRoute(path: string, role: string | null): boolean {
  if (!role) return false;
  
  let normalizedRole = role.toLowerCase().trim();
  if (["medico", "médico", "medicos", "médicos"].includes(normalizedRole)) normalizedRole = "médico";
  if (["recepcion", "recepción", "recepcionista", "recepcionistas"].includes(normalizedRole)) normalizedRole = "recepción";
  if (normalizedRole === "auxiliares") normalizedRole = "auxiliar";
  if (normalizedRole === "empleados") normalizedRole = "empleado";

  let normalizedPath = path;
  if (path.startsWith("/app/pacientes/")) {
    normalizedPath = "/app/pacientes";
  }
  const allowed = ROUTE_ACCESS[normalizedPath];
  if (!allowed) return normalizedRole === "admin";
  return allowed.includes(normalizedRole as UserRoleType);
}
