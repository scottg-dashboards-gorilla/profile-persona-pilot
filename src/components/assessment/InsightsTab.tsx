import { DimensionScore } from "@/types/assessment";
import { dimensions } from "@/data/dimensions";
import { CheckCircle, AlertTriangle, Briefcase } from "lucide-react";

interface InsightsTabProps {
  scores: DimensionScore[];
}

const InsightsTab = ({ scores }: InsightsTabProps) => {
  const sorted = [...scores].sort((a, b) => b.normalizedScore - a.normalizedScore);
  const strengths = sorted.filter(s => s.normalizedScore >= 60).slice(0, 4);
  const risks = sorted.filter(s => s.normalizedScore < 50).reverse().slice(0, 4);

  return (
    <div className="animate-fade-in space-y-6">
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
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InsightsTab;
