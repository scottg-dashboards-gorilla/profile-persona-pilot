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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { format, formatDistanceToNow, isBefore, parseISO, startOfToday } from "date-fns";
import {
  CheckCircle2,
  ListTodo,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";

type Task = {
  id: string;
  employee_uuid: string;
  title: string;
  detail: string | null;
  status: TaskStatus;
  priority: string;
  due_date: string | null;
  cadence: string;
  color: string;
  sort_order: number;
  completed_at: string | null;
};

type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

type Comment = {
  id: string;
  task_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

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

// Manager color tags — the meaning is up to the manager (e.g. red = drop everything).
const COLORS: { value: string; label: string; dot: string; stripe: string }[] = [
  { value: "none", label: "No color", dot: "bg-transparent border border-dashed border-slate-300", stripe: "" },
  { value: "red", label: "Red — top priority", dot: "bg-red-500", stripe: "border-l-4 border-l-red-500" },
  { value: "amber", label: "Amber — important", dot: "bg-amber-400", stripe: "border-l-4 border-l-amber-400" },
  { value: "green", label: "Green — on track", dot: "bg-emerald-500", stripe: "border-l-4 border-l-emerald-500" },
  { value: "blue", label: "Blue — when time allows", dot: "bg-sky-500", stripe: "border-l-4 border-l-sky-500" },
  { value: "purple", label: "Purple — development", dot: "bg-violet-500", stripe: "border-l-4 border-l-violet-500" },
];

const colorStripe = (v: string) => COLORS.find((c) => c.value === v)?.stripe ?? "";
const colorDot = (v: string) => COLORS.find((c) => c.value === v)?.dot ?? COLORS[0].dot;

export default function TaskTracker() {
  const { toast } = useToast();
  const { has, unconfigured } = usePermissions();
  const isAdminHr = unconfigured || has("admin") || has("hr");
  const isManager = has("manager");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [people, setPeople] = useState<Emp[]>([]);
  const [meUuid, setMeUuid] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>("");
  const [myUserId, setMyUserId] = useState<string>("");
  const [who, setWho] = useState<string>("");
  // How far back the board looks. Defaults to the last 30 days.
  const [range, setRange] = useState<"30" | "90" | "365" | "custom" | "all">("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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

  const [commentTask, setCommentTask] = useState<Task | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [posting, setPosting] = useState(false);

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
    setMyName(mine ? `${mine.first_name} ${mine.last_name}` : (auth?.user?.email ?? "You"));
    setMyUserId(auth?.user?.id ?? "");

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
      setComments([]);
      return;
    }
    let q = supabase.from("daily_tasks").select("*").eq("employee_uuid", who);
    if (range === "custom") {
      if (from) q = q.gte("created_at", `${from}T00:00:00.000Z`);
      if (to) q = q.lte("created_at", `${to}T23:59:59.999Z`);
    } else if (range !== "all") {
      const since = new Date();
      since.setDate(since.getDate() - Number(range));
      q = q.gte("created_at", since.toISOString());
    }
    const { data } = await q.order("sort_order");
    const rows = (data ?? []) as Task[];
    setTasks(rows);
    if (rows.length) {
      const { data: cmts } = await supabase
        .from("task_comments")
        .select("*")
        .in("task_id", rows.map((t) => t.id))
        .order("created_at");
      setComments((cmts ?? []) as Comment[]);
    } else {
      setComments([]);
    }
  }, [who]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], blocked: [], done: [] };
    tasks.forEach((t) => map[t.status]?.push(t));
    return map;
  }, [tasks]);

  const commentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    comments.forEach((c) => {
      map[c.task_id] = (map[c.task_id] ?? 0) + 1;
    });
    return map;
  }, [comments]);

  const doneToday = byStatus.done.length;
  const openCount = tasks.length - doneToday;

  // Manager tools (comment + color code) apply when looking at someone else's board.
  const viewingOwn = who === meUuid;
  const canManageBoard = !viewingOwn && (isAdminHr || isManager) && !!who;

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

  async function setColor(id: string, color: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
    const { error } = await supabase.from("daily_tasks").update({ color }).eq("id", id);
    if (error) {
      toast({ title: "Could not set the color", description: error.message, variant: "destructive" });
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
    setComments((prev) => prev.filter((c) => c.task_id !== id));
  }

  async function postComment() {
    if (!commentTask || !commentDraft.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("task_comments").insert({
      task_id: commentTask.id,
      author_name: myName,
      body: commentDraft.trim(),
    });
    setPosting(false);
    if (error) {
      toast({ title: "Could not post the comment", description: error.message, variant: "destructive" });
      return;
    }
    setCommentDraft("");
    loadTasks();
  }

  async function removeComment(id: string) {
    const { error } = await supabase.from("task_comments").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete the comment", description: error.message, variant: "destructive" });
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  const selected = people.find((p) => p.uuid === who);
  const thread = commentTask ? comments.filter((c) => c.task_id === commentTask.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Task Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Your day-to-day kanban board — add tasks as they come and drag cards across as work moves
            on. Your manager can comment on your cards and color-code what to prioritize.
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
      ) : !who ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Setting up your board… if this stays here, reload the page.
          </CardContent>
        </Card>
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
                  const count = commentCounts[t.id] ?? 0;
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`cursor-grab rounded-lg border bg-card p-3 shadow-sm active:cursor-grabbing ${colorStripe(t.color)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium leading-snug">{t.title}</div>
                        <div className="flex shrink-0 gap-1">
                          {canManageBoard && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Color code">
                                  <span className={`h-3.5 w-3.5 rounded-full ${colorDot(t.color)}`} />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-52 p-1" align="end">
                                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                  Color-code this task
                                </p>
                                {COLORS.map((c) => (
                                  <button
                                    key={c.value}
                                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent ${t.color === c.value ? "bg-accent" : ""}`}
                                    onClick={() => setColor(t.id, c.value)}
                                  >
                                    <span className={`h-3 w-3 rounded-full ${c.dot}`} />
                                    {c.label}
                                  </button>
                                ))}
                              </PopoverContent>
                            </Popover>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="relative h-7 w-7"
                            title="Comments"
                            onClick={() => {
                              setCommentTask(t);
                              setCommentDraft("");
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {count > 0 && (
                              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold text-primary-foreground">
                                {count}
                              </span>
                            )}
                          </Button>
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

      <Dialog open={!!commentTask} onOpenChange={(open) => !open && setCommentTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comments — {commentTask?.title}</DialogTitle>
            <DialogDescription>
              Managers use this thread to give input on the task; the owner can reply here too.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {thread.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No comments yet — start the conversation.
              </p>
            ) : (
              thread.map((c) => (
                <div key={c.id} className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {c.author_name}
                      {c.author_id === myUserId && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}
                      {(c.author_id === myUserId || isAdminHr) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => removeComment(c.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Write a comment…"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              className="min-h-16"
            />
            <Button onClick={postComment} disabled={posting || !commentDraft.trim()}>
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
