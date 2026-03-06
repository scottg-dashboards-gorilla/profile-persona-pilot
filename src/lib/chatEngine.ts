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
    return `As a **${archetypeName}**, this candidate's top competencies are:\n\n${lines.join("\n\n")}\n\nThese strengths suggest the candidate would be most effective in these aspects of the IT Director role.`;
  }

  // Weaknesses / Risks
  if (/weakness|gap|risk|concern|worry|red flag|improve/i.test(lower)) {
    const weak = [...scores].sort((a, b) => a.normalizedScore - b.normalizedScore).slice(0, 3);
    const lines = weak.map((s) => {
      const d = dimMeta(s.dimensionId);
      return `• **${d.name}** (${s.normalizedScore}%) — ${descForScore(d, s.normalizedScore)}\n  💡 ${d.growthSuggestion}`;
    });
    return `Here are the candidate's biggest risk areas:\n\n${lines.join("\n\n")}\n\nFor an IT Director role, these gaps could be significant. Consider whether mentoring, training, or additional support could address them.`;
  }

  // Microsoft / Azure / M365
  if (/microsoft|azure|365|m365|active directory|entra|exchange|sharepoint|teams|intune/i.test(lower)) {
    const score = getDim(scores, "microsoft-environment");
    const dim = dimMeta("microsoft-environment");
    return `**Microsoft Environment Expertise** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This candidate has the deep Microsoft expertise needed to manage and optimize your environment." : score >= 45 ? "They have solid fundamentals but may need support with advanced Azure or hybrid configurations." : "This is a significant gap. An IT Director needs deep Microsoft platform knowledge to lead effectively."}\n\n💡 ${dim.growthSuggestion}`;
  }

  // Leadership / People / Team
  if (/leader|people|team|manag|mentor|develop|delegate/i.test(lower)) {
    const score = getDim(scores, "leadership-people");
    const dim = dimMeta("leadership-people");
    return `**Leadership & People Management** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This candidate can build and lead high-performing IT teams — a critical multiplier for the organization." : score >= 45 ? "They can manage a team competently but may need development as a true leader and mentor." : "Leadership is essential for an IT Director. This gap means the IT team may not get the direction and development they need."}`;
  }

  // Security
  if (/security|compliance|cyber|threat|soc|iso|zero.?trust|incident/i.test(lower)) {
    const score = getDim(scores, "security-compliance");
    const dim = dimMeta("security-compliance");
    return `**Security & Compliance** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "Strong security leadership — they'll protect the organization proactively." : score >= 45 ? "They understand basics but may need support with advanced security architecture and compliance frameworks." : "⚠️ This is a significant risk. An IT Director must lead security strategy and compliance efforts."}`;
  }

  // Innovation / Problem solving
  if (/innovat|creative|outside.?the.?box|problem.?solv|automat/i.test(lower)) {
    const score = getDim(scores, "problem-solving");
    const dim = dimMeta("problem-solving");
    return `**Problem Solving & Innovation** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This candidate brings creative thinking and continuous improvement — they won't just maintain, they'll transform." : score >= 45 ? "They solve problems competently but may default to conventional approaches." : "An IT Director needs to think beyond established procedures and drive innovation."}\n\n💡 ${dim.growthSuggestion}`;
  }

  // Communication / Culture
  if (/communicat|culture|stakeholder|present|translat|relationship/i.test(lower)) {
    const score = getDim(scores, "communication-culture");
    const dim = dimMeta("communication-culture");
    return `**Communication & Culture Fit** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "Excellent — they'll bridge the gap between IT and the business effortlessly." : score >= 45 ? "They communicate adequately but may struggle to position IT as a strategic partner." : "Communication skills are critical. An IT Director who can't translate tech to business will struggle to get buy-in."}\n\n💡 ${dim.growthSuggestion}`;
  }

  // Process / Operations
  if (/process|itil|change.?manage|sla|service|operation|runbook/i.test(lower)) {
    const score = getDim(scores, "process-operations");
    const dim = dimMeta("process-operations");
    return `**Process & IT Operations** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "They build structured, scalable IT operations — this means reliability and consistency." : score >= 45 ? "They follow processes but may need to mature their operational framework." : "Ad-hoc operations create risk. An IT Director needs to bring process discipline to the function."}`;
  }

  // Pressure / Crisis
  if (/pressure|stress|crisis|outage|calm|overwhelm|priorit/i.test(lower)) {
    const score = getDim(scores, "pressure-resilience");
    const dim = dimMeta("pressure-resilience");
    return `**Pressure & Crisis Management** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\nAs an IT Director, they'll face outages, security incidents, and competing urgent priorities regularly. ${score >= 65 ? "This candidate appears well-equipped for the intensity." : score < 45 ? "This is concerning — the role requires someone who thrives under pressure." : "They can handle normal pressure but sustained crises may impact their effectiveness."}`;
  }

  // Should I hire / recommendation
  if (/hire|recommend|should i|decision|verdict|good fit|right person/i.test(lower)) {
    const archetype = getArchetype(scores);
    const strong = scores.filter(s => s.normalizedScore >= 65);
    const weak = scores.filter(s => s.normalizedScore < 40);
    return `**Hiring Recommendation: ${archetype.recommendationLabel}**\n\n${archetype.recommendationDescription}\n\n**Profile: ${archetype.name}**\n${archetype.summary}\n\n${strong.length > 0 ? `**Strengths (${strong.length}):** ${strong.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(", ")}\n\n` : ""}${weak.length > 0 ? `**Gaps (${weak.length}):** ${weak.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(", ")}\n\n` : ""}**Key consideration:** An IT Director needs breadth across technical depth, leadership, strategy, security, and operations. ${weak.length === 0 ? "This candidate appears well-rounded enough to handle the breadth." : `The gaps in ${weak.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(" and ")} could be challenging without support.`}`;
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
  return `Here's the candidate's complete competency profile (**${archetypeName}**):\n\n${lines.join("\n")}\n\nScores above 65% indicate strong competency. Below 40% indicates a significant gap for this role.\n\n---\n\nAsk me about **strengths**, **risk areas**, **hiring recommendation**, **Microsoft expertise**, **leadership skills**, **security readiness**, **innovation ability**, **communication skills**, **process maturity**, or **crisis management**.`;
}

export function generateEnvironmentParagraph(scores: DimensionScore[]): string {
  const parts: string[] = [];

  const me = getDim(scores, "microsoft-environment");
  parts.push(me >= 65 ? "deep Microsoft platform expertise with ability to architect and optimize complex environments" : me <= 35 ? "significant gaps in Microsoft technology knowledge that would require supplemental support" : "solid but developing Microsoft environment skills that will benefit from continued growth");

  const lp = getDim(scores, "leadership-people");
  parts.push(lp >= 65 ? "proven leadership ability to build, develop, and inspire IT teams" : lp <= 35 ? "limited people management experience — may struggle in a director-level leadership role" : "developing leadership skills that would benefit from executive coaching");

  const pr = getDim(scores, "pressure-resilience");
  parts.push(pr >= 65 ? "the ability to lead calmly and decisively through crises and high-pressure situations" : pr <= 35 ? "difficulty handling the pressure and urgency inherent in IT leadership" : "reasonable ability to handle pressure with occasional support during sustained crises");

  return `**Candidate Environment Fit**\n\nBased on the competency profile, this candidate would bring:\n\n• ${parts.join("\n• ")}\n\nFor an IT Director role, consider how these capabilities align with your organization's current needs and growth trajectory.`;
}
