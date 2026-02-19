import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAssessment } from "@/hooks/useAssessment";
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
    setAnswer,
    goToQuestion,
    completeAssessment,
    reset,
  } = useAssessment();

  const [screen, setScreen] = useState<Screen>("intro");
  const [startTime, setStartTime] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [employeeName, setEmployeeName] = useState("");

  const handleBegin = useCallback((name: string) => {
    setEmployeeName(name);
    setStartTime(Date.now());
    setScreen("questions");
  }, []);

  const handleComplete = useCallback(async () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    setElapsedSeconds(elapsed);
    completeAssessment();
    setScreen("results");

    // Save to database
    const { error } = await supabase.from("employee_profiles").insert({
      employee_name: employeeName,
      scores: scores as unknown as any,
      elapsed_seconds: elapsed,
    });
    if (error) {
      console.error("Failed to save profile:", error);
      toast({ title: "Warning", description: "Profile completed but failed to save. Results are shown below.", variant: "destructive" });
    }
  }, [startTime, completeAssessment, employeeName, scores]);

  const handleRestart = useCallback(() => {
    reset();
    setEmployeeName("");
    navigate("/");
  }, [reset, navigate]);

  if (screen === "intro") {
    return <IntroScreen onBegin={handleBegin} />;
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
      onRestart={handleRestart}
    />
  );
};

export default Index;
