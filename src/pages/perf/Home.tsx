import { reviewData } from "@/lib/reviewData";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  ListTodo,
  Loader2,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { ManagerCheckInsCard } from "@/components/perf/ManagerCheckInsCard";
import Overview from "./Overview";

type HomeAction = {
  id: string;
  title: string;
  detail: string;
  href: string;
  label: string;
};

type QuickLink = {
  title: string;
  detail: string;
  href: string;
  label: string;
  icon: typeof Target;
};

type JourneyStep = { title: string; when: string; href: string };

type Stat = { label: string; value: number | string; href: string; icon: typeof Target };

const employeeSteps: JourneyStep[] = [
  { title: "Set objectives", when: "Start of year", href: "/cycle?stage=objectives" },
  { title: "Track everyday work", when: "Throughout year", href: "/tasks" },
  { title: "Write your feedback", when: "Dec 1–15", href: "/cycle?stage=feedback" },
  { title: "Complete assessment", when: "Review period", href: "/cycle?stage=assessment" },
  { title: "Confirm outcome", when: "Feb 1–15", href: "/cycle?stage=outcome" },
];
const managerSteps: JourneyStep[] = [
  { title: "Align objectives", when: "Start of year", href: "/cycle?stage=objectives" },
  { title: "Start reviews", when: "Before input", href: "/cycle?stage=kickoff" },
  { title: "Review feedback", when: "Dec 15–Jan 10", href: "/cycle?stage=manager" },
  { title: "Rate and recommend pay", when: "January", href: "/cycle?stage=score" },
  { title: "Share approved outcome", when: "Feb 1–15", href: "/cycle?stage=share" },
];
const adminSteps: JourneyStep[] = [
  { title: "Approve questions", when: "Before launch", href: "/cycle?stage=setup" },
  { title: "Monitor input", when: "Dec–Jan", href: "/cycle?stage=monitor" },
  { title: "Check fairness", when: "January", href: "/cycle?stage=fairness" },
  { title: "Approve pay", when: "Before conversations", href: "/cycle?stage=approve" },
  { title: "Release and close", when: "Feb 1–15", href: "/cycle?stage=release" },
];

const adminLinks: QuickLink[] = [
  { title: "Staff access", detail: "Check sign-in activity and add missing work email addresses.", href: "/admin/access", label: "View staff access", icon: Users },
  { title: "Review questions", detail: "Review disabled department questions and switch on the ones ready for this cycle.", href: "/admin/panel?tab=questions", label: "Approve questions", icon: ClipboardCheck },
  { title: "Pay approvals", detail: "Approve or return submitted merit recommendations before outcomes are shared.", href: "/admin/panel?tab=approvals", label: "Review pay approvals", icon: Wallet },
  { title: "Records needing attention", detail: "Find missing pay, manager, reviewer, sign-in, or hire-date details.", href: "/admin/panel?tab=records", label: "Check records", icon: ClipboardCheck },
  { title: "Review progress", detail: "Track employee input, manager feedback, and completion across the company.", href: "/reviews", label: "Monitor reviews", icon: Users },
];

const actionIcons: Record<string, typeof Target> = {
  objectives: Target,
  align: Target,
  feedback: FileText,
  reviews: ClipboardCheck,
  assessment: ClipboardCheck,
  assessments: ClipboardCheck,
  ack: CheckCircle2,
  tasks: ListTodo,
  blocked: CircleAlert,
  checkins: CalendarClock,
  kickoff: Users,
  improvements: TrendingUp,
  pay: Wallet,
  share: ArrowUpRight,
};

function Journey({ steps, current }: { steps: JourneyStep[]; current: number }) {
  return (
    <ol className="space-y-1" aria-label="Review cycle stages">
      {steps.map((step, index) => (
        <li key={step.title}>
          <Link
            to={step.href}
            aria-current={index === current ? "step" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted ${index === current ? "bg-primary/5" : ""}`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${index === current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm leading-tight ${index === current ? "font-semibold" : "font-medium"}`}>{step.title}</span>
              <span className="block text-xs text-muted-foreground">{step.when}</span>
            </span>
            {index === current && <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-primary">Now</span>}
          </Link>
        </li>
      ))}
    </ol>
  );
}

function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {links.map((item) => (
        <Card key={item.href + item.title} className="shadow-none">
          <CardContent className="flex h-full flex-col p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                <item.icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-3 w-fit px-0 text-primary hover:bg-transparent">
              <Link to={item.href}>{item.label}<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <Link key={stat.label} to={stat.href} className="group rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            <stat.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
        </Link>
      ))}
    </div>
  );
}

function RoleHome() {
  const { viewMode } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [meUuid, setMeUuid] = useState("");
  const [actions, setActions] = useState<HomeAction[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return setLoading(false);

    const { data: me } = await supabase
      .from("employees")
      .select("uuid,first_name,last_name")
      .eq("user_id", userId)
      .maybeSingle();
    setName(me?.first_name ?? "");
    setMeUuid(me?.uuid ?? "");
    if (!me?.uuid) return setLoading(false);

    const year = new Date().getFullYear();
    const today = new Date().toISOString().slice(0, 10);
    const next: HomeAction[] = [];
    const nextStats: Stat[] = [];

    if (viewMode === "employee") {
      const [{ data: forms }, { data: reviews }, { data: attempts }, { data: tasks }] = await Promise.all([
        supabase.from("pdr_forms").select("id,objectives_submitted_at,objectives_approved_at,midyear_self_submitted_at,self_input_submitted_at").eq("employee_uuid", me.uuid).eq("fiscal_year", year).maybeSingle(),
        reviewData("performance_reviews").select("id,review_cycle,status,released_at,employee_ack_at").eq("employee_uuid", me.uuid).order("scheduled_date", { ascending: false }),
        supabase.from("assessment_attempts").select("id").eq("employee_uuid", me.uuid).not("submitted_at", "is", null).limit(1),
        supabase.from("daily_tasks").select("id,status,due_date").eq("employee_uuid", me.uuid).neq("status", "done"),
      ]);
      if (!forms || !forms.objectives_submitted_at) next.push({ id: "objectives", title: `Set and submit your ${year} objectives`, detail: "Start with measurable goals for the year. These are separate from your day-to-day task list.", href: "/pdr", label: "Add objectives" });
      const openReview = (reviews ?? []).find((review) => review.status !== "completed");
      if (openReview) {
        const { data: self } = await supabase.from("review_self_assessments").select("submitted_at").eq("review_id", openReview.id).maybeSingle();
        if (!self?.submitted_at) next.push({ id: "feedback", title: "Write your review feedback", detail: "Record what you accomplished, challenges you faced, and how you demonstrated the DP INC values.", href: "/me", label: "Write my feedback" });
      }
      if (!attempts?.length) next.push({ id: "assessment", title: "Complete your assessment", detail: "Your role assessment and DISC profile are reviewed alongside your goals and feedback.", href: "/me", label: "Open assessment" });
      const acknowledgements = (reviews ?? []).filter((review) => review.released_at && !review.employee_ack_at);
      if (acknowledgements.length) next.push({ id: "ack", title: "Confirm your review outcome", detail: "Your manager has shared the approved outcome. Read it and confirm receipt.", href: "/me", label: "Review outcome" });
      const overdue = (tasks ?? []).filter((task) => task.due_date && task.due_date < today);
      if (overdue.length) next.push({ id: "tasks", title: `${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}`, detail: "Update the status or due date on your day-to-day work board.", href: "/tasks", label: "Update tasks" });
      nextStats.push(
        { label: "Open tasks", value: (tasks ?? []).length, href: "/tasks", icon: ListTodo },
        { label: "Reviews on file", value: (reviews ?? []).length, href: "/me", icon: FileText },
        { label: "Objectives submitted", value: forms?.objectives_submitted_at ? "Yes" : "No", href: "/pdr", icon: Target },
        { label: "Assessment done", value: attempts?.length ? "Yes" : "No", href: "/me", icon: ClipboardCheck },
      );
    } else {
      const { data: reports } = await supabase.from("employees").select("uuid").eq("manager_uuid", me.uuid).neq("uuid", me.uuid);
      const ids = (reports ?? []).map((person) => person.uuid);
      if (ids.length) {
        const [{ data: forms }, { data: reviews }, { data: tasks }, { data: improvements }] = await Promise.all([
          supabase.from("pdr_forms").select("id,objectives_submitted_at,objectives_approved_at,midyear_self_submitted_at,midyear_manager_submitted_at,self_input_submitted_at,comments_finalized_at").in("employee_uuid", ids).eq("fiscal_year", year),
          reviewData("performance_reviews").select("id,status,assessment_attempt_id,comp_approval_status,released_at,rating_score").in("employee_uuid", ids),
          supabase.from("daily_tasks").select("id").in("employee_uuid", ids).eq("status", "blocked"),
          supabase.from("assessment_action_items").select("id,status,due_date").in("employee_uuid", ids).neq("status", "done"),
        ]);
        const { data: checkIns } = await supabase
          .from("feedback_check_ins")
          .select("id,due_date,manager_submitted_at")
          .in("employee_uuid", ids)
          .is("shared_at", null);
        const overdueCheckIns = (checkIns ?? []).filter((c) => c.due_date && c.due_date < today).length;
        if (overdueCheckIns) next.push({ id: "checkins", title: `${overdueCheckIns} feedback check-in${overdueCheckIns === 1 ? "" : "s"} overdue`, detail: "Open check-ins with a passed due date are listed on this page below — fill in your side or follow up with the employee.", href: "#pending-checkins", label: "View check-ins" });
        else if ((checkIns ?? []).some((c) => !c.manager_submitted_at)) next.push({ id: "checkins", title: "Feedback check-ins waiting on you", detail: "Score DP INC values and department questions for your open check-ins, listed on this page below.", href: "#pending-checkins", label: "View check-ins" });
        const align = (forms ?? []).filter((form) => form.objectives_submitted_at && !form.objectives_approved_at).length;
        if (align) next.push({ id: "align", title: `Align ${align} submitted objective set${align === 1 ? "" : "s"}`, detail: "Check that each goal is measurable, then approve it or send it back.", href: "/pdr", label: "Review objectives" });
        const scheduled = (reviews ?? []).filter((review) => review.status === "scheduled").length;
        if (scheduled) next.push({ id: "kickoff", title: `Start ${scheduled} scheduled team review${scheduled === 1 ? "" : "s"}`, detail: "Start each direct report’s existing review record before drafting manager input.", href: "/cycle?stage=kickoff", label: "Start reviews" });
        const open = (reviews ?? []).filter((review) => review.status === "in_progress").length;
        if (open) next.push({ id: "reviews", title: `Complete feedback for ${open} team review${open === 1 ? "" : "s"}`, detail: "Read employee input and assessments, then add manager feedback and DP INC value scores.", href: "/reviews", label: "Write feedback" });
        const missing = (reviews ?? []).filter((review) => review.status !== "completed" && !review.assessment_attempt_id).length;
        if (missing) next.push({ id: "assessments", title: `${missing} review${missing === 1 ? "" : "s"} missing an assessment`, detail: "Request or review the role assessment before completing manager feedback.", href: "/people", label: "Review assessments" });
        const dueActions = (improvements ?? []).filter((item) => item.due_date && item.due_date < today).length;
        if (dueActions) next.push({ id: "improvements", title: `${dueActions} improvement action${dueActions === 1 ? "" : "s"} overdue`, detail: "Follow up assessment-based commitments before closing the review.", href: "/improvement", label: "Check actions" });
        if ((tasks ?? []).length) next.push({ id: "blocked", title: `${tasks?.length} blocked team task${tasks?.length === 1 ? "" : "s"}`, detail: "Review blockers and leave guidance on the person's work board.", href: "/tasks", label: "Review blockers" });
        const unrated = (reviews ?? []).filter((review) => review.status === "in_progress" && review.rating_score == null && review.assessment_attempt_id).length;
        if (unrated) next.push({ id: "pay", title: `Enter ratings for ${unrated} team review${unrated === 1 ? "" : "s"}`, detail: "Record the results rating, DP INC value score, I/C, and merit recommendation in Pay review.", href: "/cycle?stage=score", label: "Draft scores" });
        const approved = (reviews ?? []).filter((review) => review.comp_approval_status === "approved" && !review.released_at).length;
        if (approved) next.push({ id: "share", title: `${approved} approved outcome${approved === 1 ? "" : "s"} ready to share`, detail: "Hold the review conversation, then share the approved outcome with the employee.", href: "/cycle?stage=share", label: "Share outcomes" });
        const overdueTotal = overdueCheckIns + dueActions + (tasks ?? []).length;
        nextStats.push(
          { label: "Direct reports", value: ids.length, href: "/people", icon: Users },
          { label: "Open reviews", value: (reviews ?? []).filter((review) => review.status !== "completed").length, href: "/reviews", icon: ClipboardCheck },
          { label: "Open check-ins", value: (checkIns ?? []).length, href: "#pending-checkins", icon: CalendarClock },
          { label: "Overdue items", value: overdueTotal, href: "/improvement", icon: CircleAlert },
        );
      }
    }
    setActions(next);
    setStats(nextStats);
    setLoading(false);
  }, [viewMode]);

  useEffect(() => { load(); }, [load]);

  const steps = viewMode === "employee" ? employeeSteps : managerSteps;
  const stageByAction: Record<string, number> = viewMode === "employee"
    ? { objectives: 0, tasks: 1, feedback: 2, assessment: 3, ack: 4 }
    : { align: 0, kickoff: 1, blocked: 1, checkins: 1, reviews: 2, assessments: 2, improvements: 2, pay: 3, share: 4 };
  const currentStage = actions[0] ? (stageByAction[actions[0].id] ?? 0) : steps.length - 1;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{name ? `Welcome back, ${name}` : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{today}</p>
      </div>

      {!loading && stats.length > 0 && <StatStrip stats={stats} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="todo-title" className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="todo-title" className="text-sm font-semibold">Needs your attention</h2>
            {!loading && actions.length > 0 && <span className="text-xs text-muted-foreground">{actions.length} item{actions.length === 1 ? "" : "s"}</span>}
          </div>
          <Card className="shadow-none">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking what needs your attention…</div>
              ) : actions.length ? (
                <ul className="divide-y divide-border">
                  {actions.slice(0, 6).map((action) => {
                    const Icon = actionIcons[action.id] ?? ClipboardCheck;
                    return (
                      <li key={action.id}>
                        <Link to={action.href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{action.title}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{action.detail}</span>
                          </span>
                          <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-primary sm:flex">
                            {action.label}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center gap-3 px-5 py-8">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">You're up to date</p>
                    <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="cycle-title">
            <div className="mb-3">
              <h2 id="cycle-title" className="text-sm font-semibold">{viewMode === "employee" ? "Your review year" : "Your team's review cycle"}</h2>
            </div>
            <Card className="shadow-none">
              <CardContent className="p-2">
                <Journey steps={steps} current={currentStage} />
              </CardContent>
            </Card>
          </section>

          {viewMode === "manager" && meUuid && (
            <section id="pending-checkins" aria-labelledby="checkins-title" className="scroll-mt-6">
              <ManagerCheckInsCard managerUuid={meUuid} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminHome() {
  const [counts, setCounts] = useState({ questions: 0, approvals: 0, records: 0, reviews: 0 });
  const [name, setName] = useState("");
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const { data: me } = await supabase
        .from("employees")
        .select("first_name")
        .eq("user_id", userId)
        .maybeSingle();
      setName(me?.first_name ?? "");
    })();
  }, []);
  useEffect(() => {
    (async () => {
      const [{ count: questions }, { count: approvals }, { data: employees }, { count: reviews }] = await Promise.all([
        supabase.from("department_questions").select("id", { count: "exact", head: true }).eq("is_active", false),
        reviewData("performance_reviews").select("id", { count: "exact", head: true }).eq("comp_approval_status", "submitted"),
        supabase.from("employees").select("email,manager_uuid,hire_date,user_id,current_annual_comp").eq("terminated", false),
        reviewData("performance_reviews").select("id", { count: "exact", head: true }).neq("status", "completed"),
      ]);
      const records = (employees ?? []).filter((employee) =>
        !employee.email || !employee.hire_date || !employee.user_id || employee.current_annual_comp == null,
      ).length;
      setCounts({ questions: questions ?? 0, approvals: approvals ?? 0, records, reviews: reviews ?? 0 });
    })();
  }, []);
  const liveLinks = adminLinks.map((link) => {
    if (link.href.includes("tab=questions")) return { ...link, detail: `${counts.questions} disabled department question${counts.questions === 1 ? "" : "s"} waiting for review.` };
    if (link.href.includes("tab=approvals")) return { ...link, detail: `${counts.approvals} pay submission${counts.approvals === 1 ? "" : "s"} waiting for a decision.` };
    if (link.href.includes("tab=records")) return { ...link, detail: `${counts.records} employee record${counts.records === 1 ? "" : "s"} missing a work email, sign-in link, hire date, or pay figure.` };
    if (link.href === "/reviews") return { ...link, detail: `${counts.reviews} review${counts.reviews === 1 ? "" : "s"} still open across the company.` };
    return link;
  });
  const month = new Date().getMonth();
  const currentStage = month === 11 ? 1 : month === 0 ? 2 : month === 1 ? 4 : 0;
  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">
            Welcome back{name ? `, ${name}` : ""}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Run the review cycle</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Start with the specific item that needs attention, then monitor review progress across the company.</p>
        </div>
        <div><h2 className="mb-3 text-sm font-semibold">Start here</h2><QuickLinks links={liveLinks} /></div>
        <div className="space-y-3"><div><h2 className="text-sm font-semibold">Annual review cycle</h2><p className="text-xs text-muted-foreground">The highlighted stage reflects the annual calendar. Select any stage to open it.</p></div>
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5" aria-label="Review cycle stages">
            {adminSteps.map((step, index) => (
              <li key={step.title}>
                <Link
                  to={step.href}
                  aria-current={index === currentStage ? "step" : undefined}
                  className={`flex min-w-0 items-center gap-2 rounded-md border px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-primary/5 ${index === currentStage ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${index === currentStage ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                    {index + 1}
                  </span>
                  <span className="min-w-0"><span className="block text-xs font-medium leading-tight">{step.title}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{step.when}</span></span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <details className="group border-t border-border pt-6">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold">Company dashboard <span className="text-xs font-normal text-primary group-open:hidden">Open dashboard</span><span className="hidden text-xs font-normal text-primary group-open:inline">Hide dashboard</span></summary>
        <div className="pt-6"><Overview /></div>
      </details>
    </div>
  );
}

export default function Home() {
  const { viewMode, loading } = usePermissions();
  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your home…</div>;
  return viewMode === "admin" ? <AdminHome /> : <RoleHome />;
}
