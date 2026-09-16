CREATE TABLE public.comp_salary_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_uuid text REFERENCES public.employees(uuid) ON DELETE SET NULL,
  source_name text NOT NULL,
  title text,
  function_name text,
  sub_function text,
  line_manager_name text,
  work_state text,
  employment_type text,
  increment_2026 numeric,
  increment_2025 numeric,
  increment_2024 numeric,
  salary_2026 numeric,
  date_2026 date,
  salary_2025 numeric,
  date_2025 date,
  salary_2024 numeric,
  date_2024 date,
  salary_2023 numeric,
  date_2023 date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comp_salary_history TO authenticated;
GRANT ALL ON public.comp_salary_history TO service_role;
ALTER TABLE public.comp_salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage salary history"
ON public.comp_salary_history FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers view their team salary history"
ON public.comp_salary_history FOR SELECT TO authenticated
USING (employee_uuid IS NOT NULL AND public.is_employee_manager(employee_uuid));

CREATE TRIGGER comp_salary_history_updated_at
BEFORE UPDATE ON public.comp_salary_history
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.comp_increase_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year integer NOT NULL,
  scenario_percent numeric NOT NULL,
  people_needing_increase integer,
  month_label text NOT NULL,
  headcount integer NOT NULL DEFAULT 0,
  impact_year numeric NOT NULL DEFAULT 0,
  impact_month numeric NOT NULL DEFAULT 0,
  boy_cost numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comp_increase_scenarios TO authenticated;
GRANT ALL ON public.comp_increase_scenarios TO service_role;
ALTER TABLE public.comp_increase_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage increase scenarios"
ON public.comp_increase_scenarios FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER comp_increase_scenarios_updated_at
BEFORE UPDATE ON public.comp_increase_scenarios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.comp_salary_history
 (source_name, title, function_name, sub_function, line_manager_name, work_state, employment_type,
  increment_2026, increment_2025, increment_2024,
  salary_2026, date_2026, salary_2025, date_2025, salary_2024, date_2024, salary_2023, date_2023)
VALUES
('James Bates', 'Co-CEO', 'Executive Leadership', 'Executive', NULL, 'CA', 'Direct', NULL, 0.041667, NULL, NULL, NULL, 65000, '2025-12-29', NULL, NULL, 62400, '2023-02-13'),
('David Darmstandler', 'Co-CEO', 'Executive Leadership', 'Executive', NULL, 'UT', 'Direct', NULL, 0.041667, NULL, NULL, NULL, 65000, '2025-12-29', NULL, NULL, 62400, '2023-02-13'),
('Melinda Hennington', 'Admin Finance', 'Finance', 'Finace', 'Citron Cooper', 'CA', 'Direct', 0.05, 0.1, 0.03, 95172, NULL, 90640, '2025-07-14', 82400, '2024-12-02', 80000, '2023-01-30'),
('Stephen Walski', 'Director of Engineering and Security', 'Engineering & Security', 'Engineering Leadership', 'Scott Gordon', 'CA', 'Direct', NULL, 0.1, NULL, NULL, NULL, 143000, '2025-04-11', 130000, '2024-10-21', NULL, NULL),
('Marshall Rownd', 'IT Director', 'Engineering & Security', 'Central Services & Internal IT', 'Stephen Walski', 'CA', 'Direct', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 120000, '2023-02-13'),
('Devin Peterson', 'Sr. Systems Analyst', 'Engineering & Security', 'Central Services & Internal IT', 'Marshall Rownd', 'CA', 'Direct', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 93000, '2023-02-13'),
('Cory Strassell', 'Service Escalation Engineer', 'Engineering & Security', 'Central Services & Internal IT', 'Stephen Walski', 'OH', 'Direct', NULL, 0.027706, 0.05, NULL, NULL, 77155, '2025-09-08', 75075, '2024-01-01', 71500, '2023-02-13'),
('Peter Annabel', 'Director of Cloud Operations', 'Engineering & Security', 'Cloud Services', 'James Bates', 'IL', 'Direct', NULL, NULL, 0.2, NULL, NULL, NULL, NULL, 120000, '2024-03-11', 100000, '2023-02-13'),
('Keith Newson', 'Engineering Team Manager', 'Engineering & Security', 'Engineering/ Projects', 'Stephen Walski', 'CA', 'Direct', NULL, 0.116505, NULL, NULL, NULL, 115000, '2025-10-20', NULL, NULL, 103000, '2023-08-07'),
('James Bruce', 'Sr. Systems Analyst', 'Engineering & Security', 'Engineering/ Projects', 'Keith Newson', 'CA', 'Direct', NULL, 0.041667, NULL, NULL, NULL, 65000, '2025-12-29', NULL, NULL, 62400, '2023-02-13'),
('Christopher Gilmore', 'Sr. Systems Analyst', 'Engineering & Security', 'Engineering/ Projects', 'Keith Newson', 'CA', 'Direct', NULL, 0.06, NULL, NULL, NULL, 108120, '2025-04-07', NULL, NULL, 102000, '2023-08-08'),
('Matthew Lampe', 'Network Engineer', 'Engineering & Security', 'Engineering/ Projects', 'Keith Newson', 'NV', 'Direct', NULL, 0.077778, NULL, NULL, NULL, 97000, '2025-10-20', 90000, '2024-02-29', NULL, NULL),
('Danny Chadwell', 'Sales Engineer Lead', 'Engineering & Security', 'Sales Engineering', 'Stephen Walski', 'CA', 'Direct', 0.150538, NULL, 0.094118, 107000, '2026-03-09', NULL, NULL, 93000, '2024-01-29', 85000, '2023-02-13'),
('Angelica Jackson', 'Security Analyst', 'Engineering & Security', 'Cyber Security', 'Stephen Walski', 'OH', 'Direct', NULL, NULL, NULL, NULL, NULL, 85000, '2025-12-22', NULL, NULL, NULL, NULL),
('David Craig', 'Procurement Manager', 'Procurement', 'Procurement Leadership', 'Scott Gordon', 'CA', 'Direct', NULL, 0.052632, 0.055556, NULL, NULL, 75000, '2025-01-27', 71250, '2024-10-21', 67500, '2023-05-22'),
('Dan Sturdivant', 'Vice President', 'Sales & Marketing', 'Sales Leadership', 'Scott Gordon', 'CA', 'Direct', NULL, NULL, 0.2, NULL, NULL, NULL, NULL, 150000, '2024-07-01', 125000, '2023-02-13'),
('Nathan La Fleche', 'Director of Strategic Partnerships', 'Sales & Marketing', 'Strategic Partnerships Leadership', 'Dan Sturdivant', 'CA', 'Direct', 0.410935, 0.05, 0.246154, 120000, '2026-02-09', 85050, '2025-04-21', 81000, '2024-09-09', 65000, '2023-12-04'),
('Ricky Maestas', 'EDU Account Executive', 'West Coast Sales', 'EDU Account', 'Dan Sturdivant', 'CA', 'Direct', 0.03, 0.04, 0.037372, 83553.6, '2026-04-20', 81120, '2025-04-21', 78000, '2024-04-08', 75190, '2023-04-04'),
('Jay Harvey', 'Senior Acct. Exec', 'West Coast Sales', 'Strategic Partnerships', 'Dan Sturdivant', 'CA', 'Direct', NULL, 0.046512, NULL, NULL, NULL, 90000, '2025-01-27', NULL, NULL, 86000, '2023-03-13'),
('Joel Walker', 'Manager, Inside Account Management', 'East Coast Sales', 'Inside Account', 'Dan Sturdivant', 'TX', 'Direct', NULL, NULL, 0.333333, NULL, NULL, NULL, NULL, 80000, '2024-01-01', 60000, '2023-02-13'),
('Timothy Stewart', 'Director of AI and Automation', 'AI and Automation', 'AI and Automation Leadership', 'James Bates', 'CA', 'Direct', 0.05, 0.183099, 0.044118, 91728, '2026-05-04', 87360, '2025-07-21', 73840, '2024-09-09', 70720, '2023-12-04'),
('Brandon Johnson', 'National Director of Service Delivery', 'Service Delivery', 'Service Delivery Leadership', 'Scott Gordon', 'OH', 'Direct', NULL, NULL, 0.375, NULL, NULL, NULL, NULL, 110000, '2024-10-21', 80000, '2023-12-04'),
('Brandon Hulsey-Cedeno', 'Technical Team Lead', 'Service Delivery', 'Team Lead', 'Ed Dickson', 'CA', 'Direct', 0.24, NULL, NULL, 64480, '2026-03-27', 52000, '2025-03-31', NULL, NULL, NULL, NULL),
('Kerr Conkle', 'Service Manager', 'Service Delivery', 'Service Delivery Management', 'Ed Dickson', 'OH', 'Direct', NULL, 0.033749, NULL, NULL, NULL, 85000, '2025-06-16', NULL, NULL, 82225, '2023-02-13'),
('Michelle (Angela) Contreras', 'Service Team Lead', 'Service Delivery', 'Sercice Delivery T.Lead', 'Ed Dickson', 'CA', 'Direct', NULL, 0.042254, NULL, NULL, NULL, 76960, '2025-07-21', 73840, '2024-09-23', NULL, NULL),
('Willam Doyle', 'Service Escalation Engineer', 'Service Delivery', 'Escalation Engineer', 'Brandon Johnson', 'CA', 'Direct', NULL, 0.042254, NULL, NULL, NULL, 76960, '2025-07-21', 73840, '2024-09-23', NULL, NULL),
('Oscar Contreras', 'Service Technician I', 'Service Delivery', 'Technician', 'Brandon Johnson', 'CA', 'Direct', NULL, NULL, NULL, NULL, NULL, 56888, '2025-08-25', NULL, NULL, NULL, NULL),
('Gabriel Espinoza', 'Service Escalation Engineer', 'Service Delivery', 'Escalation Engineer', 'Brandon Johnson', 'CA', 'Direct', NULL, 0.135455, 0.047619, NULL, NULL, 77937.6, '2025-09-22', 68640, '2024-04-05', 65520, '2023-02-13'),
('Matthew Irick', 'Service Escalation Engineer', 'Service Delivery', 'Escalation Engineer', 'Brandon Johnson', 'CA', 'Direct', NULL, NULL, NULL, NULL, NULL, 68640, '2025-12-29', NULL, NULL, NULL, NULL),
('Luis Pena', 'Team Lead', 'Service Delivery', 'Team Lead', 'Brandon Johnson', 'CA', 'Direct', NULL, 0.033333, 0.090909, NULL, NULL, 64480, '2025-06-16', 62400, '2024-03-27', 57200, '2023-02-13'),
('Arnold Vega', 'Service Technician I', 'Service Delivery', 'Technician', 'Brandon Johnson', 'CA', 'Direct', NULL, NULL, NULL, NULL, NULL, 56160, '2025-10-13', NULL, NULL, NULL, NULL),
('Cristina Chavez Soto', 'Service Technician I', 'Service Delivery', 'Technician', 'Brandon Johnson', 'CA', 'Direct', NULL, 0.086957, NULL, NULL, NULL, 52000, '2025-12-15', 47840, '2024-10-28', NULL, NULL),
('Colton Keim', 'Field Service Technician I', 'Service Delivery', 'Field Technician', 'Brandon Johnson', 'OH', 'Direct', NULL, 0.033333, NULL, NULL, NULL, 64480, '2025-12-15', 62400, '2024-04-12', NULL, NULL),
('Nathaniel Dupray', 'Service Technician I', 'Service Delivery', 'Technician', 'Brandon Johnson', 'OH', 'Direct', NULL, NULL, NULL, NULL, NULL, 52000, '2025-08-25', NULL, NULL, NULL, NULL),
('Sam Dean', 'Service Team Lead', 'Service Delivery', 'Team Lead', 'Brandon Johnson', 'OH', 'Direct', NULL, NULL, 0.255849, NULL, NULL, NULL, NULL, 66560, '2024-08-14', 53000, '2023-01-18'),
('Cole Matuszynski', 'Tier 1 Service Technician', 'Service Delivery', 'Technician', 'Brandon Johnson', 'MI', 'Direct', NULL, NULL, NULL, NULL, NULL, 45760, '2025-06-09', NULL, NULL, NULL, NULL),
('Nathan Lanning', 'Service Engineer I', 'Service Delivery', 'Engineer', 'Brandon Johnson', 'OH', 'Direct', NULL, 0.026776, 0.07, NULL, NULL, 79762, '2025-06-16', 77682, '2024-01-01', 72600, '2023-02-13'),
('Kevin Barr', 'Helpdesk Technician', 'Service Delivery', 'Technician', 'Brandon Johnson', 'OH', 'Direct', NULL, NULL, 0.111111, NULL, NULL, NULL, NULL, 50000, '2024-06-27', 45000, '2023-08-16'),
('Christopher Vouis', 'Bench Technician', 'Service Delivery', 'Technician', 'Kerr Conkle', 'OH', 'Direct', NULL, NULL, NULL, NULL, NULL, 39520, '2025-09-22', NULL, NULL, NULL, NULL),
('Illias Holliman', 'Support Technican', 'Engineering & Security', 'Sales Engineering', 'Stephen Walski', 'CA', 'Direct', NULL, NULL, NULL, 60320, '2026-06-01', NULL, NULL, NULL, NULL, NULL, NULL),
('Jacob Berlin', 'Data Engineer', 'AI and Automation', 'AI and Automation', 'Timothy Stewart', 'CA', 'Direct', NULL, NULL, NULL, 52000, '2026-05-04', NULL, NULL, NULL, NULL, NULL, NULL),
('Haskell MaCaraig', 'AI Engineer', 'AI and Automation', 'AI and Automation', 'Timothy Stewart', 'CA', 'Direct', NULL, NULL, NULL, 78000, '2026-04-06', NULL, NULL, NULL, NULL, NULL, NULL),
('Ed Dickson', 'Director of Operations', 'Service Delivery', 'Service Delivery Leadership', 'Scott Gordon', 'Texas', 'Direct', NULL, NULL, NULL, 125000, '2026-06-22', NULL, NULL, NULL, NULL, NULL, NULL),
('Christopher Fuenty', 'Service Technician II', 'Service Delivery', 'Technician', 'Brandon Johnson', 'CA', 'Direct', NULL, NULL, NULL, 68640, '2026-04-27', NULL, NULL, NULL, NULL, NULL, NULL),
('Steven Morris', 'Service Technician I', 'Service Delivery', 'Technician', 'Brandon Johnson', 'CA', 'Direct', NULL, NULL, NULL, 70720, '2026-06-01', NULL, NULL, NULL, NULL, NULL, NULL),
('Juan Duarte', 'Service Technician I', 'Service Delivery', 'Technician', 'Brandon Johnson', 'CA', 'Direct', NULL, NULL, NULL, 70720, '2026-06-10', NULL, NULL, NULL, NULL, NULL, NULL);

-- match rows to employee records by name (with a few known aliases)
UPDATE public.comp_salary_history h
   SET employee_uuid = e.uuid
  FROM public.employees e
 WHERE h.employee_uuid IS NULL
   AND lower(btrim(e.first_name || ' ' || e.last_name)) = lower(btrim(
         CASE h.source_name
           WHEN 'Michelle (Angela) Contreras' THEN 'Angela Contreras'
           WHEN 'Danny Chadwell' THEN 'Daniel Chadwell'
           WHEN 'Dan Sturdivant' THEN 'Daniel Sturdivant'
           WHEN 'Willam Doyle' THEN 'William Doyle'
           WHEN 'Haskell MaCaraig' THEN 'Haskell Lark Macaraig'
           ELSE h.source_name
         END));

INSERT INTO public.comp_increase_scenarios
 (fiscal_year, scenario_percent, people_needing_increase, month_label, headcount, impact_year, impact_month, boy_cost, sort_order)
VALUES
(2026, 0.05, 33, 'Aug 2026', 20, 87174.50, 7264.54, 36322.71, 1),
(2026, 0.05, 33, 'Sep 2026', 3, 9730.63, 810.89, 3243.54, 2),
(2026, 0.05, 33, 'Oct 2026', 3, 13408.00, 1117.33, 3352.00, 3),
(2026, 0.05, 33, 'Nov 2026', 0, 0, 0, 0, 4),
(2026, 0.05, 33, 'Dec 2026', 7, 23256.00, 1938.00, 1938.00, 5),
(2026, 0.04, 33, 'Aug 2026', 20, 69739.60, 5811.63, 29058.17, 1),
(2026, 0.04, 33, 'Sep 2026', 3, 7784.50, 648.71, 2594.83, 2),
(2026, 0.04, 33, 'Oct 2026', 3, 10726.40, 893.87, 2681.60, 3),
(2026, 0.04, 33, 'Nov 2026', 0, 0, 0, 0, 4),
(2026, 0.04, 33, 'Dec 2026', 7, 18604.80, 1550.40, 1550.40, 5),
(2026, 0.03, 33, 'Aug 2026', 20, 52304.70, 4358.72, 21793.62, 1),
(2026, 0.03, 33, 'Sep 2026', 3, 5838.38, 486.53, 1946.13, 2),
(2026, 0.03, 33, 'Oct 2026', 3, 8044.80, 670.40, 2011.20, 3),
(2026, 0.03, 33, 'Nov 2026', 0, 0, 0, 0, 4),
(2026, 0.03, 33, 'Dec 2026', 7, 13953.60, 1162.80, 1162.80, 5);