import { useId } from "react";
import { DimensionScore, DISCProfile, TruthtfulnessResult } from "@/types/assessment";
import { dimensions, competencyDimensions, comptiaDimensions } from "@/data/dimensions";
import { getArchetype } from "@/lib/archetypes";
import { classifyTier, TIER_COLORS, TIER_ICONS } from "@/lib/tierClassification";
import { Clock, Award, CheckCircle2, AlertTriangle, XCircle, ThumbsUp, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
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
  discProfile: DISCProfile;
  truthfulness: TruthtfulnessResult;
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

const OverviewTab = ({ scores, discProfile, truthfulness, elapsedSeconds }: OverviewTabProps) => {
  const archetype = getArchetype(scores);
  const tier = classifyTier(scores);
  const RecIcon = recommendationIcons[archetype.recommendation] ?? AlertTriangle;
  const tierColor = TIER_COLORS[tier.tier];
  const tierIcon = TIER_ICONS[tier.tier];

  // Only show competency + comptia dimensions on radar (not DISC or coaching)
  const radarDims = [...competencyDimensions, ...comptiaDimensions];
  const radarData = radarDims.map((dim) => {
    const s = scores.find(sc => sc.dimensionId === dim.id);
    const shortName = dim.name
      .replace("Microsoft ", "")
      .replace(" & Cloud Infrastructure", "")
      .replace(" Administration", "")
      .replace(" & Leading by Example", "")
      .replace(" & MSP Dynamics", "")
      .replace(" & Critical Thinking", "")
      .replace(" & Communication", "")
      .replace(" & Compliance", "")
      .replace(" & Infrastructure Management", "")
      .replace("IT Fundamentals & Support ", "")
      .replace("Data & Analytics ", "")
      .replace("Advanced Cybersecurity ", "")
      .replace(/\(.*\)/, "")
      .trim();
    return {
      dimension: shortName,
      score: s?.normalizedScore ?? 50,
      fullMark: 100,
    };
  });

  const allCompetencyScores = scores.filter(s => 
    [...competencyDimensions, ...comptiaDimensions].some(d => d.id === s.dimensionId)
  );
  const strongDims = allCompetencyScores.filter(s => s.normalizedScore >= 65);
  const weakDims = allCompetencyScores.filter(s => s.normalizedScore < 40);

  const TruthIcon = truthfulness.score >= 80 ? ShieldCheck : truthfulness.score >= 60 ? Shield : ShieldAlert;
  const truthColor = truthfulness.score >= 80 ? "#10b981" : truthfulness.score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Assessment Complete Header */}
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
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(elapsedSeconds)}
          </span>
          <span className="flex items-center gap-1.5">
            DISC: {discProfile.primaryType}{discProfile.secondaryType}
          </span>
        </div>
      </div>

      {/* Tier Classification */}
      <div className="card-elevated p-5 text-center" style={{ borderLeft: `4px solid ${tierColor}` }}>
        <div className="text-3xl mb-2">{tierIcon}</div>
        <h3 className="text-xl font-bold font-display" style={{ color: tierColor }}>
          {tier.label}
        </h3>
        <div className="flex items-center justify-center gap-2 mt-1 mb-3">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tierColor}20`, color: tierColor }}>
            {tier.confidence}% confidence
          </span>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          {tier.reasoning}
        </p>
      </div>

      {/* Truthfulness Indicator - only show if we have actual data */}
      {truthfulness.score >= 0 && (
        <div className="card-elevated p-4 flex items-center gap-4" style={{ borderLeft: `4px solid ${truthColor}` }}>
          <TruthIcon className="w-8 h-8 flex-shrink-0" style={{ color: truthColor }} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Response Consistency</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${truthColor}20`, color: truthColor }}>
                {truthfulness.label} ({truthfulness.score}%)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {truthfulness.score >= 80
                ? "Responses are highly consistent across validation questions. This assessment appears trustworthy."
                : truthfulness.score >= 60
                ? `Some inconsistencies detected across ${truthfulness.inconsistentPairs.length} question pairs. Review individual dimension scores carefully.`
                : `Significant inconsistencies detected across ${truthfulness.inconsistentPairs.length} question pairs. This candidate may have responded inconsistently or tried to game the assessment.`
              }
            </p>
          </div>
        </div>
      )}

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
      <div className="card-elevated p-4 sm:p-6 animate-fade-in">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Competency Map
        </h3>
        <div className="w-full" style={{ height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
              <defs>
                <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                </radialGradient>
                <filter id="radarGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickCount={5}
              />
              <Radar
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="url(#radarGradient)"
                fillOpacity={1}
                strokeWidth={2.5}
                dot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                filter="url(#radarGlow)"
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
