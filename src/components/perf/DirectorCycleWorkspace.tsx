import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, DollarSign, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

export type DirectorReview = {
  id: string; employee_uuid: string; employee_name: string; assessment_attempt_id: string | null;
  rating_score: number | null; merit_percent: number | null; merit_amount: number | null;
  manager_approved_at: string | null; comp_approval_status: string; released_at: string | null;
};
type Person = { uuid: string; first_name: string; last_name: string; title: string | null; reports: number };

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function payStatus(r: DirectorReview) {
  if (r.released_at) return { label: "Shared", variant: "default" as const };
  if (r.comp_approval_status === "approved") return { label: "HR approved", variant: "default" as const };
  if (r.comp_approval_status === "submitted") return { label: "With HR", variant: "secondary" as const };
  if (r.manager_approved_at) return { label: "You approved", variant: "secondary" as const };
  if (r.rating_score != null) return { label: "Draft scored", variant: "outline" as const };
  return { label: "Not scored", variant: "outline" as const };
}

export default function DirectorCycleWorkspace({ reviews, fiscalYear }: { reviews: DirectorReview[]; fiscalYear: number }) {
  const [team, setTeam] = useState<Person[]>([]);
  const [requests, setRequests] = useState<{ employee_uuid: string; due_date: string | null }[]>([]);
  const [actions, setActions] = useState<{ employee_uuid: string; due_date: string | null }[]>([]);
  const [budget, setBudget] = useState<{ amount: number; status: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: me } = await supabase.from("employees").select("uuid").eq("user_id", auth.user?.id ?? "").maybeSingle();
      if (!me?.uuid) return;
      const { data: people } = await supabase.from("employees").select("uuid,first_name,last_name,title").eq("manager_uuid", me.uuid).eq("terminated", false).order("first_name");
      const ids = (people ?? []).map((p) => p.uuid).filter((id) => id !== me.uuid);
      if (!ids.length) return;
      const [{ data: sub }, { data: req }, { data: act }, { data: bud }] = await Promise.all([
        supabase.from("employees").select("manager_uuid").in("manager_uuid", ids).eq("terminated", false),
        supabase.from("assessment_check_in_requests").select("employee_uuid,due_date").in("employee_uuid", ids).eq("status", "open"),
        supabase.from("assessment_action_items").select("employee_uuid,due_date,status").in("employee_uuid", ids).eq("is_required", true).not("status", "in", "(completed,done,closed)"),
        supabase.from("manager_budgets").select("merit_budget_amount,approval_status").eq("manager_uuid", me.uuid).eq("fiscal_year", fiscalYear).maybeSingle(),
      ]);
      const counts: Record<string, number> = {};
      (sub ?? []).forEach((s) => { if (s.manager_uuid) counts[s.manager_uuid] = (counts[s.manager_uuid] ?? 0) + 1; });
      setTeam((people ?? []).filter((p) => p.uuid !== me.uuid).map((p) => ({ ...p, reports: counts[p.uuid] ?? 0 })));
      setRequests(req ?? []);
      setActions(act ?? []);
      setBudget(bud ? { amount: Number(bud.merit_budget_amount), status: bud.approval_status } : null);
    })();
  }, [fiscalYear]);

  const reviewBy = Object.fromEntries(reviews.map((r) => [r.employee_uuid, r]));
  const nameOf = (id: string) => { const p = team.find((t) => t.uuid === id); return p ? `${p.first_name} ${p.last_name}` : reviewBy[id]?.employee_name ?? "Team member"; };
  const noAssessment = reviews.filter((r) => !r.assessment_attempt_id);
  const used = reviews.reduce((s, r) => s + Number(r.merit_amount ?? 0), 0);
  const pct = budget?.amount ? Math.min(100, Math.round((used / budget.amount) * 100)) : 0;
  const leaders = team.filter((p) => p.reports > 0);

  return (
    <section className="space-y-4" id="director">
      <div><h2 className="font-semibold">Director view</h2><p className="text-sm text-muted-foreground">Your direct team, assessments still owed, and where each pay recommendation sits. You see your direct reports only; managers below you run their own teams.</p></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">My team · {team.length}</h3></div>
          <ul className="space-y-2 text-sm">{team.map((p) => <li key={p.uuid} className="flex items-center justify-between gap-2"><Link to={`/people/${p.uuid}`} className="min-w-0 truncate hover:text-primary">{p.first_name} {p.last_name}<span className="block truncate text-xs text-muted-foreground">{p.title ?? "—"}</span></Link>{p.reports > 0 && <Badge variant="outline" className="shrink-0">Leads {p.reports}</Badge>}</li>)}</ul>
          {leaders.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{leaders.length} of your reports manage their own teams. <Link to="/org" className="text-primary">See org chart</Link></p>}
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Pending assessments · {noAssessment.length + requests.length}</h3></div>
          <ul className="space-y-2 text-sm">
            {noAssessment.map((r) => <li key={r.id} className="flex justify-between gap-2"><span>{r.employee_name}</span><span className="text-xs text-muted-foreground">Not taken</span></li>)}
            {requests.map((q, i) => <li key={`q${i}`} className="flex justify-between gap-2"><span>{nameOf(q.employee_uuid)}</span><span className="text-xs text-muted-foreground">Check-in{q.due_date ? ` · due ${q.due_date}` : ""}</span></li>)}
            {!noAssessment.length && !requests.length && <li className="text-muted-foreground">All assessments are in.</li>}
          </ul>
          {actions.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{actions.length} required improvement action{actions.length === 1 ? "" : "s"} still open. <Link to="/improvement" className="text-primary">Review actions</Link></p>}
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Pay review</h3></div>
          {budget ? <div className="mb-3"><div className="mb-1 flex justify-between text-xs"><span>{money(used)} of {money(budget.amount)}</span><span className="text-muted-foreground">{budget.status === "approved" ? "Budget approved" : "Budget awaiting approval"}</span></div><Progress value={pct} aria-label={`${pct}% of merit budget planned`} /></div> : <p className="mb-3 text-xs text-muted-foreground">No merit budget set for {fiscalYear}.</p>}
          <ul className="space-y-2 text-sm">{reviews.map((r) => { const s = payStatus(r); return <li key={r.id} className="flex items-center justify-between gap-2"><Link to={`/apr?focus=${r.id}`} className="truncate hover:text-primary">{r.employee_name}</Link><span className="flex shrink-0 items-center gap-2"><span className="text-xs text-muted-foreground">{r.merit_percent != null ? `${r.merit_percent}%` : ""}</span><Badge variant={s.variant}>{s.label}</Badge></span></li>; })}</ul>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full"><Link to="/apr">Open pay review</Link></Button>
        </div>
      </div>
    </section>
  );
}
