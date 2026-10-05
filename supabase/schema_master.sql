
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'empleado');

-- user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- employees table
CREATE TABLE public.employees (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_number_format CHECK (employee_number ~ '^[A-Z]{2}[0-9]{4}$'),
  CONSTRAINT employee_status_valid CHECK (status IN ('active', 'disabled'))
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER employees_set_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS for user_roles
CREATE POLICY "users see own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for employees
CREATE POLICY "users see own or admin all" ON public.employees
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert employees" ON public.employees
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update employees" ON public.employees
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete employees" ON public.employees
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create employee row + role on auth signup based on metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_num TEXT;
  fname TEXT;
  lname TEXT;
  rl app_role;
BEGIN
  emp_num := NEW.raw_user_meta_data->>'employee_number';
  IF emp_num IS NULL THEN RETURN NEW; END IF;

  fname := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  lname := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  rl := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'empleado'::app_role);

  INSERT INTO public.employees (id, employee_number, first_name, last_name, status)
  VALUES (NEW.id, emp_num, fname, lname, 'active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, rl)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Revoke public/anon execute on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;


UPDATE auth.users
SET encrypted_password = crypt('Solutions115.', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'eo1303@universumk9.local';

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

DROP POLICY IF EXISTS "users see own roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "users see own or admin all" ON public.employees;
DROP POLICY IF EXISTS "admins insert employees" ON public.employees;
DROP POLICY IF EXISTS "admins update employees" ON public.employees;
DROP POLICY IF EXISTS "admins delete employees" ON public.employees;

CREATE POLICY "users see own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "users see own or admin all" ON public.employees
FOR SELECT TO authenticated
USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert employees" ON public.employees
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update employees" ON public.employees
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete employees" ON public.employees
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

-- Migration: Support procedures/services in POS sale_items
-- Date: 2026-06-05

-- 1. Alter public.sale_items to make item_id optional (nullable)
ALTER TABLE public.sale_items ALTER COLUMN item_id DROP NOT NULL;

-- 2. Add procedure_id column referencing public.procedures
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL;

-- 3. Invalidate/comment on foreign key constraints for clarity
COMMENT ON COLUMN public.sale_items.item_id IS 'References public.items(id) for product sales. NULL if procedure.';
COMMENT ON COLUMN public.sale_items.procedure_id IS 'References public.procedures(id) for clinical service sales. NULL if product.';


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


-- Migration: Fix employees RLS so all authenticated users can read employee names
-- This is needed for the clinic module to display doctor names on consultations.
-- The previous policy only allowed users to see their own record or admins to see all.
-- Date: 2026-06-08

-- Drop existing read policy
DROP POLICY IF EXISTS "users see own or admin all" ON public.employees;

-- Create new policy: all authenticated users can read employees (names/numbers for UI)
-- Write operations remain admin-only via separate policies
CREATE POLICY "authenticated users can read employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (true);

-- Also ensure waiting_room table has proper RLS if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waiting_room') THEN
    -- Drop old policies if any
    DROP POLICY IF EXISTS "auth_all_waiting_room" ON public.waiting_room;
    -- Recreate with the standard open read/write for authenticated
    CREATE POLICY "auth_all_waiting_room" ON public.waiting_room
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


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


-- =============================================
-- MIGRACIÓN: PERMITIR ESTADO DENEGADA EN COMISIONES
-- Fecha: 2026-06-11
-- =============================================

-- 1. Eliminar la restricción check anterior si existe
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_status_check;

-- 2. Crear la nueva restricción check permitiendo 'rejected'
ALTER TABLE public.commissions ADD CONSTRAINT commissions_status_check 
  CHECK (status IN ('pending', 'approved', 'paid', 'rejected'));

COMMENT ON COLUMN public.commissions.status IS 'Estado de la comisión: pending, approved, paid, rejected';


-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  owner_name TEXT,
  pet_name TEXT,
  phone TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  assigned_doctor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT appointments_status_check CHECK (status IN ('scheduled', 'confirmed', 'in_waiting_room', 'completed', 'cancelled'))
);

-- RLS Policies
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.appointments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.appointments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.appointments
  FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at
CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Add tracking columns for WhatsApp reminders
ALTER TABLE public.appointments
ADD COLUMN whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN whatsapp_error TEXT;


-- Migration: expenses_and_payables

-- 1. Create expenses table for OPEX
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    receipt_url TEXT,
    recorded_by UUID NOT NULL REFERENCES public.employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read expenses"
    ON public.expenses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert expenses"
    ON public.expenses FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow admins to update expenses"
    ON public.expenses FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow admins to delete expenses"
    ON public.expenses FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Trigger to auto-update updated_at on expenses
CREATE TRIGGER update_expenses_modtime
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. Modify purchase_orders for Accounts Payable
ALTER TABLE public.purchase_orders
    ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    ADD COLUMN amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00;


-- Migration: payroll

-- 1. Add base_salary to employees
ALTER TABLE public.employees
    ADD COLUMN base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- 2. Create payroll_receipts table
CREATE TABLE IF NOT EXISTS public.payroll_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_salary_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    commissions_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    deductions_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bonuses_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for payroll_receipts
ALTER TABLE public.payroll_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read their own payroll or admins all"
    ON public.payroll_receipts FOR SELECT
    TO authenticated
    USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow admins to insert payroll"
    ON public.payroll_receipts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow admins to update payroll"
    ON public.payroll_receipts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow admins to delete payroll"
    ON public.payroll_receipts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Trigger to auto-update updated_at on payroll_receipts
CREATE TRIGGER update_payroll_receipts_modtime
    BEFORE UPDATE ON public.payroll_receipts
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- Migration: fixed_assets

-- 1. Create fixed_assets table
CREATE TABLE IF NOT EXISTS public.fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    serial_number TEXT,
    model TEXT,
    category TEXT NOT NULL,
    purchase_date DATE,
    purchase_price NUMERIC(10, 2) DEFAULT 0.00,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for fixed_assets
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read fixed_assets"
    ON public.fixed_assets FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admins to insert fixed_assets"
    ON public.fixed_assets FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow admins to update fixed_assets"
    ON public.fixed_assets FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow admins to delete fixed_assets"
    ON public.fixed_assets FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Trigger to auto-update updated_at on fixed_assets
CREATE TRIGGER update_fixed_assets_modtime
    BEFORE UPDATE ON public.fixed_assets
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. Create asset_maintenance_logs table
CREATE TABLE IF NOT EXISTS public.asset_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    cost NUMERIC(10, 2) DEFAULT 0.00,
    performed_by TEXT NOT NULL,
    next_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for asset_maintenance_logs
ALTER TABLE public.asset_maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read maintenance logs"
    ON public.asset_maintenance_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admins to insert maintenance logs"
    ON public.asset_maintenance_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );


-- Migration: hospitalization

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Create hospitalizations table
CREATE TABLE IF NOT EXISTS public.hospitalizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    attending_doctor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    cage_number TEXT,
    reason TEXT NOT NULL,
    critical_level TEXT NOT NULL DEFAULT 'estable' CHECK (critical_level IN ('estable', 'delicado', 'crítico')),
    status TEXT NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted', 'discharged')),
    admission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    discharge_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hospitalizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read hospitalizations"
    ON public.hospitalizations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert hospitalizations"
    ON public.hospitalizations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update hospitalizations"
    ON public.hospitalizations FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_hospitalizations_modtime
    BEFORE UPDATE ON public.hospitalizations
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. Create hospital_treatments table (doses)
CREATE TABLE IF NOT EXISTS public.hospital_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    medication_or_task TEXT NOT NULL,
    dosage TEXT,
    frequency_hours INTEGER,
    next_due_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'administered', 'skipped')),
    administered_at TIMESTAMPTZ,
    administered_by_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hospital_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read hospital_treatments"
    ON public.hospital_treatments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert hospital_treatments"
    ON public.hospital_treatments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update hospital_treatments"
    ON public.hospital_treatments FOR UPDATE TO authenticated USING (true);

-- 3. Create hospital_notes table
CREATE TABLE IF NOT EXISTS public.hospital_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hospital_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read hospital_notes"
    ON public.hospital_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert hospital_notes"
    ON public.hospital_notes FOR INSERT TO authenticated WITH CHECK (true);



-- Asegurar que todos los roles existen en el enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'médico';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auxiliar';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recepción';
