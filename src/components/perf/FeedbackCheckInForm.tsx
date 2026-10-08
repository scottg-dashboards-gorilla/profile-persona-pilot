import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Lock, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VALUE_SCALE } from "@/lib/coreValues";
import { departmentValues } from "@/lib/departmentReview";
import {
  checkInStatus,
  loadCheckInQuestions,
  type CheckInAnswer,
  type CheckInQuestion,
  type FeedbackCheckIn,
} from "@/lib/checkIns";
import { cn } from "@/lib/utils";

const YES_NO = [
  { score: 5, label: "Yes" },
  { score: 3, label: "Mostly" },
  { score: 1, label: "No" },
];

type Item = { kind: "value" | "question"; key: string; title: string; hint: string; type: "score" | "yes_no" | "text" };
type Draft = Record<string, { score: number | null; comment: string }>;
const k = (kind: string, key: string) => `${kind}:${key}`;

type Props = {
  checkIn: FeedbackCheckIn | null;
  side: "manager" | "employee";
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

export function FeedbackCheckInForm({ checkIn, side, onOpenChange, onChanged }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [other, setOther] = useState<Draft>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const mySubmitted = checkIn ? (side === "manager" ? checkIn.manager_submitted_at : checkIn.employee_submitted_at) : null;
  const otherSide = side === "manager" ? "employee" : "manager";

  const load = useCallback(async () => {
    if (!checkIn) return;
    setLoading(true);
    const [questions, { data: employee }] = await Promise.all([
      loadCheckInQuestions(checkIn.department, side, checkIn.employee_uuid),
      supabase.from("employees").select("department, title").eq("uuid", checkIn.employee_uuid).maybeSingle(),
    ]);
    setItems([
      ...departmentValues(employee ?? { department: checkIn.department, title: null }).map((v) => ({ kind: "value" as const, key: v.code, title: `${v.code} — ${v.name}`, hint: v.meaning, type: "score" as const })),
      ...questions.map((q) => ({ kind: "question" as const, key: q.id, title: q.prompt, hint: q.help_text ?? "", type: q.response_type })),
    ]);
    const { data } = await supabase
      .from("feedback_check_in_answers")
      .select("side, item_kind, item_key, score, comment")
      .eq("check_in_id", checkIn.id);
    const mine: Draft = {};
    const theirs: Draft = {};
    ((data ?? []) as CheckInAnswer[]).forEach((a) => {
      const target = a.side === side ? mine : theirs;
      target[k(a.item_kind, a.item_key)] = { score: a.score, comment: a.comment ?? "" };
    });
    setDraft(mine);
    setOther(theirs);
    setLoading(false);
  }, [checkIn, side]);

  useEffect(() => {
    load();
  }, [load]);

  function set(item: Item, patch: Partial<{ score: number | null; comment: string }>) {
    setDraft((d) => ({ ...d, [k(item.kind, item.key)]: { score: null, comment: "", ...d[k(item.kind, item.key)], ...patch } }));
  }

  async function save(submit: boolean) {
    if (!checkIn) return;
    if (submit) {
      const missing = items.filter((i) => i.type !== "text" && draft[k(i.kind, i.key)]?.score == null);
      if (missing.length) {
        toast({ title: "Score every item first", description: `${missing.length} still need a score.`, variant: "destructive" });
        return;
      }
    }
    setBusy(true);
    const rows = items
      .map((i) => ({ i, v: draft[k(i.kind, i.key)] }))
      .flatMap(({ i, v }) => v && (v.score != null || v.comment.trim()) ? [{
        check_in_id: checkIn.id,
        side,
        item_kind: i.kind,
        item_key: i.key,
        score: v.score,
        comment: v.comment.trim() || null,
      }] : []);
    if (rows.length) {
      const { error } = await supabase
        .from("feedback_check_in_answers")
        .upsert(rows, { onConflict: "check_in_id,side,item_kind,item_key" });
      if (error) {
        setBusy(false);
        toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
        return;
      }
    }
    if (submit) {
      const col = side === "manager" ? "manager_submitted_at" : "employee_submitted_at";
      const { error } = await supabase.from("feedback_check_ins").update({ [col]: new Date().toISOString() }).eq("id", checkIn.id);
      if (error) {
        setBusy(false);
        toast({ title: "Couldn't submit", description: error.message, variant: "destructive" });
        return;
      }
    }
    setBusy(false);
    toast({ title: submit ? "Submitted" : "Draft saved", description: submit ? "Scores unlock for both of you once both sides are in." : undefined });
    onChanged();
    if (submit) onOpenChange(false);
  }

  const status = checkIn ? checkInStatus(checkIn) : null;
  const shared = !!checkIn?.shared_at;
  const readOnly = !!mySubmitted;

  return (
    <Dialog open={!!checkIn} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feedback check-in · {checkIn?.employee_name}</DialogTitle>
          <DialogDescription>
            {side === "manager"
              ? "Score how they're doing right now. They won't see your scores until they submit theirs."
              : "Score yourself honestly. You'll see your manager's scores once you've both submitted."}
            {checkIn?.due_date ? ` Due ${new Date(checkIn.due_date + "T00:00:00").toLocaleDateString()}.` : ""}
          </DialogDescription>
          {status && (
            <div className={cn("mt-2 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium", status.tone)}>{status.label}</div>
          )}
          {checkIn?.note && <p className="text-sm text-muted-foreground mt-2">Note: “{checkIn.note}”</p>}
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const v = draft[k(item.kind, item.key)];
              const o = other[k(item.kind, item.key)];
              const options = item.type === "yes_no" ? YES_NO : VALUE_SCALE.map((s) => ({ score: s.score, label: `${s.score}` }));
              return (
                <div key={k(item.kind, item.key)} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{item.title}</div>
                      {item.hint && <div className="text-xs text-muted-foreground">{item.hint}</div>}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{item.kind === "value" ? "Core value" : "Department"}</Badge>
                  </div>
                  {item.type !== "text" && (
                    <div className="flex flex-wrap gap-1.5">
                      {options.map((opt) => (
                        <Button
                          key={opt.score}
                          type="button"
                          size="sm"
                          variant={v?.score === opt.score ? "default" : "outline"}
                          disabled={readOnly}
                          onClick={() => set(item, { score: opt.score })}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  <Textarea
                    rows={2}
                    className="text-sm"
                    placeholder={item.type === "text" ? "Your answer…" : "One example that justifies this score…"}
                    value={v?.comment ?? ""}
                    disabled={readOnly}
                    onChange={(e) => set(item, { comment: e.target.value })}
                  />
                  {shared ? (
                    o && (
                      <div className="rounded bg-muted p-2 text-xs">
                        <span className="font-medium">{otherSide === "manager" ? "Manager" : "Employee"}:</span>{" "}
                        {o.score != null ? `${o.score}/5` : "—"}
                        {o.comment ? ` — “${o.comment}”` : ""}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Lock className="h-3 w-3" /> {otherSide === "manager" ? "Manager's" : "Employee's"} score hidden until both submit
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!readOnly && (
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => save(false)}>Save draft</Button>
            <Button disabled={busy} onClick={() => save(true)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Submit
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
