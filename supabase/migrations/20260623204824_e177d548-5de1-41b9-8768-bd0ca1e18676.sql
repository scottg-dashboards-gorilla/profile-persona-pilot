
-- Versions table: append-only snapshots
CREATE TABLE public.review_contributor_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id uuid NOT NULL REFERENCES public.review_contributors(id) ON DELETE CASCADE,
  version int NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  rating_overall numeric,
  rating_collaboration numeric,
  rating_impact numeric,
  strengths text,
  improvements text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contributor_id, version)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_contributor_versions TO authenticated;
GRANT ALL ON public.review_contributor_versions TO service_role;

ALTER TABLE public.review_contributor_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can read versions"
  ON public.review_contributor_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert versions"
  ON public.review_contributor_versions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update versions"
  ON public.review_contributor_versions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth can delete versions"
  ON public.review_contributor_versions FOR DELETE TO authenticated USING (true);

CREATE INDEX rcv_contributor_id_idx ON public.review_contributor_versions(contributor_id);

-- Extend contributors
ALTER TABLE public.review_contributors
  ADD COLUMN allow_resubmission boolean NOT NULL DEFAULT false,
  ADD COLUMN weight numeric NOT NULL DEFAULT 1,
  ADD COLUMN current_version_id uuid REFERENCES public.review_contributor_versions(id) ON DELETE SET NULL,
  ADD COLUMN submission_count int NOT NULL DEFAULT 0;

-- Extend performance reviews
ALTER TABLE public.performance_reviews
  ADD COLUMN aggregation_method text NOT NULL DEFAULT 'mean',
  ADD COLUMN selected_contributor_versions jsonb;
