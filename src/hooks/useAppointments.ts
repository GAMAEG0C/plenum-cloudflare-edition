import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Appointment {
  id: string;
  patient_id: string | null;
  owner_name: string | null;
  pet_name: string | null;
  phone: string | null;
  reason: string;
  status: 'scheduled' | 'confirmed' | 'in_waiting_room' | 'completed' | 'cancelled';
  start_time: string;
  end_time: string;
  assigned_doctor_id: string | null;
  notes: string | null;
  whatsapp_sent: boolean;
  whatsapp_error: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  patient?: { id: string; name: string; owner_name: string };
  doctor?: { id: string; first_name: string; last_name: string };
}

export function useAppointments(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["appointments", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:patient_id(id, name, owner_name),
          doctor:assigned_doctor_id(id, first_name, last_name)
        `)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appt: Partial<Appointment>) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert(appt)
        .select()
        .single();
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
