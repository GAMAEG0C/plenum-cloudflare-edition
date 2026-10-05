import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loginFn, logoutFn, getUserFn } from "@/server/auth.actions";

export type AppRole = "admin" | "manager" | "médico" | "auxiliar" | "empleado" | "recepción";

export interface EmployeeProfile {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  status: string;
  base_salary?: number;
}

export interface AuthContextValue {
  loading: boolean;
  user: { id: string } | null;
  employee: EmployeeProfile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  signInWithEmployeeNumber: (empNumber: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const data = await getUserFn();
      if (data) {
        setUser(data.user);
        setEmployee(data.employee as EmployeeProfile);
        setRole(data.role as AppRole);
      } else {
        setUser(null);
        setEmployee(null);
        setRole(null);
      }
    } catch (err) {
      console.error("Error cargando perfil", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const signInWithEmployeeNumber = async (empNumber: string, password: string) => {
    try {
      const result = await loginFn({ data: { employeeNumber: empNumber.trim(), password } });
      if (result.error) return { error: result.error };
      
      await loadProfile();
      return { error: null };
    } catch (e) {
      return { error: "Ocurrió un error inesperado al intentar iniciar sesión." };
    }
  };

  const signOut = async () => {
    await logoutFn();
    setUser(null);
    setEmployee(null);
    setRole(null);
  };

  const refresh = async () => {
    await loadProfile();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user,
      employee,
      role,
      isAuthenticated: !!user && employee?.status !== "disabled",
      signInWithEmployeeNumber,
      signOut,
      refresh,
    }),
    [loading, user, employee, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const EMPLOYEE_NUMBER_REGEX = /^[A-Z-]+\d+$/;
