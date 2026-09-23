-- Core value grading per review
CREATE TABLE public.review_value_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  employee_uuid text NOT NULL,
  value_code text NOT NULL CHECK (value_code IN ('D','P','I','N','C')),
  self_score numeric CHECK (self_score >= 1 AND self_score <= 5),
  self_comment text,
  manager_score numeric CHECK (manager_score >= 1 AND manager_score <= 5),
  manager_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, value_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_value_ratings TO authenticated;
GRANT ALL ON public.review_value_ratings TO service_role;
ALTER TABLE public.review_value_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_admin_all_value_ratings" ON public.review_value_ratings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

CREATE POLICY "own_or_manager_select_value_ratings" ON public.review_value_ratings
  FOR SELECT TO authenticated
  USING (public.is_self_employee(employee_uuid) OR public.is_review_manager(review_id));

CREATE POLICY "own_or_manager_insert_value_ratings" ON public.review_value_ratings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_self_employee(employee_uuid) OR public.is_review_manager(review_id));

CREATE POLICY "own_or_manager_update_value_ratings" ON public.review_value_ratings
  FOR UPDATE TO authenticated
  USING (public.is_self_employee(employee_uuid) OR public.is_review_manager(review_id))
  WITH CHECK (public.is_self_employee(employee_uuid) OR public.is_review_manager(review_id));

-- Department-specific extra questions
CREATE TABLE public.department_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department text,
  prompt text NOT NULL,
  help_text text,
  response_type text NOT NULL DEFAULT 'score' CHECK (response_type IN ('score','yes_no','text')),
  audience text NOT NULL DEFAULT 'both' CHECK (audience IN ('employee','manager','both')),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.department_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.department_questions TO authenticated;
GRANT ALL ON public.department_questions TO service_role;
ALTER TABLE public.department_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_department_questions" ON public.department_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hr_admin_manage_department_questions" ON public.department_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

-- Answers to those questions
CREATE TABLE public.review_question_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.department_questions(id) ON DELETE CASCADE,
  employee_uuid text NOT NULL,
  self_score numeric,
  self_text text,
  manager_score numeric,
  manager_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, question_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_question_responses TO authenticated;
GRANT ALL ON public.review_question_responses TO service_role;
ALTER TABLE public.review_question_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_admin_all_question_responses" ON public.review_question_responses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

CREATE POLICY "own_or_manager_select_question_responses" ON public.review_question_responses
  FOR SELECT TO authenticated
  USING (public.is_self_employee(employee_uuid) OR public.is_review_manager(review_id));

CREATE POLICY "own_or_manager_insert_question_responses" ON public.review_question_responses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_self_employee(employee_uuid) OR public.is_review_manager(review_id));

CREATE POLICY "own_or_manager_update_question_responses" ON public.review_question_responses
  FOR UPDATE TO authenticated
  USING (public.is_self_employee(employee_uuid) OR public.is_review_manager(review_id))
  WITH CHECK (public.is_self_employee(employee_uuid) OR public.is_review_manager(review_id));

-- Keep each side of the conversation owned by its author
CREATE OR REPLACE FUNCTION public.guard_review_grading_sides()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_hr boolean := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr');
  is_owner boolean := public.is_self_employee(NEW.employee_uuid);
BEGIN
  IF is_hr THEN RETURN NEW; END IF;
  IF is_owner THEN
    NEW.manager_score := OLD.manager_score;
    IF TG_TABLE_NAME = 'review_value_ratings' THEN
      NEW.manager_comment := OLD.manager_comment;
    ELSE
      NEW.manager_text := OLD.manager_text;
    END IF;
  ELSE
    NEW.self_score := OLD.self_score;
    IF TG_TABLE_NAME = 'review_value_ratings' THEN
      NEW.self_comment := OLD.self_comment;
    ELSE
      NEW.self_text := OLD.self_text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_value_rating_sides
  BEFORE UPDATE ON public.review_value_ratings
  FOR EACH ROW EXECUTE FUNCTION public.guard_review_grading_sides();

CREATE TRIGGER guard_question_response_sides
  BEFORE UPDATE ON public.review_question_responses
  FOR EACH ROW EXECUTE FUNCTION public.guard_review_grading_sides();

CREATE TRIGGER set_value_ratings_updated_at BEFORE UPDATE ON public.review_value_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_department_questions_updated_at BEFORE UPDATE ON public.department_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_question_responses_updated_at BEFORE UPDATE ON public.review_question_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- A couple of starter questions so departments can see how it works
INSERT INTO public.department_questions (department, prompt, help_text, response_type, audience, sort_order)
VALUES
  (NULL, 'Timesheet and time entry discipline', 'Entries complete, accurate and submitted on time.', 'score', 'both', 1),
  (NULL, 'Participation in team meetings and huddles', 'Shows up prepared, contributes, follows through on actions.', 'score', 'both', 2);