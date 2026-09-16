create or replace function public.guard_objective_add_after_alignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f record;
begin
  select id, employee_uuid, objectives_approved_at into f
    from public.pdr_forms where id = NEW.form_id;
  if f.objectives_approved_at is not null
     and public.is_self_employee(f.employee_uuid)
     and not (public.has_role(auth.uid(), 'admin')
              or public.has_role(auth.uid(), 'hr')
              or public.is_employee_manager(f.employee_uuid))
  then
    raise exception 'Objectives are already aligned with your manager. Ask them to send them back for revision before adding more.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists guard_objective_add_after_alignment_trg on public.pdr_objectives;
create trigger guard_objective_add_after_alignment_trg
before insert on public.pdr_objectives
for each row execute function public.guard_objective_add_after_alignment();