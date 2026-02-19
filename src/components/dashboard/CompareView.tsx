import { useState, useMemo } from "react";
import { DimensionScore } from "@/types/assessment";
import { dimensions } from "@/data/dimensions";
import { GitCompareArrows } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface EmployeeProfile {
  id: string;
  employee_name: string;
  scores: DimensionScore[];
  elapsed_seconds: number;
  created_at: string;
}

interface CompareViewProps {
  profiles: EmployeeProfile[];
}

const CompareView = ({ profiles }: CompareViewProps) => {
  const [idA, setIdA] = useState<string>("");
  const [idB, setIdB] = useState<string>("");

  const profileA = profiles.find((p) => p.id === idA);
  const profileB = profiles.find((p) => p.id === idB);

  const radarData = useMemo(() => {
    if (!profileA || !profileB) return [];
    return dimensions.map((dim) => {
      const scoreA = profileA.scores.find((s) => s.dimensionId === dim.id)?.normalizedScore ?? 50;
      const scoreB = profileB.scores.find((s) => s.dimensionId === dim.id)?.normalizedScore ?? 50;
      return {
        dimension: dim.name.split(" ")[0],
        fullName: dim.name,
        [profileA.employee_name]: scoreA,
        [profileB.employee_name]: scoreB,
      };
    });
  }, [profileA, profileB]);

  if (profiles.length < 2) {
    return (
      <div className="card-elevated p-6 text-center">
        <GitCompareArrows className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Add at least 2 profiles to compare.</p>
      </div>
    );
  }

  const bothSelected = profileA && profileB;

  return (
    <div className="space-y-5">
      {/* Selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Employee A</label>
          <Select value={idA} onValueChange={setIdA}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {profiles.filter((p) => p.id !== idB).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.employee_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Employee B</label>
          <Select value={idB} onValueChange={setIdB}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {profiles.filter((p) => p.id !== idA).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.employee_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!bothSelected && (
        <div className="card-elevated p-8 text-center">
          <GitCompareArrows className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select two employees to compare.</p>
        </div>
      )}

      {bothSelected && (
        <>
          {/* Radar overlay */}
          <div className="card-elevated p-5">
            <h3 className="font-semibold text-foreground mb-1">Overlay</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Dimension scores compared on a 0–100 scale
            </p>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Radar
                    name={profileA.employee_name}
                    dataKey={profileA.employee_name}
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Radar
                    name={profileB.employee_name}
                    dataKey={profileB.employee_name}
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side-by-side bars */}
          <div className="card-elevated p-5 space-y-4">
            <h3 className="font-semibold text-foreground">Dimension Breakdown</h3>
            {dimensions.map((dim) => {
              const sA = profileA.scores.find((s) => s.dimensionId === dim.id)?.normalizedScore ?? 50;
              const sB = profileB.scores.find((s) => s.dimensionId === dim.id)?.normalizedScore ?? 50;
              const diff = Math.abs(sA - sB);
              return (
                <div key={dim.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{dim.name}</span>
                    {diff >= 20 && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
                        Δ {diff}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {[
                      { name: profileA.employee_name, score: sA, color: "hsl(var(--chart-1))" },
                      { name: profileB.employee_name, score: sB, color: "hsl(var(--chart-2))" },
                    ].map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground w-20 truncate">{entry.name}</span>
                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all"
                            style={{ width: `${entry.score}%`, backgroundColor: entry.color }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground w-8 text-right">{entry.score}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{dim.lowLabel}</span>
                    <span className="text-[10px] text-muted-foreground">{dim.highLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CompareView;
