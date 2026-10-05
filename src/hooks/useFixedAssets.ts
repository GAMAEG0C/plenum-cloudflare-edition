import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FixedAsset {
  id: string;
  name: string;
  serial_number: string | null;
  model: string | null;
  category: string;
  purchase_date: string | null;
  purchase_price: number | null;
  location_id: string | null;
  status: 'active' | 'maintenance' | 'retired';
  next_maintenance_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetMaintenanceLog {
  id: string;
  asset_id: string;
  maintenance_date: string;
  description: string;
  cost: number | null;
  performed_by: string;
  next_due_date: string | null;
  created_at: string;
}

export function useFixedAssets() {
  return useQuery({
    queryKey: ["fixed_assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as FixedAsset[];
    },
  });
}

export function useMaintenanceLogs(assetId?: string) {
  return useQuery({
    queryKey: ["asset_maintenance_logs", assetId],
    queryFn: async () => {
      let q = supabase
        .from("asset_maintenance_logs")
        .select("*")
        .order("maintenance_date", { ascending: false });
        
      if (assetId) {
        q = q.eq("asset_id", assetId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AssetMaintenanceLog[];
    },
    enabled: assetId !== undefined, // Fetch all if undefined, but if passed conditionally
  });
}

export function useCreateFixedAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (asset: Partial<FixedAsset>) => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .insert(asset)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed_assets"] });
    },
  });
}

export function useCreateMaintenanceLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: Partial<AssetMaintenanceLog>) => {
      const { data, error } = await supabase
        .from("asset_maintenance_logs")
        .insert(log)
        .select()
        .single();
      if (error) throw error;

      // Update the next_maintenance_date and status on the asset if provided
      if (log.asset_id && log.next_due_date) {
        await supabase
          .from("fixed_assets")
          .update({ 
            next_maintenance_date: log.next_due_date,
            status: 'active' 
          })
          .eq("id", log.asset_id);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["asset_maintenance_logs"] });
      queryClient.invalidateQueries({ queryKey: ["fixed_assets"] });
    },
  });
}

export function useUpdateAssetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed_assets"] });
    },
  });
}
