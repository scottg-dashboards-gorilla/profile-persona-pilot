import { DimensionScore } from "@/types/assessment";
import { dimensions, DimensionMeta } from "@/data/dimensions";

interface DimensionsTabProps {
  scores: DimensionScore[];
}

function getDescription(dim: DimensionMeta, score: number): string {
  if (score <= 35) return dim.scoreDescriptions.low;
  if (score >= 65) return dim.scoreDescriptions.high;
  return dim.scoreDescriptions.mid;
}

const DimensionCard = ({ score, dim }: { score: DimensionScore; dim: DimensionMeta }) => {
  const pct = score.normalizedScore;
  return (
    <div className="card-elevated p-5 hover-lift">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dim.color }} />
          <h3 className="font-semibold text-foreground font-display">{dim.name}</h3>
        </div>
        <span
          className="dimension-badge text-white"
          style={{ backgroundColor: dim.color }}
        >
          {pct}%
        </span>
      </div>

      {/* Spectrum Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{dim.lowLabel}</span>
          <span>{dim.highLabel}</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              backgroundColor: dim.color,
              opacity: 0.3,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all duration-700"
            style={{
              left: `calc(${pct}% - 8px)`,
              backgroundColor: dim.color,
            }}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {getDescription(dim, pct)}
      </p>
    </div>
  );
};

const DimensionsTab = ({ scores }: DimensionsTabProps) => {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold font-display text-foreground">Dimension Breakdown</h2>
        <p className="text-sm text-muted-foreground">Your scores across all 8 personality dimensions</p>
      </div>
      {scores.map((score) => {
        const dim = dimensions.find((d) => d.id === score.dimensionId)!;
        return <DimensionCard key={score.dimensionId} score={score} dim={dim} />;
      })}
    </div>
  );
};

export default DimensionsTab;
