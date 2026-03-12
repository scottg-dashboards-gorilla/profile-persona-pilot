import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import { DimensionScore } from "@/types/assessment";
import DimensionsTab from "./DimensionsTab";

interface ThankYouScreenProps {
  employeeName: string;
  elapsedSeconds: number;
  scores: DimensionScore[];
  onRestart: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} seconds`;
  return `${m}m ${s}s`;
}

const ThankYouScreen = ({ employeeName, elapsedSeconds, scores, onRestart }: ThankYouScreenProps) => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
        {/* Thank you header */}
        <div className="card-elevated p-8 sm:p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              Thank You, {employeeName}!
            </h1>
            <p className="text-muted-foreground">
              Your assessment has been submitted successfully. Here's a summary of your skills profile.
            </p>
          </div>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Completed in {formatDuration(elapsedSeconds)}
          </p>
        </div>

        {/* Skills only */}
        <DimensionsTab scores={scores} />

        <div className="text-center pb-6">
          <Button variant="outline" size="sm" onClick={onRestart}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThankYouScreen;
