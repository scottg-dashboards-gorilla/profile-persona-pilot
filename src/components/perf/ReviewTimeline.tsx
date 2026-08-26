import { format, parseISO } from "date-fns";
import { Check, Circle, Clock, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TimelineStageKey =
  | "kickoff"
  | "self"
  | "360"
  | "completion"
  | "comp"
  | "release"
  | "ack";

export type TimelineStage = {
  key: TimelineStageKey;
  label: string;
  short: string;
  /** ISO timestamp/date when this stage completed, if it has */
  at?: string | null;
  /** true when the stage does not apply to this review (e.g. no 360, no pay change) */
  na?: boolean;
  /** extra context shown in the tooltip */
  note?: string;
};

export type ReviewStageInput = {
  kickoff_at?: string | null;
  status: string;
  scheduled_date: string;
  completed_date?: string | null;
  comp_adjustment_amount?: number | null;
  comp_approval_status?: string | null;
  comp_approved_at?: string | null;
  released_at?: string | null;
  employee_ack_at?: string | null;
  selfSubmittedAt?: string | null;
  contributorsTotal?: number;
  contributorsSubmitted?: number;
  contributorsLastAt?: string | null;
};

function fmt(value?: string | null) {
  if (!value) return null;
  try {
    const d = parseISO(value);
    return format(d, value.length <= 10 ? "MMM d, yyyy" : "MMM d, yyyy · h:mma");
  } catch {
    return value;
  }
}

export function buildReviewStages(r: ReviewStageInput): TimelineStage[] {
  const total = r.contributorsTotal ?? 0;
  const submitted = r.contributorsSubmitted ?? 0;
  const compProposed = (r.comp_adjustment_amount ?? 0) !== 0;

  return [
    {
      key: "kickoff",
      label: "Kickoff",
      short: "1",
      at: r.kickoff_at ?? (r.status !== "scheduled" ? r.completed_date ?? null : null),
      note: r.status === "scheduled" ? "Not started yet" : undefined,
    },
    {
      key: "self",
      label: "Self-assessment",
      short: "2",
      at: r.selfSubmittedAt ?? null,
      note: r.selfSubmittedAt ? undefined : "Waiting on the employee",
    },
    {
      key: "360",
      label: "360 feedback",
      short: "3",
      at: total > 0 && submitted === total ? r.contributorsLastAt ?? null : null,
      na: total === 0,
      note:
        total === 0
          ? "No contributors added"
          : `${submitted} of ${total} submitted`,
    },
    {
      key: "completion",
      label: "Completion",
      short: "4",
      at: r.completed_date ?? null,
      note: r.completed_date ? undefined : "Manager still to complete",
    },
    {
      key: "comp",
      label: "Pay approval",
      short: "5",
      at: compProposed ? r.comp_approved_at ?? null : null,
      na: !compProposed,
      note: !compProposed
        ? "No pay change proposed"
        : r.comp_approval_status === "rejected"
          ? "Sent back to the manager"
          : r.comp_approved_at
            ? undefined
            : "Waiting on HR sign-off",
    },
    {
      key: "release",
      label: "Shared with employee",
      short: "6",
      at: r.released_at ?? null,
      note: r.released_at ? undefined : "Outcome not shared yet",
    },
    {
      key: "ack",
      label: "Acknowledged",
      short: "7",
      at: r.employee_ack_at ?? null,
      note: r.employee_ack_at ? undefined : "Employee still to confirm",
    },
  ];
}

type Props = {
  stages: TimelineStage[];
  /** when true, renders bigger dots with labels underneath */
  variant?: "compact" | "full";
  className?: string;
};

export function ReviewTimeline({ stages, variant = "compact", className }: Props) {
  const firstOpen = stages.findIndex((s) => !s.at && !s.na);

  return (
    <div className={cn("flex items-center", variant === "compact" ? "gap-0" : "gap-0", className)}>
      {stages.map((s, i) => {
        const done = !!s.at;
        const current = i === firstOpen;
        const state = done ? "done" : s.na ? "na" : current ? "current" : "todo";
        const stamp = fmt(s.at);
        return (
          <div key={s.key} className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border transition-colors",
                    variant === "compact" ? "h-5 w-5" : "h-7 w-7",
                    state === "done" && "bg-emerald-100 border-emerald-300 text-emerald-700",
                    state === "current" && "bg-amber-100 border-amber-300 text-amber-700",
                    state === "todo" && "bg-muted border-border text-muted-foreground",
                    state === "na" && "bg-transparent border-dashed border-border text-muted-foreground/60",
                  )}
                  aria-label={`${s.label}${stamp ? `: ${stamp}` : ""}`}
                >
                  {state === "done" ? (
                    <Check className={variant === "compact" ? "h-3 w-3" : "h-4 w-4"} />
                  ) : state === "current" ? (
                    <Clock className={variant === "compact" ? "h-3 w-3" : "h-4 w-4"} />
                  ) : state === "na" ? (
                    <Minus className={variant === "compact" ? "h-3 w-3" : "h-4 w-4"} />
                  ) : (
                    <Circle className={variant === "compact" ? "h-2 w-2" : "h-2.5 w-2.5"} />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-medium">
                  {i + 1}. {s.label}
                </div>
                <div className="text-muted-foreground">
                  {stamp
                    ? stamp
                    : s.na
                      ? s.note ?? "Not applicable"
                      : s.note ?? "Pending"}
                </div>
                {stamp && s.note && <div className="text-muted-foreground">{s.note}</div>}
              </TooltipContent>
            </Tooltip>
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "h-px",
                  variant === "compact" ? "w-3" : "w-6",
                  done ? "bg-emerald-300" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
