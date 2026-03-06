import { Question } from "@/types/assessment";

export const questions: Question[] = [
  // Microsoft Environment Expertise
  { id: "me-1", dimensionId: "microsoft-environment", text: "I can architect and manage complex Azure environments including hybrid cloud configurations, virtual networking, and identity management", reverseScored: false },
  { id: "me-2", dimensionId: "microsoft-environment", text: "I primarily rely on external consultants or vendors for advanced Microsoft 365 and Azure administration tasks", reverseScored: true },
  { id: "me-3", dimensionId: "microsoft-environment", text: "I have deep experience managing Active Directory/Entra ID including group policies, conditional access, and identity governance", reverseScored: false },
  { id: "me-4", dimensionId: "microsoft-environment", text: "I've successfully planned and executed Microsoft platform migrations (e.g., on-prem to cloud, Exchange to Exchange Online, AD to Entra ID)", reverseScored: false },
  { id: "me-5", dimensionId: "microsoft-environment", text: "I find it challenging to troubleshoot complex issues spanning multiple Microsoft services (Teams, SharePoint, Exchange, Intune) simultaneously", reverseScored: true },

  // Leadership & People Management
  { id: "lp-1", dimensionId: "leadership-people", text: "I regularly invest time in mentoring and developing my team members' technical and professional skills", reverseScored: false },
  { id: "lp-2", dimensionId: "leadership-people", text: "I find it easier to do technical work myself than to delegate and develop others to handle it", reverseScored: true },
  { id: "lp-3", dimensionId: "leadership-people", text: "I've built and managed IT teams, including hiring, performance reviews, and handling difficult personnel situations", reverseScored: false },
  { id: "lp-4", dimensionId: "leadership-people", text: "I create an environment where my team members feel safe to raise concerns, make mistakes, and grow", reverseScored: false },
  { id: "lp-5", dimensionId: "leadership-people", text: "I sometimes struggle to address underperformance directly and tend to avoid difficult conversations with team members", reverseScored: true },

  // Strategic IT Vision
  { id: "sv-1", dimensionId: "strategic-thinking", text: "I regularly align IT initiatives directly to measurable business outcomes like revenue growth, efficiency gains, or competitive advantage", reverseScored: false },
  { id: "sv-2", dimensionId: "strategic-thinking", text: "I'm more comfortable handling day-to-day IT operations than presenting technology strategy to the executive team", reverseScored: true },
  { id: "sv-3", dimensionId: "strategic-thinking", text: "I build technology roadmaps that anticipate future business needs and proactively address them before they become urgent", reverseScored: false },
  { id: "sv-4", dimensionId: "strategic-thinking", text: "I use data and metrics to inform technology investment decisions and demonstrate IT's value to the organization", reverseScored: false },
  { id: "sv-5", dimensionId: "strategic-thinking", text: "I primarily see my role as keeping systems running rather than shaping the organization's technology direction", reverseScored: true },

  // Security & Compliance
  { id: "sc-1", dimensionId: "security-compliance", text: "I proactively assess and address security vulnerabilities before they become incidents, including regular penetration testing and security audits", reverseScored: false },
  { id: "sc-2", dimensionId: "security-compliance", text: "I have hands-on experience implementing and managing compliance frameworks such as SOC 2, ISO 27001, or HIPAA", reverseScored: false },
  { id: "sc-3", dimensionId: "security-compliance", text: "I've sometimes discovered security gaps only after they were exploited or flagged by an audit", reverseScored: true },
  { id: "sc-4", dimensionId: "security-compliance", text: "I implement zero-trust security principles and maintain comprehensive incident response plans", reverseScored: false },
  { id: "sc-5", dimensionId: "security-compliance", text: "Keeping up with evolving cybersecurity threats and compliance requirements feels overwhelming to me", reverseScored: true },

  // Problem Solving & Innovation
  { id: "ps-1", dimensionId: "problem-solving", text: "When faced with a complex problem that doesn't fit familiar patterns, I enjoy finding creative, unconventional solutions", reverseScored: false },
  { id: "ps-2", dimensionId: "problem-solving", text: "I tend to stick with proven approaches rather than experimenting with new technologies or methods", reverseScored: true },
  { id: "ps-3", dimensionId: "problem-solving", text: "I regularly identify opportunities to automate processes, reduce costs, or improve efficiency through innovative technology use", reverseScored: false },
  { id: "ps-4", dimensionId: "problem-solving", text: "I challenge assumptions and encourage my team to think differently about how we deliver IT services", reverseScored: false },
  { id: "ps-5", dimensionId: "problem-solving", text: "I prefer following established procedures and find ambiguous, open-ended problems frustrating", reverseScored: true },

  // Communication & Culture Fit
  { id: "cc-1", dimensionId: "communication-culture", text: "I can effectively translate complex technical concepts into business language that executives and non-technical stakeholders understand", reverseScored: false },
  { id: "cc-2", dimensionId: "communication-culture", text: "I sometimes struggle to explain technical decisions or constraints to non-technical colleagues in a way they find compelling", reverseScored: true },
  { id: "cc-3", dimensionId: "communication-culture", text: "I actively build relationships with leaders across departments to understand their needs and ensure IT is seen as a trusted partner", reverseScored: false },
  { id: "cc-4", dimensionId: "communication-culture", text: "I contribute to and help shape a positive, collaborative workplace culture beyond just the IT department", reverseScored: false },
  { id: "cc-5", dimensionId: "communication-culture", text: "I tend to keep to myself and my team rather than engaging broadly across the organization", reverseScored: true },

  // Process & IT Operations
  { id: "po-1", dimensionId: "process-operations", text: "I've implemented structured IT service management processes (ITIL, change management, incident management) that improved reliability and accountability", reverseScored: false },
  { id: "po-2", dimensionId: "process-operations", text: "I maintain comprehensive documentation, runbooks, and standard operating procedures for critical IT systems", reverseScored: false },
  { id: "po-3", dimensionId: "process-operations", text: "Our IT processes tend to be informal and dependent on tribal knowledge rather than documented procedures", reverseScored: true },
  { id: "po-4", dimensionId: "process-operations", text: "I define and track service level agreements (SLAs) with internal stakeholders and continuously work to improve them", reverseScored: false },
  { id: "po-5", dimensionId: "process-operations", text: "I find process documentation and formalization tedious and prefer to handle things on a case-by-case basis", reverseScored: true },

  // Pressure & Crisis Management
  { id: "pm-1", dimensionId: "pressure-resilience", text: "During major outages or security incidents, I remain calm, take charge, and communicate clearly with stakeholders at all levels", reverseScored: false },
  { id: "pm-2", dimensionId: "pressure-resilience", text: "I maintain organized systems for tracking IT projects, incidents, and priorities even during high-pressure periods", reverseScored: false },
  { id: "pm-3", dimensionId: "pressure-resilience", text: "During high-stress periods, important tasks or follow-ups sometimes fall through the cracks", reverseScored: true },
  { id: "pm-4", dimensionId: "pressure-resilience", text: "I perform at my best when there are critical issues to resolve and the stakes are high", reverseScored: false },
  { id: "pm-5", dimensionId: "pressure-resilience", text: "I need a relatively calm and predictable environment to produce my best work", reverseScored: true },
];
