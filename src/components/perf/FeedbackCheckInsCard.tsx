import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { checkInStatus, type FeedbackCheckIn } from "@/lib/checkIns";
import { FeedbackCheckInForm } from "./FeedbackCheckInForm";
import { cn } from "@/lib/utils";

type Props = {
  employeeUuid: string;
  employeeName: string;
  department: string | null;
  /** "manager" shows the start button and opens the manager side. */
  side: "manager" | "employee";
};

export function FeedbackCheckInsCard({ employeeUuid, employeeName, department, side }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<FeedbackCheckIn[]>([]);
  const [openRow, setOpenRow] = useState<FeedbackCheckIn | null>(null);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [required, setRequired] = useState(true);
  const [alsoAssessment, setAlsoAssessment] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("feedback_check_ins")
      .select("*")
      .eq("employee_uuid", employeeUuid)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as FeedbackCheckIn[]);
  }, [employeeUuid]);

  useEffect(() => {
    load();
  }, [load]);

  async function start() {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    let requesterName: string | null = null;
    if (auth.user) {
      const { data: me } = await supabase.from("employees").select("first_name,last_name").eq("user_id", auth.user.id).maybeSingle();
      if (me) requesterName = `${me.first_name} ${me.last_name}`.trim();
    }
    const { data, error } = await supabase
      .from("feedback_check_ins")
      .insert({
        employee_uuid: employeeUuid,
        employee_name: employeeName,
        department,
        note: note.trim() || null,
        due_date: due || null,
        employee_required: required,
        requester_name: requesterName,
      })
      .select("*")
      .single();
    if (!error && alsoAssessment) {
      await supabase.from("assessment_check_in_requests").insert({
        employee_uuid: employeeUuid,
        requested_by: auth.user?.id ?? null,
        requester_name: requesterName,
        note: note.trim() || "Requested with a feedback check-in",
        due_date: due || null,
      });
    }
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't start check-in", description: error.message, variant: "destructive" });
      return;
    }
    setStarting(false);
    setNote("");
    setDue("");
    await load();
    toast({ title: "Check-in started", description: required ? `${employeeName} has been asked to score themselves.` : "Score them now — it's shared once you submit." });
    setOpenRow(data as FeedbackCheckIn);
  }

  const mine = (c: FeedbackCheckIn) => (side === "manager" ? c.manager_submitted_at : c.employee_submitted_at);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Feedback check-ins</CardTitle>
          <CardDescription>
            Score DP INC values and department questions any time, outside the review cycle. Scores stay hidden until both
            sides submit, then count toward the year-end values score.
          </CardDescription>
        </div>
        {side === "manager" && (
          <Button size="sm" onClick={() => setStarting(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-1" /> Start check-in
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No check-ins yet.</p>
        ) : (
          rows.map((c) => {
            const s = checkInStatus(c);
            const needsMe = !mine(c) && (side === "manager" || c.employee_required);
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {new Date(c.created_at).toLocaleDateString()}
                    {c.requester_name ? ` · from ${c.requester_name}` : ""}
                    {c.due_date ? ` · due ${new Date(c.due_date + "T00:00:00").toLocaleDateString()}` : ""}
                  </div>
                  {c.note && <div className="text-xs text-muted-foreground truncate">“{c.note}”</div>}
                  <span className={cn("mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px]", s.tone)}>{s.label}</span>
                </div>
                <Button size="sm" variant={needsMe ? "default" : "outline"} onClick={() => setOpenRow(c)}>
                  {needsMe ? "Fill in" : "View"}
                </Button>
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={starting} onOpenChange={setStarting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a feedback check-in</DialogTitle>
            <DialogDescription>For {employeeName}. Use it to document concerns or recognise progress between reviews.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Note to the employee (optional)</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What prompted this check-in…" />
            </div>
            <div className="space-y-1">
              <Label>Due date</Label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="font-normal">Require the employee to score themselves</Label>
              <Switch checked={required} onCheckedChange={setRequired} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label className="font-normal">Also require the DISC / technical assessment</Label>
              <Switch checked={alsoAssessment} onCheckedChange={setAlsoAssessment} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStarting(false)}>Cancel</Button>
            <Button disabled={saving} onClick={start}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackCheckInForm
        checkIn={openRow}
        side={side}
        onOpenChange={(o) => !o && setOpenRow(null)}
        onChanged={async () => {
          await load();
        }}
      />
    </Card>
  );
}
