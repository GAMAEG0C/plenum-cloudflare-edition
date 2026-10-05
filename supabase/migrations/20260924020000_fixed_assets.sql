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
