import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface WorkflowHeroProps {
  title: string;
  description: string;
  actionLabel: string;
  to: string;
  icon: LucideIcon;
  variant?: "default" | "warning" | "info";
  className?: string;
}

export function WorkflowHero({
  title,
  description,
  actionLabel,
  to,
  icon: Icon,
  variant = "default",
  className,
}: WorkflowHeroProps) {
  const isExternal = to.startsWith("http");
  const Wrapper = isExternal ? "a" : Link;
  const wrapperProps = isExternal ? { href: to, target: "_blank", rel: "noopener noreferrer" } : { to };

  return (
    <Card className={cn("overflow-hidden border-none shadow-md", className)}>
      <CardContent className={cn(
        "p-0 flex flex-col sm:flex-row items-stretch",
        variant === "default" && "bg-gradient-to-r from-indigo-600 to-violet-600 text-white",
        variant === "warning" && "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
        variant === "info" && "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
      )}>
        <div className="flex-1 p-6 flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-tight">{title}</h2>
            <p className="text-white/80 text-sm max-w-md">{description}</p>
          </div>
        </div>
        <div className="p-6 flex items-center bg-black/10 sm:bg-transparent">
          <Button asChild variant="secondary" className="w-full sm:w-auto font-semibold">
            <Wrapper {...(wrapperProps as any)}>
              {actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Wrapper>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
