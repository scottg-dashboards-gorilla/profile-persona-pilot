import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { competencyLabel } from "@/components/perf/ActionItemsPanel";

type Item = {
  id: string;
  delta_kind: string;
  delta_key: string | null;
  delta_from: number | null;
  delta_to: number | null;
  comment: string | null;
  action: string | null;
  status: string;
  due_date: string | null;
  target_value: number | null;
  is_required: boolean | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  open: "Not started",
  in_progress: "In progress",
  done: "Done",
};

/** Read-only view of the improvement actions a manager set from the assessment. */
export function ImprovementPlanCard({ employeeUuid }: { employeeUuid: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeUuid) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("assessment_action_items")
        .select(
          "id,delta_kind,delta_key,delta_from,delta_to,comment,action,status,due_date,target_value,is_required,created_at",
        )
        .eq("employee_uuid", employeeUuid)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Item[]);
      setLoading(false);
    })();
  }, [employeeUuid]);

  if (loading || items.length === 0) return null;

  const openCount = items.filter((i) => i.status !== "done").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your improvement plan</CardTitle>
        <CardDescription>
          Areas your assessment flagged as weak or slipping, with what you and your manager agreed to
          do about them and the date each should be achieved by.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          {openCount === 0
            ? "All agreed actions are marked done."
            : `${openCount} action${openCount === 1 ? "" : "s"} still open.`}
        </div>
        {items.map((it) => {
          const daysLeft = it.due_date ? differenceInCalendarDays(parseISO(it.due_date), new Date()) : null;
          const overdue = it.status !== "done" && daysLeft != null && daysLeft < 0;
          return (
            <div key={it.id} className="rounded-md border p-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {it.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : overdue ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">
                  {it.delta_kind === "technical"
                    ? competencyLabel(it.delta_key)
                    : it.delta_kind === "tier"
                      ? "Tier level"
                      : it.delta_kind === "disc"
                        ? `DISC ${it.delta_key ?? ""}`
                        : "General"}
                </span>
                {it.is_required && (
                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Must improve</Badge>
                )}
                <Badge variant="outline">{STATUS_LABEL[it.status] ?? it.status}</Badge>
                {it.delta_from != null && it.delta_to != null && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(it.delta_from)} → {Math.round(it.delta_to)}
                  </span>
                )}
              </div>
              {it.comment && <p className="text-sm text-muted-foreground">{it.comment}</p>}
              {it.action && (
                <p className="text-sm border-l-2 border-primary pl-2">
                  <span className="font-medium">Agreed action:</span> {it.action}
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {it.due_date && (
                  <span className={overdue ? "text-red-600 font-medium" : undefined}>
                    Achieve by {format(parseISO(it.due_date), "MMM d, yyyy")}
                    {it.status !== "done" &&
                      daysLeft != null &&
                      (daysLeft < 0 ? ` · ${Math.abs(daysLeft)} days overdue` : ` · ${daysLeft} days left`)}
                  </span>
                )}
                {it.target_value != null && <span>Target score {it.target_value}</span>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
