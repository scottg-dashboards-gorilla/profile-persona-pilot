import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { amountFromPercent, formatMoney } from "@/lib/compensation";
import {
  IC_TARGET,
  MERIT_AVERAGE_TARGET,
  MERIT_PRINCIPLES,
  RATING_SCALE,
  icAverage,
  icRange,
  meritRange,
  ratingBand,
  withinRange,
  goalsSummary,
  type ManagerBudget,
  type PdrObjective,
} from "@/lib/pmp";
import { cn } from "@/lib/utils";

type GridRow = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  title: string | null;
  department: string | null;
  hire_date: string | null;
  current_annual_comp: number | null;
  rating_score: number | null;
  merit_percent: number | null;
  merit_amount: number | null;
  
  ic_score: number | null;
  apr_stage: string;
};

type Draft = {
  rating: string;
  merit: string;
  ic: string;
};

const SELECT =
  "id, employee_uuid, employee_name, title, department, hire_date, current_annual_comp, rating_score, merit_percent, merit_amount, ic_score, apr_stage";

function toDraft(r: GridRow): Draft {
  return {
    rating: r.rating_score != null ? String(r.rating_score) : "",
    merit: r.merit_percent != null ? String(r.merit_percent) : "",
    ic: r.ic_score != null ? String(r.ic_score) : "",
  };
}


/**
 * The manager's ratings grid — one row per team member, with the performance
 * rating, I/C score and merit entered inline and checked
 * against the allowed ranges and the remaining team budget before saving.
 */
export function RatingsGrid({ year }: { year: number }) {
  const { toast } = useToast();
  const { has, unconfigured, viewMode } = usePermissions();
  const isAdminHr = (unconfigured && viewMode === "admin") || has("admin") || has("hr");
  const [rows, setRows] = useState<GridRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  /** Approved merit budget for the people shown, and anything still awaiting approval. */
  const [approvedBudget, setApprovedBudget] = useState(0);
  const [pendingBudget, setPendingBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Goals for each person shown, keyed by employee uuid. */
  const [goalsByEmp, setGoalsByEmp] = useState<Record<string, PdrObjective[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: budgets }] = await Promise.all([
      supabase.from("performance_reviews").select(SELECT).eq("fiscal_year", year).order("employee_name"),
      supabase.from("manager_budgets").select("*").eq("fiscal_year", year),
    ]);
    let list = (data ?? []) as unknown as GridRow[];
    let myUuid: string | null = null;
    // This grid is for the team — the signed-in person's own review never appears,
    // and a manager only ever sees the people who report directly to them.
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (uid) {
      const { data: me } = await supabase
        .from("employees")
        .select("uuid")
        .eq("user_id", uid)
        .maybeSingle();
      if (me?.uuid) {
        myUuid = me.uuid as string;
        list = list.filter((r) => r.employee_uuid !== myUuid);
        if (!isAdminHr) {
          const { data: team } = await supabase
            .from("employees")
            .select("uuid")
            .eq("manager_uuid", myUuid)
            .eq("terminated", false);
          const mine = new Set((team ?? []).map((t) => t.uuid as string));
          list = list.filter((r) => mine.has(r.employee_uuid));
        }
      } else if (!isAdminHr) {
        // No staff record matched: never fall back to showing everyone.
        list = [];
      }
    } else if (!isAdminHr) {
      list = [];
    }
    setRows(list);
    const next: Record<string, Draft> = {};
    list.forEach((r) => (next[r.id] = toDraft(r)));
    setDrafts(next);
    // Goal progress for the same people, so merit can be weighed against what they
    // actually signed up to deliver.
    if (list.length > 0) {
      const { data: forms } = await supabase
        .from("pdr_forms")
        .select("id, employee_uuid")
        .eq("fiscal_year", year)
        .in("employee_uuid", list.map((r) => r.employee_uuid));
      const formRows = (forms ?? []) as { id: string; employee_uuid: string }[];
      if (formRows.length > 0) {
        const { data: objs } = await supabase
          .from("pdr_objectives")
          .select("*")
          .in("form_id", formRows.map((f) => f.id));
        const byForm = new Map(formRows.map((f) => [f.id, f.employee_uuid]));
        const grouped: Record<string, PdrObjective[]> = {};
        ((objs ?? []) as PdrObjective[]).forEach((o) => {
          const emp = byForm.get(o.form_id);
          if (emp) (grouped[emp] ??= []).push(o);
        });
        setGoalsByEmp(grouped);
      } else {
        setGoalsByEmp({});
      }
    } else {
      setGoalsByEmp({});
    }
    // Only the budget that belongs to this team counts: a manager sees their own
    // approved pot, HR and admins see the approved pots added together.
    const bs = ((budgets ?? []) as unknown as ManagerBudget[]).filter((b) =>
      isAdminHr ? true : myUuid != null && b.manager_uuid === myUuid,
    );
    const sum = (status: string) =>
      bs
        .filter((b) => (b.approval_status ?? "pending") === status)
        .reduce((s, b) => s + Number(b.merit_budget_amount ?? 0), 0);
    setApprovedBudget(sum("approved"));
    setPendingBudget(bs.reduce((s, b) => s + Number(b.merit_budget_amount ?? 0), 0) - sum("approved"));
    setLoading(false);
  }, [year, isAdminHr]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const computed = useMemo(() => {
    return rows.map((r) => {
      const d = drafts[r.id] ?? toDraft(r);
      const score = d.rating ? Number(d.rating) : null;
      const mRange = meritRange(score);
      const iRange = icRange(score);
      const meritPct = score === 1 ? 0 : d.merit === "" ? null : Number(d.merit);
      const ic = d.ic === "" ? null : Number(d.ic);
      const comp = r.current_annual_comp ?? 0;
      const meritAmount = meritPct != null ? amountFromPercent(comp, meritPct) : null;
      return {
        row: r,
        draft: d,
        score,
        mRange,
        iRange,
        meritPct,
        ic,
        meritAmount,
        meritOk: withinRange(meritPct, mRange),
        icOk: withinRange(ic, iRange),
      };
    });
  }, [rows, drafts, year]);

  const spend = useMemo(() => {
    const merit = computed.reduce((s, c) => s + (c.meritAmount ?? 0), 0);
    const icAvg = icAverage(computed.map((c) => c.ic));
    const pcts = computed.map((c) => c.meritPct).filter((p): p is number => p != null);
    const meritAvg = pcts.length
      ? Math.round((pcts.reduce((s, p) => s + p, 0) / pcts.length) * 100) / 100
      : null;
    return { merit, icAvg, meritAvg };
  }, [computed]);

  const eligibleCount = rows.length;
  /** Total pay of the people shown, and the 5% pot that pay funds. */
  const teamPay = useMemo(
    () => rows.reduce((s, r) => s + Number(r.current_annual_comp ?? 0), 0),
    [rows],
  );
  const pool5 = Math.round(teamPay * (MERIT_AVERAGE_TARGET / 100));
  const meritBudget = approvedBudget;
  const gateEnforced = eligibleCount >= 5 && meritBudget > 0;
  const meritOver = gateEnforced && spend.merit > meritBudget;
  const icOver =
    gateEnforced && spend.icAvg != null && spend.icAvg > IC_TARGET;
  /** Only what the manager has touched this session — older entries never block a save. */
  const changed = computed.filter((c) => {
    const o = toDraft(c.row);
    return (
      o.rating !== c.draft.rating ||
      o.merit !== c.draft.merit ||
      o.ic !== c.draft.ic
    );
  });
  const rangeBreaches = changed.filter(
    (c) => c.meritOk === false || c.icOk === false,
  ).length;

  const blocked = meritOver || icOver || rangeBreaches > 0;

  const dirty = changed.length > 0;

  async function saveAll() {
    if (blocked) {
      toast({
        title: "Entries can't be saved",
        description: meritOver
          ? "Merit spend is higher than the merit budget."
          : icOver
            ? `The team I/C average is above the target of ${IC_TARGET}.`
            : "Some entries fall outside the allowed range.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    for (const c of changed) {
      const { error } = await supabase
        .from("performance_reviews")
        .update({
          rating_score: c.score,
          overall_rating: ratingBand(c.score) ?? undefined,
          merit_percent: c.meritPct,
          merit_amount: c.meritAmount,
          ic_score: c.ic,
        })
        .eq("id", c.row.id);
      if (error) {
        setSaving(false);
        toast({ title: "Didn't save", description: error.message, variant: "destructive" });
        return;
      }
    }
    setSaving(false);
    toast({ title: "Entries saved", description: `${changed.length} team member(s)` });
    await load();
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">My team ratings · FY{year}</CardTitle>
            <CardDescription>
              Enter the rating, then the I/C score and merit. 5% is the mid point — a
              3 (Overall Met) rating can be awarded 4–6%. A rating of 1 receives 0% — no
              increase, and a rating of 2 (Partially Met) can be awarded between 0% and
              3%. The team should average 5%, and values outside a range, or spend
              above the approved budget, cannot be saved.
            </CardDescription>
          </div>
          <div className="grid gap-1 text-right text-xs">
            <BudgetReadout label="Remaining MERIT USD Budget" remaining={meritBudget - spend.merit} total={meritBudget} over={meritOver} />
            <div className="text-muted-foreground">
              {MERIT_AVERAGE_TARGET}% of team pay ({formatMoney(teamPay)}) = {formatMoney(pool5)}
            </div>
            {meritBudget === 0 && (
              <div className="font-medium text-amber-700">
                {pendingBudget > 0
                  ? `Budget of ${formatMoney(pendingBudget)} is awaiting approval`
                  : "No merit budget approved yet"}
              </div>
            )}
            {meritBudget > 0 && pendingBudget > 0 && (
              <div className="text-amber-700">{formatMoney(pendingBudget)} still awaiting approval</div>
            )}
            <div className={cn("font-medium", spend.meritAvg != null && spend.meritAvg > MERIT_AVERAGE_TARGET ? "text-destructive" : "text-muted-foreground")}>
              Average merit % {spend.meritAvg ?? "—"} <span className="text-muted-foreground">/ {MERIT_AVERAGE_TARGET}% target</span>
            </div>
            <div className={cn("font-medium", icOver ? "text-destructive" : "text-muted-foreground")}>
              Average I/C Score spend {spend.icAvg ?? "—"} <span className="text-muted-foreground">/ {IC_TARGET}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No reviews dated in FY{year}.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="align-bottom">Employee</TableHead>
                    <TableHead rowSpan={2} className="align-bottom w-[140px]">Goal progress</TableHead>
                    <TableHead rowSpan={2} className="align-bottom w-[150px] bg-primary/10">
                      Performance Rating
                    </TableHead>
                    <TableHead colSpan={4} className="text-center bg-muted">I/C SCORE</TableHead>
                    <TableHead colSpan={6} className="text-center bg-muted/60">MERIT</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-right">Min %</TableHead>
                    <TableHead className="text-right">Max %</TableHead>
                    <TableHead className="text-right">I/C Score</TableHead>
                    <TableHead className="text-center">Check</TableHead>
                    <TableHead className="text-right">Min %</TableHead>
                    <TableHead className="text-right">Max %</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-center">Check</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Their 5% share</TableHead>

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {computed.map((c) => (
                    <TableRow key={c.row.id}>
                      <TableCell className="min-w-[170px]">
                        <div className="font-medium text-sm">{c.row.employee_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.row.title ?? c.row.department ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        {(() => {
                          const objs = goalsByEmp[c.row.employee_uuid] ?? [];
                          const s = goalsSummary(objs);
                          if (s.total === 0) {
                            return <span className="text-[11px] text-muted-foreground">No goals set</span>;
                          }
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help">
                                  <div className="font-medium">
                                    {s.average == null ? "—" : `${s.average}%`}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {s.achieved}/{s.total} achieved
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs space-y-1">
                                {objs.map((o) => (
                                  <div key={o.id} className="text-[11px]">
                                    {o.title} —{" "}
                                    {goalsSummary([o]).average == null
                                      ? "no progress recorded"
                                      : `${goalsSummary([o]).average}%`}
                                  </div>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="bg-primary/5">
                        <Select
                          value={c.draft.rating}
                          onValueChange={(v) => set(c.row.id, { rating: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Type or select" />
                          </SelectTrigger>
                          <SelectContent>
                            {RATING_SCALE.map((r) => (
                              <SelectItem key={r.score} value={String(r.score)}>
                                {r.score} — {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.iRange?.min ?? "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.iRange?.max ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className={cn("h-8 w-20 text-right text-xs", c.icOk === false && "border-destructive")}
                          value={c.draft.ic}
                          disabled={c.score == null}
                          onChange={(e) => set(c.row.id, { ic: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-center"><CheckMark ok={c.icOk} /></TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.mRange ? c.mRange.min.toFixed(2) : "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.mRange ? (c.score === 1 ? "0.00" : c.mRange.max.toFixed(2)) : "—"}</TableCell>
                      <TableCell className="text-right">
                        {c.score === 1 ? (
                          <div className="text-xs font-medium text-muted-foreground">0% — no increase</div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <Input
                              type="number"
                              step="0.1"
                              className={cn("h-8 w-20 text-right text-xs", c.meritOk === false && "border-destructive")}
                              value={c.draft.merit}
                              disabled={c.score == null}
                              onChange={(e) => set(c.row.id, { merit: e.target.value })}
                            />
                            {c.score === 2 && (
                              <div className="text-[10px] text-muted-foreground">0–3% range</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center"><CheckMark ok={c.meritOk} /></TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatMoney(c.meritAmount)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                        {c.row.current_annual_comp
                          ? formatMoney(
                              Math.round(
                                Number(c.row.current_annual_comp) * (MERIT_AVERAGE_TARGET / 100),
                              ),
                            )
                          : "no pay on file"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>


            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Budget vs spend
                </div>
                <div className="mt-2 space-y-3">
                  <Bar label="Merit" budget={meritBudget} spend={spend.merit} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="font-semibold text-muted-foreground">I/C budget ({rows.length} emps)</div>
                  <div className="text-right">Target {IC_TARGET.toFixed(2)}</div>
                  <div className={cn("text-right font-medium", icOver && "text-destructive")}>
                    Actual {spend.icAvg?.toFixed(2) ?? "0.00"}
                  </div>
                </div>

              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5" /> Watch outs
                </div>
                {MERIT_PRINCIPLES.watchOuts.map((w) => (
                  <div key={w} className="text-[11px] text-amber-900/90 flex gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-700" />
                    {w}
                  </div>
                ))}
                <div className="text-[11px] text-amber-900/90 flex gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-700" />
                  {`I/C Score average target is ${IC_TARGET}.`}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
              {blocked && (
                <span className="mr-auto text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {meritOver
                    ? "Merit spend is over budget — entries can't be saved."
                    : icOver
                      ? `Team I/C average is above ${IC_TARGET} — entries can't be saved.`
                      : `${rangeBreaches} entr${rangeBreaches === 1 ? "y is" : "ies are"} outside the allowed range.`}

                </span>
              )}
              {!gateEnforced && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="mr-auto text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3.5 w-3.5" /> Budget gate not enforced
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    The hard block applies to managers with 5 or more associates and a budget set.
                  </TooltipContent>
                </Tooltip>
              )}
              <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={() => load()}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Discard changes
              </Button>
              <Button size="sm" disabled={!dirty || saving || blocked} onClick={saveAll}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetReadout({
  label,
  remaining,
  total,
  over,
}: {
  label: string;
  remaining: number;
  total: number;
  over: boolean;
}) {
  return (
    <div>
      <span className="text-muted-foreground">{label} </span>
      <span className={cn("font-semibold", over ? "text-destructive" : "text-foreground")}>
        {formatMoney(remaining)}
      </span>
      <span className="text-muted-foreground"> of {formatMoney(total)}</span>
    </div>
  );
}

function Bar({ label, budget, spend }: { label: string; budget: number; spend: number }) {
  const max = Math.max(budget, spend, 1);
  return (
    <div>
      <div className="flex justify-between text-[11px]">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatMoney(spend)} of {formatMoney(budget)}
        </span>
      </div>
      <div className="mt-1 space-y-1">
        <div className="h-2 rounded bg-muted overflow-hidden">
          <div className="h-full bg-primary/70" style={{ width: `${(budget / max) * 100}%` }} />
        </div>
        <div className="h-2 rounded bg-muted overflow-hidden">
          <div
            className={cn("h-full", spend > budget ? "bg-destructive" : "bg-amber-500")}
            style={{ width: `${(spend / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CheckMark({ ok }: { ok: boolean | null }) {
  if (ok == null) return <span className="text-muted-foreground">—</span>;
  return ok ? (
    <Check className="h-4 w-4 text-emerald-600 inline" />
  ) : (
    <X className="h-4 w-4 text-destructive inline" />
  );
}
