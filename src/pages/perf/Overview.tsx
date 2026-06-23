import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, CalendarRange } from "lucide-react";
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

  const stats = useMemo(() => {
    const now = new Date();
    const overdue = mockReviews.filter(
      (r) => r.status !== "completed" && r.status !== "cancelled" && differenceInDays(parseISO(r.scheduled_date), now) < 0,
    ).length;
    const dueIn30 = mockReviews.filter((r) => {
      if (r.status === "completed" || r.status === "cancelled") return false;
      const d = differenceInDays(parseISO(r.scheduled_date), now);
      return d >= 0 && d <= 30;
    }).length;
    const inProgress = mockReviews.filter((r) => r.status === "in_progress").length;
    const quarterAgo = subMonths(now, 3);
    const completedQ = mockReviews.filter(
      (r) => r.status === "completed" && r.completed_date && isAfter(parseISO(r.completed_date), quarterAgo),
    ).length;
    return { overdue, dueIn30, inProgress, completedQ };
  }, []);

  const upcoming = useMemo(
    () =>
      mockReviews
        .filter((r) => r.status !== "completed" && r.status !== "cancelled")
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        .slice(0, 5),
    [],
  );

  const recent = useMemo(
    () =>
      mockReviews
        .filter((r) => r.status === "completed" && r.completed_date)
        .sort((a, b) => (b.completed_date ?? "").localeCompare(a.completed_date ?? ""))
        .slice(0, 5),
    [],
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
              <Button variant="outline" size="sm">
                Open cycle
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
                      <StatusPill tone={computeReviewTone(r.status, r.scheduled_date)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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