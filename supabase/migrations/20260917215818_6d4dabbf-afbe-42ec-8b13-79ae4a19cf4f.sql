alter table public.review_self_assessments
  add column if not exists manager_reply_wins text,
  add column if not exists manager_reply_challenges text,
  add column if not exists manager_reply_growth text,
  add column if not exists manager_reply_support text,
  add column if not exists manager_replied_at timestamptz;

create or replace function public.guard_self_assessment_manager_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin/HR and the employee themselves keep full edit rights.
  if has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'hr')
     or is_self_employee(new.employee_uuid) then
    return new;
  end if;
  -- The reviewing manager may only add their replies.
  if is_review_manager(new.review_id) then
    new.wins := old.wins;
    new.challenges := old.challenges;
    new.growth := old.growth;
    new.support_needed := old.support_needed;
    new.submitted_at := old.submitted_at;
    new.employee_uuid := old.employee_uuid;
    new.review_id := old.review_id;
    return new;
  end if;
  raise exception 'Not allowed to change this self-assessment';
end;
$$;

drop trigger if exists trg_guard_self_assessment_manager_reply on public.review_self_assessments;
create trigger trg_guard_self_assessment_manager_reply
  before update on public.review_self_assessments
  for each row execute function public.guard_self_assessment_manager_reply();

drop policy if exists self_assess_update_self_or_admin on public.review_self_assessments;
create policy self_assess_update_self_admin_or_manager
  on public.review_self_assessments for update to authenticated
  using (
    has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'hr')
    or is_self_employee(employee_uuid) or is_review_manager(review_id)
  )
  with check (
    has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'hr')
    or is_self_employee(employee_uuid) or is_review_manager(review_id)
  );