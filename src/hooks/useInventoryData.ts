import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

import type {
  Item,
  Category,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
  ItemBatch,
} from "@/types/inventory";
import type { ItemFilters, StockSummary } from "@/lib/demo-store";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useItems(filters?: ItemFilters): QueryResult<Item[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['items', filters],
    queryFn: async () => {
      const { data: items, error } = await supabase.from('items').select('*');
      if (error) throw error;
      return items.map((i: any) => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        description: i.description || '',
        status: i.status as any,
        currentStock: Number(i.current_stock) || 0,
        unit: i.unit || 'pz',
        costPrice: Number(i.cost_price) || 0,
        sellingPrice: Number(i.selling_price) || 0,
        reorderPoint: Number(i.reorder_point) || 0,
        reorderQuantity: Number(i.reorder_quantity) || 0,
        minStock: Number(i.min_stock) || 0,
        categoryId: i.category_id || null,
        supplierId: i.supplier_id || null,
        locationId: i.location_id || null,
        barcode: i.barcode || null,
        imageUrl: null,
        customFields: {},
        createdAt: i.created_at,
        updatedAt: i.updated_at
      })) as Item[];
    }
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useItemById(id: string): QueryResult<Item | undefined> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['item', id],
    queryFn: async () => {
      const { data: item, error } = await supabase.from('items').select('*').eq('id', id).single();
      if (error) throw error;
      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        description: item.description || '',
        status: item.status as any,
        currentStock: Number(item.current_stock) || 0,
        unit: item.unit || 'pz',
        minStock: Number(item.min_stock) || 0,
        reorderPoint: Number(item.reorder_point) || 0,
        reorderQuantity: Number(item.reorder_quantity) || 0,
        costPrice: Number(item.cost_price) || 0,
        sellingPrice: Number(item.selling_price) || 0,
        categoryId: item.category_id || null,
        supplierId: item.supplier_id || null,
        locationId: item.location_id || null,
        barcode: item.barcode || null,
        imageUrl: null,
        customFields: {},
        createdAt: item.created_at,
        updatedAt: item.updated_at
      } as Item;
    }
  });
  return { data, isLoading, error: error as Error | null };
}


export function useCategories(): QueryResult<Category[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data: categories, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        parentId: c.parent_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })) as Category[];
    }
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useSuppliers(): QueryResult<Supplier[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data: suppliers, error } = await supabase.from('suppliers').select('*');
      if (error) throw error;
      return suppliers.map((s: any) => ({
        id: s.id,
        name: s.name,
        contactName: s.contact_name || '',
        email: s.email || '',
        phone: s.phone || '',
        address: s.address || '',
        leadTimeDays: Number(s.lead_time_days) || 0,
        rating: Number(s.rating) || 0,
        isActive: s.is_active !== false,
        notes: s.notes || '',
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })) as Supplier[];
    }
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useLocations(): QueryResult<Location[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data: locations, error } = await supabase.from('locations').select('*');
      if (error) throw error;
      return locations.map((l: any) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        parentId: l.parent_id,
        description: l.description || '',
        address: l.address || '',
        isActive: l.is_active !== false,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      })) as Location[];
    }
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useMovements(limit?: number): QueryResult<StockMovement[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['movements', limit],
    queryFn: async () => {
      let q = supabase.from('stock_movements').select('*').order('created_at', { ascending: false });
      if (limit) q = q.limit(limit);

      const [movRes, empRes] = await Promise.all([
        q,
        supabase.from('employees').select('id, employee_number, first_name, last_name')
      ]);

      if (movRes.error) throw movRes.error;
      
      const emps = empRes.data || [];
      const empMap = new Map(
        emps.map((e: any) => [
          e.id, 
          `${e.employee_number} - ${e.first_name} ${e.last_name}`.trim()
        ])
      );

      return movRes.data.map((m: any) => ({
        id: m.id,
        itemId: m.item_id,
        type: m.type as any,
        quantity: Number(m.quantity),
        notes: m.notes || '',
        performedBy: empMap.get(m.performed_by) || m.performed_by || '',
        createdAt: m.created_at,
        fromLocationId: null,
        toLocationId: null,
        reference: '',
        batchNumber: m.batch_number || null,
        expiryDate: m.expiry_date || null
      })) as StockMovement[];
    }
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useStockSummary(): QueryResult<StockSummary> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stockSummary'],
    queryFn: async () => {
      const { data: items, error } = await supabase.from('items').select('status, current_stock, reorder_point');
      if (error) throw error;
      
      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;
      
      items.forEach((item: any) => {
        const qty = Number(item.current_stock) || 0;
        const reorder = Number(item.reorder_point) || 0;
        if (qty <= 0) outOfStock++;
        else if (qty <= reorder) lowStock++;
        else inStock++;
      });
      
      return {
        total: items.length,
        inStock,
        lowStock,
        outOfStock
      };
    }
  });
  return { data: data || { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }, isLoading, error: error as Error | null };
}

export function usePurchaseOrders(): QueryResult<PurchaseOrder[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const { data: pos, error } = await supabase.from('purchase_orders').select(`
        *,
        purchase_order_items (*)
      `);
      if (error) throw error;
      return pos.map((po: any) => ({
        id: po.id,
        orderNumber: po.order_number,
        supplierId: po.supplier_id,
        status: po.status as any,
        totalCost: Number(po.total_cost),
        expectedDelivery: po.expected_delivery,
        notes: po.notes || '',
        paymentStatus: po.payment_status || 'unpaid',
        amountPaid: Number(po.amount_paid) || 0,
        createdBy: po.created_by,
        createdAt: po.created_at,
        updatedAt: po.updated_at,
        items: (po.purchase_order_items || []).map((poi: any) => ({
          id: poi.id,
          purchaseOrderId: poi.purchase_order_id,
          itemId: poi.item_id,
          quantityOrdered: Number(poi.quantity_ordered),
          quantityReceived: Number(poi.quantity_received),
          unitCost: Number(poi.unit_cost)
        }))
      })) as PurchaseOrder[];
    }
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useRequests(): QueryResult<InventoryRequest[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory_requests'],
    queryFn: async () => {
      const { data: reqs, error } = await supabase.from('inventory_requests').select(`
        *,
        request_items (*)
      `);
      if (error) throw error;
      return reqs.map((req: any) => ({
        id: req.id,
        requestNumber: req.request_number,
        title: req.title,
        status: req.status as any,
        priority: req.priority as any,
        requestedBy: req.requested_by,
        approvedBy: req.approved_by,
        reason: req.reason || '',
        declineReason: req.decline_reason,
        createdAt: req.created_at,
        updatedAt: req.updated_at,
        items: (req.request_items || []).map((ri: any) => ({
          id: ri.id,
          requestId: ri.request_id,
          itemId: ri.item_id,
          quantity: Number(ri.quantity),
          notes: ri.notes || ''
        }))
      })) as InventoryRequest[];
    }
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

export function useItemBatches(itemId?: string): QueryResult<ItemBatch[]> {
  const { data, isLoading, error } = useQuery({
    queryKey: ['item_batches', itemId],
    queryFn: async () => {
      let query = supabase.from('item_batches').select('*').order('created_at', { ascending: false });
      if (itemId) {
        query = query.eq('item_id', itemId);
      }
      const { data: batches, error } = await query;
      if (error) throw error;
      return (batches || []).map((b: any) => ({
        id: b.id,
        itemId: b.item_id,
        batchNumber: b.batch_number,
        expiryDate: b.expiry_date,
        initialQuantity: Number(b.initial_quantity),
        currentQuantity: Number(b.current_quantity),
        createdAt: b.created_at,
        updatedAt: b.updated_at
      })) as ItemBatch[];
    }
  });
  return { data: data || [], isLoading, error: error as Error | null };
}

