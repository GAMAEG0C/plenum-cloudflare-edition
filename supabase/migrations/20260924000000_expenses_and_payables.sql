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
