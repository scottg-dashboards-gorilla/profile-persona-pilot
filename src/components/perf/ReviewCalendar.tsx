import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  scheduled_date: string;
  status: string;
  comp_approval_status: string;
  merit_percent: number | null;
  fiscal_year: number | null;
};

type Emp = { uuid: string; manager_uuid: string | null; first_name: string | null; last_name: string | null };

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  submitted: { label: "Waiting for HR", dot: "bg-blue-500", badge: "border-blue-300 bg-blue-50 text-blue-800" },
  approved: { label: "Approved", dot: "bg-emerald-500", badge: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  changes_requested: {
    label: "Sent back",
    dot: "bg-amber-500",
    badge: "border-amber-300 bg-amber-50 text-amber-900",
  },
  not_required: { label: "With the manager", dot: "bg-muted-foreground", badge: "text-muted-foreground" },
};

function meta(status: string) {
  return STATUS_META[status] ?? STATUS_META.not_required;
}

/**
 * A month view of every review due date, who owns it, and where its pay
 * outcome sits with HR — so nothing quietly slips past its date.
 */
export function ReviewCalendar() {
  const [rows, setRows] = useState<Row[]>([]);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [managerFilter, setManagerFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: revs }, { data: people }] = await Promise.all([
      supabase
        .from("performance_reviews")
        .select(
          "id, employee_uuid, employee_name, scheduled_date, status, comp_approval_status, merit_percent, fiscal_year",
        )
        .order("scheduled_date"),
      supabase.from("employees").select("uuid, manager_uuid, first_name, last_name").eq("terminated", false),
    ]);
    setRows((revs ?? []) as unknown as Row[]);
    setEmps((people ?? []) as unknown as Emp[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nameByUuid = useMemo(
    () => new Map(emps.map((e) => [e.uuid, [e.first_name, e.last_name].filter(Boolean).join(" ")])),
    [emps],
  );
  const managerOf = useMemo(() => new Map(emps.map((e) => [e.uuid, e.manager_uuid])), [emps]);

  /** Everyone who has at least one person reporting to them. */
  const managers = useMemo(() => {
    const ids = new Set(emps.map((e) => e.manager_uuid).filter((m): m is string => !!m));
    return [...ids]
      .map((id) => ({ uuid: id, name: nameByUuid.get(id) ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [emps, nameByUuid]);

  const visible = useMemo(
    () =>
      rows.filter((r) => managerFilter === "all" || managerOf.get(r.employee_uuid) === managerFilter),
    [rows, managerFilter, managerOf],
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) out.push(new Date(d));
    return out;
  }, [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    visible.forEach((r) => {
      if (!r.scheduled_date) return;
      const key = r.scheduled_date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return map;
  }, [visible]);

  /** Anything a manager has proposed and HR hasn't decided on yet. */
  const pending = useMemo(
    () => visible.filter((r) => r.comp_approval_status === "submitted"),
    [visible],
  );
  const sentBack = useMemo(
    () => visible.filter((r) => r.comp_approval_status === "changes_requested"),
    [visible],
  );

  const pendingByManager = useMemo(() => {
    const map = new Map<string, number>();
    pending.forEach((r) => {
      const m = managerOf.get(r.employee_uuid) ?? "unassigned";
      map.set(m, (map.get(m) ?? 0) + 1);
    });
    return [...map.entries()]
      .map(([uuid, count]) => ({ name: nameByUuid.get(uuid) ?? "No manager set", count }))
      .sort((a, b) => b.count - a.count);
  }, [pending, managerOf, nameByUuid]);

  const monthCount = useMemo(
    () => visible.filter((r) => r.scheduled_date && isSameMonth(parseISO(r.scheduled_date), month)).length,
    [visible, month],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-primary" /> Review calendar
              </CardTitle>
              <CardDescription>
                {monthCount} review{monthCount === 1 ? "" : "s"} due in {format(month, "MMMM yyyy")}
                {" · "}
                {pending.length} waiting for HR sign-off
                {sentBack.length > 0 && ` · ${sentBack.length} sent back to managers`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={managerFilter} onValueChange={setManagerFilter}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue placeholder="All managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All managers</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.uuid} value={m.uuid}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(addMonths(month, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setMonth(startOfMonth(new Date()))}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading the calendar…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-px rounded-md border bg-border text-[11px]">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="bg-muted p-2 text-center font-medium">
                    {d}
                  </div>
                ))}
                {days.map((d) => {
                  const items = byDay.get(format(d, "yyyy-MM-dd")) ?? [];
                  const outside = !isSameMonth(d, month);
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "min-h-[92px] bg-background p-1.5 align-top",
                        outside && "bg-muted/40 text-muted-foreground",
                        isSameDay(d, new Date()) && "ring-1 ring-inset ring-primary",
                      )}
                    >
                      <div className="mb-1 font-medium">{format(d, "d")}</div>
                      <div className="space-y-1">
                        {items.slice(0, 3).map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-1 truncate rounded bg-muted/60 px-1 py-0.5"
                            title={`${r.employee_name} · ${meta(r.comp_approval_status).label}${
                              managerOf.get(r.employee_uuid)
                                ? ` · manager: ${nameByUuid.get(managerOf.get(r.employee_uuid) as string)}`
                                : ""
                            }`}
                          >
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta(r.comp_approval_status).dot)} />
                            <span className="truncate">{r.employee_name}</span>
                          </div>
                        ))}
                        {items.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">+{items.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {Object.entries(STATUS_META).map(([k, m]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-full", m.dot)} /> {m.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Waiting for HR sign-off, by manager</CardTitle>
            <CardDescription>Pay outcomes a manager has submitted and HR hasn't decided on.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingByManager.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing waiting for a decision.</p>
            ) : (
              pendingByManager.map((m) => (
                <div key={m.name} className="flex items-center justify-between gap-2 text-sm">
                  <span>{m.name}</span>
                  <Badge variant="secondary">{m.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Next dates coming up</CardTitle>
            <CardDescription>The next ten review dates, whoever they belong to.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {visible
              .filter((r) => r.scheduled_date && parseISO(r.scheduled_date) >= new Date())
              .slice(0, 10)
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <div>{r.employee_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {format(parseISO(r.scheduled_date), "d MMM yyyy")}
                      {managerOf.get(r.employee_uuid) &&
                        ` · ${nameByUuid.get(managerOf.get(r.employee_uuid) as string)}`}
                    </div>
                  </div>
                  <Badge variant="outline" className={meta(r.comp_approval_status).badge}>
                    {meta(r.comp_approval_status).label}
                  </Badge>
                </div>
              ))}
            {visible.filter((r) => r.scheduled_date && parseISO(r.scheduled_date) >= new Date()).length === 0 && (
              <p className="text-sm text-muted-foreground">No upcoming dates.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ReviewCalendar;
