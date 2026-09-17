import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { UserSquare2, Target, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type SelfRow = {
  wins: string | null;
  challenges: string | null;
  growth: string | null;
  support_needed: string | null;
  submitted_at: string | null;
  manager_reply_wins: string | null;
  manager_reply_challenges: string | null;
  manager_reply_growth: string | null;
  manager_reply_support: string | null;
  manager_replied_at: string | null;
};

type ReplyKey =
  | "manager_reply_wins"
  | "manager_reply_challenges"
  | "manager_reply_growth"
  | "manager_reply_support";

type CheckIn = {
  id: string;
  goal_id: string;
  progress_note: string | null;
  current_value: number | null;
  confidence: string | null;
  goals?: { title: string | null } | null;
};

const SELECT =
  "wins, challenges, growth, support_needed, submitted_at, manager_reply_wins, manager_reply_challenges, manager_reply_growth, manager_reply_support, manager_replied_at";

const FIELDS: { label: string; value: keyof SelfRow; reply: ReplyKey }[] = [
  { label: "What went well", value: "wins", reply: "manager_reply_wins" },
  { label: "What was hard", value: "challenges", reply: "manager_reply_challenges" },
  { label: "How they've grown", value: "growth", reply: "manager_reply_growth" },
  { label: "Support they need", value: "support_needed", reply: "manager_reply_support" },
];

/**
 * What the employee said about their own period. When `canReply` is set the
 * manager gets a comment box against each thing the employee shared.
 */
export function SelfAssessmentPanel({
  reviewId,
  canReply = false,
}: {
  reviewId: string;
  canReply?: boolean;
}) {
  const { toast } = useToast();
  const [self, setSelf] = useState<SelfRow | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: sa }, { data: ci }] = await Promise.all([
        supabase
          .from("review_self_assessments")
          .select(SELECT)
          .eq("review_id", reviewId)
          .maybeSingle(),
        supabase
          .from("goal_check_ins")
          .select("id, goal_id, progress_note, current_value, confidence, goals(title)")
          .eq("review_id", reviewId),
      ]);
      if (cancelled) return;
      const row = (sa as SelfRow) ?? null;
      setSelf(row);
      setDrafts({
        manager_reply_wins: row?.manager_reply_wins ?? "",
        manager_reply_challenges: row?.manager_reply_challenges ?? "",
        manager_reply_growth: row?.manager_reply_growth ?? "",
        manager_reply_support: row?.manager_reply_support ?? "",
      });
      setCheckIns((ci ?? []) as unknown as CheckIn[]);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  async function saveReply(key: ReplyKey) {
    const value = drafts[key]?.trim() ? drafts[key] : null;
    if ((self?.[key] ?? null) === value) return;
    const { error } = await supabase
      .from("review_self_assessments")
      .update({ [key]: value, manager_replied_at: new Date().toISOString() })
      .eq("review_id", reviewId);
    if (error) {
      toast({ title: "Comment not saved", description: error.message, variant: "destructive" });
      return;
    }
    setSelf((s) => (s ? { ...s, [key]: value } : s));
  }

  if (!loaded) return null;

  if (!self?.submitted_at) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground flex items-start gap-2">
        <UserSquare2 className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          No input from the employee yet. Send them their link from the Workflow panel so you have their
          own account of the period to comment on.
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

      <div className="grid gap-3">
        {FIELDS.map((f) => {
          const shared = self[f.value] as string | null;
          if (!shared?.trim()) return null;
          return (
            <div key={f.reply} className="rounded-md border bg-background p-2.5">
              <div className="text-xs font-medium text-muted-foreground">{f.label}</div>
              <div className="whitespace-pre-wrap">{shared}</div>
              {canReply ? (
                <div className="mt-2 grid gap-1">
                  <div className="text-[11px] font-medium flex items-center gap-1.5 text-primary">
                    <MessageSquare className="h-3.5 w-3.5" /> Your comment
                  </div>
                  <Textarea
                    rows={2}
                    className="text-sm"
                    value={drafts[f.reply] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [f.reply]: e.target.value }))}
                    onBlur={() => saveReply(f.reply)}
                    placeholder="Respond to what they shared here…"
                  />
                </div>
              ) : (
                self[f.reply]?.trim() && (
                  <div className="mt-2 border-t pt-2">
                    <div className="text-[11px] font-medium text-muted-foreground">Manager comment</div>
                    <div className="whitespace-pre-wrap">{self[f.reply]}</div>
                  </div>
                )
              )}
            </div>
          );
        })}
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
