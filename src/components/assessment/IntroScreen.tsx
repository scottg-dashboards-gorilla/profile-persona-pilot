import { useState } from "react";
import { Monitor, Shield, Target, Users, ArrowRight, Clock, HelpCircle } from "lucide-react";
import { dimensions } from "@/data/dimensions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntroScreenProps {
  onBegin: (name: string) => void;
}

const competencyAreas = [
  {
    icon: Monitor,
    name: "Microsoft & Technical Depth",
    description: "Azure, M365, Active Directory/Entra ID, Exchange, SharePoint, Teams, and Intune expertise.",
  },
  {
    icon: Users,
    name: "Leadership & People",
    description: "Leading IT teams, mentoring, performance management, and building trust.",
  },
  {
    icon: Target,
    name: "Strategy & Innovation",
    description: "Aligning IT to business goals, thinking outside the box, and driving continuous improvement.",
  },
  {
    icon: Shield,
    name: "Security & Operations",
    description: "Cybersecurity, compliance frameworks, ITIL processes, and crisis management.",
  },
];

const IntroScreen = ({ onBegin }: IntroScreenProps) => {
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-foreground mb-3 leading-tight">
            IT Director Assessment
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
            Evaluate whether this candidate has the technical depth, leadership qualities, and strategic vision to lead as an IT Director.
          </p>
        </div>

        {/* Main Card */}
        <div className="card-elevated p-6 sm:p-8">
          {/* Competency Areas Grid */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Key Areas Assessed
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {competencyAreas.map((area) => (
                <div
                  key={area.name}
                  className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <area.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{area.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{area.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dimensions List */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              8 Competency Dimensions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dimensions.map((dim) => (
                <div key={dim.id} className="flex items-center gap-2 text-sm py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dim.color }}
                  />
                  <span className="text-foreground font-medium">{dim.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Candidate Name */}
          <div className="mb-6">
            <label htmlFor="employee-name" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Candidate Name
            </label>
            <Input
              id="employee-name"
              placeholder="Enter the candidate's full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              maxLength={100}
            />
          </div>

          {/* Meta Info */}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6 py-3 border-t border-b border-border">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Estimated time: 10–15 minutes
            </span>
            <span className="text-border">|</span>
            <span>40 questions</span>
          </div>

          {/* Info note */}
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3 mb-6">
            <strong>Note:</strong> This assessment should be completed by the candidate themselves. Results will include a hiring recommendation based on their self-reported competencies across all IT leadership dimensions.
          </div>

          {/* CTA */}
          <Button
            onClick={() => onBegin(name.trim())}
            disabled={!name.trim()}
            className="w-full h-12 text-base font-semibold gap-2"
            size="lg"
          >
            Begin Assessment
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntroScreen;
