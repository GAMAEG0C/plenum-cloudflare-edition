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
