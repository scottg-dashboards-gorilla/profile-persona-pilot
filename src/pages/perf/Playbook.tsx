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
import {
  APR_STAGES,
  BONUS_PRINCIPLES,
  FOCAL_POINT_ELIGIBILITY,
  IC_PRINCIPLES,
  IC_TARGET,
  MERIT_PRINCIPLES,
  PDR_CATEGORIES,
  PDR_STAGES,
  PMP_PILLARS,
  PMP_ROLES,
  RATING_EXAMPLE,
  RATING_LENSES,
  RATING_SCALE,
  TEAM_SCORE_METRICS,
  UNCONSCIOUS_BIASES,
  YEAR_END_STEPS,
  ratingMeta,
} from "@/lib/pmp";

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
        <h1 className="text-xl font-semibold">Datapath review playbook</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Datapath's own performance and pay rules — the order things happen in, and who owns each step.
          Every step below maps to a real screen, and the Workflow panel on any review row tracks exactly
          where that person is.
        </p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Performance Management Process (PMP)</CardTitle>
          <CardDescription className="text-foreground">
            Datapath's strategy is to <em className="font-semibold text-primary not-italic">provide managers flexibility and ownership on pay decisions for their teams.</em>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {PMP_PILLARS.map((p) => (
            <div key={p.id} className="rounded-md bg-background border p-3">
              <div className="text-sm font-semibold text-primary">{p.label}</div>
              <p className="text-xs text-muted-foreground mt-1">{p.what}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">3 steps to year-end</CardTitle>
          <CardDescription>Manager input timelines can vary by team.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {YEAR_END_STEPS.map((s) => (
            <div key={s.n} className="rounded-md border p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {s.n}
                </span>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <div className="mt-1 text-xs font-medium italic text-muted-foreground">{s.window}</div>
              <Badge className={`mt-2 text-[10px] border-0 ${ownerTone[s.owner]}`}>{s.owner}</Badge>
              <p className="text-xs text-muted-foreground mt-2">{s.what}</p>
              {s.href && (
                <Button asChild size="sm" variant="ghost" className="h-7 px-0 text-xs mt-1">
                  <Link to={s.href}>
                    Go there <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datapath performance rating scale</CardTitle>
          <CardDescription>Everyone receives one rating for overall performance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-5">
            {[...RATING_SCALE].reverse().map((r) => (
              <div key={r.score} className={`rounded-md border p-2 text-center ${r.tone}`}>
                <div className="text-lg font-semibold">{r.score}</div>
                <div className="text-[11px] leading-tight font-medium">{r.label}</div>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium">
              Managers are encouraged to think through three lenses when deciding each rating.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 mt-2">
              {RATING_LENSES.map((l) => (
                <div key={l.id} className="rounded-md border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary">{l.label}</div>
                  <ul className="mt-1 space-y-1">
                    {l.questions.map((q) => (
                      <li key={q} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Example of how to decide on ratings</CardTitle>
          <CardDescription>
            One set of objectives, and what the evidence looks like at each point on the scale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">Objectives</div>
            {RATING_EXAMPLE.objectives.map((o) => {
              const cat = PDR_CATEGORIES.find((c) => c.id === o.category);
              return (
                <div key={o.category}>
                  <div className="text-sm font-medium">{cat?.label ?? o.category}</div>
                  <ul className="mt-0.5 space-y-0.5">
                    {o.points.map((p) => (
                      <li key={p} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="grid gap-3 lg:grid-cols-5">
            {RATING_EXAMPLE.evidence.map((e) => (
              <div key={e.score} className="rounded-md border overflow-hidden">
                <div className={`px-2 py-1.5 text-center ${ratingMeta(e.score)?.tone ?? ""}`}>
                  <div className="text-sm font-semibold">{e.score}</div>
                  <div className="text-[11px] leading-tight font-medium">{ratingMeta(e.score)?.label}</div>
                </div>
                <ul className="p-2 space-y-1">
                  {e.points.map((p) => (
                    <li key={p} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Unconscious bias</CardTitle>
          <CardDescription>
            Being aware of unconscious biases is a good reminder to keep to objective, data or
            evidence-based performance evaluations.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {UNCONSCIOUS_BIASES.map((b) => (
            <div key={b.label} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <div className="text-sm font-semibold">{b.label}</div>
              <p className="text-xs text-muted-foreground">{b.what}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Merit increase</CardTitle>
            <CardDescription>{MERIT_PRINCIPLES.what}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">Who is eligible?</div>
              <p className="text-xs text-muted-foreground">{MERIT_PRINCIPLES.eligibility}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">How is it delivered?</div>
              <p className="text-xs text-muted-foreground">{MERIT_PRINCIPLES.delivery}</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 space-y-1.5">
              <div className="text-xs font-semibold text-amber-900">Watch outs</div>
              {MERIT_PRINCIPLES.watchOuts.map((w) => (
                <div key={w} className="text-xs text-amber-900/90 flex gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-700" />
                  {w}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Individual Contribution (I/C) score</CardTitle>
            <CardDescription>{IC_PRINCIPLES.what}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">Who is eligible?</div>
              <p className="text-xs text-muted-foreground">{IC_PRINCIPLES.eligibility}</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 space-y-1.5">
              <div className="text-xs font-semibold text-amber-900">Watch outs</div>
              {IC_PRINCIPLES.watchOuts.map((w) => (
                <div key={w} className="text-xs text-amber-900/90 flex gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-700" />
                  {w}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How the bonus is built</CardTitle>
          <CardDescription>Team Score sets the pot; the I/C score multiplies each payout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            {TEAM_SCORE_METRICS.map((m) => (
              <div key={m.id} className="rounded-md border p-2">
                <div className="text-lg font-semibold text-primary">{m.weight}%</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <div className="rounded-md border p-2">
              <div className="font-semibold">Team Score</div>
              <div className="text-muted-foreground">
                {BONUS_PRINCIPLES.teamScoreMin}–{BONUS_PRINCIPLES.teamScoreMax}% of bonus target
              </div>
            </div>
            <div className="rounded-md border p-2">
              <div className="font-semibold">Qualitative review</div>
              <div className="text-muted-foreground">+/- {BONUS_PRINCIPLES.qualitativeSwing} points on a 100% team score</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="font-semibold">I/C score multiplier</div>
              <div className="text-muted-foreground">
                {BONUS_PRINCIPLES.icMin}–{BONUS_PRINCIPLES.icMax}% of bonus target · target average {IC_TARGET}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{BONUS_PRINCIPLES.teamScore} {BONUS_PRINCIPLES.icScore}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Focal point eligibility</CardTitle>
          <CardDescription>Who is in and out of the year-end ratings and merit process.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {FOCAL_POINT_ELIGIBILITY.map((g) => (
            <div key={g.id} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <div className="text-sm font-semibold">{g.label}</div>
              <ul className="space-y-1">
                {g.points.map((p) => (
                  <li key={p} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {PMP_ROLES.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{r.label}</CardTitle>
              <CardDescription>Roles and responsibilities</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {r.points.map((p) => (
                <Rule key={p}>{p}</Rule>
              ))}
            </CardContent>
          </Card>
        ))}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">The annual PMP cycle</CardTitle>
            <CardDescription>Development reviews · <Link className="underline" to="/pdr">open PDRs</Link></CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {PDR_STAGES.map((s, i) => (
              <div key={s.id} className="flex items-start gap-2">
                <span className="mt-0.5 text-xs text-muted-foreground w-4">{i + 1}.</span>
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.owner} · {s.sla}</div>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground border-t pt-2">
              Control C1 — the manager validates every drafted objective maps to Faster / Stronger / Better /
              TPW. Control C2 — the score is cross-checked before the year is closed.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">The Annual Pay Review</CardTitle>
            <CardDescription>Pay, merit and bonus · <Link className="underline" to="/apr">open the APR</Link></CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {APR_STAGES.map((s, i) => (
              <div key={s.id} className="flex items-start gap-2">
                <span className="mt-0.5 text-xs text-muted-foreground w-4">{i + 1}.</span>
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.owner} · {s.window}</div>
                  <div className="text-xs text-muted-foreground">{s.what}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guardrails already enforced</CardTitle>
          <CardDescription>These aren't reminders — the system refuses to let them slide.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Rule>A review cannot be marked complete without an assessment attempt from that period.</Rule>
          <Rule>Performance is rated on the 1–5 scale everywhere; merit follows from that rating.</Rule>
          <Rule>
            A manager with 5 or more eligible reports cannot save pay entries above their team budget —
            the entry must be escalated to the next-level manager and approved first.
          </Rule>
          <Rule>Merit and bonus draw from separate budgets; unspent money cannot move between them.</Rule>
          <Rule>I/C scores are tracked against the Datapath target of {IC_TARGET}.</Rule>
          <Rule>Objectives can only be marked aligned once every one is validated against a category (C1).</Rule>
          <Rule>A PDR year can only be closed after manager comments are finalized and a score is set.</Rule>
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
