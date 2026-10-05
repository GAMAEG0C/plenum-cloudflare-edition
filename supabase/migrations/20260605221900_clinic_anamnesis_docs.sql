-- Migration: Add anamnesis to consultations and create patient_documents table and bucket
-- Date: 2026-06-05

-- 1. Add anamnesis column to consultations
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS anamnesis TEXT;
COMMENT ON COLUMN public.consultations.anamnesis IS 'Client information given to the doctor at the beginning of the consultation.';

-- 2. Create patient_documents table for uploading files
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  file_url    TEXT NOT NULL, -- Storage URL or Base64 data url as fallback
  file_type   TEXT,
  uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for patient_documents
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for patient_documents
DROP POLICY IF EXISTS "auth_all_patient_documents" ON public.patient_documents;
CREATE POLICY "auth_all_patient_documents" ON public.patient_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Create Storage bucket and policies for patient_documents if storage schema exists
-- We wrap in DO block to prevent errors if running in environments without the storage extension/schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('patient_documents', 'patient_documents', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Add Storage policies if storage objects table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
    CREATE POLICY "Allow authenticated users to read documents" ON storage.objects 
      FOR SELECT TO authenticated USING (bucket_id = 'patient_documents');

    DROP POLICY IF EXISTS "Allow authenticated users to insert documents" ON storage.objects;
    CREATE POLICY "Allow authenticated users to insert documents" ON storage.objects 
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patient_documents');

    DROP POLICY IF EXISTS "Allow authenticated users to update/delete documents" ON storage.objects;
    CREATE POLICY "Allow authenticated users to update/delete documents" ON storage.objects 
      FOR ALL TO authenticated USING (bucket_id = 'patient_documents') WITH CHECK (bucket_id = 'patient_documents');
  END IF;
END $$;
