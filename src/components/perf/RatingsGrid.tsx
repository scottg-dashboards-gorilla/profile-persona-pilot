import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { amountFromPercent, formatMoney } from "@/lib/compensation";
import {
  DM_RANGE,
  IC_TARGET,
  MERIT_PRINCIPLES,
  RATING_SCALE,
  equityAward,
  equityRange,
  focalPointMeritEligibility,
  icAverage,
  icRange,
  meritRange,
  ratingBand,
  withinRange,
  type ManagerBudget,
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
  merit_prorated_amount: number | null;
  bonus_eligible: boolean;
  ic_score: number | null;
  dm_eligible: boolean;
  dm_percent: number | null;
  dm_amount: number | null;
  equity_eligible: boolean;
  equity_percent: number | null;
  equity_value: number | null;
  equity_shares: number | null;
  equity_price_per_share: number | null;
  apr_stage: string;
};

type Draft = {
  rating: string;
  merit: string;
  ic: string;
  dm: string;
  dmEligible: boolean;
  eq: string;
  eqEligible: boolean;
};

const SELECT =
  "id, employee_uuid, employee_name, title, department, hire_date, current_annual_comp, rating_score, merit_percent, merit_amount, merit_prorated_amount, bonus_eligible, ic_score, dm_eligible, dm_percent, dm_amount, equity_eligible, equity_percent, equity_value, equity_shares, equity_price_per_share, apr_stage";

function toDraft(r: GridRow): Draft {
  return {
    rating: r.rating_score != null ? String(r.rating_score) : "",
    merit: r.merit_percent != null ? String(r.merit_percent) : "",
    ic: r.ic_score != null ? String(r.ic_score) : "",
    dm: r.dm_percent != null ? String(r.dm_percent) : "",
    dmEligible: r.dm_eligible,
    eq: r.equity_percent != null ? String(r.equity_percent) : "",
    eqEligible: r.equity_eligible,
  };
}


/**
 * The manager's ratings grid — one row per team member, with the performance
 * rating, I/C score, merit and Differentiated Merit entered inline and checked
 * against the allowed ranges and the remaining team budget before saving.
 */
export function RatingsGrid({ year }: { year: number }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<GridRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [budget, setBudget] = useState<ManagerBudget | null>(null);
  const [dmBudget, setDmBudget] = useState(0);
  const [equityBudget, setEquityBudget] = useState(0);
  const [sharePrice, setSharePrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: budgets }] = await Promise.all([
      supabase.from("performance_reviews").select(SELECT).eq("fiscal_year", year).order("employee_name"),
      supabase.from("manager_budgets").select("*").eq("fiscal_year", year),
    ]);
    const list = (data ?? []) as unknown as GridRow[];
    setRows(list);
    const next: Record<string, Draft> = {};
    list.forEach((r) => (next[r.id] = toDraft(r)));
    setDrafts(next);
    const priced = list.find((r) => (r.equity_price_per_share ?? 0) > 0);
    setSharePrice(priced ? String(priced.equity_price_per_share) : "");
    const bs = (budgets ?? []) as unknown as ManagerBudget[];
    if (bs.length > 0) {
      setBudget({
        ...bs[0],
        merit_budget_amount: bs.reduce((s, b) => s + (b.merit_budget_amount ?? 0), 0),
        bonus_budget_amount: bs.reduce((s, b) => s + (b.bonus_budget_amount ?? 0), 0),
      });
      setDmBudget(Math.round(bs.reduce((s, b) => s + (b.merit_budget_amount ?? 0), 0) * 0.25));
      setEquityBudget(bs.reduce((s, b) => s + (b.equity_budget_amount ?? 0), 0));
    } else {
      setBudget(null);
      setDmBudget(0);
      setEquityBudget(0);
    }
    setLoading(false);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const price = sharePrice === "" ? null : Number(sharePrice);

  const computed = useMemo(() => {
    return rows.map((r) => {
      const d = drafts[r.id] ?? toDraft(r);
      const score = d.rating ? Number(d.rating) : null;
      const mRange = meritRange(score);
      const iRange = icRange(score);
      const meritPct = d.merit === "" ? null : Number(d.merit);
      const ic = d.ic === "" ? null : Number(d.ic);
      const dmPct = d.dm === "" ? null : Number(d.dm);
      const comp = r.current_annual_comp ?? 0;
      const meritAmount = meritPct != null ? amountFromPercent(comp, meritPct) : null;
      const proration = focalPointMeritEligibility(r.hire_date, year);
      const prorated = meritAmount != null ? Math.round(meritAmount * proration.prorationFactor) : null;
      const dmAmount = dmPct != null && d.dmEligible ? amountFromPercent(comp, dmPct) : null;
      const eqRange = equityRange(score);
      const eqPct = d.eq === "" || !d.eqEligible ? null : Number(d.eq);
      const award = equityAward({ salary: comp, percent: eqPct, pricePerShare: price });
      return {
        row: r,
        draft: d,
        score,
        mRange,
        iRange,
        meritPct,
        ic,
        dmPct,
        meritAmount,
        prorated,
        proration,
        dmAmount,
        eqRange,
        eqPct,
        eqValue: award.value,
        eqShares: award.shares,
        meritOk: withinRange(meritPct, mRange),
        icOk: withinRange(ic, iRange),
        dmOk: dmPct == null ? null : dmPct >= DM_RANGE.min && dmPct <= DM_RANGE.max,
        eqOk: withinRange(eqPct, eqRange),
      };
    });
  }, [rows, drafts, year, price]);

  const spend = useMemo(() => {
    const merit = computed.reduce((s, c) => s + (c.prorated ?? 0), 0);
    const dm = computed.reduce((s, c) => s + (c.dmAmount ?? 0), 0);
    const equity = computed.reduce((s, c) => s + (c.eqValue ?? 0), 0);
    const shares = computed.reduce((s, c) => s + (c.eqShares ?? 0), 0);
    const icAvg = icAverage(computed.filter((c) => c.row.bonus_eligible).map((c) => c.ic));
    return { merit, dm, equity, shares, icAvg };
  }, [computed]);

  const eligibleCount = rows.length;
  const gateEnforced = eligibleCount >= 5 && !!budget;
  const meritBudget = budget?.merit_budget_amount ?? 0;
  const meritOver = gateEnforced && spend.merit > meritBudget;
  const dmOver = dmBudget > 0 && spend.dm > dmBudget;
  const equityOver = equityBudget > 0 && spend.equity > equityBudget;
  const icOver =
    gateEnforced && spend.icAvg != null && spend.icAvg > IC_TARGET;
  const rangeBreaches = computed.filter(
    (c) => c.meritOk === false || c.icOk === false || c.dmOk === false || c.eqOk === false,
  ).length;

  const blocked = meritOver || icOver || equityOver || rangeBreaches > 0;

  const dirty = computed.some((c) => {
    const o = toDraft(c.row);
    return (
      o.rating !== c.draft.rating ||
      o.merit !== c.draft.merit ||
      o.ic !== c.draft.ic ||
      o.dm !== c.draft.dm ||
      o.dmEligible !== c.draft.dmEligible ||
      o.eq !== c.draft.eq ||
      o.eqEligible !== c.draft.eqEligible ||
      (c.row.equity_price_per_share ?? null) !== price
    );
  });

  async function saveAll() {
    if (blocked) {
      toast({
        title: "Entries can't be saved",
        description: meritOver
          ? "Merit spend is higher than the merit budget."
          : equityOver
            ? "Share award value is higher than the share budget."
            : icOver
              ? `The team I/C average is above the target of ${IC_TARGET}.`
              : "Some entries fall outside the allowed range.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    for (const c of computed) {
      const { error } = await supabase
        .from("performance_reviews")
        .update({
          rating_score: c.score,
          overall_rating: ratingBand(c.score) ?? undefined,
          merit_percent: c.meritPct,
          merit_amount: c.meritAmount,
          merit_prorated_amount: c.prorated,
          ic_score: c.ic,
          dm_eligible: c.draft.dmEligible,
          dm_percent: c.dmPct,
          dm_amount: c.dmAmount,
          equity_eligible: c.draft.eqEligible,
          equity_percent: c.eqPct,
          equity_value: c.eqValue,
          equity_shares: c.eqShares,
          equity_price_per_share: price,
        })
        .eq("id", c.row.id);
      if (error) {
        setSaving(false);
        toast({ title: "Didn't save", description: error.message, variant: "destructive" });
        return;
      }
    }
    setSaving(false);
    toast({ title: "Entries saved", description: `${computed.length} team member(s)` });
    await load();
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">My team ratings · FY{year}</CardTitle>
            <CardDescription>
              Enter the rating, then the I/C score, merit, Differentiated Merit and the share award.
              Values outside a range, or spend above budget, cannot be saved.
            </CardDescription>
          </div>
          <div className="grid gap-1 text-right text-xs">
            <BudgetReadout label="Remaining MERIT USD Budget" remaining={meritBudget - spend.merit} total={meritBudget} over={meritOver} />
            <BudgetReadout label="Remaining DM USD Budget" remaining={dmBudget - spend.dm} total={dmBudget} over={dmOver} />
            <BudgetReadout label="Remaining SHARE Budget" remaining={equityBudget - spend.equity} total={equityBudget} over={equityOver} />
            <div className={cn("font-medium", icOver ? "text-destructive" : "text-muted-foreground")}>
              Average I/C Score spend {spend.icAvg ?? "—"} <span className="text-muted-foreground">/ {IC_TARGET}</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <span className="text-muted-foreground">Share price (USD)</span>
              <Input
                type="number"
                step="0.01"
                className="h-7 w-24 text-right text-xs"
                placeholder="0.00"
                value={sharePrice}
                onChange={(e) => setSharePrice(e.target.value)}
              />
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
                    <TableHead rowSpan={2} className="align-bottom w-[150px] bg-primary/10">
                      Performance Rating
                    </TableHead>
                    <TableHead colSpan={4} className="text-center bg-muted">I/C SCORE</TableHead>
                    <TableHead colSpan={5} className="text-center bg-muted/60">MERIT</TableHead>
                    <TableHead colSpan={3} className="text-center bg-muted">DIFFERENTIATED MERIT</TableHead>
                    <TableHead colSpan={4} className="text-center bg-muted/60">SHARE AWARD</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">I/C Score</TableHead>
                    <TableHead className="text-center">Check</TableHead>
                    <TableHead className="text-right">Min %</TableHead>
                    <TableHead className="text-right">Max %</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-center">Check</TableHead>
                    <TableHead className="text-right">Amount / Prorated</TableHead>
                    <TableHead className="text-center">Eligibility</TableHead>
                    <TableHead className="text-right">Min – Max</TableHead>
                    <TableHead className="text-right">% / Amount</TableHead>
                    <TableHead className="text-center">Eligibility</TableHead>
                    <TableHead className="text-right">Min – Max %</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Value / Shares</TableHead>

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {computed.map((c) => (
                    <TableRow key={c.row.id}>
                      <TableCell className="min-w-[170px]">
                        <div className="font-medium text-sm">{c.row.employee_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.row.title ?? c.row.department ?? "—"}
                          {c.proration.prorationFactor < 1 && (
                            <> · {c.proration.eligible ? "prorated" : "too new"}</>
                          )}
                        </div>
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
                          disabled={!c.row.bonus_eligible || c.score == null}
                          onChange={(e) => set(c.row.id, { ic: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-center"><CheckMark ok={c.icOk} /></TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.mRange ? c.mRange.min.toFixed(2) : "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{c.mRange ? c.mRange.max.toFixed(2) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.1"
                          className={cn("h-8 w-20 text-right text-xs", c.meritOk === false && "border-destructive")}
                          value={c.draft.merit}
                          disabled={c.score == null || !c.proration.eligible}
                          onChange={(e) => set(c.row.id, { merit: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-center"><CheckMark ok={c.meritOk} /></TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatMoney(c.meritAmount)}
                        {c.prorated != null && c.prorated !== c.meritAmount && (
                          <div className="text-[11px] text-muted-foreground">
                            prorated {formatMoney(c.prorated)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Checkbox
                            checked={c.draft.dmEligible}
                            onCheckedChange={(v) => set(c.row.id, { dmEligible: !!v, dm: v ? c.draft.dm : "" })}
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {c.draft.dmEligible ? "YES" : "NO"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {DM_RANGE.min.toFixed(2)} – {DM_RANGE.max.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.1"
                          className={cn("h-8 w-20 text-right text-xs", c.dmOk === false && "border-destructive")}
                          value={c.draft.dm}
                          disabled={!c.draft.dmEligible}
                          onChange={(e) => set(c.row.id, { dm: e.target.value })}
                        />
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {formatMoney(c.dmAmount)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Checkbox
                            checked={c.draft.eqEligible}
                            onCheckedChange={(v) => set(c.row.id, { eqEligible: !!v, eq: v ? c.draft.eq : "" })}
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {c.draft.eqEligible ? "YES" : "NO"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {c.eqRange ? `${c.eqRange.min} – ${c.eqRange.max}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.5"
                          className={cn("h-8 w-20 text-right text-xs", c.eqOk === false && "border-destructive")}
                          value={c.draft.eq}
                          disabled={!c.draft.eqEligible || c.score == null}
                          onChange={(e) => set(c.row.id, { eq: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatMoney(c.eqValue)}
                        <div className="text-[11px] text-muted-foreground">
                          {c.eqShares != null ? `${c.eqShares.toLocaleString()} shares` : "set share price"}
                        </div>
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
                  <Bar label="Differentiated merit" budget={dmBudget} spend={spend.dm} />
                  <Bar label="Share awards" budget={equityBudget} spend={spend.equity} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="font-semibold text-muted-foreground">I/C budget ({rows.filter((r) => r.bonus_eligible).length} emps)</div>
                  <div className="text-right">Target {IC_TARGET.toFixed(2)}</div>
                  <div className={cn("text-right font-medium", icOver && "text-destructive")}>
                    Actual {spend.icAvg?.toFixed(2) ?? "0.00"}
                  </div>
                  <div className="font-semibold text-muted-foreground">
                    Shares granted ({computed.filter((c) => c.draft.eqEligible).length} eligible)
                  </div>
                  <div className="text-right">{price ? `$${price} / share` : "no price set"}</div>
                  <div className="text-right font-medium">{spend.shares.toLocaleString()} shares</div>
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
