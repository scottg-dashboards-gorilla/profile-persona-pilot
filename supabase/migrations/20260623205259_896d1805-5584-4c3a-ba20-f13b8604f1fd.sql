
-- 1. Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'hr', 'manager');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all role assignments
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Link employees to auth users (so manager checks work)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employees_user_id_idx ON public.employees(user_id);

-- 3. is_review_manager(): does auth.uid()'s employee record manage the review's employee (1- or 2-level)?
CREATE OR REPLACE FUNCTION public.is_review_manager(_review_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT uuid FROM public.employees WHERE user_id = auth.uid() LIMIT 1
  ),
  r AS (
    SELECT employee_uuid FROM public.performance_reviews WHERE id = _review_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e, me, r
    WHERE e.uuid = r.employee_uuid
      AND (
        e.manager_uuid = me.uuid                                              -- direct manager
        OR e.manager_uuid IN (SELECT uuid FROM public.employees WHERE manager_uuid = me.uuid) -- skip-level
      )
  )
$$;

-- 4. contributor identity helper
CREATE OR REPLACE FUNCTION public.is_review_contributor(_contributor_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.review_contributors rc
    JOIN public.employees e ON e.uuid = rc.contributor_uuid
    WHERE rc.id = _contributor_id
      AND e.user_id = auth.uid()
  )
$$;

-- 5. Drop old permissive policies on contributor tables and rebuild

-- review_contributors
DROP POLICY IF EXISTS "Authenticated can read contributors" ON public.review_contributors;
DROP POLICY IF EXISTS "Authenticated can insert contributors" ON public.review_contributors;
DROP POLICY IF EXISTS "Authenticated can update contributors" ON public.review_contributors;
DROP POLICY IF EXISTS "Authenticated can delete contributors" ON public.review_contributors;

CREATE POLICY "Admin/HR/manager/self read contributors"
  ON public.review_contributors FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_manager(review_id)
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.uuid = contributor_uuid AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/HR add contributors"
  ON public.review_contributors FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Admin/HR remove contributors"
  ON public.review_contributors FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')
  );

-- Contributors update their own row; admin/HR can update any
CREATE POLICY "Admin/HR/contributor update"
  ON public.review_contributors FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.uuid = contributor_uuid AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.uuid = contributor_uuid AND e.user_id = auth.uid()
    )
  );

-- Column gate: block non-admin/HR from changing allow_resubmission or weight
CREATE OR REPLACE FUNCTION public.guard_contributor_admin_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr')) THEN
    IF NEW.allow_resubmission IS DISTINCT FROM OLD.allow_resubmission THEN
      RAISE EXCEPTION 'Only HR or admin can change allow_resubmission';
    END IF;
    IF NEW.weight IS DISTINCT FROM OLD.weight THEN
      RAISE EXCEPTION 'Only HR or admin can change reviewer weight';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_contributor_admin_columns ON public.review_contributors;
CREATE TRIGGER guard_contributor_admin_columns
  BEFORE UPDATE ON public.review_contributors
  FOR EACH ROW EXECUTE FUNCTION public.guard_contributor_admin_columns();

-- review_contributor_versions
DROP POLICY IF EXISTS "Auth can read versions" ON public.review_contributor_versions;
DROP POLICY IF EXISTS "Auth can insert versions" ON public.review_contributor_versions;
DROP POLICY IF EXISTS "Auth can update versions" ON public.review_contributor_versions;
DROP POLICY IF EXISTS "Auth can delete versions" ON public.review_contributor_versions;

CREATE POLICY "Admin/HR/manager/self read versions"
  ON public.review_contributor_versions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_contributor(contributor_id)
    OR EXISTS (
      SELECT 1 FROM public.review_contributors rc
      WHERE rc.id = contributor_id
        AND public.is_review_manager(rc.review_id)
    )
  );

CREATE POLICY "Contributor/HR insert version"
  ON public.review_contributor_versions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_contributor(contributor_id)
  );

CREATE POLICY "Admin/HR mutate version"
  ON public.review_contributor_versions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Admin/HR delete version"
  ON public.review_contributor_versions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- performance_reviews: tighten access. Keep existing scaffold policies but add a strict policy
-- for selected_contributor_versions visibility via a security-definer view.
-- We restrict SELECT on the table itself to admin/HR/employee's manager/the employee.
DROP POLICY IF EXISTS "Anyone can view performance reviews" ON public.performance_reviews;
DROP POLICY IF EXISTS "Anyone can insert performance reviews" ON public.performance_reviews;
DROP POLICY IF EXISTS "Anyone can update performance reviews" ON public.performance_reviews;
DROP POLICY IF EXISTS "Anyone can delete performance reviews" ON public.performance_reviews;

CREATE POLICY "Admin/HR/manager/self read reviews"
  ON public.performance_reviews FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_manager(id)
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.uuid = employee_uuid AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/HR/manager write reviews"
  ON public.performance_reviews FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
  );

CREATE POLICY "Admin/HR/manager update reviews"
  ON public.performance_reviews FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_manager(id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr')
    OR public.is_review_manager(id)
  );

CREATE POLICY "Admin/HR delete reviews"
  ON public.performance_reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));
