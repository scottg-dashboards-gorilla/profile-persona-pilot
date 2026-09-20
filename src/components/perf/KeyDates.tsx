import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cycleWindows,
  cycleYearFor,
  formatWindow,
  windowStatusLabel,
} from "@/lib/cycleDates";

/**
 * The published year-end dates, so nobody has to ask when their input is due.
 * `audience` trims the list to what that person actually owns.
 */
export function KeyDates({
  audience = "employee",
  className,
}: {
  audience?: "employee" | "manager";
  className?: string;
}) {
  const cycleYear = cycleYearFor();
  const windows = cycleWindows(cycleYear).filter((w) =>
    audience === "employee"
      ? w.milestone.who !== "Manager"
      : w.milestone.who !== "Employee",
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" /> Key dates · {cycleYear} year end
        </CardTitle>
        <CardDescription>
          {audience === "employee"
            ? "When your input is due and when you'll have your conversation."
            : "When your team's input lands and when your own input is due."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {windows.map((w) => (
          <div
            key={w.milestone.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-md border p-3",
              w.status === "open" && "border-primary/40 bg-primary/5",
              w.status === "closed" && "opacity-60",
            )}
          >
            <div className="min-w-[200px]">
              <div className="text-sm font-medium">{w.milestone.label}</div>
              <div className="text-xs text-muted-foreground">{w.milestone.detail}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{formatWindow(w)}</div>
              <Badge
                variant={w.status === "open" ? "default" : w.status === "upcoming" ? "secondary" : "outline"}
                className="mt-1"
              >
                {windowStatusLabel(w)}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default KeyDates;
