import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  CalendarRange,
  UserSquare2,
  ClipboardCheck,
  Users,
  ShieldCheck,
  Send,
  Repeat,
  ArrowRight,
} from "lucide-react";

type Owner = "HR" | "Employee" | "Manager";

const ownerTone: Record<Owner, string> = {
  HR: "bg-indigo-100 text-indigo-800",
  Employee: "bg-emerald-100 text-emerald-800",
  Manager: "bg-amber-100 text-amber-900",
};

const steps: {
  n: number;
  owner: Owner;
  title: string;
  what: string;
  where: string;
  href?: string;
  icon: React.ElementType;
}[] = [
  {
    n: 1,
    owner: "HR",
    title: "Launch the cycle",
    what:
      "Create the review cycle with its window, scope (company, department or one manager's team) and review type. A review is scheduled automatically for everyone in scope. Re-run Sync any time someone joins mid-cycle.",
    where: "Cycles",
    href: "/cycles",
    icon: CalendarRange,
  },
  {
    n: 2,
    owner: "HR",
    title: "Kick off each review",
    what:
      "Open the Workflow panel on a review row. Kicking off moves it to In progress and unlocks the employee and contributor forms.",
    where: "Reviews → Workflow",
    href: "/reviews",
    icon: ClipboardCheck,
  },
  {
    n: 3,
    owner: "Employee",
    title: "Write the self-assessment",
    what:
      "Four short questions: what went well, what was hard, how they've grown in how they think and operate, and what support they need. They also update where each of their goals actually landed.",
    where: "Private link (no account needed) or their own review page",
    href: "/me",
    icon: UserSquare2,
  },
  {
    n: 4,
    owner: "Employee",
    title: "Take the assessment",
    what:
      "The behavioural (DISC) and skills battery for this period, sized to their role. This is what powers cycle-to-cycle growth tracking — and the review cannot be completed without it.",
    where: "Assessment link tied to this review period",
    icon: Repeat,
  },
  {
    n: 5,
    owner: "HR",
    title: "Collect 360 feedback",
    what:
      "Add the coworkers who should weigh in and send each of them their own private link. They score overall, collaboration and impact, plus strengths and improvements. Names stay hidden from the employee.",
    where: "Reviews → Contributors",
    href: "/reviews",
    icon: Users,
  },
  {
    n: 6,
    owner: "Manager",
    title: "Complete the review",
    what:
      "Read the self-assessment, the aggregated 360 scores and the assessment deltas side by side. Set the rating, log follow-up action items against specific deltas, and propose any pay change or promotion.",
    where: "Reviews → Complete",
    href: "/reviews",
    icon: ClipboardCheck,
  },
  {
    n: 7,
    owner: "HR",
    title: "Calibrate and approve pay",
    what:
      "Check reviewer leniency across the company and apply alignment where needed, model the raise budget, then approve each proposed pay change. Only HR or admin can approve.",
    where: "Calibration · Compensation · Reviews → Workflow",
    href: "/calibration",
    icon: ShieldCheck,
  },
  {
    n: 8,
    owner: "Manager",
    title: "Share the outcome",
    what:
      "Nothing is visible to the employee until it is shared, and sharing is blocked until HR has approved any pay change. The employee then acknowledges it on their own page.",
    where: "Reviews → Workflow → Share",
    href: "/reviews",
    icon: Send,
  },
];

export default function Playbook() {
  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Review playbook</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The order things happen in, and who owns each step. Every step below maps to a real screen —
          the Workflow panel on any review row tracks exactly where that person is.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(["HR", "Employee", "Manager"] as Owner[]).map((o) => (
          <span key={o} className={`rounded-full px-2 py-1 font-medium ${ownerTone[o]}`}>
            {o}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {steps.map((s) => (
          <Card key={s.n}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground">{s.n}.</span> {s.title}
                    <Badge className={`text-[10px] border-0 ${ownerTone[s.owner]}`}>{s.owner}</Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">{s.what}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pl-[3.6rem] flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground">{s.where}</span>
              {s.href && (
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <Link to={s.href}>
                    Go there <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guardrails already enforced</CardTitle>
          <CardDescription>These aren't reminders — the system refuses to let them slide.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Rule>A review cannot be marked complete without an assessment attempt from that period.</Rule>
          <Rule>Only HR or an admin can approve a pay change; managers propose, HR signs off.</Rule>
          <Rule>An outcome can't be shared with the employee while a pay change is still unapproved.</Rule>
          <Rule>Employees only ever see their own review, and only after it's shared.</Rule>
          <Rule>A contributor can submit once per cycle unless HR explicitly reopens it.</Rule>
          <Rule>Every rating, pay and role change is written to the audit log with who and when.</Rule>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spot reviews</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          For an off-cycle review, create a cycle scoped to that one person's manager (or add the review
          directly) and set the review type to spot. The same eight steps apply — the assessment
          requirement still holds, which is what keeps off-cycle raises defensible.
        </CardContent>
      </Card>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </div>
  );
}
