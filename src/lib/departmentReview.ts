import { CORE_VALUES } from "@/lib/coreValues";

export type ReviewGroup = "operations-leaders" | "service-technicians" | "sales-operations" | "engineering";
export type EmployeeContext = { department: string | null; title: string | null };
export const OPERATIONS_TITLES = ["Director of Operations", "National Director of Service Delivery", "Service Manager", "Service Team Lead", "Team Lead", "Technical Team Lead"];
export const TECHNICIAN_TITLES = ["Bench Technician", "Field Service Technician I", "Helpdesk Technician", "NOC Tier 2 Engineer", "Service Engineer I", "Service Escalation Engineer", "Service Technician I", "Service Technician II", "Tier 1 Service Technician"];

export function reviewGroup(employee: EmployeeContext): ReviewGroup | null {
  const department = employee.department ?? "";
  const title = (employee.title ?? "").toLowerCase();
  if (department === "Service Delivery") {
    if (OPERATIONS_TITLES.some((t) => t.toLowerCase() === title)) return "operations-leaders";
    if (TECHNICIAN_TITLES.some((t) => t.toLowerCase() === title)) return "service-technicians";
    return null;
  }
  if (["Sales & Marketing", "East Coast Sales", "West Coast Sales"].includes(department)) return "sales-operations";
  if (department === "Engineering & Security") return "engineering";
  return null;
}

export function questionApplies(question: { department: string | null; applies_to_titles?: string[] }, employee: EmployeeContext) {
  if (question.department && question.department !== employee.department) return false;
  const titles = question.applies_to_titles ?? [];
  return titles.length === 0 || titles.some((t) => t.toLowerCase() === (employee.title ?? "").toLowerCase());
}

const VALUE_EVIDENCE: Record<ReviewGroup, string[]> = {
  "operations-leaders": ["Follow change-management and ticketing standards; maintain accurate documentation.", "Communicate professionally with clients and colleagues, especially during escalations.", "Improve routing or documentation with measurable efficiency or resolution-time impact.", "Demonstrate expertise, complete training and share useful skills with the team.", "Keep customers informed, manage expectations and follow through on service concerns."],
  "service-technicians": ["Resolve client needs with sound judgment and accurate, complete work.", "Support teammates and the department with respectful, reliable collaboration.", "Identify gaps and propose practical improvements.", "Demonstrate technical expertise, learning and independent thinking; assess contribution, not personality or likability.", "Use CSAT evidence and show care and clarity in client communication."],
  "sales-operations": ["Balance client and delivery needs with transparent communication.", "Build respectful working relationships with the teams relied on to deliver.", "Raise ideas and improve processes or results.", "Demonstrate competence, critical thinking and care for the work; do not grade personality.", "Improve customer communication and service, recognizing training and support needs."],
  engineering: ["Identify and correct incorrect configurations rather than passing on avoidable risk.", "Treat client and cross-department engagements with equal care.", "Share and consider useful ideas even when they are not adopted.", "Demonstrate expertise and authentic critical thinking, not conformity or likability.", "Use customer surveys and project feedback as evidence of the experience delivered."],
};

export function departmentValues(employee: EmployeeContext) {
  const group = reviewGroup(employee);
  return CORE_VALUES.map((value, index) => ({ ...value, meaning: group ? VALUE_EVIDENCE[group][index] : value.meaning, prompt: "One example that justifies this score…" }));
}

export function assessmentRoleFor(employee: EmployeeContext): string | null {
  const group = reviewGroup(employee);
  return group === "operations-leaders" ? "operations-oversight" : group === "service-technicians" ? "service-delivery-technical" : group === "engineering" ? "engineering-security" : group === "sales-operations" ? "sales-operations" : null;
}

export const DEPARTMENT_GOALS: Record<ReviewGroup, { title: string; target: string; evidence: string; roles?: string }[]> = {
  "operations-leaders": [
    { title: "Managed Services Gross Margin", target: "Meet or exceed annual budgeted margin · monthly", evidence: "Financial Reports / ERP", roles: "Operations leadership and service managers" },
    { title: "Resource Utilization & Productivity", target: "75–85% productive utilization · monthly", evidence: "ConnectWise Utilization Report", roles: "Engineers and team leads" },
    { title: "Service Stability & Escalation Reduction", target: "Reduce client escalations by 15% · quarterly", evidence: "Incident & Escalation Report", roles: "Engineers and service managers" },
  ],
  "service-technicians": [
    { title: "SLA", target: "98%+ · monthly", evidence: "Brightgauge / Cog360" },
    { title: "CSAT", target: "100% · monthly", evidence: "SimpleSAT" },
    { title: "Productivity", target: "7 hours per day · reviewed monthly", evidence: "ConnectWise / Cog360" },
  ],
  "sales-operations": [
    { title: "Sales goals", target: "Exceed agreed revenue target · monthly", evidence: "Sales revenue", roles: "Sales" },
    { title: "Providing TBAs to clients", target: "Meet agreed TBA target · monthly", evidence: "TBA tracker", roles: "Strategic Partnerships" },
    { title: "Design turnaround", target: "Meet design SLAs · daily", evidence: "Evidence source awaiting Dan’s confirmation", roles: "Sales Design" },
    { title: "Marketing leads", target: "30 MQLs per month", evidence: "Monthly MQL count", roles: "Marketing" },
  ],
  engineering: [{ title: "Monthly Effective Hourly Rate", target: "Hourly-rate formula and target direction awaiting Stephen’s confirmation", evidence: "ConnectWise · monthly", roles: "Project team and managers" }],
};