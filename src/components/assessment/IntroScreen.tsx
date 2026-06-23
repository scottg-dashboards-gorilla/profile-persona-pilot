import { useState, useMemo, useEffect } from "react";
import { Monitor, Shield, Target, Users, ArrowRight, Clock, HelpCircle, Zap, MessageSquare, RotateCcw, PlayCircle } from "lucide-react";
import { competencyDimensions, comptiaDimensions, discDimensions } from "@/data/dimensions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSavedProgress } from "@/hooks/useAssessment";
import { DEFAULT_ROLE } from "@/data/roles";
import { useRoles } from "@/hooks/useRoles";
import { questions as allQuestions } from "@/data/questions";

interface IntroScreenProps {
  onBegin: (name: string, role: string) => void;
  onResume: () => void;
}

const competencyAreas = [
  {
    icon: Users,
    name: "Leadership, DISC & Adaptability",
    description: "Leading by example, behavioral style profiling (DISC), and thriving in a dynamic multi-client MSP environment.",
  },
  {
    icon: Monitor,
    name: "Azure, M365 & CompTIA Technical",
    description: "Microsoft Azure, M365, plus CompTIA-aligned questions across A+, Network+, Security+, Cloud+, CySA+, Data+, and more.",
  },
  {
    icon: Shield,
    name: "Security & Problem Solving",
    description: "Cybersecurity, compliance, critical thinking, and creative problem-solving across diverse client accounts.",
  },
  {
    icon: MessageSquare,
    name: "Culture, Communication & Consistency",
    description: "Team culture, client relationships, and built-in consistency checks to ensure assessment truthfulness.",
  },
];

const IntroScreen = ({ onBegin, onResume }: IntroScreenProps) => {
  const [name, setName] = useState("");
  const { roles } = useRoles();
  const [role, setRole] = useState<string>(DEFAULT_ROLE);
  const savedProgress = getSavedProgress();

  // If default role isn't in the active list (e.g. admin hid it), pick the first available.
  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.id === role)) {
      setRole(roles[0].id);
    }
  }, [roles, role]);

  const selectedRole = roles.find((r) => r.id === role) ?? roles[0];

  const answeredCount = savedProgress ? Object.keys(savedProgress.answers).length : 0;
  const savedName = savedProgress?.employeeName ?? "";

  const questionCount = useMemo(() => {
    const allowed = new Set(selectedRole?.dimensions ?? []);
    return allQuestions.filter((q) => allowed.has(q.dimensionId)).length;
  }, [selectedRole]);

  const estMinutes = Math.max(3, Math.round(questionCount * 0.2));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-foreground mb-3 leading-tight">
            Datapath Technical Resource Assessment
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
            Evaluate this resource's technical depth, leadership capability, behavioral style, and determine their ideal tier placement at Datapath.
          </p>
        </div>

        {/* Saved Progress Banner */}
        {savedProgress && (
          <div className="mb-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Welcome back, {savedName}!
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  You have saved progress — <span className="font-semibold text-primary">{answeredCount} question{answeredCount === 1 ? "" : "s"}</span> answered. Pick up where you left off or start a new assessment.
                </p>
                <div className="flex items-center gap-3">
                  <Button onClick={onResume} className="gap-2">
                    <PlayCircle className="w-4 h-4" />
                    Resume Assessment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Clear saved and let them start fresh via the form below
                      localStorage.removeItem("datapath-assessment-progress");
                      window.location.reload();
                    }}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Start Fresh
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
              Assessment Dimensions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[...competencyDimensions, ...comptiaDimensions, ...discDimensions].map((dim) => (
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
              Resource Name
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

          {/* Role selector */}
          <div className="mb-6">
            <label htmlFor="employee-role" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Role
            </label>
            <Select value={role} onValueChange={(v) => setRole(v)}>
              <SelectTrigger id="employee-role" className="h-11">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedRole?.description}
            </p>
          </div>

          {/* Meta Info */}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6 py-3 border-t border-b border-border">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              About {estMinutes} minute{estMinutes === 1 ? "" : "s"}
            </span>
            <span className="text-border">|</span>
            <span>{questionCount} questions</span>
          </div>

          {/* Info note */}
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3 mb-6">
            <strong>Note:</strong> This assessment should be completed by the resource themselves. Results will include a tier placement recommendation, DISC behavioral profile, response consistency score, and competency analysis across leadership and technical dimensions.
          </div>

          {/* CTA */}
          <Button
            onClick={() => onBegin(name.trim(), role)}
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
