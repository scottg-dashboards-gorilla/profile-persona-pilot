import { Question } from "@/types/assessment";

export const questions: Question[] = [
  // Talent Acquisition & Recruiting
  { id: "ta-1", dimensionId: "talent-acquisition", text: "I build candidate pipelines for critical roles before positions actually open", reverseScored: false },
  { id: "ta-2", dimensionId: "talent-acquisition", text: "I primarily rely on job postings and inbound applications to fill roles", reverseScored: true },
  { id: "ta-3", dimensionId: "talent-acquisition", text: "I've developed and executed employer branding strategies that measurably improved our ability to attract talent", reverseScored: false },
  { id: "ta-4", dimensionId: "talent-acquisition", text: "I use data (time-to-fill, quality-of-hire, source effectiveness) to continuously improve recruiting outcomes", reverseScored: false },
  { id: "ta-5", dimensionId: "talent-acquisition", text: "I find it challenging to compete for technical talent against larger companies with bigger budgets", reverseScored: true },

  // Management Coaching & Development
  { id: "mc-1", dimensionId: "leadership-coaching", text: "When a manager struggles with a team member's performance, I coach them through the conversation rather than handling it myself", reverseScored: false },
  { id: "mc-2", dimensionId: "leadership-coaching", text: "I've built frameworks or training programs that help managers have effective performance conversations", reverseScored: false },
  { id: "mc-3", dimensionId: "leadership-coaching", text: "I tend to give managers direct answers rather than helping them develop their own problem-solving skills", reverseScored: true },
  { id: "mc-4", dimensionId: "leadership-coaching", text: "I proactively identify managers who need development support before performance issues escalate", reverseScored: false },
  { id: "mc-5", dimensionId: "leadership-coaching", text: "I'm more comfortable handling administrative HR tasks than coaching leaders on difficult people issues", reverseScored: true },

  // Employee Advocacy & Voice
  { id: "ea-1", dimensionId: "employee-advocacy", text: "Employees regularly come to me with sensitive concerns because they trust I'll advocate for them fairly", reverseScored: false },
  { id: "ea-2", dimensionId: "employee-advocacy", text: "I've pushed back on leadership decisions when I believed they would negatively impact employee well-being or morale", reverseScored: false },
  { id: "ea-3", dimensionId: "employee-advocacy", text: "I sometimes avoid raising uncomfortable employee feedback with senior leadership", reverseScored: true },
  { id: "ea-4", dimensionId: "employee-advocacy", text: "I run regular pulse surveys or feedback mechanisms to proactively understand employee sentiment", reverseScored: false },
  { id: "ea-5", dimensionId: "employee-advocacy", text: "I find it difficult to balance being an employee advocate while also supporting company decisions I don't fully agree with", reverseScored: true },

  // Compliance & Risk Management
  { id: "cr-1", dimensionId: "compliance-risk", text: "I proactively audit our HR policies and practices for legal compliance at least annually", reverseScored: false },
  { id: "cr-2", dimensionId: "compliance-risk", text: "I'm confident in my knowledge of employment law as it applies to remote workers across different states or countries", reverseScored: false },
  { id: "cr-3", dimensionId: "compliance-risk", text: "I've sometimes realized a compliance gap only after it became a problem", reverseScored: true },
  { id: "cr-4", dimensionId: "compliance-risk", text: "I maintain up-to-date employee handbooks, policies, and documentation that would withstand legal scrutiny", reverseScored: false },
  { id: "cr-5", dimensionId: "compliance-risk", text: "Managing compliance across multiple jurisdictions for remote workers feels overwhelming to me", reverseScored: true },

  // Pressure & Organization
  { id: "po-1", dimensionId: "pressure-resilience", text: "When multiple urgent issues hit simultaneously (e.g., a resignation, a complaint, and a deadline), I triage and handle them calmly", reverseScored: false },
  { id: "po-2", dimensionId: "pressure-resilience", text: "I maintain organized systems for tracking HR projects, deadlines, and follow-ups even during busy periods", reverseScored: false },
  { id: "po-3", dimensionId: "pressure-resilience", text: "During high-stress periods, important tasks sometimes fall through the cracks", reverseScored: true },
  { id: "po-4", dimensionId: "pressure-resilience", text: "I perform at my best when things are busy and there's a lot on my plate", reverseScored: false },
  { id: "po-5", dimensionId: "pressure-resilience", text: "I need a relatively calm and predictable schedule to produce my best work", reverseScored: true },

  // Culture & Engagement
  { id: "cb-1", dimensionId: "culture-building", text: "I've designed and implemented programs specifically aimed at building culture and connection in remote or hybrid teams", reverseScored: false },
  { id: "cb-2", dimensionId: "culture-building", text: "I measure employee engagement and culture health using structured data, not just gut feeling", reverseScored: false },
  { id: "cb-3", dimensionId: "culture-building", text: "I find it difficult to create meaningful team connection when people don't share a physical office", reverseScored: true },
  { id: "cb-4", dimensionId: "culture-building", text: "I see company culture as something that needs to be intentionally designed and maintained, not something that just happens", reverseScored: false },
  { id: "cb-5", dimensionId: "culture-building", text: "I tend to focus more on HR operations than on culture-building initiatives", reverseScored: true },

  // Strategic HR Leadership
  { id: "st-1", dimensionId: "strategic-thinking", text: "I regularly connect HR initiatives directly to measurable business outcomes like revenue growth, retention, or productivity", reverseScored: false },
  { id: "st-2", dimensionId: "strategic-thinking", text: "I'm more comfortable executing HR tasks than presenting workforce strategy to the executive team", reverseScored: true },
  { id: "st-3", dimensionId: "strategic-thinking", text: "I use workforce analytics and data to inform executive decisions about the organization's future", reverseScored: false },
  { id: "st-4", dimensionId: "strategic-thinking", text: "I anticipate organizational challenges (like succession gaps or skill shortages) before they become urgent problems", reverseScored: false },
  { id: "st-5", dimensionId: "strategic-thinking", text: "I primarily see my role as supporting what the business asks of HR rather than shaping the people strategy", reverseScored: true },

  // Initiative & Ownership
  { id: "io-1", dimensionId: "initiative-drive", text: "I regularly identify process improvements or new programs and drive them from idea to implementation without being asked", reverseScored: false },
  { id: "io-2", dimensionId: "initiative-drive", text: "I tend to wait for leadership to set HR priorities rather than proposing my own agenda", reverseScored: true },
  { id: "io-3", dimensionId: "initiative-drive", text: "When I see a gap in our people practices, I build the business case and get buy-in to fix it", reverseScored: false },
  { id: "io-4", dimensionId: "initiative-drive", text: "I've successfully launched HR programs or initiatives that weren't part of my original job description", reverseScored: false },
  { id: "io-5", dimensionId: "initiative-drive", text: "I prefer clear direction on what to prioritize rather than having to figure out what's most important on my own", reverseScored: true },
];
