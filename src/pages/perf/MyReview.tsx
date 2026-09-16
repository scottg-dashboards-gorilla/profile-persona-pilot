import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ExternalLink, CheckCircle2, Target, Lock, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { StatusPill, computeReviewTone } from "@/components/perf/StatusPill";
import { formatCompDelta } from "@/data/mockEmployees";
import { usePermissions } from "@/hooks/usePermissions";

type Employee = { uuid: string; first_name: string; last_name: string; title: string | null };

type Review = {
  id: string;
  review_cycle: string;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  overall_rating: string | null;
  notes: string | null;
  comp_adjustment_amount: number | null;
  comp_adjustment_percent: number | null;
  comp_effective_date: string | null;
  promotion: boolean;
  new_title: string | null;
  released_at: string | null;
  employee_ack_at: string | null;
  employee_ack_comment: string | null;
  pay_pushback_status: string;
  pay_pushback_raised_at: string | null;
  pay_pushback_employee_note: string | null;
  pay_pushback_manager_note: string | null;
  pay_pushback_manager_at: string | null;
  pay_pushback_hr_note: string | null;
  pay_pushback_resolved_at: string | null;
};

type SelfAssessment = {
  wins: string | null;
  challenges: string | null;
  growth: string | null;
  support_needed: string | null;
  submitted_at: string | null;
};

type Kr = {
  id: string;
  goal_id: string;
  title: string;
  unit: string | null;
  target_value: number;
  current_value: number;
};

type Goal = { id: string; title: string; status: string; category: string };

type PdrScore = {
  id: string;
  fiscal_year: number;
  year_end_score: number | null;
  score_recorded_at: string | null;
  comments_finalized_at: string | null;
  stage: string;
};

const ratingLabel: Record<string, string> = {
  exceeds: "Exceeds expectations",
  meets: "Meets expectations",
  below: "Below expectations",
};

export default function MyReview() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [me, setMe] = useState<Employee | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [assessment, setAssessment] = useState<SelfAssessment | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [krs, setKrs] = useState<Kr[]>([]);
  const [saving, setSaving] = useState(false);
  const [pdrScores, setPdrScores] = useState<PdrScore[]>([]);
  const { roles } = usePermissions();
  const canScore = roles.includes("admin") || roles.includes("hr");

  const [wins, setWins] = useState("");
  const [challenges, setChallenges] = useState("");
  const [growth, setGrowth] = useState("");
  const [support, setSupport] = useState("");
  const [ackComment, setAckComment] = useState("");
  const [ackConfirmed, setAckConfirmed] = useState<string | null>(null);
  const [concernFor, setConcernFor] = useState<string | null>(null);
  const [concernNote, setConcernNote] = useState("");

  const active = reviews.find((r) => r.status !== "completed") ?? null;
  const released = reviews.filter((r) => r.released_at);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    const { data: emp } = await supabase
      .from("employees")
      .select("uuid, first_name, last_name, title")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!emp) {
      setMe(null);
      setLoading(false);
      return;
    }
    setMe(emp as Employee);

    const [{ data: revs }, { data: gs }] = await Promise.all([
      supabase
        .from("performance_reviews")
        .select(
          "id, review_cycle, scheduled_date, completed_date, status, overall_rating, notes, comp_adjustment_amount, comp_adjustment_percent, comp_effective_date, promotion, new_title, released_at, employee_ack_at, employee_ack_comment, pay_pushback_status, pay_pushback_raised_at, pay_pushback_employee_note, pay_pushback_manager_note, pay_pushback_manager_at, pay_pushback_hr_note, pay_pushback_resolved_at",
        )
        .eq("employee_uuid", (emp as Employee).uuid)
        .order("scheduled_date", { ascending: false }),
      supabase
        .from("goals")
        .select("id, title, status, category")
        .eq("employee_uuid", (emp as Employee).uuid)
        .neq("status", "cancelled"),
    ]);

    const reviewList = (revs ?? []) as Review[];
    setReviews(reviewList);
    setGoals((gs ?? []) as Goal[]);

    const goalIds = ((gs ?? []) as Goal[]).map((g) => g.id);
    if (goalIds.length) {
      const { data: krRows } = await supabase
        .from("goal_key_results")
        .select("id, goal_id, title, unit, target_value, current_value")
        .in("goal_id", goalIds)
        .order("sort_order");
      setKrs((krRows ?? []) as Kr[]);
    } else {
      setKrs([]);
    }

    const { data: pdrRows } = await supabase
      .from("pdr_forms")
      .select("id, fiscal_year, year_end_score, score_recorded_at, comments_finalized_at, stage")
      .eq("employee_uuid", (emp as Employee).uuid)
      .order("fiscal_year", { ascending: false });
    setPdrScores((pdrRows ?? []) as PdrScore[]);

    const open = reviewList.find((r) => r.status !== "completed");
    if (open) {
      const { data: sa } = await supabase
        .from("review_self_assessments")
        .select("wins, challenges, growth, support_needed, submitted_at")
        .eq("review_id", open.id)
        .maybeSingle();
      const s = (sa ?? null) as SelfAssessment | null;
      setAssessment(s);
      setWins(s?.wins ?? "");
      setChallenges(s?.challenges ?? "");
      setGrowth(s?.growth ?? "");
      setSupport(s?.support_needed ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSelfAssessment() {
    if (!active || !me) return;
    setSaving(true);
    const { error } = await supabase.from("review_self_assessments").upsert(
      {
        review_id: active.id,
        employee_uuid: me.uuid,
        wins,
        challenges,
        growth,
        support_needed: support,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "review_id" },
    );
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Your manager can see this now." });
    load();
  }

  async function saveKr(kr: Kr, value: string) {
    const { error } = await supabase
      .from("goal_key_results")
      .update({ current_value: Number(value) })
      .eq("id", kr.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    setKrs((p) => p.map((k) => (k.id === kr.id ? { ...k, current_value: Number(value) } : k)));
  }

  async function saveScore(form: PdrScore, raw: string, close: boolean) {
    const value = raw === "" ? null : Number(raw);
    setSaving(true);
    const { error } = await supabase
      .from("pdr_forms")
      .update(
        close
          ? { year_end_score: value, score_recorded_at: new Date().toISOString(), stage: "closed" }
          : { year_end_score: value },
      )
      .eq("id", form.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save the score", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: close ? "Score recorded" : "Score saved" });
    load();
  }

  async function acknowledge(reviewId: string) {
    setSaving(true);
    const { error } = await supabase.rpc("acknowledge_review", {
      _review_id: reviewId,
      _comment: ackComment || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't acknowledge", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Acknowledged", description: "Thanks — that's on file." });
    setAckComment("");
    setAckConfirmed(null);
    load();
  }

  async function raiseConcern(reviewId: string) {
    if (!concernNote.trim()) return;
    setSaving(true);
    const { error } = await supabase.rpc("raise_pay_concern", {
      _review_id: reviewId,
      _note: concernNote.trim(),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't send", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Sent to your manager",
      description: "They'll come back to you after speaking with HR.",
    });
    setConcernNote("");
    setConcernFor(null);
    load();
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading your review…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="font-medium">Sign in to see your review</div>
          <p className="text-sm text-muted-foreground mt-1">
            Your review page is private to you and your manager.
          </p>
          <Button asChild className="mt-4">
            <Link to="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="font-medium">Your account isn't linked to an employee record yet</div>
          <p className="text-sm text-muted-foreground mt-1">
            Ask HR to link your login on the Access screen. Once linked, your reviews, goals and
            self-assessment show up here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">
          {me.first_name}'s review
        </h1>
        <p className="text-sm text-muted-foreground">{me.title ?? "—"}</p>
      </div>

      {pdrScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your development score</CardTitle>
            <CardDescription>
              Recorded against your anniversary review. {canScore
                ? "As an admin you can record or update the score here."
                : "Set by HR — read-only for you."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pdrScores.map((f) => (
              <div key={f.id} className="flex flex-wrap items-end gap-3 rounded-md border p-3">
                <div className="flex-1 min-w-[8rem]">
                  <div className="text-sm font-medium">FY{f.fiscal_year}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.score_recorded_at
                      ? `Recorded ${format(parseISO(f.score_recorded_at), "MMM d, yyyy")}`
                      : "Not recorded yet"}
                  </div>
                </div>
                {canScore ? (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Score (1–5)</Label>
                      <Input
                        className="h-9 w-24"
                        type="number"
                        step="0.1"
                        min={1}
                        max={5}
                        defaultValue={f.year_end_score ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          if (v !== f.year_end_score) saveScore(f, e.target.value, false);
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={saving || f.year_end_score == null || !!f.score_recorded_at}
                      onClick={() => saveScore(f, String(f.year_end_score ?? ""), true)}
                    >
                      Record score
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {f.year_end_score ?? "—"}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!active && released.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nothing open right now. When a review period starts you'll be asked for a self-assessment
            here.
          </CardContent>
        </Card>
      )}

      {active && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Your self-assessment
                <StatusPill
                  tone={computeReviewTone(
                    active.status as "scheduled" | "in_progress" | "completed" | "cancelled",
                    active.scheduled_date,
                  )}
                />
              </CardTitle>
              <CardDescription>
                {active.review_cycle} · due {format(parseISO(active.scheduled_date), "MMM d, yyyy")}. Keep
                it short — a few sentences each.
                {assessment?.submitted_at && (
                  <span className="text-emerald-700">
                    {" "}
                    Last saved {format(parseISO(assessment.submitted_at), "MMM d, h:mma")}.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>What went well?</Label>
                <Textarea rows={3} value={wins} onChange={(e) => setWins(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>What was hard?</Label>
                <Textarea rows={3} value={challenges} onChange={(e) => setChallenges(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>How have you grown?</Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  How you think, operate and handle pressure compared with a year ago.
                </p>
                <Textarea rows={3} value={growth} onChange={(e) => setGrowth(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>What support do you need?</Label>
                <Textarea rows={2} value={support} onChange={(e) => setSupport(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSelfAssessment} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {assessment?.submitted_at ? "Update" : "Submit"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your assessment</CardTitle>
              <CardDescription>
                The behavioural and skills questionnaire for this period. It's how we show how you've
                evolved across reviews.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a
                  href={`/assessment?review=${active.id}&employee=${me.uuid}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open the assessment <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {goals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" /> Your goals
                </CardTitle>
                <CardDescription>Update where each measure actually landed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {goals.map((g) => (
                  <div key={g.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{g.title}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {g.category}
                      </Badge>
                    </div>
                    {krs
                      .filter((k) => k.goal_id === g.id)
                      .map((k) => (
                        <div key={k.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs truncate">{k.title}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Target {k.target_value}
                              {k.unit ? ` ${k.unit}` : ""}
                            </div>
                          </div>
                          <Input
                            type="number"
                            className="w-28 h-8"
                            defaultValue={k.current_value}
                            onBlur={(e) => saveKr(k, e.target.value)}
                          />
                        </div>
                      ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {reviews.some((r) => r.status === "completed" && !r.released_at) && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            A completed review is being finalised. You'll see the outcome here once your manager shares
            it.
          </CardContent>
        </Card>
      )}

      {released.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle className="text-base">{r.review_cycle} outcome</CardTitle>
            <CardDescription>
              Shared {r.released_at ? format(parseISO(r.released_at), "MMM d, yyyy") : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</div>
                <div className="font-medium">{ratingLabel[r.overall_rating ?? ""] ?? "—"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Pay change
                </div>
                <div className="font-medium">
                  {formatCompDelta(r.comp_adjustment_amount, r.comp_adjustment_percent)}
                  {r.comp_effective_date && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      from {format(parseISO(r.comp_effective_date), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {r.promotion && (
              <div className="text-primary font-medium">★ Promoted{r.new_title ? ` to ${r.new_title}` : ""}</div>
            )}
            {r.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Manager summary
                  </div>
                  <p className="whitespace-pre-wrap">{r.notes}</p>
                </div>
              </>
            )}
            <Separator />
            {r.employee_ack_at ? (
              <div className="flex items-start gap-2 text-emerald-700">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  You confirmed receipt on {format(parseISO(r.employee_ack_at), "MMM d, yyyy 'at' h:mma")}
                  {r.employee_ack_comment && (
                    <div className="text-muted-foreground">"{r.employee_ack_comment}"</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Action needed: confirm you've received this</div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Confirming records that this outcome was shared with you and that you've read it.
                      It doesn't mean you agree — use the box below if you want anything on record.
                    </p>
                  </div>
                </div>
                <Textarea
                  rows={2}
                  placeholder="Your comments (optional) — visible to your manager and HR…"
                  value={ackComment}
                  onChange={(e) => setAckComment(e.target.value)}
                />
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={ackConfirmed === r.id}
                    onCheckedChange={(v) => setAckConfirmed(v ? r.id : null)}
                    className="mt-0.5"
                  />
                  <span>
                    I confirm I've reviewed my rating
                    {(r.comp_adjustment_amount ?? 0) !== 0 ? ", pay change" : ""} and my manager's
                    summary for {r.review_cycle}.
                  </span>
                </label>
                <div className="flex justify-end">
                  <Button size="sm" disabled={saving || ackConfirmed !== r.id} onClick={() => acknowledge(r.id)}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Confirm receipt
                  </Button>
                </div>
              </div>
            )}

            {(r.comp_adjustment_amount ?? 0) !== 0 && (
              <>
                <Separator />
                {r.pay_pushback_status === "none" ? (
                  concernFor === r.id ? (
                    <div className="space-y-2 rounded-md border p-3">
                      <div className="text-sm font-medium">Tell your manager what doesn't sit right</div>
                      <p className="text-xs text-muted-foreground">
                        This goes to your manager and HR. Your manager will come back to you after
                        speaking with HR.
                      </p>
                      <Textarea
                        rows={3}
                        placeholder="Why you think the amount isn't right…"
                        value={concernNote}
                        onChange={(e) => setConcernNote(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setConcernFor(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" disabled={saving || !concernNote.trim()} onClick={() => raiseConcern(r.id)}>
                          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                          Send
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Not happy with the pay amount? Raise it and your manager will take it to HR.
                      </p>
                      <Button size="sm" variant="outline" onClick={() => setConcernFor(r.id)}>
                        Raise a pay concern
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 space-y-2 text-xs">
                    <div className="font-medium text-sm">
                      {r.pay_pushback_status === "resolved"
                        ? "Your pay concern is closed"
                        : r.pay_pushback_status === "with_hr"
                          ? "Your manager is speaking to HR"
                          : "Your pay concern was sent to your manager"}
                    </div>
                    {r.pay_pushback_employee_note && (
                      <div>
                        <span className="text-muted-foreground">You said: </span>
                        "{r.pay_pushback_employee_note}"
                        {r.pay_pushback_raised_at && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {format(parseISO(r.pay_pushback_raised_at), "MMM d, h:mma")}
                          </span>
                        )}
                      </div>
                    )}
                    {r.pay_pushback_manager_note && (
                      <div>
                        <span className="text-muted-foreground">Your manager: </span>
                        {r.pay_pushback_manager_note}
                      </div>
                    )}
                    {r.pay_pushback_hr_note && (
                      <div>
                        <span className="text-muted-foreground">HR outcome: </span>
                        {r.pay_pushback_hr_note}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
