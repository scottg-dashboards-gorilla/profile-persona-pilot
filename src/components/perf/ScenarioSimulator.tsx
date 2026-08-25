import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, percentFromAmount, type Rating } from "@/lib/compensation";
import { simulateScenarios, type ScenarioRow } from "@/lib/scenarios";
import { FlaskConical, TriangleAlert, Check, Wand2 } from "lucide-react";

export type SimulatorRow = {
  id: string;
  name: string;
  comp: number;
  rating: Rating | null;
  recPct: number;
};

export default function ScenarioSimulator({
  rows,
  onApply,
}: {
  rows: SimulatorRow[];
  onApply: (plan: Record<string, { percent: number; amount: number }>) => void;
}) {
  const [budgets, setBudgets] = useState<number[]>([2, 4, 6]);
  const [selected, setSelected] = useState<number | null>(null);

  const scenarios = useMemo(() => simulateScenarios(rows, budgets), [rows, budgets]);
  const payroll = useMemo(() => rows.reduce((s, r) => s + r.comp, 0), [rows]);

  function setBudget(i: number, value: number) {
    setBudgets((prev) => prev.map((b, idx) => (idx === i ? value : b)));
  }

  function apply(s: ScenarioRow) {
    const plan: Record<string, { percent: number; amount: number }> = {};
    s.allocations.forEach((a) => {
      plan[a.id] = { percent: a.percent, amount: a.amount };
    });
    onApply(plan);
    setSelected(s.budgetPercent);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          Scenario simulator — compare raise budgets side by side
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {budgets.map((b, i) => (
            <div key={i} className="w-24">
              <Label className="text-xs">Scenario {i + 1} %</Label>
              <Input
                className="h-9"
                type="number"
                step="0.1"
                value={b}
                onChange={(e) => setBudget(i, Number(e.target.value))}
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBudgets((p) => [...p, Math.round((p[p.length - 1] + 2) * 10) / 10])}
            disabled={budgets.length >= 5}
          >
            Add scenario
          </Button>
          {budgets.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setBudgets((p) => p.slice(0, -1))}>
              Remove last
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            In-scope payroll {formatMoney(payroll)} · {rows.length} people
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {scenarios.map((s) => (
            <Card
              key={s.budgetPercent}
              className={`border ${
                selected === s.budgetPercent ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{s.budgetPercent}% budget</div>
                  {s.overBudgetRisk === "none" ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-100 text-emerald-800 border-emerald-200"
                    >
                      <Check className="h-3 w-3 mr-1" /> Fits
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={
                        s.overBudgetRisk === "high"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-amber-100 text-amber-900 border-amber-200"
                      }
                    >
                      <TriangleAlert className="h-3 w-3 mr-1" />
                      {s.overBudgetRisk === "high" ? "High risk" : "Tight"}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Budget</div>
                <div className="text-lg font-semibold">{formatMoney(s.budgetAmount)}</div>
                <Progress value={Math.min(100, s.utilisation)} />
                <dl className="text-xs space-y-1 pt-1">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Matrix cost (uncapped)</dt>
                    <dd>{formatMoney(s.uncappedAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Gap vs budget</dt>
                    <dd className={s.gap > 0 ? "text-destructive font-medium" : ""}>
                      {s.gap > 0 ? "+" : ""}
                      {formatMoney(s.gap)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Scaling applied</dt>
                    <dd>{s.scaleFactor.toFixed(2)}×</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Avg raise</dt>
                    <dd>{s.avgPercent.toFixed(1)}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Top performers kept whole</dt>
                    <dd>
                      {s.topPerformersProtected}/{s.topPerformerCount}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">People below matrix</dt>
                    <dd>{s.shortfallCount}</dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">{s.note}</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => apply(s)}>
                  <Wand2 className="h-3.5 w-3.5 mr-1" /> Apply this scenario
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {scenarios.length > 0 && rows.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Matrix %</TableHead>
                  {scenarios.map((s) => (
                    <TableHead key={s.budgetPercent} className="text-right">
                      {s.budgetPercent}%
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{formatMoney(r.comp)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {r.recPct}%
                    </TableCell>
                    {scenarios.map((s) => {
                      const a = s.allocations.find((x) => x.id === r.id);
                      return (
                        <TableCell key={s.budgetPercent} className="text-right text-sm">
                          {a ? (
                            <>
                              {formatMoney(a.amount)}
                              <span className="text-xs text-muted-foreground">
                                {" "}
                                · {percentFromAmount(r.comp, a.amount)}%
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Each scenario starts from the merit matrix, then scales increases down proportionally when
          the budget can't cover them — protecting people rated “Exceeds” first. Applying a scenario
          loads it into the planner above so you can fine-tune before saving.
        </p>
      </CardContent>
    </Card>
  );
}
