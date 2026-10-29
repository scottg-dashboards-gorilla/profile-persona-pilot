import { reviewData } from "@/lib/reviewData";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CORE_VALUES, VALUE_SCALE, averageScore } from "@/lib/coreValues";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, ListChecks } from "lucide-react";
import { departmentValues, questionApplies, type EmployeeContext } from "@/lib/departmentReview";

type ValueRow = {
  value_code: string;
  self_score: number | null;
  self_comment: string | null;
  manager_score: number | null;
  manager_comment: string | null;
};

type Question = {
  id: string;
  department: string | null;
  prompt: string;
  help_text: string | null;
  response_type: "score" | "yes_no" | "text";
  audience: "employee" | "manager" | "both";
  sort_order: number;
  applies_to_titles: string[];
};

type QuestionRow = {
  question_id: string;
  self_score: number | null;
  self_text: string | null;
  manager_score: number | null;
  manager_text: string | null;
};

const YES_NO = [
  { score: 1, label: "No" },
  { score: 3, label: "Mostly" },
  { score: 5, label: "Yes" },
];

/**
 * Core value grading (DP INC) plus any extra questions the employee's
 * department has added. `side` decides whose scores are editable here.
 */
export function ValuesGradingPanel({
  reviewId,
  employeeUuid,
  department,
  side,
  readOnly = false,
  showOtherSide = true,
}: {
  reviewId: string;
  employeeUuid: string;
  department?: string | null;
  side: "self" | "manager";
  readOnly?: boolean;
  /** Hide the other side's draft scores until the review is shared. */
  showOtherSide?: boolean;
}) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, ValueRow>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, QuestionRow>>({});
  const [loaded, setLoaded] = useState(false);
  const [employee, setEmployee] = useState<EmployeeContext>({ department: department ?? null, title: null });

  const load = useCallback(async () => {
    const [{ data: vr }, { data: qs }, { data: qr }, { data: emp }] = await Promise.all([
      reviewData("review_value_ratings")
        .select("value_code, self_score, self_comment, manager_score, manager_comment")
        .eq("review_id", reviewId),
      supabase
        .from("department_questions")
        .select("id, department, prompt, help_text, response_type, audience, sort_order, applies_to_titles")
        .eq("is_active", true)
        .order("sort_order"),
      reviewData("review_question_responses")
        .select("question_id, self_score, self_text, manager_score, manager_text")
        .eq("review_id", reviewId),
      supabase.from("employees").select("department, title").eq("uuid", employeeUuid).maybeSingle(),
    ]);
    const context = emp ?? { department: department ?? null, title: null };
    setEmployee(context);
    const vmap: Record<string, ValueRow> = {};
    ((vr ?? []) as ValueRow[]).forEach((r) => (vmap[r.value_code] = r));
    setValues(vmap);
    const amap: Record<string, QuestionRow> = {};
    ((qr ?? []) as QuestionRow[]).forEach((r) => (amap[r.question_id] = r));
    setAnswers(amap);
    setQuestions(
      ((qs ?? []) as Question[]).filter(
        (q) =>
          questionApplies(q, context) &&
          (q.audience === "both" || q.audience === (side === "self" ? "employee" : "manager")),
      ),
    );
    setLoaded(true);
  }, [reviewId, employeeUuid, department, side]);

  useEffect(() => {
    load();
  }, [load]);

  const managerAverage = useMemo(
    () => averageScore(CORE_VALUES.map((v) => values[v.code]?.manager_score)),
    [values],
  );
  const selfAverage = useMemo(
    () => averageScore(CORE_VALUES.map((v) => values[v.code]?.self_score)),
    [values],
  );

  async function saveValue(code: string, patch: Partial<ValueRow>) {
    const next = { ...(values[code] ?? { value_code: code }), ...patch } as ValueRow;
    setValues((v) => ({ ...v, [code]: next }));
    const { error } = await supabase.from("review_value_ratings").upsert(
      {
        review_id: reviewId,
        employee_uuid: employeeUuid,
        value_code: code,
        ...patch,
      },
      { onConflict: "review_id,value_code" },
    );
    if (error) toast({ title: "Not saved", description: error.message, variant: "destructive" });
  }

  async function saveAnswer(questionId: string, patch: Partial<QuestionRow>) {
    const next = { ...(answers[questionId] ?? { question_id: questionId }), ...patch } as QuestionRow;
    setAnswers((a) => ({ ...a, [questionId]: next }));
    const { error } = await supabase.from("review_question_responses").upsert(
      {
        review_id: reviewId,
        question_id: questionId,
        employee_uuid: employeeUuid,
        ...patch,
      },
      { onConflict: "review_id,question_id" },
    );
    if (error) toast({ title: "Not saved", description: error.message, variant: "destructive" });
  }

  if (!loaded) return null;

  const editable = !readOnly;
  const scoreKey = side === "self" ? "self_score" : "manager_score";
  const commentKey = side === "self" ? "self_comment" : "manager_comment";
  const otherScoreKey = side === "self" ? "manager_score" : "self_score";
  const otherCommentKey = side === "self" ? "manager_comment" : "self_comment";
  const otherLabel = side === "self" ? "Your manager" : "Their own score";

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" /> DP INC core values
          </div>
          <div className="text-xs text-muted-foreground">
            {selfAverage != null && <>self {selfAverage.toFixed(1)}</>}
            {(side === "manager" || showOtherSide) && selfAverage != null && managerAverage != null && " · "}
            {(side === "manager" || showOtherSide) && managerAverage != null && (
              <>manager {managerAverage.toFixed(1)}</>
            )}
          </div>
        </div>

        {departmentValues(employee).map((v) => {
          const row = values[v.code];
          const mine = (row?.[scoreKey] as number | null) ?? null;
          const theirs = (row?.[otherScoreKey] as number | null) ?? null;
          const theirComment = (row?.[otherCommentKey] as string | null) ?? null;
          return (
            <div key={v.code} className="rounded-md border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Badge className="shrink-0 h-6 w-6 justify-center p-0 font-bold">{v.code}</Badge>
                <div>
                  <div className="text-sm font-medium">{v.name}</div>
                  <div className="text-xs text-muted-foreground">{v.meaning}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VALUE_SCALE.map((s) => (
                  <Button
                    key={s.score}
                    type="button"
                    size="sm"
                    variant={mine === s.score ? "default" : "outline"}
                    disabled={!editable}
                    title={s.hint}
                    className="h-7 text-xs"
                    onClick={() => saveValue(v.code, { [scoreKey]: s.score } as Partial<ValueRow>)}
                  >
                    {s.score} · {s.label}
                  </Button>
                ))}
              </div>
              {editable && (
                <Textarea
                  rows={2}
                  className="text-sm"
                  placeholder={v.prompt}
                  defaultValue={(row?.[commentKey] as string | null) ?? ""}
                  onBlur={(e) =>
                    saveValue(v.code, { [commentKey]: e.target.value || null } as Partial<ValueRow>)
                  }
                />
              )}
              {!editable && (row?.[commentKey] as string | null) && (
                <div className="text-sm whitespace-pre-wrap">{row?.[commentKey] as string}</div>
              )}
              {(showOtherSide && (theirs != null || theirComment)) && (
                <div className="border-t pt-2 text-xs">
                  <span className="font-medium">{otherLabel}</span>
                  {theirs != null && <span> · {theirs}/5</span>}
                  {theirComment && (
                    <div className="text-muted-foreground whitespace-pre-wrap">{theirComment}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {questions.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            {department ? `${department} questions` : "Team questions"}
          </div>
          {questions.map((q) => {
            const row = answers[q.id];
            const mineScore = (side === "self" ? row?.self_score : row?.manager_score) ?? null;
            const mineText = (side === "self" ? row?.self_text : row?.manager_text) ?? "";
            const theirScore = (side === "self" ? row?.manager_score : row?.self_score) ?? null;
            const theirText = (side === "self" ? row?.manager_text : row?.self_text) ?? null;
            const sKey = side === "self" ? "self_score" : "manager_score";
            const tKey = side === "self" ? "self_text" : "manager_text";
            const options = q.response_type === "yes_no" ? YES_NO : VALUE_SCALE;
            return (
              <div key={q.id} className="rounded-md border p-3 space-y-2">
                <div>
                  <div className="text-sm font-medium">{q.prompt}</div>
                  {q.help_text && <div className="text-xs text-muted-foreground">{q.help_text}</div>}
                </div>
                {q.response_type !== "text" && (
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((s) => (
                      <Button
                        key={s.score}
                        type="button"
                        size="sm"
                        variant={mineScore === s.score ? "default" : "outline"}
                        disabled={!editable}
                        className="h-7 text-xs"
                        onClick={() => saveAnswer(q.id, { [sKey]: s.score } as Partial<QuestionRow>)}
                      >
                        {q.response_type === "yes_no" ? s.label : `${s.score} · ${s.label}`}
                      </Button>
                    ))}
                  </div>
                )}
                {editable ? (
                  <Textarea
                    rows={2}
                    className="text-sm"
                    placeholder="Add detail or an example…"
                    defaultValue={mineText}
                    onBlur={(e) =>
                      saveAnswer(q.id, { [tKey]: e.target.value || null } as Partial<QuestionRow>)
                    }
                  />
                ) : (
                  mineText && <div className="text-sm whitespace-pre-wrap">{mineText}</div>
                )}
                {(showOtherSide && (theirScore != null || theirText)) && (
                  <div className="border-t pt-2 text-xs">
                    <span className="font-medium">{otherLabel}</span>
                    {theirScore != null && <span> · {theirScore}/5</span>}
                    {theirText && (
                      <div className="text-muted-foreground whitespace-pre-wrap">{theirText}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
