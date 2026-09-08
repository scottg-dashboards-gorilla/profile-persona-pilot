import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Plus, ShieldCheck, Trash2, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  PDR_CATEGORIES,
  c1Passed,
  derivedPdrScore,
  type PdrCategory,
  type PdrForm,
  type PdrObjective,
} from "@/lib/pmp";
import { cn } from "@/lib/utils";

type Props = {
  formId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  canManage: boolean;
};

const now = () => new Date().toISOString();

export function PdrDialog({ formId, onOpenChange, onChanged, canManage }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<PdrForm | null>(null);
  const [objectives, setObjectives] = useState<PdrObjective[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [selfInput, setSelfInput] = useState("");
  const [managerComments, setManagerComments] = useState("");
  const [midyear, setMidyear] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<PdrCategory>("faster");

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    const [{ data: f }, { data: objs }] = await Promise.all([
      supabase.from("pdr_forms").select("*").eq("id", formId).maybeSingle(),
      supabase.from("pdr_objectives").select("*").eq("form_id", formId).order("sort_order"),
    ]);
    const rec = (f as PdrForm) ?? null;
    setForm(rec);
    setObjectives((objs ?? []) as PdrObjective[]);
    setSelfInput(rec?.employee_self_input ?? "");
    setManagerComments(rec?.manager_comments ?? "");
    setMidyear(rec?.midyear_manager_feedback ?? "");
    setLoading(false);
  }, [formId]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>, key: string, okMsg: string) {
    if (!form) return;
    setBusy(key);
    const { error } = await supabase.from("pdr_forms").update(body).eq("id", form.id);
    setBusy(null);
    if (error) {
      toast({ title: "Didn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: okMsg });
    await load();
    onChanged();
  }

  async function addObjective() {
    if (!form || !newTitle.trim()) return;
    setBusy("add");
    const { error } = await supabase.from("pdr_objectives").insert({
      form_id: form.id,
      category: newCategory,
      title: newTitle.trim(),
      sort_order: objectives.length,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Couldn't add objective", description: error.message, variant: "destructive" });
      return;
    }
    setNewTitle("");
    await load();
  }

  async function updateObjective(id: string, body: Record<string, unknown>) {
    const { error } = await supabase.from("pdr_objectives").update(body).eq("id", id);
    if (error) {
      toast({ title: "Didn't save", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  }

  async function removeObjective(id: string) {
    await supabase.from("pdr_objectives").delete().eq("id", id);
    await load();
  }

  if (!formId) return null;

  const c1 = c1Passed(objectives);
  const suggested = derivedPdrScore(objectives);

  return (
    <Dialog open={!!formId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Development review (PDR){form ? ` · ${form.employee_name} · FY${form.fiscal_year}` : ""}
          </DialogTitle>
          <DialogDescription>
            Objectives in Jan–Feb, mid-year check-in around Jun–Jul, year-end input in Dec–Jan.
          </DialogDescription>
        </DialogHeader>

        {loading && !form && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </div>
        )}

        {form && (
          <div className="space-y-5">
            {/* Stage 1 — objectives */}
            <section className="rounded-md border p-3 space-y-3">
              <header className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-medium">1 · Objectives (Faster / Stronger / Better / TPW)</div>
                  <p className="text-xs text-muted-foreground">
                    Employee drafts; manager cascades from their own PDR and validates each one maps to a
                    category — control C1.
                  </p>
                </div>
                <Badge className={c1 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}>
                  {c1 ? "C1 passed" : "C1 pending"}
                </Badge>
              </header>

              <div className="space-y-2">
                {objectives.map((o) => (
                  <div key={o.id} className="rounded-md border p-2 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {PDR_CATEGORIES.find((c) => c.id === o.category)?.label ?? o.category}
                      </Badge>
                      <span className="text-sm font-medium flex-1 min-w-[180px]">{o.title}</span>
                      {o.cascaded_from_manager && (
                        <Badge variant="secondary" className="text-[10px]">Cascaded</Badge>
                      )}
                      <Badge
                        className={cn(
                          "text-[10px]",
                          o.manager_validated ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {o.manager_validated ? "Aligned" : "Not aligned"}
                      </Badge>
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                      <div className="grid gap-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Weight %</Label>
                        <Input
                          className="h-8 w-20"
                          type="number"
                          defaultValue={o.weight}
                          onBlur={(e) => updateObjective(o.id, { weight: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Progress %</Label>
                        <Input
                          className="h-8 w-24"
                          type="number"
                          defaultValue={o.progress_percent}
                          onBlur={(e) => updateObjective(o.id, { progress_percent: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <Progress value={Math.min(100, o.progress_percent)} className="h-2" />
                      </div>
                      {canManage && (
                        <Button
                          size="sm"
                          variant={o.manager_validated ? "outline" : "default"}
                          onClick={() => updateObjective(o.id, { manager_validated: !o.manager_validated })}
                        >
                          {o.manager_validated ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => removeObjective(o.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {canManage && (
                      <div className="grid gap-1 border-t pt-2">
                        <Label className="text-[10px] uppercase text-muted-foreground">
                          Manager year-end comments · {PDR_CATEGORIES.find((c) => c.id === o.category)?.label ?? o.category} (optional)
                        </Label>
                        <Textarea
                          rows={2}
                          className="text-xs"
                          placeholder="Enter manager year-end comments here"
                          defaultValue={o.manager_comment ?? ""}
                          onBlur={(e) => updateObjective(o.id, { manager_comment: e.target.value || null })}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {objectives.length === 0 && (
                  <p className="text-xs text-muted-foreground">No objectives drafted yet.</p>
                )}
              </div>

              <div className="flex items-end gap-2 flex-wrap">
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Category</Label>
                  <Select value={newCategory} onValueChange={(v) => setNewCategory(v as PdrCategory)}>
                    <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PDR_CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1 flex-1 min-w-[200px]">
                  <Label className="text-[10px] uppercase text-muted-foreground">New objective</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What will they deliver?" />
                </div>
                <Button onClick={addObjective} disabled={busy === "add" || !newTitle.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
                <span className="text-xs text-muted-foreground flex-1">
                  {form.objectives_submitted_at
                    ? `Submitted ${format(parseISO(form.objectives_submitted_at), "MMM d, yyyy")}`
                    : "Not submitted yet"}
                  {form.objectives_approved_at
                    ? ` · aligned ${format(parseISO(form.objectives_approved_at), "MMM d, yyyy")}`
                    : ""}
                </span>
                {!form.objectives_submitted_at && (
                  <Button size="sm" variant="outline" disabled={busy === "sub" || objectives.length === 0}
                    onClick={() => patch({ objectives_submitted_at: now() }, "sub", "Objectives submitted")}>
                    Submit objectives
                  </Button>
                )}
                {canManage && form.objectives_submitted_at && !form.objectives_approved_at && (
                  <>
                    <Button size="sm" variant="outline" disabled={busy === "rev"}
                      onClick={() => patch({ objectives_submitted_at: null, objectives_revision_note: "Sent back for revision" }, "rev", "Sent back to revise")}>
                      Send back
                    </Button>
                    <Button size="sm" disabled={busy === "appr" || !c1}
                      title={c1 ? undefined : "Validate every objective first (C1)"}
                      onClick={() => patch({ objectives_approved_at: now(), stage: "midyear" }, "appr", "Objectives aligned")}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Mark aligned
                    </Button>
                  </>
                )}
              </div>
            </section>

            {/* Stage 2 — mid-year */}
            <section className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-medium">2 · Mid-year check-in</div>
              <p className="text-xs text-muted-foreground">
                Manager gives feedback and the employee charts progress. Target Jun–Jul.
              </p>
              <Textarea rows={3} value={midyear} onChange={(e) => setMidyear(e.target.value)}
                placeholder="Mid-year feedback…" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex-1">
                  {form.midyear_checkin_at
                    ? `Checked in ${format(parseISO(form.midyear_checkin_at), "MMM d, yyyy")}`
                    : "Not held yet"}
                </span>
                <Button size="sm" variant="outline" disabled={busy === "mid"}
                  onClick={() => patch({ midyear_manager_feedback: midyear || null, midyear_checkin_at: form.midyear_checkin_at ?? now(), stage: form.stage === "objectives" ? form.stage : "midyear" }, "mid", "Mid-year saved")}>
                  Save check-in
                </Button>
              </div>
            </section>

            {/* Stage 3 — year-end */}
            <section className="rounded-md border p-3 space-y-3">
              <div className="text-sm font-medium">3 · Year-end input and manager comments</div>
              <div className="grid gap-2">
                <Label className="text-xs">Employee self-input — accomplishments against core values</Label>
                <Textarea rows={4} value={selfInput} onChange={(e) => setSelfInput(e.target.value)} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-1">
                    {form.self_input_submitted_at
                      ? `Submitted ${format(parseISO(form.self_input_submitted_at), "MMM d, yyyy")}`
                      : "Due Dec – Jan"}
                  </span>
                  <Button size="sm" variant="outline" disabled={busy === "self"}
                    onClick={() => patch({ employee_self_input: selfInput || null, self_input_submitted_at: now(), stage: "year_end" }, "self", "Self-input submitted")}>
                    Submit self-input
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 border-t pt-3">
                <Label className="text-xs">Manager comments in the PDR form</Label>
                <Textarea rows={4} value={managerComments} onChange={(e) => setManagerComments(e.target.value)} />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground flex-1">
                    {form.comments_finalized_at
                      ? `Finalized ${format(parseISO(form.comments_finalized_at), "MMM d, yyyy")}`
                      : "Control C2 — HR cross-checks the score before year-end close-out"}
                  </span>
                  {canManage && (
                    <Button size="sm" variant="outline" disabled={busy === "cmt"}
                      onClick={() => patch({ manager_comments: managerComments || null, comments_finalized_at: now() }, "cmt", "Comments finalized")}>
                      Finalize comments
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {/* Stage 4 — score */}
            <section className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-medium">4 · Year-end PDR score</div>
              <p className="text-xs text-muted-foreground">
                Suggested from weighted objective progress: <strong>{suggested ?? "—"}</strong> / 5. HR
                cross-checks before the year is closed.
              </p>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Score (1–5)</Label>
                  <Input
                    className="h-9 w-24"
                    type="number"
                    step="0.1"
                    min={1}
                    max={5}
                    defaultValue={form.year_end_score ?? suggested ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      if (v !== form.year_end_score) patch({ year_end_score: v }, "score", "Score saved");
                    }}
                  />
                </div>
                <Button size="sm" disabled={busy === "close" || form.year_end_score == null || !form.comments_finalized_at}
                  title={!form.comments_finalized_at ? "Manager comments must be finalized first" : undefined}
                  onClick={() => patch({ score_recorded_at: now(), stage: "closed" }, "close", "Year closed")}>
                  Record & close year
                </Button>
                {form.score_recorded_at && (
                  <span className="text-xs text-emerald-700">
                    Recorded {format(parseISO(form.score_recorded_at), "MMM d, yyyy")} — feeds the pay review
                  </span>
                )}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PdrDialog;
