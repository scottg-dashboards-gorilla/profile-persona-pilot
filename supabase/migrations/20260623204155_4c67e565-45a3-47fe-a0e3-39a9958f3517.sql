
CREATE TABLE public.review_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  contributor_uuid text NOT NULL,
  contributor_name text NOT NULL,
  contributor_title text,
  contributor_department text,
  status text NOT NULL DEFAULT 'invited',
  invited_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  rating_overall numeric,
  rating_collaboration numeric,
  rating_impact numeric,
  strengths text,
  improvements text,
  anonymous boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, contributor_uuid)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_contributors TO authenticated;
GRANT ALL ON public.review_contributors TO service_role;

ALTER TABLE public.review_contributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read contributors"
  ON public.review_contributors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert contributors"
  ON public.review_contributors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update contributors"
  ON public.review_contributors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete contributors"
  ON public.review_contributors FOR DELETE TO authenticated USING (true);

CREATE TRIGGER review_contributors_set_updated_at
  BEFORE UPDATE ON public.review_contributors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX review_contributors_review_id_idx ON public.review_contributors(review_id);
