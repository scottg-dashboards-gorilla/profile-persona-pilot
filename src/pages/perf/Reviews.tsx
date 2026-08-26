import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { Loader2, Play, CheckCircle2, Search, Users, Link as LinkIcon, ListChecks, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusPill, computeReviewTone } from "@/components/perf/StatusPill";
import { formatCompDelta } from "@/data/mockEmployees";
import { CompleteReviewDialog, type ReviewRow } from "@/components/perf/CompleteReviewDialog";
import { ContributorsDialog } from "@/components/perf/ContributorsDialog";
import { ReviewFlowDialog } from "@/components/perf/ReviewFlowDialog";
import { RemindersDialog } from "@/components/perf/RemindersDialog";
import { ReviewTimeline, buildReviewStages } from "@/components/perf/ReviewTimeline";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";



type TabKey = "upcoming" | "in_progress" | "completed";

const ratingLabel: Record<string, string> = {
  exceeds: "Exceeds",
  meets: "Meets",
  below: "Below",
};

export default function Reviews() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ReviewRow | null>(null);
  const [contributorsFor, setContributorsFor] = useState<ReviewRow | null>(null);
  const [flowFor, setFlowFor] = useState<ReviewRow | null>(null);
  const [remindersOpen, setRemindersOpen] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [attemptByReview, setAttemptByReview] = useState<Record<string, string | null>>({});
  const [selfByReview, setSelfByReview] = useState<Record<string, string | null>>({});
  const [contribByReview, setContribByReview] = useState<
    Record<string, { total: number; submitted: number; lastAt: string | null }>
  >({});

  async function fetchRows() {
    setLoading(true);
    const { data, error } = await supabase
      .from("performance_reviews")
      .select("*")
      .order("scheduled_date", { ascending: true });
    if (error) {
      toast({ title: "Couldn't load reviews", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as ReviewRow[]);
      const ids = (data ?? []).map((r: any) => r.id);
      if (ids.length > 0) {
        const [{ data: atts }, { data: sas }, { data: cs }] = await Promise.all([
          supabase.from("assessment_attempts").select("id, review_id, submitted_at").in("review_id", ids),
          supabase.from("review_self_assessments").select("review_id, submitted_at").in("review_id", ids),
          supabase.from("review_contributors").select("review_id, status, submitted_at").in("review_id", ids),
        ]);
        const map: Record<string, string | null> = {};
        (atts ?? []).forEach((a: any) => {
          if (!map[a.review_id]) map[a.review_id] = a.submitted_at ? "submitted" : "in_progress";
        });
        setAttemptByReview(map);

        const selfMap: Record<string, string | null> = {};
        (sas ?? []).forEach((s: any) => {
          selfMap[s.review_id] = s.submitted_at ?? null;
        });
        setSelfByReview(selfMap);

        const cMap: Record<string, { total: number; submitted: number; lastAt: string | null }> = {};
        (cs ?? []).forEach((c: any) => {
          const entry = cMap[c.review_id] ?? { total: 0, submitted: 0, lastAt: null };
          entry.total += 1;
          if (c.status === "submitted") {
            entry.submitted += 1;
            if (c.submitted_at && (!entry.lastAt || c.submitted_at > entry.lastAt)) {
              entry.lastAt = c.submitted_at;
            }
          }
          cMap[c.review_id] = entry;
        });
        setContribByReview(cMap);
      }
    }
    setLoading(false);
  }

  function stagesFor(r: ReviewRow) {
    const c = contribByReview[r.id];
    return buildReviewStages({
      kickoff_at: (r as any).kickoff_at ?? null,
      status: r.status,
      scheduled_date: r.scheduled_date,
      completed_date: r.completed_date,
      comp_adjustment_amount: r.comp_adjustment_amount,
      comp_approval_status: (r as any).comp_approval_status ?? null,
      comp_approved_at: (r as any).comp_approved_at ?? null,
      released_at: (r as any).released_at ?? null,
      employee_ack_at: (r as any).employee_ack_at ?? null,
      selfSubmittedAt: selfByReview[r.id] ?? null,
      contributorsTotal: c?.total ?? 0,
      contributorsSubmitted: c?.submitted ?? 0,
      contributorsLastAt: c?.lastAt ?? null,
    });
  }

  function copyAssessmentLink(row: ReviewRow) {
    const url = `${window.location.origin}/assessment?review=${row.id}&employee=${row.employee_uuid}`;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: "Assessment link copied", description: url }),
      () => toast({ title: "Couldn't copy", description: url, variant: "destructive" }),
    );
  }


  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open a review when ?focus=<id> is supplied (e.g. from Overview "Up next")
  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (!focusId || rows.length === 0) return;
    const row = rows.find((r) => r.id === focusId);
    if (row) {
      setEditing(row);
      if (row.status === "in_progress") setTab("in_progress");
      else if (row.status === "completed") setTab("completed");
      else setTab("upcoming");
      const next = new URLSearchParams(searchParams);
      next.delete("focus");
      setSearchParams(next, { replace: true });
    }
  }, [rows, searchParams, setSearchParams]);

  const cycleFilter = searchParams.get("cycle");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (cycleFilter && (r as any).cycle_id !== cycleFilter) return false;
      if (q && !`${r.employee_name} ${r.department ?? ""}`.toLowerCase().includes(q)) return false;
      if (tab === "upcoming") return r.status === "scheduled";
      if (tab === "in_progress") return r.status === "in_progress";
      return r.status === "completed";
    });
  }, [rows, query, tab, cycleFilter]);

  const counts = useMemo(
    () => ({
      upcoming: rows.filter((r) => r.status === "scheduled").length,
      in_progress: rows.filter((r) => r.status === "in_progress").length,
      completed: rows.filter((r) => r.status === "completed").length,
    }),
    [rows],
  );

  async function patchRow(id: string, patch: Partial<ReviewRow>) {
    setBusyId(id);
    const { error } = await supabase.from("performance_reviews").update(patch).eq("id", id);
    setBusyId(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  }


  async function kickoff(row: ReviewRow) {
    const ok = await patchRow(row.id, {
      status: "in_progress",
      kickoff_at: new Date().toISOString(),
    } as Partial<ReviewRow>);
    if (ok) {
      toast({ title: "Review kicked off", description: row.employee_name });
      fetchRows();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employee or department"
            className="pl-8 w-80 h-9"
          />
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setRemindersOpen(true)}>
          <BellRing className="h-4 w-4 mr-1" /> Reminders
        </Button>
        <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>


      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming · {counts.upcoming}</TabsTrigger>
          <TabsTrigger value="in_progress">In progress · {counts.in_progress}</TabsTrigger>
          <TabsTrigger value="completed">Completed · {counts.completed}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>{tab === "completed" ? "Completed" : "Scheduled"}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Workflow</TableHead>
                    {tab === "completed" ? (
                      <>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comp change</TableHead>
                      </>
                    ) : (
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    )}

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Loading reviews…
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        No reviews in this view.
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    filtered.map((r) => {
                      const dateStr =
                        tab === "completed"
                          ? r.completed_date && format(parseISO(r.completed_date), "MMM d, yyyy")
                          : format(parseISO(r.scheduled_date), "MMM d, yyyy");
                      const busy = busyId === r.id;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.employee_name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.department ?? "—"}</TableCell>
                          <TableCell>{dateStr ?? "—"}</TableCell>
                          <TableCell>
                            <StatusPill
                              tone={computeReviewTone(
                                r.status as "scheduled" | "in_progress" | "completed" | "cancelled",
                                r.scheduled_date,
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="cursor-pointer"
                              onClick={() => setFlowFor(r)}
                              title="Open the workflow panel"
                            >
                              <ReviewTimeline stages={stagesFor(r)} />
                            </button>
                          </TableCell>

                          {tab === "completed" ? (
                            <>
                              <TableCell>
                                {r.overall_rating && (
                                  <StatusPill
                                    tone={
                                      r.overall_rating === "exceeds"
                                        ? "completed"
                                        : r.overall_rating === "below"
                                          ? "overdue"
                                          : "in_progress"
                                    }
                                    label={ratingLabel[r.overall_rating] ?? r.overall_rating}
                                  />
                                )}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "font-medium",
                                  (r.comp_adjustment_amount ?? 0) > 0 && "text-emerald-700",
                                  (r.comp_adjustment_amount ?? 0) < 0 && "text-red-700",
                                )}
                              >
                                {formatCompDelta(r.comp_adjustment_amount, r.comp_adjustment_percent)}
                                {r.promotion && <span className="ml-2 text-xs text-primary">★ Promoted</span>}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right pr-2">
                              <div className="inline-flex items-center gap-1">
                                {tab === "upcoming" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() => kickoff(r)}
                                    title="Kickoff"
                                  >
                                    <Play className="h-3.5 w-3.5 mr-1" /> Kickoff
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyAssessmentLink(r)}
                                  title="Copy assessment link for this cycle"
                                >
                                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                                  Assess
                                  {attemptByReview[r.id] === "submitted" && (
                                    <span className="ml-1 text-emerald-600">✓</span>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setContributorsFor(r)}
                                  title="Manage contributors"
                                >
                                  <Users className="h-3.5 w-3.5 mr-1" /> Contributors
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setFlowFor(r)}
                                  title="Step-by-step workflow: who does what next"
                                >
                                  <ListChecks className="h-3.5 w-3.5 mr-1" /> Workflow
                                </Button>

                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={busy}
                                  onClick={() => setEditing(r)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CompleteReviewDialog
        review={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => {
          setEditing(null);
          fetchRows();
        }}
      />

      <ContributorsDialog
        reviewId={contributorsFor?.id ?? null}
        employeeUuid={contributorsFor?.employee_uuid}
        employeeName={contributorsFor?.employee_name}
        onOpenChange={(open) => !open && setContributorsFor(null)}
      />

      <ReviewFlowDialog
        reviewId={flowFor?.id ?? null}
        onOpenChange={(open) => !open && setFlowFor(null)}
        onChanged={fetchRows}
        onOpenContributors={() => {
          setContributorsFor(flowFor);
          setFlowFor(null);
        }}
        onOpenComplete={() => {
          setEditing(flowFor);
          setFlowFor(null);
        }}
      />

    </div>
  );
}