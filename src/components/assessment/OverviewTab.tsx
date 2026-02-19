import { DimensionScore } from "@/types/assessment";
import { dimensions } from "@/data/dimensions";
import { getArchetype } from "@/lib/archetypes";
import { Clock, Award } from "lucide-react";
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

const OverviewTab = ({ scores, elapsedSeconds }: OverviewTabProps) => {
  const archetype = getArchetype(scores);

  const radarData = scores.map((s) => {
    const dim = dimensions.find((d) => d.id === s.dimensionId)!;
    // Shorten name for radar labels
    const shortName = dim.name.replace(" Style", "").replace(" Approach", "").replace(" Pattern", "").replace(" Orientation", "");
    return {
      dimension: shortName,
      score: s.normalizedScore,
      fullMark: 100,
    };
  });

  // Generate narrative
  const strongDims = [...scores]
    .sort((a, b) => Math.abs(b.normalizedScore - 50) - Math.abs(a.normalizedScore - 50))
    .slice(0, 3);

  const narrative = strongDims
    .map((s) => {
      const d = dimensions.find((dim) => dim.id === s.dimensionId)!;
      const label = s.normalizedScore >= 65 ? d.highLabel : s.normalizedScore <= 35 ? d.lowLabel : `balanced in ${d.name}`;
      return `**${label}** in ${d.name.toLowerCase()} (${s.normalizedScore}%)`;
    })
    .join(", ");

  return (
    <div className="animate-fade-in space-y-6">
      {/* Archetype */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-semibold mb-3">
          <Award className="w-3.5 h-3.5" />
          Assessment Complete
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-1">
          {archetype.name}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-2">
          {archetype.summary}
        </p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Completed in {formatDuration(elapsedSeconds)}
        </p>
      </div>

      {/* Radar Chart */}
      <div className="card-elevated p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Your Profile Map
        </h3>
        <div className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(234, 20%, 91%)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 11, fill: "hsl(234, 12%, 46%)" }}
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

      {/* Narrative */}
      <div className="card-elevated p-5">
        <p className="text-sm text-foreground leading-relaxed">
          Your profile shows you lean most strongly toward{" "}
          <span dangerouslySetInnerHTML={{ __html: narrative.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />.
          These are the areas where your natural preferences are most pronounced, shaping how you approach work, interact with colleagues, and handle challenges.
        </p>
      </div>
    </div>
  );
};

export default OverviewTab;
