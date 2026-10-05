import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCreateSale() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    data: {
      ticketNumber: string;
      patientId?: string | null;
      consultationId?: string | null;
      customerName: string;
      paymentMethod: "cash" | "card" | "transfer" | "credit";
      subtotal: number;
      discount: number;
      total: number;
      amountPaid: number;
      changeReturned: number;
      sessionId?: string | null;
      items: Array<{
        itemId: string;
        quantity: number;
        unitPrice: number;
        isProcedure?: boolean;
        procedureId?: string | null;
      }>;
    },
    opts?: any
  ) => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      const employeeId = user.data.user?.id;

      // 1. Crear el registro de la venta
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          ticket_number: data.ticketNumber,
          patient_id: data.patientId || null,
          consultation_id: data.consultationId || null,
          customer_name: data.customerName,
          payment_method: data.paymentMethod,
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          amount_paid: data.amountPaid,
          change_returned: data.changeReturned,
          session_id: data.sessionId || null,
          created_by: employeeId,
        })
        .select()
        .single();

      if (saleErr) throw saleErr;

      // 2. Insertar detalles de la venta (sale_items)
      const itemsToInsert = data.items.map((item) => ({
        sale_id: sale.id,
        item_id: item.isProcedure ? null : item.itemId,
        procedure_id: item.isProcedure ? item.procedureId : null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      }));

      const { error: itemsErr } = await supabase.from("sale_items").insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      // 3. Descontar del inventario mediante stock_movements (tipo 'shipped', cantidad negativa)
      for (const item of data.items) {
        if (item.isProcedure) continue; // Omitir movimientos de inventario para procedimientos clínicos
        
        const { error: movErr } = await supabase.from("stock_movements").insert({
          item_id: item.itemId,
          type: "shipped",
          quantity: -item.quantity,
          notes: `Venta POS ticket ${data.ticketNumber}`,
          performed_by: employeeId,
        });
        if (movErr) console.error("Error al registrar movimiento de stock en venta:", movErr.message);
      }

      // 4. Si es a crédito, registrar en customer_credits
      if (data.paymentMethod === "credit" && data.patientId) {
        const { error: creditErr } = await supabase.from("customer_credits").insert({
          patient_id: data.patientId,
          sale_id: sale.id,
          total_amount: data.total,
          remaining_balance: data.total,
          status: "pending",
        });
        if (creditErr) throw creditErr;
      }

      // 5. Si viene de una sesión de caja, actualizar los montos esperados en cash_sessions
      if (data.sessionId) {
        const { data: currentSession } = await supabase
          .from("cash_sessions")
          .select("*")
          .eq("id", data.sessionId)
          .single();

        if (currentSession) {
          const updates: any = {};
          if (data.paymentMethod === "cash") {
            updates.expected_cash = currentSession.expected_cash + data.total;
          } else if (data.paymentMethod === "card") {
            updates.card_sales = currentSession.card_sales + data.total;
          } else if (data.paymentMethod === "transfer") {
            updates.transfer_sales = currentSession.transfer_sales + data.total;
          } else if (data.paymentMethod === "credit") {
            updates.credit_sales = currentSession.credit_sales + data.total;
          }

          await supabase.from("cash_sessions").update(updates).eq("id", data.sessionId);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["active_cash_session"] });
      queryClient.invalidateQueries({ queryKey: ["customer_credits"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });

      opts?.onSuccess?.(sale);
    } catch (e: any) {
      setError(e);
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}

export function useOpenCashSession() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (initialCash: number, opts?: any) => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      const employeeId = user.data.user?.id;

      const { data: session, error } = await supabase
        .from("cash_sessions")
        .insert({
          opened_by: employeeId,
          initial_cash: initialCash,
          expected_cash: initialCash,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["active_cash_session"] });
      queryClient.invalidateQueries({ queryKey: ["cash_sessions"] });

      opts?.onSuccess?.(session);
    } catch (e: any) {
      setError(e);
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}

export function useCloseCashSession() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    data: {
      sessionId: string;
      actualCash: number;
      notes?: string;
    },
    opts?: any
  ) => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      const employeeId = user.data.user?.id;

      const { data: currentSession } = await supabase
        .from("cash_sessions")
        .select("expected_cash")
        .eq("id", data.sessionId)
        .single();

      if (!currentSession) throw new Error("No se encontró la sesión de caja activa.");

      const diff = data.actualCash - currentSession.expected_cash;

      const { data: closedSession, error } = await supabase
        .from("cash_sessions")
        .update({
          closed_by: employeeId,
          closed_at: new Date().toISOString(),
          actual_cash: data.actualCash,
          cash_difference: diff,
          notes: data.notes || null,
          status: "closed",
        })
        .eq("id", data.sessionId)
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["active_cash_session"] });
      queryClient.invalidateQueries({ queryKey: ["cash_sessions"] });

      opts?.onSuccess?.(closedSession);
    } catch (e: any) {
      setError(e);
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}

export function useRecordCashMovement() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    data: {
      sessionId: string;
      type: "inflow" | "outflow";
      amount: number;
      reason: string;
    },
    opts?: any
  ) => {
    setIsLoading(true);
    try {
      // 1. Insertar movimiento
      const { error: movErr } = await supabase.from("cash_movements").insert({
        session_id: data.sessionId,
        type: data.type,
        amount: data.amount,
        reason: data.reason,
      });

      if (movErr) throw movErr;

      // 2. Modificar el esperado en la sesión de caja
      const { data: session } = await supabase
        .from("cash_sessions")
        .select("expected_cash")
        .eq("id", data.sessionId)
        .single();

      if (session) {
        const delta = data.type === "inflow" ? data.amount : -data.amount;
        await supabase
          .from("cash_sessions")
          .update({ expected_cash: session.expected_cash + delta })
          .eq("id", data.sessionId);
      }

      queryClient.invalidateQueries({ queryKey: ["cash_movements", data.sessionId] });
      queryClient.invalidateQueries({ queryKey: ["active_cash_session"] });

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

export function usePayCustomerCredit() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    data: {
      creditId: string;
      amountPaid: number;
      sessionId?: string | null;
    },
    opts?: any
  ) => {
    setIsLoading(true);
    try {
      // 1. Obtener crédito
      const { data: credit } = await supabase
        .from("customer_credits")
        .select("remaining_balance")
        .eq("id", data.creditId)
        .single();

      if (!credit) throw new Error("No se encontró el crédito.");

      const newBalance = Math.max(0, credit.remaining_balance - data.amountPaid);
      const newStatus = newBalance === 0 ? "paid" : "pending";

      // 2. Actualizar balance
      const { error: updErr } = await supabase
        .from("customer_credits")
        .update({
          remaining_balance: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.creditId);

      if (updErr) throw updErr;

      // 3. Si se pagó con efectivo en sesión abierta, registrar ingreso en caja
      if (data.sessionId && data.amountPaid > 0) {
        const { error: movErr } = await supabase.from("cash_movements").insert({
          session_id: data.sessionId,
          type: "inflow",
          amount: data.amountPaid,
          reason: `Abono de cuenta por cobrar cliente`,
        });

        if (!movErr) {
          const { data: session } = await supabase
            .from("cash_sessions")
            .select("expected_cash")
            .eq("id", data.sessionId)
            .single();

          if (session) {
            await supabase
              .from("cash_sessions")
              .update({ expected_cash: session.expected_cash + data.amountPaid })
              .eq("id", data.sessionId);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["customer_credits"] });
      queryClient.invalidateQueries({ queryKey: ["active_cash_session"] });

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

export function usePaySupplierCredit() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (
    data: {
      creditId: string;
      amountPaid: number;
      sessionId?: string | null;
    },
    opts?: any
  ) => {
    setIsLoading(true);
    try {
      const { data: credit } = await supabase
        .from("supplier_credits")
        .select("remaining_balance")
        .eq("id", data.creditId)
        .single();

      if (!credit) throw new Error("No se encontró la deuda.");

      const newBalance = Math.max(0, credit.remaining_balance - data.amountPaid);
      const newStatus = newBalance === 0 ? "paid" : "pending";

      const { error: updErr } = await supabase
        .from("supplier_credits")
        .update({
          remaining_balance: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.creditId);

      if (updErr) throw updErr;

      // Si fue retiro de caja para pagar al proveedor
      if (data.sessionId && data.amountPaid > 0) {
        const { error: movErr } = await supabase.from("cash_movements").insert({
          session_id: data.sessionId,
          type: "outflow",
          amount: data.amountPaid,
          reason: `Pago de cuenta por pagar a proveedor`,
        });

        if (!movErr) {
          const { data: session } = await supabase
            .from("cash_sessions")
            .select("expected_cash")
            .eq("id", data.sessionId)
            .single();

          if (session) {
            await supabase
              .from("cash_sessions")
              .update({ expected_cash: session.expected_cash - data.amountPaid })
              .eq("id", data.sessionId);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["supplier_credits"] });
      queryClient.invalidateQueries({ queryKey: ["active_cash_session"] });

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
