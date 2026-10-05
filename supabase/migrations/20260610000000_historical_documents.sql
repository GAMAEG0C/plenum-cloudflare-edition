-- =============================================
-- MIGRACIÓN: EXPEDIENTES HISTÓRICOS — UniversumK9 Stack
-- Fecha: 2026-06-11
-- =============================================

-- 1. Añadir columnas a patient_documents si no existen
ALTER TABLE public.patient_documents 
  ADD COLUMN IF NOT EXISTS document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Migrar registros existentes (usar la fecha de created_at)
UPDATE public.patient_documents 
  SET document_date = created_at::date 
  WHERE document_date IS NULL OR document_date = CURRENT_DATE;

COMMENT ON COLUMN public.patient_documents.document_date IS 'Fecha original del documento o reporte clínico';
COMMENT ON COLUMN public.patient_documents.description IS 'Descripción o notas adicionales sobre el archivo adjunto';
