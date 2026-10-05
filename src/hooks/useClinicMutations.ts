import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Patient, Procedure, ConsultationPrescription } from "./useClinicData";

// ─── Create Patient ───────────────────────────────────────────────────────────

export function useCreatePatient() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    data: Omit<Patient, "id" | "is_active" | "created_at">,
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("patients").insert(data);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    id: string,
    data: Partial<Patient>,
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("patients").update(data).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

// ─── Create Consultation ──────────────────────────────────────────────────────

export interface CreateConsultationInput {
  patient_id: string;
  attended_by: string;
  procedure_id: string;
  date: string;
  observations: string;
  diagnosis: string;
  notes: string;
  anamnesis: string;
  prescriptions: Array<{ item_id: string; quantity: number; instructions: string }>;
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    data: CreateConsultationInput,
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      // 1. Insert consultation
      const { data: consult, error: cErr } = await supabase
        .from("consultations")
        .insert({
          patient_id: data.patient_id,
          attended_by: data.attended_by,
          procedure_id: data.procedure_id,
          date: data.date,
          observations: data.observations,
          diagnosis: data.diagnosis,
          notes: data.notes,
          anamnesis: data.anamnesis,
        })
        .select()
        .single();
      if (cErr) throw cErr;

      // 2. Insert prescriptions if any
      if (data.prescriptions.length > 0) {
        const { error: pErr } = await supabase
          .from("consultation_prescriptions")
          .insert(
            data.prescriptions.map((p) => ({
              consultation_id: consult.id,
              item_id: p.item_id,
              quantity: p.quantity,
              instructions: p.instructions,
            }))
          );
        if (pErr) throw pErr;
      }

      // 3. Create commission automatically via RPC
      const period = new Date(data.date).toISOString().slice(0, 7); // "2026-06"
      await supabase.rpc("create_commission_for_consultation", {
        p_consultation_id: consult.id,
        p_employee_id: data.attended_by,
        p_procedure_id: data.procedure_id,
        p_period: period,
      });

      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

// ─── Guardias ─────────────────────────────────────────────────────────────────

export function useCreateGuardia() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    data: { employee_id: string; date: string; type: "entre_semana" | "fin_de_semana"; notes?: string },
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const amount = data.type === "fin_de_semana" ? 500 : 450;
      const { error } = await supabase.from("guardias").insert({
        employee_id: data.employee_id,
        date: data.date,
        type: data.type,
        amount,
        notes: data.notes ?? null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["guardias"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

// ─── Procedures CRUD ──────────────────────────────────────────────────────────

export function useCreateProcedure() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    data: Omit<Procedure, "id" | "created_at">,
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("procedures").insert(data);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

export function useUpdateProcedure() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    id: string,
    data: Partial<Procedure>,
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("procedures").update(data).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

// ─── Commission status update ─────────────────────────────────────────────────

export function useUpdateCommissionStatus() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    id: string,
    status: "pending" | "approved" | "paid" | "rejected",
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("commissions").update({ status }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

export function useCheckInPatient() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    data: { patient_id: string; checked_in_by: string | null; notes?: string },
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("waiting_room").insert({
        patient_id: data.patient_id,
        checked_in_by: data.checked_in_by,
        notes: data.notes ?? null,
        status: "waiting",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["waiting_room"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

export function useUpdateWaitingStatus() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    id: string,
    status: "waiting" | "in_consultation" | "discharged",
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("waiting_room").update({ status }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["waiting_room"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    id: string,
    data: {
      observations?: string;
      diagnosis?: string;
      notes?: string;
      anamnesis?: string;
    },
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("consultations").update(data).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

export function useUploadPatientDocument() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    data: {
      patient_id: string;
      name: string;
      file: File;
      uploaded_by: string | null;
      document_date?: string;
      description?: string | null;
    },
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      // 1. Upload file to Supabase Storage bucket 'patient_documents'
      const fileExt = data.file.name.split(".").pop();
      const fileName = `${data.patient_id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("patient_documents")
        .upload(fileName, data.file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from("patient_documents")
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) throw new Error("Error obteniendo la URL pública del archivo.");

      // 3. Save metadata to patient_documents table
      const { error: dbError } = await supabase
        .from("patient_documents")
        .insert({
          patient_id: data.patient_id,
          name: data.name,
          file_url: urlData.publicUrl,
          file_type: data.file.type || null,
          uploaded_by: data.uploaded_by,
          document_date: data.document_date || new Date().toISOString().split("T")[0],
          description: data.description || null,
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["patient_documents", data.patient_id] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

export function useDeletePatientDocument() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    data: {
      id: string;
      patient_id: string;
      file_url: string;
    },
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      // 1. Delete from storage if it is a public URL pointing to our bucket
      if (data.file_url.includes("/patient_documents/")) {
        const parts = data.file_url.split("/patient_documents/");
        if (parts.length > 1) {
          const filePath = parts[1];
          const { error: storageError } = await supabase.storage
            .from("patient_documents")
            .remove([filePath]);
          if (storageError) console.error("Error deleting from storage:", storageError);
        }
      }

      // 2. Delete from database
      const { error: dbError } = await supabase
        .from("patient_documents")
        .delete()
        .eq("id", data.id);

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["patient_documents", data.patient_id] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

export function useCreatePatientImaging() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    data: {
      patient_id: string;
      study_type: "ultrasound" | "xray" | "ct_scan" | "other";
      title: string;
      date: string;
      findings: string;
      files: File[];
      performed_by: string | null;
    },
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      const imageUrls: string[] = [];

      // 1. Upload files concurrently to patient_documents/imaging/
      if (data.files.length > 0) {
        const uploadPromises = data.files.map(async (file) => {
          const fileExt = file.name.split(".").pop();
          const fileName = `imaging/${data.patient_id}/${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("patient_documents")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("patient_documents")
            .getPublicUrl(fileName);

          if (!urlData?.publicUrl) throw new Error("Error obteniendo la URL pública del estudio.");
          return urlData.publicUrl;
        });

        const urls = await Promise.all(uploadPromises);
        imageUrls.push(...urls);
      }

      // 2. Insert imaging study into db
      const { error: dbError } = await supabase
        .from("patient_imaging")
        .insert({
          patient_id: data.patient_id,
          study_type: data.study_type,
          title: data.title,
          date: data.date,
          findings: data.findings,
          image_urls: imageUrls,
          performed_by: data.performed_by,
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["patient_imaging", data.patient_id] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}

export function useDeletePatientImaging() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const mutate = async (
    data: {
      id: string;
      patient_id: string;
      image_urls: string[];
    },
    opts?: { onSuccess?: () => void; onError?: (e: Error) => void }
  ) => {
    setIsLoading(true);
    try {
      // 1. Delete all images from storage
      if (data.image_urls.length > 0) {
        const filePaths = data.image_urls
          .map((url) => {
            if (url.includes("/patient_documents/")) {
              const parts = url.split("/patient_documents/");
              return parts.length > 1 ? parts[1] : null;
            }
            return null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from("patient_documents")
            .remove(filePaths);
          if (storageError) console.error("Error removing imaging from storage:", storageError);
        }
      }

      // 2. Delete report from database
      const { error: dbError } = await supabase
        .from("patient_imaging")
        .delete()
        .eq("id", data.id);

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["patient_imaging", data.patient_id] });
      opts?.onSuccess?.();
    } catch (e: any) {
      opts?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading };
}
