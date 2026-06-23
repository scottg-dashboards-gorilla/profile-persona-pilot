import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect as useEffectAlias } from "react";

export type ReviewRow = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  department: string | null;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  overall_rating: string | null;
  comp_adjustment_amount: number | null;
  comp_adjustment_percent: number | null;
  comp_effective_date: string | null;
  promotion: boolean;
  new_title: string | null;
  notes: string | null;
  current_annual_comp: number | null;
  self_assessment_sent_at: string | null;
  manager_review_sent_at: string | null;
};

type Props = {
  review: ReviewRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export function CompleteReviewDialog({ review, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [contribStats, setContribStats] = useState<{
    submitted: number;
    invited: number;
    avgOverall: number | null;
    avgCollab: number | null;
    avgImpact: number | null;
  } | null>(null);

  const [rating, setRating] = useState<string>("meets");
  const [compAmount, setCompAmount] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>(today());
  const [promotion, setPromotion] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!review) return;
    setRating(review.overall_rating ?? "meets");
    setCompAmount(review.comp_adjustment_amount?.toString() ?? "");
    setEffectiveDate(review.comp_effective_date ?? today());
    setPromotion(review.promotion ?? false);
    setNewTitle(review.new_title ?? "");
    setNotes(review.notes ?? "");
  }, [review]);

  useEffectAlias(() => {
    if (!review) {
      setContribStats(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("review_contributors")
        .select("status, rating_overall, rating_collaboration, rating_impact")
        .eq("review_id", review.id);
      const rows = data ?? [];
      const submitted = rows.filter((r) => r.status === "submitted");
      const avg = (key: "rating_overall" | "rating_collaboration" | "rating_impact") => {
        const vals = submitted.map((r) => r[key]).filter((v): v is number => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };
      const avgOverall = avg("rating_overall");
      setContribStats({
        submitted: submitted.length,
        invited: rows.length,
        avgOverall,
        avgCollab: avg("rating_collaboration"),
        avgImpact: avg("rating_impact"),
      });
      // Suggest a rating based on the contributor average if the manager hasn't set one yet
      if (!review.overall_rating && avgOverall != null) {
        setRating(avgOverall >= 4 ? "exceeds" : avgOverall < 3 ? "below" : "meets");
      }
    })();
  }, [review]);

  if (!review) return null;

  const baseComp = Number(review.current_annual_comp ?? 0);
  const amountNum = compAmount === "" ? null : Number(compAmount);
  const pct = amountNum != null && baseComp > 0 ? (amountNum / baseComp) * 100 : null;

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("performance_reviews")
      .update({
        status: "completed",
        completed_date: today(),
        overall_rating: rating,
        comp_adjustment_amount: amountNum,
        comp_adjustment_percent: pct != null ? Number(pct.toFixed(2)) : null,
        comp_effective_date: amountNum != null ? effectiveDate : null,
        promotion,
        new_title: promotion ? newTitle || null : null,
        notes: notes || null,
      })
      .eq("id", review.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't complete review", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Review completed", description: `${review.employee_name}'s review is on file.` });
    onSaved();
  }

  return (
    <Dialog open={!!review} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Complete review · {review.employee_name}</DialogTitle>
          <DialogDescription>
            Record the outcome. This marks the review complete and stores comp and promotion details.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {contribStats && contribStats.invited > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">Contributor feedback</div>
                <div className="text-xs text-muted-foreground">
                  {contribStats.submitted} of {contribStats.invited} submitted
                </div>
              </div>
              {contribStats.submitted > 0 ? (
                <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                  <Stat label="Overall" value={contribStats.avgOverall} />
                  <Stat label="Collaboration" value={contribStats.avgCollab} />
                  <Stat label="Impact" value={contribStats.avgImpact} />
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  No submissions yet. The rating below stays your call.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Overall rating</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exceeds">Exceeds expectations</SelectItem>
                <SelectItem value="meets">Meets expectations</SelectItem>
                <SelectItem value="below">Below expectations</SelectItem>
              </SelectContent>
            </Select>
            {contribStats?.avgOverall != null && (
              <p className="text-xs text-muted-foreground">
                Suggested from contributor avg ({contribStats.avgOverall.toFixed(2)} / 5). Override anytime.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Comp adjustment ($/year)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={compAmount}
                onChange={(e) => setCompAmount(e.target.value)}
                placeholder="0"
              />
              {pct != null && (
                <p className="text-xs text-muted-foreground">
                  {pct >= 0 ? "+" : ""}
                  {pct.toFixed(2)}% of current {baseComp ? `$${baseComp.toLocaleString()}` : "comp"}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Effective date</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={amountNum == null}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="promo" checked={promotion} onCheckedChange={(v) => setPromotion(!!v)} />
            <Label htmlFor="promo" className="cursor-pointer">Promotion</Label>
          </div>
          {promotion && (
            <div className="grid gap-2">
              <Label>New title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Tier 2 Senior Tech" />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summary, themes, next-cycle focus areas…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Mark complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value == null ? "—" : value.toFixed(2)}</div>
    </div>
  );
}