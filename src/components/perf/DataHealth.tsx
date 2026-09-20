import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Loader2, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Emp = {
  uuid: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  department: string | null;
  hire_date: string | null;
  current_annual_comp: number | null;
  manager_uuid: string | null;
  user_id: string | null;
};

type Issue = {
  id: string;
  label: string;
  why: string;
  people: Emp[];
};

function name(e: Emp) {
  return [e.first_name, e.last_name].filter(Boolean).join(" ") || e.email || e.uuid;
}

/**
 * The pre-launch checklist: the records that will make the tool look wrong to a
 * manager if they are still empty when the cycle opens.
 */
export function DataHealth({ year }: { year: number }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: emps }, { data: reviews }] = await Promise.all([
      supabase
        .from("employees")
        .select(
          "uuid, first_name, last_name, email, department, hire_date, current_annual_comp, manager_uuid, user_id",
        )
        .eq("terminated", false),
      supabase
        .from("performance_reviews")
        .select("employee_uuid, reviewer_uuid")
        .eq("fiscal_year", year),
    ]);
    const list = (emps ?? []) as unknown as Emp[];
    const revs = (reviews ?? []) as { employee_uuid: string; reviewer_uuid: string | null }[];
    const withReview = new Set(revs.map((r) => r.employee_uuid));
    const noReviewer = new Set(revs.filter((r) => !r.reviewer_uuid).map((r) => r.employee_uuid));
    const byUuid = new Map(list.map((e) => [e.uuid, e]));

    setIssues([
      {
        id: "pay",
        label: "No pay on file",
        why: "Their manager's merit pot is understated until pay is added, so the 5% figure will look wrong.",
        people: list.filter((e) => !e.current_annual_comp),
      },
      {
        id: "manager",
        label: "No line manager set",
        why: "They won't appear on anyone's team, so nobody is prompted to review them.",
        people: list.filter((e) => !e.manager_uuid),
      },
      {
        id: "reviewer",
        label: `No named reviewer on their FY${year} review`,
        why: "The review sits with nobody and will never be completed.",
        people: [...noReviewer].map((u) => byUuid.get(u)).filter((e): e is Emp => !!e),
      },
      {
        id: "review",
        label: `No FY${year} review created`,
        why: "They are missing from the cycle entirely.",
        people: list.filter((e) => !withReview.has(e.uuid)),
      },
      {
        id: "signin",
        label: "No sign-in linked",
        why: "They can't see their own objectives or confirm their outcome until they sign in once.",
        people: list.filter((e) => !e.user_id),
      },
      {
        id: "hire",
        label: "No hire date",
        why: "Their pay review anniversary can't be worked out.",
        people: list.filter((e) => !e.hire_date),
      },
    ]);
    setLoading(false);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const open = issues.filter((i) => i.people.length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-primary" /> Records to fix before launch
        </CardTitle>
        <CardDescription>
          Everything here is a gap a manager or employee would notice. Expand a line to see
          exactly who it affects.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Checking records…
          </div>
        ) : open.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing outstanding — every record has a manager, a reviewer, pay and a sign-in.
          </p>
        ) : (
          open.map((issue) => (
            <Collapsible key={issue.id}>
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left hover:bg-muted/50">
                <div>
                  <div className="text-sm font-medium">{issue.label}</div>
                  <div className="text-xs text-muted-foreground">{issue.why}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">{issue.people.length}</Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 px-3 pb-3 pt-2">
                {issue.people.map((p) => (
                  <div key={p.uuid} className="flex items-center justify-between gap-2 text-xs">
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                      <Link to={`/people/${p.uuid}`}>{name(p)}</Link>
                    </Button>
                    <span className="text-muted-foreground">{p.department ?? "—"}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default DataHealth;
