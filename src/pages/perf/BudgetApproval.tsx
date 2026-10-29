import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

type Row = {
  uuid: string;
  name: string;
  reports: number;
  teamPay: number;
  budget: number | null;
  status: string;
  approvedAt: string | null;
  planned: number;
};

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function BudgetApproval() {
  const { toast } = useToast();
  const { has, unconfigured } = usePermissions();
  const canEdit = unconfigured || has("admin") || has("hr");
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [pct, setPct] = useState("5");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: emps }, { data: b }, { data: revs }] = await Promise.all([
      supabase.from("employees").select("uuid, first_name, last_name, manager_uuid, current_annual_comp").eq("terminated", false),
      supabase.from("manager_budgets").select("manager_uuid, merit_budget_amount, approval_status, approved_at").eq("fiscal_year", year),
      supabase.from("performance_reviews").select("employee_uuid, merit_amount, fiscal_year").eq("fiscal_year", year),
    ]);
    const list = (emps ?? []) as { uuid: string; first_name: string; last_name: string; manager_uuid: string | null; current_annual_comp: number | null }[];
    const mgrOf = new Map(list.map((e) => [e.uuid, e.manager_uuid]));
    const planned = new Map<string, number>();
    (revs ?? []).forEach((r: { employee_uuid: string; merit_amount: number | null }) => {
      const m = mgrOf.get(r.employee_uuid);
      if (m) planned.set(m, (planned.get(m) ?? 0) + Number(r.merit_amount ?? 0));
    });
    const budgets = new Map((b ?? []).map((x) => [x.manager_uuid, x]));
    const agg = new Map<string, { reports: number; pay: number }>();
    list.forEach((e) => {
      if (!e.manager_uuid) return;
      const a = agg.get(e.manager_uuid) ?? { reports: 0, pay: 0 };
      a.reports++;
      a.pay += Number(e.current_annual_comp ?? 0);
      agg.set(e.manager_uuid, a);
    });
    const out: Row[] = Array.from(agg.entries())
      .map(([uuid, a]) => {
        const m = list.find((e) => e.uuid === uuid);
        const bb = budgets.get(uuid);
        return {
          uuid,
          name: m ? `${m.first_name} ${m.last_name}` : uuid,
          reports: a.reports,
          teamPay: a.pay,
          budget: bb ? Number(bb.merit_budget_amount) : null,
          status: bb?.approval_status ?? "not_set",
          approvedAt: bb?.approved_at ?? null,
          planned: planned.get(uuid) ?? 0,
        };
      })
      .sort((x, y) => x.name.localeCompare(y.name));
    setRows(out);
    setDraft(Object.fromEntries(out.map((r) => [r.uuid, r.budget != null ? String(r.budget) : ""])));
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => ({
    budget: rows.reduce((s, r) => s + (r.budget ?? 0), 0),
    approved: rows.filter((r) => r.status === "approved").length,
    planned: rows.reduce((s, r) => s + r.planned, 0),
  }), [rows]);

  async function write(r: Row, status: "pending" | "approved") {
    const amount = Number(draft[r.uuid]);
    if (!Number.isFinite(amount) || amount < 0 || draft[r.uuid] === "") {
      toast({ title: "Enter a budget amount first", variant: "destructive" });
      return;
    }
    if (status === "approved" && amount < r.planned) {
      toast({ title: "Budget is below planned merit", description: `${r.name}'s team already has ${money(r.planned)} planned.`, variant: "destructive" });
      return;
    }
    setBusy(r.uuid + status);
    const { error } = await supabase.from("manager_budgets").upsert(
      { manager_uuid: r.uuid, fiscal_year: year, merit_budget_amount: amount, approval_status: status },
      { onConflict: "manager_uuid,fiscal_year" },
    );
    setBusy(null);
    if (error) return toast({ title: "Didn't save", description: error.message, variant: "destructive" });
    toast({ title: status === "approved" ? "Budget approved" : "Budget saved as draft", description: `${r.name} · FY${year}` });
    load();
  }

  function fillAll() {
    const p = Number(pct) / 100;
    setDraft((d) => {
      const next = { ...d };
      rows.forEach((r) => { if (r.status !== "approved") next[r.uuid] = String(Math.round(r.teamPay * p)); });
      return next;
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Budget approval</h1>
          <p className="text-sm text-muted-foreground">
            Set each manager's merit budget and approve it. Managers can't save merit increases until their budget is approved.
          </p>
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => <SelectItem key={y} value={String(y)}>FY{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total budget</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{money(totals.budget)}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Approved</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.approved} / {rows.length} managers</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Merit planned so far</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{money(totals.planned)}</CardContent></Card>
      </div>

      {canEdit && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6 text-sm">
            Suggest budgets at
            <Input className="h-9 w-20" type="number" value={pct} onChange={(e) => setPct(e.target.value)} />
            % of each team's pay
            <Button size="sm" variant="outline" onClick={fillAll}>Fill unapproved rows</Button>
            <span className="text-muted-foreground">Nothing saves until you click Save or Approve.</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Manager</th><th>Reports</th><th>Team pay</th><th>Merit budget</th><th>Planned</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const changed = draft[r.uuid] !== (r.budget != null ? String(r.budget) : "");
                    const status = changed && r.status === "approved" ? "edited" : r.status;
                    return (
                      <tr key={r.uuid} className="border-t">
                        <td className="py-2 font-medium">{r.name}</td>
                        <td>{r.reports}</td>
                        <td>{money(r.teamPay)}</td>
                        <td>
                          <Input className="h-8 w-32" type="number" disabled={!canEdit} value={draft[r.uuid] ?? ""}
                            onChange={(e) => setDraft((d) => ({ ...d, [r.uuid]: e.target.value }))} />
                        </td>
                        <td className={r.budget != null && r.planned > r.budget ? "text-destructive" : ""}>{money(r.planned)}</td>
                        <td>
                          {status === "approved" ? <Badge>Approved{r.approvedAt ? ` ${new Date(r.approvedAt).toLocaleDateString()}` : ""}</Badge>
                            : status === "edited" ? <Badge variant="outline">Edited — re-approve</Badge>
                            : status === "pending" ? <Badge variant="secondary">Awaiting approval</Badge>
                            : <Badge variant="outline">Not set</Badge>}
                        </td>
                        <td className="space-x-2 whitespace-nowrap text-right">
                          {canEdit && (
                            <>
                              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => write(r, "pending")}>Save</Button>
                              <Button size="sm" disabled={!!busy || (status === "approved")} onClick={() => write(r, "approved")}>
                                {busy === r.uuid + "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Changing an approved amount sends it back to "Awaiting approval", which pauses new merit increases for that team until it's approved again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
