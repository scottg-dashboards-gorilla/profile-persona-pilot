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
import {
  aggregate,
  methodLabels,
  ratingBucket,
  type AggregationMethod,
} from "@/lib/contributorAggregation";
import { format, parseISO } from "date-fns";

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
  aggregation_method?: string | null;
};

type ContribRow = {
  id: string;
  contributor_name: string;
  status: string;
  submitted_at: string | null;
  submission_count: number;
  weight: number;
  current_version_id: string | null;
  rating_overall: number | null;
  rating_collaboration: number | null;
  rating_impact: number | null;
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
  const [contribs, setContribs] = useState<ContribRow[]>([]);
  const [method, setMethod] = useState<AggregationMethod>("mean");

  const [rating, setRating] = useState<string>("meets");
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [compAmount, setCompAmount] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>(today());
  const [promotion, setPromotion] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!review) return;
    setRating(review.overall_rating ?? "meets");
    setMethod(((review.aggregation_method as AggregationMethod) ?? "mean"));
    setAutoSuggest(!review.overall_rating);
    setCompAmount(review.comp_adjustment_amount?.toString() ?? "");
    setEffectiveDate(review.comp_effective_date ?? today());
    setPromotion(review.promotion ?? false);
    setNewTitle(review.new_title ?? "");
    setNotes(review.notes ?? "");
  }, [review]);

  useEffect(() => {
    if (!review) {
      setContribs([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("review_contributors")
        .select("id, contributor_name, status, submitted_at, submission_count, weight, current_version_id, rating_overall, rating_collaboration, rating_impact")
        .eq("review_id", review.id);
      setContribs((data ?? []) as ContribRow[]);
    })();
  }, [review]);

  if (!review) return null;

  const baseComp = Number(review.current_annual_comp ?? 0);
  const amountNum = compAmount === "" ? null : Number(compAmount);
  const pct = amountNum != null && baseComp > 0 ? (amountNum / baseComp) * 100 : null;

  const submitted = contribs.filter((c) => c.status === "submitted");
  const breakdown = {
    overall: aggregate(submitted, "rating_overall", method),
    collab: aggregate(submitted, "rating_collaboration", method),
    impact: aggregate(submitted, "rating_impact", method),
  };
  const suggestedBucket = ratingBucket(breakdown.overall);

  // Live-suggest rating from selected aggregation method while autoSuggest is on
  useEffect(() => {
    if (autoSuggest && suggestedBucket) setRating(suggestedBucket);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedBucket, autoSuggest]);

  async function handleSave() {
    setSaving(true);
    const selected_contributor_versions = contribs.reduce<Record<string, string>>((acc, c) => {
      if (c.current_version_id) acc[c.id] = c.current_version_id;
      return acc;
    }, {});
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
        aggregation_method: method,
        selected_contributor_versions,
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
          {contribs.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-medium">Contributor feedback</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {submitted.length} of {contribs.length} submitted
                  </span>
                  <Select value={method} onValueChange={(v) => setMethod(v as AggregationMethod)}>
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(methodLabels) as AggregationMethod[]).map((m) => (
                        <SelectItem key={m} value={m}>{methodLabels[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {submitted.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Stat label="Overall" value={breakdown.overall} />
                    <Stat label="Collaboration" value={breakdown.collab} />
                    <Stat label="Impact" value={breakdown.impact} />
                  </div>
                  <div className="border-t pt-2 space-y-1">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Submissions</div>
                    {contribs.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="truncate">
                          {c.contributor_name}
                          {c.submission_count > 1 && (
                            <span className="ml-1 text-amber-700">· resubmitted v{c.submission_count}</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {c.status === "submitted" && c.submitted_at
                            ? `${format(parseISO(c.submitted_at), "MMM d, h:mma")} · w${c.weight}`
                            : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No submissions yet. The rating below stays your call.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Overall rating</Label>
            <Select
              value={rating}
              onValueChange={(v) => {
                setRating(v);
                setAutoSuggest(false);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exceeds">Exceeds expectations</SelectItem>
                <SelectItem value="meets">Meets expectations</SelectItem>
                <SelectItem value="below">Below expectations</SelectItem>
              </SelectContent>
            </Select>
            {breakdown.overall != null && (
              <p className="text-xs text-muted-foreground">
                Suggested from {methodLabels[method].toLowerCase()} ({breakdown.overall.toFixed(2)} / 5).{" "}
                {autoSuggest ? "Pick a rating to override." : "Manager override active."}
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