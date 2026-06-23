import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy, CheckCircle2, ArrowRight, FlaskConical, Circle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type Employee = {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string | null;
  department: string | null;
};

type Step = 1 | 2 | 3 | 4;

type ProgressKey = "cycle" | "employee" | "review";
type ProgressState = "pending" | "running" | "done" | "error";
type ProgressMap = Record<ProgressKey, { state: ProgressState; label: string; detail?: string }>;

const PROGRESS_LABELS: Record<ProgressKey, string> = {
  cycle: "Create review cycle",
  employee: "Prepare employee",
  review: "Schedule overdue review",
};

function initialProgress(employeeMode: "existing" | "new"): ProgressMap {
  return {
    cycle: { state: "pending", label: PROGRESS_LABELS.cycle },
    employee: {
      state: "pending",
      label: employeeMode === "existing" ? "Select existing employee" : "Create new employee",
    },
    review: { state: "pending", label: PROGRESS_LABELS.review },
  };
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultCycleName() {
  const d = new Date();
  return `Test cycle · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

export function TestCycleWizard({ open, onOpenChange, onCompleted }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ProgressMap>(initialProgress("existing"));

  // Step 1: cycle
  const [cycleName, setCycleName] = useState(defaultCycleName());
  const today = new Date();
  const monthFromNow = new Date();
  monthFromNow.setDate(monthFromNow.getDate() + 30);
  const [startsAt, setStartsAt] = useState(isoDate(today));
  const [endsAt, setEndsAt] = useState(isoDate(monthFromNow));

  // Step 2: employee
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeMode, setEmployeeMode] = useState<"existing" | "new">("existing");
  const [selectedEmp, setSelectedEmp] = useState<string>("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTitle, setNewTitle] = useState("Tier 1 Help Desk");
  const [newDept, setNewDept] = useState("Engineering");

  // Step 3: review
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - 7);
  const [scheduledDate, setScheduledDate] = useState(isoDate(overdueDate));

  // Step 4: result
  const [createdCycleId, setCreatedCycleId] = useState<string | null>(null);
  const [createdReviewId, setCreatedReviewId] = useState<string | null>(null);
  const [createdEmployeeUuid, setCreatedEmployeeUuid] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("uuid,first_name,last_name,email,title,department")
        .eq("terminated", false)
        .order("first_name", { ascending: true });
      setEmployees((data ?? []) as Employee[]);
      if ((data ?? []).length > 0 && !selectedEmp) setSelectedEmp((data as any)[0].uuid);
    })();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setStep(1);
    setBusy(false);
    setCycleName(defaultCycleName());
    setStartsAt(isoDate(today));
    setEndsAt(isoDate(monthFromNow));
    setEmployeeMode("existing");
    setNewFirst("");
    setNewLast("");
    setNewEmail("");
    setScheduledDate(isoDate(overdueDate));
    setCreatedCycleId(null);
    setCreatedReviewId(null);
    setCreatedEmployeeUuid(null);
    setProgress(initialProgress("existing"));
  }

  const assessmentLink = useMemo(() => {
    if (!createdReviewId || !createdEmployeeUuid) return "";
    return `${window.location.origin}/assessment?review=${createdReviewId}&employee=${createdEmployeeUuid}`;
  }, [createdReviewId, createdEmployeeUuid]);

  const newEmpValid =
    newFirst.trim().length > 0 && newLast.trim().length > 0;

  async function runWizard() {
    setBusy(true);
    const next = initialProgress(employeeMode);
    setProgress(next);
    const mark = (key: ProgressKey, patch: Partial<ProgressMap[ProgressKey]>) =>
      setProgress((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

    try {
      // 1. Cycle
      mark("cycle", { state: "running" });
      const { data: cyc, error: cycErr } = await supabase
        .from("review_cycles")
        .insert({
          name: cycleName.trim() || defaultCycleName(),
          starts_at: startsAt,
          ends_at: endsAt,
          status: "active",
          review_types: ["self", "manager"],
          scope_type: "all",
        })
        .select("id")
        .single();
      if (cycErr) throw cycErr;
      const cycleId = cyc!.id as string;
      mark("cycle", { state: "done", detail: cycleName.trim() || defaultCycleName() });
      toast({ title: "Cycle created", description: cycleName.trim() || defaultCycleName() });

      // 2. Employee
      mark("employee", { state: "running" });
      let empUuid: string;
      let empName: string;
      let empEmail: string | null = null;
      let empDept: string | null = null;
      let empTitle: string | null = null;

      if (employeeMode === "existing") {
        const found = employees.find((e) => e.uuid === selectedEmp);
        if (!found) throw new Error("Select an employee to continue.");
        empUuid = found.uuid;
        empName = `${found.first_name} ${found.last_name}`.trim();
        empEmail = found.email;
        empDept = found.department;
        empTitle = found.title;
        mark("employee", { state: "done", detail: empName });
        toast({ title: "Employee selected", description: empName });
      } else {
        const stamp = Math.random().toString(36).slice(2, 8);
        empUuid = `test-${stamp}`;
        const { error: empErr } = await supabase.from("employees").insert({
          uuid: empUuid,
          first_name: newFirst.trim(),
          last_name: newLast.trim(),
          email: newEmail.trim() || `${newFirst.trim().toLowerCase()}.${newLast.trim().toLowerCase()}@test.local`,
          title: newTitle.trim() || null,
          department: newDept.trim() || null,
          hire_date: isoDate(today),
        });
        if (empErr) throw empErr;
        empName = `${newFirst.trim()} ${newLast.trim()}`;
        empEmail = newEmail.trim() || null;
        empDept = newDept.trim() || null;
        empTitle = newTitle.trim() || null;
        mark("employee", { state: "done", detail: `${empName} (${empUuid})` });
        toast({ title: "Employee created", description: empName });
      }

      // 3. Performance review (overdue)
      mark("review", { state: "running" });
      const { data: rev, error: revErr } = await supabase
        .from("performance_reviews")
        .insert({
          employee_uuid: empUuid,
          employee_name: empName,
          employee_email: empEmail,
          department: empDept,
          title: empTitle,
          scheduled_date: scheduledDate,
          status: "scheduled",
          cycle_id: cycleId,
          review_type: "manager",
          review_cycle: "annual",
        })
        .select("id")
        .single();
      if (revErr) throw revErr;
      mark("review", { state: "done", detail: `Scheduled ${scheduledDate}` });
      toast({ title: "Overdue review scheduled", description: empName });

      setCreatedCycleId(cycleId);
      setCreatedReviewId(rev!.id as string);
      setCreatedEmployeeUuid(empUuid);
      setStep(4);
      onCompleted?.();
      toast({ title: "Test cycle ready", description: "Assessment link generated." });
    } catch (e: any) {
      setProgress((p) => {
        const order: ProgressKey[] = ["cycle", "employee", "review"];
        const runningKey = order.find((k) => p[k].state === "running");
        if (!runningKey) return p;
        return { ...p, [runningKey]: { ...p[runningKey], state: "error", detail: e?.message } };
      });
      toast({
        title: "Couldn't create test cycle",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!assessmentLink) return;
    navigator.clipboard.writeText(assessmentLink).then(
      () => toast({ title: "Assessment link copied" }),
      () => toast({ title: "Couldn't copy link", variant: "destructive" }),
    );
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const canNext1 = cycleName.trim().length > 0 && startsAt && endsAt && startsAt <= endsAt;
  const canNext2 =
    employeeMode === "existing" ? !!selectedEmp : newEmpValid;
  const canRun = !!scheduledDate;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Test review cycle
          </DialogTitle>
          <DialogDescription>
            Spin up a cycle, employee, and overdue review in one go to exercise the assessment flow.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`px-2 py-0.5 rounded-full border ${step === n ? "bg-primary text-primary-foreground border-primary" : ""}`}
            >
              {n}. {["Cycle", "Employee", "Review", "Done"][n - 1]}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Cycle name</Label>
              <Input value={cycleName} onChange={(e) => setCycleName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts</Label>
                <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label>Ends</Label>
                <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-border p-1 text-xs">
              {(["existing", "new"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEmployeeMode(m)}
                  className={`px-3 py-1 rounded-full ${employeeMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {m === "existing" ? "Pick existing" : "Create new"}
                </button>
              ))}
            </div>

            {employeeMode === "existing" ? (
              <div>
                <Label>Employee</Label>
                <Select value={selectedEmp} onValueChange={setSelectedEmp}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.uuid} value={e.uuid}>
                        {e.first_name} {e.last_name}
                        {e.department ? ` · ${e.department}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name</Label>
                  <Input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={newLast} onChange={(e) => setNewLast(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label>Email (optional)</Label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="auto-generated if blank" />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Department</Label>
                  <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div>
              <Label>Scheduled date</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Defaults to 7 days ago so it shows up as overdue on the Overview.
              </p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <div><strong>Cycle:</strong> {cycleName} ({startsAt} → {endsAt})</div>
              <div>
                <strong>Employee:</strong>{" "}
                {employeeMode === "existing"
                  ? employees.find((e) => e.uuid === selectedEmp)?.first_name + " " + employees.find((e) => e.uuid === selectedEmp)?.last_name
                  : `${newFirst} ${newLast} (new)`}
              </div>
              <div><strong>Review:</strong> overdue manager review</div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Test cycle ready</span>
            </div>
            <div>
              <Label>Assessment link</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={assessmentLink} className="font-mono text-xs" />
                <Button size="sm" type="button" onClick={copyLink}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Open this in a private window to play the candidate. The submission will link to this review and cycle.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" asChild>
                <Link to={`/reviews?focus=${createdReviewId}`} onClick={() => handleOpenChange(false)}>
                  Open review <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
              {createdEmployeeUuid && (
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/people/${createdEmployeeUuid}`} onClick={() => handleOpenChange(false)}>
                    View employee
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between gap-2">
          {step < 4 ? (
            <>
              <Button
                variant="ghost"
                onClick={() => (step === 1 ? handleOpenChange(false) : setStep(((step - 1) as Step)))}
                disabled={busy}
              >
                {step === 1 ? "Cancel" : "Back"}
              </Button>
              {step < 3 ? (
                <Button
                  onClick={() => setStep(((step + 1) as Step))}
                  disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
                >
                  Next
                </Button>
              ) : (
                <Button onClick={runWizard} disabled={busy || !canRun}>
                  {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Create test cycle
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}