import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/compensation";
import { readableTier, pickLatestPair, compositeImprovement, type AttemptRow } from "@/lib/assessmentDeltas";
import { ratingToNumber } from "@/lib/calibration";
import { ChevronDown, ChevronRight, ArrowRight, Building2, Users } from "lucide-react";

type Employee = {
  uuid: string;
  first_name: string;
  last_name: string;
  department: string | null;
  title: string | null;
  manager_uuid: string | null;
  current_annual_comp: number | null;
  terminated: boolean;
};

type Review = {
  id: string;
  employee_uuid: string;
  overall_rating: string | null;
  status: string;
  comp_adjustment_amount: number | null;
  comp_adjustment_percent: number | null;
  cycle_id: string | null;
};

type Goal = { id: string; employee_uuid: string; status: string };
type KeyResult = {
  goal_id: string;
  starting_value: number;
  target_value: number;
  current_value: number;
};

type Roll = {
  key: string;
  label: string;
  sublabel?: string;
  headcount: number;
  payroll: number;
  avgRating: number | null;
  ratedCount: number;
  goalProgress: number | null;
  goalCount: number;
  plannedRaises: number;
  raisePercent: number | null;
  avgAssessment: number | null;
  growth: number | null;
  members: MemberRow[];
};

type MemberRow = {
  uuid: string;
  name: string;
  title: string | null;
  comp: number;
  rating: string | null;
  ratingNum: number | null;
  goalProgress: number | null;
  raise: number;
  raisePercent: number | null;
  tier: string | null;
  growth: number | null;
};

const ratingLabel: Record<string, string> = { exceeds: "Exceeds", meets: "Meets", below: "Below" };
const ratingTone: Record<string, string> = {
  exceeds: "bg-emerald-100 text-emerald-800 border-emerald-200",
  meets: "bg-indigo-100 text-indigo-800 border-indigo-200",
  below: "bg-amber-100 text-amber-900 border-amber-200",
};

const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

export default function OrgRollups() {
  const [groupBy, setGroupBy] = useState<"department" | "manager">("department");
  const [cycles, setCycles] = useState<{ id: string; name: string; status: string }[]>([]);
  const [cycleId, setCycleId] = useState("all");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [krs, setKrs] = useState<KeyResult[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("review_cycles")
        .select("id,name,status")
        .order("starts_at", { ascending: false });
      setCycles((data ?? []) as any[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let rq = supabase.from("performance_reviews").select("*");
      if (cycleId !== "all") rq = rq.eq("cycle_id", cycleId);
      const [{ data: emps }, { data: revs }, { data: gs }, { data: k }, { data: att }] =
        await Promise.all([
          supabase.from("employees").select("*").order("last_name"),
          rq,
          supabase.from("goals").select("id,employee_uuid,status"),
          supabase.from("goal_key_results").select("goal_id,starting_value,target_value,current_value"),
          supabase.from("assessment_attempts").select("*"),
        ]);
      setEmployees(((emps ?? []) as Employee[]).filter((e) => !e.terminated));
      setReviews((revs ?? []) as Review[]);
      setGoals((gs ?? []) as Goal[]);
      setKrs((k ?? []) as KeyResult[]);
      setAttempts((att ?? []) as AttemptRow[]);
      setLoading(false);
    })();
  }, [cycleId]);

  const rolls = useMemo<Roll[]>(() => {
    const nameOf = (u: string) => {
      const e = employees.find((x) => x.uuid === u);
      return e ? `${e.first_name} ${e.last_name}` : "Unassigned";
    };

    const krByGoal = new Map<string, KeyResult[]>();
    krs.forEach((r) => {
      const list = krByGoal.get(r.goal_id) ?? [];
      list.push(r);
      krByGoal.set(r.goal_id, list);
    });

    const goalProgressFor = (uuid: string): { progress: number | null; count: number } => {
      const mine = goals.filter((g) => g.employee_uuid === uuid);
      if (!mine.length) return { progress: null, count: 0 };
      const pcts: number[] = [];
      mine.forEach((g) => {
        const rows = krByGoal.get(g.id) ?? [];
        if (!rows.length) {
          pcts.push(g.status === "achieved" ? 100 : 0);
          return;
        }
        const p = rows.map((r) => {
          const span = r.target_value - r.starting_value;
          if (span === 0) return r.current_value >= r.target_value ? 100 : 0;
          return Math.max(0, Math.min(100, ((r.current_value - r.starting_value) / span) * 100));
        });
        pcts.push(p.reduce((a, b) => a + b, 0) / p.length);
      });
      return { progress: pcts.reduce((a, b) => a + b, 0) / pcts.length, count: mine.length };
    };

    const attemptsBy = new Map<string, AttemptRow[]>();
    attempts.forEach((a) => {
      const list = attemptsBy.get(a.employee_uuid) ?? [];
      list.push(a);
      attemptsBy.set(a.employee_uuid, list);
    });

    const assessmentScore = (uuid: string) => {
      const pair = pickLatestPair(attemptsBy.get(uuid) ?? []);
      if (!pair.current) return { score: null as number | null, tier: null as string | null, growth: null as number | null };
      const vals = Object.values(pair.current.technical_scores ?? {})
        .map((v: any) => (typeof v === "number" ? v : v?.normalizedScore ?? v?.score))
        .filter((n: any) => typeof n === "number") as number[];
      return {
        score: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
        tier: pair.current.tier,
        growth: pair.previous ? compositeImprovement(pair.previous, pair.current) : null,
      };
    };

    const buildMember = (e: Employee): MemberRow => {
      const rev = reviews.find((r) => r.employee_uuid === e.uuid);
      const comp = e.current_annual_comp ?? 0;
      const gp = goalProgressFor(e.uuid);
      const a = assessmentScore(e.uuid);
      const raise = rev?.comp_adjustment_amount ?? 0;
      return {
        uuid: e.uuid,
        name: `${e.first_name} ${e.last_name}`,
        title: e.title,
        comp,
        rating: rev?.overall_rating ?? null,
        ratingNum: rev?.overall_rating ? ratingToNumber[rev.overall_rating] ?? null : null,
        goalProgress: round1(gp.progress),
        raise,
        raisePercent: rev?.comp_adjustment_percent ?? (comp && raise ? round1((raise / comp) * 100) : null),
        tier: a.tier,
        growth: round1(a.growth),
      };
    };

    const groups = new Map<string, Employee[]>();
    employees.forEach((e) => {
      const key =
        groupBy === "department" ? e.department ?? "Unassigned" : e.manager_uuid ?? "unassigned";
      const list = groups.get(key) ?? [];
      list.push(e);
      groups.set(key, list);
    });

    const out = [...groups.entries()].map(([key, list]) => {
      const members = list.map(buildMember);
      const payroll = members.reduce((s, m) => s + m.comp, 0);
      const rated = members.filter((m) => m.ratingNum != null).map((m) => m.ratingNum!);
      const gps = members.filter((m) => m.goalProgress != null).map((m) => m.goalProgress!);
      const scores = list
        .map((e) => assessmentScore(e.uuid).score)
        .filter((n): n is number => n != null);
      const growths = members.filter((m) => m.growth != null).map((m) => m.growth!);
      const planned = members.reduce((s, m) => s + m.raise, 0);
      return {
        key,
        label: groupBy === "department" ? key : key === "unassigned" ? "No manager" : nameOf(key),
        sublabel:
          groupBy === "manager" && key !== "unassigned"
            ? employees.find((e) => e.uuid === key)?.title ?? undefined
            : undefined,
        headcount: members.length,
        payroll,
        avgRating: round1(avg(rated)),
        ratedCount: rated.length,
        goalProgress: round1(avg(gps)),
        goalCount: goals.filter((g) => list.some((e) => e.uuid === g.employee_uuid)).length,
        plannedRaises: planned,
        raisePercent: payroll ? round1((planned / payroll) * 100) : null,
        avgAssessment: round1(avg(scores)),
        growth: round1(avg(growths)),
        members: members.sort((a, b) => a.name.localeCompare(b.name)),
      } as Roll;
    });

    return out.sort((a, b) => b.headcount - a.headcount);
  }, [employees, reviews, goals, krs, attempts, groupBy]);

  const totals = useMemo(() => {
    const headcount = rolls.reduce((s, r) => s + r.headcount, 0);
    const payroll = rolls.reduce((s, r) => s + r.payroll, 0);
    const planned = rolls.reduce((s, r) => s + r.plannedRaises, 0);
    const gp = rolls.filter((r) => r.goalProgress != null).map((r) => r.goalProgress!);
    return {
      headcount,
      payroll,
      planned,
      pct: payroll ? Math.round((planned / payroll) * 1000) / 10 : 0,
      goalProgress: round1(avg(gp)),
    };
  }, [rolls]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label className="text-xs">Group by</Label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="manager">Manager (team)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[220px]">
          <Label className="text-xs">Cycle</Label>
          <Select value={cycleId} onValueChange={setCycleId}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cycles</SelectItem>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} · {c.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Active headcount", value: String(totals.headcount) },
          { label: "Total payroll", value: formatMoney(totals.payroll) },
          {
            label: "Planned raises",
            value: `${formatMoney(totals.planned)} · ${totals.pct}%`,
          },
          {
            label: "Avg goal progress",
            value: totals.goalProgress === null ? "—" : `${totals.goalProgress}%`,
          },
        ].map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div className="text-xl font-semibold">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {groupBy === "department" ? (
              <Building2 className="h-4 w-4 text-primary" />
            ) : (
              <Users className="h-4 w-4 text-primary" />
            )}
            {groupBy === "department" ? "Department rollups" : "Team rollups"} — click a row to drill
            down
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>{groupBy === "department" ? "Department" : "Manager"}</TableHead>
                <TableHead className="text-right">People</TableHead>
                <TableHead className="text-right">Avg rating</TableHead>
                <TableHead className="text-right">Assessment</TableHead>
                <TableHead className="text-right">Growth</TableHead>
                <TableHead className="text-right">Goal progress</TableHead>
                <TableHead className="text-right">Payroll</TableHead>
                <TableHead className="text-right">Planned raises</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading org data…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rolls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No active employees yet.
                  </TableCell>
                </TableRow>
              )}
              {rolls.map((r) => (
                <>
                  <TableRow
                    key={r.key}
                    className="cursor-pointer"
                    onClick={() => setOpen((p) => ({ ...p, [r.key]: !p[r.key] }))}
                  >
                    <TableCell>
                      {open[r.key] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.label}
                      {r.sublabel && (
                        <div className="text-xs text-muted-foreground">{r.sublabel}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{r.headcount}</TableCell>
                    <TableCell className="text-right">
                      {r.avgRating === null ? (
                        <span className="text-xs text-muted-foreground">unrated</span>
                      ) : (
                        <>
                          {r.avgRating.toFixed(1)}
                          <span className="text-xs text-muted-foreground"> ({r.ratedCount})</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.avgAssessment === null ? "—" : Math.round(r.avgAssessment)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        (r.growth ?? 0) > 0
                          ? "text-emerald-700"
                          : (r.growth ?? 0) < 0
                            ? "text-red-600"
                            : ""
                      }`}
                    >
                      {r.growth === null ? "—" : `${r.growth > 0 ? "+" : ""}${r.growth.toFixed(1)}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.goalProgress === null ? (
                        "—"
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <Progress value={r.goalProgress} className="w-16 h-2" />
                          {Math.round(r.goalProgress)}%
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(r.payroll)}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(r.plannedRaises)}
                      {r.raisePercent != null && r.plannedRaises > 0 && (
                        <span className="text-xs text-muted-foreground"> · {r.raisePercent}%</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {open[r.key] &&
                    r.members.map((m) => (
                      <TableRow key={`${r.key}-${m.uuid}`} className="bg-muted/40">
                        <TableCell></TableCell>
                        <TableCell className="pl-8">
                          <div className="font-medium text-sm">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.title ?? "—"} · {readableTier(m.tier)}
                          </div>
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">
                          {m.rating ? (
                            <Badge variant="outline" className={ratingTone[m.rating]}>
                              {ratingLabel[m.rating]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">unrated</span>
                          )}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell
                          className={`text-right text-sm ${
                            (m.growth ?? 0) > 0
                              ? "text-emerald-700"
                              : (m.growth ?? 0) < 0
                                ? "text-red-600"
                                : ""
                          }`}
                        >
                          {m.growth === null ? "—" : `${m.growth > 0 ? "+" : ""}${m.growth.toFixed(1)}`}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {m.goalProgress === null ? "—" : `${Math.round(m.goalProgress)}%`}
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatMoney(m.comp)}</TableCell>
                        <TableCell className="text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <span>
                              {m.raise ? formatMoney(m.raise) : "—"}
                              {m.raisePercent != null && m.raise ? ` · ${m.raisePercent}%` : ""}
                            </span>
                            <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                              <Link to={`/people/${m.uuid}`}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Ratings are normalised to a 1–5 scale, assessment is the average technical competency score
        from each person's latest attempt, and growth compares that attempt with the one before it.
        Planned raises come from the adjustments saved on the Compensation page.
      </p>
    </div>
  );
}
