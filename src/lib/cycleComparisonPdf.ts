import { format, parseISO } from "date-fns";
import { AttemptRow, discDelta, technicalDelta, tierChange, readableTier } from "@/lib/assessmentDeltas";

type EmployeeMeta = {
  name: string;
  title?: string | null;
  department?: string | null;
};

function deltaColor(d: number) {
  if (d > 0) return "#059669";
  if (d < 0) return "#dc2626";
  return "#6b7280";
}

export function exportCycleComparisonPdf(employee: EmployeeMeta, attempts: AttemptRow[]) {
  const sorted = [...attempts].sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  const rows = sorted
    .slice()
    .reverse()
    .map((curr) => {
      const idx = sorted.findIndex((a) => a.id === curr.id);
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const disc = discDelta(prev, curr);
      const tech = technicalDelta(prev, curr);
      const techAvg = tech.length ? tech.reduce((s, d) => s + (d.delta ?? 0), 0) / tech.length : 0;
      const tier = tierChange(prev, curr);
      const topUp = [...tech].filter((d) => d.delta != null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];
      const topDown = [...tech].filter((d) => d.delta != null).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))[0];
      return { curr, prev, disc, tech, tier, techAvg, topUp, topDown };
    });

  const win = window.open("", "_blank");
  if (!win) return;

  const generatedAt = format(new Date(), "MMM d, yyyy h:mma");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Cycle comparison · ${employee.name}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; margin: 32px; }
  h1 { margin: 0 0 4px 0; font-size: 22px; }
  .sub { color: #555; font-size: 12px; margin-bottom: 24px; }
  .meta { font-size: 12px; color: #777; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; page-break-inside: avoid; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; vertical-align: top; text-align: left; }
  th { background: #f4f4f5; font-weight: 600; }
  .chip { display: inline-block; border: 1px solid #ddd; border-radius: 9999px; padding: 1px 6px; font-size: 11px; margin: 1px; }
  .section { font-size: 14px; font-weight: 600; margin: 24px 0 8px; }
  .footer { font-size: 10px; color: #888; margin-top: 32px; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { margin: 16mm; } button { display: none; } }
  button { padding: 8px 14px; background: hsl(155, 100%, 32%); color: white; border: 0; border-radius: 6px; font-weight: 600; cursor: pointer; }
</style></head>
<body>
  <button onclick="window.print()">Print / Save as PDF</button>
  <h1>Cycle-to-cycle assessment comparison</h1>
  <div class="sub">${employee.name}${employee.title ? ` · ${employee.title}` : ""}${employee.department ? ` · ${employee.department}` : ""}</div>
  <div class="meta">${attempts.length} attempt${attempts.length === 1 ? "" : "s"} on file · generated ${generatedAt}</div>

  ${rows.length === 0 ? `<p>No assessment attempts on file.</p>` : `
  <div class="section">Per-attempt deltas</div>
  <table>
    <thead><tr>
      <th>Attempt</th>
      <th>Tier</th>
      <th>DISC shift</th>
      <th>Avg technical Δ</th>
      <th>Top improvement</th>
      <th>Biggest drop</th>
    </tr></thead>
    <tbody>
      ${rows
        .map(
          ({ curr, prev, disc, tier, techAvg, topUp, topDown }) => `
        <tr>
          <td>
            <div><strong>${format(parseISO(curr.taken_at), "MMM d, yyyy")}</strong></div>
            ${prev ? `<div style="color:#777">vs ${format(parseISO(prev.taken_at), "MMM d, yyyy")}</div>` : ""}
          </td>
          <td>${prev ? `${readableTier(tier.from)} → ${readableTier(tier.to)}` : readableTier(tier.to)}</td>
          <td>${disc
            .map(
              (d) =>
                `<span class="chip" style="color:${deltaColor(d.delta)}">${d.letter} ${d.delta >= 0 ? "+" : ""}${d.delta.toFixed(0)}</span>`,
            )
            .join("")}</td>
          <td style="color:${deltaColor(techAvg)}">${prev ? `${techAvg >= 0 ? "+" : ""}${techAvg.toFixed(1)}` : "—"}</td>
          <td style="color:#059669">${topUp?.delta != null && topUp.delta > 0 ? `${topUp.id} +${topUp.delta.toFixed(0)}` : "—"}</td>
          <td style="color:#dc2626">${topDown?.delta != null && topDown.delta < 0 ? `${topDown.id} ${topDown.delta.toFixed(0)}` : "—"}</td>
        </tr>`,
        )
        .join("")}
    </tbody>
  </table>

  <div class="section">Per-competency detail (latest attempt)</div>
  ${(() => {
    const latest = rows[0];
    if (!latest || latest.tech.length === 0) return `<p style="color:#777;font-size:12px">No competency scores recorded.</p>`;
    return `<table>
      <thead><tr><th>Competency</th><th>Previous</th><th>Current</th><th>Δ</th></tr></thead>
      <tbody>
        ${latest.tech
          .map(
            (d) => `<tr>
              <td>${d.id}</td>
              <td>${d.from != null ? d.from.toFixed(0) : "—"}</td>
              <td>${d.to.toFixed(0)}</td>
              <td style="color:${d.delta != null ? deltaColor(d.delta) : "#6b7280"}">
                ${d.delta == null ? "new" : `${d.delta >= 0 ? "+" : ""}${d.delta.toFixed(0)}`}
              </td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
  })()}
  `}

  <div class="footer">Datapath Performance · confidential</div>

  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body></html>`;

  win.document.write(html);
  win.document.close();
}