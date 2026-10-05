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
