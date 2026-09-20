import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2,
  ShieldCheck,
  Wallet,
  ClipboardCheck,
  Users,
  Scale,
  ShieldAlert,
  CalendarDays,
} from "lucide-react";
import ReviewCalendar from "@/components/perf/ReviewCalendar";
import FairnessCheck from "@/components/perf/FairnessCheck";
import DataHealth from "@/components/perf/DataHealth";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import BudgetApproval from "@/components/perf/BudgetApproval";
import { formatMoney } from "@/lib/compensation";
import { toast } from "sonner";

type AppRole = "admin" | "hr" | "manager";
const ROLES: AppRole[] = ["admin", "hr", "manager"];

type ReviewRow = {
  id: string;
  employee_name: string;
  department: string | null;
  overall_rating: string | null;
  merit_percent: number | null;
  merit_amount: number | null;
  comp_approval_status: string;
  comp_submitted_at: string | null;
  released_at: string | null;
  fiscal_year: number | null;
};

type Person = {
  uuid: string;
  name: string;
  email: string | null;
  title: string | null;
  user_id: string | null;
};

const FISCAL_YEAR = 2026;

/** Pay decisions waiting for HR/admin sign-off before a manager can share the outcome. */
function ReviewApprovals() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("performance_reviews")
      .select(
        "id,employee_name,department,overall_rating,merit_percent,merit_amount,comp_approval_status,comp_submitted_at,released_at,fiscal_year",
      )
      .order("employee_name");
    if (error) toast.error(error.message);
    setRows((data ?? []) as ReviewRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const proposed = useMemo(() => rows.filter((r) => (r.merit_percent ?? 0) > 0), [rows]);
  /** Only what a manager has actually submitted is a decision for HR. */
  const waiting = useMemo(
    () => proposed.filter((r) => r.comp_approval_status === "submitted"),
    [proposed],
  );
  /** Still being worked on by the manager — nothing for HR to do yet. */
  const withManagers = useMemo(
    () => proposed.filter((r) => r.comp_approval_status === "not_required"),
    [proposed],
  );
  const sentBack = useMemo(
    () => proposed.filter((r) => r.comp_approval_status === "changes_requested"),
    [proposed],
  );
  const approved = useMemo(() => rows.filter((r) => r.comp_approval_status === "approved"), [rows]);

  async function decide(r: ReviewRow, status: "approved" | "changes_requested") {
    setBusy(r.id);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("performance_reviews")
      .update({
        comp_approval_status: status,
        comp_approval_note: notes[r.id]?.trim() || null,
        comp_approved_by: status === "approved" ? auth.user?.id ?? null : null,
        comp_approved_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Pay outcome approved" : "Sent back to the manager");
    await load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" /> Pay outcomes waiting for sign-off
          </CardTitle>
          <CardDescription>
            Managers propose the figure; nothing can be shared with the employee until it is approved here.
            {waiting.length} waiting · {approved.length} approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
            </div>
          ) : waiting.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing waiting for you.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Merit %</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note to the manager</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waiting.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{r.employee_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.department ?? "—"} · FY{r.fiscal_year ?? FISCAL_YEAR}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.overall_rating ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm">
                      {r.merit_percent !== null ? `${Number(r.merit_percent).toFixed(2)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.merit_amount !== null ? formatMoney(Number(r.merit_amount)) : "—"}
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <Textarea
                        rows={2}
                        placeholder="Optional"
                        value={notes[r.id] ?? ""}
                        onChange={(e) => setNotes((s) => ({ ...s, [r.id]: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="mr-2"
                        disabled={busy !== null}
                        onClick={() => decide(r, "changes_requested")}
                      >
                        Send back
                      </Button>
                      <Button size="sm" disabled={busy !== null} onClick={() => decide(r, "approved")}>
                        {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Who can do what: grant or revoke admin, HR and manager rights per person. */
function RolesTab() {
  const [people, setPeople] = useState<Person[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, { id: string; role: AppRole }[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pick, setPick] = useState<AppRole>("manager");

  const load = useCallback(async () => {
    setLoading(true);
    const [emps, roles] = await Promise.all([
      supabase
        .from("employees")
        .select("uuid,first_name,last_name,email,title,user_id")
        .eq("terminated", false)
        .order("first_name"),
      supabase.from("user_roles").select("id,user_id,role"),
    ]);
    if (emps.error) toast.error(emps.error.message);
    if (roles.error) toast.error(roles.error.message);
    setPeople(
      ((emps.data ?? []) as any[]).map((e) => ({
        uuid: e.uuid,
        name: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim(),
        email: e.email,
        title: e.title,
        user_id: e.user_id,
      })),
    );
    const map: Record<string, { id: string; role: AppRole }[]> = {};
    ((roles.data ?? []) as any[]).forEach((r) => {
      (map[r.user_id] ||= []).push({ id: r.id, role: r.role });
    });
    setRolesByUser(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function grant(p: Person) {
    if (!p.user_id) return toast.error(`${p.name} has not signed in yet, so there is no account to grant.`);
    setBusy(p.uuid);
    const { error } = await supabase.from("user_roles").insert({ user_id: p.user_id, role: pick });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${p.name} is now ${pick}`);
    await load();
  }

  async function revoke(p: Person, roleId: string, role: AppRole) {
    setBusy(p.uuid);
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${role} removed from ${p.name}`);
    await load();
  }

  const shown = people.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.title ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Employee roles
        </CardTitle>
        <CardDescription>
          Only admins and HR can change budgets, sign off pay outcomes and grant rights here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-9 max-w-xs"
            placeholder="Find a person…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={pick} onValueChange={(v) => setPick(v as AppRole)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  Grant {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : (
          <div className="divide-y">
            {shown.map((p) => {
              const held = p.user_id ? rolesByUser[p.user_id] ?? [] : [];
              return (
                <div key={p.uuid} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-[200px]">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.title ?? "—"} · {p.email ?? "no work email"}
                      {p.user_id ? "" : " · no sign-in yet"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {held.length === 0 ? (
                      <Badge variant="secondary">Employee</Badge>
                    ) : (
                      held.map((h) => (
                        <Badge
                          key={h.id}
                          variant={h.role === "admin" ? "default" : "outline"}
                          className="cursor-pointer"
                          title="Click to remove"
                          onClick={() => revoke(p, h.id, h.role)}
                        >
                          {h.role} ×
                        </Badge>
                      ))
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null || !p.user_id}
                      onClick={() => grant(p)}
                    >
                      {busy === p.uuid ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${pick}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPanel() {
  const { has, loading, unconfigured } = usePermissions();
  const allowed = loading || unconfigured || has("admin") || has("hr");

  if (!allowed) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin only</CardTitle>
            <CardDescription>This page is for admins and HR.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Admin panel
        </h1>
        <p className="text-sm text-muted-foreground">
          Set the annual merit budget, sign off pay outcomes and manage who can do what. Managers can propose
          but never change these figures themselves.
        </p>
      </div>

      <Tabs defaultValue="budget">
        <TabsList>
          <TabsTrigger value="budget" className="gap-1.5">
            <Wallet className="h-4 w-4" /> Merit budget
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" /> Review approvals
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5">
            <Users className="h-4 w-4" /> Employee roles
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="fairness" className="gap-1.5">
            <Scale className="h-4 w-4" /> Fairness check
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-1.5">
            <ShieldAlert className="h-4 w-4" /> Records
          </TabsTrigger>
        </TabsList>
        <TabsContent value="budget" className="mt-4">
          <BudgetApproval year={FISCAL_YEAR} />
        </TabsContent>
        <TabsContent value="approvals" className="mt-4">
          <ReviewApprovals />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesTab />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <ReviewCalendar />
        </TabsContent>
        <TabsContent value="fairness" className="mt-4">
          <FairnessCheck year={FISCAL_YEAR} />
        </TabsContent>
        <TabsContent value="records" className="mt-4">
          <DataHealth year={FISCAL_YEAR} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
