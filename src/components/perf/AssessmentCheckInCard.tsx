import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  technicalDelta,
  readableTier,
  type AttemptRow,
  type CompetencyDelta,
} from "@/lib/assessmentDeltas";
import { competencyLabel } from "@/components/perf/ActionItemsPanel";

type Request = {
  id: string;
  note: string | null;
  due_date: string | null;
  requester_name: string | null;
  status: string;
  created_at: string;
};

/** Band inside which a score counts as unchanged. */
const FLAT_BAND = 3;

function tone(delta: number | null) {
  if (delta == null) return "text-muted-foreground";
  if (delta > FLAT_BAND) return "text-emerald-600";
  if (delta < -FLAT_BAND) return "text-red-600";
  return "text-muted-foreground";
}

function Icon({ delta }: { delta: number | null }) {
  if (delta != null && delta > FLAT_BAND) return <TrendingUp className="h-3.5 w-3.5" />;
  if (delta != null && delta < -FLAT_BAND) return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

/**
 * Employee-facing card: any open request to take the assessment, plus how the
 * latest result compares with their very first (baseline) assessment.
 */
export function AssessmentCheckInCard({ employeeUuid }: { employeeUuid: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeUuid) return;
    (async () => {
      setLoading(true);
      const [reqRes, attRes] = await Promise.all([
        supabase
          .from("assessment_check_in_requests")
          .select("id,note,due_date,requester_name,status,created_at")
          .eq("employee_uuid", employeeUuid)
          .eq("status", "open")
          .order("created_at", { ascending: false }),
        supabase
          .from("assessment_attempts")
          .select(
            "id,employee_uuid,review_id,cycle_id,taken_at,submitted_at,disc_scores,disc_primary,tier,technical_scores,truthfulness_score",
          )
          .eq("employee_uuid", employeeUuid)
          .order("taken_at", { ascending: true }),
      ]);
      setRequests((reqRes.data ?? []) as Request[]);
      setAttempts((attRes.data ?? []) as AttemptRow[]);
      setLoading(false);
    })();
  }, [employeeUuid]);

  if (loading) return null;

  const baseline = attempts[0] ?? null;
  const latest = attempts.length > 1 ? attempts[attempts.length - 1] : null;
  const deltas: CompetencyDelta[] = latest && baseline ? technicalDelta(baseline, latest) : [];
  const improved = deltas.filter((d) => (d.delta ?? 0) > FLAT_BAND).length;
  const slipped = deltas.filter((d) => (d.delta ?? 0) < -FLAT_BAND).length;
  const link = `/assessment?employee=${employeeUuid}`;

  if (requests.length === 0 && attempts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assessment check-in</CardTitle>
        <CardDescription>
          You can take the assessment at any time. Each one is measured against your baseline — your
          first assessment — so you can see what's moved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge>Requested</Badge>
              <span className="text-muted-foreground">
                {r.requester_name ? `${r.requester_name} asked` : "Asked"} on{" "}
                {format(parseISO(r.created_at), "MMM d, yyyy")}
                {r.due_date ? ` · complete by ${format(parseISO(r.due_date), "MMM d, yyyy")}` : ""}
              </span>
            </div>
            {r.note && <p className="text-sm">{r.note}</p>}
            <Button asChild size="sm">
              <a href={link} target="_blank" rel="noreferrer">
                Start the assessment <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          </div>
        ))}

        {baseline && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">Against your baseline</span>
              <span className="text-muted-foreground">
                {format(parseISO(baseline.taken_at), "MMM d, yyyy")}
                {latest ? ` → ${format(parseISO(latest.taken_at), "MMM d, yyyy")}` : ""}
              </span>
              {latest?.tier && <Badge variant="secondary">{readableTier(latest.tier)}</Badge>}
            </div>
            {!latest ? (
              <p className="text-sm text-muted-foreground">
                This is your baseline. Take the assessment again and this card will show what's
                improved and where you've slipped back.
              </p>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  {improved} area{improved === 1 ? "" : "s"} improved · {slipped} slipped back ·{" "}
                  {deltas.length - improved - slipped} about the same
                </div>
                <div className="space-y-2">
                  {deltas.map((d) => (
                    <div key={d.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{competencyLabel(d.id)}</span>
                        <span className={`flex items-center gap-1 tabular-nums ${tone(d.delta)}`}>
                          <Icon delta={d.delta} />
                          {d.delta == null
                            ? `${Math.round(d.to)}`
                            : `${Math.round(d.from ?? 0)} → ${Math.round(d.to)} (${d.delta > 0 ? "+" : ""}${Math.round(d.delta)})`}
                        </span>
                      </div>
                      <Progress value={Math.max(0, Math.min(100, d.to))} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </>
            )}
            {!requests.length && (
              <Button asChild size="sm" variant="outline">
                <a href={link} target="_blank" rel="noreferrer">
                  Take it again now <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
