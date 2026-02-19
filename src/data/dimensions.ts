import { Dimension } from "@/types/assessment";

export interface DimensionMeta extends Dimension {
  color: string;
  scoreDescriptions: { low: string; mid: string; high: string };
  growthSuggestion: string;
}

export const dimensions: DimensionMeta[] = [
  {
    id: "talent-acquisition",
    name: "Talent Acquisition & Recruiting",
    lowLabel: "Reactive Recruiter",
    highLabel: "Strategic Talent Partner",
    description: "Ability to build and execute a full-cycle recruiting strategy for an IT services company.",
    color: "#6366f1",
    scoreDescriptions: {
      low: "They tend to fill roles reactively and may struggle with proactive pipeline building. Sourcing strategies may be limited, and they may rely heavily on job boards rather than building employer brand or talent networks.",
      mid: "They have solid recruiting fundamentals and can manage the hiring process competently. They balance reactive filling with some proactive sourcing but may not yet have a fully strategic approach to talent acquisition.",
      high: "They think like a talent strategist — building pipelines before roles open, leveraging employer branding, and using data to optimize hiring funnels. They understand IT talent markets and can compete for scarce technical talent.",
    },
    growthSuggestion: "Invest in employer branding, candidate experience metrics, and building relationships with passive candidates in the IT space.",
  },
  {
    id: "leadership-coaching",
    name: "Management Coaching & Development",
    lowLabel: "Task-Focused Advisor",
    highLabel: "Transformational Coach",
    description: "Skill in coaching managers on performance management, difficult conversations, and team leadership.",
    color: "#8b5cf6",
    scoreDescriptions: {
      low: "They may default to telling managers what to do rather than coaching them to develop their own capabilities. Performance management guidance tends to be procedural rather than developmental.",
      mid: "They can guide managers through standard performance scenarios and provide useful coaching on common challenges. They're building the skills to handle more complex leadership development.",
      high: "They're a natural leadership coach — they help managers grow through asking powerful questions, modeling difficult conversations, and creating development frameworks that scale across the organization.",
    },
    growthSuggestion: "Deepen coaching skills through formal training and practice facilitating role-plays with managers on performance conversations.",
  },
  {
    id: "employee-advocacy",
    name: "Employee Advocacy & Voice",
    lowLabel: "Policy Enforcer",
    highLabel: "Employee Champion",
    description: "How effectively they serve as the voice of employees while balancing company interests.",
    color: "#f59e0b",
    scoreDescriptions: {
      low: "They may lean too heavily toward management's perspective, potentially missing employee concerns. Employees might not feel comfortable bringing sensitive issues to them.",
      mid: "They balance employee and company interests reasonably well. They listen to concerns and escalate when appropriate, though they may sometimes avoid advocating strongly for unpopular positions.",
      high: "Employees trust them deeply as their advocate. They proactively gather feedback, surface uncomfortable truths to leadership, and fight for employee well-being while maintaining credibility with the executive team.",
    },
    growthSuggestion: "Build structured feedback channels (pulse surveys, skip-levels, anonymous forums) and practice delivering employee sentiment data to leadership with actionable recommendations.",
  },
  {
    id: "compliance-risk",
    name: "Compliance & Risk Management",
    lowLabel: "Compliance-Light",
    highLabel: "Risk-Aware Guardian",
    description: "Knowledge and diligence in employment law, HR compliance, and risk mitigation.",
    color: "#10b981",
    scoreDescriptions: {
      low: "They may have gaps in employment law knowledge or take a casual approach to compliance. This creates risk exposure, especially with remote workers across multiple jurisdictions.",
      mid: "They understand core compliance requirements and handle standard situations correctly. They may need support with complex multi-state/international employment questions common in remote IT companies.",
      high: "They're compliance-forward — proactively auditing policies, staying current on employment law changes, and ensuring the company is protected. They understand the specific risks of managing remote workers across jurisdictions.",
    },
    growthSuggestion: "Stay current with remote work legislation, build a compliance calendar, and establish relationships with employment law counsel for complex situations.",
  },
  {
    id: "pressure-resilience",
    name: "Pressure & Organization",
    lowLabel: "Easily Overwhelmed",
    highLabel: "Thrives Under Pressure",
    description: "Ability to stay organized, prioritize effectively, and perform under high-demand situations.",
    color: "#f43f5e",
    scoreDescriptions: {
      low: "They may struggle when multiple urgent priorities compete — things can fall through the cracks and stress becomes visible. They need a calmer, more predictable environment to do their best work.",
      mid: "They handle normal workload pressures well and can manage occasional high-intensity periods. Sustained high pressure over weeks may start to affect their organization and output quality.",
      high: "They're energized by complexity and competing demands. They maintain meticulous organization even during chaotic periods, triage effectively, and project calm confidence that steadies the team around them.",
    },
    growthSuggestion: "Build systems and processes that reduce cognitive load — project management tools, recurring checklists, and delegation frameworks.",
  },
  {
    id: "culture-building",
    name: "Culture & Engagement",
    lowLabel: "Culture Maintainer",
    highLabel: "Culture Architect",
    description: "Ability to intentionally build, shape, and scale company culture — especially in a remote-first environment.",
    color: "#06b6d4",
    scoreDescriptions: {
      low: "They maintain existing culture but may not actively shape it. In a remote environment, culture could drift without their intentional intervention. They may default to in-person approaches that don't translate to distributed teams.",
      mid: "They understand the importance of culture and take some intentional steps to build it. They're adapting to remote culture-building but may still be developing their toolkit for distributed engagement.",
      high: "They're a culture architect — they intentionally design rituals, communication norms, and engagement programs that create belonging in a remote-first environment. They measure culture health and treat it as a strategic business lever.",
    },
    growthSuggestion: "Study remote-first culture playbooks, implement regular culture health metrics, and experiment with virtual rituals that build genuine connection.",
  },
  {
    id: "strategic-thinking",
    name: "Strategic HR Leadership",
    lowLabel: "Operational Executor",
    highLabel: "Strategic Business Partner",
    description: "Ability to connect HR initiatives to business outcomes and think beyond day-to-day operations.",
    color: "#a855f7",
    scoreDescriptions: {
      low: "They focus on executing HR tasks efficiently but may not connect HR work to broader business strategy. They process requests rather than anticipate organizational needs.",
      mid: "They balance operational execution with strategic thinking. They can contribute to business discussions but may not yet drive the HR agenda or proactively identify how HR can accelerate company growth.",
      high: "They think like a business leader who happens to run HR. They connect every initiative to company growth, use workforce data to inform executive decisions, and anticipate organizational needs before they become problems.",
    },
    growthSuggestion: "Regularly attend business strategy meetings, learn to present HR metrics in business outcome terms, and build relationships with other department leaders.",
  },
  {
    id: "initiative-drive",
    name: "Initiative & Ownership",
    lowLabel: "Waits for Direction",
    highLabel: "Self-Starting Leader",
    description: "Tendency to proactively identify problems, propose solutions, and drive projects to completion independently.",
    color: "#ef4444",
    scoreDescriptions: {
      low: "They tend to wait for direction and may need explicit priorities set by leadership. They execute assigned work reliably but may miss opportunities to improve processes or launch new programs.",
      mid: "They take initiative on familiar topics and propose improvements when they see clear opportunities. They occasionally need a nudge to step outside their comfort zone on larger, ambiguous projects.",
      high: "They're a self-starter who spots problems before others and drives solutions from idea to implementation. They don't wait for permission — they build the case, get buy-in, and execute. This is critical for a solo HR leader at a 100-person company.",
    },
    growthSuggestion: "Practice identifying one proactive improvement per week and presenting a brief business case for it. Build the habit of ownership over organizational challenges.",
  },
];
