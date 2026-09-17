import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { format, isBefore, parseISO, startOfToday } from "date-fns";
import { CheckCircle2, ListTodo, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type Task = {
  id: string;
  employee_uuid: string;
  title: string;
  detail: string | null;
  status: TaskStatus;
  priority: string;
  due_date: string | null;
  cadence: string;
  sort_order: number;
  completed_at: string | null;
};

type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

type Emp = {
  uuid: string;
  first_name: string;
  last_name: string;
  department: string | null;
  manager_uuid: string | null;
  user_id: string | null;
};

const COLUMNS: { key: TaskStatus; label: string; hint: string }[] = [
  { key: "todo", label: "To do", hint: "Planned for today" },
  { key: "in_progress", label: "In progress", hint: "Being worked on now" },
  { key: "blocked", label: "Blocked", hint: "Waiting on someone or something" },
  { key: "done", label: "Done", hint: "Finished today" },
];

const CADENCES: { value: string; label: string }[] = [
  { value: "once", label: "One-off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const cadenceLabel = (v: string) => CADENCES.find((c) => c.value === v)?.label ?? v;

const priorityTone: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-sky-100 text-sky-800 border-sky-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

export default function TaskTracker() {
  const { toast } = useToast();
  const { has, unconfigured } = usePermissions();
  const isAdminHr = unconfigured || has("admin") || has("hr");
  const isManager = has("manager");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Emp[]>([]);
  const [meUuid, setMeUuid] = useState<string | null>(null);
  const [who, setWho] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: "",
    detail: "",
    priority: "medium",
    due_date: format(new Date(), "yyyy-MM-dd"),
    cadence: "once",
    status: "todo" as TaskStatus,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: emps }, { data: auth }] = await Promise.all([
      supabase
        .from("employees")
        .select("uuid,first_name,last_name,department,manager_uuid,user_id")
        .eq("terminated", false)
        .order("first_name"),
      supabase.auth.getUser(),
    ]);
    let all = (emps ?? []) as Emp[];
    let mine = all.find((e) => e.user_id && e.user_id === auth?.user?.id) ?? null;

    // Signed in but not yet matched to a staff record: link by work email so the
    // person can use their own board straight away.
    if (!mine && auth?.user) {
      const { data: claim } = await supabase.rpc("claim_employee_link");
      const linked = (claim as { status?: string; employee_uuid?: string } | null) ?? null;
      if (linked?.status === "linked" && linked.employee_uuid) {
        const { data: again } = await supabase
          .from("employees")
          .select("uuid,first_name,last_name,department,manager_uuid,user_id")
          .eq("terminated", false)
          .order("first_name");
        all = (again ?? []) as Emp[];
        mine = all.find((e) => e.uuid === linked.employee_uuid) ?? null;
      }
    }
    setMeUuid(mine?.uuid ?? null);

    let visible: Emp[] = [];
    if (isAdminHr) {
      visible = all;
    } else if (isManager && mine) {
      const direct = all.filter((e) => e.manager_uuid === mine.uuid).map((e) => e.uuid);
      const team = new Set([
        mine.uuid,
        ...direct,
        ...all.filter((e) => e.manager_uuid && direct.includes(e.manager_uuid)).map((e) => e.uuid),
      ]);
      visible = all.filter((e) => team.has(e.uuid));
    } else if (mine) {
      visible = [mine];
    }
    setPeople(visible);
    // Keep the selection valid when the view changes (employee view drops the team).
    setWho((prev) =>
      prev && visible.some((e) => e.uuid === prev) ? prev : mine?.uuid || visible[0]?.uuid || "",
    );
    setLoading(false);
  }, [isAdminHr, isManager]);

  useEffect(() => {
    load();
  }, [load]);

  const loadTasks = useCallback(async () => {
    if (!who) {
      setTasks([]);
      return;
    }
    const { data } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("employee_uuid", who)
      .order("sort_order");
    setTasks((data ?? []) as Task[]);
  }, [who]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], blocked: [], done: [] };
    tasks.forEach((t) => map[t.status]?.push(t));
    return map;
  }, [tasks]);

  const doneToday = byStatus.done.length;
  const openCount = tasks.length - doneToday;

  function openNew(status: TaskStatus) {
    setEditing(null);
    setForm({
      title: "",
      detail: "",
      priority: "medium",
      due_date: format(new Date(), "yyyy-MM-dd"),
      cadence: "once",
      status,
    });
    setDialogOpen(true);
  }

  function openEdit(t: Task) {
    setEditing(t);
    setForm({
      title: t.title,
      detail: t.detail ?? "",
      priority: t.priority,
      due_date: t.due_date ?? "",
      cadence: t.cadence ?? "once",
      status: t.status,
    });
    setDialogOpen(true);
  }

  async function saveTask() {
    if (!form.title.trim() || !who) return;
    const payload = {
      employee_uuid: who,
      title: form.title.trim(),
      detail: form.detail.trim() || null,
      priority: form.priority,
      due_date: form.due_date || null,
      cadence: form.cadence,
      status: form.status,
      completed_at: form.status === "done" ? new Date().toISOString() : null,
    };
    const res = editing
      ? await supabase.from("daily_tasks").update(payload).eq("id", editing.id)
      : await supabase
          .from("daily_tasks")
          .insert({ ...payload, sort_order: tasks.length });
    if (res.error) {
      toast({ title: "Could not save the task", description: res.error.message, variant: "destructive" });
      return;
    }
    setDialogOpen(false);
    toast({ title: editing ? "Task updated" : "Task added" });
    loadTasks();
  }

  async function move(id: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === status) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const { error } = await supabase
      .from("daily_tasks")
      .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      toast({ title: "Could not move the task", description: error.message, variant: "destructive" });
      loadTasks();
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete the task", description: error.message, variant: "destructive" });
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const selected = people.find((p) => p.uuid === who);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Task Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Your own action board — add as many tasks as you like, one-off or repeating daily, weekly or
            monthly, and drag a card between columns as work moves on.
          </p>
        </div>
        <div className="flex items-end gap-2">
          {people.length > 1 && (
            <div className="w-56">
              <Select value={who} onValueChange={setWho}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a person" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.uuid} value={p.uuid}>
                      {p.first_name} {p.last_name}
                      {p.uuid === meUuid ? " (me)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={() => openNew("todo")} disabled={!who}>
            <Plus className="mr-2 h-4 w-4" /> Add task
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ListTodo className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-2xl font-semibold">{openCount}</div>
              <div className="text-xs text-muted-foreground">Open tasks</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-2xl font-semibold">{doneToday}</div>
              <div className="text-xs text-muted-foreground">Done</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium">
              {selected ? `${selected.first_name} ${selected.last_name}` : "No one selected"}
            </div>
            <div className="text-xs text-muted-foreground">{selected?.department ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <Card
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragId) move(dragId, col.key);
                setDragId(null);
              }}
              className={over === col.key ? "border-primary bg-primary/5" : undefined}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{col.label}</span>
                  <Badge variant="secondary">{byStatus[col.key].length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{col.hint}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {byStatus[col.key].map((t) => {
                  const overdue =
                    t.due_date && t.status !== "done" && isBefore(parseISO(t.due_date), startOfToday());
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      className="cursor-grab rounded-lg border bg-card p-3 shadow-sm active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium leading-snug">{t.title}</div>
                        <div className="flex shrink-0 gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {t.detail && (
                        <p className="mt-1 text-xs text-muted-foreground">{t.detail}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className={priorityTone[t.priority]}>
                          {t.priority}
                        </Badge>
                        {t.cadence && t.cadence !== "once" && (
                          <Badge variant="outline">{cadenceLabel(t.cadence)}</Badge>
                        )}
                        {t.due_date && (
                          <Badge
                            variant="outline"
                            className={overdue ? "border-red-200 bg-red-50 text-red-700" : undefined}
                          >
                            {format(parseISO(t.due_date), "d MMM")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => openNew(col.key)}
                  disabled={!who}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" /> Add
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>
              Add anything you're working on — a one-off action, or something that repeats daily,
              weekly or monthly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="What needs doing?"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              placeholder="Any detail (optional)"
              value={form.detail}
              onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <Select value={form.cadence} onValueChange={(v) => setForm((f) => ({ ...f, cadence: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTask} disabled={!form.title.trim()}>
              {editing ? "Save" : "Add task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
