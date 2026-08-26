import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { UserSquare2, Target } from "lucide-react";

type SelfRow = {
  wins: string | null;
  challenges: string | null;
  growth: string | null;
  support_needed: string | null;
  submitted_at: string | null;
};

type CheckIn = {
  id: string;
  goal_id: string;
  progress_note: string | null;
  current_value: number | null;
  confidence: string | null;
  goals?: { title: string | null } | null;
};

/** Read-only view of what the employee said about their own period. */
export function SelfAssessmentPanel({ reviewId }: { reviewId: string }) {
  const [self, setSelf] = useState<SelfRow | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: sa }, { data: ci }] = await Promise.all([
        supabase
          .from("review_self_assessments")
          .select("wins, challenges, growth, support_needed, submitted_at")
          .eq("review_id", reviewId)
          .maybeSingle(),
        supabase
          .from("goal_check_ins")
          .select("id, goal_id, progress_note, current_value, confidence, goals(title)")
          .eq("review_id", reviewId),
      ]);
      if (cancelled) return;
      setSelf((sa as SelfRow) ?? null);
      setCheckIns((ci ?? []) as unknown as CheckIn[]);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  if (!loaded) return null;

  if (!self?.submitted_at) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground flex items-start gap-2">
        <UserSquare2 className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          No self-assessment yet. You can still complete the review, but the employee's own account of the
          period is the cheapest context you'll get — send them their link from the Workflow panel.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-medium flex items-center gap-2">
          <UserSquare2 className="h-4 w-4" /> In their own words
        </div>
        <span className="text-xs text-muted-foreground">
          submitted {format(parseISO(self.submitted_at), "MMM d, yyyy")}
        </span>
      </div>

      <div className="grid gap-2">
        <Field label="What went well" value={self.wins} />
        <Field label="What was hard" value={self.challenges} />
        <Field label="How they've grown" value={self.growth} />
        <Field label="Support they need" value={self.support_needed} />
      </div>

      {checkIns.length > 0 && (
        <div className="border-t pt-2 space-y-1.5">
          <div className="text-xs font-medium flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Goal check-ins ({checkIns.length})
          </div>
          {checkIns.map((c) => (
            <div key={c.id} className="text-xs">
              <span className="font-medium">{c.goals?.title ?? "Goal"}</span>
              {c.current_value != null && (
                <span className="text-muted-foreground"> · at {c.current_value}</span>
              )}
              {c.confidence && <span className="text-muted-foreground"> · {c.confidence}</span>}
              {c.progress_note && (
                <div className="text-muted-foreground whitespace-pre-wrap">{c.progress_note}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{value}</div>
    </div>
  );
}
