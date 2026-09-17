import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
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
  TEAM_SCORE_PRINCIPLES,
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
    title: "Schedule the year's reviews",
    what:
      "Schedule a review for each person for the year. Reviews are opened on each person's anniversary, and HR can add anyone who joins mid-year.",
    where: "Reviews",
    href: "/reviews",
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
      "Four short questions: what went well, what was hard, how they've grown in how they think and operate, and what support they need. Day-to-day work sits on their Task Tracker board.",
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

const employeeJourney: {
  n: number;
  title: string;
  when: string;
  what: string;
  href?: string;
  linkLabel?: string;
  icon: React.ElementType;
}[] = [
  {
    n: 1,
    title: "Set your objectives",
    when: "Start of the year",
    what:
      "Write what you're taking on under Faster, Stronger, Better or L&D. Each objective needs a name and a short description of how it will be measured. Edit or remove them freely until your manager aligns them — after that, ask your manager to send them back if something changes.",
    href: "/pdr",
    linkLabel: "Objective Setting",
    icon: ClipboardCheck,
  },
  {
    n: 2,
    title: "Keep your work visible",
    when: "Day to day",
    what:
      "Track what you're working on as cards on your own board. Your manager can comment on a task and colour-code what to prioritise, so nothing waits for a formal review.",
    href: "/tasks",
    linkLabel: "Task Tracker",
    icon: Repeat,
  },
  {
    n: 3,
    title: "Add your mid-year comment",
    when: "Mid-year",
    what:
      "Comment against each objective you set — what's moved, what's stuck, what you need. Your manager replies on the same objective, so the conversation stays in one place.",
    href: "/pdr",
    linkLabel: "Objective Setting",
    icon: Users,
  },
  {
    n: 4,
    title: "Write your year-end input",
    when: "Dec 01–15",
    what:
      "Four short questions: what went well, what was hard, how you've grown, and what support you need. This is read alongside your manager's comments before your score is recorded.",
    href: "/me",
    linkLabel: "My review",
    icon: UserSquare2,
  },
  {
    n: 5,
    title: "Take your assessment",
    when: "Around your work anniversary",
    what:
      "The behavioural (DISC) and skills questionnaire for your role. It shows how you've grown since last time, and your review can't be completed without it. Open it while signed in and the result files against your record automatically.",
    href: "/me",
    linkLabel: "My review",
    icon: Repeat,
  },
  {
    n: 6,
    title: "Receive and confirm your outcome",
    when: "After your pay review",
    what:
      "Your rating and any pay change are shared only after HR has signed off, so the number is settled before your manager sits down with you. Confirm you've received it on your review page.",
    href: "/me",
    linkLabel: "My review",
    icon: Send,
  },
  {
    n: 7,
    title: "Raise a pay concern if you need to",
    when: "Any time after it's shared",
    what:
      "If you're not happy with the amount, say why on your review page. Your manager takes it to HR and the decision comes back to you on the same page — you'll always see where it sits.",
    href: "/me",
    linkLabel: "My review",
    icon: ShieldCheck,
  },
];

export default function Playbook() {
  const { has, unconfigured } = usePermissions();
  const isAdminHr = unconfigured || has("admin") || has("hr");
  const forEmployee = !isAdminHr && !has("manager");
  const visibleSteps = steps;

  if (forEmployee) {
    return (
      <div className="space-y-5 max-w-4xl">
        <div>
          <h1 className="text-xl font-semibold">Your Datapath playbook</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Everything you're asked to do across the year, in the order it happens — and what you can count
            on in return.
          </p>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your year at a glance</CardTitle>
            <CardDescription className="text-foreground">
              Three conversations a year, plus your assessment around your work anniversary.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {PDR_STAGES.map((s, i) => (
              <div key={s.id} className="rounded-md bg-background border p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  You add your input first, then your manager comments on the same objectives.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {employeeJourney.map((s) => (
            <Card key={s.n}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">{s.n}.</span> {s.title}
                      <Badge variant="secondary" className="text-[10px]">{s.when}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">{s.what}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              {s.href && (
                <CardContent className="pt-0 pl-[3.6rem]">
                  <Button asChild size="sm" variant="ghost" className="h-7 px-0 text-xs">
                    <Link to={s.href}>
                      {s.linkLabel} <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How you're rated</CardTitle>
            <CardDescription>
              One rating for your overall performance, based on evidence of what you delivered and how you
              delivered it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-5">
              {[...RATING_SCALE].reverse().map((r) => (
                <div key={r.score} className={`rounded-md border p-2 text-center ${r.tone}`}>
                  <div className="text-lg font-semibold">{r.score}</div>
                  <div className="text-[11px] leading-tight font-medium">{r.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What the process guarantees you</CardTitle>
            <CardDescription>These aren't reminders — the system refuses to let them slide.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Rule>Your review can't be completed without your assessment from that period on file.</Rule>
            <Rule>Your pay change is signed off by HR before your manager holds the conversation with you.</Rule>
            <Rule>Nothing is shared with you until it's final — no half-finished outcomes.</Rule>
            <Rule>Only you, your manager and HR can see your review. No one else.</Rule>
            <Rule>Feedback collected from coworkers reaches you without names attached.</Rule>
            <Rule>
              Once your objectives are aligned they're locked — your manager sends them back for revision if
              something needs to change, so nothing is edited behind your back.
            </Rule>
            <Rule>Every rating and pay change is recorded with who did it and when.</Rule>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Where to go</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3 text-sm">
            <Button asChild variant="outline" className="justify-between">
              <Link to="/me">My review <ArrowRight className="h-3 w-3" /></Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link to="/pdr">Objective Setting <ArrowRight className="h-3 w-3" /></Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link to="/tasks">Task Tracker <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Datapath review playbook</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {forEmployee
            ? "How performance and pay work at Datapath, and what's yours to do — your objectives, your input at mid-year and year-end, and how your outcome reaches you."
            : "Datapath's own performance and pay rules — the order things happen in, and who owns each step. Every step below maps to a real screen, and the Workflow panel on any review row tracks exactly where that person is."}
        </p>
      </div>

      {forEmployee && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What's yours to do</CardTitle>
            <CardDescription className="text-foreground">
              Three conversations a year, all on your own pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Rule>
              Set your objectives under Faster, Stronger, Better or L&amp;D — each needs a name and a short
              description of how it will be measured. You can edit or remove them until your manager aligns
              them; after that, ask your manager to send them back if something needs to change.{" "}
              <Link className="underline" to="/pdr">Objective Setting</Link>
            </Rule>
            <Rule>
              At mid-year, add your own comment against each objective. Your manager replies on the same
              objective, so nothing is written from scratch.
            </Rule>
            <Rule>
              At year-end, write your self-input (Dec 01–15) and take the assessment for the period. Your
              manager then comments and records your development score.
            </Rule>
            <Rule>
              Keep your day-to-day work moving on your{" "}
              <Link className="underline" to="/tasks">Task Tracker</Link> board.
            </Rule>
            <Rule>
              When your outcome is shared, confirm you've received it on{" "}
              <Link className="underline" to="/me">My review</Link> — and if you're not happy with the
              amount, raise a pay concern there with your reasons. Your manager takes it to HR and you see
              the decision on the same page.
            </Rule>
          </CardContent>
        </Card>
      )}


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
          {!forEmployee && (
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
          )}
        </CardContent>
      </Card>

      {!forEmployee && (
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
      )}

      {!forEmployee && (
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
      )}

      {!forEmployee && (
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
      )}

      {!forEmployee && (
  <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Score and I/C</CardTitle>
            <CardDescription>The Team Score sets company performance; the I/C score recognises the individual.</CardDescription>
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
                  {TEAM_SCORE_PRINCIPLES.teamScoreMin}–{TEAM_SCORE_PRINCIPLES.teamScoreMax}% of target
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-semibold">Qualitative review</div>
                <div className="text-muted-foreground">+/- {TEAM_SCORE_PRINCIPLES.qualitativeSwing} points on a 100% team score</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-semibold">I/C score</div>
                <div className="text-muted-foreground">
                  {TEAM_SCORE_PRINCIPLES.icMin}–{TEAM_SCORE_PRINCIPLES.icMax}% · target average {IC_TARGET}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{TEAM_SCORE_PRINCIPLES.teamScore} {TEAM_SCORE_PRINCIPLES.icScore}</p>
          </CardContent>
        </Card>
      )}

      {!forEmployee && (
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
      )}

      {!forEmployee && (
        <>
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
        </>
      )}

      <div className="space-y-3">
        {visibleSteps.map((s, i) => (
          <Card key={s.n}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground">{forEmployee ? i + 1 : s.n}.</span> {s.title}
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
            <CardDescription>Objective setting · <Link className="underline" to="/pdr">open PDRs</Link></CardDescription>
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
              L&D. Control C2 — the score is cross-checked before the year is closed.
            </p>
          </CardContent>
        </Card>

        {!forEmployee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">The pay review cycle</CardTitle>
            <CardDescription>Pay and merit · <Link className="underline" to="/apr">open the pay review</Link></CardDescription>
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
            <p className="text-xs text-muted-foreground border-t pt-2">
              Timing is per person, worked back from their start-date anniversary: manager entry
              3 weeks before, HR sign-off by 2 weeks before, then the manager's connect conversation
              and the outcome shared 1 week before. The change takes effect on the anniversary, and
              nothing is shared with the employee until the connect has been held and logged.
            </p>
          </CardContent>
        </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {forEmployee ? "What the process guarantees you" : "Guardrails already enforced"}
          </CardTitle>
          <CardDescription>These aren't reminders — the system refuses to let them slide.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Rule>A review cannot be marked complete without an assessment attempt from that period.</Rule>
          <Rule>Performance is rated on the 1–5 scale everywhere; merit follows from that rating.</Rule>
          {!forEmployee && (
            <>
              <Rule>
                A manager with 5 or more eligible reports cannot save pay entries above their team budget —
                the entry must be escalated to the next-level manager and approved first.
              </Rule>
              <Rule>Merit draws from the manager's merit budget; overspend needs an approved exception from the next-level manager.</Rule>
              <Rule>I/C scores are tracked against the Datapath target of {IC_TARGET}.</Rule>
            </>
          )}
          <Rule>Objectives can only be marked aligned once every one is validated against a category (C1).</Rule>
          <Rule>
            Once your objectives are aligned you can't add, edit or delete them — your manager sends them
            back for revision if something needs to change.
          </Rule>
          <Rule>Your pay change is signed off by HR before your manager holds the conversation with you.</Rule>
          <Rule>An outcome can't be shared with the employee while a pay change is still unapproved.</Rule>
          <Rule>Employees only ever see their own review, and only after it's shared.</Rule>
          <Rule>360 feedback is shown to you without names attached.</Rule>
          {!forEmployee && (
            <Rule>A contributor can submit once per cycle unless HR explicitly reopens it.</Rule>
          )}
          <Rule>Every rating, pay and role change is written to the audit log with who and when.</Rule>
        </CardContent>
      </Card>

      {!forEmployee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spot reviews</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            For an off-cycle review, create a cycle scoped to that one person's manager (or add the review
            directly) and set the review type to spot. The same steps apply — the assessment requirement
            still holds, which is what keeps off-cycle raises defensible.
          </CardContent>
        </Card>
      )}
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

