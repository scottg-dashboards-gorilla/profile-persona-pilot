alter table public.daily_tasks add column if not exists color text not null default 'none';

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.daily_tasks(id) on delete cascade,
  author_id uuid not null default auth.uid(),
  author_name text not null,
  body text not null,
  created_at timestamp with time zone not null default now()
);

grant select, insert, delete on public.task_comments to authenticated;
grant all on public.task_comments to service_role;

alter table public.task_comments enable row level security;

create policy "task comments read" on public.task_comments
for select to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1 from public.daily_tasks t
    where t.id = task_id
      and (
        public.is_self_employee(t.employee_uuid)
        or public.is_employee_manager(t.employee_uuid)
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'hr')
      )
  )
);

create policy "task comments add" on public.task_comments
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.daily_tasks t
    where t.id = task_id
      and (
        public.is_self_employee(t.employee_uuid)
        or public.is_employee_manager(t.employee_uuid)
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'hr')
      )
  )
);

create policy "task comments delete" on public.task_comments
for delete to authenticated
using (
  author_id = auth.uid()
  or public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'hr')
);