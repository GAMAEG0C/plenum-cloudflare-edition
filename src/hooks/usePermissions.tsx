import { type ReactNode } from "react";
import { useRole } from "@/hooks/useRole";
import type { UserRoleType } from "@/lib/roles";

type PermissionAction =
  | "create_item" | "edit_item" | "delete_item"
  | "log_movement" | "create_po" | "approve_request"
  | "manage_users" | "view_analytics" | "export_data"
  | "create_request" | "access_settings" | "manage_suppliers"
  | "log_consultation" | "manage_patients" | "view_commissions"
  | "manage_procedures" | "log_guardia";

const ACTION_ROLES: Record<PermissionAction, UserRoleType[]> = {
  create_item:        ["admin", "manager"],
  edit_item:          ["admin", "manager"],
  delete_item:        ["admin", "manager"],
  log_movement:       ["admin", "manager", "médico", "auxiliar", "empleado", "recepción"],
  create_po:          ["admin", "manager"],
  approve_request:    ["admin", "manager"],
  manage_users:       ["admin"],
  view_analytics:     ["admin", "manager"],
  export_data:        ["admin", "manager"],
  create_request:     ["admin", "manager", "médico", "auxiliar", "empleado", "recepción"],
  access_settings:    ["admin"],
  manage_suppliers:   ["admin", "manager"],
  // Clínica
  log_consultation:   ["admin", "manager", "médico"],
  manage_patients:    ["admin", "manager", "médico", "recepción"],
  view_commissions:   ["admin", "manager"],
  manage_procedures:  ["admin"],
  log_guardia:        ["admin", "manager"],
};

export function usePermissions() {
  const { role } = useRole();

  const can = (action: PermissionAction): boolean => {
    let normalizedRole = role.toLowerCase().trim() as UserRoleType;
    if (["medico", "médico", "medicos", "médicos"].includes(normalizedRole as string)) normalizedRole = "médico";
    if (["recepcion", "recepción", "recepcionista", "recepcionistas"].includes(normalizedRole as string)) normalizedRole = "recepción";
    if (normalizedRole as any === "auxiliares") normalizedRole = "auxiliar";
    if (normalizedRole as any === "empleados") normalizedRole = "empleado";
    return ACTION_ROLES[action]?.includes(normalizedRole) ?? false;
  };

  return { can };
}

interface PermissionGateProps {
  permission: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
