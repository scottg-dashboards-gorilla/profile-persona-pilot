import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquarePlus } from "lucide-react";
import { checkInStatus, type FeedbackCheckIn } from "@/lib/checkIns";
import { cn } from "@/lib/utils";

/**
 * Manager dashboard card: every open feedback check-in across their direct
 * reports, with due dates and overdue flags, so nothing needs opening each
 * employee's page to track.
 */
export function ManagerCheckInsCard({ managerUuid }: { managerUuid: string }) {
  const [rows, setRows] = useState<FeedbackCheckIn[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data: reports } = await supabase
      .from("employees")
      .select("uuid")
      .eq("manager_uuid", managerUuid)
      .neq("uuid", managerUuid);
    const ids = (reports ?? []).map((p) => p.uuid);
    if (!ids.length) {
      setRows([]);
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("feedback_check_ins")
      .select("*")
      .in("employee_uuid", ids)
      .is("shared_at", null)
      .order("due_date", { ascending: true, nullsFirst: false });
    setRows((data ?? []) as FeedbackCheckIn[]);
    setLoaded(true);
  }, [managerUuid]);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) return null;

  const overdueCount = rows.filter((c) => checkInStatus(c).overdue).length;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Pending check-ins</CardTitle>
          <CardDescription>
            Open feedback check-ins across your team.{" "}
            {overdueCount > 0 ? (
              <span className="font-medium text-destructive">
                {overdueCount} overdue.
              </span>
            ) : (
              "Nothing overdue."
            )}
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/people">
            <MessageSquarePlus className="h-4 w-4 mr-1" /> Start one
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No open check-ins. Start one from an employee's page to document a concern or recognise progress.
          </p>
        ) : (
          rows.map((c) => {
            const s = checkInStatus(c);
            return (
              <div
                key={c.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-md border p-3",
                  s.overdue && "border-destructive/40 bg-destructive/5",
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">{c.employee_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Started {new Date(c.created_at).toLocaleDateString()}
                    {c.due_date
                      ? ` · due ${new Date(c.due_date + "T00:00:00").toLocaleDateString()}`
                      : " · no due date"}
                  </div>
                  <span className={cn("mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px]", s.tone)}>
                    {s.label}
                  </span>
                </div>
                <Button asChild size="sm" variant={s.overdue || !c.manager_submitted_at ? "default" : "outline"}>
                  <Link to={`/people/${c.employee_uuid}`}>
                    {!c.manager_submitted_at ? "Fill in" : "Open"}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
