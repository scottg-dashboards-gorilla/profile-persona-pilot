import { Dimension } from "@/types/assessment";

export interface DimensionMeta extends Dimension {
  color: string;
  scoreDescriptions: { low: string; mid: string; high: string };
  growthSuggestion: string;
}

export const dimensions: DimensionMeta[] = [
  {
    id: "microsoft-environment",
    name: "Microsoft Environment Expertise",
    lowLabel: "Limited Microsoft Knowledge",
    highLabel: "Microsoft Platform Expert",
    description: "Depth of knowledge across Microsoft 365, Azure, Active Directory, Exchange, SharePoint, Teams, and Intune.",
    color: "#0078d4",
    scoreDescriptions: {
      low: "They have gaps in core Microsoft technologies. May struggle to architect, troubleshoot, or optimize a Microsoft-centric environment effectively.",
      mid: "They have solid working knowledge of the Microsoft stack and can manage day-to-day operations competently. May need support with advanced Azure or hybrid configurations.",
      high: "They're deeply proficient across the Microsoft ecosystem — Azure, M365, AD/Entra ID, Exchange, SharePoint, Teams, Intune. They can architect, optimize, and troubleshoot complex environments confidently.",
    },
    growthSuggestion: "Pursue advanced Microsoft certifications (AZ-104, MS-700) and build hands-on experience with Azure hybrid architectures and Entra ID governance.",
  },
  {
    id: "leadership-people",
    name: "Leadership & People Management",
    lowLabel: "Individual Contributor Mindset",
    highLabel: "Inspiring IT Leader",
    description: "Ability to lead, mentor, and develop an IT team while managing performance and building trust.",
    color: "#8b5cf6",
    scoreDescriptions: {
      low: "They tend to operate as a senior individual contributor rather than a true leader. May struggle with delegation, performance management, or developing their team members.",
      mid: "They can manage a team competently and handle standard people issues. They're developing their ability to inspire, mentor, and build high-performing teams.",
      high: "They're a natural leader who builds trust, develops talent, and creates high-performing IT teams. They delegate effectively, handle difficult conversations with confidence, and invest in their people's growth.",
    },
    growthSuggestion: "Invest in leadership coaching, practice regular 1-on-1s with team members, and develop a structured mentoring approach for technical staff.",
  },
  {
    id: "strategic-thinking",
    name: "Strategic IT Vision",
    lowLabel: "Tactical Executor",
    highLabel: "Strategic IT Partner",
    description: "Ability to align IT strategy with business goals and drive technology as a competitive advantage.",
    color: "#a855f7",
    scoreDescriptions: {
      low: "They focus on keeping the lights on rather than driving IT as a business enabler. They may not connect technology decisions to business outcomes or proactively plan for future needs.",
      mid: "They balance operational execution with some strategic thinking. They can contribute to technology roadmap discussions but may not yet drive the IT agenda independently.",
      high: "They think like a business leader who happens to run IT. They connect technology investments to revenue, efficiency, and competitive advantage. They anticipate future needs and build roadmaps that align with company growth.",
    },
    growthSuggestion: "Attend business strategy meetings, learn to present IT initiatives in ROI terms, and build relationships with department heads to understand their technology needs.",
  },
  {
    id: "security-compliance",
    name: "Security & Compliance",
    lowLabel: "Security-Reactive",
    highLabel: "Security-First Leader",
    description: "Knowledge of cybersecurity best practices, compliance frameworks, and risk management for IT environments.",
    color: "#10b981",
    scoreDescriptions: {
      low: "They may take a reactive approach to security, addressing threats after they occur rather than preventing them. Compliance knowledge may have gaps that create organizational risk.",
      mid: "They understand core security principles and can implement standard protections. They may need support with advanced threat detection, compliance audits, or security architecture for complex environments.",
      high: "They lead with a security-first mindset — proactively assessing threats, implementing zero-trust principles, managing compliance frameworks (SOC 2, ISO 27001), and building a security-aware culture across the organization.",
    },
    growthSuggestion: "Pursue security certifications (CISSP, CompTIA Security+), implement regular security audits, and build an incident response playbook.",
  },
  {
    id: "problem-solving",
    name: "Problem Solving & Innovation",
    lowLabel: "By-the-Book Problem Solver",
    highLabel: "Creative Innovator",
    description: "Ability to think outside the box, solve complex problems creatively, and drive continuous improvement.",
    color: "#f59e0b",
    scoreDescriptions: {
      low: "They tend to follow established procedures and may struggle when problems don't fit familiar patterns. They may miss opportunities to innovate or improve processes.",
      mid: "They can solve most problems effectively using a mix of experience and analytical thinking. They occasionally find creative solutions but may default to conventional approaches.",
      high: "They thrive on complex, ambiguous problems and consistently find innovative solutions. They challenge assumptions, experiment with new approaches, and drive continuous improvement across IT operations.",
    },
    growthSuggestion: "Practice structured problem-solving frameworks (root cause analysis, design thinking) and dedicate time to exploring emerging technologies that could transform operations.",
  },
  {
    id: "communication-culture",
    name: "Communication & Culture Fit",
    lowLabel: "Technical Communicator",
    highLabel: "Cross-Functional Communicator",
    description: "Ability to communicate effectively with technical and non-technical stakeholders and contribute to positive team culture.",
    color: "#06b6d4",
    scoreDescriptions: {
      low: "They communicate primarily in technical terms and may struggle to translate IT concepts for business stakeholders. May not prioritize relationship-building or cultural contribution.",
      mid: "They can communicate with both technical and business audiences reasonably well. They contribute positively to team culture but may not actively shape it.",
      high: "They're an exceptional communicator who bridges the gap between IT and business effortlessly. They build strong cross-functional relationships, foster a collaborative culture, and translate complex technical concepts into business value.",
    },
    growthSuggestion: "Practice presenting technical concepts to non-technical audiences, build relationships with department heads, and actively participate in company culture initiatives.",
  },
  {
    id: "process-operations",
    name: "Process & IT Operations",
    lowLabel: "Ad-Hoc Operator",
    highLabel: "Process-Driven Leader",
    description: "Ability to build, optimize, and manage IT processes including ITIL, change management, and service delivery.",
    color: "#f43f5e",
    scoreDescriptions: {
      low: "They may handle IT operations in an ad-hoc manner without structured processes. This can lead to inconsistency, outages, and difficulty scaling as the organization grows.",
      mid: "They have solid operational fundamentals and follow established processes. They're building capability in areas like ITIL, change management, and service level management.",
      high: "They build and optimize IT processes that scale — ITIL-aligned service management, structured change control, documented runbooks, and measurable SLAs. They create operational excellence that the team can rely on.",
    },
    growthSuggestion: "Study ITIL frameworks, implement structured change management processes, and build a service catalog with defined SLAs for internal stakeholders.",
  },
  {
    id: "pressure-resilience",
    name: "Pressure & Crisis Management",
    lowLabel: "Easily Overwhelmed",
    highLabel: "Thrives Under Pressure",
    description: "Ability to stay calm, prioritize effectively, and lead during high-pressure situations like outages, security incidents, or tight deadlines.",
    color: "#ef4444",
    scoreDescriptions: {
      low: "They may struggle when multiple urgent issues compete — incidents can escalate and stress becomes visible to the team. They need a calmer environment to do their best work.",
      mid: "They handle normal operational pressures well and can manage occasional crises. Sustained high-pressure periods may start to affect their decision-making and team leadership.",
      high: "They're at their best during crises — calm, decisive, and organized. They triage effectively during outages, communicate clearly under pressure, and project confidence that steadies the team. They build resilience into their systems and processes.",
    },
    growthSuggestion: "Build incident response procedures, practice tabletop exercises for major outage scenarios, and develop stress management techniques for sustained high-pressure periods.",
  },
];
