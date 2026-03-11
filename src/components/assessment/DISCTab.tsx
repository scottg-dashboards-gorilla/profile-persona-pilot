import { DISCProfile, DimensionScore, DISCType } from "@/types/assessment";
import { discDimensions } from "@/data/dimensions";

interface DISCTabProps {
  discProfile: DISCProfile;
  scores: DimensionScore[];
}

const DISC_LABELS: Record<DISCType, { name: string; traits: string; color: string; icon: string }> = {
  D: { name: "Dominance", traits: "Direct, decisive, competitive, results-oriented", color: "#b91c1c", icon: "⚡" },
  I: { name: "Influence", traits: "Enthusiastic, optimistic, collaborative, persuasive", color: "#ea580c", icon: "🌟" },
  S: { name: "Steadiness", traits: "Patient, reliable, team-oriented, calm under pressure", color: "#0284c7", icon: "🛡️" },
  C: { name: "Conscientiousness", traits: "Analytical, detail-oriented, systematic, quality-focused", color: "#4338ca", icon: "🎯" },
};

const DISC_COMBOS: Record<string, string> = {
  "DI": "A driven leader who inspires action. They push for results while building enthusiasm in others. Can be impatient with process details.",
  "ID": "A persuasive motivator who drives outcomes. They lead through influence while maintaining urgency. May overlook details under pressure.",
  "DS": "A determined leader who values stability. They push for results while maintaining team cohesion. Balances urgency with reliability.",
  "SD": "A reliable performer who steps up decisively when needed. They maintain consistency while being capable of tough calls.",
  "DC": "A results-driven analyst. They push for outcomes backed by data and evidence. Can be demanding but thorough.",
  "CD": "A methodical achiever. They combine analytical precision with drive for results. May over-analyze before acting.",
  "IS": "A supportive motivator. They build relationships while maintaining reliability. Great team culture builders but may avoid conflict.",
  "SI": "A steady team player with social warmth. They provide consistency while keeping spirits high. May struggle with tough decisions.",
  "IC": "An enthusiastic analyst. They combine people skills with attention to detail. May struggle with consistency under pressure.",
  "CI": "A quality-focused communicator. They combine precision with persuasiveness. May overthink social dynamics.",
  "SC": "A reliable perfectionist. They combine consistency with attention to quality. Excellent at process management but may resist change.",
  "CS": "A methodical stabilizer. They ensure quality while maintaining team harmony. May be slow to adapt when change is needed.",
};

const DISCTab = ({ discProfile, scores }: DISCTabProps) => {
  const comboKey = `${discProfile.primaryType}${discProfile.secondaryType}`;
  const comboDescription = DISC_COMBOS[comboKey] || "A balanced behavioral profile across all DISC dimensions.";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Primary Profile */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold font-display text-foreground">DISC Behavioral Profile</h2>
        <p className="text-sm text-muted-foreground">Understanding their natural behavioral tendencies and work style</p>
      </div>

      {/* Profile Type Badge */}
      <div className="card-elevated p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-4xl">{DISC_LABELS[discProfile.primaryType].icon}</span>
          <div>
            <h3 className="text-2xl font-bold font-display text-foreground">
              {discProfile.primaryType}{discProfile.secondaryType}
            </h3>
            <p className="text-sm text-muted-foreground">
              Primary: {DISC_LABELS[discProfile.primaryType].name} / Secondary: {DISC_LABELS[discProfile.secondaryType].name}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          {comboDescription}
        </p>
      </div>

      {/* DISC Bar Chart */}
      <div className="card-elevated p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Dimension Scores
        </h3>
        <div className="space-y-4">
          {(["D", "I", "S", "C"] as DISCType[]).map((type) => {
            const info = DISC_LABELS[type];
            const value = discProfile[type];
            const isPrimary = type === discProfile.primaryType;
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info.icon}</span>
                    <span className={`text-sm font-semibold ${isPrimary ? "text-foreground" : "text-muted-foreground"}`}>
                      {info.name} ({type})
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: info.color }}>{value}%</span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                    style={{ width: `${value}%`, backgroundColor: info.color, opacity: isPrimary ? 1 : 0.6 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{info.traits}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* DISC Descriptions */}
      <div className="card-elevated p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          What This Means for the Role
        </h3>
        <div className="space-y-3">
          {discDimensions.map((dim) => {
            const score = scores.find(s => s.dimensionId === dim.id);
            const pct = score?.normalizedScore ?? 50;
            const desc = pct <= 35 ? dim.scoreDescriptions.low : pct >= 65 ? dim.scoreDescriptions.high : dim.scoreDescriptions.mid;
            return (
              <div key={dim.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: dim.color }} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{dim.name}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DISCTab;
