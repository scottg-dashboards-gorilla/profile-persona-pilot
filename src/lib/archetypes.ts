import { DimensionScore } from "@/types/assessment";

interface Archetype {
  name: string;
  summary: string;
  conditions: [string, "high" | "low", string, "high" | "low"];
}

const archetypes: Archetype[] = [
  {
    name: "The Open Anchor",
    summary: "Emotionally transparent and culture-driven — they bring authenticity and deep loyalty to teams that share their values.",
    conditions: ["emotional-awareness", "high", "belonging", "high"],
  },
  {
    name: "The Quiet Powerhouse",
    summary: "Guarded and self-directed — they deliver exceptional work independently, processing everything internally before acting.",
    conditions: ["emotional-awareness", "low", "autonomy-need", "high"],
  },
  {
    name: "The Trust Catalyst",
    summary: "Extends trust easily and engages conflict directly — they build fast relationships and aren't afraid to have hard conversations.",
    conditions: ["trust-building", "high", "conflict-response", "high"],
  },
  {
    name: "The Careful Builder",
    summary: "Earns trust slowly and avoids unnecessary conflict — they create deep, lasting professional bonds through consistent reliability.",
    conditions: ["trust-building", "low", "conflict-response", "low"],
  },
  {
    name: "The Focused Specialist",
    summary: "Deep focus meets role-centered belonging — they're driven by the craft itself and produce remarkable work when given uninterrupted space.",
    conditions: ["focus-style", "low", "belonging", "low"],
  },
  {
    name: "The Resilient Mobilizer",
    summary: "Stress activates them and they engage conflict head-on — they're the ones who step up when everything is on fire.",
    conditions: ["stress-response", "high", "conflict-response", "high"],
  },
  {
    name: "The Supported Performer",
    summary: "Prefers guided oversight and contextual feedback — they thrive when their manager invests in the relationship and provides clear direction.",
    conditions: ["autonomy-need", "low", "feedback-reception", "high"],
  },
  {
    name: "The Independent Driver",
    summary: "Self-directed and wants feedback straight — they respect efficiency, ownership, and managers who trust them to deliver.",
    conditions: ["autonomy-need", "high", "feedback-reception", "low"],
  },
];

const singleDimensionArchetypes: Record<string, { high: { name: string; summary: string }; low: { name: string; summary: string } }> = {
  "emotional-awareness": {
    high: { name: "The Heart-on-Sleeve", summary: "Emotionally transparent — they process feelings openly, building intimacy and trust through vulnerability." },
    low: { name: "The Steady Presence", summary: "Emotionally private — they maintain composure under any circumstances, providing calm stability to those around them." },
  },
  "trust-building": {
    high: { name: "The Open Door", summary: "Trusts by default — they give people the benefit of the doubt, accelerating relationships and collaboration." },
    low: { name: "The Earned Loyalist", summary: "Trust is earned through evidence — but once given, their commitment and loyalty are unwavering." },
  },
  "focus-style": {
    high: { name: "The Juggler", summary: "Thrives on variety and parallel workstreams — they keep many plates spinning and stay energized by context-switching." },
    low: { name: "The Deep Diver", summary: "Produces their finest work in sustained, uninterrupted deep focus — quality over quantity, depth over breadth." },
  },
  "feedback-reception": {
    high: { name: "The Contextual Learner", summary: "Absorbs feedback best when it's delivered with empathy and context — they grow fastest in psychologically safe environments." },
    low: { name: "The Straight Shooter", summary: "Respects and prefers unfiltered honesty — they see direct feedback as a sign of respect and waste no time on pleasantries." },
  },
  "conflict-response": {
    high: { name: "The Truth-Teller", summary: "Leans into disagreement productively — they name what others won't and push teams toward honest, uncomfortable growth." },
    low: { name: "The Peacekeeper", summary: "Prioritizes harmony and works behind the scenes to resolve tension — they keep teams cohesive and psychologically safe." },
  },
  "autonomy-need": {
    high: { name: "The Self-Starter", summary: "Needs space to own their work completely — micromanagement is their kryptonite, trust is their fuel." },
    low: { name: "The Aligned Executor", summary: "Performs best with clear expectations and regular touchpoints — they value alignment and want to know they're on track." },
  },
  "stress-response": {
    high: { name: "The Activator", summary: "Stress brings out their best — they get sharper, faster, and more organized when the pressure is on." },
    low: { name: "The Silent Processor", summary: "Absorbs stress internally and needs space to recover — don't mistake their silence for being okay." },
  },
  belonging: {
    high: { name: "The Culture Champion", summary: "Deeply connected to the team, mission, and values — they need to believe in where they work to do their best work." },
    low: { name: "The Craft Devotee", summary: "Connected to the work itself — they'll thrive anywhere the problems are interesting, regardless of the brand." },
  },
};

export function getArchetype(scores: DimensionScore[]): { name: string; summary: string } {
  const scoreMap = new Map(scores.map((s) => [s.dimensionId, s.normalizedScore]));

  const isHigh = (id: string) => (scoreMap.get(id) ?? 50) >= 65;
  const isLow = (id: string) => (scoreMap.get(id) ?? 50) <= 35;
  const matches = (id: string, dir: "high" | "low") => (dir === "high" ? isHigh(id) : isLow(id));

  for (const a of archetypes) {
    const [d1, dir1, d2, dir2] = a.conditions;
    if (matches(d1, dir1) && matches(d2, dir2)) {
      return { name: a.name, summary: a.summary };
    }
  }

  // Fallback: single most extreme dimension
  let mostExtreme = { id: "emotional-awareness", distance: 0 };
  for (const s of scores) {
    const dist = Math.abs(s.normalizedScore - 50);
    if (dist > mostExtreme.distance) {
      mostExtreme = { id: s.dimensionId, distance: dist };
    }
  }

  const extremeScore = scoreMap.get(mostExtreme.id) ?? 50;
  const dir = extremeScore >= 50 ? "high" : "low";
  const fallback = singleDimensionArchetypes[mostExtreme.id]?.[dir];
  return fallback ?? { name: "The Balanced Professional", summary: "A well-rounded individual who adapts their style across all dimensions — versatile and context-aware." };
}
