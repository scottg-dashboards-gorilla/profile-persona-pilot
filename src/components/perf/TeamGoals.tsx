import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Target } from "lucide-react";
import { goalsSummary, type PdrForm, type PdrObjective } from "@/lib/pmp";
import { GoalRow } from "@/components/perf/GoalsPanel";
import { cn } from "@/lib/utils";

/**
 * Goals and achievements across the people a manager looks after, so progress can
 * be tracked in one place and weighed when merit is awarded.
 */
export function TeamGoals({
  forms,
  objectives,
  onOpen,
}: {
  forms: PdrForm[];
  objectives: Record<string, PdrObjective[]>;
  onOpen?: (formId: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const people = forms
    .map((f) => ({ form: f, objs: objectives[f.id] ?? [] }))
    .sort((a, b) => a.form.employee_name.localeCompare(b.form.employee_name));

  const all = people.flatMap((p) => p.objs);
  const overall = goalsSummary(all);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Goals and achievements
        </CardTitle>
        <CardDescription>
          Every project, KPI and target the team signed off, with how far each has come.
          {overall.average != null && (
            <> Team average progress is <span className="font-medium text-foreground">{overall.average}%</span>, with {overall.achieved} of {overall.total} achieved.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {people.length === 0 && (
          <p className="text-sm text-muted-foreground">Nobody has goals on file for this year yet.</p>
        )}
        {people.map(({ form, objs }) => {
          const s = goalsSummary(objs);
          const open = expanded === form.id;
          return (
            <div key={form.id} className="rounded-md border">
              <button
                type="button"
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpanded(open ? null : form.id)}
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium flex-1">{form.employee_name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {s.total} goal{s.total === 1 ? "" : "s"}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {s.achieved} achieved
                </Badge>
                <div className="hidden sm:flex items-center gap-2 w-40">
                  <Progress value={Math.min(100, s.average ?? 0)} className="h-2" />
                  <span className={cn("text-xs w-10 text-right", s.average == null && "text-muted-foreground")}>
                    {s.average == null ? "—" : `${s.average}%`}
                  </span>
                </div>
              </button>
              {open && (
                <div className="border-t p-3 space-y-2">
                  {objs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No goals drafted yet.</p>
                  ) : (
                    objs.map((o) => <GoalRow key={o.id} o={o} showManagerComments />)
                  )}
                  {onOpen && (
                    <Button size="sm" variant="outline" onClick={() => onOpen(form.id)}>
                      Open their PDR
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
