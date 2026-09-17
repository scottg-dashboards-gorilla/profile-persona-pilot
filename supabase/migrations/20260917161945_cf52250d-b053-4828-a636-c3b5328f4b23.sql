with matched as (
  select p.id as profile_id, p.created_at, p.scores, p.disc_profile, p.truthfulness,
         e.uuid as employee_uuid
  from public.employee_profiles p
  join public.employees e
    on lower(btrim(p.employee_name)) = lower(coalesce(e.email,''))
    or lower(btrim(p.employee_name)) = lower(btrim(coalesce(e.first_name,'') || ' ' || coalesce(e.last_name,'')))
    or lower(btrim(p.employee_name)) = lower(btrim(coalesce(e.first_name,'')))
  where coalesce(e.terminated,false) = false
),
deduped as (
  select distinct on (profile_id) * from matched order by profile_id, employee_uuid
)
insert into public.assessment_attempts (
  employee_uuid, taken_at, submitted_at, disc_scores, disc_primary,
  technical_scores, truthfulness_score
)
select d.employee_uuid, d.created_at, d.created_at,
  coalesce(d.disc_profile, '{}'::jsonb),
  nullif(d.disc_profile->>'primaryType',''),
  coalesce((
    select jsonb_object_agg(s->>'dimensionId', (s->>'normalizedScore')::numeric)
    from jsonb_array_elements(d.scores) s
  ), '{}'::jsonb),
  nullif(d.truthfulness->>'score','')::numeric
from deduped d
where not exists (
  select 1 from public.assessment_attempts a
  where a.employee_uuid = d.employee_uuid
    and a.submitted_at = d.created_at
);