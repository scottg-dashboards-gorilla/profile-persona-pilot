import { useState } from "react";
import { Brain, Target, Lightbulb, Gem, ArrowRight, Clock, HelpCircle } from "lucide-react";
import { dimensions } from "@/data/dimensions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IntroScreenProps {
  onBegin: (name: string) => void;
}

const frameworks = [
  {
    icon: Brain,
    name: "Big Five / OCEAN",
    description: "Openness, conscientiousness, extraversion, agreeableness, and neuroticism traits.",
  },
  {
    icon: Target,
    name: "DISC",
    description: "Dominance, influence, steadiness, and conscientiousness behavioral styles.",
  },
  {
    icon: Lightbulb,
    name: "MBTI Insights",
    description: "Cognitive preferences for perception, judgment, and energy direction.",
  },
  {
    icon: Gem,
    name: "CliftonStrengths",
    description: "Talent identification across executing, influencing, relationship, and strategic domains.",
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
            Workplace Personality Profile
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto">
            Discover your unique leadership style, work preferences, and cultural fit to set yourself up for success.
          </p>
        </div>

        {/* Main Card */}
        <div className="card-elevated p-6 sm:p-8">
          {/* Frameworks Grid */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              What This Assessment Measures
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {frameworks.map((fw) => (
                <div
                  key={fw.name}
                  className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <fw.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{fw.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{fw.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dimensions List */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              8 Dimensions Assessed
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dimensions.map((dim) => (
                <div key={dim.id} className="flex items-center gap-2 text-sm py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dim.color }}
                  />
                  <span className="text-foreground font-medium">{dim.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {dim.lowLabel} ↔ {dim.highLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Name */}
          <div className="mb-6">
            <label htmlFor="employee-name" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Employee Name
            </label>
            <Input
              id="employee-name"
              placeholder="Enter the employee's full name"
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
              Estimated time: 12–15 minutes
            </span>
            <span className="text-border">|</span>
            <span>40 questions</span>
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
