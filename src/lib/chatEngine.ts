import { DimensionScore } from "@/types/assessment";
import { dimensions, DimensionMeta } from "@/data/dimensions";

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
  return `balanced between ${dim.lowLabel} and ${dim.highLabel}`;
}

function getTopStrengths(scores: DimensionScore[]): DimensionScore[] {
  return [...scores].sort((a, b) => Math.abs(b.normalizedScore - 50) - Math.abs(a.normalizedScore - 50)).slice(0, 3);
}

function getGrowthAreas(scores: DimensionScore[]): DimensionScore[] {
  return [...scores].sort((a, b) => Math.abs(a.normalizedScore - 50) - Math.abs(b.normalizedScore - 50)).slice(0, 3);
}

export function generateResponse(
  message: string,
  scores: DimensionScore[],
  archetypeName: string
): string {
  const lower = message.toLowerCase();

  // Strengths
  if (/strength|strong|best|excel|good at/i.test(lower)) {
    const top = getTopStrengths(scores);
    const lines = top.map((s) => {
      const d = dimMeta(s.dimensionId);
      return `• **${d.name}** (${s.normalizedScore}%) — ${descForScore(d, s.normalizedScore)}`;
    });
    return `As a **${archetypeName}**, your top strengths are:\n\n${lines.join("\n\n")}\n\nThese strengths make you particularly effective in roles that leverage your natural tendencies.`;
  }

  // Weaknesses / Growth
  if (/weakness|growth|improve|develop|grow|opportunity/i.test(lower)) {
    const growth = getGrowthAreas(scores);
    const lines = growth.map((s) => {
      const d = dimMeta(s.dimensionId);
      return `• **${d.name}** (${s.normalizedScore}%) — ${d.growthSuggestion}`;
    });
    return `Here are areas where you could grow:\n\n${lines.join("\n\n")}\n\nThese aren't weaknesses — they're opportunities to expand your range as a professional.`;
  }

  // Conflict
  if (/conflict|disagree|argument|tension|difficult/i.test(lower)) {
    const comm = getDim(scores, "communication");
    const lead = getDim(scores, "leadership");
    const res = getDim(scores, "resilience");
    return `Based on your profile as a **${archetypeName}**, here's how you likely handle conflict:\n\n• **Communication approach**: You're ${labelForScore(dimMeta("communication"), comm)}, which means you ${comm >= 65 ? "tend to address issues directly and verbally" : comm <= 35 ? "prefer to process before responding, which gives you thoughtful perspectives" : "can adapt between direct discussion and thoughtful reflection"}.\n\n• **Leadership in conflict**: With a ${labelForScore(dimMeta("leadership"), lead)} approach, you ${lead >= 65 ? "seek consensus and want everyone's voice heard" : lead <= 35 ? "may take charge to resolve the situation decisively" : "can flex between mediating and deciding"}.\n\n• **Stress response**: Your ${labelForScore(dimMeta("resilience"), res)} resilience means ${res >= 65 ? "conflict energizes you to push through" : res <= 35 ? "you need processing time before engaging productively" : "you balance action with reflection during tense moments"}.\n\n**Tip**: In your next conflict, try ${comm >= 65 ? "pausing to listen before responding" : "voicing your perspective earlier rather than holding back"}.`;
  }

  // Leadership / Career / Roles
  if (/leader|career|role|manage|position|job/i.test(lower)) {
    const lead = getDim(scores, "leadership");
    const struct = getDim(scores, "structure");
    const drive = getDim(scores, "drive");
    return `As a **${archetypeName}**, you'd excel in roles that combine:\n\n• **Leadership style**: ${labelForScore(dimMeta("leadership"), lead)} (${lead}%) — ${descForScore(dimMeta("leadership"), lead)}\n\n• **Work environment**: ${labelForScore(dimMeta("structure"), struct)} (${struct}%) — You need ${struct >= 65 ? "autonomy and the freedom to define your own approach" : struct <= 35 ? "clear expectations and well-defined processes" : "a mix of structure and creative freedom"}.\n\n• **Motivation fit**: ${labelForScore(dimMeta("drive"), drive)} (${drive}%) — Look for roles with ${drive >= 65 ? "clear metrics, competitive environments, and visible impact" : drive <= 35 ? "meaningful missions, value alignment, and purpose" : "balanced goals and meaningful work"}.\n\nConsider roles in **${lead >= 65 ? "facilitation, coaching, cross-functional leadership" : lead <= 35 ? "program management, executive leadership, operations" : "hybrid leadership positions"}**.`;
  }

  // Working with others / managers
  if (/manager|boss|team|colleague|coworker|work with|working with/i.test(lower)) {
    const lead = getDim(scores, "leadership");
    const vals = getDim(scores, "values");
    const comm = getDim(scores, "communication");
    return `Here's what your profile suggests about your ideal working relationships:\n\n• **Ideal manager**: Someone who ${lead >= 65 ? "gives you space to collaborate and co-create" : lead <= 35 ? "provides clear direction and decisive guidance" : "balances autonomy with clear expectations"}.\n\n• **Team dynamics**: With ${labelForScore(dimMeta("values"), vals)} values (${vals}%), you ${vals >= 65 ? "thrive in tight-knit teams with shared celebrations" : vals <= 35 ? "do your best work when given ownership of your domain" : "appreciate both individual recognition and team success"}.\n\n• **Communication needs**: As a ${labelForScore(dimMeta("communication"), comm)} communicator, you work best with people who ${comm >= 65 ? "match your energy and engage in lively discussion" : comm <= 35 ? "respect your need to process and value written communication" : "can flex between spontaneous and structured communication"}.\n\n**Pro tip**: Share these insights with your manager during your first 1:1 to set expectations early.`;
  }

  // Stress / Resilience
  if (/stress|pressure|burnout|overwhelm|resilien|cope|deadline/i.test(lower)) {
    const res = getDim(scores, "resilience");
    const struct = getDim(scores, "structure");
    return `Your resilience score of **${res}%** (${labelForScore(dimMeta("resilience"), res)}) tells us a lot:\n\n${res >= 65 ? "**You thrive under pressure.** Tight deadlines and high stakes actually improve your performance. However, be careful not to seek unnecessary pressure or burn out others who process differently." : res <= 35 ? "**You process stress internally.** You need quiet time to recharge after intense periods. This isn't a weakness — it means you process deeply and return with stronger insights." : "**You have a balanced stress response.** You can push through when needed but also know when to step back and recharge."}\n\n**Your structure preference** (${struct}%): ${struct >= 65 ? "Your flexible nature means you might take on too many shifting priorities. Create personal boundaries even if the environment doesn't impose them." : struct <= 35 ? "Your love of structure is actually a stress management superpower — use it to create predictability during chaotic periods." : "You can adapt your approach to match the demands of the situation."}\n\n**Recommended strategies**: ${res >= 65 ? "Schedule intentional recovery time, practice delegating during calm periods, and recognize when your energy is creating pressure for others." : res <= 35 ? "Block focused work time, communicate your processing needs to your team, and build recharge rituals into your workday." : "Monitor your stress levels and alternate between pushing through and stepping back as needed."}`;
  }

  // Communication
  if (/communicat|speak|talk|write|present|meeting/i.test(lower)) {
    const comm = getDim(scores, "communication");
    return `Your communication style score is **${comm}%** — ${labelForScore(dimMeta("communication"), comm)}.\n\n${descForScore(dimMeta("communication"), comm)}\n\n**Tips for your onboarding**:\n• ${comm >= 65 ? "Channel your expressiveness — volunteer for presentations and brainstorms, but practice active listening too" : comm <= 35 ? "Leverage your reflective nature — ask for agendas ahead of time so you can prepare thoughtful contributions" : "You naturally adapt — pay attention to which mode you default to and stretch the other direction sometimes"}.\n• In meetings: ${comm >= 65 ? "Try the 'one idea, one listen' rule — share an idea, then actively solicit someone else's perspective before sharing another" : comm <= 35 ? "Set a goal to share at least one thought per meeting, even if it's not fully formed" : "Experiment with both spontaneous sharing and prepared remarks to see what works best in different contexts"}.`;
  }

  // Culture fit
  if (/culture|fit|environment|workplace|company|team culture/i.test(lower)) {
    return generateEnvironmentParagraph(scores);
  }

  // Onboarding
  if (/onboard|first day|first week|new job|getting started|start/i.test(lower)) {
    const comm = getDim(scores, "communication");
    const struct = getDim(scores, "structure");
    const vals = getDim(scores, "values");
    return `Here's a personalized onboarding plan based on your **${archetypeName}** profile:\n\n**Week 1 — Foundation**:\n• ${struct >= 65 ? "Don't wait for structure — create your own onboarding checklist and share it with your manager" : "Ask your manager for a structured onboarding plan with clear milestones and expectations"}\n• ${comm >= 65 ? "Introduce yourself to as many people as possible — your natural energy will build connections quickly" : "Schedule 1:1 coffee chats so you can connect in a comfortable, low-pressure format"}\n\n**Week 2-4 — Integration**:\n• ${vals >= 65 ? "Find a team project to contribute to early — you'll learn faster through collaboration" : "Identify a domain where you can build expertise quickly and establish yourself as a go-to resource"}\n• Share this personality profile with your manager to accelerate mutual understanding\n\n**Month 2+ — Acceleration**:\n• Seek feedback early and often to calibrate your natural tendencies to the team culture\n• Look for opportunities that play to your strengths as a **${archetypeName}**`;
  }

  // Specific dimension names
  for (const dim of dimensions) {
    const patterns = [dim.id, dim.name.toLowerCase(), dim.lowLabel.toLowerCase(), dim.highLabel.toLowerCase()];
    if (patterns.some((p) => lower.includes(p))) {
      const score = getDim(scores, dim.id);
      return `**${dim.name}** — Your score: **${score}%**\n\n${descForScore(dim, score)}\n\nOn the spectrum from **${dim.lowLabel}** to **${dim.highLabel}**, you lean toward **${labelForScore(dim, score)}**.\n\n**Growth opportunity**: ${dim.growthSuggestion}`;
    }
  }

  // Profile overview / catch-all
  if (/profile|overview|summary|result|score|tell me about/i.test(lower)) {
    return generateOverviewResponse(scores, archetypeName);
  }

  // Default catch-all
  return generateOverviewResponse(scores, archetypeName) + "\n\n---\n\nYou can ask me about specific topics like **strengths**, **growth areas**, **conflict style**, **leadership roles**, **stress management**, **communication tips**, **culture fit**, or any of the 8 dimensions by name.";
}

function generateOverviewResponse(scores: DimensionScore[], archetype: string): string {
  const lines = scores.map((s) => {
    const d = dimMeta(s.dimensionId);
    return `• **${d.name}**: ${s.normalizedScore}% (${labelForScore(d, s.normalizedScore)})`;
  });
  return `As a **${archetype}**, here's your complete profile:\n\n${lines.join("\n")}\n\nYour strongest tendencies are in the dimensions farthest from 50%, while scores near 50% indicate natural flexibility.`;
}

export function generateEnvironmentParagraph(scores: DimensionScore[]): string {
  const parts: string[] = [];

  const struct = getDim(scores, "structure");
  parts.push(struct >= 65 ? "autonomy and the freedom to define your own approach" : struct <= 35 ? "clear processes, defined expectations, and organized workflows" : "a balance of structure and creative freedom");

  const change = getDim(scores, "change");
  parts.push(change >= 65 ? "opportunities to innovate and try new approaches" : change <= 35 ? "consistency and the ability to deepen expertise in proven methods" : "a blend of innovation and stability");

  const vals = getDim(scores, "values");
  parts.push(vals >= 65 ? "strong team culture, shared celebrations, and collaborative goals" : vals <= 35 ? "recognition of individual expertise and personal achievement" : "both individual recognition and team-based wins");

  const comm = getDim(scores, "communication");
  parts.push(comm >= 65 ? "open, energetic communication and frequent brainstorming" : comm <= 35 ? "space for reflection, written communication, and thoughtful discussion" : "diverse communication channels that support both spontaneity and reflection");

  const res = getDim(scores, "resilience");
  parts.push(res >= 65 ? "high-stakes projects and challenging deadlines that bring out your best" : res <= 35 ? "sustainable pace with built-in recovery time after intense sprints" : "a rhythm that alternates between intense sprints and calm periods");

  return `**Your Ideal Work Environment**\n\nBased on your personality profile, you thrive in workplaces that offer:\n\n• ${parts.join("\n• ")}\n\nLook for teams and organizations where these elements are part of the culture — they'll bring out your best work naturally.`;
}
