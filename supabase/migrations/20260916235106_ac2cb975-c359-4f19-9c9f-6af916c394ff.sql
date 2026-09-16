drop policy if exists "Objectives delete scoped" on public.pdr_objectives;
create policy "Objectives delete scoped"
on public.pdr_objectives
for delete
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'hr')
  or exists (
    select 1 from public.pdr_forms f
    where f.id = pdr_objectives.form_id
      and public.is_employee_manager(f.employee_uuid)
  )
  or (
    not pdr_objectives.manager_validated
    and exists (
      select 1 from public.pdr_forms f
      where f.id = pdr_objectives.form_id
        and f.objectives_approved_at is null
        and public.is_self_employee(f.employee_uuid)
    )
  )
);