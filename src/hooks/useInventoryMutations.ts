import { useCallback, useState } from "react";
import type {
  Item,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
} from "@/types/inventory";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCreateItem() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (data: Item, opts?: any) => {
    setIsLoading(true);
    try {
      const payload: any = {
        sku: data.sku || `SKU-${Date.now()}`,
        name: data.name,
        description: data.description || '',
        unit: data.unit || 'pz',
        status: data.status || 'active',
        current_stock: data.currentStock ?? 0,
        reorder_point: data.reorderPoint ?? 0,
        reorder_quantity: (data as any).reorderQuantity ?? 0,
        min_stock: data.minStock ?? 0,
        cost_price: data.costPrice ?? 0,
        selling_price: data.sellingPrice ?? 0,
        category_id: data.categoryId || null,
        supplier_id: data.supplierId || null,
        location_id: data.locationId || null,
        barcode: data.barcode || null,
      };

      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      if (data.id && isUuid(data.id)) {
        payload.id = data.id;
      }

      const { data: inserted, error } = await supabase
        .from('items')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
      opts?.onSuccess?.(inserted);
    } catch (e: any) {
      setError(e);
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };
  return { mutate, isLoading, error };
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async ({ id, updates }: { id: string; updates: Partial<Item> }, opts?: any) => {
    setIsLoading(true);
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.sku !== undefined) payload.sku = updates.sku;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.currentStock !== undefined) payload.current_stock = updates.currentStock;
      if (updates.unit !== undefined) payload.unit = updates.unit;
      if (updates.reorderPoint !== undefined) payload.reorder_point = updates.reorderPoint;
      if ((updates as any).reorderQuantity !== undefined) payload.reorder_quantity = (updates as any).reorderQuantity;
      if (updates.minStock !== undefined) payload.min_stock = updates.minStock;
      if (updates.costPrice !== undefined) payload.cost_price = updates.costPrice;
      if (updates.sellingPrice !== undefined) payload.selling_price = updates.sellingPrice;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.categoryId !== undefined) payload.category_id = updates.categoryId || null;
      if (updates.supplierId !== undefined) payload.supplier_id = updates.supplierId || null;
      if (updates.locationId !== undefined) payload.location_id = updates.locationId || null;
      if (updates.barcode !== undefined) payload.barcode = updates.barcode || null;

      const { error } = await supabase.from('items').update(payload).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
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

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: string, opts?: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['items'] });
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

export function useCreateMovement() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (data: Partial<StockMovement>, opts?: any) => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();

      // 1. Registrar el movimiento
      const { error: movErr } = await supabase.from('stock_movements').insert({
        item_id: data.itemId,
        type: data.type,
        quantity: data.quantity,
        notes: data.notes,
        performed_by: user.data.user?.id,
        batch_number: data.batchNumber || null,
        expiry_date: data.expiryDate || null
      });
      if (movErr) throw movErr;

      // 2. Actualizar stock via RPC (SECURITY DEFINER) — bypassa RLS para todos los roles
      if (data.itemId && data.quantity !== undefined) {
        const { error: stockErr } = await supabase.rpc('update_item_stock', {
          p_item_id: data.itemId,
          p_quantity_delta: data.quantity
        });
        if (stockErr) {
          // Fallback: si la función RPC aún no existe, intentar UPDATE directo
          console.warn('RPC update_item_stock falló, intentando UPDATE directo:', stockErr.message);
          const { data: currentItem } = await supabase
            .from('items').select('current_stock').eq('id', data.itemId).single();
          if (currentItem) {
            await supabase
              .from('items')
              .update({ current_stock: currentItem.current_stock + data.quantity })
              .eq('id', data.itemId);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
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

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (data: Partial<PurchaseOrder>, opts?: any) => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      const { data: po, error: poError } = await supabase.from('purchase_orders').insert({
        order_number: data.orderNumber || `PO-${Date.now()}`,
        supplier_id: data.supplierId,
        status: data.status || 'draft',
        total_cost: data.totalCost || 0,
        expected_delivery: data.expectedDelivery || null,
        notes: data.notes || '',
        created_by: user.data.user?.id
      }).select().single();
      if (poError) throw poError;

      if (data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map(item => ({
          purchase_order_id: po.id,
          item_id: item.itemId,
          quantity_ordered: item.quantityOrdered,
          quantity_received: item.quantityReceived || 0,
          unit_cost: item.unitCost
        }));
        const { error: itemsError } = await supabase.from('purchase_order_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
      
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
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

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async ({ id, updates }: { id: string; updates: Partial<PurchaseOrder> }, opts?: any) => {
    setIsLoading(true);
    try {
      const payload: any = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.expectedDelivery !== undefined) payload.expected_delivery = updates.expectedDelivery;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.totalCost !== undefined) payload.total_cost = updates.totalCost;

      const { error } = await supabase.from('purchase_orders').update(payload).eq('id', id);
      if (error) throw error;
      
      // We are skipping PO item updates for now as it's complex (delete/re-insert or upsert)
      // and mostly POs are immutable once created except for status updates.
      
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
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

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: string, opts?: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
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

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (data: Partial<Supplier>, opts?: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('suppliers').insert({
        name: data.name,
        contact_name: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        lead_time_days: data.leadTimeDays,
        rating: data.rating,
        is_active: data.isActive !== false,
        notes: data.notes
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
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

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async ({ id, updates }: { id: string; updates: Partial<Supplier> }, opts?: any) => {
    setIsLoading(true);
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.contactName !== undefined) payload.contact_name = updates.contactName;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.leadTimeDays !== undefined) payload.lead_time_days = updates.leadTimeDays;
      if (updates.rating !== undefined) payload.rating = updates.rating;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      if (updates.notes !== undefined) payload.notes = updates.notes;

      const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
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

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: string, opts?: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
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

export function useCreateRequest() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (data: Partial<InventoryRequest>, opts?: any) => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      const { data: req, error: reqError } = await supabase.from('inventory_requests').insert({
        request_number: data.requestNumber || `REQ-${Date.now()}`,
        title: data.title,
        status: data.status || 'pending',
        priority: data.priority || 'normal',
        reason: data.reason || '',
        requested_by: user.data.user?.id
      }).select().single();
      if (reqError) throw reqError;

      if (data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map(item => ({
          request_id: req.id,
          item_id: item.itemId,
          quantity: item.quantity,
          notes: item.notes || ''
        }));
        const { error: itemsError } = await supabase.from('request_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
      
      queryClient.invalidateQueries({ queryKey: ['inventory_requests'] });
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

export function useUpdateRequest() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async ({ id, updates }: { id: string; updates: Partial<InventoryRequest> }, opts?: any) => {
    setIsLoading(true);
    try {
      const payload: any = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.reason !== undefined) payload.reason = updates.reason;
      if (updates.declineReason !== undefined) payload.decline_reason = updates.declineReason;
      
      if (updates.status === 'approved' || updates.status === 'declined') {
        const user = await supabase.auth.getUser();
        payload.approved_by = user.data.user?.id;
      }

      const { error } = await supabase.from('inventory_requests').update(payload).eq('id', id);
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['inventory_requests'] });
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

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (data: Partial<Location>, opts?: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('locations').insert({
        name: data.name,
        type: data.type,
        parent_id: data.parentId,
        description: data.description,
        address: data.address,
        is_active: data.isActive !== false
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['locations'] });
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

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async ({ id, updates }: { id: string; updates: Partial<Location> }, opts?: any) => {
    setIsLoading(true);
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.parentId !== undefined) payload.parent_id = updates.parentId;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;

      const { error } = await supabase.from('locations').update(payload).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['locations'] });
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

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: string, opts?: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['locations'] });
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

// ─── Category mutations ─────────────────────────────────
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (data: Partial<import("@/types/inventory").Category>, opts?: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('categories').insert({
        name: data.name,
        description: data.description,
        parent_id: data.parentId
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async ({ id, updates }: { id: string; updates: Partial<import("@/types/inventory").Category> }, opts?: any) => {
    setIsLoading(true);
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.parentId !== undefined) payload.parent_id = updates.parentId;

      const { error } = await supabase.from('categories').update(payload).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (id: string, opts?: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['categories'] });
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
