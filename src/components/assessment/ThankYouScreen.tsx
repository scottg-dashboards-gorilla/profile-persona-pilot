import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";

interface ThankYouScreenProps {
  employeeName: string;
  elapsedSeconds: number;
  onRestart: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} seconds`;
  return `${m}m ${s}s`;
}

const ThankYouScreen = ({ employeeName, elapsedSeconds, onRestart }: ThankYouScreenProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center animate-fade-in">
        <div className="card-elevated p-8 sm:p-10 space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              Thank You, {employeeName}!
            </h1>
            <p className="text-muted-foreground">
              Your assessment has been submitted successfully. The hiring team will review your responses.
            </p>
          </div>

          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Completed in {formatDuration(elapsedSeconds)}
          </p>

          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={onRestart}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouScreen;
