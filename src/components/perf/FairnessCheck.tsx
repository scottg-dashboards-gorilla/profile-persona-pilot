import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Loader2, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MERIT_AVERAGE_TARGET, RATING_SCALE } from "@/lib/pmp";
import { cn } from "@/lib/utils";

type Row = {
  employee_uuid: string;
  employee_name: string;
  department: string | null;
  rating_score: number | null;
  merit_percent: number | null;
  hire_date: string | null;
};

/** Tenure bands used for the fairness comparison. */
function tenureBand(hire: string | null) {
  if (!hire) return "Not recorded";
  const years = (Date.now() - new Date(hire).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (years < 1) return "Under 1 year";
  if (years < 3) return "1–3 years";
  if (years < 6) return "3–6 years";
  return "6 years +";
}

function avg(list: number[]) {
  if (list.length === 0) return null;
  return Math.round((list.reduce((s, v) => s + v, 0) / list.length) * 100) / 100;
}

type Group = { key: string; count: number; meritAvg: number | null; ratingAvg: number | null };

function groupBy(rows: Row[], pick: (r: Row) => string): Group[] {
  const map = new Map<string, Row[]>();
  rows.forEach((r) => {
    const k = pick(r) || "Not recorded";
    map.set(k, [...(map.get(k) ?? []), r]);
  });
  return [...map.entries()]
    .map(([key, list]) => ({
      key,
      count: list.length,
      meritAvg: avg(list.map((r) => r.merit_percent).filter((v): v is number => v != null)),
      ratingAvg: avg(list.map((r) => r.rating_score).filter((v): v is number => v != null)),
    }))
    .sort((a, b) => b.count - a.count);
}

/** The widest merit gap between two groups that each have at least two people. */
function spread(groups: Group[]) {
  const vals = groups.filter((g) => g.count >= 2 && g.meritAvg != null).map((g) => g.meritAvg as number);
  if (vals.length < 2) return null;
  return Math.round((Math.max(...vals) - Math.min(...vals)) * 100) / 100;
}

/**
 * The fairness view HR signs off before pay changes are released: how ratings
 * are spread across the 1–5 scale, and whether average merit differs by
 * department or tenure in a way that needs explaining.
 */
export function FairnessCheck({ year }: { year: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("performance_reviews")
        .select("employee_uuid, employee_name, department, rating_score, merit_percent, hire_date")
        .eq("fiscal_year", year);
      if (!cancelled) {
        setRows((data ?? []) as unknown as Row[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const rated = useMemo(() => rows.filter((r) => r.rating_score != null), [rows]);

  const distribution = useMemo(() => {
    const total = rated.length;
    return RATING_SCALE.map((s) => {
      const count = rated.filter((r) => r.rating_score === s.score).length;
      return { ...s, count, share: total ? Math.round((count / total) * 100) : 0 };
    });
  }, [rated]);

  const topHeavy = useMemo(() => {
    const top = distribution.filter((d) => d.score >= 4).reduce((s, d) => s + d.share, 0);
    return top > 40 ? top : null;
  }, [distribution]);

  const byDept = useMemo(() => groupBy(rows, (r) => r.department ?? ""), [rows]);
  const byTenure = useMemo(() => groupBy(rows, (r) => tenureBand(r.hire_date)), [rows]);
  const deptSpread = spread(byDept);
  const tenureSpread = spread(byTenure);

  const meritAvg = avg(rows.map((r) => r.merit_percent).filter((v): v is number => v != null));

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Checking…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" /> Rating spread · FY{year}
          </CardTitle>
          <CardDescription>
            {rated.length} of {rows.length} people rated. A healthy spread has most people
            at 3 (Overall Met), with 4s and 5s reserved for genuinely stand-out years.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {distribution.map((d) => (
            <div key={d.score} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {d.score} — {d.label}
                </span>
                <span className="text-muted-foreground">
                  {d.count} {d.count === 1 ? "person" : "people"} · {d.share}%
                </span>
              </div>
              <Progress value={d.share} className="h-2" />
            </div>
          ))}
          {topHeavy && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {topHeavy}% of people are rated 4 or 5. That is unusually high — worth
                calibrating with managers before pay is released, so a strong rating still
                means something.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <GroupCard
          title="Average merit by department"
          note="Differences are fine when performance explains them. They need a reason on file when it doesn't."
          groups={byDept}
          spreadValue={deptSpread}
        />
        <GroupCard
          title="Average merit by length of service"
          note="Watch for newer or longer-serving people being consistently lower without a performance reason."
          groups={byTenure}
          spreadValue={tenureSpread}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Company average merit so far: <span className="font-medium">{meritAvg ?? "—"}%</span> against
        the {MERIT_AVERAGE_TARGET}% target.
      </p>
    </div>
  );
}

function GroupCard({
  title,
  note,
  groups,
  spreadValue,
}: {
  title: string;
  note: string;
  groups: Group[];
  spreadValue: number | null;
}) {
  const wide = spreadValue != null && spreadValue > 1.5;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{note}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {groups.length === 0 && <p className="text-sm text-muted-foreground">Nothing to compare yet.</p>}
        {groups.map((g) => (
          <div key={g.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">{g.key}</span>
            <span className="shrink-0 text-muted-foreground">
              {g.count} {g.count === 1 ? "person" : "people"} ·{" "}
              <span className="font-medium text-foreground">{g.meritAvg ?? "—"}%</span>
              {g.ratingAvg != null && <> · avg rating {g.ratingAvg}</>}
            </span>
          </div>
        ))}
        {spreadValue != null && (
          <div
            className={cn(
              "mt-2 rounded-md border p-2 text-xs",
              wide ? "border-amber-300 bg-amber-50 text-amber-900" : "text-muted-foreground",
            )}
          >
            Widest gap between groups: {spreadValue} percentage points.{" "}
            {wide ? "Worth a look before sign-off." : "Within a normal range."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FairnessCheck;
