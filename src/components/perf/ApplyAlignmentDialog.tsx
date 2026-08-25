import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { shiftRating } from "@/lib/calibration";
import { Loader2, Scale } from "lucide-react";

export type AlignableReview = {
  id: string;
  employee_name: string;
  overall_rating: string;
  notes: string | null;
};

const ratingLabel: Record<string, string> = {
  exceeds: "Exceeds",
  meets: "Meets",
  below: "Below",
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reviewerName: string;
  adjustment: number;
  companyMean: number;
  reviews: AlignableReview[];
  onApplied: () => void;
};

export default function ApplyAlignmentDialog({
  open,
  onOpenChange,
  reviewerName,
  adjustment,
  companyMean,
  reviews,
  onApplied,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState(
    `Calibration: ${reviewerName} rated ${Math.abs(adjustment).toFixed(1)} ${
      adjustment < 0 ? "above" : "below"
    } the company average of ${companyMean.toFixed(1)}; ratings shifted by ${
      adjustment > 0 ? "+" : ""
    }${adjustment.toFixed(1)} to align.`,
  );

  const rows = useMemo(
    () =>
      reviews.map((r) => ({
        ...r,
        next: shiftRating(r.overall_rating, adjustment),
      })),
    [reviews, adjustment],
  );

  const changing = rows.filter((r) => r.next !== r.overall_rating && !skipped[r.id]);

  async function apply() {
    if (!reason.trim()) {
      toast.error("Add a reason so the change is explained in the audit log.");
      return;
    }
    setSaving(true);
    const stamp = new Date().toISOString().slice(0, 10);
    let ok = 0;
    for (const r of changing) {
      const note = `[${stamp}] ${reason.trim()} (${ratingLabel[r.overall_rating]} → ${
        ratingLabel[r.next]
      })`;
      const { error } = await supabase
        .from("performance_reviews")
        .update({
          overall_rating: r.next,
          notes: r.notes ? `${r.notes}\n${note}` : note,
        })
        .eq("id", r.id);
      if (error) {
        toast.error(`Could not update ${r.employee_name}: ${error.message}`);
      } else {
        ok += 1;
      }
    }
    setSaving(false);
    if (ok) {
      toast.success(
        `Aligned ${ok} rating${ok === 1 ? "" : "s"} — the change and reason are in the audit log.`,
      );
      onApplied();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" /> Apply suggested alignment
          </DialogTitle>
          <DialogDescription>
            Shifts {reviewerName}'s ratings by {adjustment > 0 ? "+" : ""}
            {adjustment.toFixed(1)} and records the reason on each review, which the audit log
            captures automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="max-h-60 overflow-y-auto rounded-md border border-border divide-y">
            {rows.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">
                No rated reviews found for this reviewer in the selected cycle.
              </p>
            )}
            {rows.map((r) => {
              const noChange = r.next === r.overall_rating;
              return (
                <div key={r.id} className="flex items-center gap-3 p-2.5 text-sm">
                  <Checkbox
                    checked={!noChange && !skipped[r.id]}
                    disabled={noChange}
                    onCheckedChange={(v) =>
                      setSkipped((p) => ({ ...p, [r.id]: !v }))
                    }
                  />
                  <span className="font-medium flex-1">{r.employee_name}</span>
                  <Badge variant="outline">{ratingLabel[r.overall_rating]}</Badge>
                  {noChange ? (
                    <span className="text-xs text-muted-foreground">no band change</span>
                  ) : (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline" className="bg-primary/10">
                        {ratingLabel[r.next]}
                      </Badge>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <Label className="text-xs">Reason recorded in the audit log</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={saving || changing.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Apply to {changing.length} review{changing.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
