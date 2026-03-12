import { useRef, useCallback } from "react";
import { DimensionScore, DISCProfile, TruthtfulnessResult } from "@/types/assessment";
import { dimensions, competencyDimensions, comptiaDimensions, discDimensions } from "@/data/dimensions";
import { getArchetype } from "@/lib/archetypes";
import { classifyTier, TIER_COLORS } from "@/lib/tierClassification";

interface PDFExportProps {
  scores: DimensionScore[];
  discProfile: DISCProfile;
  truthfulness: TruthtfulnessResult;
  elapsedSeconds: number;
  employeeName?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} seconds`;
  return `${m}m ${s}s`;
}

export function usePDFExport() {
  const printRef = useRef<HTMLDivElement>(null);

  const exportPDF = useCallback((props: PDFExportProps) => {
    const { scores, discProfile, truthfulness, elapsedSeconds, employeeName } = props;
    const archetype = getArchetype(scores);
    const tier = classifyTier(scores);
    const tierColor = TIER_COLORS[tier.tier];

    const allCompetencyScores = scores.filter(s =>
      [...competencyDimensions, ...comptiaDimensions].some(d => d.id === s.dimensionId)
    );

    const strengthDims = allCompetencyScores.filter(s => s.normalizedScore >= 65);
    const gapDims = allCompetencyScores.filter(s => s.normalizedScore < 40);

    const discLabels: Record<string, string> = {
      D: "Dominance", I: "Influence", S: "Steadiness", C: "Conscientiousness"
    };

    const scoreRows = [...competencyDimensions, ...comptiaDimensions].map(dim => {
      const s = scores.find(sc => sc.dimensionId === dim.id);
      const pct = s?.normalizedScore ?? 0;
      const label = pct >= 75 ? "Excellent" : pct >= 60 ? "Good" : pct >= 45 ? "Developing" : "Gap";
      const color = pct >= 75 ? "#059669" : pct >= 60 ? "#0ea5e9" : pct >= 45 ? "#d97706" : "#dc2626";
      return { name: dim.name, pct, label, color };
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${employeeName ? `${employeeName} - ` : ""}Datapath Assessment Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; background: white; padding: 40px; font-size: 13px; line-height: 1.5; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #00a651; }
    .header h1 { font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .header p { color: #666; font-size: 12px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 700; color: #00a651; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .tier-card { text-align: center; border-left: 4px solid ${tierColor}; }
    .tier-label { font-size: 18px; font-weight: 700; color: ${tierColor}; }
    .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; }
    .meta { display: flex; gap: 20px; justify-content: center; color: #666; font-size: 12px; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
    th { font-weight: 600; color: #666; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
    .bar-bg { background: #f3f4f6; border-radius: 4px; height: 8px; width: 100%; }
    .bar-fill { height: 8px; border-radius: 4px; }
    .disc-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .disc-label { width: 120px; font-weight: 600; font-size: 12px; }
    .disc-bar { flex: 1; height: 10px; background: #f3f4f6; border-radius: 5px; overflow: hidden; }
    .disc-fill { height: 100%; border-radius: 5px; }
    .disc-value { width: 40px; text-align: right; font-weight: 700; font-size: 12px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .list-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #999; font-size: 10px; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
    .print-btn { display: block; margin: 0 auto 30px; padding: 10px 30px; background: #00a651; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .print-btn:hover { background: #008f45; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="header">
    <h1>${employeeName ? `${employeeName}'s Assessment Report` : "Datapath Technical Resource Assessment"}</h1>
    <p>Datapath Technical Resource Assessment · Generated ${new Date().toLocaleDateString()}</p>
    <div class="meta">
      <span>⏱ ${formatDuration(elapsedSeconds)}</span>
      <span>🎯 ${archetype.name}</span>
      <span>DISC: ${discProfile.primaryType}${discProfile.secondaryType}</span>
    </div>
  </div>

  <!-- Tier Classification -->
  <div class="section">
    <div class="section-title">Tier Classification</div>
    <div class="card tier-card">
      <div class="tier-label">${tier.label}</div>
      <div style="margin-top:4px;">
        <span class="badge" style="background:${tierColor}20;color:${tierColor}">${tier.confidence}% confidence</span>
      </div>
      <p style="color:#666;margin-top:8px;font-size:12px;">${tier.reasoning}</p>
    </div>
  </div>

  <!-- Truthfulness -->
  ${truthfulness.score >= 0 ? `
  <div class="section">
    <div class="section-title">Response Consistency</div>
    <div class="card" style="border-left:4px solid ${truthfulness.score >= 80 ? "#059669" : truthfulness.score >= 60 ? "#d97706" : "#dc2626"}">
      <strong>${truthfulness.label} (${truthfulness.score}%)</strong>
      <p style="color:#666;font-size:12px;margin-top:4px;">
        ${truthfulness.score >= 80
          ? "Responses are highly consistent. Assessment appears trustworthy."
          : truthfulness.score >= 60
          ? `Some inconsistencies detected across ${truthfulness.inconsistentPairs.length} question pair(s).`
          : `Significant inconsistencies detected across ${truthfulness.inconsistentPairs.length} question pair(s).`
        }
      </p>
    </div>
  </div>
  ` : ""}

  <!-- Competency Scores -->
  <div class="section">
    <div class="section-title">Competency & Technical Scores</div>
    <table>
      <thead><tr><th>Dimension</th><th>Score</th><th style="width:40%">Bar</th><th>Rating</th></tr></thead>
      <tbody>
        ${scoreRows.map(r => `
        <tr>
          <td>${r.name}</td>
          <td style="font-weight:700">${r.pct}%</td>
          <td><div class="bar-bg"><div class="bar-fill" style="width:${r.pct}%;background:${r.color}"></div></div></td>
          <td><span class="badge" style="background:${r.color}20;color:${r.color}">${r.label}</span></td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <!-- DISC Profile -->
  <div class="section">
    <div class="section-title">DISC Behavioral Profile — ${discProfile.primaryType}${discProfile.secondaryType}</div>
    <div class="card">
      ${(["D", "I", "S", "C"] as const).map(t => {
        const colors: Record<string, string> = { D: "#b91c1c", I: "#ea580c", S: "#0284c7", C: "#4338ca" };
        return `
        <div class="disc-row">
          <div class="disc-label">${discLabels[t]} (${t})</div>
          <div class="disc-bar"><div class="disc-fill" style="width:${discProfile[t]}%;background:${colors[t]}"></div></div>
          <div class="disc-value" style="color:${colors[t]}">${discProfile[t]}%</div>
        </div>`;
      }).join("")}
    </div>
  </div>

  <!-- Strengths & Gaps -->
  <div class="section">
    <div class="section-title">Strengths & Development Areas</div>
    <div class="two-col">
      <div class="card">
        <strong style="color:#059669">Strengths (${strengthDims.length})</strong>
        <div style="margin-top:8px;">
          ${strengthDims.length === 0 ? '<p style="color:#666;font-size:12px;">No dimensions scored 65%+</p>' :
            strengthDims.map(s => {
              const dim = dimensions.find(d => d.id === s.dimensionId)!;
              return `<div class="list-item"><div class="dot" style="background:#059669"></div><div><strong style="font-size:12px">${dim.name}</strong> <span style="color:#666">(${s.normalizedScore}%)</span></div></div>`;
            }).join("")
          }
        </div>
      </div>
      <div class="card">
        <strong style="color:#dc2626">Gaps (${gapDims.length})</strong>
        <div style="margin-top:8px;">
          ${gapDims.length === 0 ? '<p style="color:#666;font-size:12px;">No significant gaps detected</p>' :
            gapDims.map(s => {
              const dim = dimensions.find(d => d.id === s.dimensionId)!;
              return `<div class="list-item"><div class="dot" style="background:#dc2626"></div><div><strong style="font-size:12px">${dim.name}</strong> <span style="color:#666">(${s.normalizedScore}%)</span></div></div>`;
            }).join("")
          }
        </div>
      </div>
    </div>
  </div>

  <!-- Recommendation -->
  <div class="section">
    <div class="section-title">Recommendation</div>
    <div class="card" style="border-left:4px solid ${archetype.recommendationColor}">
      <strong style="color:${archetype.recommendationColor}">${archetype.recommendationLabel}</strong>
      <p style="color:#666;margin-top:4px;font-size:12px;">${archetype.recommendationDescription}</p>
    </div>
  </div>

  <div class="footer">
    Datapath Technical Resource Assessment · Confidential · ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }, []);

  return { exportPDF };
}
