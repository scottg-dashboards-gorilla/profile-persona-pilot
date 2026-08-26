import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CalendarRange, Loader2, Plus, Trash2, ArrowRight, Users, RefreshCw } from "lucide-react";

type Cycle = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  review_types: string[];
  scope_type: string;
  scope_value: string | null;
};

type Employee = {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string | null;
  department: string | null;
};

type Counts = { total: number; completed: number };

const REVIEW_TYPE_OPTIONS = [
  { id: "self", label: "Self-assessment" },
  { id: "manager", label: "Manager review" },
  { id: "peer", label: "Peer / 360 feedback" },
];

const statusTone: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  completed: "bg-indigo-100 text-indigo-800 border-indigo-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function Cycles() {
  const { toast } = useToast();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "active" | "draft" | "completed">("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);


  // create form
  const today = new Date();
  const plus30 = new Date();
  plus30.setDate(plus30.getDate() + 30);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(iso(today));
  const [endsAt, setEndsAt] = useState(iso(plus30));
  const [types, setTypes] = useState<string[]>(["self", "manager"]);
  const [scopeType, setScopeType] = useState<"all" | "department">("all");
  const [scopeValue, setScopeValue] = useState<string>("");
  const [seed, setSeed] = useState(true);
  const [status, setStatus] = useState<"draft" | "active">("active");

  async function load() {
    setLoading(true);
    const [{ data: cyc }, { data: emps }] = await Promise.all([
      supabase.from("review_cycles").select("*").order("starts_at", { ascending: false }),
      supabase
        .from("employees")
        .select("uuid,first_name,last_name,email,title,department")
        .eq("terminated", false)
        .order("first_name"),
    ]);
    setCycles((cyc ?? []) as Cycle[]);
    setEmployees((emps ?? []) as Employee[]);

    const ids = (cyc ?? []).map((c: any) => c.id);
    if (ids.length > 0) {
      const { data: revs } = await supabase
        .from("performance_reviews")
        .select("id,cycle_id,status")
        .in("cycle_id", ids);
      const map: Record<string, Counts> = {};
      (revs ?? []).forEach((r: any) => {
        const c = (map[r.cycle_id] ??= { total: 0, completed: 0 });
        c.total += 1;
        if (r.status === "completed") c.completed += 1;
      });
      setCounts(map);
    } else {
      setCounts({});
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[],
    [employees],
  );

  const visible = useMemo(
    () => (tab === "all" ? cycles : cycles.filter((c) => c.status === tab)),
    [cycles, tab],
  );

  const inScope = useMemo(
    () =>
      scopeType === "all"
        ? employees
        : employees.filter((e) => e.department === scopeValue),
    [employees, scopeType, scopeValue],
  );

  async function createCycle() {
    if (!name.trim()) return;
    setBusy(true);
    let cycleId: string | null = null;
    try {
      const { data, error } = await supabase
        .from("review_cycles")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          starts_at: startsAt,
          ends_at: endsAt,
          status,
          review_types: types.length > 0 ? types : ["manager"],
          scope_type: scopeType,
          scope_value: scopeType === "department" ? scopeValue || null : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      cycleId = data!.id as string;

      if (seed && inScope.length > 0) {
        const rows = inScope.map((e) => ({
          employee_uuid: e.uuid,
          employee_name: `${e.first_name} ${e.last_name}`.trim(),
          employee_email: e.email,
          department: e.department,
          title: e.title,
          scheduled_date: endsAt,
          status: "scheduled",
          cycle_id: cycleId,
          review_type: types.includes("manager") ? "manager" : types[0] ?? "manager",
          review_cycle: "annual",
        }));
        const { error: seedErr } = await supabase.from("performance_reviews").insert(rows);
        if (seedErr) throw seedErr;
      }

      toast({
        title: "Cycle created",
        description: seed ? `${inScope.length} reviews scheduled.` : "No reviews seeded.",
      });
      setOpen(false);
      setName("");
      setDescription("");
      await load();
    } catch (e: any) {
      // Roll back the cycle if seeding failed so no half-built cycle is left.
      if (cycleId) {
        await supabase.from("performance_reviews").delete().eq("cycle_id", cycleId);
        await supabase.from("review_cycles").delete().eq("id", cycleId);
      }
      toast({ title: "Couldn't create cycle", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function syncCycle(c: Cycle) {
    setSyncing(c.id);
    try {
      const { data, error } = await supabase.rpc("sync_cycle_reviews", { _cycle_id: c.id });
      if (error) throw error;
      const added = (data as number) ?? 0;
      toast({
        title: added > 0 ? `${added} review${added === 1 ? "" : "s"} added` : "Everyone's covered",
        description:
          added > 0
            ? "People who joined this cycle's scope after launch now have a scheduled review."
            : "No one in scope is missing a review for this cycle.",
      });
      load();
    } catch (e: any) {
      toast({
        title: "Sync failed",
        description:
          e?.code === "42501"
            ? "You need an HR or admin role to sync a cycle."
            : e?.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  }

  async function setCycleStatus(c: Cycle, next: string) {
    const { error } = await supabase.from("review_cycles").update({ status: next }).eq("id", c.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Cycle ${next}` });
    load();
  }

  async function deleteCycle(c: Cycle) {
    const count = counts[c.id]?.total ?? 0;
    if (count > 0) {
      toast({
        title: "Cycle has reviews",
        description: "Close it instead — cycles with scheduled reviews can't be deleted.",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase.from("review_cycles").delete().eq("id", c.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cycle deleted" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create cycle
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Loading cycles…</CardContent>
        </Card>
      )}

      {!loading && visible.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <CalendarRange className="h-6 w-6 mx-auto text-muted-foreground" />
            <div className="font-medium">No cycles yet</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              A cycle groups reviews for a period — annual, quarterly, or a one-off spot review round.
              Creating one can bulk-schedule reviews for everyone in scope.
            </p>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create your first cycle
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((c) => {
          const ct = counts[c.id] ?? { total: 0, completed: 0 };
          const pct = ct.total > 0 ? Math.round((ct.completed / ct.total) * 100) : 0;
          return (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{c.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(c.starts_at), "MMM d, yyyy")} →{" "}
                      {format(parseISO(c.ends_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusTone[c.status] ?? ""}>
                    {c.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {(c.review_types ?? []).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[11px]">
                      {REVIEW_TYPE_OPTIONS.find((o) => o.id === t)?.label ?? t}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="text-[11px]">
                    <Users className="h-3 w-3 mr-1" />
                    {c.scope_type === "department" ? c.scope_value : "All employees"}
                  </Badge>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-medium">
                      {ct.completed}/{ct.total} · {pct}%
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/reviews?cycle=${c.id}`}>
                      Open reviews <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                  {c.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={syncing === c.id}
                      onClick={() => syncCycle(c)}
                      title="Schedule reviews for anyone in scope who doesn't have one yet"
                    >
                      {syncing === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      )}
                      Sync people
                    </Button>
                  )}

                  {c.status === "draft" && (
                    <Button size="sm" variant="ghost" onClick={() => setCycleStatus(c, "active")}>
                      Activate
                    </Button>
                  )}
                  {c.status === "active" && (
                    <Button size="sm" variant="ghost" onClick={() => setCycleStatus(c, "completed")}>
                      Close cycle
                    </Button>
                  )}
                  {ct.total === 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteCycle(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create review cycle</DialogTitle>
            <DialogDescription>
              Set the window, pick who's in scope, and optionally bulk-schedule a review for each person.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cycle name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. FY26 Annual Reviews"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts</Label>
                <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label>Ends (review due date)</Label>
                <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Included review types</Label>
              <div className="flex flex-col gap-2 mt-1">
                {REVIEW_TYPE_OPTIONS.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={types.includes(o.id)}
                      onCheckedChange={(v) =>
                        setTypes((prev) =>
                          v ? [...prev, o.id] : prev.filter((t) => t !== o.id),
                        )
                      }
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Scope</Label>
                <Select value={scopeType} onValueChange={(v) => setScopeType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    <SelectItem value="department">One department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scopeType === "department" && (
                <div>
                  <Label>Department</Label>
                  <Select value={scopeValue} onValueChange={setScopeValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Initial status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm rounded-md border p-3">
              <Checkbox checked={seed} onCheckedChange={(v) => setSeed(!!v)} />
              <span>
                Schedule a review for each person in scope
                <span className="block text-xs text-muted-foreground">
                  {inScope.length} employee{inScope.length === 1 ? "" : "s"} · due {endsAt}
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={createCycle} disabled={busy || !name.trim()}>
              {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
