import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Lock, ShieldAlert } from "lucide-react";

type Row = {
  id: string;
  employee_uuid: string | null;
  source_name: string;
  title: string | null;
  function_name: string | null;
  sub_function: string | null;
  line_manager_name: string | null;
  work_state: string | null;
  employment_type: string | null;
  increment_2026: number | null;
  increment_2025: number | null;
  increment_2024: number | null;
  salary_2026: number | null;
  date_2026: string | null;
  salary_2025: number | null;
  date_2025: string | null;
  salary_2024: number | null;
  date_2024: string | null;
  salary_2023: number | null;
  date_2023: string | null;
};

type Scenario = {
  id: string;
  scenario_percent: number;
  people_needing_increase: number | null;
  month_label: string;
  headcount: number;
  impact_year: number;
  impact_month: number;
  boy_cost: number;
  sort_order: number;
};

const money = (v: number | null) =>
  v == null || v === 0 ? "—" : v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);

const when = (v: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

export default function SalaryHistory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [h, s] = await Promise.all([
        supabase.from("comp_salary_history").select("*").order("source_name"),
        supabase.from("comp_increase_scenarios").select("*").order("scenario_percent").order("sort_order"),
      ]);
      setRows((h.data ?? []) as Row[]);
      setScenarios((s.data ?? []) as Scenario[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.source_name, r.title, r.function_name, r.sub_function, r.line_manager_name, r.work_state]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  const grouped = useMemo(() => {
    const by = new Map<number, Scenario[]>();
    scenarios.forEach((s) => {
      const key = Number(s.scenario_percent);
      by.set(key, [...(by.get(key) ?? []), s]);
    });
    return [...by.entries()].sort((a, b) => b[0] - a[0]);
  }, [scenarios]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading salary history…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Salary history</h1>
          <p className="text-sm text-muted-foreground">
            Pay history and increase dates from the FY2026 pay proposal.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Lock className="h-3 w-3" /> Confidential
        </Badge>
      </div>

      <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            Admins see everyone. Managers see only the people they manage. This is enforced on the data itself, so nothing
            outside your team is ever sent to your screen.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-base">
            Pay history <span className="text-muted-foreground font-normal">({filtered.length})</span>
          </CardTitle>
          <CardDescription>Latest salary, effective date and the increase given each year.</CardDescription>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, title, function or manager…"
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nothing to show. If you manage people, their pay history appears here once it is on file.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Line manager</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">2026</TableHead>
                    <TableHead className="text-right">2025</TableHead>
                    <TableHead className="text-right">2024</TableHead>
                    <TableHead className="text-right">2023</TableHead>
                    <TableHead className="text-right">Increases</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">{r.source_name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.title ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{r.function_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {r.line_manager_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.work_state ?? "—"}</TableCell>
                      {(
                        [
                          [r.salary_2026, r.date_2026],
                          [r.salary_2025, r.date_2025],
                          [r.salary_2024, r.date_2024],
                          [r.salary_2023, r.date_2023],
                        ] as [number | null, string | null][]
                      ).map(([amount, date], i) => (
                        <TableCell key={i} className="text-right whitespace-nowrap">
                          <div>{money(amount)}</div>
                          {amount ? <div className="text-xs text-muted-foreground">{when(date)}</div> : null}
                        </TableCell>
                      ))}
                      <TableCell className="text-right whitespace-nowrap text-xs text-muted-foreground">
                        <div>26: {pct(r.increment_2026)}</div>
                        <div>25: {pct(r.increment_2025)}</div>
                        <div>24: {pct(r.increment_2024)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {grouped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">FY2026 increase scenarios</CardTitle>
            <CardDescription>
              Cost of a 5%, 4% and 3% increase for the {scenarios[0]?.people_needing_increase ?? 0} people due a raise,
              phased by month. Admins only.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {grouped.map(([percent, months]) => {
              const total = months.reduce((sum, m) => sum + Number(m.boy_cost || 0), 0);
              return (
                <div key={percent} className="rounded-lg border p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">{(percent * 100).toFixed(0)}% increase</span>
                    <span className="text-xs text-muted-foreground">total impact {money(total)}</span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    {months.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          {m.month_label} <span className="text-xs">({m.headcount})</span>
                        </span>
                        <span className="tabular-nums">{money(Number(m.impact_year))}/yr</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
