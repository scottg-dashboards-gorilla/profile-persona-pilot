import { DimensionScore } from "@/types/assessment";
import { dimensions, DimensionMeta } from "@/data/dimensions";
import { getArchetype } from "@/lib/archetypes";

function getDim(scores: DimensionScore[], id: string): number {
  return scores.find((s) => s.dimensionId === id)?.normalizedScore ?? 50;
}

function dimMeta(id: string): DimensionMeta {
  return dimensions.find((d) => d.id === id)!;
}

function descForScore(dim: DimensionMeta, score: number): string {
  if (score <= 35) return dim.scoreDescriptions.low;
  if (score >= 65) return dim.scoreDescriptions.high;
  return dim.scoreDescriptions.mid;
}

function labelForScore(dim: DimensionMeta, score: number): string {
  if (score <= 35) return dim.lowLabel;
  if (score >= 65) return dim.highLabel;
  return `developing`;
}

export function generateResponse(
  message: string,
  scores: DimensionScore[],
  archetypeName: string
): string {
  const lower = message.toLowerCase();

  // Strengths
  if (/strength|strong|best|excel|good at/i.test(lower)) {
    const top = [...scores].sort((a, b) => b.normalizedScore - a.normalizedScore).slice(0, 3);
    const lines = top.map((s) => {
      const d = dimMeta(s.dimensionId);
      return `• **${d.name}** (${s.normalizedScore}%) — ${descForScore(d, s.normalizedScore)}`;
    });
    return `As a **${archetypeName}**, this candidate's top competencies are:\n\n${lines.join("\n\n")}\n\nThese strengths suggest the candidate would be most effective in these aspects of the HR Head role.`;
  }

  // Weaknesses / Risks
  if (/weakness|gap|risk|concern|worry|red flag|improve/i.test(lower)) {
    const weak = [...scores].sort((a, b) => a.normalizedScore - b.normalizedScore).slice(0, 3);
    const lines = weak.map((s) => {
      const d = dimMeta(s.dimensionId);
      return `• **${d.name}** (${s.normalizedScore}%) — ${descForScore(d, s.normalizedScore)}\n  💡 ${d.growthSuggestion}`;
    });
    return `Here are the candidate's biggest risk areas:\n\n${lines.join("\n\n")}\n\nFor a solo HR Head at a 100-person company, these gaps could be significant. Consider whether mentoring, training, or additional support could address them.`;
  }

  // Recruiting
  if (/recruit|hiring|talent|sourcing|pipeline/i.test(lower)) {
    const score = getDim(scores, "talent-acquisition");
    const dim = dimMeta("talent-acquisition");
    return `**Recruiting & Talent Acquisition** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This candidate appears ready to build and execute a full recruiting strategy for your IT services company." : score >= 45 ? "They have foundational recruiting skills but may need support building a strategic talent acquisition function from scratch." : "This is a significant gap. Your 100-person IT company needs someone who can compete for scarce technical talent — this candidate may struggle here."}\n\n💡 ${dim.growthSuggestion}`;
  }

  // Coaching / Performance
  if (/coach|performance|manager|feedback|development/i.test(lower)) {
    const score = getDim(scores, "leadership-coaching");
    const dim = dimMeta("leadership-coaching");
    return `**Management Coaching** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This candidate can elevate your entire management team's people skills — a huge multiplier effect." : score >= 45 ? "They can handle standard coaching situations but may need development for complex leadership challenges." : "Coaching managers is a critical part of this role. This gap means your managers may not get the people development support they need."}`;
  }

  // Culture / Remote
  if (/culture|remote|engage|belong|connect|virtual/i.test(lower)) {
    const score = getDim(scores, "culture-building");
    const dim = dimMeta("culture-building");
    return `**Culture & Engagement** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This is exactly what a remote-first company needs — someone who intentionally designs culture rather than letting it happen by accident." : score >= 45 ? "They understand culture matters but may need to build their remote-specific toolkit." : "With most of your 100 employees working remotely, culture building is critical. This candidate may default to in-person approaches that don't translate."}\n\n💡 ${dim.growthSuggestion}`;
  }

  // Compliance
  if (/compliance|legal|law|risk|policy|handbook/i.test(lower)) {
    const score = getDim(scores, "compliance-risk");
    const dim = dimMeta("compliance-risk");
    return `**Compliance & Risk** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "Strong compliance awareness — they'll protect the company proactively." : score >= 45 ? "They handle standard compliance but remote multi-jurisdiction complexity may require outside support." : "⚠️ This is a significant risk. With remote workers across jurisdictions, compliance gaps can be very costly."}`;
  }

  // Pressure / Organization
  if (/pressure|stress|organiz|busy|overwhelm|priorit/i.test(lower)) {
    const score = getDim(scores, "pressure-resilience");
    const dim = dimMeta("pressure-resilience");
    return `**Pressure & Organization** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\nAs the sole HR leader for 100 people, they'll regularly face competing urgent priorities. ${score >= 65 ? "This candidate appears well-equipped for the intensity." : score < 45 ? "This is concerning — the role requires someone who thrives in high-demand environments." : "They can handle normal pressure but sustained chaos may impact their effectiveness."}`;
  }

  // Should I hire / recommendation
  if (/hire|recommend|should i|decision|verdict|good fit|right person/i.test(lower)) {
    const archetype = getArchetype(scores);
    const strong = scores.filter(s => s.normalizedScore >= 65);
    const weak = scores.filter(s => s.normalizedScore < 40);
    return `**Hiring Recommendation: ${archetype.recommendationLabel}**\n\n${archetype.recommendationDescription}\n\n**Profile: ${archetype.name}**\n${archetype.summary}\n\n${strong.length > 0 ? `**Strengths (${strong.length}):** ${strong.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(", ")}\n\n` : ""}${weak.length > 0 ? `**Gaps (${weak.length}):** ${weak.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(", ")}\n\n` : ""}**Key consideration:** This role requires running all of HR solo at a 100-person remote IT company. ${weak.length === 0 ? "This candidate appears well-rounded enough to handle the breadth." : `The gaps in ${weak.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(" and ")} could be challenging without support.`}`;
  }

  // Specific dimension names
  for (const dim of dimensions) {
    const patterns = [dim.id, dim.name.toLowerCase(), dim.lowLabel.toLowerCase(), dim.highLabel.toLowerCase()];
    if (patterns.some((p) => lower.includes(p))) {
      const score = getDim(scores, dim.id);
      return `**${dim.name}** — Score: **${score}%**\n\n${descForScore(dim, score)}\n\nOn the spectrum from **${dim.lowLabel}** to **${dim.highLabel}**, this candidate leans toward **${labelForScore(dim, score)}**.\n\n💡 ${dim.growthSuggestion}`;
    }
  }

  // Profile overview / catch-all
  const lines = scores.map((s) => {
    const d = dimMeta(s.dimensionId);
    return `• **${d.name}**: ${s.normalizedScore}% (${labelForScore(d, s.normalizedScore)})`;
  });
  return `Here's the candidate's complete competency profile (**${archetypeName}**):\n\n${lines.join("\n")}\n\nScores above 65% indicate strong competency. Below 40% indicates a significant gap for this role.\n\n---\n\nAsk me about **strengths**, **risk areas**, **hiring recommendation**, **recruiting ability**, **coaching skills**, **culture fit**, **compliance readiness**, or any specific dimension.`;
}

export function generateEnvironmentParagraph(scores: DimensionScore[]): string {
  const parts: string[] = [];

  const ta = getDim(scores, "talent-acquisition");
  parts.push(ta >= 65 ? "a strategic recruiting function with pipeline building and employer branding" : ta <= 35 ? "support with recruiting strategy and sourcing — this isn't their strongest area" : "a solid but developing approach to talent acquisition");

  const cb = getDim(scores, "culture-building");
  parts.push(cb >= 65 ? "intentional culture design with remote-specific programs and measurable engagement" : cb <= 35 ? "significant investment in developing remote culture-building capabilities" : "growing skills in remote culture building that will benefit from mentoring");

  const pr = getDim(scores, "pressure-resilience");
  parts.push(pr >= 65 ? "the ability to handle high-pressure, multi-priority environments with composure" : pr <= 35 ? "a more structured, predictable environment — they may struggle with the chaos of a growing company" : "reasonable ability to handle pressure with occasional support during peak periods");

  return `**Candidate Environment Fit**\n\nBased on the competency profile, this candidate would bring:\n\n• ${parts.join("\n• ")}\n\nFor a 100-person remote IT services company, consider how these capabilities align with your current needs and growth trajectory.`;
}
