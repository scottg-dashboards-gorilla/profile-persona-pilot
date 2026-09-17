import { useId } from "react";
import { DimensionScore } from "@/types/assessment";
import { dimensions, competencyDimensions, comptiaDimensions } from "@/data/dimensions";
import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type PreviousAttempt = {
  taken_at: string;
  scores: Record<string, number>;
};

/** Anything smaller than this is treated as "no real change". */
const STALL_BAND = 3;

const shortLabel = (name: string) =>
  name
    .replace("Microsoft ", "")
    .replace(" & Cloud Infrastructure", "")
    .replace(" Administration", "")
    .replace(" & Leading by Example", "")
    .replace(" & MSP Dynamics", "")
    .replace(" & Critical Thinking", "")
    .replace(" & Communication", "")
    .replace(" & Compliance", "")
    .replace(" & Infrastructure Management", "")
    .replace("IT Fundamentals & Support ", "")
    .replace("Data & Analytics ", "")
    .replace("Advanced Cybersecurity ", "")
    .replace(/\(.*\)/, "")
    .trim();

/**
 * Side-by-side view of this assessment against the person's previous one:
 * an overlaid competency map plus what improved, stalled and slipped back.
 */
const ProgressComparison = ({
  scores,
  previous,
}: {
  scores: DimensionScore[];
  previous: PreviousAttempt;
}) => {
  const gradientId = useId().replace(/:/g, "");
  const trackedDims = [...competencyDimensions, ...comptiaDimensions];

  const rows = trackedDims
    .map((dim) => {
      const now = Number(scores.find((s) => s.dimensionId === dim.id)?.normalizedScore ?? NaN);
      const then = Number(previous.scores[dim.id] ?? NaN);
      if (!Number.isFinite(now) || !Number.isFinite(then)) return null;
      return {
        id: dim.id,
        name: dimensions.find((d) => d.id === dim.id)?.name ?? dim.name,
        short: shortLabel(dim.name) || dim.name.split(" ")[0],
        now: Math.round(now),
        then: Math.round(then),
        delta: Math.round(now - then),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return null;

  const improved = rows.filter((r) => r.delta > STALL_BAND).sort((a, b) => b.delta - a.delta);
  const regressed = rows.filter((r) => r.delta < -STALL_BAND).sort((a, b) => a.delta - b.delta);
  const stalled = rows.filter((r) => Math.abs(r.delta) <= STALL_BAND);

  const radarData = rows.map((r) => ({ dimension: r.short, now: r.now, then: r.then }));
  const avgDelta = Math.round(rows.reduce((s, r) => s + r.delta, 0) / rows.length);

  const groups = [
    {
      key: "improved",
      label: "Improved",
      items: improved,
      Icon: TrendingUp,
      color: "hsl(var(--primary))",
    },
    {
      key: "stalled",
      label: "About the same",
      items: stalled,
      Icon: Minus,
      color: "hsl(var(--muted-foreground))",
    },
    {
      key: "regressed",
      label: "Slipped back",
      items: regressed,
      Icon: TrendingDown,
      color: "hsl(var(--destructive))",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="card-elevated p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <History className="w-4 h-4" /> Compared with your last assessment
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Previous assessment taken {format(parseISO(previous.taken_at), "d MMM yyyy")}
            </p>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: avgDelta >= 0 ? "hsl(var(--primary)/0.12)" : "hsl(var(--destructive)/0.12)",
              color: avgDelta >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))",
            }}
          >
            {avgDelta >= 0 ? "+" : ""}
            {avgDelta} pts on average
          </span>
        </div>

        <div className="w-full" style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="66%">
              <defs>
                <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                </radialGradient>
              </defs>
              <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickCount={5} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Radar
                name="Last time"
                dataKey="then"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 3"
                fill="hsl(var(--muted-foreground))"
                fillOpacity={0.08}
                strokeWidth={2}
              />
              <Radar
                name="This time"
                dataKey="now"
                stroke="hsl(var(--primary))"
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                strokeWidth={3}
                dot={{ r: 3.5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {groups.map(({ key, label, items, Icon, color }) => (
          <div key={key} className="card-elevated p-4">
            <div className="flex items-center gap-2 mb-2" style={{ color }}>
              <Icon className="w-4 h-4" />
              <h4 className="text-sm font-semibold">
                {label} ({items.length})
              </h4>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing in this group.</p>
            ) : (
              <ul className="space-y-1.5">
                {items.map((r) => (
                  <li key={r.id} className="text-xs flex items-start justify-between gap-2">
                    <span className="text-foreground">{r.name}</span>
                    <span className="font-semibold whitespace-nowrap" style={{ color }}>
                      {r.then} → {r.now}
                      {key !== "stalled" && ` (${r.delta > 0 ? "+" : ""}${r.delta})`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressComparison;
