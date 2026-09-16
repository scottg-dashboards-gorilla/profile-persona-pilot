import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowRight,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { format, differenceInDays, parseISO, isAfter, subMonths, startOfYear } from "date-fns";
import { formatCompDelta, ratingLabel } from "@/data/mockEmployees";
import { StatusPill, computeReviewTone } from "@/components/perf/StatusPill";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AttemptRow } from "@/lib/assessmentDeltas";
import { Link } from "react-router-dom";
import { TestCycleWizard } from "@/components/perf/TestCycleWizard";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReviewRow = {
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
  comp_approval_status: string;
  released_at: string | null;
  employee_ack_at: string | null;
  pay_pushback_status: string;
  escalation_status: string;
  reviewer_uuid: string | null;
  assessment_attempt_id: string | null;
  cycle_id: string | null;
};

type PayYear = {
  year: string;
  avgSalary: number | null;
  avgIncreasePct: number | null;
  peopleWithIncrease: number;
  peoplePaid: number;
};

type Attention = {
  key: string;
  count: number;
  title: string;
  detail: string;
  to: string;
  tone: "red" | "amber" | "blue";
};

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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [headcount, setHeadcount] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);
  const [queuedReminders, setQueuedReminders] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [payTrend, setPayTrend] = useState<PayYear[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("comp_salary_history")
        .select(
          "salary_2023,salary_2024,salary_2025,salary_2026,increment_2024,increment_2025,increment_2026",
        );
      const rows = data ?? [];
      const avg = (values: (number | null)[]) => {
        const nums = values.filter((v): v is number => typeof v === "number" && v > 0);
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      };
      const years: PayYear[] = [2023, 2024, 2025, 2026].map((year) => {
        const salaries = rows.map((r) => (r as Record<string, number | null>)[`salary_${year}`] ?? null);
        const increases =
          year === 2023 ? [] : rows.map((r) => (r as Record<string, number | null>)[`increment_${year}`] ?? null);
        const paid = increases.filter((v): v is number => typeof v === "number" && v > 0);
        return {
          year: String(year),
          avgSalary: avg(salaries),
          avgIncreasePct: paid.length ? (paid.reduce((a, b) => a + b, 0) / paid.length) * 100 : null,
          peopleWithIncrease: paid.length,
          peoplePaid: salaries.filter((v) => typeof v === "number" && v > 0).length,
        };
      });
      setPayTrend(years);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase
        .from("assessment_attempts")
        .select(
          "id,employee_uuid,review_id,cycle_id,taken_at,submitted_at,disc_scores,disc_primary,tier,technical_scores,truthfulness_score",
        )
        .order("taken_at", { ascending: false });
      setAttempts((a ?? []) as AttemptRow[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: pr }, { count: hc }, { count: gc }, { count: rc }] = await Promise.all([
        supabase
          .from("performance_reviews")
          .select(
            "id,employee_uuid,employee_name,department,scheduled_date,completed_date,status,overall_rating,comp_adjustment_amount,comp_adjustment_percent,promotion,comp_approval_status,released_at,employee_ack_at,pay_pushback_status,escalation_status,reviewer_uuid,assessment_attempt_id,cycle_id",
          )
          .order("scheduled_date", { ascending: true }),
        supabase.from("employees").select("uuid", { count: "exact", head: true }).eq("terminated", false),
        supabase.from("goals").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("review_reminders").select("id", { count: "exact", head: true }).eq("status", "queued"),
      ]);
      setReviews((pr ?? []) as ReviewRow[]);
      setHeadcount(hc ?? 0);
      setActiveGoals(gc ?? 0);
      setQueuedReminders(rc ?? 0);
      setLoaded(true);
    })();
  }, [reloadKey]);

  const open = useMemo(
    () => reviews.filter((r) => r.status !== "completed" && r.status !== "cancelled"),
    [reviews],
  );

  const attention = useMemo<Attention[]>(() => {
    const now = new Date();
    const items: Attention[] = [
      {
        key: "pay-approval",
        count: reviews.filter((r) => r.status === "completed" && r.comp_approval_status !== "approved").length,
        title: "Pay outcomes waiting on HR sign-off",
        detail: "The outcome can't be shared with the employee until the pay decision is approved.",
        to: "/reviews",
        tone: "red",
      },
      {
        key: "escalation",
        count: reviews.filter((r) => r.escalation_status === "pending").length,
        title: "Over-budget proposals waiting on a decision",
        detail: "A manager went past their budget and needs an answer before they can close out.",
        to: "/apr",
        tone: "red",
      },
      {
        key: "pushback",
        count: reviews.filter((r) => !["none", "resolved"].includes(r.pay_pushback_status ?? "none")).length,
        title: "Pay concerns raised by employees",
        detail: "Someone wasn't happy with their amount and is waiting on a reply.",
        to: "/reviews",
        tone: "red",
      },
      {
        key: "release",
        count: reviews.filter((r) => r.comp_approval_status === "approved" && !r.released_at).length,
        title: "Approved outcomes ready to share",
        detail: "The pay is signed off — the manager can now hold the conversation.",
        to: "/reviews",
        tone: "amber",
      },
      {
        key: "ack",
        count: reviews.filter((r) => r.released_at && !r.employee_ack_at).length,
        title: "Waiting on employee confirmation",
        detail: "The outcome has been shared but not yet confirmed as received.",
        to: "/reviews",
        tone: "amber",
      },
      {
        key: "overdue",
        count: open.filter((r) => differenceInDays(parseISO(r.scheduled_date), now) < 0).length,
        title: "Reviews past their due date",
        detail: "These were scheduled to be done already.",
        to: "/reviews",
        tone: "red",
      },
      {
        key: "no-assessment",
        count: open.filter((r) => !r.assessment_attempt_id).length,
        title: "Reviews with no assessment on file",
        detail: "A review can't be completed until the person's assessment is recorded.",
        to: "/assessments",
        tone: "amber",
      },
      {
        key: "no-reviewer",
        count: open.filter((r) => !r.reviewer_uuid).length,
        title: "Reviews with nobody named to do them",
        detail: "Without a named manager, nobody sees these in their own list.",
        to: "/reviews",
        tone: "blue",
      },
      {
        key: "no-cycle",
        count: reviews.filter((r) => !r.cycle_id).length,
        title: "Reviews not attached to a cycle",
        detail: "They won't show in cycle progress or calibration.",
        to: "/cycles",
        tone: "blue",
      },
      {
        key: "reminders",
        count: queuedReminders,
        title: "Reminder emails waiting to go out",
        detail: "Sending starts once the mydatapath.com sender address is connected.",
        to: "/reviews",
        tone: "blue",
      },
    ];
    return items.filter((i) => i.count > 0).sort((a, b) => {
      const rank = { red: 0, amber: 1, blue: 2 } as const;
      return rank[a.tone] - rank[b.tone] || b.count - a.count;
    });
  }, [reviews, open, queuedReminders]);

  const stats = useMemo(() => {
    const now = new Date();
    const overdue = open.filter((r) => differenceInDays(parseISO(r.scheduled_date), now) < 0).length;
    const dueIn30 = open.filter((r) => {
      const d = differenceInDays(parseISO(r.scheduled_date), now);
      return d >= 0 && d <= 30;
    }).length;
    const inProgress = reviews.filter((r) => r.status === "in_progress").length;
    const quarterAgo = subMonths(now, 3);
    const completedQ = reviews.filter(
      (r) => r.status === "completed" && r.completed_date && isAfter(parseISO(r.completed_date), quarterAgo),
    ).length;
    const yearStart = startOfYear(now);
    const assessedThisYear = new Set(
      attempts.filter((a) => isAfter(parseISO(a.taken_at), yearStart)).map((a) => a.employee_uuid),
    ).size;
    return { overdue, dueIn30, inProgress, completedQ, assessedThisYear };
  }, [reviews, open, attempts]);

  const upcoming = useMemo(
    () => [...open].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).slice(0, 5),
    [open],
  );

  const recent = useMemo(
    () =>
      reviews
        .filter((r) => r.status === "completed" && r.completed_date)
        .sort((a, b) => (b.completed_date ?? "").localeCompare(a.completed_date ?? ""))
        .slice(0, 5),
    [reviews],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Performance overview</h1>
          <p className="text-sm text-muted-foreground">
            Everything waiting on you, across {headcount} {headcount === 1 ? "person" : "people"}.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)}>
          <FlaskConical className="h-4 w-4 mr-1.5" /> Test review cycle
        </Button>
      </div>

      <TestCycleWizard open={wizardOpen} onOpenChange={setWizardOpen} onCompleted={() => setReloadKey((k) => k + 1)} />

      {/* Needs your attention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Needs your attention
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!loaded && <div className="text-sm text-muted-foreground py-2">Checking…</div>}
          {loaded && attention.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Nothing is waiting on you right now.
            </div>
          )}
          <div className="divide-y divide-border">
            {attention.map((a) => (
              <Link
                key={a.key}
                to={a.to}
                className="flex items-center gap-4 py-3 group hover:bg-muted/40 -mx-2 px-2 rounded"
              >
                <span
                  className={cn(
                    "h-9 min-w-9 px-2 rounded-lg flex items-center justify-center text-sm font-bold",
                    a.tone === "red" && "bg-red-100 text-red-700",
                    a.tone === "amber" && "bg-amber-100 text-amber-800",
                    a.tone === "blue" && "bg-blue-100 text-blue-800",
                  )}
                >
                  {a.count}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{a.title}</span>
                  <span className="block text-xs text-muted-foreground truncate">{a.detail}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active cycles */}
      {cycles.map((c) => {
        const s = cycleStats(c.id);
        return (
          <Card key={c.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center">
                    <CalendarRange className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                      Active cycle
                    </div>
                    <div className="text-lg font-semibold">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(parseISO(c.starts_at), "MMM d")} – {format(parseISO(c.ends_at), "MMM d, yyyy")}
                      {c.review_types?.length ? ` · ${c.review_types.join(", ")}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {s.done} of {s.total} complete
                    </div>
                    <div className="text-xs text-muted-foreground">{s.pct}%</div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/cycles">Open cycle</Link>
                  </Button>
                </div>
              </div>
              <Progress value={s.pct} className="mt-4 h-2" />
            </CardContent>
          </Card>
        );
      })}
      {loaded && cycles.length === 0 && (
        <Card>
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-medium">No cycle is running</div>
              <div className="text-sm text-muted-foreground">Start one to kick off reviews for the team.</div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/cycles">Start a cycle</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Team size" value={headcount} />
        <StatTile label="Overdue" value={stats.overdue} tone={stats.overdue ? "red" : "default"} />
        <StatTile label="Due in 30 days" value={stats.dueIn30} tone={stats.dueIn30 ? "amber" : "default"} />
        <StatTile label="In progress" value={stats.inProgress} tone="blue" />
        <StatTile label="Completed this quarter" value={stats.completedQ} tone="emerald" />
        <StatTile
          label="Assessed this year"
          value={headcount ? `${stats.assessedThisYear} / ${headcount}` : stats.assessedThisYear}
          sub={activeGoals ? `${activeGoals} active goals` : "No goals set yet"}
        />
      </div>

      {/* Pay trend year on year */}
      {payTrend.some((y) => y.avgSalary || y.avgIncreasePct) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pay year on year</CardTitle>
            <p className="text-sm text-muted-foreground">
              Average salary paid each year and the average increase given to the people who received one.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={payTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis
                    yAxisId="salary"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "hsl(var(--popover-foreground))",
                    }}
                    formatter={(value, name) =>
                      value == null
                        ? ["—", String(name)]
                        : name === "Average increase"
                          ? [`${Number(value).toFixed(1)}%`, String(name)]
                          : [
                              Number(value).toLocaleString(undefined, {
                                style: "currency",
                                currency: "USD",
                                maximumFractionDigits: 0,
                              }),
                              String(name),
                            ]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="salary"
                    dataKey="avgSalary"
                    name="Average salary"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    barSize={44}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="avgIncreasePct"
                    name="Average increase"
                    stroke="hsl(var(--chart-2, var(--accent-foreground)))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {payTrend.map((y) => (
                <div key={y.year} className="rounded-lg border p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{y.year}</div>
                  <div className="text-lg font-semibold mt-0.5">
                    {y.avgSalary
                      ? y.avgSalary.toLocaleString(undefined, {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {y.avgIncreasePct
                      ? `${y.avgIncreasePct.toFixed(1)}% average increase · ${y.peopleWithIncrease} people`
                      : "No increases recorded"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column tables */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Up next</CardTitle>
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
                      <StatusPill tone={computeReviewTone(r.status as any, r.scheduled_date)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link to={`/reviews?focus=${r.id}`} aria-label={`Open ${r.employee_name}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {loaded && upcoming.length === 0 && (
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
                          label={(ratingLabel as any)[r.overall_rating] ?? r.overall_rating}
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
                {loaded && recent.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                      Nothing completed yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
