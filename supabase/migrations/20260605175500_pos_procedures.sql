-- Migration: Support procedures/services in POS sale_items
-- Date: 2026-06-05

-- 1. Alter public.sale_items to make item_id optional (nullable)
ALTER TABLE public.sale_items ALTER COLUMN item_id DROP NOT NULL;

-- 2. Add procedure_id column referencing public.procedures
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL;

-- 3. Invalidate/comment on foreign key constraints for clarity
COMMENT ON COLUMN public.sale_items.item_id IS 'References public.items(id) for product sales. NULL if procedure.';
COMMENT ON COLUMN public.sale_items.procedure_id IS 'References public.procedures(id) for clinical service sales. NULL if product.';
