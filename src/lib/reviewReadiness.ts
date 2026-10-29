import { CORE_VALUES } from "@/lib/coreValues";

export function managerFeedbackReady(notes: string, rows: { value_code: string; manager_score: number | null }[]) {
  return notes.trim().length > 0 && CORE_VALUES.every(value =>
    rows.some(row => row.value_code === value.code && row.manager_score != null && row.manager_score >= 1 && row.manager_score <= 5));
}