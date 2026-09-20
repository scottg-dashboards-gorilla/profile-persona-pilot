import { supabase } from "@/integrations/supabase/client";

/**
 * Builds the end-of-cycle record pack for one person: their objectives, what
 * they and their manager wrote, the rating and pay outcome, and their
 * assessment results — one file to keep on the employee's file.
 */
function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number | null)[][]) {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export async function exportRecordPack(employeeUuid: string, employeeName: string) {
  const [{ data: emp }, { data: reviews }, { data: forms }, { data: attempts }] = await Promise.all([
    supabase
      .from("employees")
      .select("first_name, last_name, email, title, department, hire_date")
      .eq("uuid", employeeUuid)
      .maybeSingle(),
    supabase
      .from("performance_reviews")
      .select(
        "fiscal_year, review_cycle, scheduled_date, completed_date, status, overall_rating, rating_score, ic_score, merit_percent, merit_amount, comp_effective_date, notes, released_at, employee_ack_at, employee_ack_comment, pay_pushback_status, pay_pushback_hr_note",
      )
      .eq("employee_uuid", employeeUuid)
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("pdr_forms")
      .select(
        "id, fiscal_year, stage, employee_self_input, manager_comments, midyear_self_input, midyear_manager_feedback, year_end_score",
      )
      .eq("employee_uuid", employeeUuid)
      .order("fiscal_year", { ascending: false }),
    supabase
      .from("assessment_attempts")
      .select("submitted_at, tier, disc_primary, truthfulness_score")
      .eq("employee_uuid", employeeUuid)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
  ]);

  const formIds = ((forms ?? []) as { id: string }[]).map((f) => f.id);
  const { data: objectives } = formIds.length
    ? await supabase
        .from("pdr_objectives")
        .select(
          "form_id, category, title, description, goal_kind, start_date, end_date, target_value, current_value, unit, status, midyear_employee_comment, midyear_manager_comment, manager_comment",
        )
        .in("form_id", formIds)
    : { data: [] as Record<string, unknown>[] };

  const rows: (string | number | null)[][] = [];
  rows.push(["Datapath record pack", employeeName, new Date().toISOString().slice(0, 10)]);
  rows.push([]);
  rows.push(["Person"]);
  rows.push(["Name", "Email", "Job title", "Department", "Hire date"]);
  const e = (emp ?? {}) as Record<string, string | null>;
  rows.push([
    [e.first_name, e.last_name].filter(Boolean).join(" "),
    e.email ?? "",
    e.title ?? "",
    e.department ?? "",
    e.hire_date ?? "",
  ]);

  rows.push([]);
  rows.push(["Reviews"]);
  rows.push([
    "Year",
    "Cycle",
    "Scheduled",
    "Completed",
    "Status",
    "Rating",
    "Score",
    "I/C",
    "Merit %",
    "Merit amount",
    "Effective",
    "Manager feedback",
    "Shared on",
    "Confirmed on",
    "Employee comment",
    "Pay concern",
    "HR decision",
  ]);
  ((reviews ?? []) as Record<string, string | number | null>[]).forEach((r) => {
    rows.push([
      r.fiscal_year,
      r.review_cycle,
      r.scheduled_date,
      r.completed_date,
      r.status,
      r.overall_rating,
      r.rating_score,
      r.ic_score,
      r.merit_percent,
      r.merit_amount,
      r.comp_effective_date,
      r.notes,
      r.released_at,
      r.employee_ack_at,
      r.employee_ack_comment,
      r.pay_pushback_status,
      r.pay_pushback_hr_note,
    ]);
  });

  rows.push([]);
  rows.push(["Objective setting"]);
  rows.push([
    "Year",
    "Category",
    "Goal",
    "Description",
    "Type",
    "Start",
    "End",
    "Target",
    "Latest",
    "Unit",
    "Status",
    "Employee mid-year comment",
    "Manager mid-year comment",
    "Manager year-end comment",
  ]);
  const yearByForm = new Map(
    ((forms ?? []) as { id: string; fiscal_year: number }[]).map((f) => [f.id, f.fiscal_year]),
  );
  ((objectives ?? []) as Record<string, string | number | null>[]).forEach((o) => {
    rows.push([
      yearByForm.get(String(o.form_id)) ?? "",
      o.category,
      o.title,
      o.description,
      o.goal_kind,
      o.start_date,
      o.end_date,
      o.target_value,
      o.current_value,
      o.unit,
      o.status,
      o.midyear_employee_comment,
      o.midyear_manager_comment,
      o.manager_comment,
    ]);
  });

  rows.push([]);
  rows.push(["Year-end write-ups"]);
  rows.push(["Year", "Stage", "Employee input", "Manager comments", "Mid-year employee", "Mid-year manager", "Score"]);
  ((forms ?? []) as Record<string, string | number | null>[]).forEach((f) => {
    rows.push([
      f.fiscal_year,
      f.stage,
      f.employee_self_input,
      f.manager_comments,
      f.midyear_self_input,
      f.midyear_manager_feedback,
      f.year_end_score,
    ]);
  });

  rows.push([]);
  rows.push(["Assessments"]);
  rows.push(["Submitted", "Tier", "DISC", "Consistency"]);
  ((attempts ?? []) as Record<string, string | number | null>[]).forEach((a) => {
    rows.push([a.submitted_at, a.tier, a.disc_primary, a.truthfulness_score]);
  });

  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${employeeName.replace(/\s+/g, "-").toLowerCase()}-record-pack.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
