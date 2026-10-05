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