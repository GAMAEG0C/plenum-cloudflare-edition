-- =============================================
-- MIGRACIÓN: ESTUDIOS DE IMAGEN (Ultrasonido, Rayos X, Tomografía)
-- Fecha: 2026-06-11
-- =============================================

-- 1. Crear tabla de estudios de imagen
CREATE TABLE IF NOT EXISTS public.patient_imaging (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  study_type   TEXT NOT NULL CHECK (study_type IN ('ultrasound', 'xray', 'ct_scan', 'other')),
  title        TEXT NOT NULL,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  findings     TEXT NOT NULL,
  image_urls   TEXT[] DEFAULT '{}'::TEXT[],
  performed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar seguridad RLS
ALTER TABLE public.patient_imaging ENABLE ROW LEVEL SECURITY;

-- 3. Crear política universal para usuarios autenticados
DROP POLICY IF EXISTS "auth_all_patient_imaging" ON public.patient_imaging;
CREATE POLICY "auth_all_patient_imaging" ON public.patient_imaging
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.patient_imaging IS 'Almacena reportes de estudios de imagen (ultrasonido, placas, tomografías)';
COMMENT ON COLUMN public.patient_imaging.study_type IS 'Tipo de estudio de imagen: ultrasound, xray, ct_scan, other';
COMMENT ON COLUMN public.patient_imaging.findings IS 'Informe o reporte escrito de hallazgos médicos';
COMMENT ON COLUMN public.patient_imaging.image_urls IS 'Arreglo de URLs de imágenes o capturas del estudio';
