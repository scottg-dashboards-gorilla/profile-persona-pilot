create or replace function public.roles_configured()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles)
$$;

grant execute on function public.roles_configured() to anon, authenticated;