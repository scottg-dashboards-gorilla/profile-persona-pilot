import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAssessment, clearSavedProgress, type SavedProgress } from "@/hooks/useAssessment";
import { supabase } from "@/integrations/supabase/client";
import IntroScreen from "@/components/assessment/IntroScreen";
import QuestionScreen from "@/components/assessment/QuestionScreen";
import ThankYouScreen from "@/components/assessment/ThankYouScreen";
import { toast } from "@/hooks/use-toast";
import { useRoles } from "@/hooks/useRoles";
import { classifyTier } from "@/lib/tierClassification";

type Screen = "intro" | "questions" | "results";

const Index = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reviewId = useMemo(() => params.get("review"), [params]);
  const employeeUuidParam = useMemo(() => params.get("employee"), [params]);
  const { roles } = useRoles();
  const {
    state,
    questions,
    scores,
    discProfile,
    truthfulness,
    employeeName,
    startTime,
    role,
    setRole,
    setEmployeeName,
    setStartTime,
    setAnswer,
    goToQuestion,
    completeAssessment,
    reset,
    restoreProgress,
  } = useAssessment();

  const [screen, setScreen] = useState<Screen>("intro");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [linkedName, setLinkedName] = useState<string | null>(null);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);

  // Opened from a signed-in employee's review page: identify them automatically.
  useEffect(() => {
    if (!employeeUuidParam) return;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase
        .from("employees")
        .select("first_name, last_name, email")
        .eq("uuid", employeeUuidParam)
        .eq("user_id", user.id)
        .maybeSingle();
      if (emp) {
        setLinkedName(`${emp.first_name} ${emp.last_name}`.trim());
        setLinkedEmail(emp.email ?? user.email ?? null);
      }
    })();
  }, [employeeUuidParam]);

  const handleBegin = useCallback((name: string, selectedRoleId: string) => {
    const effectiveName = linkedName ?? name;
    // Starting fresh discards this person's previous draft (others are kept).
    clearSavedProgress(effectiveName);
    const cfg = roles.find((r) => r.id === selectedRoleId);
    setRole(selectedRoleId, cfg?.dimensions);
    setEmployeeName(name);
    setStartTime(Date.now());
    setScreen("questions");
  }, [setEmployeeName, setStartTime, setRole, roles]);

  const handleResume = useCallback((saved: SavedProgress) => {
    restoreProgress(saved);
    setScreen("questions");
  }, [restoreProgress]);

  const handleComplete = useCallback(async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    setElapsedSeconds(elapsed);
    completeAssessment();
    setScreen("results");

    const { error } = await supabase.rpc("submit_open_assessment", {
      _employee_name: employeeName,
      _role: role,
      _scores: scores as unknown as any,
      _elapsed_seconds: elapsed,
      _disc_profile: discProfile as unknown as any,
      _truthfulness: truthfulness as unknown as any,
    });
    if (error) {
      console.error("Failed to save profile:", error);
      toast({ title: "Warning", description: "Profile completed but failed to save. Results are shown below.", variant: "destructive" });
    }

    // Also write a versioned attempt for trend tracking
    const tier = classifyTier(scores);
    const technical_scores = scores.reduce<Record<string, number>>((acc, s) => {
      acc[s.dimensionId] = s.normalizedScore;
      return acc;
    }, {});
    const employee_uuid = employeeUuidParam ?? employeeName;
    let linkedCycleId: string | null = null;
    if (reviewId) {
      const { data } = await supabase
        .from("performance_reviews")
        .select("cycle_id")
        .eq("id", reviewId)
        .maybeSingle();
      linkedCycleId = (data?.cycle_id as string | null) ?? null;
    }
    const { data: attempt, error: attemptErr } = await supabase
      .from("assessment_attempts")
      .insert({
        employee_uuid,
        review_id: reviewId,
        cycle_id: linkedCycleId,
        submitted_at: new Date().toISOString(),
        disc_scores: {
          D: discProfile.D,
          I: discProfile.I,
          S: discProfile.S,
          C: discProfile.C,
        } as unknown as any,
        disc_primary: discProfile.primaryType,
        tier: tier.tier,
        technical_scores: technical_scores as unknown as any,
        truthfulness_score: truthfulness?.score ?? null,
        raw_answers: state.answers as unknown as any,
      })
      .select("id")
      .single();
    if (attemptErr) {
      console.error("Failed to save attempt:", attemptErr);
    } else if (attempt && reviewId) {
      await supabase
        .from("performance_reviews")
        .update({ assessment_attempt_id: attempt.id })
        .eq("id", reviewId);
    }
  }, [startTime, completeAssessment, employeeName, role, scores, discProfile, truthfulness]);

  const handleRestart = useCallback(() => {
    reset();
    setScreen("intro");
  }, [reset]);

  if (screen === "intro") {
    return <IntroScreen onBegin={handleBegin} onResume={handleResume} />;
  }

  if (screen === "questions") {
    return (
      <QuestionScreen
        questions={questions}
        currentIndex={state.currentQuestionIndex}
        answers={state.answers}
        onAnswer={setAnswer}
        onNavigate={goToQuestion}
        onComplete={handleComplete}
        startTime={startTime}
      />
    );
  }

  return (
    <ThankYouScreen
      employeeName={employeeName}
      elapsedSeconds={elapsedSeconds}
      scores={scores}
      onRestart={handleRestart}
    />
  );
};

export default Index;
