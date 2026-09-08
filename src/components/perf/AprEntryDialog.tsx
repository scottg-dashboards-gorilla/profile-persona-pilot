import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ArrowUpRight, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/compensation";
import {
  IC_TARGET,
  RATING_SCALE,
  budgetGate,
  ratingBand,
  type ManagerBudget,
} from "@/lib/pmp";

export type AprReview = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  department: string | null;
  title: string | null;
  current_annual_comp: number | null;
  fiscal_year: number | null;
  scheduled_date: string;
  rating_score: number | null;
  merit_percent: number | null;
  merit_amount: number | null;
  bonus_eligible: boolean;
  bonus_amount: number | null;
  ic_score: number | null;
  is_executive: boolean;
  exec_payout_amount: number | null;
  apr_stage: string;
  escalation_status: string;
  escalation_note: string | null;
  promotion: boolean;
  new_title: string | null;
};

type Props = {
  review: AprReview | null;
  fiscalYear: number;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function AprEntryDialog({ review, fiscalYear, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<string>("3");
  const [meritPercent, setMeritPercent] = useState("");
  const [bonusEligible, setBonusEligible] = useState(false);
  const [bonus, setBonus] = useState("");
  const [ic, setIc] = useState("");
  const [execPayout, setExecPayout] = useState("");
  const [note, setNote] = useState("");
  const [pdrScore, setPdrScore] = useState<number | null>(null);
  const [budget, setBudget] = useState<ManagerBudget | null>(null);
  const [teamPlanned, setTeamPlanned] = useState({ merit: 0, bonus: 0, eligible: 0 });
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!review) return;
    setScore(String(review.rating_score ?? 3));
    setMeritPercent(review.merit_percent?.toString() ?? "");
    setBonusEligible(review.bonus_eligible);
    setBonus(review.bonus_amount?.toString() ?? "");
    setIc(review.ic_score?.toString() ?? "");
    setExecPayout(review.exec_payout_amount?.toString() ?? "");
    setNote(review.escalation_note ?? "");
    setBlockedMsg(null);
  }, [review]);

  const loadContext = useCallback(async () => {
    if (!review) return;
    const { data: emp } = await supabase
      .from("employees")
      .select("manager_uuid")
      .eq("uuid", review.employee_uuid)
      .maybeSingle();
    const mgr = (emp as { manager_uuid: string | null } | null)?.manager_uuid ?? null;

    const [{ data: pdr }, budgetRes, teamRes] = await Promise.all([
      supabase
        .from("pdr_forms")
        .select("year_end_score")
        .eq("employee_uuid", review.employee_uuid)
        .eq("fiscal_year", fiscalYear)
        .maybeSingle(),
      mgr
        ? supabase.from("manager_budgets").select("*").eq("manager_uuid", mgr).eq("fiscal_year", fiscalYear).maybeSingle()
        : Promise.resolve({ data: null }),
      mgr
        ? supabase.from("employees").select("uuid").eq("manager_uuid", mgr).eq("terminated", false)
        : Promise.resolve({ data: [] }),
    ]);

    setPdrScore((pdr as { year_end_score: number | null } | null)?.year_end_score ?? null);
    setBudget((budgetRes.data as ManagerBudget) ?? null);

    const peers = ((teamRes.data ?? []) as { uuid: string }[]).map((e) => e.uuid);
    if (peers.length > 0) {
      const { data: revs } = await supabase
        .from("performance_reviews")
        .select("id, merit_amount, bonus_amount, fiscal_year")
        .in("employee_uuid", peers)
        .eq("fiscal_year", fiscalYear);
      const others = ((revs ?? []) as { id: string; merit_amount: number | null; bonus_amount: number | null }[]).filter(
        (r) => r.id !== review.id,
      );
      setTeamPlanned({
        merit: others.reduce((s, r) => s + (r.merit_amount ?? 0), 0),
        bonus: others.reduce((s, r) => s + (r.bonus_amount ?? 0), 0),
        eligible: peers.length,
      });
    } else {
      setTeamPlanned({ merit: 0, bonus: 0, eligible: 0 });
    }
  }, [review, fiscalYear]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  if (!review) return null;

  const comp = Number(review.current_annual_comp ?? 0);
  const meritPct = meritPercent === "" ? 0 : Number(meritPercent);
  const meritAmount = Math.round((comp * meritPct) / 100);
  const bonusAmount = bonus === "" ? 0 : Number(bonus);

  const gate = budgetGate({
    eligibleCount: teamPlanned.eligible,
    budget,
    plannedMerit: teamPlanned.merit + meritAmount,
    plannedBonus: teamPlanned.bonus + bonusAmount,
  });

  async function save(escalate = false) {
    setSaving(true);
    setBlockedMsg(null);
    const body: Record<string, unknown> = {
      fiscal_year: fiscalYear,
      rating_score: Number(score),
      overall_rating: ratingBand(Number(score)),
      merit_percent: meritPercent === "" ? null : meritPct,
      merit_amount: meritPercent === "" ? null : meritAmount,
      comp_adjustment_amount: meritPercent === "" ? null : meritAmount,
      comp_adjustment_percent: meritPercent === "" ? null : meritPct,
      bonus_eligible: bonusEligible,
      bonus_amount: bonusEligible && bonus !== "" ? bonusAmount : null,
      ic_score: ic === "" ? null : Number(ic),
      exec_payout_amount: review.is_executive && execPayout !== "" ? Number(execPayout) : null,
      escalation_note: note || null,
    };
    if (escalate) {
      body.escalation_status = "pending";
      body.apr_stage = "escalated";
    }
    const { error } = await supabase.from("performance_reviews").update(body).eq("id", review.id);
    setSaving(false);
    if (error) {
      if (/Over (merit|bonus) budget/i.test(error.message)) {
        setBlockedMsg(error.message);
        toast({
          title: "Over budget — can't save",
          description: "Escalate to the next-level manager for an exception.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Didn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: escalate ? "Sent up for an exception" : "Pay entry saved",
      description: escalate ? "The next-level manager can approve or send it back." : review.employee_name,
    });
    onSaved();
  }

  return (
    <Dialog open={!!review} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay review entry · {review.employee_name}</DialogTitle>
          <DialogDescription>
            Manager step, Dec – Jan 1st half. Merit and bonus draw from separate budgets.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Performance rating</Label>
            <Select value={score} onValueChange={setScore}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RATING_SCALE.map((r) => (
                  <SelectItem key={r.score} value={String(r.score)}>{r.short}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {pdrScore != null
                ? `Year-end PDR score on file: ${pdrScore} / 5.`
                : "No year-end PDR score recorded for this year yet."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Merit %</Label>
              <Input type="number" step="0.1" value={meritPercent} onChange={(e) => setMeritPercent(e.target.value)} placeholder="0" />
              <p className="text-xs text-muted-foreground">
                {meritPercent === "" ? "No merit entered" : `${formatMoney(meritAmount)} on ${formatMoney(comp)}`}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>I/C score</Label>
              <Input type="number" step="1" value={ic} onChange={(e) => setIc(e.target.value)} placeholder={String(IC_TARGET)} />
              <p className="text-xs text-muted-foreground">Team must average {IC_TARGET}.</p>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="bel" checked={bonusEligible} onCheckedChange={(v) => setBonusEligible(!!v)} />
              <Label htmlFor="bel" className="cursor-pointer">Bonus eligible</Label>
            </div>
            {bonusEligible && (
              <div className="grid gap-2">
                <Label className="text-xs">Bonus amount</Label>
                <Input type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0" />
              </div>
            )}
          </div>

          {review.is_executive && (
            <div className="grid gap-2">
              <Label>Executive pay-out</Label>
              <Input type="number" value={execPayout} onChange={(e) => setExecPayout(e.target.value)} placeholder="0" />
              <p className="text-xs text-muted-foreground">Executives only.</p>
            </div>
          )}

          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <div className="font-medium">Team budget</div>
            {!gate.enforced ? (
              <p className="text-xs text-muted-foreground">
                {teamPlanned.eligible < 5
                  ? `Budget block only applies to managers with 5 or more eligible reports (this team has ${teamPlanned.eligible}).`
                  : "No budget has been set for this manager and year yet."}
              </p>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span>Merit left after this entry</span>
                  <span className={gate.meritOver ? "text-red-600 font-medium" : "text-emerald-700"}>
                    {formatMoney(gate.meritRemaining)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Bonus left after this entry</span>
                  <span className={gate.bonusOver ? "text-red-600 font-medium" : "text-emerald-700"}>
                    {formatMoney(gate.bonusRemaining)}
                  </span>
                </div>
              </>
            )}
          </div>

          {(gate.blocked || blockedMsg) && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Over budget — this can't be saved as it stands</div>
                  <p className="text-xs">
                    Reduce the amount, or escalate to the next-level manager with a reason. Unspent merit
                    cannot fund bonus, and vice versa.
                  </p>
                </div>
              </div>
              <Textarea rows={2} placeholder="Reason for the exception…" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}

          {review.escalation_status !== "none" && (
            <Badge variant="secondary" className="w-fit">
              Exception {review.escalation_status}
            </Badge>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          {(gate.blocked || blockedMsg) && (
            <Button variant="secondary" onClick={() => save(true)} disabled={saving || !note.trim()}>
              <ArrowUpRight className="h-4 w-4 mr-1" /> Escalate
            </Button>
          )}
          <Button onClick={() => save(false)} disabled={saving || gate.blocked}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AprEntryDialog;
