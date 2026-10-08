import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENT_GOALS, reviewGroup, type EmployeeContext } from "@/lib/departmentReview";

export function DepartmentGoalGuidance({ employeeUuid }: { employeeUuid: string }) {
  const [employee, setEmployee] = useState<EmployeeContext | null>(null);
  useEffect(() => {
    let active = true;
    setEmployee(null);
    void supabase.from("employees").select("department, title").eq("uuid", employeeUuid).maybeSingle().then(({ data }) => { if (active) setEmployee(data); });
    return () => { active = false; };
  }, [employeeUuid]);
  const group = employee ? reviewGroup(employee) : null;
  if (!group) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Department goal standards</h3>
      <dl className="divide-y divide-border">
        {DEPARTMENT_GOALS[group].map((goal) => (
          <div key={goal.title} className="py-2">
            <dt className="text-sm font-medium">{goal.title}</dt>
            <dd className="text-xs text-muted-foreground">{goal.target}{goal.roles ? ` · ${goal.roles}` : ""}</dd>
            <dd className="text-xs text-muted-foreground">Evidence: {goal.evidence}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}