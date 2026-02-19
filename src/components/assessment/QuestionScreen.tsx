import { useState, useEffect, useCallback } from "react";
import { Question, LikertValue } from "@/types/assessment";
import { dimensions } from "@/data/dimensions";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface QuestionScreenProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, LikertValue>;
  onAnswer: (questionId: string, value: LikertValue) => void;
  onNavigate: (index: number) => void;
  onComplete: () => void;
  startTime: number;
}

const LIKERT_OPTIONS: { value: LikertValue; label: string; shortLabel: string }[] = [
  { value: 1, label: "Strongly Disagree", shortLabel: "SD" },
  { value: 2, label: "Disagree", shortLabel: "D" },
  { value: 3, label: "Neutral", shortLabel: "N" },
  { value: 4, label: "Agree", shortLabel: "A" },
  { value: 5, label: "Strongly Agree", shortLabel: "SA" },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const QuestionScreen = ({
  questions,
  currentIndex,
  answers,
  onAnswer,
  onNavigate,
  onComplete,
  startTime,
}: QuestionScreenProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const question = questions[currentIndex];
  const dim = dimensions.find((d) => d.id === question.dimensionId);
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPct = (answeredCount / totalQuestions) * 100;
  const currentAnswer = answers[question.id] ?? null;
  const isLast = currentIndex === totalQuestions - 1;

  const handleNav = useCallback(
    (dir: number) => {
      setAnimKey((k) => k + 1);
      onNavigate(currentIndex + dir);
    },
    [currentIndex, onNavigate]
  );

  const handleSelect = useCallback(
    (value: LikertValue) => {
      onAnswer(question.id, value);
    },
    [onAnswer, question.id]
  );

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      handleNav(1);
    }
  }, [isLast, onComplete, handleNav]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Progress Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="h-1 bg-muted">
          <div
            className="h-full gradient-progress transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(elapsed)}
          </span>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div key={animKey} className="w-full max-w-2xl animate-fade-in">
          <div className="card-elevated p-6 sm:p-8">
            {/* Dimension label */}
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: dim?.color }}
              />
              <span className="text-sm font-medium text-muted-foreground">
                {dim?.name}
              </span>
            </div>

            {/* Question text */}
            <p className="text-xl sm:text-2xl font-semibold font-display text-foreground leading-relaxed mb-8">
              "{question.text}"
            </p>

            {/* Likert Options */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3 mb-8">
              {LIKERT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`likert-option ${currentAnswer === opt.value ? "selected" : ""}`}
                >
                  <span className="block sm:hidden">{opt.label}</span>
                  <span className="hidden sm:block text-xs leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => handleNav(-1)}
                disabled={currentIndex === 0}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={currentAnswer === null}
                className="gap-1"
              >
                {isLast ? "See Results" : "Next"}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionScreen;
