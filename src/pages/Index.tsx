import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAssessment, getSavedProgress, clearSavedProgress } from "@/hooks/useAssessment";
import { supabase } from "@/integrations/supabase/client";
import IntroScreen from "@/components/assessment/IntroScreen";
import QuestionScreen from "@/components/assessment/QuestionScreen";
import ThankYouScreen from "@/components/assessment/ThankYouScreen";
import { toast } from "@/hooks/use-toast";

type Screen = "intro" | "questions" | "results";

const Index = () => {
  const navigate = useNavigate();
  const {
    state,
    questions,
    scores,
    discProfile,
    truthfulness,
    employeeName,
    startTime,
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

  const handleBegin = useCallback((name: string) => {
    clearSavedProgress();
    setEmployeeName(name);
    setStartTime(Date.now());
    setScreen("questions");
  }, [setEmployeeName, setStartTime]);

  const handleResume = useCallback(() => {
    const saved = getSavedProgress();
    if (saved) {
      restoreProgress(saved);
      setScreen("questions");
    }
  }, [restoreProgress]);

  const handleComplete = useCallback(async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    setElapsedSeconds(elapsed);
    completeAssessment();
    setScreen("results");

    const { error } = await supabase.from("employee_profiles").insert({
      employee_name: employeeName,
      scores: scores as unknown as any,
      elapsed_seconds: elapsed,
      disc_profile: discProfile as unknown as any,
      truthfulness: truthfulness as unknown as any,
    });
    if (error) {
      console.error("Failed to save profile:", error);
      toast({ title: "Warning", description: "Profile completed but failed to save. Results are shown below.", variant: "destructive" });
    }
  }, [startTime, completeAssessment, employeeName, scores, discProfile, truthfulness]);

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
