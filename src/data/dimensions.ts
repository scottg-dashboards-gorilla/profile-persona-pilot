import { Dimension } from "@/types/assessment";

export interface DimensionMeta extends Dimension {
  color: string;
  category: "competency" | "disc" | "comptia";
  scoreDescriptions: { low: string; mid: string; high: string };
  growthSuggestion: string;
}

export const dimensions: DimensionMeta[] = [
  // ========== COMPETENCY DIMENSIONS ==========
  {
    id: "leadership-example",
    name: "Leadership & Leading by Example",
    lowLabel: "Passive Manager",
    highLabel: "Inspirational Leader",
    description: "Ability to lead from the front, set standards through personal example, and inspire the team to perform at their best in an MSP environment.",
    color: "#8b5cf6",
    category: "competency",
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
    category: "competency",
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
    category: "competency",
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
    category: "competency",
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
    category: "competency",
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
    category: "competency",
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
    category: "competency",
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
    category: "competency",
    scoreDescriptions: {
      low: "They have limited networking knowledge and may struggle to guide network engineers or make informed decisions about client infrastructure. Could be a blind spot when managing infrastructure-focused team members.",
      mid: "They have a solid understanding of networking fundamentals and can manage network engineers effectively. May need to deepen expertise in advanced routing, firewall policies, or complex multi-site configurations.",
      high: "They have strong networking and infrastructure knowledge — comfortable guiding engineers on switches, firewalls, VPNs, and WAN configurations. They can oversee diverse client infrastructure and make informed technical decisions.",
    },
    growthSuggestion: "Study advanced networking concepts (SD-WAN, zero-trust network access), build relationships with network vendors, and develop standardized infrastructure assessment templates for client onboarding.",
  },

  // ========== COMPTIA TECHNICAL DIMENSIONS ==========
  {
    id: "comptia-fundamentals",
    name: "IT Fundamentals & Support (A+/Server+)",
    lowLabel: "Limited IT Foundations",
    highLabel: "Strong IT Fundamentals",
    description: "Core IT knowledge covering hardware, operating systems, troubleshooting methodology, server administration, and end-user support — aligned with CompTIA A+ and Server+ domains.",
    color: "#7c3aed",
    category: "comptia",
    scoreDescriptions: {
      low: "They have gaps in foundational IT knowledge — hardware, OS administration, or troubleshooting methodology. May struggle to guide technicians on fundamental support issues.",
      mid: "They have solid IT fundamentals and can troubleshoot most hardware/software issues. May need deeper expertise in server administration or advanced troubleshooting scenarios.",
      high: "They have excellent foundational IT knowledge — strong across hardware, operating systems, server administration, and troubleshooting. They can mentor technicians and set high standards for support quality.",
    },
    growthSuggestion: "Stay current with hardware trends, deepen server administration skills, and build standardized troubleshooting workflows for common client support scenarios.",
  },
  {
    id: "comptia-data",
    name: "Data & Analytics (Data+)",
    lowLabel: "Limited Data Skills",
    highLabel: "Data-Driven Decision Maker",
    description: "Ability to work with data concepts, databases, reporting, data governance, and use analytics to drive operational decisions — aligned with CompTIA Data+ domains.",
    color: "#059669",
    category: "comptia",
    scoreDescriptions: {
      low: "They have limited experience with data analysis, reporting, or database concepts. May make decisions based on intuition rather than data-driven insights.",
      mid: "They understand basic data concepts and can use reporting tools effectively. May need support with advanced data analysis, database optimization, or data governance frameworks.",
      high: "They're data-driven — proficient with databases, reporting tools, and analytics. They use data to optimize operations, track KPIs, and make informed decisions across client accounts.",
    },
    growthSuggestion: "Learn SQL fundamentals, build dashboards for MSP KPIs, and develop data governance practices for client data management.",
  },
  {
    id: "comptia-cyberops",
    name: "Advanced Cybersecurity (CySA+/PenTest+)",
    lowLabel: "Basic Security Awareness",
    highLabel: "Advanced Cyber Operations",
    description: "Advanced cybersecurity operations including threat detection, vulnerability management, penetration testing concepts, and incident response — aligned with CompTIA CySA+ and PenTest+ domains.",
    color: "#dc2626",
    category: "comptia",
    scoreDescriptions: {
      low: "They have basic security awareness but lack depth in threat detection, vulnerability management, or incident response. May miss critical security threats across client environments.",
      mid: "They understand security operations fundamentals and can respond to common threats. May need support with advanced threat hunting, vulnerability assessments, or incident response planning.",
      high: "They have advanced cybersecurity operations skills — proficient in threat detection, vulnerability management, penetration testing concepts, and incident response. They can build and maintain robust security programs across client environments.",
    },
    growthSuggestion: "Pursue CySA+ or PenTest+ certification, practice threat hunting techniques, and build incident response playbooks for MSP-specific scenarios.",
  },

  // ========== DISC BEHAVIORAL DIMENSIONS ==========
  {
    id: "disc-dominance",
    name: "Dominance (D)",
    lowLabel: "Accommodating",
    highLabel: "Dominant & Direct",
    description: "Measures assertiveness, decisiveness, and drive for results. High D individuals are direct, competitive, and take charge in challenging situations.",
    color: "#b91c1c",
    category: "disc",
    scoreDescriptions: {
      low: "They tend to be accommodating and collaborative, preferring consensus over unilateral decisions. May avoid confrontation or struggle to make tough calls under pressure.",
      mid: "They balance assertiveness with collaboration. They can take charge when needed but also value team input and consensus-building.",
      high: "They're direct, decisive, and results-driven. They take charge in challenging situations, make tough calls quickly, and push for outcomes. May need to balance assertiveness with team sensitivity.",
    },
    growthSuggestion: "Practice making decisive calls under pressure while maintaining team buy-in. Balance directness with empathy.",
  },
  {
    id: "disc-influence",
    name: "Influence (I)",
    lowLabel: "Reserved & Task-Focused",
    highLabel: "Enthusiastic & Persuasive",
    description: "Measures enthusiasm, optimism, collaboration, and ability to influence others. High I individuals are outgoing, persuasive, and build relationships easily.",
    color: "#ea580c",
    category: "disc",
    scoreDescriptions: {
      low: "They tend to be reserved and task-focused, preferring to work independently. May struggle to energize the team or build rapport with new clients.",
      mid: "They can engage with others effectively and build reasonable relationships. They balance social interaction with task focus.",
      high: "They're enthusiastic, persuasive, and build relationships naturally. They energize the team, influence stakeholders, and create a positive atmosphere. May need to balance enthusiasm with attention to detail.",
    },
    growthSuggestion: "Leverage your social skills for client relationship management while ensuring you follow through on commitments with equal energy.",
  },
  {
    id: "disc-steadiness",
    name: "Steadiness (S)",
    lowLabel: "Fast-Paced & Change-Driven",
    highLabel: "Steady & Reliable",
    description: "Measures patience, reliability, and preference for stability. High S individuals are calm, supportive, and maintain consistency even under pressure.",
    color: "#0284c7",
    category: "disc",
    scoreDescriptions: {
      low: "They thrive on change and fast pace. May struggle with routine tasks or become impatient with slower processes. Could create unnecessary disruption by pushing too hard for change.",
      mid: "They balance adaptability with stability. They can handle change while maintaining consistency in critical processes.",
      high: "They're calm, reliable, and consistent. They provide stability for the team and maintain quality even under pressure. May resist necessary changes or avoid disrupting the status quo.",
    },
    growthSuggestion: "Balance your reliability with openness to change. An MSP environment requires both consistency and adaptability.",
  },
  {
    id: "disc-conscientiousness",
    name: "Conscientiousness (C)",
    lowLabel: "Big-Picture & Flexible",
    highLabel: "Analytical & Detail-Oriented",
    description: "Measures analytical thinking, attention to detail, and systematic approach to work. High C individuals are precise, quality-focused, and follow established processes.",
    color: "#4338ca",
    category: "disc",
    scoreDescriptions: {
      low: "They focus on the big picture and prefer flexibility over rigid processes. May overlook important details or cut corners under pressure.",
      mid: "They balance attention to detail with practical flexibility. They follow processes when important but can adapt when needed.",
      high: "They're highly analytical, detail-oriented, and systematic. They ensure quality and accuracy in everything. May over-analyze or slow decisions by seeking perfect information.",
    },
    growthSuggestion: "Use your analytical strengths for process improvement while practicing comfort with making decisions on imperfect information.",
  },
];

export const competencyDimensions = dimensions.filter(d => d.category === "competency");
export const comptiaDimensions = dimensions.filter(d => d.category === "comptia");
export const discDimensions = dimensions.filter(d => d.category === "disc");
