import { DimensionScore } from "@/types/assessment";
import { dimensions } from "@/data/dimensions";
import { generateEnvironmentParagraph } from "@/lib/chatEngine";
import { Star, Triangle, Briefcase } from "lucide-react";

interface InsightsTabProps {
  scores: DimensionScore[];
}

const InsightsTab = ({ scores }: InsightsTabProps) => {
  const sorted = [...scores].sort(
    (a, b) => Math.abs(b.normalizedScore - 50) - Math.abs(a.normalizedScore - 50)
  );
  const strengths = sorted.slice(0, 3);
  const growth = sorted.slice(-3).reverse();

  const envText = generateEnvironmentParagraph(scores);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Key Strengths */}
      <div className="card-elevated p-5">
        <h3 className="flex items-center gap-2 font-semibold font-display text-foreground mb-4">
          <Star className="w-5 h-5 text-emerald-500" />
          Key Strengths
        </h3>
        <div className="space-y-3">
          {strengths.map((s) => {
            const dim = dimensions.find((d) => d.id === s.dimensionId)!;
            const label =
              s.normalizedScore >= 65
                ? dim.highLabel
                : s.normalizedScore <= 35
                ? dim.lowLabel
                : dim.name;
            const desc =
              s.normalizedScore >= 65
                ? dim.scoreDescriptions.high
                : s.normalizedScore <= 35
                ? dim.scoreDescriptions.low
                : dim.scoreDescriptions.mid;
            return (
              <div key={s.dimensionId} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {label}{" "}
                    <span className="text-muted-foreground font-normal">
                      — {dim.name} ({s.normalizedScore}%)
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Growth Opportunities */}
      <div className="card-elevated p-5">
        <h3 className="flex items-center gap-2 font-semibold font-display text-foreground mb-4">
          <Triangle className="w-5 h-5 text-amber-500" />
          Growth Opportunities
        </h3>
        <div className="space-y-3">
          {growth.map((s) => {
            const dim = dimensions.find((d) => d.id === s.dimensionId)!;
            return (
              <div key={s.dimensionId} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {dim.name}{" "}
                    <span className="text-muted-foreground font-normal">({s.normalizedScore}%)</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{dim.growthSuggestion}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ideal Work Environment */}
      <div className="card-elevated p-5">
        <h3 className="flex items-center gap-2 font-semibold font-display text-foreground mb-4">
          <Briefcase className="w-5 h-5 text-primary" />
          Ideal Work Environment
        </h3>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {envText
            .replace("**Your Ideal Work Environment**\n\n", "")
            .replace(/\*\*(.*?)\*\*/g, "$1")}
        </div>
      </div>
    </div>
  );
};

export default InsightsTab;
