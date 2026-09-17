import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

type Ping = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

/**
 * Header bell showing what still needs action, tailored to the view the person is in:
 * employee view = their own items, manager view = their team, admin view = company-wide.
 */
export function NotificationsBell() {
  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState<Ping[]>([]);
  const { viewMode, loading: permsLoading } = usePermissions();

  const loadEmployee = useCallback(async (uuid: string) => {
    const out: Ping[] = [];
    const year = new Date().getFullYear();
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: revs }, { data: attempts }, { data: forms }, { data: tasks }] = await Promise.all([
      supabase
        .from("performance_reviews")
        .select("id, review_cycle, status, released_at, employee_ack_at")
        .eq("employee_uuid", uuid)
        .order("scheduled_date", { ascending: false }),
      supabase
        .from("assessment_attempts")
        .select("id")
        .eq("employee_uuid", uuid)
        .not("submitted_at", "is", null)
        .limit(1),
      supabase
        .from("pdr_forms")
        .select(
          "id, fiscal_year, objectives_submitted_at, objectives_approved_at, midyear_self_submitted_at, self_input_submitted_at",
        )
        .eq("employee_uuid", uuid)
        .eq("fiscal_year", year)
        .maybeSingle(),
      supabase
        .from("daily_tasks")
        .select("id, status, due_date")
        .eq("employee_uuid", uuid)
        .neq("status", "done"),
    ]);

    const reviews = revs ?? [];
    const open = reviews.find((r) => r.status !== "completed");
    if (open) {
      const { data: sa } = await supabase
        .from("review_self_assessments")
        .select("submitted_at")
        .eq("review_id", open.id)
        .maybeSingle();
      if (!sa?.submitted_at) {
        out.push({
          id: "self",
          title: "Finish your self-assessment",
          detail: `Your ${open.review_cycle} is open and waiting on your input.`,
          href: "/me",
        });
      }
    }

    for (const r of reviews.filter((r) => r.released_at && !r.employee_ack_at)) {
      out.push({
        id: `ack-${r.id}`,
        title: "Confirm you've received your outcome",
        detail: `Your ${r.review_cycle} outcome was shared with you.`,
        href: "/me",
      });
    }

    if (!attempts?.length) {
      out.push({
        id: "assessment",
        title: "Take your assessment",
        detail: "Your review can't be completed without it.",
        href: "/me",
      });
    }

    if (!forms) {
      out.push({
        id: "pdr-none",
        title: `Set your ${year} objectives`,
        detail: "No objectives are on file for you this year yet.",
        href: "/pdr",
      });
    } else {
      if (!forms.objectives_submitted_at) {
        out.push({
          id: "pdr-objectives",
          title: "Submit your objectives",
          detail: "Your objectives are still a draft — send them to your manager.",
          href: "/pdr",
        });
      }
      if (forms.objectives_approved_at && !forms.midyear_self_submitted_at) {
        out.push({
          id: "pdr-mid",
          title: "Add your mid-year comments",
          detail: "Comment on each objective you agreed with your manager.",
          href: "/pdr",
        });
      }
      if (forms.midyear_self_submitted_at && !forms.self_input_submitted_at) {
        out.push({
          id: "pdr-year",
          title: "Write your year-end input",
          detail: "Due between Dec 01 and Dec 15.",
          href: "/pdr",
        });
      }
    }

    const openTasks = tasks ?? [];
    const overdue = openTasks.filter((t) => t.due_date && t.due_date < today);
    if (overdue.length) {
      out.push({
        id: "tasks-overdue",
        title: `${overdue.length} task${overdue.length === 1 ? "" : "s"} overdue`,
        detail: "These are past their due date on your board.",
        href: "/tasks",
      });
    }
    const blocked = openTasks.filter((t) => t.status === "blocked");
    if (blocked.length) {
      out.push({
        id: "tasks-blocked",
        title: `${blocked.length} task${blocked.length === 1 ? "" : "s"} blocked`,
        detail: "Move them on or flag them to your manager.",
        href: "/tasks",
      });
    }
    return out;
  }, []);

  /** Manager view: only items about the people who report directly to this person. */
  const loadManager = useCallback(async (uuid: string) => {
    const out: Ping[] = [];
    const year = new Date().getFullYear();
    const today = new Date().toISOString().slice(0, 10);

    const { data: team } = await supabase
      .from("employees")
      .select("uuid, first_name, last_name, hire_date")
      .eq("manager_uuid", uuid);
    const reports = (team ?? []).filter((e) => e.uuid !== uuid);
    if (!reports.length) return out;
    const ids = reports.map((e) => e.uuid as string);
    const nameOf = (id: string) => {
      const e = reports.find((r) => r.uuid === id);
      return e ? `${e.first_name} ${e.last_name}` : "A team member";
    };

    const [{ data: revs }, { data: forms }, { data: tasks }] = await Promise.all([
      supabase
        .from("performance_reviews")
        .select(
          "id, employee_uuid, employee_name, review_cycle, status, scheduled_date, released_at, comp_approval_status, pay_pushback_status, escalation_status, assessment_attempt_id",
        )
        .in("employee_uuid", ids),
      supabase
        .from("pdr_forms")
        .select(
          "id, employee_uuid, objectives_submitted_at, objectives_approved_at, midyear_self_submitted_at, midyear_manager_submitted_at, self_input_submitted_at, manager_input_submitted_at",
        )
        .in("employee_uuid", ids)
        .eq("fiscal_year", year),
      supabase.from("daily_tasks").select("id, employee_uuid, status").in("employee_uuid", ids).eq("status", "blocked"),
    ]);

    const reviews = revs ?? [];
    const openReviews = reviews.filter((r) => r.status !== "completed" && r.status !== "cancelled");
    const overdue = openReviews.filter((r) => r.scheduled_date && r.scheduled_date < today);
    if (overdue.length) {
      out.push({
        id: "mgr-overdue",
        title: `${overdue.length} team review${overdue.length === 1 ? "" : "s"} overdue`,
        detail: "Past the scheduled date and still waiting on your rating.",
        href: "/reviews",
      });
    }
    const toRate = openReviews.filter((r) => !overdue.includes(r));
    if (toRate.length) {
      out.push({
        id: "mgr-open",
        title: `${toRate.length} review${toRate.length === 1 ? "" : "s"} waiting on you`,
        detail: "Ratings and pay proposals for your team.",
        href: "/reviews",
      });
    }
    const noAssessment = openReviews.filter((r) => !r.assessment_attempt_id);
    if (noAssessment.length) {
      out.push({
        id: "mgr-assessment",
        title: `${noAssessment.length} team member${noAssessment.length === 1 ? "" : "s"} without an assessment`,
        detail: "Their review can't be completed until it's on file.",
        href: "/reviews",
      });
    }
    const concerns = reviews.filter((r) => !["none", "resolved"].includes(r.pay_pushback_status ?? "none"));
    for (const r of concerns) {
      out.push({
        id: `mgr-concern-${r.id}`,
        title: `${r.employee_name ?? nameOf(r.employee_uuid as string)} raised a pay concern`,
        detail: "Add the detail behind the pushback so HR can decide.",
        href: `/reviews/${r.id}`,
      });
    }
    const approved = reviews.filter((r) => r.comp_approval_status === "approved" && !r.released_at);
    if (approved.length) {
      out.push({
        id: "mgr-release",
        title: `${approved.length} outcome${approved.length === 1 ? "" : "s"} approved to share`,
        detail: "HR signed off the pay change — hold the conversation and share it.",
        href: "/reviews",
      });
    }

    const pdr = forms ?? [];
    const toAlign = pdr.filter((f) => f.objectives_submitted_at && !f.objectives_approved_at);
    if (toAlign.length) {
      out.push({
        id: "mgr-align",
        title: `${toAlign.length} set${toAlign.length === 1 ? "" : "s"} of objectives to align`,
        detail: "Your team submitted objectives and are waiting on your sign-off.",
        href: "/pdr",
      });
    }
    const midToComment = pdr.filter((f) => f.midyear_self_submitted_at && !f.midyear_manager_submitted_at);
    if (midToComment.length) {
      out.push({
        id: "mgr-mid",
        title: `${midToComment.length} mid-year review${midToComment.length === 1 ? "" : "s"} to comment on`,
        detail: "Add your comment under each objective they wrote about.",
        href: "/pdr",
      });
    }
    const yearToComment = pdr.filter((f) => f.self_input_submitted_at && !f.manager_input_submitted_at);
    if (yearToComment.length) {
      out.push({
        id: "mgr-year",
        title: `${yearToComment.length} year-end input${yearToComment.length === 1 ? "" : "s"} to respond to`,
        detail: "Your team submitted their year-end input.",
        href: "/pdr",
      });
    }

    const missingPdr = reports.filter((e) => !pdr.some((f) => f.employee_uuid === e.uuid));
    if (missingPdr.length) {
      out.push({
        id: "mgr-nopdr",
        title: `${missingPdr.length} team member${missingPdr.length === 1 ? "" : "s"} without ${year} objectives`,
        detail: "No objectives are on file for them this year.",
        href: "/pdr",
      });
    }

    // Anniversaries due within three weeks or already passed this year.
    const now = new Date();
    const soon: string[] = [];
    const passed: string[] = [];
    for (const e of reports) {
      if (!e.hire_date) continue;
      const hire = new Date(e.hire_date as string);
      const next = new Date(now.getFullYear(), hire.getMonth(), hire.getDate());
      const days = Math.round((next.getTime() - now.getTime()) / 86400000);
      if (days < 0 && days > -60) passed.push(e.uuid as string);
      else if (days >= 0 && days <= 21) soon.push(e.uuid as string);
    }
    if (passed.length) {
      out.push({
        id: "mgr-anniv-passed",
        title: `${passed.length} pay review anniversar${passed.length === 1 ? "y has" : "ies have"} passed`,
        detail: "Open their pay review to catch up.",
        href: "/apr",
      });
    }
    if (soon.length) {
      out.push({
        id: "mgr-anniv-soon",
        title: `${soon.length} pay review${soon.length === 1 ? "" : "s"} due in 3 weeks`,
        detail: "Anniversaries coming up for your team.",
        href: "/apr",
      });
    }

    const blockedTasks = tasks ?? [];
    if (blockedTasks.length) {
      out.push({
        id: "mgr-blocked",
        title: `${blockedTasks.length} team task${blockedTasks.length === 1 ? "" : "s"} blocked`,
        detail: "Someone on your team is stuck and flagged it.",
        href: "/tasks",
      });
    }

    return out;
  }, []);

  /** Admin/HR view: company-wide items that only HR or an admin can clear. */
  const loadAdmin = useCallback(async () => {
    const out: Ping[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: revs }, { count: queued }] = await Promise.all([
      supabase
        .from("performance_reviews")
        .select(
          "id, status, scheduled_date, released_at, employee_ack_at, comp_approval_status, pay_pushback_status, escalation_status, reviewer_uuid, cycle_id, assessment_attempt_id",
        ),
      supabase.from("review_reminders").select("id", { count: "exact", head: true }).eq("status", "queued"),
    ]);
    const reviews = revs ?? [];
    const add = (id: string, n: number, title: string, detail: string, href: string) => {
      if (n > 0) out.push({ id, title: `${n} ${title}`, detail, href });
    };

    add(
      "adm-approval",
      reviews.filter((r) => r.status === "completed" && r.comp_approval_status !== "approved").length,
      "pay change(s) waiting on HR approval",
      "Nothing can be shared with an employee until this is signed off.",
      "/reviews",
    );
    add(
      "adm-escalation",
      reviews.filter((r) => r.escalation_status === "pending").length,
      "escalation(s) to decide",
      "Managers have asked HR to look at over-budget proposals.",
      "/reviews",
    );
    add(
      "adm-concern",
      reviews.filter((r) => !["none", "resolved"].includes(r.pay_pushback_status ?? "none")).length,
      "pay concern(s) open",
      "Employees are waiting on an HR decision.",
      "/reviews",
    );
    add(
      "adm-release",
      reviews.filter((r) => r.comp_approval_status === "approved" && !r.released_at).length,
      "approved outcome(s) not yet shared",
      "Approved but still not released to the employee.",
      "/reviews",
    );
    add(
      "adm-ack",
      reviews.filter((r) => r.released_at && !r.employee_ack_at).length,
      "outcome(s) not confirmed",
      "Shared with employees but not yet acknowledged.",
      "/reviews",
    );
    add(
      "adm-overdue",
      reviews.filter((r) => r.status !== "completed" && r.status !== "cancelled" && r.scheduled_date && r.scheduled_date < today)
        .length,
      "review(s) overdue",
      "Past their scheduled date across the company.",
      "/reviews",
    );
    add(
      "adm-reviewer",
      reviews.filter((r) => r.status !== "completed" && !r.reviewer_uuid).length,
      "review(s) without a reviewer",
      "Nobody is assigned to complete them.",
      "/reviews",
    );
    add(
      "adm-cycle",
      reviews.filter((r) => !r.cycle_id).length,
      "review(s) not in a cycle",
      "They won't roll up into cycle progress.",
      "/cycles",
    );
    add("adm-reminders", queued ?? 0, "reminder(s) queued to send", "Waiting to go out to employees and reviewers.", "/reviews");

    return out;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPings([]);
      setLoading(false);
      return;
    }
    try {
      if (viewMode === "admin") {
        setPings(await loadAdmin());
      } else {
        const { data: emp } = await supabase
          .from("employees")
          .select("uuid")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!emp) {
          setPings([]);
        } else if (viewMode === "manager") {
          setPings(await loadManager(emp.uuid as string));
        } else {
          setPings(await loadEmployee(emp.uuid as string));
        }
      }
    } catch {
      setPings([]);
    }
    setLoading(false);
  }, [viewMode, loadAdmin, loadEmployee, loadManager]);

  useEffect(() => {
    if (!permsLoading) load();
  }, [load, permsLoading]);

  const count = pings.length;
  const heading =
    viewMode === "admin"
      ? "Needs HR or admin action"
      : viewMode === "manager"
        ? "Needs your action as a manager"
        : "What's pending for you";

  return (
    <DropdownMenu onOpenChange={(o) => o && load()}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-md hover:bg-muted"
          aria-label={count ? `Notifications, ${count} pending` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.05rem] h-[1.05rem] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold leading-[1.05rem] text-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{heading}</span>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            {loading ? "Checking…" : "Nothing pending — you're all caught up."}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {pings.map((p) => (
              <Link
                key={p.id}
                to={p.href}
                className="block rounded-sm px-2 py-2 hover:bg-muted focus:bg-muted outline-none"
              >
                <div className="text-sm font-medium leading-tight">{p.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.detail}</div>
              </Link>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
