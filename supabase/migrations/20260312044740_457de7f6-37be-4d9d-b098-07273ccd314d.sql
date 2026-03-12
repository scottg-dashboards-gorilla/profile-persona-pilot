CREATE TABLE public.manager_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_profile_id UUID REFERENCES public.employee_profiles(id) ON DELETE CASCADE NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'observation' CHECK (note_type IN ('observation', 'feedback_given', 'coaching_session', 'general')),
  content TEXT NOT NULL,
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manager_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notes" ON public.manager_notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert notes" ON public.manager_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can delete notes" ON public.manager_notes FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update notes" ON public.manager_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);