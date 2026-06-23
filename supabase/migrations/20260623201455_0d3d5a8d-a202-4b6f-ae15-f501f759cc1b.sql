
CREATE TABLE IF NOT EXISTS public.role_configs (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  dimension_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  includes_technical boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_configs TO anon, authenticated;
GRANT ALL ON public.role_configs TO service_role;

ALTER TABLE public.role_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view role configs" ON public.role_configs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert role configs" ON public.role_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update role configs" ON public.role_configs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete role configs" ON public.role_configs FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS role_configs_set_updated_at ON public.role_configs;
CREATE TRIGGER role_configs_set_updated_at
BEFORE UPDATE ON public.role_configs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed with current built-in roles. Idempotent — re-running doesn't overwrite edits.
INSERT INTO public.role_configs (id, label, description, dimension_ids, includes_technical, sort_order) VALUES
('technical', 'Technical / Engineer / IT', 'Full technical battery — Azure, M365, security, networking, CompTIA',
  '["leadership-example","adaptability-dynamics","problem-solving","culture-communication","azure-cloud","m365-admin","security-compliance","network-infrastructure","comptia-fundamentals","comptia-data","comptia-cyberops","disc-dominance","disc-influence","disc-steadiness","disc-conscientiousness","coaching-preferences","self-assessment"]'::jsonb,
  true, 10),
('team-leader-nontech', 'Team Leader (non-technical)', 'Leadership, behavioral, and culture — no technical questions',
  '["leadership-example","adaptability-dynamics","problem-solving","culture-communication","disc-dominance","disc-influence","disc-steadiness","disc-conscientiousness","coaching-preferences","self-assessment"]'::jsonb,
  false, 20),
('sales', 'Sales', 'DISC, communication, adaptability, coaching preferences',
  '["adaptability-dynamics","culture-communication","disc-dominance","disc-influence","disc-steadiness","disc-conscientiousness","coaching-preferences","self-assessment"]'::jsonb,
  false, 30),
('marketing', 'Marketing', 'DISC, communication, adaptability, coaching preferences',
  '["adaptability-dynamics","culture-communication","disc-dominance","disc-influence","disc-steadiness","disc-conscientiousness","coaching-preferences","self-assessment"]'::jsonb,
  false, 40),
('finance', 'Finance / Accounting', 'DISC, communication, problem solving, coaching preferences',
  '["problem-solving","culture-communication","disc-dominance","disc-influence","disc-steadiness","disc-conscientiousness","coaching-preferences","self-assessment"]'::jsonb,
  false, 50),
('hr', 'HR / People Ops', 'DISC, leadership, communication, coaching preferences',
  '["leadership-example","culture-communication","disc-dominance","disc-influence","disc-steadiness","disc-conscientiousness","coaching-preferences","self-assessment"]'::jsonb,
  false, 60),
('operations', 'Operations / Admin', 'DISC, adaptability, communication, coaching preferences',
  '["adaptability-dynamics","culture-communication","disc-dominance","disc-influence","disc-steadiness","disc-conscientiousness","coaching-preferences","self-assessment"]'::jsonb,
  false, 70),
('other', 'Other / General', 'Shortest path — DISC and coaching preferences only',
  '["disc-dominance","disc-influence","disc-steadiness","disc-conscientiousness","coaching-preferences","self-assessment"]'::jsonb,
  false, 80)
ON CONFLICT (id) DO NOTHING;
