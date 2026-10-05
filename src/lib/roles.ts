export type UserRoleType = "admin" | "manager" | "médico" | "auxiliar" | "empleado" | "recepción";

export interface RolePermissions {
  canManageItems: boolean;
  canLogMovements: boolean;
  canViewMovementsHistory: boolean;
  canManagePOs: boolean;
  canManageSuppliers: boolean;
  canApproveRequests: boolean;
  canViewAnalytics: boolean;
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canAccessPOS: boolean;
  // Clínica
  canLogConsultation: boolean;
  canManagePatients: boolean;
  canManageHospitalization: boolean;
  canViewCommissions: boolean;
  canManageProcedures: boolean;
  canLogGuardia: boolean;
}

const ROLE_PERMISSIONS: Record<UserRoleType, RolePermissions> = {
  admin: {
    canManageItems: true,
    canLogMovements: true,
    canViewMovementsHistory: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canViewAnalytics: true,
    canAccessSettings: true,
    canManageUsers: true,
    canAccessPOS: true,
    canLogConsultation: true,
    canManagePatients: true,
    canManageHospitalization: true,
    canViewCommissions: true,
    canManageProcedures: true,
    canLogGuardia: true,
  },
  manager: {
    canManageItems: true,
    canLogMovements: true,
    canViewMovementsHistory: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canViewAnalytics: true,
    canAccessSettings: false,
    canManageUsers: false,
    canAccessPOS: true,
    canLogConsultation: true,
    canManagePatients: true,
    canManageHospitalization: true,
    canViewCommissions: true,
    canManageProcedures: false,
    canLogGuardia: true,
  },
  médico: {
    canManageItems: false,
    canLogMovements: true,
    canViewMovementsHistory: false,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
    canAccessPOS: false,
    canLogConsultation: true,
    canManagePatients: true,
    canManageHospitalization: true,
    canViewCommissions: false,
    canManageProcedures: false,
    canLogGuardia: true,
  },
  auxiliar: {
    canManageItems: false,
    canLogMovements: true,
    canViewMovementsHistory: false,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
    canAccessPOS: false,
    canLogConsultation: false,
    canManagePatients: false,
    canManageHospitalization: true,
    canViewCommissions: false,
    canManageProcedures: false,
    canLogGuardia: true,
  },
  recepción: {
    canManageItems: false,
    canLogMovements: true,
    canViewMovementsHistory: false,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
    canAccessPOS: true,
    canLogConsultation: false,
    canManagePatients: true,
    canManageHospitalization: true,
    canViewCommissions: false,
    canManageProcedures: false,
    canLogGuardia: false,
  },
  empleado: {
    canManageItems: false,
    canLogMovements: true,
    canViewMovementsHistory: false,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
    canAccessPOS: false,
    canLogConsultation: false,
    canManagePatients: false,
    canManageHospitalization: false,
    canViewCommissions: false,
    canManageProcedures: false,
    canLogGuardia: true,
  },
};

export function getPermissionsForRole(role: UserRoleType | string): RolePermissions {
  // Normalize string to handle missing accents from DB and plurals
  const normalizedRole = role.toLowerCase().trim();
  if (normalizedRole === "medico" || normalizedRole === "médico" || normalizedRole === "medicos" || normalizedRole === "médicos") return ROLE_PERMISSIONS["médico"];
  if (normalizedRole === "recepcion" || normalizedRole === "recepción" || normalizedRole === "recepcionista" || normalizedRole === "recepcionistas") return ROLE_PERMISSIONS["recepción"];
  if (normalizedRole === "auxiliares") return ROLE_PERMISSIONS["auxiliar"];
  if (normalizedRole === "empleados") return ROLE_PERMISSIONS["empleado"];
  
  return ROLE_PERMISSIONS[normalizedRole as UserRoleType] ?? ROLE_PERMISSIONS["empleado"];
}
