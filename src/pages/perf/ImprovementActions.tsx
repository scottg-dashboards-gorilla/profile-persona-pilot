import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertTriangle, CheckCircle2, Clock, CircleDashed, ExternalLink, Plus } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { competencyLabel } from "@/components/perf/ActionItemsPanel";
import { Textarea } from "@/components/ui/textarea";
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
import { dimensions } from "@/data/dimensions";
import { useToast } from "@/hooks/use-toast";

type ActionRow = {
  id: string;
  employee_uuid: string;
  delta_kind: string;
  delta_key: string | null;
  delta_from: number | null;
  delta_to: number | null;
  action: string | null;
  comment: string | null;
  status: string;
  due_date: string | null;
  target_value: number | null;
  is_required: boolean;
  created_at: string;
};

type EmpRow = {
  uuid: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  department: string | null;
  manager_uuid: string | null;
  user_id: string | null;
};

type Filter = "all" | "overdue" | "open" | "in_progress" | "done";

const statusLabel: Record<string, string> = {
  open: "Not started",
  in_progress: "In progress",
  done: "Done",
};

function areaLabel(r: ActionRow) {
  if (r.delta_kind === "tier") return "Overall tier";
  if (r.delta_kind === "disc") return `DISC · ${r.delta_key ?? ""}`;
  return competencyLabel(r.delta_key ?? "");
}

function daysLeft(due: string | null) {
  if (!due) return null;
  return differenceInCalendarDays(parseISO(due), new Date());
}

export default function ImprovementActions() {
  const { has, loading: permLoading } = usePermissions();
  const isAdminHr = has("admin") || has("hr");
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [emps, setEmps] = useState<Record<string, EmpRow>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New-action dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formEmp, setFormEmp] = useState("");
  const [formKind, setFormKind] = useState("technical");
  const [formKey, setFormKey] = useState("");
  const [formAction, setFormAction] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formDue, setFormDue] = useState("");
  const [formTarget, setFormTarget] = useState("");

  const loadActions = async (allowed: Record<string, EmpRow>) => {
    const { data, error } = await supabase
      .from("assessment_action_items")
      .select(
        "id,employee_uuid,delta_kind,delta_key,delta_from,delta_to,action,comment,status,due_date,target_value,is_required,created_at",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Couldn't load actions", description: error.message, variant: "destructive" });
      return;
    }
    setRows(((data ?? []) as ActionRow[]).filter((a) => allowed[a.employee_uuid]));
  };

  useEffect(() => {
    if (permLoading) return;
    (async () => {
      setLoading(true);
      const { data: empData } = await supabase
        .from("employees")
        .select("uuid,first_name,last_name,title,department,manager_uuid,user_id")
        .eq("terminated", false);
      let people = (empData ?? []) as EmpRow[];
      if (!isAdminHr) {
        // Managers see their direct reports only — never their own record.
        const { data: authData } = await supabase.auth.getUser();
        const me = people.find((p) => p.user_id === authData.user?.id);
        people = me
          ? people.filter((p) => p.manager_uuid === me.uuid && p.uuid !== me.uuid)
          : [];
      }
      const byUuid: Record<string, EmpRow> = {};
      for (const p of people) byUuid[p.uuid] = p;
      setEmps(byUuid);
      await loadActions(byUuid);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminHr, permLoading]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    const { error } = await supabase
      .from("assessment_action_items")
      .update({ status })
      .eq("id", id);
    setBusyId(null);
    if (error)
      return toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast({ title: status === "done" ? "Marked as done" : "Status updated" });
  }

  function openDialog(employeeUuid?: string) {
    setFormEmp(employeeUuid ?? "");
    setFormKind("technical");
    setFormKey("");
    setFormAction("");
    setFormComment("");
    setFormDue("");
    setFormTarget("");
    setDialogOpen(true);
  }

  async function saveAction() {
    if (!formEmp || !formAction.trim() || !formDue) {
      toast({
        title: "Fill in the essentials",
        description: "Pick the person, write the action, and set a date to achieve it by.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("assessment_action_items").insert({
      employee_uuid: formEmp,
      delta_kind: formKind,
      delta_key: formKind === "technical" || formKind === "disc" ? formKey || null : null,
      action: formAction.trim(),
      comment: formComment.trim() || null,
      due_date: formDue,
      target_value: formTarget === "" ? null : Number(formTarget),
      is_required: true,
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error)
      return toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    setDialogOpen(false);
    toast({ title: "Action set" });
    await loadActions(emps);
  }


  const counts = useMemo(() => {
    const c = { total: rows.length, open: 0, in_progress: 0, done: 0, overdue: 0, required: 0 };
    for (const r of rows) {
      if (r.status === "done") c.done += 1;
      else if (r.status === "in_progress") c.in_progress += 1;
      else c.open += 1;
      if (r.status !== "done" && r.due_date && (daysLeft(r.due_date) ?? 0) < 0) c.overdue += 1;
      if (r.is_required && r.status !== "done") c.required += 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const emp = emps[r.employee_uuid];
      const name = `${emp?.first_name ?? ""} ${emp?.last_name ?? ""}`.trim();
      if (needle && !`${name} ${areaLabel(r)} ${r.action ?? ""}`.toLowerCase().includes(needle))
        return false;
      const overdue = r.status !== "done" && r.due_date && (daysLeft(r.due_date) ?? 0) < 0;
      if (filter === "overdue") return !!overdue;
      if (filter === "open") return r.status !== "done" && r.status !== "in_progress";
      if (filter === "in_progress") return r.status === "in_progress";
      if (filter === "done") return r.status === "done";
      return true;
    });
  }, [rows, emps, filter, q]);

  /** Per-person roll-up, worst first: overdue, then outstanding. */
  const byPerson = useMemo(() => {
    const map = new Map<
      string,
      { name: string; title: string | null; open: number; in_progress: number; done: number; overdue: number }
    >();
    for (const r of rows) {
      const emp = emps[r.employee_uuid];
      const key = r.employee_uuid;
      const entry =
        map.get(key) ??
        {
          name: `${emp?.first_name ?? ""} ${emp?.last_name ?? ""}`.trim() || key,
          title: emp?.title ?? null,
          open: 0,
          in_progress: 0,
          done: 0,
          overdue: 0,
        };
      if (r.status === "done") entry.done += 1;
      else if (r.status === "in_progress") entry.in_progress += 1;
      else entry.open += 1;
      if (r.status !== "done" && r.due_date && (daysLeft(r.due_date) ?? 0) < 0) entry.overdue += 1;
      map.set(key, entry);
    }
    return [...map.entries()].sort(
      (a, b) =>
        b[1].overdue - a[1].overdue ||
        b[1].open + b[1].in_progress - (a[1].open + a[1].in_progress) ||
        a[1].name.localeCompare(b[1].name),
    );
  }, [rows, emps]);

  if (loading || permLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading improvement actions…
      </div>
    );
  }

  const tiles: { key: Filter; label: string; value: number; icon: typeof Clock; tone: string }[] = [
    { key: "all", label: "All actions", value: counts.total, icon: CircleDashed, tone: "" },
    { key: "overdue", label: "Overdue", value: counts.overdue, icon: AlertTriangle, tone: "text-red-600" },
    { key: "open", label: "Not started", value: counts.open, icon: Clock, tone: "text-amber-600" },
    { key: "in_progress", label: "In progress", value: counts.in_progress, icon: Clock, tone: "" },
    { key: "done", label: "Done", value: counts.done, icon: CheckCircle2, tone: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Improvement actions</h1>
          <p className="text-sm text-muted-foreground">
            Every action agreed off the back of an assessment{" "}
            {isAdminHr ? "across the company" : "for your direct reports"} — so a flagged area can't
            quietly vanish.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-1" /> Set an action
        </Button>
      </div>

      {counts.overdue > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong>{counts.overdue}</strong> action{counts.overdue === 1 ? " is" : "s are"} past
            their agreed date
            {counts.required > 0 ? `, and ${counts.required} must-improve area${counts.required === 1 ? " is" : "s are"} still outstanding` : ""}
            . Follow these up before the next review.
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <button key={t.key} type="button" onClick={() => setFilter(t.key)} className="text-left">
            <Card className={filter === t.key ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <t.icon className={`h-3.5 w-3.5 ${t.tone}`} /> {t.label}
                </div>
                <div className={`text-2xl font-semibold tabular-nums ${t.tone}`}>{t.value}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By person</CardTitle>
          <CardDescription>Worst first — anyone with overdue or outstanding actions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="text-right">Not started</TableHead>
                <TableHead className="text-right">In progress</TableHead>
                <TableHead className="text-right">Done</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {byPerson.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    No improvement actions recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {byPerson.map(([uuid, p]) => (
                <TableRow key={uuid}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.title ?? "—"}</div>
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${p.overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                    {p.overdue}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.open}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.in_progress}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{p.done}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => openDialog(uuid)}>
                      Set action
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/people/${uuid}`}>
                        Open <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Every action</CardTitle>
            <CardDescription>
              {filter === "all" ? "All actions" : tiles.find((t) => t.key === filter)?.label} ·{" "}
              {filtered.length} shown
            </CardDescription>
          </div>
          <Input
            className="max-w-xs"
            placeholder="Search person, area or action…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Achieve by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Nothing here.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => {
                const emp = emps[r.employee_uuid];
                const left = daysLeft(r.due_date);
                const overdue = r.status !== "done" && left != null && left < 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link to={`/people/${r.employee_uuid}`} className="font-medium hover:underline">
                        {`${emp?.first_name ?? ""} ${emp?.last_name ?? ""}`.trim() || r.employee_uuid}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{areaLabel(r)}</span>
                        {r.is_required && (
                          <Badge variant="destructive" className="text-[10px]">
                            Must improve
                          </Badge>
                        )}
                      </div>
                      {r.delta_from != null && r.delta_to != null && (
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {Math.round(r.delta_from)} → {Math.round(r.delta_to)}
                          {r.target_value != null ? ` · target ${Math.round(r.target_value)}` : ""}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <div className="text-sm">{r.action ?? "—"}</div>
                      {r.comment && (
                        <div className="text-xs text-muted-foreground line-clamp-2">{r.comment}</div>
                      )}
                    </TableCell>
                    <TableCell className={overdue ? "text-red-600" : ""}>
                      {r.due_date ? (
                        <>
                          {format(parseISO(r.due_date), "MMM d, yyyy")}
                          <div className="text-xs">
                            {r.status === "done"
                              ? ""
                              : overdue
                                ? `${Math.abs(left ?? 0)} days overdue`
                                : `${left} days left`}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No date set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "done" ? "secondary" : overdue ? "destructive" : "outline"
                        }
                      >
                        {statusLabel[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {busyId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : r.status === "done" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus(r.id, "in_progress")}
                        >
                          Reopen
                        </Button>
                      ) : (
                        <>
                          {r.status !== "in_progress" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateStatus(r.id, "in_progress")}
                            >
                              Start
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "done")}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set an improvement action</DialogTitle>
            <DialogDescription>
              Agree what needs to improve and the date it should be achieved by. It shows on the
              person's own review page straight away.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Person</label>
              <Select value={formEmp} onValueChange={setFormEmp}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a person" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(emps)
                    .sort((a, b) => (a.first_name ?? "").localeCompare(b.first_name ?? ""))
                    .map((e) => (
                      <SelectItem key={e.uuid} value={e.uuid}>
                        {`${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || e.uuid}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Area</label>
                <Select
                  value={formKind}
                  onValueChange={(v) => {
                    setFormKind(v);
                    setFormKey("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Skill</SelectItem>
                    <SelectItem value="disc">Working style (DISC)</SelectItem>
                    <SelectItem value="tier">Overall tier</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {formKind === "technical" ? "Which skill" : formKind === "disc" ? "Letter" : "Detail"}
                </label>
                {formKind === "technical" ? (
                  <Select value={formKey} onValueChange={setFormKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a skill" />
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
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    placeholder={formKind === "disc" ? "D" : "optional"}
                    disabled={formKind === "tier" || formKind === "general"}
                  />
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Action</label>
              <Textarea
                rows={2}
                value={formAction}
                onChange={(e) => setFormAction(e.target.value)}
                placeholder="What will be done, and by whom"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Why this matters (optional)</label>
              <Textarea
                rows={2}
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Achieve by</label>
                <Input type="date" value={formDue} onChange={(e) => setFormDue(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Target score (optional)</label>
                <Input
                  type="number"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  placeholder="e.g. 70"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAction} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
