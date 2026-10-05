import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useAttendance(employeeId?: string): QueryResult<any[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["attendance", employeeId],
    queryFn: async () => {
      let q = supabase
        .from("employee_attendance")
        .select(`
          *,
          employees (employee_number, first_name, last_name)
        `)
        .order("clock_in", { ascending: false });

      if (employeeId) {
        q = q.eq("employee_id", employeeId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useActiveClockIn(employeeId?: string): QueryResult<any | null> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["active_clock_in", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .is("clock_out", null)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
    enabled: !!employeeId,
  });
  return { data: data || null, isLoading, error: error as Error | null };
}

export function useMedicalShifts(employeeId?: string): QueryResult<any[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["medical_shifts", employeeId],
    queryFn: async () => {
      let q = supabase
        .from("medical_shifts")
        .select(`
          *,
          employees (employee_number, first_name, last_name)
        `)
        .order("shift_date", { ascending: false });

      if (employeeId) {
        q = q.eq("employee_id", employeeId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export interface PayrollReceipt {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  base_salary_amount: number;
  commissions_amount: number;
  deductions_amount: number;
  bonuses_amount: number;
  net_pay: number;
  status: 'draft' | 'paid';
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: { first_name: string; last_name: string; employee_number: string; base_salary: number };
}

export function usePayrollReceipts(periodStart?: string, periodEnd?: string): QueryResult<PayrollReceipt[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["payroll_receipts", periodStart, periodEnd],
    queryFn: async () => {
      let q = supabase
        .from("payroll_receipts")
        .select(`
          *,
          employee:employees (first_name, last_name, employee_number, base_salary)
        `)
        .order("period_start", { ascending: false });

      if (periodStart) q = q.gte("period_start", periodStart);
      if (periodEnd) q = q.lte("period_end", periodEnd);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PayrollReceipt[];
    },
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

