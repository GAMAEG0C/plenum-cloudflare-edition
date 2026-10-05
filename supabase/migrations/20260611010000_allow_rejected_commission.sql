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
