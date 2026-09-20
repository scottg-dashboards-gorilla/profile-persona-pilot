import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Send, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  employeeUuid: string;
  employeeName?: string;
  onRequested?: () => void;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary";
};

/**
 * Lets a manager or HR ask someone to take the assessment at any time — outside
 * a review — so they can see how they're tracking against their baseline.
 */
export function RequestCheckInButton({
  employeeUuid,
  employeeName,
  onRequested,
  size = "sm",
  variant = "outline",
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");

  const link = `${window.location.origin}/assessment?employee=${employeeUuid}`;

  async function submit() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    let requesterName: string | null = null;
    if (userData.user) {
      const { data: me } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (me) requesterName = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || null;
    }
    const { error } = await supabase.from("assessment_check_in_requests").insert({
      employee_uuid: employeeUuid,
      requested_by: userData.user?.id ?? null,
      requester_name: requesterName,
      note: note.trim() || null,
      due_date: dueDate || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't send the request", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Assessment check-in requested",
      description: `${employeeName ?? "They"} will see it on their review page with a link to start.`,
    });
    setNote("");
    setDueDate("");
    setOpen(false);
    onRequested?.();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Paste it into a message or email." });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className="gap-1.5">
          <Send className="h-3.5 w-3.5" /> Request assessment check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assessment check-in{employeeName ? ` · ${employeeName}` : ""}</DialogTitle>
          <DialogDescription>
            Ask for a fresh assessment at any point — not tied to a review. The result is compared
            against their baseline so you both see what's moved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Why now (optional)</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Six months on from your last one — let's see how the troubleshooting work has landed."
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Complete by (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" className="justify-start gap-1.5 text-xs" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5" /> Copy the assessment link instead
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
