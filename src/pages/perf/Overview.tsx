import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, CalendarRange, TrendingUp, TrendingDown } from "lucide-react";
import { format, differenceInDays, parseISO, isAfter, subMonths } from "date-fns";
import {
  mockReviews,
  mockActiveCycle,
  mockGoalsCount,
  mockAssessedCount,
  formatCompDelta,
  ratingLabel,
} from "@/data/mockEmployees";
import { StatusPill, computeReviewTone } from "@/components/perf/StatusPill";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  AttemptRow,
  compositeImprovement,
  readableTier,
} from "@/lib/assessmentDeltas";
import { Link } from "react-router-dom";

type ContextTab = "org" | "line" | "todos";

const tabs: { id: ContextTab; label: string }[] = [
  { id: "org", label: "Your Organization" },
  { id: "line", label: "Your Reporting Line" },
  { id: "todos", label: "Your To-Dos" },
];

function StatTile({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "red" | "amber" | "emerald" | "blue";
  sub?: string;
}) {
  const toneColor = {
    default: "text-foreground",
    red: "text-red-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    blue: "text-blue-700",
  }[tone ?? "default"];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className={cn("text-[26px] leading-tight font-bold mt-1", toneColor)}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const [tab, setTab] = useState<ContextTab>("org");
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});
  const [dbReviews, setDbReviews] = useState<
    {
      id: string;
      employee_uuid: string;
      employee_name: string;
      department: string | null;
      scheduled_date: string;
      completed_date: string | null;
      status: string;
      overall_rating: string | null;
      comp_adjustment_amount: number | null;
      comp_adjustment_percent: number | null;
      promotion: boolean | null;
    }[]
  >([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase
        .from("assessment_attempts")
        .select("id,employee_uuid,review_id,cycle_id,taken_at,submitted_at,disc_scores,disc_primary,tier,technical_scores,truthfulness_score")
        .order("taken_at", { ascending: false });
      setAttempts((a ?? []) as AttemptRow[]);
      const ids = Array.from(new Set((a ?? []).map((x: any) => x.employee_uuid)));
      if (ids.length) {
        const { data: emps } = await supabase
          .from("employees")
          .select("uuid,first_name,last_name")
          .in("uuid", ids);
        const m: Record<string, string> = {};
        (emps ?? []).forEach((e: any) => {
          m[e.uuid] = `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || e.uuid;
        });
        setEmpNames(m);
      }
    })();
  }, []);

  // Load real performance_reviews (joined with employees for name/department)
  useEffect(() => {
    (async () => {
      const { data: pr } = await supabase
        .from("performance_reviews")
        .select(
          "id,employee_uuid,scheduled_date,completed_date,status,overall_rating,comp_adjustment_amount,comp_adjustment_percent,promotion",
        )
        .order("scheduled_date", { ascending: true });
      const ids = Array.from(new Set((pr ?? []).map((r: any) => r.employee_uuid)));
      const empMap: Record<string, { name: string; department: string | null }> = {};
      if (ids.length) {
        const { data: emps } = await supabase
          .from("employees")
          .select("uuid,first_name,last_name,department")
          .in("uuid", ids);
        (emps ?? []).forEach((e: any) => {
          empMap[e.uuid] = {
            name: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || e.uuid,
            department: e.department ?? null,
          };
        });
      }
      setDbReviews(
        (pr ?? []).map((r: any) => ({
          ...r,
          employee_name: empMap[r.employee_uuid]?.name ?? r.employee_uuid,
          department: empMap[r.employee_uuid]?.department ?? null,
        })),
      );
      setReviewsLoaded(true);
    })();
  }, []);

  const growth = useMemo(() => {
    const byEmp = new Map<string, AttemptRow[]>();
    for (const a of attempts) {
      const list = byEmp.get(a.employee_uuid) ?? [];
      list.push(a);
      byEmp.set(a.employee_uuid, list);
    }
    const items: { uuid: string; name: string; score: number; tierFrom: string | null; tierTo: string | null }[] = [];
    let tierShiftSum = 0;
    let withPrev = 0;
    byEmp.forEach((list, uuid) => {
      const sorted = [...list].sort((a, b) => b.taken_at.localeCompare(a.taken_at));
      const current = sorted[0];
      const previous = sorted[1] ?? null;
      if (!current) return;
      if (previous) {
        withPrev += 1;
        const tierMap: Record<string, number> = { "tier-1": 1, tier_1: 1, "tier-2": 2, tier_2: 2, "team-leader": 3, team_leader: 3 };
        const from = tierMap[previous.tier ?? ""] ?? 0;
        const to = tierMap[current.tier ?? ""] ?? 0;
        tierShiftSum += to - from;
      }
      items.push({
        uuid,
        name: empNames[uuid] ?? uuid,
        score: compositeImprovement(previous, current),
        tierFrom: previous?.tier ?? null,
        tierTo: current.tier,
      });
    });
    const improvers = [...items].sort((a, b) => b.score - a.score).slice(0, 3);
    const declining = [...items].filter((x) => x.score < 0).sort((a, b) => a.score - b.score).slice(0, 3);
    const avgTierShift = withPrev ? tierShiftSum / withPrev : 0;
    return { improvers, declining, avgTierShift, sampleSize: withPrev };
  }, [attempts, empNames]);

  // Prefer real DB reviews; fall back to mock data only if the DB has none yet
  const reviewSource = useMemo(
    () => (dbReviews.length > 0 ? dbReviews : (mockReviews as any[])),
    [dbReviews],
  );
  const usingMock = dbReviews.length === 0;

  const stats = useMemo(() => {
    const now = new Date();
    const overdue = reviewSource.filter(
      (r) => r.status !== "completed" && r.status !== "cancelled" && differenceInDays(parseISO(r.scheduled_date), now) < 0,
    ).length;
    const dueIn30 = reviewSource.filter((r) => {
      if (r.status === "completed" || r.status === "cancelled") return false;
      const d = differenceInDays(parseISO(r.scheduled_date), now);
      return d >= 0 && d <= 30;
    }).length;
    const inProgress = reviewSource.filter((r) => r.status === "in_progress").length;
    const quarterAgo = subMonths(now, 3);
    const completedQ = reviewSource.filter(
      (r) => r.status === "completed" && r.completed_date && isAfter(parseISO(r.completed_date), quarterAgo),
    ).length;
    return { overdue, dueIn30, inProgress, completedQ };
  }, [reviewSource]);

  const upcoming = useMemo(
    () =>
      reviewSource
        .filter((r) => r.status !== "completed" && r.status !== "cancelled")
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        .slice(0, 5),
    [reviewSource],
  );

  const recent = useMemo(
    () =>
      reviewSource
        .filter((r) => r.status === "completed" && r.completed_date)
        .sort((a, b) => (b.completed_date ?? "").localeCompare(a.completed_date ?? ""))
        .slice(0, 5),
    [reviewSource],
  );

  const cycleProgress = Math.round((mockActiveCycle.completed / mockActiveCycle.total) * 100);

  return (
    <div className="space-y-6">
      {/* Context tabs */}
      <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active cycle */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Active cycle</div>
                <div className="text-lg font-semibold">{mockActiveCycle.name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(mockActiveCycle.starts_at), "MMM d")} –{" "}
                  {format(parseISO(mockActiveCycle.ends_at), "MMM d, yyyy")} ·{" "}
                  {mockActiveCycle.review_types.join(", ")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium">
                  {mockActiveCycle.completed} of {mockActiveCycle.total} complete
                </div>
                <div className="text-xs text-muted-foreground">{cycleProgress}%</div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/cycles">Open cycle</Link>
              </Button>
            </div>
          </div>
          <Progress value={cycleProgress} className="mt-4 h-2" />
        </CardContent>
      </Card>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Overdue" value={stats.overdue} tone={stats.overdue ? "red" : "default"} />
        <StatTile label="Due in 30 days" value={stats.dueIn30} tone={stats.dueIn30 ? "amber" : "default"} />
        <StatTile label="In progress" value={stats.inProgress} tone="blue" />
        <StatTile label="Completed this quarter" value={stats.completedQ} tone="emerald" />
        <StatTile label="Active goals" value={mockGoalsCount} />
        <StatTile
          label="Assessed"
          value={`${mockAssessedCount.assessed} / ${mockAssessedCount.total}`}
          sub={`${Math.round((mockAssessedCount.assessed / mockAssessedCount.total) * 100)}% of team`}
        />
      </div>

      {/* Growth tiles */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Avg tier shift</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-3xl font-bold",
                growth.avgTierShift > 0 && "text-emerald-600",
                growth.avgTierShift < 0 && "text-red-600",
              )}
            >
              {growth.avgTierShift > 0 ? "+" : ""}
              {growth.avgTierShift.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Across {growth.sampleSize} employee{growth.sampleSize === 1 ? "" : "s"} with at least two attempts.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Biggest improvers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {growth.improvers.length === 0 && (
              <div className="text-muted-foreground">No data yet.</div>
            )}
            {growth.improvers.map((i) => (
              <Link
                key={i.uuid}
                to={`/people/${i.uuid}`}
                className="flex items-center justify-between hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded"
              >
                <span className="truncate">{i.name}</span>
                <span className="text-emerald-700 font-medium text-xs">
                  +{i.score.toFixed(1)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {growth.declining.length === 0 && (
              <div className="text-muted-foreground">Nobody trending down. Nice.</div>
            )}
            {growth.declining.map((i) => (
              <Link
                key={i.uuid}
                to={`/people/${i.uuid}`}
                className="flex items-center justify-between hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded"
              >
                <span className="truncate">
                  {i.name}
                  <span className="text-xs text-muted-foreground ml-1">
                    {readableTier(i.tierFrom)} → {readableTier(i.tierTo)}
                  </span>
                </span>
                <span className="text-red-700 font-medium text-xs">{i.score.toFixed(1)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Two-column tables */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>Up next</span>
              {reviewsLoaded && usingMock && (
                <span className="text-[10px] font-normal text-muted-foreground">
                  Showing sample data — no reviews scheduled yet
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employee_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.department}</TableCell>
                    <TableCell>{format(parseISO(r.scheduled_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <StatusPill tone={computeReviewTone(r.status, r.scheduled_date)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link
                          to={
                            usingMock
                              ? `/people/${r.employee_uuid}`
                              : `/reviews?focus=${r.id}`
                          }
                          aria-label={`Open ${r.employee_name}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {reviewsLoaded && upcoming.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      No upcoming reviews. Schedule one from{" "}
                      <Link to="/reviews" className="text-primary underline">
                        Reviews
                      </Link>
                      .
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comp change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employee_name}</TableCell>
                    <TableCell>{r.completed_date && format(parseISO(r.completed_date), "MMM d")}</TableCell>
                    <TableCell>
                      {r.overall_rating && (
                        <StatusPill
                          tone={
                            r.overall_rating === "exceeds"
                              ? "completed"
                              : r.overall_rating === "below"
                                ? "overdue"
                                : "in_progress"
                          }
                          label={ratingLabel[r.overall_rating]}
                        />
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-medium",
                        (r.comp_adjustment_amount ?? 0) > 0 && "text-emerald-700",
                        (r.comp_adjustment_amount ?? 0) < 0 && "text-red-700",
                      )}
                    >
                      {formatCompDelta(r.comp_adjustment_amount, r.comp_adjustment_percent)}
                      {r.promotion && <span className="ml-2 text-xs text-primary">★ Promoted</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}