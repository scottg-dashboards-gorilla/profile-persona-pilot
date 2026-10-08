import { supabase } from "@/integrations/supabase/client";
import { CORE_VALUES, averageScore } from "@/lib/coreValues";
import { questionApplies } from "@/lib/departmentReview";

/** Off-cycle feedback check-in: DP INC values + department questions, scored blind by both sides. */
export type FeedbackCheckIn = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  department: string | null;
  fiscal_year: number;
  requester_name: string | null;
  note: string | null;
  due_date: string | null;
  employee_required: boolean;
  manager_submitted_at: string | null;
  employee_submitted_at: string | null;
  shared_at: string | null;
  created_at: string;
};

export type CheckInAnswer = {
  id?: string;
  check_in_id: string;
  side: "manager" | "employee";
  item_kind: "value" | "question";
  item_key: string;
  score: number | null;
  comment: string | null;
};

export type CheckInQuestion = {
  id: string;
  prompt: string;
  help_text: string | null;
  response_type: "score" | "yes_no" | "text";
  audience: "employee" | "manager" | "both";
};

export function checkInStatus(c: FeedbackCheckIn): { label: string; overdue: boolean; tone: string } {
  const overdue =
    !c.shared_at && !!c.due_date && new Date(c.due_date + "T23:59:59") < new Date();
  if (c.shared_at) return { label: "Shared — both sides visible", overdue: false, tone: "bg-primary/10 text-primary border-primary/30" };
  const parts: string[] = [];
  parts.push(c.manager_submitted_at ? "Manager done" : "Waiting on manager");
  if (c.employee_required) parts.push(c.employee_submitted_at ? "employee done" : "waiting on employee");
  return {
    label: (overdue ? "Overdue · " : "") + parts.join(" · "),
    overdue,
    tone: overdue
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-muted text-foreground border-border",
  };
}

/** Active department questions (company-wide + that department) for one side. */
export async function loadCheckInQuestions(department: string | null, side: "manager" | "employee", employeeUuid: string) {
  const [{ data }, { data: employee }] = await Promise.all([supabase
    .from("department_questions")
    .select("id, department, prompt, help_text, response_type, audience, sort_order, is_active, applies_to_titles")
    .eq("is_active", true)
    .order("sort_order"), supabase.from("employees").select("department, title").eq("uuid", employeeUuid).maybeSingle()]);
  return ((data ?? []) as (CheckInQuestion & { department: string | null; applies_to_titles: string[] })[]).filter(
    (q) =>
      questionApplies(q, employee ?? { department, title: null }) &&
      (q.audience === "both" || q.audience === side),
  );
}

/**
 * Manager DP INC averages from shared check-ins in a fiscal year, per employee.
 * These sit alongside the review's own value scores in the 30% values share.
 */
export async function sharedCheckInValueAverages(employeeUuids: string[], year: number) {
  const out: Record<string, number[]> = {};
  if (employeeUuids.length === 0) return out;
  const { data: cis } = await supabase
    .from("feedback_check_ins")
    .select("id, employee_uuid")
    .in("employee_uuid", employeeUuids)
    .eq("fiscal_year", year)
    .not("shared_at", "is", null);
  const list = (cis ?? []) as { id: string; employee_uuid: string }[];
  if (list.length === 0) return out;
  const { data: ans } = await supabase
    .from("feedback_check_in_answers")
    .select("check_in_id, item_key, score")
    .in("check_in_id", list.map((c) => c.id))
    .eq("side", "manager")
    .eq("item_kind", "value");
  const byCi: Record<string, Record<string, number | null>> = {};
  ((ans ?? []) as { check_in_id: string; item_key: string; score: number | null }[]).forEach((a) => {
    (byCi[a.check_in_id] ??= {})[a.item_key] = a.score;
  });
  list.forEach((c) => {
    const avg = averageScore(CORE_VALUES.map((v) => byCi[c.id]?.[v.code] ?? null));
    if (avg != null) (out[c.employee_uuid] ??= []).push(avg);
  });
  return out;
}

/** Review value average blended equally with each shared check-in's average. */
export function combineValueAverages(reviewAvg: number | null, checkInAvgs: number[] | undefined) {
  return averageScore([reviewAvg, ...(checkInAvgs ?? [])]);
}
