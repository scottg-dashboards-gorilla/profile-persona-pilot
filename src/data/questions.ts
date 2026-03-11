import { Question } from "@/types/assessment";

export const questions: Question[] = [
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
];
