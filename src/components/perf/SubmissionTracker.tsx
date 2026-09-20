import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ClipboardList } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { PdrForm } from "@/lib/pmp";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  label: string;
  who: "Employee" | "Manager";
  done: (f: PdrForm) => boolean;
};

const STEPS: Step[] = [
  { id: "objectives", label: "Objectives submitted", who: "Employee", done: (f) => !!f.objectives_submitted_at },
  { id: "aligned", label: "Objectives aligned by manager", who: "Manager", done: (f) => !!f.objectives_approved_at },
  { id: "midyear_self", label: "Mid-year comments shared", who: "Employee", done: (f) => !!f.midyear_self_submitted_at },
  { id: "midyear_mgr", label: "Mid-year manager comments", who: "Manager", done: (f) => !!f.midyear_manager_submitted_at },
  { id: "year_self", label: "Year-end input written", who: "Employee", done: (f) => !!f.self_input_submitted_at },
  { id: "year_mgr", label: "Year-end manager comments", who: "Manager", done: (f) => !!f.comments_finalized_at },
];

/**
 * Who still owes what — so nobody has to chase the team by email to find out
 * where the cycle has stalled.
 */
export function SubmissionTracker({
  forms,
  year,
  onOpen,
}: {
  forms: PdrForm[];
  year: number;
  onOpen?: (formId: string) => void;
}) {
  const [openStep, setOpenStep] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      STEPS.map((s) => {
        const outstanding = forms.filter((f) => !s.done(f));
        return {
          step: s,
          outstanding,
          done: forms.length - outstanding.length,
        };
      }),
    [forms],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" /> Who still owes something · FY{year}
        </CardTitle>
        <CardDescription>
          {forms.length} {forms.length === 1 ? "person" : "people"} in view. Open a line to see
          exactly who to nudge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {forms.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nobody in view for FY{year}.</p>
        ) : (
          rows.map(({ step, outstanding, done }) => (
            <Collapsible
              key={step.id}
              open={openStep === step.id}
              onOpenChange={(o) => setOpenStep(o ? step.id : null)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left hover:bg-muted/50">
                <div>
                  <div className="text-sm font-medium">{step.label}</div>
                  <div className="text-xs text-muted-foreground">{step.who} owns this step</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {done}/{forms.length} done
                  </span>
                  <Badge
                    variant={outstanding.length === 0 ? "secondary" : "destructive"}
                    className={cn(outstanding.length === 0 && "opacity-70")}
                  >
                    {outstanding.length} outstanding
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 px-3 pb-3 pt-2">
                {outstanding.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Everyone has done this one.</p>
                ) : (
                  outstanding.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 text-xs">
                      <span>{f.employee_name}</span>
                      {onOpen && (
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onOpen(f.id)}>
                          Open
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default SubmissionTracker;
