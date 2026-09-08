import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PDR_STAGES, pdrProgress, type PdrForm, type PdrObjective, type PdrStage } from "@/lib/pmp";
import { ReviewTimeline } from "@/components/perf/ReviewTimeline";
import { PdrDialog } from "@/components/perf/PdrDialog";
import { usePermissions } from "@/hooks/usePermissions";

type Emp = { uuid: string; first_name: string; last_name: string; department: string | null };

const thisYear = new Date().getFullYear();

export default function PDR() {
  const { toast } = useToast();
  const { has, unconfigured } = usePermissions();
  const canManage = unconfigured || has("admin") || has("hr") || has("manager");

  const [year, setYear] = useState(thisYear);
  const [forms, setForms] = useState<PdrForm[]>([]);
  const [objectives, setObjectives] = useState<Record<string, PdrObjective[]>>({});
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newEmp, setNewEmp] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: emps }] = await Promise.all([
      supabase.from("pdr_forms").select("*").eq("fiscal_year", year).order("employee_name"),
      supabase.from("employees").select("uuid,first_name,last_name,department").eq("terminated", false).order("first_name"),
    ]);
    const list = (f ?? []) as PdrForm[];
    setForms(list);
    setEmployees((emps ?? []) as Emp[]);
    if (list.length > 0) {
      const { data: objs } = await supabase
        .from("pdr_objectives")
        .select("*")
        .in("form_id", list.map((x) => x.id));
      const grouped: Record<string, PdrObjective[]> = {};
      ((objs ?? []) as PdrObjective[]).forEach((o) => {
        (grouped[o.form_id] ??= []).push(o);
      });
      setObjectives(grouped);
    } else {
      setObjectives({});
    }
    setLoading(false);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return forms.filter((f) => !needle || f.employee_name.toLowerCase().includes(needle));
  }, [forms, q]);

  const stageCounts = useMemo(() => {
    const counts: Record<PdrStage, number> = { objectives: 0, midyear: 0, year_end: 0, closed: 0 };
    forms.forEach((f) => {
      counts[f.stage] = (counts[f.stage] ?? 0) + 1;
    });
    return counts;
  }, [forms]);

  async function startPdr() {
    const emp = employees.find((e) => e.uuid === newEmp);
    if (!emp) return;
    setCreating(true);
    const { error } = await supabase.from("pdr_forms").insert({
      employee_uuid: emp.uuid,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      fiscal_year: year,
    });
    setCreating(false);
    if (error) {
      toast({
        title: "Couldn't start the PDR",
        description: error.message.includes("duplicate")
          ? "This person already has a PDR for that year."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    setNewEmp("");
    await load();
    toast({ title: "PDR started", description: `${emp.first_name} can now draft their objectives.` });
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Development reviews (PDR)</h1>
          <p className="text-sm text-muted-foreground">
            The annual PMP cycle: objectives in Jan–Feb, mid-year check-in around Jun–Jul, year-end input
            and score in Dec–Jan. The score feeds the Annual Pay Review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => (
                <SelectItem key={y} value={String(y)}>FY{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PDR_STAGES.map((s, i) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                {i + 1}. {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stageCounts[s.id] ?? 0}</div>
              <p className="text-xs text-muted-foreground">{s.owner} · {s.sla}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">FY{year} PDRs</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8 w-[180px]" placeholder="Find a person…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={newEmp} onValueChange={setNewEmp}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Start a PDR for…" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.uuid} value={e.uuid}>
                    {e.first_name} {e.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={startPdr} disabled={!newEmp || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Start
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading PDRs…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No PDRs for FY{year} yet — start one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Objectives</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => {
                  const objs = objectives[f.id] ?? [];
                  const p = pdrProgress(f, objs);
                  return (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => setOpenId(f.id)}>
                      <TableCell className="font-medium">{f.employee_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px]">
                          {PDR_STAGES.find((s) => s.id === f.stage)?.label ?? f.stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {objs.length} · {objs.filter((o) => o.manager_validated).length} aligned
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ReviewTimeline
                            stages={[
                              { key: "kickoff", label: "Objectives submitted", short: "1", at: f.objectives_submitted_at },
                              { key: "self", label: "Objectives aligned (C1)", short: "2", at: f.objectives_approved_at },
                              { key: "360", label: "Mid-year check-in", short: "3", at: f.midyear_checkin_at },
                              { key: "completion", label: "Year-end self input", short: "4", at: f.self_input_submitted_at },
                              { key: "comp", label: "Manager comments", short: "5", at: f.comments_finalized_at },
                              { key: "release", label: "Score recorded", short: "6", at: f.score_recorded_at },
                            ]}
                          />
                          <span className="text-xs text-muted-foreground">{p.done}/{p.total}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {f.year_end_score ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setOpenId(f.id); }}>
                          <Workflow className="h-4 w-4 mr-1" /> Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PdrDialog
        formId={openId}
        canManage={canManage}
        onOpenChange={(o) => !o && setOpenId(null)}
        onChanged={load}
      />
    </div>
  );
}
