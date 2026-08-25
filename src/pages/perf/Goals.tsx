import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Loader2, Plus, Target, Trash2, Check, X } from "lucide-react";

type Goal = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  category: string;
};

type KeyResult = {
  id: string;
  goal_id: string;
  title: string;
  metric_type: string;
  starting_value: number;
  target_value: number;
  current_value: number;
  unit: string | null;
  sort_order: number;
};

type Employee = { uuid: string; first_name: string; last_name: string; department: string | null };

const CATEGORIES = ["performance", "development", "behavioral", "business"];
const STATUSES = ["not_started", "on_track", "at_risk", "achieved", "missed"];

const statusLabel: Record<string, string> = {
  not_started: "Not started",
  on_track: "On track",
  at_risk: "At risk",
  achieved: "Achieved",
  missed: "Missed",
};

const statusTone: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-700 border-slate-200",
  on_track: "bg-emerald-100 text-emerald-800 border-emerald-200",
  at_risk: "bg-amber-100 text-amber-900 border-amber-200",
  achieved: "bg-indigo-100 text-indigo-800 border-indigo-200",
  missed: "bg-red-100 text-red-800 border-red-200",
};

/** Progress of a key result as a 0–100 percentage of the start → target span. */
export function krProgress(kr: Pick<KeyResult, "starting_value" | "target_value" | "current_value">) {
  const span = kr.target_value - kr.starting_value;
  if (span === 0) return kr.current_value >= kr.target_value ? 100 : 0;
  const pct = ((kr.current_value - kr.starting_value) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export default function Goals() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [krs, setKrs] = useState<KeyResult[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "achieved" | "all">("open");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingKr, setEditingKr] = useState<string | null>(null);
  const [krDraft, setKrDraft] = useState<string>("");

  // create form
  const [empUuid, setEmpUuid] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("performance");
  const [targetDate, setTargetDate] = useState("");
  const [krRows, setKrRows] = useState([{ title: "", starting_value: 0, target_value: 100, unit: "%" }]);

  async function load() {
    setLoading(true);
    const [{ data: g }, { data: emps }] = await Promise.all([
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("uuid,first_name,last_name,department")
        .eq("terminated", false)
        .order("first_name"),
    ]);
    setGoals((g ?? []) as Goal[]);
    setEmployees((emps ?? []) as Employee[]);
    const ids = (g ?? []).map((x: any) => x.id);
    if (ids.length > 0) {
      const { data: k } = await supabase
        .from("goal_key_results")
        .select("*")
        .in("goal_id", ids)
        .order("sort_order");
      setKrs((k ?? []) as KeyResult[]);
    } else {
      setKrs([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    if (tab === "all") return goals;
    if (tab === "achieved") return goals.filter((g) => g.status === "achieved" || g.status === "missed");
    return goals.filter((g) => g.status !== "achieved" && g.status !== "missed");
  }, [goals, tab]);

  const summary = useMemo(() => {
    const total = goals.length;
    const achieved = goals.filter((g) => g.status === "achieved").length;
    const atRisk = goals.filter((g) => g.status === "at_risk").length;
    return { total, achieved, atRisk };
  }, [goals]);

  function goalProgress(goalId: string) {
    const rows = krs.filter((k) => k.goal_id === goalId);
    if (rows.length === 0) return null;
    return Math.round(rows.reduce((s, k) => s + krProgress(k), 0) / rows.length);
  }

  async function createGoal() {
    const emp = employees.find((e) => e.uuid === empUuid);
    if (!emp || !title.trim()) return;
    setBusy(true);
    let goalId: string | null = null;
    try {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          employee_uuid: emp.uuid,
          employee_name: `${emp.first_name} ${emp.last_name}`.trim(),
          title: title.trim(),
          description: description.trim() || null,
          category,
          status: "not_started",
          target_date: targetDate || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      goalId = data!.id as string;

      const rows = krRows
        .filter((k) => k.title.trim())
        .map((k, i) => ({
          goal_id: goalId,
          title: k.title.trim(),
          metric_type: "number",
          starting_value: Number(k.starting_value) || 0,
          target_value: Number(k.target_value) || 0,
          current_value: Number(k.starting_value) || 0,
          unit: k.unit || null,
          sort_order: i,
        }));
      if (rows.length > 0) {
        const { error: krErr } = await supabase.from("goal_key_results").insert(rows);
        if (krErr) throw krErr;
      }

      toast({ title: "Goal created", description: title.trim() });
      setOpen(false);
      setTitle("");
      setDescription("");
      setTargetDate("");
      setKrRows([{ title: "", starting_value: 0, target_value: 100, unit: "%" }]);
      await load();
    } catch (e: any) {
      if (goalId) {
        await supabase.from("goal_key_results").delete().eq("goal_id", goalId);
        await supabase.from("goals").delete().eq("id", goalId);
      }
      toast({ title: "Couldn't create goal", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function updateGoalStatus(g: Goal, next: string) {
    const { error } = await supabase.from("goals").update({ status: next }).eq("id", g.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, status: next } : x)));
  }

  async function saveKr(kr: KeyResult) {
    const value = Number(krDraft);
    if (Number.isNaN(value)) {
      setEditingKr(null);
      return;
    }
    const { error } = await supabase
      .from("goal_key_results")
      .update({ current_value: value })
      .eq("id", kr.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setKrs((prev) => prev.map((k) => (k.id === kr.id ? { ...k, current_value: value } : k)));
    setEditingKr(null);
  }

  async function deleteGoal(g: Goal) {
    await supabase.from("goal_key_results").delete().eq("goal_id", g.id);
    const { error } = await supabase.from("goals").delete().eq("id", g.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Goal deleted" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total goals", value: summary.total },
          { label: "Achieved", value: summary.achieved },
          { label: "At risk", value: summary.atRisk },
        ].map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div className="text-2xl font-semibold">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="achieved">Closed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setOpen(true)} disabled={employees.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> New goal
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Loading goals…</CardContent>
        </Card>
      )}

      {!loading && visible.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Target className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="font-medium">No goals here yet</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Goals with measurable key results give each review concrete evidence beyond ratings.
            </p>
            <Button size="sm" onClick={() => setOpen(true)} disabled={employees.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Add a goal
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {visible.map((g) => {
          const pct = goalProgress(g.id);
          const rows = krs.filter((k) => k.goal_id === g.id);
          return (
            <Card key={g.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{g.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {g.employee_name} · {g.category}
                      {g.target_date ? ` · due ${format(parseISO(g.target_date), "MMM d, yyyy")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusTone[g.status] ?? ""}>
                      {statusLabel[g.status] ?? g.status}
                    </Badge>
                    <Select value={g.status} onValueChange={(v) => updateGoalStatus(g, v)}>
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabel[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteGoal(g)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                {pct !== null && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Key result progress</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                )}
                {rows.length > 0 && (
                  <ul className="space-y-2">
                    {rows.map((k) => (
                      <li key={k.id} className="flex items-center gap-3 text-sm">
                        <span className="flex-1 min-w-0 truncate">{k.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {k.starting_value} → {k.target_value}
                          {k.unit ? ` ${k.unit}` : ""}
                        </span>
                        {editingKr === k.id ? (
                          <span className="flex items-center gap-1">
                            <Input
                              className="h-7 w-20 text-xs"
                              value={krDraft}
                              onChange={(e) => setKrDraft(e.target.value)}
                            />
                            <Button size="icon" className="h-7 w-7" onClick={() => saveKr(k)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setEditingKr(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-medium underline decoration-dotted shrink-0"
                            onClick={() => {
                              setEditingKr(k.id);
                              setKrDraft(String(k.current_value));
                            }}
                          >
                            now {k.current_value} ({krProgress(k)}%)
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New goal</DialogTitle>
            <DialogDescription>
              Attach measurable key results so progress can be scored objectively at review time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee</Label>
              <Select value={empUuid} onValueChange={setEmpUuid}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.uuid} value={e.uuid}>
                      {e.first_name} {e.last_name}
                      {e.department ? ` · ${e.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Goal title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target date</Label>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Key results</Label>
              {krRows.map((k, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-6"
                    placeholder="Measure"
                    value={k.title}
                    onChange={(e) =>
                      setKrRows((prev) =>
                        prev.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)),
                      )
                    }
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    value={k.starting_value}
                    onChange={(e) =>
                      setKrRows((prev) =>
                        prev.map((r, idx) =>
                          idx === i ? { ...r, starting_value: Number(e.target.value) } : r,
                        ),
                      )
                    }
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    value={k.target_value}
                    onChange={(e) =>
                      setKrRows((prev) =>
                        prev.map((r, idx) =>
                          idx === i ? { ...r, target_value: Number(e.target.value) } : r,
                        ),
                      )
                    }
                  />
                  <Input
                    className="col-span-2"
                    placeholder="unit"
                    value={k.unit}
                    onChange={(e) =>
                      setKrRows((prev) =>
                        prev.map((r, idx) => (idx === i ? { ...r, unit: e.target.value } : r)),
                      )
                    }
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setKrRows((prev) => [...prev, { title: "", starting_value: 0, target_value: 100, unit: "%" }])
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add key result
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={createGoal} disabled={busy || !empUuid || !title.trim()}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
