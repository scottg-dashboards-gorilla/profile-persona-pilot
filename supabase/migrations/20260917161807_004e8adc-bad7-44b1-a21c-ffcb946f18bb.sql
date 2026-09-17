create or replace function public.save_my_assessment_attempt(
  _employee_uuid text,
  _review_id uuid,
  _disc_scores jsonb,
  _disc_primary text,
  _tier text,
  _technical_scores jsonb,
  _truthfulness numeric,
  _raw_answers jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _target text;
  _cycle uuid;
  _id uuid;
begin
  if _uid is null then
    raise exception 'Sign in required to save an assessment';
  end if;

  select uuid into _target from public.employees where user_id = _uid limit 1;

  if _target is null then
    if _employee_uuid is not null and exists (select 1 from public.employees where uuid = _employee_uuid) then
      _target := _employee_uuid;
    else
      raise exception 'No staff record linked to this sign-in';
    end if;
  end if;

  if _review_id is not null then
    select cycle_id into _cycle from public.performance_reviews where id = _review_id;
  end if;

  insert into public.assessment_attempts (
    employee_uuid, review_id, cycle_id, submitted_at, disc_scores, disc_primary,
    tier, technical_scores, truthfulness_score, raw_answers
  ) values (
    _target, _review_id, _cycle, now(), coalesce(_disc_scores, '{}'::jsonb), _disc_primary,
    _tier, coalesce(_technical_scores, '{}'::jsonb), _truthfulness, _raw_answers
  ) returning id into _id;

  if _review_id is not null then
    update public.performance_reviews set assessment_attempt_id = _id where id = _review_id;
  end if;

  return _id;
end;
$$;

revoke all on function public.save_my_assessment_attempt(text, uuid, jsonb, text, text, jsonb, numeric, jsonb) from public, anon;
grant execute on function public.save_my_assessment_attempt(text, uuid, jsonb, text, text, jsonb, numeric, jsonb) to authenticated;

-- Backfill Nahili's two completed assessments that never got filed
insert into public.assessment_attempts (employee_uuid, taken_at, submitted_at, disc_scores, disc_primary, technical_scores, truthfulness_score)
select 'e-060', p.created_at, p.created_at,
  coalesce(p.disc_profile, '{}'::jsonb),
  nullif(p.disc_profile->>'primaryType',''),
  coalesce((
    select jsonb_object_agg(s->>'dimensionId', (s->>'normalizedScore')::numeric)
    from jsonb_array_elements(p.scores) s
  ), '{}'::jsonb),
  nullif(p.truthfulness->>'score','')::numeric
from public.employee_profiles p
where p.employee_name in ('Nahili', 'nbekele@mydatapath.com')
  and not exists (
    select 1 from public.assessment_attempts a
    where a.employee_uuid = 'e-060' and a.submitted_at = p.created_at
  );