import { Dimension } from "@/types/assessment";

export interface DimensionMeta extends Dimension {
  color: string;
  scoreDescriptions: { low: string; mid: string; high: string };
  growthSuggestion: string;
}

export const dimensions: DimensionMeta[] = [
  {
    id: "leadership-example",
    name: "Leadership & Leading by Example",
    lowLabel: "Passive Manager",
    highLabel: "Inspirational Leader",
    description: "Ability to lead from the front, set standards through personal example, and inspire the team to perform at their best in an MSP environment.",
    color: "#8b5cf6",
    scoreDescriptions: {
      low: "They tend to manage from the sidelines rather than leading by example. May struggle to earn respect from engineers or set the pace for the team in client-facing situations.",
      mid: "They show solid management fundamentals and lead by example in some situations. Still developing the consistency and presence needed to inspire a high-performing MSP team.",
      high: "They lead from the front — rolling up their sleeves when needed, setting high standards through their own work ethic, and inspiring the team to deliver exceptional service across all client accounts.",
    },
    growthSuggestion: "Practice visible leadership by joining engineers on complex client escalations, sharing your decision-making process openly, and setting clear standards you personally uphold.",
  },
  {
    id: "adaptability-dynamics",
    name: "Adaptability & MSP Dynamics",
    lowLabel: "Rigid & Single-Focus",
    highLabel: "Dynamic & Multi-Client Agile",
    description: "Ability to juggle multiple client environments, adapt quickly to shifting priorities, and thrive in the fast-paced MSP world.",
    color: "#f59e0b",
    scoreDescriptions: {
      low: "They prefer predictable, single-environment work and may struggle with the rapid context-switching and diverse client demands that define MSP operations.",
      mid: "They can handle multiple client environments reasonably well but may get stretched thin during peak periods or when priorities shift rapidly across accounts.",
      high: "They thrive in the dynamic MSP environment — seamlessly juggling multiple client needs, adapting to shifting priorities, and maintaining quality across diverse infrastructure environments.",
    },
    growthSuggestion: "Build systems for rapid context-switching between client environments, develop prioritization frameworks for competing client demands, and practice calm decision-making under time pressure.",
  },
  {
    id: "problem-solving",
    name: "Problem Solving & Critical Thinking",
    lowLabel: "By-the-Book Problem Solver",
    highLabel: "Creative & Strategic Problem Solver",
    description: "Ability to diagnose complex technical issues across diverse client environments, think critically, and find effective solutions under pressure.",
    color: "#10b981",
    scoreDescriptions: {
      low: "They follow established runbooks but struggle when problems don't fit familiar patterns. May escalate too quickly rather than working through complex multi-system issues.",
      mid: "They can solve most technical problems effectively using experience and analytical thinking. Occasionally find creative solutions but may default to conventional approaches for complex cross-client issues.",
      high: "They excel at diagnosing complex, multi-layered problems across diverse client environments. They think critically, challenge assumptions, and consistently find effective solutions — even in unfamiliar territory.",
    },
    growthSuggestion: "Practice root cause analysis on complex cross-client issues, study emerging troubleshooting methodologies, and build a personal knowledge base of non-obvious solutions.",
  },
  {
    id: "culture-communication",
    name: "Culture & Communication",
    lowLabel: "Siloed Communicator",
    highLabel: "Culture Champion & Bridge Builder",
    description: "Ability to foster a positive team culture at Datapath, communicate effectively with clients and internal stakeholders, and build strong relationships across the organization.",
    color: "#06b6d4",
    scoreDescriptions: {
      low: "They communicate primarily in technical terms and may struggle to build rapport with clients or foster a collaborative team culture. May keep to themselves rather than building relationships across Datapath.",
      mid: "They communicate reasonably well with both technical and non-technical audiences. They contribute positively to culture but may not actively shape it or build strong cross-functional relationships.",
      high: "They're a culture champion who builds strong relationships with clients, team members, and leadership. They communicate with clarity and empathy, foster collaboration, and actively shape a positive Datapath culture.",
    },
    growthSuggestion: "Invest in active listening skills, lead team-building initiatives, practice translating technical concepts for client stakeholders, and mentor junior engineers on communication.",
  },
  {
    id: "azure-cloud",
    name: "Microsoft Azure & Cloud Infrastructure",
    lowLabel: "Limited Azure Knowledge",
    highLabel: "Azure Cloud Expert",
    description: "Depth of knowledge across Azure infrastructure including virtual machines, networking, identity management, and hybrid cloud configurations for client environments.",
    color: "#0078d4",
    scoreDescriptions: {
      low: "They have gaps in core Azure technologies. May struggle to architect, troubleshoot, or optimize Azure environments across client accounts effectively.",
      mid: "They have solid working knowledge of Azure and can manage day-to-day cloud operations competently. May need support with advanced Azure networking, hybrid configurations, or complex identity setups.",
      high: "They're deeply proficient in Azure — virtual machines, networking, Entra ID, hybrid cloud, and cost optimization. They can architect, optimize, and troubleshoot complex multi-tenant Azure environments confidently.",
    },
    growthSuggestion: "Pursue advanced Azure certifications (AZ-104, AZ-305), build hands-on experience with Azure networking and hybrid architectures, and stay current with Azure's evolving feature set.",
  },
  {
    id: "m365-admin",
    name: "Microsoft 365 Administration",
    lowLabel: "Basic M365 User",
    highLabel: "M365 Platform Expert",
    description: "Expertise in managing Microsoft 365 environments including Exchange Online, SharePoint, Teams, Intune, and tenant administration across multiple client tenants.",
    color: "#a855f7",
    scoreDescriptions: {
      low: "They have basic M365 knowledge but lack depth in multi-tenant administration, advanced Exchange configurations, or Intune device management across client environments.",
      mid: "They can manage M365 environments competently — handling standard Exchange, Teams, and SharePoint administration. May need support with advanced Intune policies or complex multi-tenant scenarios.",
      high: "They're an M365 expert — proficient across Exchange Online, SharePoint, Teams, Intune, and tenant administration. They can manage complex multi-tenant environments and optimize M365 deployments across dozens of client accounts.",
    },
    growthSuggestion: "Pursue MS-102 certification, deepen Intune and autopilot expertise, and build standardized M365 deployment templates for efficient multi-client management.",
  },
  {
    id: "security-compliance",
    name: "Security & Compliance",
    lowLabel: "Security-Reactive",
    highLabel: "Security-First Leader",
    description: "Knowledge of cybersecurity best practices, compliance frameworks, threat management, and the ability to secure diverse client environments as an MSP.",
    color: "#ef4444",
    scoreDescriptions: {
      low: "They may take a reactive approach to security, addressing threats after they occur. May lack depth in compliance frameworks or struggle to maintain security standards across multiple client environments.",
      mid: "They understand core security principles and can implement standard protections across client environments. May need support with advanced threat detection, compliance audits, or security architecture.",
      high: "They lead with a security-first mindset — proactively assessing threats across client environments, implementing zero-trust principles, managing compliance frameworks, and building security-aware practices across the team.",
    },
    growthSuggestion: "Pursue security certifications (SC-200, CompTIA Security+), implement standardized security baselines across client accounts, and build incident response playbooks for common MSP scenarios.",
  },
  {
    id: "network-infrastructure",
    name: "Network & Infrastructure Management",
    lowLabel: "Limited Network Knowledge",
    highLabel: "Infrastructure & Network Expert",
    description: "Ability to manage and guide network engineers, understand networking fundamentals, and oversee diverse client infrastructure including switches, firewalls, VPNs, and WAN configurations.",
    color: "#f43f5e",
    scoreDescriptions: {
      low: "They have limited networking knowledge and may struggle to guide network engineers or make informed decisions about client infrastructure. Could be a blind spot when managing infrastructure-focused team members.",
      mid: "They have a solid understanding of networking fundamentals and can manage network engineers effectively. May need to deepen expertise in advanced routing, firewall policies, or complex multi-site configurations.",
      high: "They have strong networking and infrastructure knowledge — comfortable guiding engineers on switches, firewalls, VPNs, and WAN configurations. They can oversee diverse client infrastructure and make informed technical decisions.",
    },
    growthSuggestion: "Study advanced networking concepts (SD-WAN, zero-trust network access), build relationships with network vendors, and develop standardized infrastructure assessment templates for client onboarding.",
  },
];
