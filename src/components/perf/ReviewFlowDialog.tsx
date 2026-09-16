import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Circle,
  Loader2,
  Link as LinkIcon,
  Play,
  Users,
  CheckCircle2,
  Send,
  ShieldCheck,
  Clock,
  Handshake,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { assessmentUrl, copyToClipboard, createReviewToken, formUrl } from "@/lib/reviewLinks";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { ReviewTimeline, buildReviewStages } from "@/components/perf/ReviewTimeline";

type Props = {
  reviewId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onOpenContributors: () => void;
  onOpenComplete: () => void;
};

type ReviewState = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  review_cycle: string;
  scheduled_date: string;
  status: string;
  overall_rating: string | null;
  comp_adjustment_amount: number | null;
  comp_approval_status: string;
  comp_approval_note: string | null;
  comp_approved_at: string | null;
  released_at: string | null;
  employee_ack_at: string | null;
  employee_ack_comment: string | null;
  assessment_attempt_id: string | null;
  kickoff_at: string | null;
  completed_date: string | null;
  reopened_at: string | null;
  reopened_reason: string | null;
  connect_held_at: string | null;
  connect_note: string | null;
  pay_pushback_status: string;
  pay_pushback_raised_at: string | null;
  pay_pushback_employee_note: string | null;
  pay_pushback_manager_note: string | null;
  pay_pushback_manager_at: string | null;
  pay_pushback_hr_note: string | null;
  pay_pushback_resolved_at: string | null;
};

type Owner = "Employee" | "Manager" | "HR";

export function ReviewFlowDialog({
  reviewId,
  onOpenChange,
  onChanged,
  onOpenContributors,
  onOpenComplete,
}: Props) {
  const { toast } = useToast();
  const { has, unconfigured } = usePermissions();
  const isHr = unconfigured || has("admin") || has("hr");

  const [review, setReview] = useState<ReviewState | null>(null);
  const [selfDone, setSelfDone] = useState<string | null>(null);
  const [attemptDone, setAttemptDone] = useState<boolean>(false);
  const [contribs, setContribs] = useState<{ total: number; submitted: number }>({ total: 0, submitted: 0 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [pushbackNote, setPushbackNote] = useState("");
  const [hrNote, setHrNote] = useState("");
  const [connectNote, setConnectNote] = useState("");

  const load = useCallback(async () => {
    if (!reviewId) return;
    setLoading(true);
    const [{ data: r }, { data: sa }, { data: att }, { data: cs }] = await Promise.all([
      supabase
        .from("performance_reviews")
        .select(
          "id, employee_uuid, employee_name, review_cycle, scheduled_date, status, overall_rating, comp_adjustment_amount, comp_approval_status, comp_approval_note, comp_approved_at, released_at, employee_ack_at, employee_ack_comment, assessment_attempt_id, kickoff_at, completed_date, reopened_at, reopened_reason, pay_pushback_status, pay_pushback_raised_at, pay_pushback_employee_note, pay_pushback_manager_note, pay_pushback_manager_at, pay_pushback_hr_note, pay_pushback_resolved_at, connect_held_at, connect_note",
        )
        .eq("id", reviewId)
        .maybeSingle(),
      supabase.from("review_self_assessments").select("submitted_at").eq("review_id", reviewId).maybeSingle(),
      supabase.from("assessment_attempts").select("id").eq("review_id", reviewId).limit(1),
      supabase.from("review_contributors").select("status").eq("review_id", reviewId),
    ]);
    setReview((r as ReviewState) ?? null);
    setSelfDone((sa as { submitted_at: string | null } | null)?.submitted_at ?? null);
    setAttemptDone(((att ?? []) as unknown[]).length > 0);
    const list = (cs ?? []) as { status: string }[];
    setContribs({ total: list.length, submitted: list.filter((c) => c.status === "submitted").length });
    setApprovalNote((r as ReviewState)?.comp_approval_note ?? "");
    setPushbackNote((r as ReviewState)?.pay_pushback_manager_note ?? "");
    setHrNote((r as ReviewState)?.pay_pushback_hr_note ?? "");
    setConnectNote((r as ReviewState)?.connect_note ?? "");
    setLoading(false);
  }, [reviewId]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(patchBody: Record<string, unknown>, key: string, okMsg: string) {
    if (!review) return;
    setBusy(key);
    const { error } = await supabase.from("performance_reviews").update(patchBody).eq("id", review.id);
    setBusy(null);
    if (error) {
      toast({ title: "Didn't work", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: okMsg });
    await load();
    onChanged();
  }

  async function copySelfLink() {
    if (!review) return;
    setBusy("selflink");
    try {
      const token = await createReviewToken(review.id, "self");
      await copyToClipboard(formUrl(token));
      toast({
        title: "Self-assessment link copied",
        description: `Send it to ${review.employee_name}. It works without an account.`,
      });
      await patch(
        { self_assessment_sent_at: new Date().toISOString(), status: review.status === "scheduled" ? "in_progress" : review.status },
        "selflink",
        "Marked as sent",
      );
    } catch (e) {
      toast({ title: "Couldn't create link", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function copyAssessLink() {
    if (!review) return;
    await copyToClipboard(assessmentUrl(review.id, review.employee_uuid));
    toast({ title: "Assessment link copied", description: "This attempt will attach to this review period." });
  }

  if (!reviewId) return null;

  const compProposed = review?.comp_adjustment_amount != null && review.comp_adjustment_amount !== 0;
  const compApproved = review?.comp_approval_status === "approved";
  const compRejected = review?.comp_approval_status === "rejected";

  const steps: {
    key: string;
    owner: Owner;
    title: string;
    detail: string;
    done: boolean;
    blocked?: boolean;
    action?: React.ReactNode;
  }[] = review
    ? [
        {
          key: "kickoff",
          owner: "HR",
          title: "Kick off the review",
          detail:
            review.status === "scheduled"
              ? "Opens the review so the employee and contributors can be asked for input."
              : `Started · scheduled ${format(parseISO(review.scheduled_date), "MMM d, yyyy")}`,
          done: review.status !== "scheduled",
          action:
            review.status === "scheduled" ? (
              <Button size="sm" disabled={busy === "kickoff"} onClick={() => patch({ status: "in_progress", kickoff_at: new Date().toISOString() }, "kickoff", "Review kicked off")}>
                <Play className="h-3.5 w-3.5 mr-1" /> Kick off
              </Button>
            ) : null,
        },
        {
          key: "self",
          owner: "Employee",
          title: "Employee writes their self-assessment",
          detail: selfDone
            ? `Submitted ${format(parseISO(selfDone), "MMM d, h:mma")} — visible in the Complete step.`
            : "Send them their private link: short reflection plus a check-in on their own goals.",
          done: !!selfDone,
          action: (
            <Button size="sm" variant="outline" disabled={busy === "selflink"} onClick={copySelfLink}>
              {busy === "selflink" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <LinkIcon className="h-3.5 w-3.5 mr-1" />}
              Copy link
            </Button>
          ),
        },
        {
          key: "assessment",
          owner: "Employee",
          title: "Employee completes the assessment",
          detail: attemptDone
            ? "On file for this period — behavioural and technical deltas are ready."
            : "Required. The review cannot be completed until this is submitted.",
          done: attemptDone,
          blocked: !attemptDone,
          action: (
            <Button size="sm" variant="outline" onClick={copyAssessLink}>
              <LinkIcon className="h-3.5 w-3.5 mr-1" /> Copy link
            </Button>
          ),
        },
        {
          key: "contributors",
          owner: "HR",
          title: "Collect 360 feedback",
          detail:
            contribs.total === 0
              ? "Optional. Add coworkers and send each of them a private feedback link."
              : `${contribs.submitted} of ${contribs.total} submitted.`,
          done: contribs.total > 0 && contribs.submitted === contribs.total,
          action: (
            <Button size="sm" variant="outline" onClick={onOpenContributors}>
              <Users className="h-3.5 w-3.5 mr-1" /> Manage
            </Button>
          ),
        },
        {
          key: "complete",
          owner: "Manager",
          title: "Manager completes the review",
          detail:
            review.status === "completed"
              ? `Rated "${review.overall_rating ?? "—"}". Comp and action items recorded.${review.reopened_reason ? ` Reopened ${review.reopened_at ? format(parseISO(review.reopened_at), "MMM d") : ""}: "${review.reopened_reason}"` : ""}`
              : "Set the rating, comp proposal, promotion and follow-up action items.",
          done: review.status === "completed",
          action: (
            <Button size="sm" variant={review.status === "completed" ? "outline" : "default"} onClick={onOpenComplete}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {review.status === "completed" ? "Reopen" : "Complete"}
            </Button>
          ),
        },
        {
          key: "comp",
          owner: "HR",
          title: "HR approves the pay outcome",
          detail: compApproved
            ? `Approved ${review.comp_approved_at ? format(parseISO(review.comp_approved_at), "MMM d") : ""}.`
            : compRejected
              ? "Sent back to the manager."
              : compProposed
                ? "Waiting on HR sign-off before the outcome is shared."
                : "No pay change proposed, but HR still has to sign off before the outcome is shared.",
          done: compApproved,
          blocked: !compApproved && review.status === "completed",
          action:
            !compApproved ? (
              <div className="flex flex-col items-end gap-2 w-full">
                <Textarea
                  rows={2}
                  className="text-xs"
                  placeholder="Approval note (optional)…"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === "comp" || !isHr}
                    onClick={() =>
                      patch(
                        { comp_approval_status: "rejected", comp_approval_note: approvalNote || null },
                        "comp",
                        "Sent back to the manager",
                      )
                    }
                  >
                    Send back
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy === "comp" || !isHr}
                    title={isHr ? undefined : "Only HR or admin can approve pay changes"}
                    onClick={() =>
                      patch(
                        {
                          comp_approval_status: "approved",
                          comp_approval_note: approvalNote || null,
                          comp_approved_at: new Date().toISOString(),
                        },
                        "comp",
                        "Pay change approved",
                      )
                    }
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                </div>
              </div>
            ) : null,
        },
        {
          key: "connect",
          owner: "Manager",
          title: "Hold the connect conversation",
          detail: review.connect_held_at
            ? `Connect held ${format(parseISO(review.connect_held_at), "MMM d, h:mma")}${review.connect_note ? ` — "${review.connect_note}"` : ""}`
            : "Sit down with the employee and talk it through before anything is shared. Write a short note of what you covered — this is required.",
          done: !!review.connect_held_at && !!review.connect_note,
          blocked: !review.connect_held_at && review.status === "completed",
          action: review.connect_held_at ? null : (
            <div className="space-y-2 w-full">
              <Textarea
                rows={2}
                placeholder="What you covered in the sit-down (rating, pay outcome, questions raised)…"
                value={connectNote}
                onChange={(e) => setConnectNote(e.target.value)}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busy === "connect" || review.status !== "completed" || !connectNote.trim()}
                title={
                  review.status !== "completed"
                    ? "Complete the review first"
                    : !connectNote.trim()
                      ? "Add a note about the conversation first"
                      : undefined
                }
                onClick={() =>
                  patch(
                    { connect_held_at: new Date().toISOString(), connect_note: connectNote.trim() },
                    "connect",
                    "Connect logged",
                  )
                }
              >
                <Handshake className="h-3.5 w-3.5 mr-1" /> Log connect
              </Button>
            </div>
          ),
        },
        {
          key: "release",
          owner: "Manager",
          title: "Share the outcome with the employee",
          detail: review.released_at
            ? `Shared ${format(parseISO(review.released_at), "MMM d, h:mma")} — they can see it on their review page.`
            : review.reopened_at
              ? `Outcome was pulled back ${format(parseISO(review.reopened_at), "MMM d")} — reason logged. HR must re-approve, then share again.`
              : "Until you share it, the employee sees nothing of the rating or pay change.",
          done: !!review.released_at,
          action: review.released_at ? null : (
            <Button
              size="sm"
              disabled={
                busy === "release" ||
                review.status !== "completed" ||
                (compProposed && !compApproved) ||
                !review.connect_held_at ||
                !review.connect_note
              }
              title={
                review.status !== "completed"
                  ? "Complete the review first"
                  : compProposed && !compApproved
                    ? "HR needs to approve the pay change first"
                    : !review.connect_held_at || !review.connect_note
                      ? "Log the connect conversation and note first"
                      : undefined
              }
              onClick={() => patch({ released_at: new Date().toISOString() }, "release", "Outcome shared")}
            >
              <Send className="h-3.5 w-3.5 mr-1" /> Share
            </Button>
          ),
        },
        {
          key: "ack",
          owner: "Employee",
          title: "Employee acknowledges",
          detail: review.employee_ack_at
            ? `Acknowledged ${format(parseISO(review.employee_ack_at), "MMM d")}${review.employee_ack_comment ? ` — "${review.employee_ack_comment}"` : ""}`
            : "They confirm on their own review page once the outcome is shared.",
          done: !!review.employee_ack_at,
        },
        ...(review.pay_pushback_status !== "none"
          ? [
              {
                key: "pushback",
                owner: "Manager" as Owner,
                title: "Employee pushed back on the pay amount",
                detail: [
                  review.pay_pushback_employee_note
                    ? `They said: "${review.pay_pushback_employee_note}"`
                    : "They raised a concern about the amount.",
                  review.pay_pushback_manager_note ? `You logged: ${review.pay_pushback_manager_note}` : "",
                  review.pay_pushback_hr_note ? `HR outcome: ${review.pay_pushback_hr_note}` : "",
                  review.pay_pushback_status === "with_hr" ? "Taken to HR — waiting on their decision." : "",
                  review.pay_pushback_status === "resolved" && review.pay_pushback_resolved_at
                    ? `Closed ${format(parseISO(review.pay_pushback_resolved_at), "MMM d")}.`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · "),
                done: review.pay_pushback_status === "resolved",
                blocked: review.pay_pushback_status !== "resolved",
                action:
                  review.pay_pushback_status === "resolved" ? null : (
                    <div className="flex flex-col items-end gap-2 w-full">
                      {review.pay_pushback_status === "raised" ? (
                        <>
                          <Textarea
                            rows={2}
                            className="text-xs"
                            placeholder="Why they're pushing back and what you'll raise with HR…"
                            value={pushbackNote}
                            onChange={(e) => setPushbackNote(e.target.value)}
                          />
                          <Button
                            size="sm"
                            disabled={busy === "pushback" || !pushbackNote.trim()}
                            onClick={() =>
                              patch(
                                {
                                  pay_pushback_status: "with_hr",
                                  pay_pushback_manager_note: pushbackNote.trim(),
                                  pay_pushback_manager_at: new Date().toISOString(),
                                },
                                "pushback",
                                "Logged — HR can see it now",
                              )
                            }
                          >
                            I'll speak to HR
                          </Button>
                        </>
                      ) : (
                        <>
                          <Textarea
                            rows={2}
                            className="text-xs"
                            placeholder="HR outcome — what was decided and why…"
                            value={hrNote}
                            onChange={(e) => setHrNote(e.target.value)}
                          />
                          <Button
                            size="sm"
                            disabled={busy === "pushback" || !isHr || !hrNote.trim()}
                            title={isHr ? undefined : "Only HR or admin can close this out"}
                            onClick={() =>
                              patch(
                                {
                                  pay_pushback_status: "resolved",
                                  pay_pushback_hr_note: hrNote.trim(),
                                  pay_pushback_resolved_at: new Date().toISOString(),
                                },
                                "pushback",
                                "Pay concern closed",
                              )
                            }
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Close with HR outcome
                          </Button>
                        </>
                      )}
                    </div>
                  ),
              },
            ]
          : []),
      ]
    : [];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Dialog open={!!reviewId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Review workflow{review ? ` · ${review.employee_name}` : ""}
          </DialogTitle>
          <DialogDescription>
            {review
              ? `${review.review_cycle} · ${doneCount} of ${steps.length} steps done. Each step shows who owns it.`
              : "Loading…"}
          </DialogDescription>
        </DialogHeader>

        {loading && !review && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading workflow…
          </div>
        )}

        {review && (
          <div className="rounded-md border p-3 overflow-x-auto">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Timeline — hover a step for its timestamp
            </div>
            <ReviewTimeline
              variant="full"
              stages={buildReviewStages({
                kickoff_at: review.kickoff_at,
                status: review.status,
                scheduled_date: review.scheduled_date,
                completed_date: review.completed_date,
                comp_adjustment_amount: review.comp_adjustment_amount,
                comp_approval_status: review.comp_approval_status,
                comp_approved_at: review.comp_approved_at,
                released_at: review.released_at,
                employee_ack_at: review.employee_ack_at,
                selfSubmittedAt: selfDone,
                contributorsTotal: contribs.total,
                contributorsSubmitted: contribs.submitted,
              })}
            />
          </div>
        )}

        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li
              key={s.key}
              className={cn(
                "rounded-md border p-3 flex items-start gap-3",
                s.done && "bg-emerald-50/60 border-emerald-200",
                !s.done && s.blocked && "bg-amber-50/60 border-amber-200",
              )}
            >
              <div className="mt-0.5 shrink-0">
                {s.done ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : s.blocked ? (
                  <Clock className="h-4 w-4 text-amber-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {i + 1}. {s.title}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {s.owner}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
              </div>
              {s.action && <div className="shrink-0 max-w-[220px] w-auto">{s.action}</div>}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
