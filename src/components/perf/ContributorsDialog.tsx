import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2, UserPlus, MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { StatusPill } from "./StatusPill";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { History } from "lucide-react";

export type ReviewContributor = {
  id: string;
  review_id: string;
  contributor_uuid: string;
  contributor_name: string;
  contributor_title: string | null;
  contributor_department: string | null;
  status: string;
  invited_at: string;
  submitted_at: string | null;
  rating_overall: number | null;
  rating_collaboration: number | null;
  rating_impact: number | null;
  strengths: string | null;
  improvements: string | null;
  anonymous: boolean;
  allow_resubmission: boolean;
  weight: number;
  current_version_id: string | null;
  submission_count: number;
};

export type ContributorVersion = {
  id: string;
  contributor_id: string;
  version: number;
  submitted_at: string;
  rating_overall: number | null;
  rating_collaboration: number | null;
  rating_impact: number | null;
  strengths: string | null;
  improvements: string | null;
};

type EmployeeOpt = { uuid: string; name: string; title: string | null; department: string | null };

type Props = {
  reviewId: string | null;
  employeeUuid?: string;
  employeeName?: string;
  onOpenChange: (open: boolean) => void;
};

export function ContributorsDialog({ reviewId, employeeUuid, employeeName, onOpenChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contributors, setContributors] = useState<ReviewContributor[]>([]);
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [pick, setPick] = useState<string>("");
  const [feedbackFor, setFeedbackFor] = useState<ReviewContributor | null>(null);
  const [historyFor, setHistoryFor] = useState<ReviewContributor | null>(null);

  async function load() {
    if (!reviewId) return;
    setLoading(true);
    const [{ data: cont }, { data: emps }] = await Promise.all([
      supabase
        .from("review_contributors")
        .select("*")
        .eq("review_id", reviewId)
        .order("invited_at", { ascending: true }),
      supabase
        .from("employees")
        .select("uuid, first_name, last_name, title, department")
        .eq("terminated", false),
    ]);
    setContributors((cont ?? []) as ReviewContributor[]);
    setEmployees(
      (emps ?? []).map((e) => ({
        uuid: e.uuid,
        name: `${e.first_name} ${e.last_name}`,
        title: e.title,
        department: e.department,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (reviewId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const available = employees.filter(
    (e) =>
      e.uuid !== employeeUuid &&
      !contributors.some((c) => c.contributor_uuid === e.uuid),
  );

  async function addContributor() {
    if (!pick || !reviewId) return;
    const emp = employees.find((e) => e.uuid === pick);
    if (!emp) return;
    const { error } = await supabase.from("review_contributors").insert({
      review_id: reviewId,
      contributor_uuid: emp.uuid,
      contributor_name: emp.name,
      contributor_title: emp.title,
      contributor_department: emp.department,
    });
    if (error) {
      toast({ title: "Couldn't invite", description: error.message, variant: "destructive" });
      return;
    }
    setPick("");
    toast({ title: "Invited", description: `${emp.name} will be asked for feedback.` });
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("review_contributors").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
      return;
    }
    load();
  }

  async function toggleResubmit(c: ReviewContributor, value: boolean) {
    const { error } = await supabase
      .from("review_contributors")
      .update({ allow_resubmission: value })
      .eq("id", c.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    load();
  }

  async function setWeight(c: ReviewContributor, value: number) {
    const safe = Number.isFinite(value) && value >= 0 ? value : 1;
    const { error } = await supabase
      .from("review_contributors")
      .update({ weight: safe })
      .eq("id", c.id);
    if (error) {
      toast({ title: "Couldn't update weight", description: error.message, variant: "destructive" });
      return;
    }
    load();
  }

  return (
    <>
      <Dialog open={!!reviewId} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback contributors{employeeName ? ` · ${employeeName}` : ""}</DialogTitle>
            <DialogDescription>
              Assign coworkers to submit a short feedback form. Their responses stay anonymous to the
              employee and are averaged into the manager's view.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-end gap-2">
            <div className="flex-1 grid gap-1.5">
              <Label className="text-xs">Add contributor</Label>
              <Select value={pick} onValueChange={setPick}>
                <SelectTrigger>
                  <SelectValue placeholder={available.length ? "Pick a coworker…" : "No one left to add"} />
                </SelectTrigger>
                <SelectContent>
                  {available.map((e) => (
                    <SelectItem key={e.uuid} value={e.uuid}>
                      {e.name} · {e.title ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addContributor} disabled={!pick}>
              <UserPlus className="h-4 w-4 mr-1" /> Invite
            </Button>
          </div>

          <div className="rounded-md border divide-y">
            {loading && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
              </div>
            )}
            {!loading && contributors.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No contributors yet — manager feedback only.
              </div>
            )}
            {!loading &&
              contributors.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{c.contributor_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.contributor_title ?? "—"}
                      {c.contributor_department ? ` · ${c.contributor_department}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Invited {format(parseISO(c.invited_at), "MMM d")}
                    {c.submitted_at && ` · Submitted ${format(parseISO(c.submitted_at), "MMM d")}`}
                  </div>
                  <StatusPill
                    tone={c.status === "submitted" ? "completed" : c.status === "declined" ? "cancelled" : "in_progress"}
                    label={c.status === "submitted" ? "Submitted" : c.status === "declined" ? "Declined" : "Invited"}
                  />
                  <Button size="sm" variant="ghost" onClick={() => setFeedbackFor(c)}>
                    <MessageSquarePlus className="h-4 w-4 mr-1" />
                    {c.status === "submitted" ? "View" : "Open form"}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContributorFeedbackDialog
        contributor={feedbackFor}
        onOpenChange={(open) => !open && setFeedbackFor(null)}
        onSaved={() => {
          setFeedbackFor(null);
          load();
        }}
      />
    </>
  );
}

function RatingSelect({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value == null ? "" : String(value)}
      onValueChange={(v) => onChange(v === "" ? null : Number(v))}
      disabled={disabled}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {[1, 2, 3, 4, 5].map((n) => (
          <SelectItem key={n} value={String(n)}>
            {n} · {["Far below", "Below", "Meets", "Above", "Exceptional"][n - 1]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ContributorFeedbackDialog({
  contributor,
  onOpenChange,
  onSaved,
}: {
  contributor: ReviewContributor | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [overall, setOverall] = useState<number | null>(null);
  const [collab, setCollab] = useState<number | null>(null);
  const [impact, setImpact] = useState<number | null>(null);
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");

  useEffect(() => {
    if (!contributor) return;
    setOverall(contributor.rating_overall);
    setCollab(contributor.rating_collaboration);
    setImpact(contributor.rating_impact);
    setStrengths(contributor.strengths ?? "");
    setImprovements(contributor.improvements ?? "");
  }, [contributor]);

  if (!contributor) return null;
  const readOnly = contributor.status === "submitted";

  async function save() {
    if (!contributor) return;
    if (overall == null) {
      toast({ title: "Overall rating required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("review_contributors")
      .update({
        rating_overall: overall,
        rating_collaboration: collab,
        rating_impact: impact,
        strengths: strengths || null,
        improvements: improvements || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", contributor.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Feedback submitted" });
    onSaved();
  }

  return (
    <Dialog open={!!contributor} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-lg")}>
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "Feedback from" : "Feedback as"} {contributor.contributor_name}
          </DialogTitle>
          <DialogDescription>
            Anonymous to the employee. Visible to the manager and HR. Ratings are 1–5.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Overall</Label>
            <RatingSelect value={overall} onChange={setOverall} disabled={readOnly} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Collaboration</Label>
              <RatingSelect value={collab} onChange={setCollab} disabled={readOnly} />
            </div>
            <div className="grid gap-1.5">
              <Label>Impact</Label>
              <RatingSelect value={impact} onChange={setImpact} disabled={readOnly} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Strengths</Label>
            <Textarea rows={3} value={strengths} onChange={(e) => setStrengths(e.target.value)} disabled={readOnly} />
          </div>
          <div className="grid gap-1.5">
            <Label>Areas to improve</Label>
            <Textarea rows={3} value={improvements} onChange={(e) => setImprovements(e.target.value)} disabled={readOnly} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{readOnly ? "Close" : "Cancel"}</Button>
          {!readOnly && (
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Submit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}