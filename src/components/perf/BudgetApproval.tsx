import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/compensation";

/** The standing company rule: every manager's merit pot is 5% of their team's pay. */
export const MERIT_POOL_RATE = 0.05;

type Manager = {
  uuid: string;
  name: string;
  reports: number;
  teamPay: number;
  budget: number | null;
  status: string;
};

/**
 * Admin/HR card: the annual merit budget per manager (5% of their team's pay)
 * with an explicit approval step before managers can spend it.
 */
export function BudgetApproval({ year }: { year: number }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: emps }, { data: budgets }] = await Promise.all([
      supabase
        .from("employees")
        .select("uuid, first_name, last_name, manager_uuid, current_annual_comp")
        .eq("terminated", false),
      supabase.from("manager_budgets").select("*").eq("fiscal_year", year),
    ]);

    const people = (emps ?? []) as {
      uuid: string;
      first_name: string;
      last_name: string;
      manager_uuid: string | null;
      current_annual_comp: number | null;
    }[];
    const budgetMap = new Map(
      ((budgets ?? []) as { manager_uuid: string; merit_budget_amount: number; approval_status: string }[]).map(
        (b) => [b.manager_uuid, b],
      ),
    );

    const agg = new Map<string, { reports: number; pay: number }>();
    people.forEach((p) => {
      if (!p.manager_uuid) return;
      const cur = agg.get(p.manager_uuid) ?? { reports: 0, pay: 0 };
      cur.reports += 1;
      cur.pay += Number(p.current_annual_comp ?? 0);
      agg.set(p.manager_uuid, cur);
    });

    const list: Manager[] = Array.from(agg.entries())
      .map(([uuid, v]) => {
        const m = people.find((p) => p.uuid === uuid);
        const b = budgetMap.get(uuid);
        return {
          uuid,
          name: m ? `${m.first_name} ${m.last_name}` : uuid,
          reports: v.reports,
          teamPay: v.pay,
          budget: b ? Number(b.merit_budget_amount) : null,
          status: b?.approval_status ?? "pending",
        };
      })
      .sort((a, b) => b.teamPay - a.teamPay);

    setRows(list);
    setLoading(false);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const pool = rows.reduce((s, r) => s + Math.round(r.teamPay * MERIT_POOL_RATE), 0);
    const approved = rows.filter((r) => r.status === "approved").length;
    return { pool, approved, pending: rows.length - approved };
  }, [rows]);

  const shown = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  async function approve(list: Manager[], label: string) {
    if (list.length === 0) return;
    setBusy(label);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("manager_budgets").upsert(
      list.map((m) => ({
        manager_uuid: m.uuid,
        fiscal_year: year,
        merit_budget_amount: Math.round(m.teamPay * MERIT_POOL_RATE),
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: auth.user?.id ?? null,
      })),
      { onConflict: "manager_uuid,fiscal_year" },
    );
    setBusy(null);
    if (error) {
      toast({ title: "Couldn't approve", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: list.length === 1 ? "Budget approved" : `${list.length} budgets approved`,
      description: `5% of team pay · ${year}`,
    });
    await load();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Approve annual merit budget · {year}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Every manager gets 5% of their team's total pay. Approve it before managers enter pay
              decisions — {totals.approved} approved, {totals.pending} waiting.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Company pot</div>
              <div className="text-lg font-semibold">{formatMoney(totals.pool)}</div>
            </div>
            <Button
              size="sm"
              disabled={busy !== null || totals.pending === 0}
              onClick={() => approve(rows.filter((r) => r.status !== "approved"), "all")}
            >
              {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Approve all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          className="h-9 max-w-xs"
          placeholder="Find a manager…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No managers with reports yet.</p>
        ) : (
          <div className="divide-y">
            {shown.map((m) => {
              const pot = Math.round(m.teamPay * MERIT_POOL_RATE);
              const approved = m.status === "approved";
              return (
                <div key={m.uuid} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-[180px]">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.reports} report{m.reports === 1 ? "" : "s"} · team pay {formatMoney(m.teamPay)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatMoney(pot)}</div>
                    <div className="text-[11px] text-muted-foreground">5% of team pay</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {approved ? (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Waiting</Badge>
                    )}
                    <Button
                      size="sm"
                      variant={approved ? "outline" : "default"}
                      disabled={busy !== null}
                      onClick={() => approve([m], m.uuid)}
                    >
                      {busy === m.uuid ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : approved ? (
                        "Re-approve"
                      ) : (
                        "Approve"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BudgetApproval;
