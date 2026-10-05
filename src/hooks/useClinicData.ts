import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  owner_name: string;
  owner_phone: string | null;
  owner_email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Procedure {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  commission_type: "percentage" | "fixed";
  commission_value: number;
  is_active: boolean;
  created_at: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  attended_by: string;
  procedure_id: string;
  date: string;
  observations: string | null;
  diagnosis: string | null;
  notes: string | null;
  anamnesis: string | null;
  created_at: string;
  // Joined
  patient?: Patient;
  employee?: { id: string; first_name: string; last_name: string; employee_number: string };
  procedure?: Procedure;
  prescriptions?: ConsultationPrescription[];
}

export interface ConsultationPrescription {
  id: string;
  consultation_id: string;
  item_id: string;
  quantity: number;
  instructions: string | null;
  item?: { id: string; name: string; sku: string; unit: string };
}

export interface Guardia {
  id: string;
  employee_id: string;
  date: string;
  type: "entre_semana" | "fin_de_semana";
  amount: number;
  notes: string | null;
  created_at: string;
  employee?: { id: string; first_name: string; last_name: string; employee_number: string };
}

export interface Commission {
  id: string;
  employee_id: string;
  consultation_id: string | null;
  procedure_id: string | null;
  amount: number | null;
  period: string;
  status: "pending" | "approved" | "paid" | "rejected";
  notes: string | null;
  created_at: string;
  employee?: { id: string; first_name: string; last_name: string; employee_number: string };
  procedure?: Procedure;
  consultation?: Consultation;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });
}

export function usePatient(id: string | undefined | null) {
  return useQuery({
    queryKey: ["patient", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Patient | null;
    },
  });
}

export function useProcedures() {
  return useQuery({
    queryKey: ["procedures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedures")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Procedure[];
    },
  });
}

export function useConsultations(limit?: number, patientId?: string) {
  return useQuery({
    queryKey: ["consultations", limit, patientId],
    queryFn: async () => {
      // Step 1: Fetch consultations with patient and procedure joins
      let q = supabase
        .from("consultations")
        .select(`
          *,
          patient:patients(id,name,species,breed,owner_name,owner_phone),
          procedure:procedures(id,name,base_price,commission_type,commission_value,is_active)
        `)
        .order("date", { ascending: false });
      if (limit) q = q.limit(limit);
      if (patientId) q = q.eq("patient_id", patientId);

      const consultRes = await q;
      if (consultRes.error) throw consultRes.error;

      const consultations = (consultRes.data ?? []) as any[];

      // Step 2: Fetch employees — gracefully ignore errors
      const empRes = await supabase
        .from("employees")
        .select("id,first_name,last_name,employee_number");
      const empMap = new Map(
        ((empRes.data ?? []) as any[]).map((e) => [e.id, e])
      );

      // Step 3: Fetch prescriptions separately to avoid fragile nested join
      const consultIds = consultations.map((c) => c.id);
      let rxMap = new Map<string, any[]>();
      if (consultIds.length > 0) {
        const rxRes = await supabase
          .from("consultation_prescriptions")
          .select("id,consultation_id,item_id,quantity,instructions")
          .in("consultation_id", consultIds);
        if (!rxRes.error && rxRes.data) {
          // Fetch items separately
          const itemIds = [...new Set(rxRes.data.map((r: any) => r.item_id).filter(Boolean))];
          let itemMap = new Map<string, any>();
          if (itemIds.length > 0) {
            const itemRes = await supabase
              .from("items")
              .select("id,name,sku")
              .in("id", itemIds as string[]);
            if (!itemRes.error && itemRes.data) {
              itemRes.data.forEach((it: any) => itemMap.set(it.id, it));
            }
          }
          rxRes.data.forEach((rx: any) => {
            const list = rxMap.get(rx.consultation_id) ?? [];
            list.push({ ...rx, item: itemMap.get(rx.item_id) });
            rxMap.set(rx.consultation_id, list);
          });
        }
      }

      return consultations.map((c) => ({
        ...c,
        employee: empMap.get(c.attended_by),
        prescriptions: rxMap.get(c.id) ?? [],
      })) as Consultation[];
    },
  });
}

export function useGuardias(period?: string) {
  return useQuery({
    queryKey: ["guardias", period],
    queryFn: async () => {
      let q = supabase
        .from("guardias")
        .select("*")
        .order("date", { ascending: false });
      if (period) {
        const [year, month] = period.split("-");
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const from = `${year}-${month}-01`;
        const to = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
        q = q.gte("date", from).lte("date", to);
      }

      const [res, empRes] = await Promise.all([
        q,
        supabase.from("employees").select("id,first_name,last_name,employee_number"),
      ]);
      if (res.error) throw res.error;
      const empMap = new Map((empRes.data ?? []).map((e) => [e.id, e]));
      return ((res.data ?? []) as any[]).map((g) => ({
        ...g,
        employee: empMap.get(g.employee_id),
      })) as Guardia[];
    },
  });
}

export function useCommissions(period?: string) {
  return useQuery({
    queryKey: ["commissions", period],
    queryFn: async () => {
      let q = supabase
        .from("commissions")
        .select("*, procedure:procedures(*)")
        .order("created_at", { ascending: false });
      if (period) q = q.eq("period", period);

      const [res, empRes] = await Promise.all([
        q,
        supabase.from("employees").select("id,first_name,last_name,employee_number"),
      ]);
      if (res.error) throw res.error;
      const empMap = new Map((empRes.data ?? []).map((e) => [e.id, e]));
      return ((res.data ?? []) as any[]).map((c) => ({
        ...c,
        employee: empMap.get(c.employee_id),
      })) as Commission[];
    },
  });
}

export interface WaitingRoomEntry {
  id: string;
  patient_id: string;
  checked_in_by: string | null;
  check_in_time: string;
  status: "waiting" | "in_consultation" | "discharged";
  notes: string | null;
  created_at: string;
  patient?: Patient;
  employee?: { id: string; first_name: string; last_name: string; employee_number: string };
}

export function useWaitingRoom() {
  return useQuery({
    queryKey: ["waiting_room"],
    queryFn: async () => {
      const [res, empRes] = await Promise.all([
        supabase
          .from("waiting_room")
          .select("*, patient:patients(*)")
          .order("check_in_time", { ascending: true }),
        supabase.from("employees").select("id,first_name,last_name,employee_number"),
      ]);
      if (res.error) throw res.error;
      const empMap = new Map((empRes.data ?? []).map((e) => [e.id, e]));
      return ((res.data ?? []) as any[]).map((w) => ({
        ...w,
        employee: w.checked_in_by ? empMap.get(w.checked_in_by) : undefined,
      })) as WaitingRoomEntry[];
    },
  });
}

export interface PatientDocument {
  id: string;
  patient_id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  document_date: string;
  description: string | null;
  employee?: { id: string; first_name: string; last_name: string };
}

export function usePatientDocuments(patientId: string | undefined | null) {
  return useQuery({
    queryKey: ["patient_documents", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      if (!patientId) return [];
      const [docRes, empRes] = await Promise.all([
        supabase
          .from("patient_documents")
          .select("*")
          .eq("patient_id", patientId)
          .order("document_date", { ascending: false }),
        supabase.from("employees").select("id,first_name,last_name"),
      ]);
      if (docRes.error) throw docRes.error;
      const empMap = new Map((empRes.data ?? []).map((e) => [e.id, e]));
      return ((docRes.data ?? []) as any[]).map((d) => ({
        ...d,
        employee: d.uploaded_by ? empMap.get(d.uploaded_by) : undefined,
      })) as PatientDocument[];
    },
  });
}

export interface PatientImaging {
  id: string;
  patient_id: string;
  study_type: "ultrasound" | "xray" | "ct_scan" | "other";
  title: string;
  date: string;
  findings: string;
  image_urls: string[];
  performed_by: string | null;
  created_at: string;
  employee?: { id: string; first_name: string; last_name: string };
}

export function usePatientImagings(patientId: string | undefined | null) {
  return useQuery({
    queryKey: ["patient_imaging", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      if (!patientId) return [];
      const [imgRes, empRes] = await Promise.all([
        supabase
          .from("patient_imaging")
          .select("*")
          .eq("patient_id", patientId)
          .order("date", { ascending: false }),
        supabase.from("employees").select("id,first_name,last_name"),
      ]);
      if (imgRes.error) throw imgRes.error;
      const empMap = new Map((empRes.data ?? []).map((e) => [e.id, e]));
      return ((imgRes.data ?? []) as any[]).map((img) => ({
        ...img,
        employee: img.performed_by ? empMap.get(img.performed_by) : undefined,
      })) as PatientImaging[];
    },
  });
}
