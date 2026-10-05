import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  amount: number;
  category: string;
  payment_method: string;
  date: string;
  description: string | null;
  receipt_url: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;

  // Joined
  employee?: { first_name: string; last_name: string };
}

export function useExpenses(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["expenses", startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("expenses")
        .select(`
          *,
          employee:recorded_by(first_name, last_name)
        `)
        .order("date", { ascending: false });

      if (startDate) q = q.gte("date", startDate);
      if (endDate) q = q.lte("date", endDate);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Expense[];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Partial<Expense>) => {
      const { data, error } = await supabase
        .from("expenses")
        .insert(expense)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useUpdatePurchaseOrderPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_status, amount_paid }: { id: string, payment_status: string, amount_paid: number }) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update({ payment_status, amount_paid })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
  });
}
