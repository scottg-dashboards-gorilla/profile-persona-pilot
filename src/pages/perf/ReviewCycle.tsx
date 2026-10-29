import { reviewData } from "@/lib/reviewData";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowRight, CalendarDays, CheckCircle2, Circle, Loader2, Play, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

type Cycle = { id: string; name: string; description: string | null; status: string; starts_at: string; ends_at: string };
type Review = { id: string; employee_uuid: string; employee_name: string; status: string; kickoff_at: string | null; assessment_attempt_id: string | null; rating_score: number | null; comp_approval_status: string; released_at: string | null; employee_ack_at: string | null };
type Form = { id: string; employee_uuid: string; objectives_submitted_at: string | null; objectives_approved_at: string | null; self_input_submitted_at: string | null; comments_finalized_at: string | null };
type Stage = { id: string; title: string; dates: string; detail: string; href: string; complete: boolean };

function completion(review: Review, form?: Form) {
  const checks = [
    !!form?.objectives_submitted_at,
    !!form?.objectives_approved_at,
    !!review.kickoff_at,
    !!form?.self_input_submitted_at,
    !!form?.comments_finalized_at,
    !!review.assessment_attempt_id,
    review.rating_score != null,
    review.comp_approval_status === "approved",
    !!review.released_at,
    !!review.employee_ack_at,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function ReviewCycle() {
  const { viewMode, loading: permissionsLoading } = usePermissions();
  const [searchParams] = useSearchParams();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [goalCounts, setGoalCounts] = useState<Record<string, number>>({});
  const [measurableCounts, setMeasurableCounts] = useState<Record<string, number>>({});
  const [questionCounts, setQuestionCounts] = useState({ active: 0, waiting: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data: cycleRows } = await supabase.from("review_cycles").select("id,name,description,status,starts_at,ends_at").eq("status", "active").order("starts_at", { ascending: false }).limit(1);
    const current = (cycleRows?.[0] as Cycle | undefined) ?? null;
    setCycle(current);
    if (!current) { setLoading(false); return; }
    const { data: auth } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("employees").select("uuid").eq("user_id", auth.user?.id ?? "").maybeSingle();
    if (viewMode !== "admin" && !me?.uuid) {
      setReviews([]); setForms([]); setGoalCounts({}); setMeasurableCounts({}); setLoading(false); return;
    }
    let employeeIds: string[] | null = null;
    if (viewMode === "employee") employeeIds = me?.uuid ? [me.uuid] : [];
    if (viewMode === "manager") {
      const { data: team } = await supabase.from("employees").select("uuid").eq("manager_uuid", me?.uuid ?? "").eq("terminated", false);
      employeeIds = (team ?? []).filter((person) => person.uuid !== me?.uuid).map((person) => person.uuid);
    }
    if (employeeIds?.length === 0) {
      setReviews([]); setForms([]); setGoalCounts({}); setMeasurableCounts({}); setLoading(false); return;
    }
    const reviewsQuery = reviewData("performance_reviews").select("id,employee_uuid,employee_name,status,kickoff_at,assessment_attempt_id,rating_score,comp_approval_status,released_at,employee_ack_at").eq("cycle_id", current.id).order("employee_name");
    const formsQuery = supabase.from("pdr_forms").select("id,employee_uuid,objectives_submitted_at,objectives_approved_at,self_input_submitted_at,comments_finalized_at").eq("fiscal_year", Number(current.starts_at.slice(0, 4)));
    const [{ data: reviewRows }, { data: formRows }, { data: questions }] = await Promise.all([
      employeeIds ? reviewsQuery.in("employee_uuid", employeeIds) : reviewsQuery,
      employeeIds ? formsQuery.in("employee_uuid", employeeIds) : formsQuery,
      viewMode === "admin" ? supabase.from("department_questions").select("id,is_active") : Promise.resolve({ data: [] as { id: string; is_active: boolean }[] }),
    ]);
    const visibleReviews = (reviewRows ?? []) as Review[];
    const visibleForms = (formRows ?? []) as Form[];
    setReviews(visibleReviews);
    setForms(visibleForms);
    setQuestionCounts({ active: (questions ?? []).filter((q) => q.is_active).length, waiting: (questions ?? []).filter((q) => !q.is_active).length });
    if (visibleForms.length) {
      const { data: goals } = await supabase.from("pdr_objectives").select("form_id,target_value,end_date").in("form_id", visibleForms.map((f) => f.id));
      const counts: Record<string, number> = {};
      const measurable: Record<string, number> = {};
      (goals ?? []).forEach((goal) => {
        counts[goal.form_id] = (counts[goal.form_id] ?? 0) + 1;
        if (goal.target_value != null && goal.end_date) measurable[goal.form_id] = (measurable[goal.form_id] ?? 0) + 1;
      });
      setGoalCounts(counts);
      setMeasurableCounts(measurable);
    } else { setGoalCounts({}); setMeasurableCounts({}); }
    setLoading(false);
  }, [viewMode]);

  useEffect(() => { if (!permissionsLoading) load(); }, [load, permissionsLoading]);

  async function startReview(review: Review) {
    setBusy(review.id);
    const { error } = await supabase.from("performance_reviews").update({ status: "in_progress", kickoff_at: new Date().toISOString() }).eq("id", review.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${review.employee_name}'s review started`);
    load();
  }

  const formByEmployee = useMemo(() => Object.fromEntries(forms.map((form) => [form.employee_uuid, form])), [forms]);
  const average = reviews.length ? Math.round(reviews.reduce((sum, review) => sum + completion(review, formByEmployee[review.employee_uuid]), 0) / reviews.length) : 0;
  const goalTotal = Object.values(goalCounts).reduce((sum, count) => sum + count, 0);
  const focus = searchParams.get("stage") ?? "";
  const myReview = reviews[0];
  const myForm = myReview ? formByEmployee[myReview.employee_uuid] : undefined;
  const sharedStages: Stage[] = viewMode === "employee" ? [
    { id: "objectives", title: "Set measurable goals", dates: "Start of year", detail: `${myForm ? measurableCounts[myForm.id] ?? 0 : 0} dated goals with targets`, href: myForm ? `/pdr?focus=${myForm.id}` : "/pdr", complete: !!myForm?.objectives_approved_at },
    { id: "feedback", title: "Submit your review input", dates: "Dec 1–15", detail: "Accomplishments, challenges, growth and DP INC values", href: "/me", complete: !!myForm?.self_input_submitted_at },
    { id: "assessment", title: "Complete your assessment", dates: "Review period", detail: "Role skills and DISC profile", href: "/me", complete: !!myReview?.assessment_attempt_id },
    { id: "outcome", title: "Read the released outcome", dates: "Feb 1–15", detail: "Manager scores stay hidden until release", href: "/me", complete: !!myReview?.released_at },
    { id: "acknowledge", title: "Acknowledge the conversation", dates: "After release", detail: "Confirm receipt or raise a pay concern", href: "/me", complete: !!myReview?.employee_ack_at },
  ] : viewMode === "manager" ? [
    { id: "objectives", title: "Align team goals", dates: "Start of year", detail: `${Object.values(measurableCounts).reduce((sum, n) => sum + n, 0)} dated goals with targets · approve submitted objectives`, href: "/pdr", complete: forms.length > 0 && forms.every((form) => !!form.objectives_approved_at) },
    { id: "kickoff", title: "Start scheduled reviews", dates: "Before employee input", detail: "Start each direct-report review below", href: "#direct-reports", complete: reviews.length > 0 && reviews.every((review) => !!review.kickoff_at) },
    { id: "manager", title: "Draft manager feedback", dates: "Dec 15–Jan 10", detail: "Open a direct-report review below to reply and score values", href: "#direct-reports", complete: forms.length > 0 && forms.every((form) => !!form.comments_finalized_at) },
    { id: "score", title: "Draft rating and pay", dates: "January", detail: "Choose a direct report below to enter results, I/C and merit", href: "#direct-reports", complete: reviews.length > 0 && reviews.every((review) => review.rating_score != null) },
    { id: "share", title: "Share approved outcomes", dates: "Feb 1–15", detail: "In pay review, log the conversation before sharing", href: "/apr", complete: reviews.length > 0 && reviews.every((review) => !!review.released_at) },
  ] : [
    { id: "setup", title: "Approve review questions", dates: "Before launch", detail: `${questionCounts.waiting} disabled question${questionCounts.waiting === 1 ? "" : "s"} waiting; ${questionCounts.active} active`, href: "/admin/panel?tab=questions", complete: questionCounts.waiting === 0 },
    { id: "monitor", title: "Monitor review input", dates: "Dec–Jan", detail: `${reviews.filter((review) => review.status !== "completed").length} reviews still open`, href: `/reviews?cycle=${cycle?.id ?? ""}`, complete: reviews.length > 0 && reviews.every((review) => review.status === "completed") },
    { id: "fairness", title: "Check ratings for fairness", dates: "January", detail: "Compare rating patterns before approving pay", href: "/calibration", complete: reviews.length > 0 && reviews.every((review) => review.rating_score != null) },
    { id: "approve", title: "Approve submitted pay", dates: "Before conversations", detail: `${reviews.filter((review) => review.comp_approval_status === "submitted").length} submissions waiting`, href: "/admin/panel?tab=approvals", complete: reviews.length > 0 && reviews.every((review) => review.comp_approval_status === "approved") },
    { id: "release", title: "Release and close", dates: "Feb 1–15", detail: `${reviews.filter((review) => review.released_at).length} of ${reviews.length} outcomes shared`, href: `/reviews?cycle=${cycle?.id ?? ""}`, complete: reviews.length > 0 && reviews.every((review) => !!review.released_at) },
  ];

  if (loading || permissionsLoading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading the active cycle…</div>;
  if (!cycle) return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No active review cycle is configured.</CardContent></Card>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Badge variant="outline">{cycle.status}</Badge><h1 className="mt-2 text-2xl font-semibold">{cycle.name}</h1><p className="mt-1 text-sm text-muted-foreground">{cycle.description ?? "Goals, feedback, assessment, scoring, approval and release in one connected cycle."}</p></div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{format(parseISO(cycle.starts_at), "MMM d, yyyy")} – {format(parseISO(cycle.ends_at), "MMM d, yyyy")}</div>
      </header>
      <section className="border-y border-border py-5"><div className="mb-2 flex items-end justify-between"><div><h2 className="font-semibold">{viewMode === "employee" ? "My review progress" : viewMode === "manager" ? "Team review progress" : "Company review progress"}</h2><p className="text-xs text-muted-foreground">{reviews.length} {reviews.length === 1 ? "review" : "reviews"} · {goalTotal} goals · based on recorded milestones from objectives through acknowledgement.</p></div><span className="text-2xl font-semibold">{average}%</span></div><Progress value={average} aria-label={`${average}% complete`} /></section>
      <section className="space-y-3"><div><h2 className="font-semibold">Your stages and actions</h2><p className="text-sm text-muted-foreground">Each stage opens the exact place where that work is completed.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{sharedStages.map((stage, index) => <Card key={stage.id} className={focus === stage.id ? "border-primary" : ""}><CardHeader className="pb-2"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{index + 1}</span>{stage.complete ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}</div><CardTitle className="text-sm">{stage.title}</CardTitle></CardHeader><CardContent className="flex h-[118px] flex-col"><p className="text-[11px] font-medium text-primary">{stage.dates}</p><p className="mt-1 text-xs text-muted-foreground">{stage.detail}</p><Button asChild variant="ghost" size="sm" className="mt-auto w-fit px-0 text-primary hover:bg-transparent"><Link to={stage.href}>Open action<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button></CardContent></Card>)}</div></section>
      {viewMode === "manager" && <section id="direct-reports" className="space-y-3 scroll-mt-6"><div><h2 className="font-semibold">Direct-report reviews</h2><p className="text-sm text-muted-foreground">Start a review or jump directly into that person’s next record.</p></div><div className="divide-y divide-border border-y border-border">{reviews.map((review) => { const form = formByEmployee[review.employee_uuid]; return <div key={review.id} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{review.employee_name}</p><p className="text-xs text-muted-foreground">{form ? `${measurableCounts[form.id] ?? 0} dated goals with targets` : "No goal form"} · {completion(review, form)}% complete</p></div>{form && <Button asChild size="sm" variant="ghost"><Link to={`/pdr?focus=${form.id}`}>Goals</Link></Button>}{!review.kickoff_at ? <Button size="sm" onClick={() => startReview(review)} disabled={busy === review.id}>{busy === review.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="mr-1 h-3.5 w-3.5" />Start review</>}</Button> : <Button asChild size="sm" variant="outline"><Link to={`/reviews?focus=${review.id}`}>Draft feedback</Link></Button>}<Button asChild size="sm" variant="ghost"><Link to={`/apr?focus=${review.id}`}>Draft score</Link></Button></div>; })}</div></section>}
      {viewMode === "employee" && myForm && <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><div className="flex items-center gap-3"><Target className="h-5 w-5 text-primary" /><div><p className="text-sm font-medium">{measurableCounts[myForm.id] ?? 0} dated goals with targets in this cycle</p><p className="text-xs text-muted-foreground">Open them to update targets, dates and progress.</p></div></div><Button asChild variant="outline"><Link to={`/pdr?focus=${myForm.id}`}>Open my goals</Link></Button></section>}
    </div>
  );
}