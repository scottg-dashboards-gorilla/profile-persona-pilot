import { useMemo } from "react";
import { DimensionScore } from "@/types/assessment";
import { dimensions } from "@/data/dimensions";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from "recharts";

interface EmployeeProfile {
  id: string;
  employee_name: string;
  scores: DimensionScore[];
  elapsed_seconds: number;
  created_at: string;
}

interface TeamAnalyticsProps {
  profiles: EmployeeProfile[];
}

type Band = "low" | "mid" | "high";

function getBand(score: number): Band {
  if (score <= 33) return "low";
  if (score <= 66) return "mid";
  return "high";
}

const BAND_COLORS = {
  low: "hsl(var(--chart-1))",
  mid: "hsl(var(--chart-3))",
  high: "hsl(var(--chart-2))",
};

const TeamAnalytics = ({ profiles }: TeamAnalyticsProps) => {
  const stats = useMemo(() => {
    return dimensions.map((dim) => {
      const scores = profiles
        .map((p) => p.scores.find((s) => s.dimensionId === dim.id)?.normalizedScore)
        .filter((s): s is number => s !== undefined);

      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const min = scores.length ? Math.min(...scores) : 0;
      const max = scores.length ? Math.max(...scores) : 0;

      const bands = { low: 0, mid: 0, high: 0 };
      scores.forEach((s) => bands[getBand(s)]++);

      return { dim, avg, min, max, bands, count: scores.length };
    });
  }, [profiles]);

  const radarData = stats.map((s) => ({
    dimension: s.dim.name.split(" ")[0],
    fullName: s.dim.name,
    average: s.avg,
  }));

  if (profiles.length < 2) {
    return (
      <div className="card-elevated p-6 text-center">
        <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Add at least 2 profiles to see team analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Radar overview */}
      <div className="card-elevated p-5">
        <h3 className="font-semibold text-foreground mb-1">Team Averages</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Average score across {profiles.length} employee{profiles.length !== 1 ? "s" : ""} per dimension (0–100)
        </p>
        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <Radar
                name="Team Avg"
                dataKey="average"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(value: number, _name: string, props: any) => [
                  `${value}`,
                  props.payload.fullName,
                ]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution bars */}
      <div className="card-elevated p-5">
        <h3 className="font-semibold text-foreground mb-1">Score Distribution</h3>
        <p className="text-xs text-muted-foreground mb-4">
          How employees are distributed across low (0–33), mid (34–66), and high (67–100) bands
        </p>
        <div className="space-y-4">
          {stats.map((s) => (
            <div key={s.dim.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground">{s.dim.name}</span>
                <span className="text-xs text-muted-foreground">avg {s.avg}</span>
              </div>
              <div className="flex gap-1 h-6 rounded-md overflow-hidden">
                {(["low", "mid", "high"] as Band[]).map((band) => {
                  const pct = s.count > 0 ? (s.bands[band] / s.count) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={band}
                      className="flex items-center justify-center text-[10px] font-medium transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: BAND_COLORS[band],
                        color: "hsl(var(--primary-foreground))",
                      }}
                      title={`${band}: ${s.bands[band]} (${Math.round(pct)}%)`}
                    >
                      {s.bands[band]}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-muted-foreground">{s.dim.lowLabel}</span>
                <span className="text-[10px] text-muted-foreground">{s.dim.highLabel}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
          {(["low", "mid", "high"] as Band[]).map((band) => (
            <div key={band} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: BAND_COLORS[band] }}
              />
              <span className="text-[11px] text-muted-foreground capitalize">{band} (0–33 / 34–66 / 67–100)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Range table */}
      <div className="card-elevated p-5">
        <h3 className="font-semibold text-foreground mb-3">Dimension Ranges</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Dimension</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Min</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Avg</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Max</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Spread</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.dim.id} className="border-b border-border/50">
                  <td className="py-2 text-foreground">{s.dim.name}</td>
                  <td className="py-2 text-center text-muted-foreground">{s.min}</td>
                  <td className="py-2 text-center font-semibold text-foreground">{s.avg}</td>
                  <td className="py-2 text-center text-muted-foreground">{s.max}</td>
                  <td className="py-2 text-center text-muted-foreground">{s.max - s.min}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamAnalytics;
