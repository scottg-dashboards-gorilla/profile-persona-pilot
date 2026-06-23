import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

type Tone = "overdue" | "due_soon" | "scheduled" | "in_progress" | "completed" | "cancelled";

const toneStyles: Record<Tone, string> = {
  overdue: "bg-red-100 text-red-700 border-red-200",
  due_soon: "bg-amber-100 text-amber-800 border-amber-200",
  scheduled: "bg-stone-100 text-stone-700 border-stone-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-stone-100 text-stone-500 border-stone-200",
};

const toneLabels: Record<Tone, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function computeReviewTone(
  status: "scheduled" | "in_progress" | "completed" | "cancelled",
  scheduledDateISO: string,
): Tone {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "in_progress") return "in_progress";
  const days = differenceInDays(parseISO(scheduledDateISO), new Date());
  if (days < 0) return "overdue";
  if (days <= 30) return "due_soon";
  return "scheduled";
}

export function StatusPill({ tone, label }: { tone: Tone; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        toneStyles[tone],
      )}
    >
      {label ?? toneLabels[tone]}
    </span>
  );
}