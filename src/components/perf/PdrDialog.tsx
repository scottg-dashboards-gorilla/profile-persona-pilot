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

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Info, Loader2, Pencil, Plus, ShieldCheck, Trash2, Undo2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  PDR_CATEGORIES,
  GOAL_MEASURE_TYPES,
  c1Passed,
  formatGoalValue,
  goalAchievementPercent,
  type GoalMeasureType,
  type PdrCategory,
  type PdrForm,
  type PdrObjective,
} from "@/lib/pmp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Target type, starting point and target value for a measurable goal. */
function GoalTargetFields({
  measure,
  start,
  target,
  unit,
  onMeasure,
  onStart,
  onTarget,
  onUnit,
}: {
  measure: GoalMeasureType;
  start: string;
  target: string;
  unit: string;
  onMeasure: (v: GoalMeasureType) => void;
  onStart: (v: string) => void;
  onTarget: (v: string) => void;
  onUnit: (v: string) => void;
}) {
  const chosen = GOAL_MEASURE_TYPES.find((m) => m.id === measure);
  return (
    <div className="grid gap-2 rounded-md bg-muted/40 p-2">
      <div className="flex items-end gap-2 flex-wrap">
        <div className="grid gap-1">
          <Label className="text-[10px] uppercase text-muted-foreground">What are you measuring? *</Label>
          <Select value={measure} onValueChange={(v) => onMeasure(v as GoalMeasureType)}>
            <SelectTrigger className="h-9 w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_MEASURE_TYPES.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {measure !== "milestone" && (
          <>
            <div className="grid gap-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Starting point</Label>
              <Input
                className="w-[110px]"
                type="number"
                value={start}
                onChange={(e) => onStart(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Target *</Label>
              <Input
                className="w-[110px]"
                type="number"
                value={target}
                onChange={(e) => onTarget(e.target.value)}
                placeholder={measure === "percentage" ? "95" : "40"}
              />
            </div>
            {measure === "number" && (
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Unit</Label>
                <Input
                  className="w-[130px]"
                  value={unit}
                  onChange={(e) => onUnit(e.target.value)}
                  placeholder="tickets, sessions…"
                />
              </div>
            )}
          </>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">{chosen?.blurb}</p>
    </div>
  );
}

type Props = {
  formId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  canManage: boolean;
};

function CategoryPicker({
  value,
  onChange,
}: {
  value: PdrCategory;
  onChange: (v: PdrCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<PdrCategory | null>(null);
  const current = PDR_CATEGORIES.find((c) => c.id === value);
  const viewingCat = PDR_CATEGORIES.find((c) => c.id === viewing);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setViewing(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-[150px] justify-between font-normal">
          <span className="truncate">{current?.label ?? "Choose…"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {viewingCat ? (
          <div className="p-2 space-y-2">
            <p className="text-sm font-medium">{viewingCat.label}</p>
            <p className="text-xs text-muted-foreground">{viewingCat.blurb}</p>
            <div className="flex justify-end gap-1 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setViewing(null)}>
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onChange(viewingCat.id);
                  setOpen(false);
                  setViewing(null);
                }}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Use this
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {PDR_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cn(
                  "w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground",
                  c.id === value && "bg-accent/60",
                )}
                onClick={() => setViewing(c.id)}
              >
                <span className="flex items-center gap-1.5">
                  {c.label}
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                {c.id === value && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

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
  const [midyearSelf, setMidyearSelf] = useState("");
  /** Mid-year employee comment, keyed by objective id. */
  const [midObj, setMidObj] = useState<Record<string, string>>({});
  /** Mid-year manager comment, keyed by objective id. */
  const [midMgr, setMidMgr] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<PdrCategory>("faster");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<PdrCategory>("faster");
  const [editDescription, setEditDescription] = useState("");
  const [newMeasure, setNewMeasure] = useState<GoalMeasureType>("percentage");
  const [newStart, setNewStart] = useState("0");
  const [newTarget, setNewTarget] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [editMeasure, setEditMeasure] = useState<GoalMeasureType>("percentage");
  const [editStart, setEditStart] = useState("0");
  const [editTarget, setEditTarget] = useState("");
  const [editUnit, setEditUnit] = useState("");
  /** Mid-year "where are you now" figure, keyed by objective id. */
  const [midVal, setMidVal] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    const [{ data: f }, { data: objs }] = await Promise.all([
      supabase.from("pdr_forms").select("*").eq("id", formId).maybeSingle(),
      supabase.from("pdr_objectives").select("*").eq("form_id", formId).order("sort_order"),
    ]);
    const rec = (f as PdrForm) ?? null;
    setForm(rec);
    const objList = (objs ?? []) as PdrObjective[];
    setObjectives(objList);
    setMidObj(Object.fromEntries(objList.map((o) => [o.id, o.midyear_employee_comment ?? ""])));
    setMidMgr(Object.fromEntries(objList.map((o) => [o.id, o.midyear_manager_comment ?? ""])));
    setMidVal(
      Object.fromEntries(
        objList.map((o) => [o.id, o.current_value == null ? "" : String(o.current_value)]),
      ),
    );
    setSelfInput(rec?.employee_self_input ?? "");
    setManagerComments(rec?.manager_comments ?? "");
    setMidyear(rec?.midyear_manager_feedback ?? "");
    setMidyearSelf(rec?.midyear_self_input ?? "");
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
    if (!form || !newTitle.trim() || !newDescription.trim()) return;
    const isMilestone = newMeasure === "milestone";
    if (!isMilestone && !newTarget.trim()) {
      toast({
        title: "Target needed",
        description: "Choose what you're measuring and the target you're aiming for.",
        variant: "destructive",
      });
      return;
    }
    setBusy("add");
    const { error } = await supabase.from("pdr_objectives").insert({
      form_id: form.id,
      category: newCategory,
      title: newTitle.trim(),
      description: newDescription.trim(),
      sort_order: objectives.length,
      measure_type: newMeasure,
      start_value: isMilestone ? 0 : Number(newStart || 0),
      target_value: isMilestone ? 100 : Number(newTarget),
      unit: newMeasure === "number" && newUnit.trim() ? newUnit.trim() : null,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Couldn't add objective", description: error.message, variant: "destructive" });
      return;
    }
    setNewTitle("");
    setNewDescription("");
    setNewTarget("");
    setNewStart("0");
    setNewUnit("");
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

  /** Saves each objective's mid-year comment, then the overall employee input. */
  async function submitMidyearSelf() {
    if (!form) return;
    setBusy("midself");
    for (const o of objectives) {
      const comment = midObj[o.id];
      const figure = midVal[o.id];
      if (comment == null && figure == null) continue;
      const { error } = await supabase
        .from("pdr_objectives")
        .update({
          midyear_employee_comment: comment?.trim() || null,
          current_value: figure == null || figure.trim() === "" ? null : Number(figure),
        })
        .eq("id", o.id);
      if (error) {
        setBusy(null);
        toast({ title: "Didn't save", description: error.message, variant: "destructive" });
        return;
      }
    }
    setBusy(null);
    await patch(
      {
        midyear_self_input: midyearSelf || null,
        midyear_self_submitted_at: now(),
        stage: form.stage === "objectives" ? "midyear" : form.stage,
      },
      "midself",
      "Mid-year input submitted",
    );
  }

  /** Saves the manager's per-objective comments, then the overall mid-year feedback. */
  async function submitMidyearManager() {
    if (!form) return;
    setBusy("mid");
    for (const [id, comment] of Object.entries(midMgr)) {
      const { error } = await supabase
        .from("pdr_objectives")
        .update({ midyear_manager_comment: comment.trim() || null })
        .eq("id", id);
      if (error) {
        setBusy(null);
        toast({ title: "Didn't save", description: error.message, variant: "destructive" });
        return;
      }
    }
    setBusy(null);
    await patch(
      {
        midyear_manager_feedback: midyear || null,
        midyear_checkin_at: form.midyear_checkin_at ?? now(),
        midyear_manager_submitted_at: now(),
        stage: form.stage === "objectives" ? form.stage : "midyear",
      },
      "mid",
      "Mid-year feedback saved",
    );
  }



  function startEdit(o: PdrObjective) {
    setEditingId(o.id);
    setEditTitle(o.title);
    setEditCategory(o.category as PdrCategory);
    setEditDescription(o.description ?? "");
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim() || !editDescription.trim()) return;
    setBusy("edit");
    await updateObjective(editingId, {
      title: editTitle.trim(),
      category: editCategory,
      description: editDescription.trim(),
    });
    setBusy(null);
    setEditingId(null);
  }

  async function removeObjective(id: string) {
    await supabase.from("pdr_objectives").delete().eq("id", id);
    await load();
  }

  if (!formId) return null;

  const c1 = c1Passed(objectives);
  

  return (
    <Dialog open={!!formId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Objective setting (PDR){form ? ` · ${form.employee_name} · FY${form.fiscal_year}` : ""}
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
                  <div className="text-sm font-medium">1 · Objective setting (Faster / Stronger / Better / L&D)</div>
                  <p className="text-xs text-muted-foreground">
                    Employee input: draft and submit the objectives. Manager input: cascade from their own
                    PDR and validate each one maps to a category — control C1.
                  </p>
                </div>
                <Badge className={c1 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}>
                  {c1 ? "C1 passed" : "C1 pending"}
                </Badge>
              </header>

              <div className="space-y-2">
                {objectives.map((o) => (
                  <div key={o.id} className="rounded-md border p-2 space-y-2">
                    {editingId === o.id ? (
                      <div className="space-y-2">
                        <div className="flex items-end gap-2 flex-wrap">
                          <div className="grid gap-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">Category</Label>
                            <CategoryPicker value={editCategory} onChange={(v) => setEditCategory(v)} />
                          </div>
                          <div className="grid gap-1 flex-1 min-w-[200px]">
                            <Label className="text-[10px] uppercase text-muted-foreground">Objective</Label>
                            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                          </div>
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Description *</Label>
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            placeholder="How will it be measured?"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5 mr-1" /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy === "edit" || !editTitle.trim() || !editDescription.trim()}
                            onClick={saveEdit}
                          >
                            {busy === "edit" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                        {o.description && (
                          <p className="text-xs text-muted-foreground">{o.description}</p>
                        )}
                        {canManage ? (
                          <div className="grid gap-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">
                              Manager comment
                            </Label>
                            <Textarea
                              rows={2}
                              placeholder="Your input on this objective"
                              defaultValue={o.setting_manager_comment ?? ""}
                              onBlur={(e) =>
                                updateObjective(o.id, {
                                  setting_manager_comment: e.target.value.trim() || null,
                                })
                              }
                            />
                          </div>
                        ) : (
                          o.setting_manager_comment && (
                            <div className="rounded-md bg-muted/50 p-2">
                              <div className="text-[10px] uppercase text-muted-foreground">
                                Manager said
                              </div>
                              <p className="text-xs whitespace-pre-wrap">{o.setting_manager_comment}</p>
                            </div>
                          )
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          {canManage && (
                            <Button
                              size="sm"
                              variant={o.manager_validated ? "outline" : "default"}
                              onClick={() => updateObjective(o.id, { manager_validated: !o.manager_validated })}
                            >
                              {o.manager_validated ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          {!form?.objectives_submitted_at && (
                            <Button size="sm" variant="ghost" title="Edit objective" onClick={() => startEdit(o)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(canManage || (!o.manager_validated && !form?.objectives_approved_at)) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Delete objective"
                              onClick={() => removeObjective(o.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {objectives.length === 0 && (
                  <p className="text-xs text-muted-foreground">No objectives drafted yet.</p>
                )}
              </div>

              {(canManage || !form?.objectives_approved_at) ? (
                <>
                  <div className="flex items-end gap-2 flex-wrap">
                    <div className="grid gap-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Category</Label>
                        <CategoryPicker value={newCategory} onChange={(v) => setNewCategory(v)} />
                    </div>
                    <div className="grid gap-1 flex-1 min-w-[200px]">
                      <Label className="text-[10px] uppercase text-muted-foreground">Objective name *</Label>
                      <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What will they deliver?" />
                    </div>
                    <Button onClick={addObjective} disabled={busy === "add" || !newTitle.trim() || !newDescription.trim()}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Description *</Label>
                    <Textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={2}
                      placeholder="How will it be measured?"
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                  Objectives are aligned with your manager, so no new ones can be added. If something needs to change, ask your manager to send them back for revision.
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
                <span className="text-xs text-muted-foreground flex-1">
                  {form.objectives_submitted_at
                    ? `Submitted ${format(parseISO(form.objectives_submitted_at), "MMM d, yyyy")}`
                    : "Not submitted yet"}
                  {form.objectives_approved_at
                    ? ` · aligned ${format(parseISO(form.objectives_approved_at), "MMM d, yyyy")}`
                    : ""}
                </span>
                {!form?.objectives_submitted_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      busy === "sub" ||
                      objectives.length === 0 ||
                      objectives.some((o) => !o.title.trim() || !o.description?.trim())
                    }
                    title={
                      objectives.some((o) => !o.description?.trim())
                        ? "Every objective needs a name and a description first"
                        : undefined
                    }
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

            {/* Stage 2 — mid-year review */}
            <section className="rounded-md border p-3 space-y-4">
              <header className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-medium">2 · Mid-year review</div>
                  <p className="text-xs text-muted-foreground">
                    Employee gives their own mid-year update first, then the manager responds. Target Jun–Jul.
                  </p>
                </div>
                <Badge
                  className={
                    form.midyear_manager_submitted_at
                      ? "bg-emerald-100 text-emerald-800"
                      : form.midyear_self_submitted_at
                        ? "bg-amber-100 text-amber-900"
                        : "bg-muted text-muted-foreground"
                  }
                >
                  {form.midyear_manager_submitted_at
                    ? "Complete"
                    : form.midyear_self_submitted_at
                      ? "Awaiting manager"
                      : "Awaiting employee"}
                </Badge>
              </header>

              <div className="grid gap-3">
                <Label className="text-xs">
                  Employee input — progress against the objectives you signed off on
                </Label>
                {objectives.length === 0 ? (
                  <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    No objectives yet — set them in step 1 first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {objectives.map((o) => {
                      const cat = PDR_CATEGORIES.find((c) => c.id === o.category);
                      const comment = midObj[o.id] ?? o.midyear_employee_comment ?? "";
                      return (
                        <div key={o.id} className="rounded-md border p-2 space-y-2">
                          <div>
                            <div className="text-xs font-medium">{o.title}</div>
                            <div className="text-[10px] uppercase text-muted-foreground">
                              {cat?.label ?? o.category}
                            </div>
                          </div>
                          <Textarea
                            rows={2}
                            value={comment}
                            onChange={(e) =>
                              setMidObj((m) => ({ ...m, [o.id]: e.target.value }))
                            }
                            placeholder="Progress made, what's working, what's in the way…"
                          />
                          {o.midyear_manager_comment && (
                            <div className="rounded-md bg-muted/60 p-2">
                              <div className="text-[10px] uppercase text-muted-foreground">Manager said</div>
                              <p className="text-xs whitespace-pre-wrap">{o.midyear_manager_comment}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <Label className="text-xs">Overall mid-year comment</Label>
                <Textarea
                  rows={3}
                  value={midyearSelf}
                  onChange={(e) => setMidyearSelf(e.target.value)}
                  placeholder="Anything across all your objectives, and support you need."
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-1">
                    {form.midyear_self_submitted_at
                      ? `Submitted ${format(parseISO(form.midyear_self_submitted_at), "MMM d, yyyy")}`
                      : "Not submitted yet"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === "midself" || !midyearSelf.trim() || objectives.length === 0}
                    onClick={submitMidyearSelf}
                  >
                    Submit mid-year input
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 border-t pt-3">
                <Label className="text-xs">Manager input — mid-year feedback</Label>
                {!form.midyear_self_submitted_at && (
                  <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    The employee hasn't given their mid-year update yet — read it first where possible.
                  </p>
                )}
                {form.midyear_self_submitted_at && (
                  <div className="space-y-2">
                    {objectives.map((o) => {
                      const cat = PDR_CATEGORIES.find((c) => c.id === o.category);
                      return (
                        <div key={o.id} className="rounded-md border p-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium">{o.title}</div>
                            <Badge variant="secondary" className="text-[10px]">
                              {cat?.label ?? o.category}
                            </Badge>
                          </div>
                          {o.midyear_employee_comment && (
                            <div className="rounded-md bg-muted/60 p-2">
                              <div className="text-[10px] uppercase text-muted-foreground">Employee said</div>
                              <p className="text-xs whitespace-pre-wrap">{o.midyear_employee_comment}</p>
                            </div>
                          )}
                          <Textarea
                            rows={2}
                            disabled={!canManage}
                            value={midMgr[o.id] ?? o.midyear_manager_comment ?? ""}
                            onChange={(e) => setMidMgr((m) => ({ ...m, [o.id]: e.target.value }))}
                            placeholder="Your feedback on this objective (optional)…"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                {form.midyear_self_submitted_at && form.midyear_self_input && (
                  <div className="rounded-md bg-muted/60 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Employee overall comment</div>
                    <p className="text-xs whitespace-pre-wrap">{form.midyear_self_input}</p>
                  </div>
                )}
                <Textarea rows={3} disabled={!canManage} value={midyear} onChange={(e) => setMidyear(e.target.value)}
                  placeholder="Overall mid-year feedback (optional)…" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-1">
                    {form.midyear_checkin_at
                      ? `Checked in ${format(parseISO(form.midyear_checkin_at), "MMM d, yyyy")}`
                      : "Not held yet"}
                  </span>
                  {canManage && (
                    <Button size="sm" variant="outline"
                      disabled={busy === "mid" || (!midyear.trim() && !objectives.some((o) => (midMgr[o.id] ?? o.midyear_manager_comment ?? "").trim()))}
                      title="Comment on at least one objective, or leave overall feedback"
                      onClick={submitMidyearManager}>
                      Submit feedback
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {/* Stage 3 — year-end review · employee input */}
            <section className="rounded-md border p-3 space-y-3">
              <header className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-medium">3 · Year-end review — employee input</div>
                  <p className="text-xs text-muted-foreground">
                    Written by the employee. Accomplishments against the objectives and Datapath core
                    values. Due Dec 01–15.
                  </p>
                </div>
                <Badge
                  className={
                    form.self_input_submitted_at
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }
                >
                  {form.self_input_submitted_at ? "Submitted" : "Awaiting employee"}
                </Badge>
              </header>
              <div className="grid gap-2">
                <Label className="text-xs">Self-assessment for the year</Label>
                <Textarea
                  rows={5}
                  value={selfInput}
                  onChange={(e) => setSelfInput(e.target.value)}
                  placeholder="What did you deliver this year, and how did you live the core values?"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex-1">
                    {form.self_input_submitted_at
                      ? `Submitted ${format(parseISO(form.self_input_submitted_at), "MMM d, yyyy")}`
                      : "Due Dec 01 – 15"}
                  </span>
                  <Button size="sm" variant="outline" disabled={busy === "self" || !selfInput.trim()}
                    onClick={() => patch({ employee_self_input: selfInput || null, self_input_submitted_at: now(), stage: "year_end" }, "self", "Self-input submitted")}>
                    Submit self-input
                  </Button>
                </div>
              </div>
            </section>

            {/* Stage 3 — year-end review · manager input */}
            <section className="rounded-md border p-3 space-y-3">
              <header className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-medium">3 · Year-end review — manager input</div>
                  <p className="text-xs text-muted-foreground">
                    Written by the manager after reading the employee input. Comments per objective are
                    optional; the overall summary is required. Dec 02 – Jan 06.
                  </p>
                </div>
                <Badge
                  className={
                    form.comments_finalized_at
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }
                >
                  {form.comments_finalized_at ? "Submitted" : "Awaiting manager"}
                </Badge>
              </header>

              {!form.self_input_submitted_at && (
                <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  The employee hasn't submitted their input yet — read it first where possible.
                </p>
              )}

              {form.self_input_submitted_at && form.employee_self_input && (
                <div className="rounded-md bg-muted/60 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    Employee said
                  </div>
                  <p className="text-xs whitespace-pre-wrap">{form.employee_self_input}</p>
                </div>
              )}

              <div className="space-y-2">
                {objectives.map((o) => (
                  <div key={o.id} className="grid gap-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">
                      {PDR_CATEGORIES.find((c) => c.id === o.category)?.label ?? o.category} · {o.title}
                    </Label>
                    <Textarea
                      rows={2}
                      className="text-xs"
                      disabled={!canManage}
                      placeholder="Manager comments on this objective (optional)"
                      defaultValue={o.manager_comment ?? ""}
                      onBlur={(e) => updateObjective(o.id, { manager_comment: e.target.value || null })}
                    />
                  </div>
                ))}
                {objectives.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add objectives above to comment on them.</p>
                )}
              </div>

              <div className="grid gap-2 border-t pt-3">
                <Label className="text-xs">
                  Feedback summary for overall performance (optional)
                </Label>
                <Textarea
                  rows={4}
                  disabled={!canManage}
                  placeholder="Anything across all objectives — per-objective comments above are usually enough"
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground flex-1">
                    {form.comments_finalized_at
                      ? `Finalized ${format(parseISO(form.comments_finalized_at), "MMM d, yyyy")}`
                      : "The year-end score now sits on the employee's own review page, tied to their anniversary."}
                  </span>
                  {canManage && (
                    <Button size="sm" variant="outline"
                      disabled={busy === "cmt" || (!managerComments.trim() && !objectives.some((o) => (o.manager_comment ?? "").trim()))}
                      title="Comment on at least one objective, or write a summary"
                      onClick={() => patch({ manager_comments: managerComments || null, comments_finalized_at: now() }, "cmt", "Comments finalized")}>
                      Submit comments
                    </Button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PdrDialog;
