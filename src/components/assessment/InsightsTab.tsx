import { DimensionScore, TruthtfulnessResult } from "@/types/assessment";
import { dimensions, competencyDimensions, comptiaDimensions } from "@/data/dimensions";
import { questions } from "@/data/questions";
import { CheckCircle, AlertTriangle, Briefcase, ShieldAlert } from "lucide-react";

interface InsightsTabProps {
  scores: DimensionScore[];
  truthfulness: TruthtfulnessResult;
}

const InsightsTab = ({ scores, truthfulness }: InsightsTabProps) => {
  const competencyScores = scores.filter(s =>
    [...competencyDimensions, ...comptiaDimensions].some(d => d.id === s.dimensionId)
  );
  const sorted = [...competencyScores].sort((a, b) => b.normalizedScore - a.normalizedScore);
  const strengths = sorted.filter(s => s.normalizedScore >= 60).slice(0, 4);
  const risks = sorted.filter(s => s.normalizedScore < 50).reverse().slice(0, 4);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Truthfulness Warning */}
      {truthfulness.score < 80 && (
        <div className="card-elevated p-5 border-l-4" style={{ borderLeftColor: truthfulness.score < 60 ? "#ef4444" : "#f59e0b" }}>
          <h3 className="flex items-center gap-2 font-semibold font-display text-foreground mb-3">
            <ShieldAlert className="w-5 h-5" style={{ color: truthfulness.score < 60 ? "#ef4444" : "#f59e0b" }} />
            Response Consistency Concerns
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {truthfulness.inconsistentPairs.length} question pair(s) showed inconsistent responses. 
            This may indicate the candidate answered impulsively, was trying to present a favorable image, or didn't fully understand some questions.
          </p>
          <div className="space-y-2">
            {truthfulness.inconsistentPairs.map((pair, i) => {
              const q1 = questions.find(q => q.id === pair.q1Id);
              const q2 = questions.find(q => q.id === pair.q2Id);
              return (
                <div key={i} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-foreground mb-1">Inconsistent Pair (Δ{pair.delta}):</p>
                  <p className="text-xs text-muted-foreground">• "{q1?.text}"</p>
                  <p className="text-xs text-muted-foreground">• "{q2?.text}"</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths */}
      <div className="card-elevated p-5">
        <h3 className="flex items-center gap-2 font-semibold font-display text-foreground mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          Strongest Competencies
        </h3>
        {strengths.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dimensions scored above 60%. This is a significant concern for a Team Leader role at Datapath.</p>
        ) : (
          <div className="space-y-3">
            {strengths.map((s) => {
              const dim = dimensions.find((d) => d.id === s.dimensionId)!;
              const desc = s.normalizedScore >= 65 ? dim.scoreDescriptions.high : dim.scoreDescriptions.mid;
              return (
                <div key={s.dimensionId} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {dim.name}{" "}
                      <span className="text-muted-foreground font-normal">({s.normalizedScore}%)</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Risk Areas */}
      <div className="card-elevated p-5">
        <h3 className="flex items-center gap-2 font-semibold font-display text-foreground mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Risk Areas & Development Needs
        </h3>
        {risks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No significant gaps detected. This candidate shows solid competency across all dimensions.</p>
        ) : (
          <div className="space-y-3">
            {risks.map((s) => {
              const dim = dimensions.find((d) => d.id === s.dimensionId)!;
              return (
                <div key={s.dimensionId} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {dim.name}{" "}
                      <span className="text-muted-foreground font-normal">({s.normalizedScore}%)</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{dim.scoreDescriptions.low}</p>
                    <p className="text-xs text-primary mt-1">💡 {dim.growthSuggestion}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Role Fit Summary */}
      <div className="card-elevated p-5">
        <h3 className="flex items-center gap-2 font-semibold font-display text-foreground mb-4">
          <Briefcase className="w-5 h-5 text-primary" />
          Role Fit Summary
        </h3>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            This assessment evaluates readiness for a <strong>Team Leader</strong> role at <strong>Datapath</strong>, an MSP supporting dozens of clients' infrastructure. The ideal candidate needs to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Lead by example — set high standards and inspire the engineering team through visible leadership</li>
            <li>Thrive in a dynamic MSP environment — juggling multiple client accounts with shifting priorities</li>
            <li>Solve complex problems creatively across diverse client environments</li>
            <li>Build positive team culture and strong client relationships through excellent communication</li>
            <li>Manage and optimize Microsoft Azure and cloud infrastructure across client tenants</li>
            <li>Administer Microsoft 365 environments including Exchange, Teams, SharePoint, and Intune</li>
            <li>Ensure cybersecurity and compliance across all client accounts</li>
            <li>Guide and manage network engineers on infrastructure projects including switches, firewalls, and VPNs</li>
            <li>Demonstrate strong IT fundamentals (CompTIA A+/Server+ level knowledge)</li>
            <li>Use data and analytics to drive operational decisions (CompTIA Data+ level knowledge)</li>
            <li>Lead advanced cybersecurity operations (CompTIA CySA+/PenTest+ level knowledge)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InsightsTab;
