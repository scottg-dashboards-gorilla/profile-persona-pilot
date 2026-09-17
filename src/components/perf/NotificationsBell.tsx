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
 * Header bell showing what the signed-in person still has pending, with a count badge.
 */
export function NotificationsBell() {
  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState<Ping[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const out: Ping[] = [];
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPings([]);
      setLoading(false);
      return;
    }
    const { data: emp } = await supabase
      .from("employees")
      .select("uuid")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!emp) {
      setPings([]);
      setLoading(false);
      return;
    }
    const uuid = emp.uuid as string;
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

    setPings(out);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const count = pings.length;

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
          <span>What's pending for you</span>
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
