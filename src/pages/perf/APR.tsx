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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Download,
  Handshake,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/compensation";
import {
  APR_STAGES,
  IC_TARGET,
  PAY_REVIEW_STATUS_LABEL,
  icAverage,
  payReviewDue,
  payReviewSchedule,
  ratingMeta,
  type AprStage,
} from "@/lib/pmp";
import { format } from "date-fns";
import { AprEntryDialog, type AprReview } from "@/components/perf/AprEntryDialog";
import { RatingsGrid } from "@/components/perf/RatingsGrid";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

const thisYear = new Date().getFullYear();

const SELECT =
  "id, employee_uuid, employee_name, department, title, current_annual_comp, fiscal_year, scheduled_date, rating_score, merit_percent, merit_amount, ic_score, is_executive, exec_payout_amount, apr_stage, escalation_status, escalation_note, promotion, new_title, hr_finalized_at, coo_finance_approved_at, payroll_submitted_at, comp_approval_status, connect_held_at, connect_note, released_at";

type Row = AprReview & {
  hr_finalized_at: string | null;
  coo_finance_approved_at: string | null;
  payroll_submitted_at: string | null;
  comp_approval_status: string | null;
  connect_held_at: string | null;
  connect_note: string | null;
  released_at: string | null;
};

const EXPORT_SELECT =
  "employee_uuid, employee_name, employee_email, department, title, hire_date, current_annual_comp, rating_score, merit_percent, merit_amount, merit_prorated_amount, dm_eligible, dm_percent, dm_amount, ic_score, is_executive, exec_payout_amount, comp_adjustment_amount, comp_adjustment_percent, comp_effective_date, comp_approval_status, comp_approval_note, apr_stage, escalation_status, hr_finalized_at, released_at, employee_ack_at, pay_pushback_status";

type ExportRow = Record<string, string | number | boolean | null>;

const EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: "employee_uuid", label: "Employee ID" },
  { key: "employee_name", label: "Employee" },
  { key: "employee_email", label: "Email" },
  { key: "department", label: "Department" },
  { key: "title", label: "Job title" },
  { key: "hire_date", label: "Start date" },
  { key: "current_annual_comp", label: "Current annual pay" },
  { key: "rating_score", label: "Rating (1-5)" },
  { key: "rating_label", label: "Rating meaning" },
  { key: "merit_percent", label: "Merit %" },
  { key: "merit_amount", label: "Merit amount" },
  { key: "merit_prorated_amount", label: "Merit amount (prorated)" },
  { key: "new_annual_comp", label: "New annual pay" },
  { key: "increase_percent", label: "Total increase %" },
  { key: "ic_score", label: "I/C score" },
  { key: "is_executive", label: "Executive" },
  { key: "exec_payout_amount", label: "Executive pay-out" },
  { key: "comp_adjustment_amount", label: "Pay change amount" },
  { key: "comp_adjustment_percent", label: "Pay change %" },
  { key: "comp_effective_date", label: "Effective date" },
  { key: "comp_approval_status", label: "HR approval" },
  { key: "comp_approval_note", label: "HR approval note" },
  { key: "apr_stage", label: "Stage" },
  { key: "escalation_status", label: "Over-budget exception" },
  { key: "hr_finalized_at", label: "HR approved on" },
  { key: "released_at", label: "Shared with employee on" },
  { key: "employee_ack_at", label: "Employee confirmed on" },
  { key: "pay_pushback_status", label: "Pay concern" },
];

function csvCell(v: unknown) {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildPayChangeCsv(rows: ExportRow[], year: number) {
  const lines = [
    `Datapath pay review cycle — FY${year} pay changes,Generated ${new Date().toISOString().slice(0, 10)}`,
    "",
    EXPORT_COLUMNS.map((c) => csvCell(c.label)).join(","),
  ];
  rows.forEach((r) => {
    const base = Number(r.current_annual_comp ?? 0);
    const merit = Number(r.merit_prorated_amount ?? r.merit_amount ?? 0);
    const dm = Number(r.dm_amount ?? 0);
    const increase = merit + dm;
    const enriched: Record<string, unknown> = {
      ...r,
      rating_label: ratingMeta(r.rating_score as number | null)?.label ?? "",
      new_annual_comp: base ? Math.round(base + increase) : "",
      increase_percent: base ? Number(((increase / base) * 100).toFixed(2)) : "",
    };
    lines.push(EXPORT_COLUMNS.map((c) => csvCell(enriched[c.key])).join(","));
  });
  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


export default function APR() {
  const { toast } = useToast();
  const { has, unconfigured } = usePermissions();
  const isHr = unconfigured || has("admin") || has("hr");

  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState<AprReview | null>(null);
  const [connectRow, setConnectRow] = useState<Row | null>(null);
  const [connectNote, setConnectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("performance_reviews")
      .select(SELECT)
      .eq("fiscal_year", year)
      .order("employee_name");
    let list = (data ?? []) as unknown as Row[];
    if (!isHr) {
      // Managers manage their team's cycles only — never their own.
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (uid) {
        const { data: me } = await supabase
          .from("employees")
          .select("uuid")
          .eq("user_id", uid)
          .maybeSingle();
        if (me?.uuid) list = list.filter((r) => r.employee_uuid !== me.uuid);
      }
    }
    setRows(list);
    setLoading(false);
  }, [year, isHr]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const merit = rows.reduce((s, r) => s + (r.merit_amount ?? 0), 0);
    const exec = rows.reduce((s, r) => s + (r.exec_payout_amount ?? 0), 0);
    return { merit, exec, ic: icAverage(rows.map((r) => r.ic_score)) };
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

  async function exportPayChanges() {
    setExporting(true);
    const { data, error } = await supabase
      .from("performance_reviews")
      .select(EXPORT_SELECT)
      .eq("fiscal_year", year)
      .order("employee_name");
    setExporting(false);
    if (error) {
      toast({ title: "Couldn't build the file", description: error.message, variant: "destructive" });
      return;
    }
    const list = (data ?? []) as unknown as ExportRow[];
    if (list.length === 0) {
      toast({ title: "Nothing to export", description: `No pay entries dated in FY${year}.` });
      return;
    }
    downloadCsv(`datapath-pay-changes-FY${year}.csv`, buildPayChangeCsv(list, year));
    toast({ title: "Pay change file downloaded", description: `${list.length} people · FY${year}` });
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pay review cycle</h1>
          <p className="text-sm text-muted-foreground">
            Each person's pay review runs on their own start-date anniversary. The manager enters the
            rating and pay, HR approves it, then it is shared with the employee before the
            anniversary. Over-budget entries route to an exception first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isHr && (
            <Button variant="outline" size="sm" disabled={exporting} onClick={exportPayChanges}>
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Export pay changes
            </Button>
          )}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => (
                <SelectItem key={y} value={String(y)}>FY{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>


      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Merit planned" value={formatMoney(totals.merit)} icon={Wallet} />
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
        <CardContent className="grid gap-3 md:grid-cols-4">
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

      <AnniversaryPanel year={year} rows={rows} onCreated={load} />

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
                                onClick={() => advance(r, "hr_review", {}, "Sent to HR")}>
                                <ArrowRight className="h-3.5 w-3.5 mr-1" /> To HR
                              </Button>
                            )}
                            {(r.apr_stage === "hr_review" || r.apr_stage === "coo_finance") && (
                              <Button size="sm" disabled={busy === r.id || !isHr}
                                title={isHr ? undefined : "HR or admin only"}
                                onClick={() => {
                                  const now = new Date().toISOString();
                                  advance(r, "closed", {
                                    hr_finalized_at: r.hr_finalized_at ?? now,
                                    comp_approval_status: "approved",
                                    comp_approved_at: now,
                                    status: "completed",
                                  }, "Signed off by HR — the manager can hold the connect now");
                                }}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> HR sign-off
                              </Button>
                            )}
                            {r.apr_stage === "closed" && (!r.connect_held_at || !r.connect_note) && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button size="sm" variant="secondary" disabled={busy === r.id}
                                  onClick={() => {
                                    setConnectRow(r);
                                    setConnectNote("");
                                  }}>
                                  <Handshake className="h-3.5 w-3.5 mr-1" /> Log connect
                                </Button>
                                <span className="text-[11px] leading-snug text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  Sharing is locked — log the connect note first
                                </span>
                              </div>
                            )}
                            {r.apr_stage === "closed" && r.connect_held_at && r.connect_note && !r.released_at && (
                              <Button size="sm" disabled={busy === r.id}
                                onClick={() =>
                                  advance(r, "closed", { released_at: new Date().toISOString() },
                                    "Outcome shared with the employee")
                                }>
                                <ArrowRight className="h-3.5 w-3.5 mr-1" /> Share outcome
                              </Button>
                            )}
                            {r.apr_stage === "closed" && r.released_at && (
                              <span className="text-xs text-emerald-700">Shared with the employee</span>
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

      <Dialog open={!!connectRow} onOpenChange={(o) => !o && setConnectRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-4 w-4" /> Log the connect with {connectRow?.employee_name}
            </DialogTitle>
            <DialogDescription>
              Confirm you've sat down with them and note what you covered. The outcome can't be
              shared until this is logged.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="What you covered in the sit-down (rating, pay outcome, questions raised)…"
            value={connectNote}
            onChange={(e) => setConnectNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectRow(null)}>
              Cancel
            </Button>
            <Button
              disabled={!connectNote.trim() || busy === connectRow?.id}
              onClick={async () => {
                if (!connectRow) return;
                const row = connectRow;
                await advance(
                  row,
                  "closed",
                  { connect_held_at: new Date().toISOString(), connect_note: connectNote.trim() },
                  "Connect logged — you can share the outcome now",
                );
                setConnectRow(null);
              }}
            >
              <Handshake className="h-3.5 w-3.5 mr-1" /> Save connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [budgets, setBudgets] = useState<Record<string, { merit: string }>>({});
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
    const map: Record<string, { merit: string }> = {};
    ((b ?? []) as { manager_uuid: string; merit_budget_amount: number }[]).forEach((row) => {
      map[row.manager_uuid] = {
        merit: String(row.merit_budget_amount ?? 0),
      };
    });
    setBudgets(map);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(m: Mgr) {
    const v = budgets[m.uuid] ?? { merit: "0" };
    setSaving(m.uuid);
    const { error } = await supabase.from("manager_budgets").upsert(
      {
        manager_uuid: m.uuid,
        fiscal_year: year,
        merit_budget_amount: Number(v.merit) || 0,
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
          Merit pots. Managers with 5 or more reports are hard-blocked from saving
          entries above these amounts — exceptions route to the next-level manager.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {mgrs.length === 0 && <p className="text-sm text-muted-foreground">No managers with reports yet.</p>}
        {mgrs.map((m) => {
          const v = budgets[m.uuid] ?? { merit: "" };
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

type Person = {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  department: string | null;
  title: string | null;
  hire_date: string | null;
  current_annual_comp: number | null;
  manager_uuid: string | null;
  user_id: string | null;
};

/**
 * Pay reviews are anchored to each person's start-date anniversary rather than one
 * company-wide cycle, so this panel shows who is coming up and lets HR/managers open
 * that person's review with the anniversary as its due date.
 */
function AnniversaryPanel({
  year,
  rows,
  onCreated,
}: {
  year: number;
  rows: { employee_uuid: string }[];
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const { has, unconfigured } = usePermissions();
  const isAdminHr = unconfigured || has("admin") || has("hr");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data }, { data: auth }] = await Promise.all([
        supabase
          .from("employees")
          .select("uuid, first_name, last_name, email, department, title, hire_date, current_annual_comp, manager_uuid, user_id")
          .eq("terminated", false),
        supabase.auth.getUser(),
      ]);
      const all = (data ?? []) as unknown as Person[];
      if (isAdminHr) {
        setPeople(all);
      } else {
        // Managers only see the people they manage (direct reports and one
        // level below) — not their own anniversary.
        const meUuid = all.find((e) => e.user_id && e.user_id === auth?.user?.id)?.uuid ?? null;
        if (!meUuid) {
          setPeople([]);
        } else {
          const direct = all.filter((e) => e.manager_uuid === meUuid).map((e) => e.uuid);
          const team = new Set([
            ...direct,
            ...all.filter((e) => e.manager_uuid && direct.includes(e.manager_uuid)).map((e) => e.uuid),
          ]);
          // Managers see only their reports — not their own anniversary.
          setPeople(all.filter((e) => team.has(e.uuid) && e.uuid !== meUuid));
        }
      }
      setLoading(false);
    })();
  }, [isAdminHr]);

  const existing = useMemo(() => new Set(rows.map((r) => r.employee_uuid)), [rows]);

  const due = useMemo(() => {
    return people
      .map((p) => ({ p, due: payReviewDue(p.hire_date) }))
      .filter((x): x is { p: Person; due: NonNullable<ReturnType<typeof payReviewDue>> } => !!x.due)
      .filter((x) => x.due.daysUntil <= 90)
      .sort((a, b) => a.due.daysUntil - b.due.daysUntil);
  }, [people]);

  const noStart = people.filter((p) => !p.hire_date).length;

  async function startReview(p: Person, on: Date) {
    setBusy(p.uuid);
    const { error } = await supabase.from("performance_reviews").insert({
      employee_uuid: p.uuid,
      employee_name: `${p.first_name} ${p.last_name}`,
      employee_email: p.email,
      department: p.department,
      title: p.title,
      hire_date: p.hire_date,
      current_annual_comp: p.current_annual_comp,
      scheduled_date: format(on, "yyyy-MM-dd"),
      comp_effective_date: format(on, "yyyy-MM-dd"),
      review_cycle: `Anniversary ${on.getFullYear()}`,
      review_type: "annual",
      status: "scheduled",
      fiscal_year: year,
      apr_stage: "manager_entry",
    });
    setBusy(null);
    if (error) {
      toast({ title: "Couldn't open the review", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Pay review opened",
      description: `${p.first_name} ${p.last_name} · due ${format(on, "d MMM yyyy")}`,
    });
    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anniversaries coming up</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : due.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No start-date anniversaries in the next three months.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Anniversary</TableHead>
                  <TableHead>Years</TableHead>
                  <TableHead>Where it stands</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {due.map(({ p, due: d }) => {
                  const started = existing.has(p.uuid);
                  return (
                    <TableRow key={p.uuid}>
                      <TableCell>
                        <div className="font-medium">{p.first_name} {p.last_name}</div>
                        <div className="text-xs text-muted-foreground">{p.title ?? p.department ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(d.date, "d MMM yyyy")}
                        <div className="text-xs text-muted-foreground">
                          {d.daysUntil < 0
                            ? `${Math.abs(d.daysUntil)} days ago`
                            : d.daysUntil === 0
                              ? "Today"
                              : `in ${d.daysUntil} days`}
                        </div>
                        {(() => {
                          const s = payReviewSchedule(d.date);
                          return (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              Entry {format(s.managerEntryOpens, "d MMM")} · HR by{" "}
                              {format(s.hrSignOffBy, "d MMM")} · connect &amp; share{" "}
                              {format(s.connectAndShareBy, "d MMM")}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">{d.years}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px]",
                            d.status === "overdue" && "bg-red-100 text-red-800 border-red-200",
                            d.status === "due" && "bg-amber-100 text-amber-900 border-amber-200",
                            d.status === "open" && "bg-emerald-100 text-emerald-800 border-emerald-200",
                          )}
                        >
                          {PAY_REVIEW_STATUS_LABEL[d.status]}
                        </Badge>
                        {!started && d.status === "upcoming" && (
                          <div className="text-[11px] text-muted-foreground mt-1">
                            Opens {format(d.opensOn, "d MMM")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {started ? (
                          <span className="text-xs text-muted-foreground">Review open below</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === p.uuid}
                            onClick={() => startReview(p, d.date)}
                          >
                            Open pay review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {noStart > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {noStart} {noStart === 1 ? "person has" : "people have"} no start date on file, so no
            anniversary can be worked out for them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
