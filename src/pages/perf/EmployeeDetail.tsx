import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  AttemptRow,
  discDelta,
  technicalDelta,
  tierChange,
  readableTier,
  pickLatestPair,
} from "@/lib/assessmentDeltas";

type Employee = {
  uuid: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  department: string | null;
};

function deltaTone(d: number) {
  if (d > 0) return "text-emerald-600";
  if (d < 0) return "text-red-600";
  return "text-muted-foreground";
}

function DeltaIcon({ d }: { d: number }) {
  if (d > 0) return <TrendingUp className="h-3.5 w-3.5" />;
  if (d < 0) return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

export default function EmployeeDetail() {
  const { uuid = "" } = useParams<{ uuid: string }>();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [empRes, attemptsRes] = await Promise.all([
        supabase
          .from("employees")
          .select("uuid,first_name,last_name,email,title,department")
          .eq("uuid", uuid)
          .maybeSingle(),
        supabase
          .from("assessment_attempts")
          .select(
            "id,employee_uuid,review_id,cycle_id,taken_at,submitted_at,disc_scores,disc_primary,tier,technical_scores,truthfulness_score",
          )
          .eq("employee_uuid", uuid)
          .order("taken_at", { ascending: true }),
      ]);
      setEmp((empRes.data as Employee | null) ?? null);
      setAttempts((attemptsRes.data ?? []) as AttemptRow[]);
      setLoading(false);
    })();
  }, [uuid]);

  const { current, previous } = useMemo(() => pickLatestPair(attempts), [attempts]);

  const discSeries = useMemo(
    () =>
      attempts.map((a) => ({
        date: format(parseISO(a.taken_at), "MMM yy"),
        D: a.disc_scores?.D ?? 0,
        I: a.disc_scores?.I ?? 0,
        S: a.disc_scores?.S ?? 0,
        C: a.disc_scores?.C ?? 0,
      })),
    [attempts],
  );

  const techDeltas = useMemo(
    () => (current ? technicalDelta(previous, current) : []),
    [previous, current],
  );

  const radarData = useMemo(() => {
    if (!current) return [];
    return techDeltas.map((d) => ({
      competency: d.id,
      current: d.to,
      previous: d.from ?? 0,
    }));
  }, [techDeltas, current]);

  const discChips = current ? discDelta(previous, current) : [];
  const tier = current ? tierChange(previous, current) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/people">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to people
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">
              {emp ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() : loading ? "Loading…" : "Unknown employee"}
            </div>
            <div className="text-sm text-muted-foreground">
              {emp?.title}
              {emp?.department && <> · {emp.department}</>}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current tier</div>
              <div className="font-semibold">{readableTier(current?.tier ?? null)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Primary DISC</div>
              <div className="font-semibold">{current?.disc_primary ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last assessed</div>
              <div className="font-semibold">
                {current ? format(parseISO(current.taken_at), "MMM d, yyyy") : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Attempts</div>
              <div className="font-semibold">{attempts.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {attempts.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No assessment attempts on file yet. Request one from this employee's next review.
          </CardContent>
        </Card>
      )}

      {attempts.length > 0 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">DISC over time</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={discSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="D" stroke="hsl(0 70% 50%)" />
                  <Line type="monotone" dataKey="I" stroke="hsl(40 90% 50%)" />
                  <Line type="monotone" dataKey="S" stroke="hsl(140 60% 40%)" />
                  <Line type="monotone" dataKey="C" stroke="hsl(210 70% 50%)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Technical competencies (latest vs previous)</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {radarData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No technical scores recorded.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="competency" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Radar name="Previous" dataKey="previous" stroke="hsl(220 10% 60%)" fill="hsl(220 10% 60%)" fillOpacity={0.25} />
                      <Radar name="Current" dataKey="current" stroke="hsl(155 100% 32%)" fill="hsl(155 100% 32%)" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Latest changes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tier && (
                  <div className="text-sm">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tier</div>
                    <div className="font-medium">
                      {readableTier(tier.from)} → {readableTier(tier.to)}
                      {tier.changed && <Badge variant="secondary" className="ml-2">Changed</Badge>}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">DISC shift</div>
                  <div className="flex flex-wrap gap-2">
                    {discChips.map((d) => (
                      <span
                        key={d.letter}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${deltaTone(d.delta)}`}
                      >
                        <DeltaIcon d={d.delta} />
                        {d.letter} {d.delta >= 0 ? "+" : ""}
                        {d.delta.toFixed(0)}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Competency deltas
                  </div>
                  <div className="space-y-1 text-sm max-h-48 overflow-auto pr-1">
                    {techDeltas.length === 0 && (
                      <div className="text-muted-foreground">No competencies recorded.</div>
                    )}
                    {techDeltas.map((d) => (
                      <div key={d.id} className="flex items-center justify-between">
                        <span className="truncate">{d.id}</span>
                        <span className={`inline-flex items-center gap-1 text-xs ${d.delta == null ? "text-muted-foreground" : deltaTone(d.delta)}`}>
                          {d.delta != null && <DeltaIcon d={d.delta} />}
                          {d.delta == null ? `new · ${d.to.toFixed(0)}` : `${d.delta >= 0 ? "+" : ""}${d.delta.toFixed(0)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Attempt history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Primary DISC</TableHead>
                    <TableHead>Truthfulness</TableHead>
                    <TableHead>Linked review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...attempts]
                    .sort((a, b) => b.taken_at.localeCompare(a.taken_at))
                    .map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{format(parseISO(a.taken_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{readableTier(a.tier)}</TableCell>
                        <TableCell>{a.disc_primary ?? "—"}</TableCell>
                        <TableCell>{a.truthfulness_score != null ? a.truthfulness_score.toFixed(0) : "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {a.review_id ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}