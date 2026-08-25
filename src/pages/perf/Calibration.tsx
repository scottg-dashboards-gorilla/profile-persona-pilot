import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { calibrate, ratingToNumber, MIN_SAMPLE, type ReviewerSample } from "@/lib/calibration";
import { Scale, TriangleAlert, Check, Info } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Cycle = { id: string; name: string; status: string };

const biasTone: Record<string, string> = {
  lenient: "bg-amber-100 text-amber-900 border-amber-200",
  severe: "bg-red-100 text-red-800 border-red-200",
  aligned: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "low-variance": "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const biasLabel: Record<string, string> = {
  lenient: "Lenient",
  severe: "Severe",
  aligned: "Aligned",
  "low-variance": "Flat ratings",
};

export default function Calibration() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleId, setCycleId] = useState("all");
  const [contributorSamples, setContributorSamples] = useState<ReviewerSample[]>([]);
  const [managerSamples, setManagerSamples] = useState<ReviewerSample[]>([]);
  const [assessmentSamples, setAssessmentSamples] = useState<ReviewerSample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("review_cycles")
        .select("id,name,status")
        .order("starts_at", { ascending: false });
      setCycles((data ?? []) as Cycle[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let rq = supabase
        .from("performance_reviews")
        .select("id,employee_uuid,employee_name,reviewer_uuid,overall_rating,cycle_id");
      if (cycleId !== "all") rq = rq.eq("cycle_id", cycleId);

      const [{ data: reviews }, { data: employees }] = await Promise.all([
        rq,
        supabase.from("employees").select("uuid,first_name,last_name,manager_uuid"),
      ]);

      const empName: Record<string, string> = {};
      const managerOf: Record<string, string | null> = {};
      (employees ?? []).forEach((e: any) => {
        empName[e.uuid] = `${e.first_name} ${e.last_name}`;
        managerOf[e.uuid] = e.manager_uuid;
      });

      const revRows = (reviews ?? []) as any[];
      const reviewIds = revRows.map((r) => r.id);

      // Manager ratings: reviewer is the explicit reviewer, else the employee's manager.
      const mgr: ReviewerSample[] = [];
      revRows.forEach((r) => {
        const num = r.overall_rating ? ratingToNumber[r.overall_rating] : undefined;
        if (num === undefined) return;
        const key = r.reviewer_uuid ?? managerOf[r.employee_uuid] ?? "unassigned";
        mgr.push({
          reviewerKey: key,
          reviewerName: empName[key] ?? "Unassigned reviewer",
          rating: num,
          subject: r.employee_name,
        });
      });
      setManagerSamples(mgr);

      // Contributor (360) ratings.
      let contrib: ReviewerSample[] = [];
      let assess: ReviewerSample[] = [];
      if (reviewIds.length) {
        const [{ data: cRows }, { data: attempts }] = await Promise.all([
          supabase
            .from("review_contributors")
            .select("contributor_uuid,contributor_name,rating_overall,review_id")
            .in("review_id", reviewIds),
          supabase
            .from("assessment_attempts")
            .select("employee_uuid,technical_scores,tier,review_id")
            .in("review_id", reviewIds),
        ]);
        contrib = ((cRows ?? []) as any[])
          .filter((c) => c.rating_overall != null)
          .map((c) => ({
            reviewerKey: c.contributor_uuid,
            reviewerName: c.contributor_name,
            rating: Number(c.rating_overall),
          }));

        // Assessment outcomes grouped by the reviewer responsible for that review,
        // so we can see whether a manager's team also scores differently on the assessment.
        const reviewById: Record<string, any> = {};
        revRows.forEach((r) => (reviewById[r.id] = r));
        assess = ((attempts ?? []) as any[])
          .map((a) => {
            const scores = Object.values(a.technical_scores ?? {})
              .map((v: any) => (typeof v === "number" ? v : v?.normalizedScore ?? v?.score))
              .filter((n: any) => typeof n === "number") as number[];
            if (!scores.length) return null;
            const avg5 = (scores.reduce((s, n) => s + n, 0) / scores.length) / 20; // 0-100 → 1-5
            const rev = reviewById[a.review_id];
            const key = rev?.reviewer_uuid ?? managerOf[a.employee_uuid] ?? "unassigned";
            return {
              reviewerKey: key,
              reviewerName: empName[key] ?? "Unassigned reviewer",
              rating: Math.max(0, Math.min(5, avg5)),
            } as ReviewerSample;
          })
          .filter(Boolean) as ReviewerSample[];
      }
      setContributorSamples(contrib);
      setAssessmentSamples(assess);
      setLoading(false);
    })();
  }, [cycleId]);

  const views = useMemo(
    () => ({
      managers: calibrate(managerSamples),
      contributors: calibrate(contributorSamples),
      assessment: calibrate(assessmentSamples),
    }),
    [managerSamples, contributorSamples, assessmentSamples],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px]">
          <Label className="text-xs">Cycle</Label>
          <Select value={cycleId} onValueChange={setCycleId}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cycles</SelectItem>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} · {c.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground max-w-md">
          Ratings are normalised to a 1–5 scale. A reviewer is flagged once they have at least{" "}
          {MIN_SAMPLE} ratings and sit half a point (or one standard deviation) away from the company
          average.
        </p>
      </div>

      <Tabs defaultValue="managers">
        <TabsList>
          <TabsTrigger value="managers">Manager ratings</TabsTrigger>
          <TabsTrigger value="contributors">360 contributors</TabsTrigger>
          <TabsTrigger value="assessment">Assessment outcomes</TabsTrigger>
        </TabsList>
        {(["managers", "contributors", "assessment"] as const).map((key) => {
          const view = views[key];
          const flagged = view.reviewers.filter((r) => r.outlier);
          return (
            <TabsContent key={key} value={key} className="space-y-4 mt-4">
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Ratings analysed", value: String(view.total) },
                  { label: "Company average", value: view.total ? view.companyMean.toFixed(1) : "—" },
                  { label: "Spread (σ)", value: view.total ? view.companySpread.toFixed(1) : "—" },
                  { label: "Reviewers flagged", value: String(flagged.length) },
                ].map((t) => (
                  <Card key={t.label}>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">{t.label}</div>
                      <div className="text-xl font-semibold">{t.value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" /> Distribution by reviewer
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reviewer</TableHead>
                        <TableHead className="text-right">n</TableHead>
                        <TableHead className="text-right">Mean</TableHead>
                        <TableHead className="text-right">Median</TableHead>
                        <TableHead className="text-right">σ</TableHead>
                        <TableHead className="text-right">Δ vs company</TableHead>
                        <TableHead>Signal</TableHead>
                        <TableHead className="text-right">Suggested shift</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                            Loading calibration data…
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && view.reviewers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                            No ratings recorded for this view yet.
                          </TableCell>
                        </TableRow>
                      )}
                      {view.reviewers.map((r) => (
                        <TableRow key={r.reviewerKey}>
                          <TableCell className="font-medium">
                            {r.reviewerName}
                            <div className="text-xs text-muted-foreground max-w-sm">{r.note}</div>
                          </TableCell>
                          <TableCell className="text-right">{r.count}</TableCell>
                          <TableCell className="text-right">{r.mean.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{r.median.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{r.spread.toFixed(1)}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              r.deviation > 0
                                ? "text-amber-700"
                                : r.deviation < 0
                                  ? "text-red-600"
                                  : ""
                            }`}
                          >
                            {r.deviation > 0 ? "+" : ""}
                            {r.deviation.toFixed(1)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={biasTone[r.bias]}>
                              {biasLabel[r.bias]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {r.suggestedAdjustment
                              ? `${r.suggestedAdjustment > 0 ? "+" : ""}${r.suggestedAdjustment.toFixed(1)}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {view.reviewers.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Rating mix (1–5 buckets)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[1, 2, 3, 4, 5].map((bucket, i) => ({
                          bucket: `${bucket}`,
                          count: view.reviewers.reduce((s, r) => s + r.histogram[i], 0),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="bucket" />
                        <YAxis allowDecimals={false} />
                        <ReTooltip />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {flagged.length ? (
                      <TriangleAlert className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Check className="h-4 w-4 text-emerald-600" />
                    )}
                    Suggested alignment actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {flagged.length === 0 && (
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Info className="h-4 w-4" /> No reviewer is far enough from the company average
                      to need calibration right now.
                    </p>
                  )}
                  {flagged.map((r) => (
                    <div
                      key={r.reviewerKey}
                      className="rounded-md border border-border p-3 flex flex-wrap items-center gap-2"
                    >
                      <span className="font-medium">{r.reviewerName}</span>
                      <Badge variant="outline" className={biasTone[r.bias]}>
                        {biasLabel[r.bias]}
                      </Badge>
                      <span className="text-muted-foreground">
                        Shift their ratings by{" "}
                        <span className="font-medium text-foreground">
                          {r.suggestedAdjustment > 0 ? "+" : ""}
                          {r.suggestedAdjustment.toFixed(1)}
                        </span>{" "}
                        to align with the company average of {view.companyMean.toFixed(1)}.
                      </span>
                      <Button size="sm" variant="outline" className="ml-auto" asChild>
                        <a href={`/reviews`}>Open their reviews</a>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
