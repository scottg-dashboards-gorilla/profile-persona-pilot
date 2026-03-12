import { Question } from "@/types/assessment";

export const questions: Question[] = [
  // ==========================================
  // COMPETENCY DIMENSIONS (Original 8 × 5 = 40)
  // ==========================================

  // Leadership & Leading by Example
  { id: "le-1", dimensionId: "leadership-example", text: "I regularly roll up my sleeves and work alongside my team on complex client issues rather than only delegating from a distance", reverseScored: false },
  { id: "le-2", dimensionId: "leadership-example", text: "I set clear performance standards for my team and hold myself to the same or higher standards", reverseScored: false },
  { id: "le-3", dimensionId: "leadership-example", text: "I find it easier to direct work from behind the scenes than to be visibly involved in day-to-day operations", reverseScored: true },
  { id: "le-4", dimensionId: "leadership-example", text: "I take ownership of failures and share credit for successes with my team", reverseScored: false },
  { id: "le-5", dimensionId: "leadership-example", text: "I sometimes struggle to motivate team members who are disengaged or resistant to change", reverseScored: true },

  // Adaptability & MSP Dynamics
  { id: "ad-1", dimensionId: "adaptability-dynamics", text: "I thrive when managing multiple client environments simultaneously and enjoy the variety of an MSP setting", reverseScored: false },
  { id: "ad-2", dimensionId: "adaptability-dynamics", text: "I can quickly reprioritize when urgent issues arise across different client accounts without losing track of existing commitments", reverseScored: false },
  { id: "ad-3", dimensionId: "adaptability-dynamics", text: "I prefer working in a single, predictable environment rather than constantly switching between different client systems and priorities", reverseScored: true },
  { id: "ad-4", dimensionId: "adaptability-dynamics", text: "I've successfully managed situations where multiple clients had competing urgent needs at the same time", reverseScored: false },
  { id: "ad-5", dimensionId: "adaptability-dynamics", text: "Rapid context-switching between different client environments and technologies feels overwhelming to me", reverseScored: true },

  // Problem Solving & Critical Thinking
  { id: "ps-1", dimensionId: "problem-solving", text: "When faced with a complex technical issue that spans multiple systems or client environments, I enjoy working through it methodically to find the root cause", reverseScored: false },
  { id: "ps-2", dimensionId: "problem-solving", text: "I tend to stick with proven troubleshooting methods rather than exploring unconventional approaches to difficult problems", reverseScored: true },
  { id: "ps-3", dimensionId: "problem-solving", text: "I regularly identify patterns across client environments that help prevent recurring issues before they escalate", reverseScored: false },
  { id: "ps-4", dimensionId: "problem-solving", text: "I challenge assumptions and encourage my team to think critically about the real root cause rather than just fixing symptoms", reverseScored: false },
  { id: "ps-5", dimensionId: "problem-solving", text: "I find ambiguous, open-ended technical problems frustrating and prefer clear-cut issues with established resolution paths", reverseScored: true },

  // Culture & Communication
  { id: "cc-1", dimensionId: "culture-communication", text: "I actively build relationships with client stakeholders and ensure they feel well-supported and informed about their IT environment", reverseScored: false },
  { id: "cc-2", dimensionId: "culture-communication", text: "I sometimes struggle to explain technical decisions or constraints to non-technical clients in a way they find reassuring", reverseScored: true },
  { id: "cc-3", dimensionId: "culture-communication", text: "I contribute to building a positive, supportive team culture where people enjoy coming to work and collaborating", reverseScored: false },
  { id: "cc-4", dimensionId: "culture-communication", text: "I proactively share knowledge across the team and create opportunities for collaboration rather than working in silos", reverseScored: false },
  { id: "cc-5", dimensionId: "culture-communication", text: "I tend to keep to myself and focus on my own work rather than investing time in team relationships and culture-building", reverseScored: true },

  // Microsoft Azure & Cloud Infrastructure
  { id: "az-1", dimensionId: "azure-cloud", text: "I can architect and manage complex Azure environments including virtual networks, identity management, and hybrid cloud configurations across client tenants", reverseScored: false },
  { id: "az-2", dimensionId: "azure-cloud", text: "I primarily rely on external consultants or senior engineers for advanced Azure administration and troubleshooting", reverseScored: true },
  { id: "az-3", dimensionId: "azure-cloud", text: "I have deep experience with Entra ID including conditional access policies, identity governance, and multi-tenant identity management", reverseScored: false },
  { id: "az-4", dimensionId: "azure-cloud", text: "I've successfully planned and executed cloud migrations for clients — moving workloads from on-premises to Azure with minimal disruption", reverseScored: false },
  { id: "az-5", dimensionId: "azure-cloud", text: "I find it challenging to troubleshoot complex Azure networking issues or diagnose performance problems in cloud environments", reverseScored: true },

  // Microsoft 365 Administration
  { id: "m3-1", dimensionId: "m365-admin", text: "I can confidently manage multi-tenant M365 environments including Exchange Online, SharePoint, Teams, and Intune across dozens of client accounts", reverseScored: false },
  { id: "m3-2", dimensionId: "m365-admin", text: "I have deep experience with Intune device management including autopilot deployment, compliance policies, and configuration profiles", reverseScored: false },
  { id: "m3-3", dimensionId: "m365-admin", text: "I sometimes struggle with advanced M365 administration tasks like mail flow rules, DLP policies, or complex SharePoint configurations", reverseScored: true },
  { id: "m3-4", dimensionId: "m365-admin", text: "I've successfully executed M365 tenant migrations and can plan these projects end-to-end for client environments", reverseScored: false },
  { id: "m3-5", dimensionId: "m365-admin", text: "I rely heavily on documentation or vendor support for M365 troubleshooting rather than being able to diagnose issues independently", reverseScored: true },

  // Security & Compliance
  { id: "sc-1", dimensionId: "security-compliance", text: "I proactively assess and address security vulnerabilities across client environments before they become incidents", reverseScored: false },
  { id: "sc-2", dimensionId: "security-compliance", text: "I have hands-on experience implementing security frameworks and can maintain consistent security baselines across multiple client accounts", reverseScored: false },
  { id: "sc-3", dimensionId: "security-compliance", text: "I've sometimes discovered security gaps in client environments only after they were exploited or flagged by an audit", reverseScored: true },
  { id: "sc-4", dimensionId: "security-compliance", text: "I implement zero-trust security principles and maintain incident response plans tailored to the MSP context", reverseScored: false },
  { id: "sc-5", dimensionId: "security-compliance", text: "Keeping up with evolving cybersecurity threats and managing security across many different client environments feels overwhelming", reverseScored: true },

  // Network & Infrastructure Management
  { id: "ni-1", dimensionId: "network-infrastructure", text: "I can effectively guide and manage network engineers on complex infrastructure projects including switches, firewalls, VPNs, and WAN configurations", reverseScored: false },
  { id: "ni-2", dimensionId: "network-infrastructure", text: "I have strong foundational knowledge of networking that allows me to make informed decisions and ask the right questions when overseeing infrastructure work", reverseScored: false },
  { id: "ni-3", dimensionId: "network-infrastructure", text: "I sometimes feel out of my depth when network engineers discuss advanced routing, firewall rules, or complex multi-site networking configurations", reverseScored: true },
  { id: "ni-4", dimensionId: "network-infrastructure", text: "I've successfully overseen infrastructure assessments and network upgrades for clients, coordinating engineers and managing timelines effectively", reverseScored: false },
  { id: "ni-5", dimensionId: "network-infrastructure", text: "I tend to defer entirely to network engineers on infrastructure decisions rather than providing technical guidance or direction", reverseScored: true },

  // ==========================================
  // COMPTIA TECHNICAL DIMENSIONS (3 × 5 = 15)
  // ==========================================

  // IT Fundamentals & Support (A+/Server+)
  { id: "cf-1", dimensionId: "comptia-fundamentals", text: "I can confidently troubleshoot hardware failures, BIOS/UEFI configurations, and peripheral issues across diverse client workstations and servers", reverseScored: false },
  { id: "cf-2", dimensionId: "comptia-fundamentals", text: "I understand operating system internals well enough to diagnose boot failures, driver conflicts, and performance issues on both Windows and Linux systems", reverseScored: false },
  { id: "cf-3", dimensionId: "comptia-fundamentals", text: "I find it challenging to explain the difference between RAID levels or choose the right storage configuration for a client's specific workload requirements", reverseScored: true },
  { id: "cf-4", dimensionId: "comptia-fundamentals", text: "I can set up and manage Windows Server environments including Active Directory, Group Policy, DNS, DHCP, and file services across client sites", reverseScored: false },
  { id: "cf-5", dimensionId: "comptia-fundamentals", text: "I often need to refer to documentation for basic server administration tasks like configuring backup schedules, managing certificates, or setting up print services", reverseScored: true },

  // Data & Analytics (Data+)
  { id: "cd-1", dimensionId: "comptia-data", text: "I can write SQL queries to extract, analyze, and report on data from client databases and ticketing systems to identify trends and optimize operations", reverseScored: false },
  { id: "cd-2", dimensionId: "comptia-data", text: "I understand data governance principles including data classification, retention policies, and privacy regulations that affect how we handle client data", reverseScored: false },
  { id: "cd-3", dimensionId: "comptia-data", text: "I struggle to interpret data visualizations or statistical reports when making operational decisions about client account performance", reverseScored: true },
  { id: "cd-4", dimensionId: "comptia-data", text: "I've built or managed reporting dashboards that track MSP KPIs like ticket resolution times, SLA compliance, and client satisfaction metrics", reverseScored: false },
  { id: "cd-5", dimensionId: "comptia-data", text: "I rely on others to handle data analysis tasks and don't feel comfortable working with databases or reporting tools directly", reverseScored: true },

  // Advanced Cybersecurity (CySA+/PenTest+)
  { id: "co-1", dimensionId: "comptia-cyberops", text: "I can analyze security logs from SIEM tools, identify indicators of compromise, and lead incident response procedures across client environments", reverseScored: false },
  { id: "co-2", dimensionId: "comptia-cyberops", text: "I understand vulnerability scanning tools and can interpret results to prioritize remediation efforts based on risk and business impact for each client", reverseScored: false },
  { id: "co-3", dimensionId: "comptia-cyberops", text: "I find it difficult to differentiate between false positives and genuine security threats when reviewing alerts from security monitoring tools", reverseScored: true },
  { id: "co-4", dimensionId: "comptia-cyberops", text: "I can explain common attack vectors like SQL injection, cross-site scripting, and social engineering techniques to both technical and non-technical audiences", reverseScored: false },
  { id: "co-5", dimensionId: "comptia-cyberops", text: "I lack confidence in conducting or overseeing vulnerability assessments and penetration testing activities for client environments", reverseScored: true },

  // ==========================================
  // DISC BEHAVIORAL DIMENSIONS (4 × 4 = 16)
  // ==========================================

  // Dominance (D)
  { id: "dd-1", dimensionId: "disc-dominance", text: "When I see a problem, I take charge immediately rather than waiting for someone else to step up", reverseScored: false },
  { id: "dd-2", dimensionId: "disc-dominance", text: "I'm comfortable making tough decisions quickly, even when I don't have all the information I'd like", reverseScored: false },
  { id: "dd-3", dimensionId: "disc-dominance", text: "I prefer to let others take the lead in high-pressure situations while I support from behind", reverseScored: true },
  { id: "dd-4", dimensionId: "disc-dominance", text: "I push hard for results and am willing to challenge people or processes that are underperforming", reverseScored: false },

  // Influence (I)
  { id: "di-1", dimensionId: "disc-influence", text: "I naturally energize and motivate people around me, even during stressful periods", reverseScored: false },
  { id: "di-2", dimensionId: "disc-influence", text: "I find it easy to persuade clients or team members to see things from my perspective through conversation and enthusiasm", reverseScored: false },
  { id: "di-3", dimensionId: "disc-influence", text: "I'd rather work quietly on tasks by myself than spend time socializing or building relationships at work", reverseScored: true },
  { id: "di-4", dimensionId: "disc-influence", text: "I'm often described as optimistic and enthusiastic, and I bring positive energy to team interactions", reverseScored: false },

  // Steadiness (S)
  { id: "ds-1", dimensionId: "disc-steadiness", text: "I remain calm and composed when multiple crises hit at the same time, providing a stabilizing presence for the team", reverseScored: false },
  { id: "ds-2", dimensionId: "disc-steadiness", text: "I value consistency and follow-through, and I'm known for reliably delivering on my commitments", reverseScored: false },
  { id: "ds-3", dimensionId: "disc-steadiness", text: "I get restless with routine and am always looking to shake things up, even when current processes are working well", reverseScored: true },
  { id: "ds-4", dimensionId: "disc-steadiness", text: "I'm patient with team members who are learning and prefer coaching over pressure to drive improvement", reverseScored: false },

  // Conscientiousness (C)
  { id: "dc-1", dimensionId: "disc-conscientiousness", text: "I insist on thorough documentation and systematic processes — I believe quality comes from attention to detail", reverseScored: false },
  { id: "dc-2", dimensionId: "disc-conscientiousness", text: "Before making a decision, I gather and analyze all available data rather than going with my gut feeling", reverseScored: false },
  { id: "dc-3", dimensionId: "disc-conscientiousness", text: "I sometimes skip over procedural details when I feel confident about the outcome", reverseScored: true },
  { id: "dc-4", dimensionId: "disc-conscientiousness", text: "I hold myself and others to high quality standards and am uncomfortable cutting corners even under time pressure", reverseScored: false },

  // ==========================================
  // COACHING & FEEDBACK PREFERENCES (5 questions)
  // ==========================================
  { id: "fb-1", dimensionId: "coaching-preferences", text: "I prefer receiving feedback directly and bluntly rather than having it softened or sugar-coated", reverseScored: false },
  { id: "fb-2", dimensionId: "coaching-preferences", text: "I learn best when someone shows me how to do something hands-on rather than explaining it verbally or through documentation", reverseScored: false },
  { id: "fb-3", dimensionId: "coaching-preferences", text: "I respond better to encouragement and positive reinforcement than to criticism or correction", reverseScored: false },
  { id: "fb-4", dimensionId: "coaching-preferences", text: "I prefer to work through challenges independently before asking for help, and I value having space to figure things out on my own", reverseScored: false },
  { id: "fb-5", dimensionId: "coaching-preferences", text: "I find regular one-on-one check-ins with my manager more helpful than occasional performance reviews", reverseScored: false },

  // ==========================================
  // SELF-ASSESSMENT LEVEL (5 questions)
  // These help calibrate self-perceived tier alongside objective scores
  // ==========================================
  { id: "sa-1", dimensionId: "self-assessment", text: "I'm confident I could mentor and develop junior technicians, helping them grow their technical and professional skills", reverseScored: false },
  { id: "sa-2", dimensionId: "self-assessment", text: "I regularly handle complex escalations that other team members can't resolve on their own", reverseScored: false },
  { id: "sa-3", dimensionId: "self-assessment", text: "I've led projects or initiatives that required coordinating multiple people and managing timelines across client accounts", reverseScored: false },
  { id: "sa-4", dimensionId: "self-assessment", text: "I still have a lot to learn about the technologies we support and often need guidance from more experienced colleagues", reverseScored: true },
  { id: "sa-5", dimensionId: "self-assessment", text: "I'm comfortable being the primary point of accountability for an entire team's performance and client satisfaction", reverseScored: false },

  // ==========================================
  // CONSISTENCY/TRUTHFULNESS PAIRS (12 questions)
  // ==========================================

  { id: "tp-1", dimensionId: "leadership-example", text: "When a critical client issue arises, I jump in and work alongside the team rather than simply assigning it and checking back later", reverseScored: false, consistencyPairId: "le-1" },
  { id: "tp-2", dimensionId: "leadership-example", text: "I prefer to manage through emails and reports rather than being physically present and engaged with my team's daily work", reverseScored: true, consistencyPairId: "le-3" },
  { id: "tp-3", dimensionId: "adaptability-dynamics", text: "I would be happier in a role where I focus on one company's systems rather than juggling many different client environments", reverseScored: true, consistencyPairId: "ad-3" },
  { id: "tp-4", dimensionId: "adaptability-dynamics", text: "I handle switching between different client projects throughout the day without difficulty or stress", reverseScored: false, consistencyPairId: "ad-5" },
  { id: "tp-5", dimensionId: "problem-solving", text: "I actively seek out new and creative approaches when standard troubleshooting methods don't resolve a complex issue", reverseScored: false, consistencyPairId: "ps-2" },
  { id: "tp-6", dimensionId: "culture-communication", text: "Building strong working relationships with colleagues is something I actively prioritize in my daily routine", reverseScored: false, consistencyPairId: "cc-5" },
  { id: "tp-7", dimensionId: "disc-dominance", text: "In crisis situations, I wait for clear direction from leadership before taking action on my own", reverseScored: true, consistencyPairId: "dd-1" },
  { id: "tp-8", dimensionId: "disc-influence", text: "I seek out opportunities to connect with colleagues and clients socially because I genuinely enjoy building relationships", reverseScored: false, consistencyPairId: "di-3" },
  { id: "tp-9", dimensionId: "security-compliance", text: "I schedule regular security reviews and vulnerability scans for client environments without waiting to be asked", reverseScored: false, consistencyPairId: "sc-1" },
  { id: "tp-10", dimensionId: "azure-cloud", text: "I can independently resolve most Azure issues without needing to escalate to outside experts or senior staff", reverseScored: false, consistencyPairId: "az-2" },
  { id: "tp-11", dimensionId: "disc-steadiness", text: "I'm comfortable with established routines and don't feel the need to constantly change things that are working", reverseScored: false, consistencyPairId: "ds-3" },
  { id: "tp-12", dimensionId: "disc-conscientiousness", text: "I always follow documented procedures carefully, even when I'm confident I know the right answer without checking", reverseScored: false, consistencyPairId: "dc-3" },
];

/**
 * Map of consistency pairs: each entry maps a truthfulness question ID to its paired original question ID.
 */
export const consistencyPairs: { truthfulnessQuestionId: string; originalQuestionId: string }[] = questions
  .filter((q) => q.consistencyPairId)
  .map((q) => ({ truthfulnessQuestionId: q.id, originalQuestionId: q.consistencyPairId! }));
