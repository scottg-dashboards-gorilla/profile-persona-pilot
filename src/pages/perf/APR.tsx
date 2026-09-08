import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/compensation";
import {
  APR_STAGES,
  IC_TARGET,
  icAverage,
  ratingMeta,
  type AprStage,
} from "@/lib/pmp";
import { AprEntryDialog, type AprReview } from "@/components/perf/AprEntryDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

const thisYear = new Date().getFullYear();

const SELECT =
  "id, employee_uuid, employee_name, department, title, current_annual_comp, fiscal_year, scheduled_date, rating_score, merit_percent, merit_amount, bonus_eligible, bonus_amount, ic_score, is_executive, exec_payout_amount, apr_stage, escalation_status, escalation_note, promotion, new_title, hr_finalized_at, coo_finance_approved_at, payroll_submitted_at";

type Row = AprReview & {
  hr_finalized_at: string | null;
  coo_finance_approved_at: string | null;
  payroll_submitted_at: string | null;
};

export default function APR() {
  const { toast } = useToast();
  const { has, unconfigured } = usePermissions();
  const isHr = unconfigured || has("admin") || has("hr");

  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<AprReview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("performance_reviews")
      .select(SELECT)
      .eq("fiscal_year", year)
      .order("employee_name");
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const merit = rows.reduce((s, r) => s + (r.merit_amount ?? 0), 0);
    const bonus = rows.reduce((s, r) => s + (r.bonus_amount ?? 0), 0);
    const exec = rows.reduce((s, r) => s + (r.exec_payout_amount ?? 0), 0);
    return { merit, bonus, exec, ic: icAverage(rows.map((r) => r.ic_score)) };
  }, [rows]);

  const stageCount = (stage: AprStage) => rows.filter((r) => r.apr_stage === stage).length;

  async function advance(row: Row, stage: AprStage, body: Record<string, unknown>, msg: string) {
    setBusy(row.id);
    const { error } = await supabase
      .from("performance_reviews")
      .update({ apr_stage: stage, ...body })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      toast({ title: "Didn't work", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: msg, description: row.employee_name });
    await load();
  }

  async function decideEscalation(row: Row, approved: boolean) {
    setBusy(row.id);
    const { error } = await supabase
      .from("performance_reviews")
      .update({
        escalation_status: approved ? "approved" : "rejected",
        escalation_decided_at: new Date().toISOString(),
        apr_stage: approved ? "hr_review" : "manager_entry",
      })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      toast({ title: "Didn't work", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: approved ? "Exception approved" : "Sent back to the manager" });
    await load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Annual Pay Review (APR)</h1>
          <p className="text-sm text-muted-foreground">
            Rating and pay entries from managers, over-budget exceptions, HR/TR finalization, COO &amp;
            Finance sign-off, then close to payroll.
          </p>
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>FY{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Merit planned" value={formatMoney(totals.merit)} icon={Wallet} />
        <Stat label="Bonus planned" value={formatMoney(totals.bonus)} icon={BadgeCheck} />
        <Stat label="Executive pay-out" value={formatMoney(totals.exec)} icon={ShieldCheck} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              I/C average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-semibold",
                totals.ic != null && Math.abs(totals.ic - IC_TARGET) > 0.5 ? "text-amber-700" : "text-emerald-700",
              )}
            >
              {totals.ic ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground">Global target {IC_TARGET}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Process stages</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {APR_STAGES.map((s, i) => (
            <div key={s.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{i + 1}. {s.label}</span>
                <Badge variant="secondary" className="text-[10px]">{stageCount(s.id)}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{s.owner} · {s.window}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s.what}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <RatingsGrid year={year} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">FY{year} pay entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No reviews dated in FY{year}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Merit</TableHead>
                    <TableHead className="text-right">Bonus</TableHead>
                    <TableHead className="text-right">I/C</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Next step</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const meta = ratingMeta(r.rating_score);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.employee_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.title ?? r.department ?? "—"}
                            {r.is_executive && " · Executive"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {meta ? (
                            <Badge variant="outline" className={meta.tone}>{meta.short}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.merit_amount != null ? (
                            <>
                              {formatMoney(r.merit_amount)}
                              <div className="text-xs text-muted-foreground">{r.merit_percent}%</div>
                            </>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.bonus_eligible ? formatMoney(r.bonus_amount ?? 0) : <span className="text-muted-foreground">n/a</span>}
                        </TableCell>
                        <TableCell className="text-right">{r.ic_score ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px]">
                            {APR_STAGES.find((s) => s.id === r.apr_stage)?.label ?? r.apr_stage}
                          </Badge>
                          {r.escalation_status === "pending" && (
                            <div className="text-[11px] text-amber-700 mt-1">Exception waiting</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => setOpen(r)}>
                              Enter
                            </Button>
                            {r.escalation_status === "pending" && (
                              <>
                                <Button size="sm" variant="ghost" disabled={busy === r.id}
                                  onClick={() => decideEscalation(r, false)}>
                                  Send back
                                </Button>
                                <Button size="sm" disabled={busy === r.id} onClick={() => decideEscalation(r, true)}>
                                  Approve exception
                                </Button>
                              </>
                            )}
                            {r.apr_stage === "manager_entry" && r.escalation_status !== "pending" && (
                              <Button size="sm" disabled={busy === r.id || r.rating_score == null}
                                title={r.rating_score == null ? "Enter a rating first" : undefined}
                                onClick={() => advance(r, "hr_review", {}, "Sent to HR / TR")}>
                                <ArrowRight className="h-3.5 w-3.5 mr-1" /> To HR
                              </Button>
                            )}
                            {r.apr_stage === "hr_review" && (
                              <Button size="sm" disabled={busy === r.id || !isHr}
                                title={isHr ? undefined : "HR or admin only"}
                                onClick={() => advance(r, "coo_finance", { hr_finalized_at: new Date().toISOString() }, "Finalized by HR")}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> HR finalize
                              </Button>
                            )}
                            {r.apr_stage === "coo_finance" && (
                              <Button size="sm" disabled={busy === r.id || !isHr}
                                onClick={() => advance(r, "closed", {
                                  coo_finance_approved_at: new Date().toISOString(),
                                  payroll_submitted_at: new Date().toISOString(),
                                  status: "completed",
                                }, "Approved and closed to payroll")}>
                                <Lock className="h-3.5 w-3.5 mr-1" /> Approve &amp; close
                              </Button>
                            )}
                            {r.apr_stage === "closed" && (
                              <span className="text-xs text-emerald-700">Submitted to payroll</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isHr && <ManagerBudgets year={year} />}

      <AprEntryDialog
        review={open}
        fiscalYear={year}
        onOpenChange={(o) => !o && setOpen(null)}
        onSaved={() => {
          setOpen(null);
          load();
        }}
      />
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

type Mgr = { uuid: string; name: string; reports: number };

function ManagerBudgets({ year }: { year: number }) {
  const { toast } = useToast();
  const [mgrs, setMgrs] = useState<Mgr[]>([]);
  const [budgets, setBudgets] = useState<Record<string, { merit: string; bonus: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: emps }, { data: b }] = await Promise.all([
      supabase.from("employees").select("uuid, first_name, last_name, manager_uuid").eq("terminated", false),
      supabase.from("manager_budgets").select("*").eq("fiscal_year", year),
    ]);
    const list = (emps ?? []) as { uuid: string; first_name: string; last_name: string; manager_uuid: string | null }[];
    const counts = new Map<string, number>();
    list.forEach((e) => {
      if (e.manager_uuid) counts.set(e.manager_uuid, (counts.get(e.manager_uuid) ?? 0) + 1);
    });
    const managers: Mgr[] = Array.from(counts.entries())
      .map(([uuid, reports]) => {
        const m = list.find((e) => e.uuid === uuid);
        return { uuid, name: m ? `${m.first_name} ${m.last_name}` : uuid, reports };
      })
      .sort((a, b2) => b2.reports - a.reports);
    setMgrs(managers);
    const map: Record<string, { merit: string; bonus: string }> = {};
    ((b ?? []) as { manager_uuid: string; merit_budget_amount: number; bonus_budget_amount: number }[]).forEach((row) => {
      map[row.manager_uuid] = {
        merit: String(row.merit_budget_amount ?? 0),
        bonus: String(row.bonus_budget_amount ?? 0),
      };
    });
    setBudgets(map);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(m: Mgr) {
    const v = budgets[m.uuid] ?? { merit: "0", bonus: "0" };
    setSaving(m.uuid);
    const { error } = await supabase.from("manager_budgets").upsert(
      {
        manager_uuid: m.uuid,
        fiscal_year: year,
        merit_budget_amount: Number(v.merit) || 0,
        bonus_budget_amount: Number(v.bonus) || 0,
      },
      { onConflict: "manager_uuid,fiscal_year" },
    );
    setSaving(null);
    if (error) {
      toast({ title: "Didn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Budget saved", description: `${m.name} · FY${year}` });
    await load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manager budgets · FY{year}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Separate merit and bonus pots. Managers with 5 or more reports are hard-blocked from saving
          entries above these amounts — exceptions route to the next-level manager.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {mgrs.length === 0 && <p className="text-sm text-muted-foreground">No managers with reports yet.</p>}
        {mgrs.map((m) => {
          const v = budgets[m.uuid] ?? { merit: "", bonus: "" };
          return (
            <div key={m.uuid} className="flex items-end gap-3 flex-wrap border-b pb-3 last:border-0">
              <div className="min-w-[160px]">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  {m.reports} report{m.reports === 1 ? "" : "s"}
                  {m.reports >= 5 ? " · gate enforced" : " · gate not enforced"}
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Merit budget</Label>
                <Input
                  className="h-9 w-32"
                  type="number"
                  value={v.merit}
                  onChange={(e) => setBudgets((p) => ({ ...p, [m.uuid]: { ...v, merit: e.target.value } }))}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Bonus budget</Label>
                <Input
                  className="h-9 w-32"
                  type="number"
                  value={v.bonus}
                  onChange={(e) => setBudgets((p) => ({ ...p, [m.uuid]: { ...v, bonus: e.target.value } }))}
                />
              </div>
              <Button size="sm" variant="outline" disabled={saving === m.uuid} onClick={() => save(m)}>
                {saving === m.uuid ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
