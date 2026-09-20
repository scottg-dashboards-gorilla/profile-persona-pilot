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
import { Loader2, AlertTriangle, CheckCircle2, Clock, CircleDashed, ExternalLink } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";
import { competencyLabel } from "@/components/perf/ActionItemsPanel";

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

  useEffect(() => {
    if (permLoading) return;
    (async () => {
      setLoading(true);
      const [{ data: empData }, { data: actionData }] = await Promise.all([
        supabase
          .from("employees")
          .select("uuid,first_name,last_name,title,department,manager_uuid,user_id")
          .eq("terminated", false),
        supabase
          .from("assessment_action_items")
          .select(
            "id,employee_uuid,delta_kind,delta_key,delta_from,delta_to,action,comment,status,due_date,target_value,is_required,created_at",
          )
          .order("created_at", { ascending: false }),
      ]);
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
      setRows(((actionData ?? []) as ActionRow[]).filter((a) => byUuid[a.employee_uuid]));
      setLoading(false);
    })();
  }, [isAdminHr, permLoading]);

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
      <div>
        <h1 className="text-2xl font-semibold">Improvement actions</h1>
        <p className="text-sm text-muted-foreground">
          Every action agreed off the back of an assessment{" "}
          {isAdminHr ? "across the company" : "for your direct reports"} — so a flagged area can't
          quietly vanish.
        </p>
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
                  <TableCell className="text-right">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
