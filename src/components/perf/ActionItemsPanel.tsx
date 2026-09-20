import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { dimensions } from "@/data/dimensions";
import { flagReasonLabel, type FlaggedArea } from "@/lib/assessmentDeltas";

export type DeltaContext = {
  kind: "disc" | "technical" | "tier" | "general";
  key?: string | null;
  from?: number | null;
  to?: number | null;
  label?: string;
};

type Row = {
  id: string;
  review_id: string | null;
  attempt_id: string | null;
  employee_uuid: string;
  delta_kind: string;
  delta_key: string | null;
  delta_from: number | null;
  delta_to: number | null;
  comment: string | null;
  action: string | null;
  status: string;
  due_date: string | null;
  target_value: number | null;
  is_required: boolean | null;
  follow_up_review_id: string | null;
  created_at: string;
};

type Props = {
  employeeUuid: string;
  reviewId?: string | null;
  attemptId?: string | null;
  /** When set, the inline form is pre-filled with this delta context. */
  presetContext?: DeltaContext | null;
  /** Areas the assessment flagged as underperforming — each needs an action with a due date. */
  requiredAreas?: FlaggedArea[];
  /** Reports which flagged areas still have no action on file. */
  onCoverageChange?: (uncovered: FlaggedArea[]) => void;
  title?: string;
  className?: string;
};

const KIND_LABEL: Record<string, string> = {
  disc: "DISC",
  technical: "Competency",
  tier: "Tier",
  general: "General",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
};

export function competencyLabel(id: string | null | undefined) {
  if (!id) return "—";
  return dimensions.find((d) => d.id === id)?.name ?? id;
}

export function ActionItemsPanel({
  employeeUuid,
  reviewId,
  attemptId,
  presetContext,
  requiredAreas,
  onCoverageChange,
  title = "Action items",
  className,
}: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [action, setAction] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [kind, setKind] = useState<DeltaContext["kind"]>(presetContext?.kind ?? "general");
  const [key, setKey] = useState<string>(presetContext?.key ?? "");
  const [activeArea, setActiveArea] = useState<FlaggedArea | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assessment_action_items")
      .select("*")
      .eq("employee_uuid", employeeUuid)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Couldn't load action items", description: error.message, variant: "destructive" });
    else setItems((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    if (employeeUuid) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeUuid]);

  useEffect(() => {
    if (presetContext) {
      setKind(presetContext.kind);
      setKey(presetContext.key ?? "");
    }
  }, [presetContext]);

  /** A flagged area counts as covered once it has an action with a due date on file. */
  const uncovered = useMemo(() => {
    if (!requiredAreas?.length) return [];
    return requiredAreas.filter(
      (a) =>
        !items.some(
          (it) =>
            it.delta_kind === a.kind &&
            (a.kind === "tier" || it.delta_key === a.key) &&
            !!it.action?.trim() &&
            !!it.due_date,
        ),
    );
  }, [requiredAreas, items]);

  useEffect(() => {
    onCoverageChange?.(uncovered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uncovered]);

  function pickArea(a: FlaggedArea) {
    setActiveArea(a);
    setKind(a.kind);
    setKey(a.key ?? "");
    if (a.kind === "technical") {
      setComment(
        `Assessment flagged ${competencyLabel(a.key)}: ${flagReasonLabel(a).toLowerCase()}.`,
      );
    }
  }

  async function addItem() {
    const required = !!activeArea;
    if (!comment.trim() && !action.trim()) {
      toast({ title: "Add a comment or action", variant: "destructive" });
      return;
    }
    if (required && (!action.trim() || !dueDate)) {
      toast({
        title: "Improvement plan incomplete",
        description: "A flagged area needs both an action and a date it should be achieved by.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("assessment_action_items").insert({
      employee_uuid: employeeUuid,
      review_id: reviewId ?? null,
      attempt_id: attemptId ?? null,
      delta_kind: kind,
      delta_key: key || null,
      delta_from: activeArea?.from ?? presetContext?.from ?? null,
      delta_to: activeArea?.to ?? presetContext?.to ?? null,
      comment: comment.trim() || null,
      action: action.trim() || null,
      due_date: dueDate || null,
      target_value: targetValue === "" ? null : Number(targetValue),
      is_required: required,
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    setComment("");
    setAction("");
    setDueDate("");
    setTargetValue("");
    setActiveArea(null);
    load();
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("assessment_action_items").update({ status }).eq("id", id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    load();
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from("assessment_action_items").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  }

  return (
    <div className={"rounded-md border bg-card p-3 text-sm space-y-3 " + (className ?? "")}>
      <div className="flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <span className="text-xs text-muted-foreground">{items.length} on file</span>
      </div>

      {!!requiredAreas?.length && (
        <div
          className={
            "rounded-md border p-2.5 space-y-2 " +
            (uncovered.length > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50")
          }
        >
          <div className="flex items-start gap-2">
            {uncovered.length > 0 ? (
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            )}
            <div className="text-xs">
              <div className="font-medium">
                {uncovered.length > 0
                  ? `${uncovered.length} of ${requiredAreas.length} flagged areas still need an improvement action`
                  : "Every flagged area has an improvement action with a date"}
              </div>
              <div className="text-muted-foreground">
                The assessment flagged these as weak or slipping. Each one needs an action and a date it
                should be achieved by before the review can be completed.
              </div>
            </div>
          </div>
          <div className="space-y-1">
            {requiredAreas.map((a) => {
              const open = uncovered.some((u) => u.matchKey === a.matchKey);
              return (
                <div key={a.matchKey} className="flex items-center gap-2 text-xs">
                  {open ? (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  )}
                  <span className="truncate font-medium">
                    {a.kind === "tier" ? "Tier level" : competencyLabel(a.key)}
                  </span>
                  <span className="text-muted-foreground truncate">{flagReasonLabel(a)}</span>
                  {open && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px] ml-auto"
                      onClick={() => pickArea(a)}
                    >
                      Set action
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2 border rounded-md p-2 bg-muted/30">
        {activeArea && (
          <div className="flex items-center gap-2 text-xs text-amber-800">
            <AlertCircle className="h-3.5 w-3.5" />
            Required action for{" "}
            <span className="font-medium">
              {activeArea.kind === "tier" ? "Tier level" : competencyLabel(activeArea.key)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px] ml-auto"
              onClick={() => setActiveArea(null)}
            >
              Clear
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tied to</label>
            <Select value={kind} onValueChange={(v) => setKind(v as DeltaContext["kind"])}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="disc">DISC letter</SelectItem>
                <SelectItem value="technical">Competency</SelectItem>
                <SelectItem value="tier">Tier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {kind === "disc" ? "Letter (D/I/S/C)" : kind === "technical" ? "Competency" : "Detail"}
            </label>
            {kind === "technical" ? (
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Pick a competency" />
                </SelectTrigger>
                <SelectContent>
                  {dimensions
                    .filter((d) => d.category === "competency" || d.category === "comptia")
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={kind === "disc" ? "D" : "optional"}
                className="h-8 text-xs"
              />
            )}
          </div>
        </div>
        <Textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Observation, context, why this matters…"
          className="text-sm"
        />
        <Textarea
          rows={2}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Action: what to do, who owns it…"
          className="text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Achieve by {activeArea ? "(required)" : ""}
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Target score (optional)
            </label>
            <Input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="e.g. 70"
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={addItem} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Add
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground">No action items yet.</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-auto pr-1">
          {items.map((it) => (
            <div key={it.id} className="rounded-md border p-2 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{KIND_LABEL[it.delta_kind] ?? it.delta_kind}</Badge>
                {it.delta_key && (
                  <Badge variant="secondary">
                    {it.delta_kind === "technical" ? competencyLabel(it.delta_key) : it.delta_key}
                  </Badge>
                )}
                {it.is_required && (
                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Required</Badge>
                )}
                {it.delta_from != null && it.delta_to != null && (
                  <span className="text-muted-foreground">
                    {it.delta_from} → {it.delta_to}
                  </span>
                )}
                <span className="text-muted-foreground ml-auto">
                  {format(parseISO(it.created_at), "MMM d")}
                </span>
              </div>
              {it.comment && <div className="text-sm">{it.comment}</div>}
              {it.action && (
                <div className="text-sm border-l-2 border-primary pl-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Action:</span> {it.action}
                </div>
              )}
              {(it.due_date || it.target_value != null) && (
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {it.due_date && <span>By {format(parseISO(it.due_date), "MMM d, yyyy")}</span>}
                  {it.target_value != null && <span>Target {it.target_value}</span>}
                </div>
              )}
              <div className="flex items-center justify-between">
                <Select value={it.status} onValueChange={(v) => setStatus(it.id, v)}>
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(it.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
