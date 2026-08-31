import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  Lock,
  Unlock,
  Building2,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { formatMoney } from "@/lib/compensation";
import {
  DEFAULT_CURVE,
  achievementTone,
  blendedAchievement,
  forecastScenarios,
  fundingFor,
  kpiAchievement,
  poolPercentAt,
  type CurvePoint,
  type Kpi,
} from "@/lib/companyPerformance";
import { useCompanyPerformance } from "@/hooks/useCompanyPerformance";

export default function CompanyPerformance() {
  const { toast } = useToast();
  const { bundles, loading, reload } = useCompanyPerformance();
  const [yearId, setYearId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // local editable state
  const [peopleCost, setPeopleCost] = useState(0);
  const [override, setOverride] = useState<string>("");
  const [forecastFor, setForecastFor] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [curve, setCurve] = useState<CurvePoint[]>(DEFAULT_CURVE);

  const bundle = useMemo(
    () => bundles.find((b) => b.year.id === yearId) ?? bundles[0] ?? null,
    [bundles, yearId],
  );
  const locked = bundle?.year.status === "locked";

  useEffect(() => {
    if (!bundle) return;
    setYearId(bundle.year.id);
    setPeopleCost(Number(bundle.year.people_cost ?? 0));
    setOverride(
      bundle.year.pool_percent_override === null || bundle.year.pool_percent_override === undefined
        ? ""
        : String(bundle.year.pool_percent_override),
    );
    setForecastFor(bundle.year.forecast_for_year ?? bundle.year.fiscal_year + 1);
    setNotes(bundle.year.forecast_notes ?? "");
    setKpis(bundle.kpis);
    setCurve(bundle.curve.length ? bundle.curve : DEFAULT_CURVE);
  }, [bundle?.year.id, bundles]);

  const achievement = blendedAchievement(kpis);
  const funding = fundingFor(
    {
      people_cost: peopleCost,
      achievement_percent: achievement,
      pool_percent_override: override === "" ? null : Number(override),
    },
    kpis,
    curve,
  );
  const scenarios = forecastScenarios(peopleCost, curve, achievement);

  async function createYear() {
    const nextYear = new Date().getFullYear() - 1;
    const fiscal = bundles.length ? Math.max(...bundles.map((b) => b.year.fiscal_year)) + 1 : nextYear;
    const { data, error } = await supabase
      .from("company_performance_years")
      .insert({
        fiscal_year: fiscal,
        label: `FY${fiscal}`,
        forecast_for_year: fiscal + 1,
        people_cost: 0,
      })
      .select("id")
      .single();
    if (error || !data) {
      toast({ title: "Could not add the year", description: friendly(error?.message), variant: "destructive" });
      return;
    }
    await supabase.from("funding_curve_points").insert(
      DEFAULT_CURVE.map((p) => ({ ...p, year_id: data.id })),
    );
    await reload();
    setYearId(data.id);
    toast({ title: `FY${fiscal} added`, description: "Set the people cost, KPIs and funding curve." });
  }

  async function saveAll() {
    if (!bundle) return;
    setSaving(true);
    const id = bundle.year.id;

    const { error: yErr } = await supabase
      .from("company_performance_years")
      .update({
        people_cost: peopleCost,
        achievement_percent: achievement,
        pool_percent_override: override === "" ? null : Number(override),
        funded_pool_amount: funding.poolAmount,
        forecast_for_year: forecastFor === "" ? null : Number(forecastFor),
        forecast_notes: notes || null,
      })
      .eq("id", id);

    // KPIs: upsert existing, insert new
    const newKpis = kpis.filter((k) => k.id.startsWith("new-"));
    const oldKpis = kpis.filter((k) => !k.id.startsWith("new-"));
    const errors: string[] = [];
    if (yErr) errors.push(yErr.message);

    for (const k of oldKpis) {
      const { error } = await supabase
        .from("company_kpis")
        .update({
          name: k.name,
          weight: k.weight,
          target_value: k.target_value,
          actual_value: k.actual_value,
          unit: k.unit,
          sort_order: k.sort_order,
        })
        .eq("id", k.id);
      if (error) errors.push(error.message);
    }
    if (newKpis.length) {
      const { error } = await supabase.from("company_kpis").insert(
        newKpis.map((k, i) => ({
          year_id: id,
          name: k.name,
          weight: k.weight,
          target_value: k.target_value,
          actual_value: k.actual_value,
          unit: k.unit,
          sort_order: oldKpis.length + i,
        })),
      );
      if (error) errors.push(error.message);
    }

    // Funding curve: replace wholesale, it is a small set
    const { error: delErr } = await supabase.from("funding_curve_points").delete().eq("year_id", id);
    if (delErr) errors.push(delErr.message);
    const { error: insErr } = await supabase.from("funding_curve_points").insert(
      curve.map((p) => ({
        year_id: id,
        achievement_percent: p.achievement_percent,
        pool_percent: p.pool_percent,
      })),
    );
    if (insErr) errors.push(insErr.message);

    setSaving(false);
    await reload();
    if (errors.length) {
      toast({ title: "Some changes did not save", description: friendly(errors[0]), variant: "destructive" });
    } else {
      toast({ title: "Company performance saved", description: "The appraisal pool has been updated." });
    }
  }

  async function toggleLock() {
    if (!bundle) return;
    const nextStatus = locked ? "draft" : "locked";
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("company_performance_years")
      .update({
        status: nextStatus,
        locked_at: nextStatus === "locked" ? new Date().toISOString() : null,
        locked_by: nextStatus === "locked" ? auth.user?.id ?? null : null,
        funded_pool_amount: funding.poolAmount,
        achievement_percent: achievement,
      })
      .eq("id", bundle.year.id);
    if (error) {
      toast({ title: "Could not change the lock", description: friendly(error.message), variant: "destructive" });
      return;
    }
    await reload();
    toast({
      title: nextStatus === "locked" ? "Financial year locked" : "Financial year unlocked",
      description:
        nextStatus === "locked"
          ? "The funded pool is now fixed and feeds the pay review planner."
          : "You can edit targets, actuals and the curve again.",
    });
  }

  async function removeKpi(k: Kpi) {
    if (k.id.startsWith("new-")) {
      setKpis((prev) => prev.filter((x) => x.id !== k.id));
      return;
    }
    const { error } = await supabase.from("company_kpis").delete().eq("id", k.id);
    if (error) {
      toast({ title: "Could not remove the KPI", description: friendly(error.message), variant: "destructive" });
      return;
    }
    setKpis((prev) => prev.filter((x) => x.id !== k.id));
  }

  function patchKpi(id: string, patch: Partial<Kpi>) {
    setKpis((prev) => prev.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading company performance…
      </div>
    );
  }

  if (!bundle) {
    return (
      <Card className="max-w-xl mx-auto mt-10">
        <CardContent className="p-8 text-center space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No financial year set up yet</h2>
          <p className="text-sm text-muted-foreground">
            Add a financial year, enter the annual targets and actuals, and the appraisal pool will be
            funded from how the business performed.
          </p>
          <Button size="sm" onClick={createYear}>
            <Plus className="h-4 w-4 mr-1" /> Add a financial year
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <Label className="text-xs">Financial year</Label>
          <Select value={bundle.year.id} onValueChange={setYearId}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bundles.map((b) => (
                <SelectItem key={b.year.id} value={b.year.id}>
                  {b.year.label ?? `FY${b.year.fiscal_year}`} · {b.year.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label className="text-xs">Total people cost</Label>
          <Input
            className="h-9"
            type="number"
            disabled={locked}
            value={peopleCost}
            onChange={(e) => setPeopleCost(Number(e.target.value))}
          />
        </div>
        <div className="w-40">
          <Label className="text-xs">Pool % override</Label>
          <Input
            className="h-9"
            type="number"
            step="0.1"
            placeholder={`Curve: ${funding.curvePercent}%`}
            disabled={locked}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Label className="text-xs">Pays out in</Label>
          <Input
            className="h-9"
            type="number"
            disabled={locked}
            value={forecastFor}
            onChange={(e) => setForecastFor(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={createYear}>
            <Plus className="h-4 w-4 mr-1" /> Year
          </Button>
          <Button variant="outline" size="sm" onClick={toggleLock}>
            {locked ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
            {locked ? "Unlock" : "Lock & fund"}
          </Button>
          <Button size="sm" onClick={saveAll} disabled={saving || locked}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {locked && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="h-3.5 w-3.5" />
          {bundle.year.label ?? `FY${bundle.year.fiscal_year}`} is locked
          {bundle.year.locked_at ? ` since ${new Date(bundle.year.locked_at).toLocaleDateString()}` : ""} — the
          funded pool below is what the pay review planner spends. Unlock to change targets or actuals.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          {
            label: "Business achievement",
            value: achievement === null ? "—" : `${achievement}%`,
            tone: achievementTone(achievement),
          },
          { label: "People cost", value: formatMoney(peopleCost) },
          {
            label: funding.overridden ? `Pool % (override)` : "Pool % of people cost",
            value: `${funding.poolPercent}%`,
          },
          { label: "Funded appraisal pool", value: formatMoney(funding.poolAmount) },
        ].map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div className={`text-xl font-semibold ${t.tone ?? ""}`}>{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Annual target scorecard
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={locked}
              onClick={() =>
                setKpis((prev) => [
                  ...prev,
                  {
                    id: `new-${Date.now()}`,
                    name: "",
                    weight: 1,
                    target_value: 0,
                    actual_value: null,
                    unit: null,
                    sort_order: prev.length,
                  },
                ])
              }
            >
              <Plus className="h-4 w-4 mr-1" /> KPI
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KPI</TableHead>
                <TableHead className="w-24 text-right">Weight</TableHead>
                <TableHead className="w-36 text-right">Target</TableHead>
                <TableHead className="w-36 text-right">Actual</TableHead>
                <TableHead className="w-24">Unit</TableHead>
                <TableHead className="w-28 text-right">Achieved</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                    No KPIs yet. Add the annual targets the business is measured against — revenue,
                    EBITDA, margin, retention — and weight them.
                  </TableCell>
                </TableRow>
              )}
              {kpis.map((k) => {
                const pct = kpiAchievement(k);
                return (
                  <TableRow key={k.id}>
                    <TableCell>
                      <Input
                        className="h-8"
                        disabled={locked}
                        placeholder="Revenue"
                        value={k.name}
                        onChange={(e) => patchKpi(k.id, { name: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-right"
                        type="number"
                        step="0.1"
                        disabled={locked}
                        value={k.weight}
                        onChange={(e) => patchKpi(k.id, { weight: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-right"
                        type="number"
                        disabled={locked}
                        value={k.target_value}
                        onChange={(e) => patchKpi(k.id, { target_value: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-right"
                        type="number"
                        disabled={locked}
                        value={k.actual_value ?? ""}
                        onChange={(e) =>
                          patchKpi(k.id, {
                            actual_value: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        disabled={locked}
                        placeholder="$ / %"
                        value={k.unit ?? ""}
                        onChange={(e) => patchKpi(k.id, { unit: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell className={`text-right text-sm ${achievementTone(pct)}`}>
                      {pct === null ? "—" : `${Math.round(pct * 10) / 10}%`}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={locked}
                        onClick={() => removeKpi(k)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              Funding curve
              <Button
                variant="outline"
                size="sm"
                disabled={locked}
                onClick={() =>
                  setCurve((prev) => [...prev, { achievement_percent: 0, pool_percent: 0 }])
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Point
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              How business achievement converts into the appraisal pool, as a share of people cost.
              Values between points are interpolated.
            </p>
            {curve
              .slice()
              .sort((a, b) => a.achievement_percent - b.achievement_percent)
              .map((p, i) => (
                <div key={`${p.achievement_percent}-${i}`} className="flex items-center gap-2">
                  <Input
                    className="h-8 w-24 text-right"
                    type="number"
                    step="0.1"
                    disabled={locked}
                    value={p.achievement_percent}
                    onChange={(e) =>
                      setCurve((prev) =>
                        prev.map((x) =>
                          x === p ? { ...x, achievement_percent: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <span className="text-xs text-muted-foreground">% achieved funds</span>
                  <Input
                    className="h-8 w-24 text-right"
                    type="number"
                    step="0.1"
                    disabled={locked}
                    value={p.pool_percent}
                    onChange={(e) =>
                      setCurve((prev) =>
                        prev.map((x) => (x === p ? { ...x, pool_percent: Number(e.target.value) } : x)),
                      )
                    }
                  />
                  <span className="text-xs text-muted-foreground">% of people cost</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 ml-auto"
                    disabled={locked}
                    onClick={() => setCurve((prev) => prev.filter((x) => x !== p))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            <div className="pt-1">
              <div className="text-xs text-muted-foreground mb-1">
                At {achievement === null ? "—" : `${achievement}%`} achievement the curve funds{" "}
                {funding.curvePercent}%.
              </div>
              <Progress value={Math.min(100, (funding.curvePercent / 12) * 100)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {forecastFor === "" ? "Next year" : forecastFor} pay review forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Forecast from this year's actuals. Lock the year and the base pool becomes the budget in
              the Annual Pay Review planner each January.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {scenarios.map((s) => (
                <div
                  key={s.key}
                  className={`rounded-lg border p-3 ${s.key === "base" ? "border-primary" : ""}`}
                >
                  <div className="text-xs text-muted-foreground">
                    {s.label} · {s.achievement}%
                  </div>
                  <div className="text-lg font-semibold">{formatMoney(s.poolAmount)}</div>
                  <div className="text-xs text-muted-foreground">{s.poolPercent}% of people cost</div>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs">Forecast notes</Label>
              <Textarea
                rows={3}
                disabled={locked}
                placeholder="Assumptions behind the forecast, board commitments, phasing…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Badge variant={locked ? "default" : "secondary"}>
                {locked ? "Funded & locked" : "Draft — not funding payouts yet"}
              </Badge>
              <Button asChild size="sm" variant="outline">
                <Link to="/compensation">
                  Open pay review planner <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Individual merit still comes from each person's rating and assessment growth — company
        performance sets the size of the pot those increases are paid from. Pool % is read off the
        funding curve at the weighted achievement of the annual targets, e.g. {poolPercentAt(curve, 90)}%
        of people cost at 90% and {poolPercentAt(curve, 100)}% at target.
      </p>
    </div>
  );
}

function friendly(msg?: string | null) {
  if (!msg) return undefined;
  if (msg.includes("row-level security") || msg.includes("permission")) {
    return "Only Admin or HR can change company performance. Sign in with an Admin or HR account.";
  }
  return msg;
}
