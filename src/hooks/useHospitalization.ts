import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Hospitalization {
  id: string;
  patient_id: string;
  attending_doctor_id: string | null;
  cage_number: string | null;
  reason: string;
  critical_level: 'estable' | 'delicado' | 'crítico';
  status: 'admitted' | 'discharged';
  admission_date: string;
  discharge_date: string | null;
  patient?: { name: string; species: string; breed: string; owner_name: string };
  doctor?: { first_name: string; last_name: string };
}

export interface HospitalTreatment {
  id: string;
  hospitalization_id: string;
  medication_or_task: string;
  dosage: string | null;
  frequency_hours: number | null;
  next_due_time: string;
  status: 'pending' | 'administered' | 'skipped';
  administered_at: string | null;
  administered_by_id: string | null;
  notes: string | null;
  administered_by?: { first_name: string; last_name: string };
}

export interface HospitalNote {
  id: string;
  hospitalization_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { first_name: string; last_name: string };
}

export function useActiveHospitalizations() {
  return useQuery({
    queryKey: ["hospitalizations", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitalizations")
        .select(`
          *,
          patient:patients(name, species, breed, owner_name),
          doctor:employees!attending_doctor_id(first_name, last_name)
        `)
        .eq("status", "admitted")
        .order("admission_date", { ascending: false });
      if (error) throw error;
      return (data || []) as Hospitalization[];
    },
  });
}

export function usePatientHospitalizations(patientId?: string) {
  return useQuery({
    queryKey: ["hospitalizations", "patient", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitalizations")
        .select(`
          *,
          doctor:employees!attending_doctor_id(first_name, last_name)
        `)
        .eq("patient_id", patientId)
        .order("admission_date", { ascending: false });
      if (error) throw error;
      return (data || []) as Hospitalization[];
    },
    enabled: !!patientId,
  });
}

export function useHospitalTreatments(hospitalizationId?: string) {
  return useQuery({
    queryKey: ["hospital_treatments", hospitalizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_treatments")
        .select(`
          *,
          administered_by:employees!administered_by_id(first_name, last_name)
        `)
        .eq("hospitalization_id", hospitalizationId)
        .order("next_due_time", { ascending: true });
      if (error) throw error;
      return (data || []) as HospitalTreatment[];
    },
    enabled: !!hospitalizationId,
  });
}

export function useHospitalNotes(hospitalizationId?: string) {
  return useQuery({
    queryKey: ["hospital_notes", hospitalizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_notes")
        .select(`
          *,
          author:employees!author_id(first_name, last_name)
        `)
        .eq("hospitalization_id", hospitalizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as HospitalNote[];
    },
    enabled: !!hospitalizationId,
  });
}

export function useAdmitPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Hospitalization>) => {
      const { data, error } = await supabase
        .from("hospitalizations")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hospitalizations"] }),
  });
}

export function useDischargePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("hospitalizations")
        .update({ 
          status: 'discharged',
          discharge_date: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hospitalizations"] }),
  });
}

export function useAddTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<HospitalTreatment>) => {
      const { data, error } = await supabase
        .from("hospital_treatments")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["hospital_treatments", vars.hospitalization_id] }),
  });
}

export function useAdministerTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employeeId, createNext, nextVars }: { id: string, employeeId: string, createNext?: boolean, nextVars?: Partial<HospitalTreatment> }) => {
      // 1. Mark as administered
      const { error: err1 } = await supabase
        .from("hospital_treatments")
        .update({
          status: 'administered',
          administered_at: new Date().toISOString(),
          administered_by_id: employeeId
        })
        .eq("id", id);
      if (err1) throw err1;

      // 2. Schedule next dose if recurring
      if (createNext && nextVars) {
        const { error: err2 } = await supabase
          .from("hospital_treatments")
          .insert(nextVars);
        if (err2) throw err2;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hospital_treatments"] }),
  });
}

export function useAddHospitalNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<HospitalNote>) => {
      const { data, error } = await supabase
        .from("hospital_notes")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["hospital_notes", vars.hospitalization_id] }),
  });
}
