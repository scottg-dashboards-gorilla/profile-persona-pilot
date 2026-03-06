import { DimensionScore } from "@/types/assessment";
import { dimensions } from "@/data/dimensions";
import { getArchetype } from "@/lib/archetypes";
import { Clock, Award, CheckCircle2, AlertTriangle, XCircle, ThumbsUp } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface OverviewTabProps {
  scores: DimensionScore[];
  elapsedSeconds: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} seconds`;
  return `${m}m ${s}s`;
}

const recommendationIcons: Record<string, typeof CheckCircle2> = {
  "strong-hire": CheckCircle2,
  "hire": ThumbsUp,
  "conditional": AlertTriangle,
  "caution": XCircle,
};

const OverviewTab = ({ scores, elapsedSeconds }: OverviewTabProps) => {
  const archetype = getArchetype(scores);
  const RecIcon = recommendationIcons[archetype.recommendation] ?? AlertTriangle;

  const radarData = scores.map((s) => {
    const dim = dimensions.find((d) => d.id === s.dimensionId)!;
    const shortName = dim.name
      .replace(" Expertise", "")
      .replace(" & People Management", "")
      .replace("IT ", "")
      .replace(" & Compliance", "")
      .replace(" & Innovation", "")
      .replace(" & Culture Fit", "")
      .replace(" & IT Operations", "")
      .replace(" & Crisis Management", "")
      .trim();
    return {
      dimension: shortName,
      score: s.normalizedScore,
      fullMark: 100,
    };
  });

  const strongDims = scores.filter(s => s.normalizedScore >= 65);
  const weakDims = scores.filter(s => s.normalizedScore < 40);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hiring Recommendation */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-semibold mb-3">
          <Award className="w-3.5 h-3.5" />
          Assessment Complete
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-1">
          {archetype.name}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-3">
          {archetype.summary}
        </p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Completed in {formatDuration(elapsedSeconds)}
        </p>
      </div>

      {/* Recommendation Badge */}
      <div
        className="card-elevated p-5 border-l-4"
        style={{ borderLeftColor: archetype.recommendationColor }}
      >
        <div className="flex items-center gap-3 mb-2">
          <RecIcon className="w-6 h-6" style={{ color: archetype.recommendationColor }} />
          <h3 className="text-lg font-bold" style={{ color: archetype.recommendationColor }}>
            {archetype.recommendationLabel}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">{archetype.recommendationDescription}</p>
        {strongDims.length > 0 && (
          <p className="text-sm text-foreground mt-3">
            <strong>Strengths ({strongDims.length}):</strong>{" "}
            {strongDims.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(", ")}
          </p>
        )}
        {weakDims.length > 0 && (
          <p className="text-sm text-foreground mt-1">
            <strong>Gaps ({weakDims.length}):</strong>{" "}
            {weakDims.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(", ")}
          </p>
        )}
      </div>

      {/* Radar Chart */}
      <div className="card-elevated p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Competency Map
        </h3>
        <div className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(234, 20%, 91%)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 10, fill: "hsl(234, 12%, 46%)" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(234, 12%, 46%)" }}
                tickCount={5}
              />
              <Radar
                dataKey="score"
                stroke="hsl(234, 89%, 56%)"
                fill="hsl(234, 89%, 56%)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
