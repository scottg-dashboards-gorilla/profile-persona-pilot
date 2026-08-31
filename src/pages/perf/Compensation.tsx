import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInMonths, parseISO } from "date-fns";
import { Loader2, Save, Wand2, DollarSign, ArrowRight, AlertTriangle } from "lucide-react";
import {
  budgetSummary,
  formatMoney,
  recommendedPercent,
  amountFromPercent,
  percentFromAmount,
  type Rating,
} from "@/lib/compensation";
import {
  compositeImprovement,
  pickLatestPair,
  readableTier,
  type AttemptRow,
} from "@/lib/assessmentDeltas";
import ScenarioSimulator from "@/components/perf/ScenarioSimulator";
import { useFundedPool } from "@/hooks/useCompanyPerformance";

type Cycle = { id: string; name: string; status: string };

type Review = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  department: string | null;
  title: string | null;
  status: string;
  overall_rating: Rating | null;
  promotion: boolean;
  new_title: string | null;
  current_annual_comp: number | null;
  comp_adjustment_amount: number | null;
  comp_adjustment_percent: number | null;
  comp_effective_date: string | null;
  cycle_id: string | null;
};

type Employee = { uuid: string; current_annual_comp: number | null; hire_date: string | null };

type Plan = { percent: number; amount: number; touched: boolean };

const ratingLabel: Record<string, string> = {
  exceeds: "Exceeds",
  meets: "Meets",
  below: "Below",
};

const ratingTone: Record<string, string> = {
  exceeds: "bg-emerald-100 text-emerald-800 border-emerald-200",
  meets: "bg-indigo-100 text-indigo-800 border-indigo-200",
  below: "bg-amber-100 text-amber-900 border-amber-200",
};

export default function Compensation() {
  const { toast } = useToast();
  const { bundle: companyBundle } = useFundedPool();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleId, setCycleId] = useState<string>("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [attempts, setAttempts] = useState<Record<string, AttemptRow[]>>({});
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [budgetPercent, setBudgetPercent] = useState(3.5);
  const [useCompanyPool, setUseCompanyPool] = useState(true);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [onlyCompleted, setOnlyCompleted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("review_cycles")
        .select("id,name,status")
        .order("starts_at", { ascending: false });
      const list = (data ?? []) as Cycle[];
      setCycles(list);
      setCycleId(list.find((c) => c.status === "active")?.id ?? list[0]?.id ?? "all");
    })();
  }, []);

  useEffect(() => {
    if (!cycleId) return;
    (async () => {
      setLoading(true);
      let q = supabase.from("performance_reviews").select("*");
      if (cycleId !== "all") q = q.eq("cycle_id", cycleId);
      const { data: revs } = await q.order("employee_name");
      const rows = (revs ?? []) as Review[];
      setReviews(rows);

      const uuids = Array.from(new Set(rows.map((r) => r.employee_uuid)));
      if (uuids.length > 0) {
        const [{ data: emps }, { data: atts }] = await Promise.all([
          supabase.from("employees").select("uuid,current_annual_comp,hire_date").in("uuid", uuids),
          supabase.from("assessment_attempts").select("*").in("employee_uuid", uuids),
        ]);
        const empMap: Record<string, Employee> = {};
        (emps ?? []).forEach((e: any) => (empMap[e.uuid] = e));
        setEmployees(empMap);
        const attMap: Record<string, AttemptRow[]> = {};
        (atts ?? []).forEach((a: any) => (attMap[a.employee_uuid] ??= []).push(a));
        setAttempts(attMap);
      } else {
        setEmployees({});
        setAttempts({});
      }
      setPlans({});
      setLoading(false);
    })();
  }, [cycleId]);

  const rows = useMemo(() => {
    const list = onlyCompleted
      ? reviews.filter((r) => r.status === "completed" || r.overall_rating)
      : reviews;
    return list.map((r) => {
      const emp = employees[r.employee_uuid];
      const comp = r.current_annual_comp ?? emp?.current_annual_comp ?? 0;
      const pair = pickLatestPair(attempts[r.employee_uuid] ?? []);
      const composite = pair.current ? compositeImprovement(pair.previous, pair.current) : null;
      const months = emp?.hire_date
        ? differenceInMonths(new Date(), parseISO(emp.hire_date))
        : null;
      const recPct = recommendedPercent(r.overall_rating, composite, {
        promotion: r.promotion,
        monthsSinceLastRaise: months,
      });
      const existingPct = r.comp_adjustment_percent ?? null;
      const plan =
        plans[r.id] ??
        ({
          percent: existingPct ?? recPct,
          amount:
            r.comp_adjustment_amount ?? amountFromPercent(comp, existingPct ?? recPct),
          touched: false,
        } as Plan);
      return {
        review: r,
        comp,
        composite,
        tier: pair.current?.tier ?? null,
        hasAttempt: !!pair.current,
        recPct,
        plan,
      };
    });
  }, [reviews, employees, attempts, plans, onlyCompleted]);

  const payroll = useMemo(() => rows.reduce((s, r) => s + r.comp, 0), [rows]);
  const planned = useMemo(() => rows.reduce((s, r) => s + (r.plan.amount || 0), 0), [rows]);
  const companyPool = companyBundle?.funding.poolAmount ?? 0;
  const poolFunded = useCompanyPool && !!companyBundle && companyPool > 0;
  const budget = poolFunded
    ? {
        payroll,
        budgetAmount: companyPool,
        plannedAmount: planned,
        remaining: companyPool - planned,
        plannedPercentOfPayroll: payroll ? Math.round((planned / payroll) * 1000) / 10 : 0,
        overBudget: planned > companyPool,
      }
    : budgetSummary(payroll, budgetPercent, planned);

  function setPlan(id: string, patch: Partial<Plan>) {
    setPlans((prev) => {
      const row = rows.find((r) => r.review.id === id);
      const base = prev[id] ?? row?.plan ?? { percent: 0, amount: 0, touched: false };
      return { ...prev, [id]: { ...base, ...patch, touched: true } };
    });
  }

  function applyRecommendations() {
    const next: Record<string, Plan> = {};
    rows.forEach((r) => {
      next[r.review.id] = {
        percent: r.recPct,
        amount: amountFromPercent(r.comp, r.recPct),
        touched: true,
      };
    });
    setPlans(next);
    toast({
      title: "Recommendations applied",
      description: "Merit matrix based on rating, promotion, and assessment growth.",
    });
  }

  function scaleToBudget() {
    if (planned === 0 || budget.budgetAmount === 0) return;
    const factor = budget.budgetAmount / planned;
    const next: Record<string, Plan> = {};
    rows.forEach((r) => {
      const amount = Math.round(r.plan.amount * factor);
      next[r.review.id] = {
        amount,
        percent: percentFromAmount(r.comp, amount),
        touched: true,
      };
    });
    setPlans(next);
    toast({ title: "Plan scaled to budget", description: `Factor ${factor.toFixed(2)}×` });
  }

  async function saveAll() {
    const dirty = rows.filter((r) => plans[r.review.id]?.touched);
    if (dirty.length === 0) {
      toast({ title: "Nothing to save" });
      return;
    }
    setSaving(true);
    let ok = 0;
    for (const r of dirty) {
      const { error } = await supabase
        .from("performance_reviews")
        .update({
          comp_adjustment_amount: r.plan.amount || null,
          comp_adjustment_percent: r.plan.percent || null,
          comp_effective_date: r.plan.amount ? effectiveDate : null,
        })
        .eq("id", r.review.id);
      if (!error) ok += 1;
    }
    setSaving(false);
    toast({
      title: `Saved ${ok} of ${dirty.length} adjustments`,
      variant: ok === dirty.length ? undefined : "destructive",
    });
    setPlans({});
    const { data } = await supabase
      .from("performance_reviews")
      .select("*")
      .in(
        "id",
        reviews.map((r) => r.id),
      );
    if (data) setReviews(data as Review[]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <Label className="text-xs">Cycle</Label>
          <Select value={cycleId} onValueChange={setCycleId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reviews</SelectItem>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} · {c.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-28">
          <Label className="text-xs">Budget %</Label>
          <Input
            className="h-9"
            type="number"
            step="0.1"
            disabled={poolFunded}
            value={poolFunded ? (companyBundle?.funding.poolPercent ?? 0) : budgetPercent}
            onChange={(e) => setBudgetPercent(Number(e.target.value))}
          />
        </div>
        <div className="w-44">
          <Label className="text-xs">Effective date</Label>
          <Input
            className="h-9"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm h-9">
          <Switch checked={onlyCompleted} onCheckedChange={setOnlyCompleted} />
          Rated reviews only
        </label>
        {companyBundle && companyPool > 0 && (
          <label className="flex items-center gap-2 text-sm h-9">
            <Switch checked={useCompanyPool} onCheckedChange={setUseCompanyPool} />
            Fund from company performance
          </label>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={applyRecommendations}>
            <Wand2 className="h-4 w-4 mr-1" /> Apply matrix
          </Button>
          <Button variant="outline" size="sm" onClick={scaleToBudget}>
            Fit to budget
          </Button>
          <Button size="sm" onClick={saveAll} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save plan
          </Button>
        </div>
      </div>

      {companyBundle && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">
              {companyBundle.year.label ?? `FY${companyBundle.year.fiscal_year}`} business achievement{" "}
              {companyBundle.funding.achievement === null
                ? "—"
                : `${companyBundle.funding.achievement}%`}
            </span>
            <Badge variant={companyBundle.year.status === "locked" ? "default" : "secondary"}>
              {companyBundle.year.status === "locked" ? "Pool locked" : "Pool still draft"}
            </Badge>
            <span className="text-muted-foreground">
              funds {companyBundle.funding.poolPercent}% of{" "}
              {formatMoney(companyBundle.funding.peopleCost)} people cost ={" "}
              {formatMoney(companyPool)}
              {companyBundle.year.forecast_for_year
                ? ` for ${companyBundle.year.forecast_for_year} pay review`
                : ""}
            </span>
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link to="/company">Company performance</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "In-scope payroll", value: formatMoney(budget.payroll) },
          {
            label: poolFunded
              ? `Funded pool (${companyBundle?.funding.poolPercent}% of people cost)`
              : `Merit budget (${budgetPercent}%)`,
            value: formatMoney(budget.budgetAmount),
          },
          { label: "Planned increases", value: formatMoney(budget.plannedAmount) },
          {
            label: budget.overBudget ? "Over budget by" : "Remaining",
            value: formatMoney(Math.abs(budget.remaining)),
          },
        ].map((t, i) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div
                className={`text-xl font-semibold ${i === 3 && budget.overBudget ? "text-destructive" : ""}`}
              >
                {t.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Budget utilisation — {budget.plannedPercentOfPayroll}% of payroll
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={
              budget.budgetAmount > 0
                ? Math.min(100, Math.round((budget.plannedAmount / budget.budgetAmount) * 100))
                : 0
            }
          />
          {budget.overBudget && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              The plan exceeds the merit budget. Use “Fit to budget” to scale every increase proportionally.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Rec %</TableHead>
                <TableHead className="text-right w-24">Plan %</TableHead>
                <TableHead className="text-right w-32">Increase</TableHead>
                <TableHead className="text-right">New base</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading compensation data…
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No rated reviews in this cycle yet. Complete reviews first, or turn off “Rated
                    reviews only” to plan ahead.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.review.id}>
                  <TableCell className="font-medium">
                    {r.review.employee_name}
                    <div className="text-xs text-muted-foreground">
                      {r.review.title ?? "—"}
                      {r.review.promotion && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Promotion{r.review.new_title ? ` → ${r.review.new_title}` : ""}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.review.overall_rating ? (
                      <Badge variant="outline" className={ratingTone[r.review.overall_rating]}>
                        {ratingLabel[r.review.overall_rating]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unrated</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.hasAttempt ? (
                      <>
                        {readableTier(r.tier)}
                        {r.composite !== null && (
                          <span
                            className={
                              r.composite > 0
                                ? "text-emerald-700 ml-1"
                                : r.composite < 0
                                  ? "text-red-600 ml-1"
                                  : "text-muted-foreground ml-1"
                            }
                          >
                            {r.composite > 0 ? "+" : ""}
                            {r.composite.toFixed(1)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-700">No attempt</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(r.comp)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {r.recPct}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      className="h-8 text-right"
                      type="number"
                      step="0.1"
                      value={r.plan.percent}
                      onChange={(e) => {
                        const pct = Number(e.target.value);
                        setPlan(r.review.id, { percent: pct, amount: amountFromPercent(r.comp, pct) });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      className="h-8 text-right"
                      type="number"
                      value={r.plan.amount}
                      onChange={(e) => {
                        const amt = Number(e.target.value);
                        setPlan(r.review.id, {
                          amount: amt,
                          percent: percentFromAmount(r.comp, amt),
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(r.comp + (r.plan.amount || 0))}
                  </TableCell>
                  <TableCell>
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                      <Link to={`/people/${r.review.employee_uuid}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ScenarioSimulator
        rows={rows.map((r) => ({
          id: r.review.id,
          name: r.review.employee_name,
          comp: r.comp,
          rating: r.review.overall_rating,
          recPct: r.recPct,
        }))}
        onApply={(plan) => {
          const next: Record<string, Plan> = {};
          Object.entries(plan).forEach(([id, p]) => {
            next[id] = { percent: p.percent, amount: p.amount, touched: true };
          });
          setPlans(next);
          toast({
            title: "Scenario applied to the planner",
            description: "Adjust any individual number, then save the plan.",
          });
        }}
      />


      <p className="text-xs text-muted-foreground">
        Recommendations come from a merit matrix: performance rating × assessment growth, plus a step
        for promotions and a nudge for long tenure since the last adjustment. Every number stays
        editable — saving writes the adjustment back onto each performance review.
      </p>
    </div>
  );
}
