import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type KeyResult = {
  id: string;
  title: string;
  unit: string | null;
  metric_type: string;
  starting_value: number;
  target_value: number;
  current_value: number;
};

type Goal = {
  id: string;
  title: string;
  category: string;
  status: string;
  target_date: string | null;
  key_results: KeyResult[];
};

type Resolved = {
  valid: boolean;
  reason?: string;
  kind?: "self" | "contributor";
  review?: {
    id: string;
    employee_uuid: string;
    employee_name: string;
    review_cycle: string;
    scheduled_date: string;
    review_type: string;
    title: string | null;
    department: string | null;
  };
  self_assessment?: {
    wins: string | null;
    challenges: string | null;
    growth: string | null;
    support_needed: string | null;
    submitted_at: string | null;
  } | null;
  goals?: Goal[];
  assessment_url?: string;
  contributor?: {
    id: string;
    contributor_name: string;
    status: string;
    submitted_at: string | null;
    allow_resubmission: boolean;
    submission_count: number;
    rating_overall: number | null;
    rating_collaboration: number | null;
    rating_impact: number | null;
    strengths: string | null;
    improvements: string | null;
    anonymous: boolean;
  };
  locked?: boolean;
};

const reasonCopy: Record<string, string> = {
  not_found: "We couldn't find this form. Double-check the link you were sent.",
  expired: "This link has expired. Ask HR to send you a fresh one.",
  revoked: "This link was turned off. Ask HR to send you a fresh one.",
};

export default function ReviewForm() {
  const { token = "" } = useParams();
  const { toast } = useToast();
  const [data, setData] = useState<Resolved | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: res, error } = await supabase.rpc("resolve_review_token", { _token: token });
      if (error) {
        setData({ valid: false, reason: "not_found" });
      } else {
        setData(res as unknown as Resolved);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Opening your form…
        </div>
      </Shell>
    );
  }

  if (!data?.valid) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">This link isn't usable</div>
              <p className="text-sm text-muted-foreground mt-1">
                {reasonCopy[data?.reason ?? "not_found"] ?? reasonCopy.not_found}
              </p>
            </div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-6 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Thanks — that's submitted</div>
              <p className="text-sm text-muted-foreground mt-1">
                {data.kind === "self"
                  ? "Your manager will see this in your review. You can close this page."
                  : "Your feedback has been recorded. You can close this page."}
              </p>
            </div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      {data.kind === "self" ? (
        <SelfForm
          token={token}
          data={data}
          saving={saving}
          setSaving={setSaving}
          onDone={() => setDone(true)}
          toast={toast}
        />
      ) : (
        <ContributorForm
          token={token}
          data={data}
          saving={saving}
          setSaving={setSaving}
          onDone={() => setDone(true)}
          toast={toast}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(239 84% 60%), hsl(258 80% 60%))" }}
          >
            D
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Datapath</div>
            <div className="text-xs text-muted-foreground">Performance review</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------ Self-assessment ----------------------------- */

type FormProps = {
  token: string;
  data: Resolved;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onDone: () => void;
  toast: ReturnType<typeof useToast>["toast"];
};

function SelfForm({ token, data, saving, setSaving, onDone, toast }: FormProps) {
  const sa = data.self_assessment;
  const [wins, setWins] = useState(sa?.wins ?? "");
  const [challenges, setChallenges] = useState(sa?.challenges ?? "");
  const [growth, setGrowth] = useState(sa?.growth ?? "");
  const [support, setSupport] = useState(sa?.support_needed ?? "");
  const goals = data.goals ?? [];

  const [krValues, setKrValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    goals.forEach((g) => g.key_results.forEach((k) => (init[k.id] = String(k.current_value ?? 0))));
    return init;
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const assessmentHref = data.assessment_url
    ? `${window.location.origin}${data.assessment_url}`
    : null;

  async function submit() {
    if (!wins.trim() && !growth.trim()) {
      toast({
        title: "Add a little detail first",
        description: "A couple of sentences on your wins and how you've grown is enough.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("submit_self_assessment", {
      _token: token,
      _wins: wins,
      _challenges: challenges,
      _growth: growth,
      _support: support,
      _kr_updates: goals.flatMap((g) =>
        g.key_results.map((k) => ({ id: k.id, current_value: Number(krValues[k.id] ?? k.current_value) })),
      ),
      _checkin_notes: Object.entries(notes)
        .filter(([, note]) => note.trim() !== "")
        .map(([goal_id, note]) => ({ goal_id, note })),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't submit", description: error.message, variant: "destructive" });
      return;
    }
    onDone();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your self-assessment</CardTitle>
          <CardDescription>
            {data.review?.review_cycle} · keep it short, a few sentences each is plenty. Your manager
            reads this before your review conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="What went well?"
            hint="Your best work this period."
            value={wins}
            onChange={setWins}
            placeholder="Two or three things you're proud of…"
          />
          <Field
            label="What was hard?"
            hint="Blockers, misses, things you'd do differently."
            value={challenges}
            onChange={setChallenges}
            placeholder="Be honest — this isn't held against you…"
          />
          <Field
            label="How have you grown?"
            hint="How you think, operate and handle pressure compared with a year ago."
            value={growth}
            onChange={setGrowth}
            placeholder="Where you've matured in how you work with people and make decisions…"
          />
          <Field
            label="What support do you need?"
            hint="From your manager or the company, to do your best work next period."
            value={support}
            onChange={setSupport}
            placeholder="Tools, training, clarity, headcount…"
          />
        </CardContent>
      </Card>

      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Goal check-in
            </CardTitle>
            <CardDescription>Update where each measure actually landed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((g) => (
              <div key={g.id} className="rounded-md border p-3 space-y-3">
                <div className="text-sm font-medium">{g.title}</div>
                {g.key_results.map((k) => (
                  <div key={k.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{k.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Target {k.target_value}
                        {k.unit ? ` ${k.unit}` : ""}
                      </div>
                    </div>
                    <Input
                      type="number"
                      className="w-28 h-8"
                      value={krValues[k.id] ?? ""}
                      onChange={(e) => setKrValues((p) => ({ ...p, [k.id]: e.target.value }))}
                    />
                  </div>
                ))}
                <Textarea
                  rows={2}
                  placeholder="Anything worth noting on this goal (optional)…"
                  value={notes[g.id] ?? ""}
                  onChange={(e) => setNotes((p) => ({ ...p, [g.id]: e.target.value }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {assessmentHref && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">One more step: your assessment</CardTitle>
            <CardDescription>
              This is the behavioural and skills questionnaire. It's what lets us show how you've
              evolved across review periods, so please complete it too.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href={assessmentHref} target="_blank" rel="noreferrer">
                Open the assessment <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 pb-10">
        <p className="text-xs text-muted-foreground">
          You can reopen this link and change your answers until your manager completes the review.
        </p>
        <Button onClick={submit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {sa?.submitted_at ? "Update my answers" : "Submit"}
        </Button>
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground -mt-1">{hint}</p>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ---------------------------- Contributor feedback --------------------------- */

const scale = [
  { value: "5", label: "5 · Outstanding" },
  { value: "4", label: "4 · Strong" },
  { value: "3", label: "3 · Solid" },
  { value: "2", label: "2 · Inconsistent" },
  { value: "1", label: "1 · Needs work" },
];

function ContributorForm({ token, data, saving, setSaving, onDone, toast }: FormProps) {
  const c = data.contributor!;
  const locked = !!data.locked;
  const [overall, setOverall] = useState(c.rating_overall ? String(c.rating_overall) : "");
  const [collab, setCollab] = useState(c.rating_collaboration ? String(c.rating_collaboration) : "");
  const [impact, setImpact] = useState(c.rating_impact ? String(c.rating_impact) : "");
  const [strengths, setStrengths] = useState(c.strengths ?? "");
  const [improvements, setImprovements] = useState(c.improvements ?? "");

  const ready = useMemo(() => overall && collab && impact, [overall, collab, impact]);

  async function submit() {
    setSaving(true);
    const { error } = await supabase.rpc("submit_contributor_feedback", {
      _token: token,
      _overall: Number(overall),
      _collaboration: Number(collab),
      _impact: Number(impact),
      _strengths: strengths,
      _improvements: improvements,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't submit", description: error.message, variant: "destructive" });
      return;
    }
    onDone();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Feedback on {data.review?.employee_name}</CardTitle>
          <CardDescription>
            {data.review?.review_cycle} · five quick questions. Your name is not shown to{" "}
            {data.review?.employee_name?.split(" ")[0]} — only the averaged scores and themes are.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {locked && (
            <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                Your feedback is already in. Ask HR to reopen it if something needs changing.
              </div>
            </div>
          )}
          <Rating label="Overall performance" value={overall} onChange={setOverall} disabled={locked} />
          <Rating label="Collaboration" value={collab} onChange={setCollab} disabled={locked} />
          <Rating label="Impact on your work" value={impact} onChange={setImpact} disabled={locked} />
          <Separator />
          <div className="grid gap-1.5">
            <Label>What do they do really well?</Label>
            <Textarea
              rows={3}
              value={strengths}
              disabled={locked}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Specific examples land best…"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Where could they improve?</Label>
            <Textarea
              rows={3}
              value={improvements}
              disabled={locked}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="One thing that would make the biggest difference…"
            />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end pb-10">
        <Button onClick={submit} disabled={saving || locked || !ready}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {c.submission_count > 0 ? "Resubmit feedback" : "Submit feedback"}
        </Button>
      </div>
    </>
  );
}

function Rating({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Pick a score" />
        </SelectTrigger>
        <SelectContent>
          {scale.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
