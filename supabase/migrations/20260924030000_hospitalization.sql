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
