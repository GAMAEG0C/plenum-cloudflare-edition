import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useClockIn() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (employeeId: string, opts?: any) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("employee_attendance")
        .insert({
          employee_id: employeeId,
          clock_in: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["active_clock_in", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });

      opts?.onSuccess?.(data);
    } catch (e: any) {
      setError(e);
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    data: {
      attendanceId: string;
      employeeId: string;
    },
    opts?: any
  ) => {
    setIsLoading(true);
    try {
      const { data: updated, error } = await supabase
        .from("employee_attendance")
        .update({
          clock_out: new Date().toISOString(),
        })
        .eq("id", data.attendanceId)
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["active_clock_in", data.employeeId] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });

      opts?.onSuccess?.(updated);
    } catch (e: any) {
      setError(e);
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}

export function useCreateMedicalShift() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    data: {
      employeeId: string;
      shiftDate: string;
      shiftType: "weekday" | "weekend";
      notes?: string;
    },
    opts?: any
  ) => {
    setIsLoading(true);
    try {
      const amount = data.shiftType === "weekday" ? 450 : 500;

      const { data: shift, error } = await supabase
        .from("medical_shifts")
        .upsert({
          employee_id: data.employeeId,
          shift_date: data.shiftDate,
          shift_type: data.shiftType,
          amount,
          notes: data.notes || null,
        }, { onConflict: "employee_id,shift_date" })
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["medical_shifts"] });

      opts?.onSuccess?.(shift);
    } catch (e: any) {
      setError(e);
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}

export function useDeleteMedicalShift() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (shiftId: string, opts?: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("medical_shifts").delete().eq("id", shiftId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["medical_shifts"] });

      opts?.onSuccess?.();
    } catch (e: any) {
      setError(e);
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}

export function useCreatePayrollReceipt() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (data: any, opts?: any) => {
    setIsLoading(true);
    try {
      const { data: receipt, error } = await supabase
        .from("payroll_receipts")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      
      // If it's marked as paid, we should ideally also mark the underlying commissions as paid,
      // but for simplicity we'll just invalidate the queries.
      queryClient.invalidateQueries({ queryKey: ["payroll_receipts"] });
      
      opts?.onSuccess?.(receipt);
    } catch (e: any) {
      setError(e);
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
