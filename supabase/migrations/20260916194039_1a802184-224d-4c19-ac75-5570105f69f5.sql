drop policy "Signed-in users can view the funding curve" on public.funding_curve_points;

create policy "Role holders can view the funding curve"
on public.funding_curve_points
for select
to authenticated
using (
  has_role(auth.uid(), 'admin'::app_role)
  or has_role(auth.uid(), 'hr'::app_role)
  or has_role(auth.uid(), 'manager'::app_role)
);