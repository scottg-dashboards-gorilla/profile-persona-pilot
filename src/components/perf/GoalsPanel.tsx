import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";
import {
  PDR_CATEGORIES,
  formatGoalValue,
  goalAchievementPercent,
  goalKindLabel,
  goalWindowStatus,
  goalsSummary,
  type PdrObjective,
} from "@/lib/pmp";
import { cn } from "@/lib/utils";

const catLabel = (id: string) => PDR_CATEGORIES.find((c) => c.id === id)?.label ?? id;

/** One-line read of how a set of goals is going — used in headers and grids. */
export function GoalsSummaryLine({ objectives }: { objectives: PdrObjective[] }) {
  const s = goalsSummary(objectives);
  if (s.total === 0) return <span className="text-xs text-muted-foreground">No goals set</span>;
  return (
    <span className="text-xs text-muted-foreground">
      {s.total} goal{s.total === 1 ? "" : "s"}
      {s.average != null && (
        <>
          {" · "}
          <span className="font-medium text-foreground">{s.average}% avg progress</span>
        </>
      )}
      {" · "}
      {s.achieved} achieved
    </span>
  );
}

/** A single goal card: what it is, its window, its target and where it stands. */
export function GoalRow({ o, showManagerComments = true }: { o: PdrObjective; showManagerComments?: boolean }) {
  const achieved = goalAchievementPercent(o);
  const status = goalWindowStatus(o);
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] uppercase">{catLabel(o.category)}</Badge>
        <Badge variant="outline" className="text-[10px]">{goalKindLabel(o.goal_kind)}</Badge>
        <span className="text-sm font-medium flex-1 min-w-[160px]">{o.title}</span>
        <Badge className={cn("text-[10px]", status.tone)}>{status.label}</Badge>
        {o.cascaded_from_manager && (
          <Badge variant="secondary" className="text-[10px]">Set by your manager</Badge>
        )}
      </div>
      {o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
        <span>
          {o.start_date ? format(parseISO(o.start_date), "MMM d, yyyy") : "No start date"} →{" "}
          {o.end_date ? format(parseISO(o.end_date), "MMM d, yyyy") : "no end date"}
        </span>
        {o.target_value != null && (
          <span>
            · target {formatGoalValue(o.target_value, o.measure_type, o.unit)}
            {o.current_value != null && (
              <> · now {formatGoalValue(o.current_value, o.measure_type, o.unit)}</>
            )}
          </span>
        )}
      </div>
      {achieved != null ? (
        <div className="flex items-center gap-2">
          <Progress value={Math.min(100, achieved)} className="h-2" />
          <span className="text-xs font-medium w-12 text-right">{achieved}%</span>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">No progress recorded yet.</p>
      )}
      {showManagerComments && (o.setting_manager_comment || o.midyear_manager_comment) && (
        <div className="rounded-md bg-muted/50 p-2 space-y-1">
          <div className="text-[10px] uppercase text-muted-foreground">Your manager said</div>
          {o.setting_manager_comment && (
            <p className="text-xs whitespace-pre-wrap">{o.setting_manager_comment}</p>
          )}
          {o.midyear_manager_comment && (
            <p className="text-xs whitespace-pre-wrap">
              <span className="text-muted-foreground">Mid-year: </span>
              {o.midyear_manager_comment}
            </p>
          )}
        </div>
      )}
      {o.midyear_employee_comment && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
          <span className="uppercase text-[10px]">Your mid-year note: </span>
          {o.midyear_employee_comment}
        </p>
      )}
    </div>
  );
}

/** The full list of goals for one person. */
export function GoalsPanel({
  objectives,
  emptyText = "No goals on file yet.",
}: {
  objectives: PdrObjective[];
  emptyText?: string;
}) {
  if (objectives.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {objectives.map((o) => (
        <GoalRow key={o.id} o={o} />
      ))}
    </div>
  );
}
