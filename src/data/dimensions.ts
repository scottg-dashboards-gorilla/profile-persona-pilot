import { Dimension } from "@/types/assessment";

export interface DimensionMeta extends Dimension {
  color: string;
  scoreDescriptions: { low: string; mid: string; high: string };
  growthSuggestion: string;
}

export const dimensions: DimensionMeta[] = [
  {
    id: "emotional-awareness",
    name: "Emotional Openness",
    lowLabel: "Guarded",
    highLabel: "Transparent",
    description: "How openly this person processes and expresses emotions at work.",
    color: "#6366f1",
    scoreDescriptions: {
      low: "They keep emotions private and compartmentalize feelings from work. They may seem stoic or hard to read — but it doesn't mean they don't care deeply.",
      mid: "They share emotions selectively, opening up with trusted colleagues but maintaining composure in broader settings.",
      high: "They wear their heart on their sleeve and process emotions out loud. Their transparency builds intimacy but can feel intense in high-pressure moments.",
    },
    growthSuggestion: "Create safe, private spaces for them to share what's going on beneath the surface. Don't mistake silence for indifference or openness for instability.",
  },
  {
    id: "trust-building",
    name: "Trust Pattern",
    lowLabel: "Earned Trust",
    highLabel: "Extended Trust",
    description: "How quickly and easily this person extends trust to others.",
    color: "#8b5cf6",
    scoreDescriptions: {
      low: "They need to see consistent behavior before trusting someone. They verify, ask questions, and build trust slowly through evidence. Once earned, their loyalty runs deep.",
      mid: "They extend moderate initial trust and adjust based on experience — giving people a fair chance while staying observant.",
      high: "They trust by default and give people the benefit of the doubt. This openness accelerates relationships but can leave them vulnerable to disappointment.",
    },
    growthSuggestion: "For slow-trusters, be consistent and transparent — don't expect instant rapport. For fast-trusters, help them set healthy boundaries without making them cynical.",
  },
  {
    id: "focus-style",
    name: "Focus & Attention",
    lowLabel: "Deep Focus",
    highLabel: "Multi-Tracker",
    description: "How they concentrate — sustained deep work versus juggling multiple threads.",
    color: "#f59e0b",
    scoreDescriptions: {
      low: "They do their best work in uninterrupted deep-focus blocks. Context switching drains them. They produce exceptional quality when given protected time.",
      mid: "They can alternate between deep work and multitasking, though they have a preference depending on the type of work.",
      high: "They thrive juggling multiple projects simultaneously. Variety energizes them, and they naturally keep many threads moving forward at once.",
    },
    growthSuggestion: "Protect deep focusers from unnecessary meetings and interruptions. Give multi-trackers variety but help them prioritize when everything feels urgent.",
  },
  {
    id: "feedback-reception",
    name: "Feedback Style",
    lowLabel: "Direct & Unfiltered",
    highLabel: "Contextual & Supportive",
    description: "How they prefer to receive feedback — blunt and immediate, or wrapped in context and support.",
    color: "#10b981",
    scoreDescriptions: {
      low: "They want feedback straight — no sugar-coating, no preamble. They respect candor and can separate the message from the delivery. They may seem tough but appreciate honesty as a form of respect.",
      mid: "They appreciate honest feedback delivered with some tact. They can handle directness but prefer to understand the 'why' behind it.",
      high: "They absorb feedback best when it's delivered with empathy, context, and positive framing. Blunt criticism can shut them down or feel like a personal attack, even when it's not meant that way.",
    },
    growthSuggestion: "Match your feedback delivery to their style. Direct types lose patience with sandwiches. Supportive types need psychological safety before they can hear hard truths.",
  },
  {
    id: "conflict-response",
    name: "Conflict Approach",
    lowLabel: "Harmony-Seeking",
    highLabel: "Direct Engagement",
    description: "How they respond to disagreement and tension in the workplace.",
    color: "#f43f5e",
    scoreDescriptions: {
      low: "They avoid open conflict and work behind the scenes to resolve tension. They prioritize team harmony, sometimes at the cost of leaving issues unaddressed.",
      mid: "They engage in conflict when necessary but prefer to de-escalate. They pick their battles and try to find middle ground.",
      high: "They lean into disagreement and see healthy conflict as productive. They'll name the elephant in the room and push for resolution, even when it's uncomfortable.",
    },
    growthSuggestion: "Help harmony-seekers practice naming small disagreements before they fester. Help direct engagers read the room and know when pushing harder isn't productive.",
  },
  {
    id: "autonomy-need",
    name: "Autonomy & Oversight",
    lowLabel: "Guided",
    highLabel: "Self-Directed",
    description: "How much direction and oversight they need to do their best work.",
    color: "#06b6d4",
    scoreDescriptions: {
      low: "They perform best with clear expectations, regular check-ins, and defined boundaries. They're not dependent — they just want to know they're on the right track.",
      mid: "They appreciate some structure but also value the freedom to figure things out. They'll ask for help when needed but prefer not to be micromanaged.",
      high: "They need space to own their work fully. Too much oversight feels suffocating. They want you to define the 'what' and trust them with the 'how'.",
    },
    growthSuggestion: "For guided workers, provide clear milestones without hovering. For self-directed ones, agree on outcomes and get out of the way — but keep the door open.",
  },
  {
    id: "stress-response",
    name: "Stress Processing",
    lowLabel: "Internalizer",
    highLabel: "Mobilizer",
    description: "How they process and respond to stress and pressure.",
    color: "#a855f7",
    scoreDescriptions: {
      low: "They absorb stress internally — you may not see it until they're overwhelmed. They need space to process, and checking in proactively matters because they won't always ask for help.",
      mid: "They handle stress with a blend of internal processing and outward action, adapting their response to the severity of the situation.",
      high: "Stress activates them — they move faster, communicate more, and rally others. High pressure can bring out their best, but sustained stress without recovery leads to burnout.",
    },
    growthSuggestion: "Check in on internalizers regularly — silence doesn't mean they're fine. Give mobilizers room to act under pressure but insist on recovery periods after intense sprints.",
  },
  {
    id: "belonging",
    name: "Organizational Belonging",
    lowLabel: "Role-Centered",
    highLabel: "Culture-Centered",
    description: "What connects them to the organization — the work itself or the community and mission.",
    color: "#ef4444",
    scoreDescriptions: {
      low: "They're connected to the craft, the challenge, and the role — not the brand or the culture. They'll stay as long as the work is stimulating, regardless of company perks.",
      mid: "They care about both the work and the environment. Good culture amplifies their engagement, but compelling work is the foundation.",
      high: "They need to feel like they belong — that the company's values match theirs and that they're part of something meaningful. Culture and mission are non-negotiable for their engagement.",
    },
    growthSuggestion: "For role-centered people, keep the work challenging and growth-oriented. For culture-centered people, invest in their sense of community and connect their work to the mission.",
  },
];
