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
    return `As a **${archetypeName}**, this candidate's top competencies are:\n\n${lines.join("\n\n")}\n\nThese strengths suggest the candidate would be most effective in these aspects of the Team Leader role at Datapath.`;
  }

  // Weaknesses / Risks
  if (/weakness|gap|risk|concern|worry|red flag|improve/i.test(lower)) {
    const weak = [...scores].sort((a, b) => a.normalizedScore - b.normalizedScore).slice(0, 3);
    const lines = weak.map((s) => {
      const d = dimMeta(s.dimensionId);
      return `• **${d.name}** (${s.normalizedScore}%) — ${descForScore(d, s.normalizedScore)}\n  💡 ${d.growthSuggestion}`;
    });
    return `Here are the candidate's biggest risk areas:\n\n${lines.join("\n\n")}\n\nFor a Team Leader role at Datapath, these gaps could be significant. Consider whether mentoring, training, or additional support could address them.`;
  }

  // Azure / Cloud
  if (/azure|cloud|virtual|entra|hybrid|migration/i.test(lower)) {
    const score = getDim(scores, "azure-cloud");
    const dim = dimMeta("azure-cloud");
    return `**Microsoft Azure & Cloud Infrastructure** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This candidate has the deep Azure expertise needed to manage and optimize client cloud environments." : score >= 45 ? "They have solid fundamentals but may need support with advanced Azure networking or hybrid configurations." : "This is a significant gap. A Team Leader at Datapath needs strong Azure knowledge to guide the team across client environments."}\n\n💡 ${dim.growthSuggestion}`;
  }

  // M365
  if (/m365|365|exchange|sharepoint|teams|intune|microsoft 365/i.test(lower)) {
    const score = getDim(scores, "m365-admin");
    const dim = dimMeta("m365-admin");
    return `**Microsoft 365 Administration** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This candidate can confidently manage multi-tenant M365 environments across Datapath's client base." : score >= 45 ? "They can handle standard M365 administration but may need support with advanced configurations or multi-tenant scenarios." : "This gap is concerning. M365 is core to Datapath's service delivery — the Team Leader needs strong expertise here."}\n\n💡 ${dim.growthSuggestion}`;
  }

  // Leadership
  if (/leader|example|inspire|motivat|standard|roll.?up/i.test(lower)) {
    const score = getDim(scores, "leadership-example");
    const dim = dimMeta("leadership-example");
    return `**Leadership & Leading by Example** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This candidate leads from the front — exactly what Datapath needs to inspire the engineering team." : score >= 45 ? "They show management potential but may need development to become the kind of visible, inspiring leader the team needs." : "Leadership is critical for this role. The team needs someone who sets the pace through their own actions and standards."}`;
  }

  // Adaptability / MSP
  if (/adapt|dynamic|msp|multi.?client|context.?switch|juggl|priorit/i.test(lower)) {
    const score = getDim(scores, "adaptability-dynamics");
    const dim = dimMeta("adaptability-dynamics");
    return `**Adaptability & MSP Dynamics** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "They thrive in the fast-paced MSP world — perfect for Datapath's multi-client environment." : score >= 45 ? "They can handle multiple clients but may struggle during peak periods with competing urgent demands." : "This is a significant concern. Datapath's MSP model demands constant adaptability across dozens of client environments."}`;
  }

  // Problem Solving
  if (/problem|solv|troubleshoot|diagnos|root.?cause|critical.?think/i.test(lower)) {
    const score = getDim(scores, "problem-solving");
    const dim = dimMeta("problem-solving");
    return `**Problem Solving & Critical Thinking** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "This candidate excels at complex problem-solving — they'll be invaluable for escalations across client environments." : score >= 45 ? "They solve problems competently but may default to conventional approaches for complex cross-client issues." : "A Team Leader needs to be the escalation point for the team. This gap could mean unresolved issues impacting client satisfaction."}\n\n💡 ${dim.growthSuggestion}`;
  }

  // Culture / Communication
  if (/cultur|communicat|relationship|client|rapport|collaborat/i.test(lower)) {
    const score = getDim(scores, "culture-communication");
    const dim = dimMeta("culture-communication");
    return `**Culture & Communication** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "Excellent — they'll build strong client relationships and foster a positive Datapath team culture." : score >= 45 ? "They communicate adequately but may not actively shape team culture or build deep client relationships." : "Communication and culture are essential at Datapath. A Team Leader who can't connect with clients and teammates will struggle."}\n\n💡 ${dim.growthSuggestion}`;
  }

  // Security
  if (/security|compliance|cyber|threat|zero.?trust|incident/i.test(lower)) {
    const score = getDim(scores, "security-compliance");
    const dim = dimMeta("security-compliance");
    return `**Security & Compliance** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "Strong security leadership — they'll protect Datapath's clients proactively." : score >= 45 ? "They understand basics but may need support with advanced threat management across multiple client environments." : "⚠️ This is a significant risk. A Team Leader at an MSP must ensure security across all client accounts."}`;
  }

  // Network / Infrastructure
  if (/network|infrastructure|switch|firewall|vpn|wan|routing|engineer/i.test(lower)) {
    const score = getDim(scores, "network-infrastructure");
    const dim = dimMeta("network-infrastructure");
    return `**Network & Infrastructure Management** — Score: **${score}%** (${labelForScore(dim, score)})\n\n${descForScore(dim, score)}\n\n${score >= 65 ? "They can effectively guide network engineers and oversee complex client infrastructure projects." : score >= 45 ? "They have solid fundamentals but may need to grow in advanced networking to guide engineers on complex projects." : "This gap means they may struggle to manage network engineers effectively — a key part of the Team Leader role at Datapath."}`;
  }

  // Should I hire / recommendation
  if (/hire|recommend|should i|decision|verdict|good fit|right person/i.test(lower)) {
    const archetype = getArchetype(scores);
    const strong = scores.filter(s => s.normalizedScore >= 65);
    const weak = scores.filter(s => s.normalizedScore < 40);
    return `**Hiring Recommendation: ${archetype.recommendationLabel}**\n\n${archetype.recommendationDescription}\n\n**Profile: ${archetype.name}**\n${archetype.summary}\n\n${strong.length > 0 ? `**Strengths (${strong.length}):** ${strong.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(", ")}\n\n` : ""}${weak.length > 0 ? `**Gaps (${weak.length}):** ${weak.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(", ")}\n\n` : ""}**Key consideration:** A Team Leader at Datapath needs breadth across leadership, adaptability, technical depth, and client communication. ${weak.length === 0 ? "This candidate appears well-rounded enough to handle the breadth." : `The gaps in ${weak.map(s => dimensions.find(d => d.id === s.dimensionId)!.name).join(" and ")} could be challenging without support.`}`;
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
  return `Here's the candidate's complete competency profile (**${archetypeName}**):\n\n${lines.join("\n")}\n\nScores above 65% indicate strong competency. Below 40% indicates a significant gap for this role.\n\n---\n\nAsk me about **strengths**, **risk areas**, **hiring recommendation**, **Azure expertise**, **M365 skills**, **leadership**, **adaptability**, **problem solving**, **culture & communication**, **security**, or **network management**.`;
}

export function generateEnvironmentParagraph(scores: DimensionScore[]): string {
  const parts: string[] = [];

  const az = getDim(scores, "azure-cloud");
  parts.push(az >= 65 ? "deep Azure and cloud expertise with ability to architect and optimize multi-tenant environments" : az <= 35 ? "significant gaps in Azure knowledge that would require supplemental support" : "solid but developing Azure skills that will benefit from continued growth");

  const le = getDim(scores, "leadership-example");
  parts.push(le >= 65 ? "proven leadership ability to inspire, guide, and lead teams by example" : le <= 35 ? "limited leadership presence — may struggle to set the pace for an MSP team" : "developing leadership skills that would benefit from mentoring");

  const ad = getDim(scores, "adaptability-dynamics");
  parts.push(ad >= 65 ? "the dynamic adaptability needed to thrive managing dozens of client accounts simultaneously" : ad <= 35 ? "difficulty handling the rapid context-switching inherent in MSP operations" : "reasonable adaptability with room to grow in multi-client management");

  return `**Candidate Environment Fit**\n\nBased on the competency profile, this candidate would bring:\n\n• ${parts.join("\n• ")}\n\nFor a Team Leader role at Datapath, consider how these capabilities align with the demands of supporting dozens of client infrastructure environments.`;
}
