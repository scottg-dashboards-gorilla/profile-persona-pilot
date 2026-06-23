import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

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
  follow_up_review_id: string | null;
  created_at: string;
};

type Props = {
  employeeUuid: string;
  reviewId?: string | null;
  attemptId?: string | null;
  /** When set, the inline form is pre-filled with this delta context. */
  presetContext?: DeltaContext | null;
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

export function ActionItemsPanel({
  employeeUuid,
  reviewId,
  attemptId,
  presetContext,
  title = "Action items",
  className,
}: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [action, setAction] = useState("");
  const [kind, setKind] = useState<DeltaContext["kind"]>(presetContext?.kind ?? "general");
  const [key, setKey] = useState<string>(presetContext?.key ?? "");

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

  async function addItem() {
    if (!comment.trim() && !action.trim()) {
      toast({ title: "Add a comment or action", variant: "destructive" });
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
      delta_from: presetContext?.from ?? null,
      delta_to: presetContext?.to ?? null,
      comment: comment.trim() || null,
      action: action.trim() || null,
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    setComment("");
    setAction("");
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

      <div className="space-y-2 border rounded-md p-2 bg-muted/30">
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
              {kind === "disc" ? "Letter (D/I/S/C)" : kind === "technical" ? "Competency id" : "Detail"}
            </label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={kind === "disc" ? "D" : kind === "technical" ? "e.g. troubleshooting" : "optional"}
              className="h-8 text-xs"
            />
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
          placeholder="Action: what to do, by when, who owns it…"
          className="text-sm"
        />
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
                {it.delta_key && <Badge variant="secondary">{it.delta_key}</Badge>}
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