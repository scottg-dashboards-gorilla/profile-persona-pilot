import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, BellRing, Link as LinkIcon, Loader2, MailWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { copyToClipboard, createReviewToken, formUrl } from "@/lib/reviewLinks";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Outstanding = {
  key: string;
  kind: "self" | "contributor";
  reviewId: string;
  contributorId: string | null;
  who: string;
  email: string | null;
  employeeName: string;
  dueDate: string;
};

type Reminder = {
  id: string;
  review_id: string;
  contributor_id: string | null;
  kind: string;
  recipient_name: string | null;
  recipient_email: string | null;
  due_date: string;
  status: string;
  sent_at: string | null;
  created_at: string;
};

export function RemindersDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [log, setLog] = useState<Reminder[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: reviews }, { data: reminders }] = await Promise.all([
      supabase
        .from("performance_reviews")
        .select("id, employee_name, employee_email, scheduled_date, status")
        .eq("status", "in_progress")
        .lte("scheduled_date", today),
      supabase
        .from("review_reminders")
        .select(
          "id, review_id, contributor_id, kind, recipient_name, recipient_email, due_date, status, sent_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    setLog((reminders ?? []) as Reminder[]);

    const list = (reviews ?? []) as {
      id: string;
      employee_name: string;
      employee_email: string | null;
      scheduled_date: string;
      status: string;
    }[];
    const ids = list.map((r) => r.id);

    let selfDone = new Set<string>();
    let contributors: {
      id: string;
      review_id: string;
      contributor_name: string;
      contributor_uuid: string;
      status: string;
    }[] = [];

    if (ids.length) {
      const [{ data: sas }, { data: cs }] = await Promise.all([
        supabase
          .from("review_self_assessments")
          .select("review_id, submitted_at")
          .in("review_id", ids),
        supabase
          .from("review_contributors")
          .select("id, review_id, contributor_name, contributor_uuid, status")
          .in("review_id", ids)
          .neq("status", "submitted"),
      ]);
      selfDone = new Set(
        ((sas ?? []) as { review_id: string; submitted_at: string | null }[])
          .filter((s) => s.submitted_at)
          .map((s) => s.review_id),
      );
      contributors = (cs ?? []) as typeof contributors;
    }

    const emailByUuid = new Map<string, string | null>();
    const uuids = [...new Set(contributors.map((c) => c.contributor_uuid))];
    if (uuids.length) {
      const { data: emps } = await supabase.from("employees").select("uuid, email").in("uuid", uuids);
      ((emps ?? []) as { uuid: string; email: string | null }[]).forEach((e) =>
        emailByUuid.set(e.uuid, e.email),
      );
    }

    const rows: Outstanding[] = [];
    list.forEach((r) => {
      if (!selfDone.has(r.id)) {
        rows.push({
          key: `self-${r.id}`,
          kind: "self",
          reviewId: r.id,
          contributorId: null,
          who: r.employee_name,
          email: r.employee_email,
          employeeName: r.employee_name,
          dueDate: r.scheduled_date,
        });
      }
    });
    contributors.forEach((c) => {
      const r = list.find((x) => x.id === c.review_id);
      if (!r) return;
      rows.push({
        key: `contrib-${c.id}`,
        kind: "contributor",
        reviewId: c.review_id,
        contributorId: c.id,
        who: c.contributor_name,
        email: emailByUuid.get(c.contributor_uuid) ?? null,
        employeeName: r.employee_name,
        dueDate: r.scheduled_date,
      });
    });
    rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    setOutstanding(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function queueAll() {
    setQueueing(true);
    const { data, error } = await supabase.rpc("queue_review_reminders", {
      _grace_days: 0,
      _max: 200,
    });
    setQueueing(false);
    if (error) {
      toast({ title: "Couldn't queue reminders", description: error.message, variant: "destructive" });
      return;
    }
    const n = Number(data ?? 0);
    toast({
      title: n === 0 ? "Nothing new to remind" : `${n} reminder${n === 1 ? "" : "s"} queued`,
      description:
        n === 0
          ? "Everyone overdue has already been queued for this due date."
          : "They'll send as soon as an email sender domain is connected.",
    });
    load();
  }

  async function copyLink(row: Outstanding) {
    try {
      const token = await createReviewToken(
        row.reviewId,
        row.kind,
        row.kind === "contributor" ? row.contributorId : null,
      );
      await copyToClipboard(formUrl(token));
      toast({ title: "Private link copied", description: `Send it to ${row.who}.` });
    } catch (e) {
      toast({ title: "Couldn't create link", description: (e as Error).message, variant: "destructive" });
    }
  }

  const queued = log.filter((l) => l.status === "queued").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-4 w-4" /> Reminders
          </DialogTitle>
          <DialogDescription>
            Anyone whose form is still open past its due date. A scheduled job queues these
            automatically every morning; you can also queue them now.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs flex items-start gap-2">
          <MailWarning className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">Email sending isn't switched on yet.</span> Reminders are
            queued and tracked here, and will start going out automatically once a sender domain is
            connected for this workspace. Until then use “Copy link” to nudge people directly.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {loading ? "Checking…" : `${outstanding.length} outstanding · ${queued} queued`}
          </span>
          <Button size="sm" className="ml-auto" onClick={queueAll} disabled={queueing || loading}>
            {queueing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <BellRing className="h-3.5 w-3.5 mr-1" />}
            Queue reminders now
          </Button>
        </div>

        <div className="space-y-2">
          {!loading && outstanding.length === 0 && (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              Nothing overdue. Every open form is still within its due date.
            </div>
          )}
          {outstanding.map((row) => {
            const daysLate = differenceInCalendarDays(new Date(), parseISO(row.dueDate));
            const alreadyQueued = log.some(
              (l) =>
                l.review_id === row.reviewId &&
                l.kind === row.kind &&
                (l.contributor_id ?? null) === row.contributorId &&
                l.due_date === row.dueDate,
            );
            return (
              <div key={row.key} className="rounded-md border p-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{row.who}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {row.kind === "self" ? "Self-assessment" : `360 · for ${row.employeeName}`}
                    </Badge>
                    {alreadyQueued && (
                      <Badge className="text-[10px]" variant="outline">
                        Reminder queued
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    {daysLate > 0 && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                    Due {format(parseISO(row.dueDate), "MMM d, yyyy")}
                    {daysLate > 0 ? ` · ${daysLate} day${daysLate === 1 ? "" : "s"} late` : ""}
                    {row.email ? ` · ${row.email}` : " · no email on file"}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => copyLink(row)}>
                  <LinkIcon className="h-3.5 w-3.5 mr-1" /> Copy link
                </Button>
              </div>
            );
          })}
        </div>

        {log.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Reminder history
              </div>
              <div className="space-y-1">
                {log.slice(0, 25).map((l) => (
                  <div key={l.id} className="text-xs flex items-center gap-2">
                    <Badge
                      variant={l.status === "sent" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {l.status}
                    </Badge>
                    <span className="font-medium">{l.recipient_name ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {l.kind === "self" ? "self-assessment" : "360 feedback"} · due{" "}
                      {format(parseISO(l.due_date), "MMM d")} · queued{" "}
                      {format(parseISO(l.created_at), "MMM d, h:mma")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
