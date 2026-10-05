import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useSales(): QueryResult<any[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (
            *,
            items (name, sku, unit),
            procedures (name, base_price)
          ),
          patients (name, owner_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useActiveCashSession(): QueryResult<any | null> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["active_cash_session"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("status", "open")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
  return { data: data || null, isLoading, error: error as Error | null };
}

export function useCashSessions(): QueryResult<any[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cash_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("*")
        .order("opened_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useCashMovements(sessionId?: string): QueryResult<any[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cash_movements", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from("cash_movements")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useCustomerCredits(): QueryResult<any[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer_credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_credits")
        .select(`
          *,
          patients (name, owner_name, owner_phone),
          sales (ticket_number, total)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useSupplierCredits(): QueryResult<any[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ["supplier_credits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_credits")
        .select(`
          *,
          suppliers (name, contact_name, phone),
          purchase_orders (order_number, total_cost)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
  return { data: data || [], isLoading, error: error as Error | null };
}
