import { createContext, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";

export interface RoleContextValue {
  role: UserRoleType;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isEmpleado: boolean;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { role: authRole } = useAuth();
  let rawRole = (authRole || "empleado").toLowerCase().trim();
  if (["medico", "médico", "medicos", "médicos"].includes(rawRole)) rawRole = "médico";
  if (["recepcion", "recepción", "recepcionista", "recepcionistas"].includes(rawRole)) rawRole = "recepción";
  if (rawRole === "auxiliares") rawRole = "auxiliar";
  if (rawRole === "empleados") rawRole = "empleado";

  const role = rawRole as UserRoleType;

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    return {
      role,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isEmpleado: role === "empleado",
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
