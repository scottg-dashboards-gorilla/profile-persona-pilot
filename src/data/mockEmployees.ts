import { addDays, addMonths, subDays, subMonths, subYears } from "date-fns";

export type MockEmployee = {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  title: string;
  manager_uuid: string | null;
  hire_date: string;
  current_annual_comp: number;
  last_raise_date: string | null;
  last_raise_amount: number;
};

export type MockReview = {
  id: string;
  employee_uuid: string;
  employee_name: string;
  department: string;
  scheduled_date: string;
  completed_date: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  overall_rating: "exceeds" | "meets" | "below" | null;
  comp_adjustment_amount: number | null;
  comp_adjustment_percent: number | null;
  promotion: boolean;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();

export const mockEmployees: MockEmployee[] = [
  { uuid: "e-001", first_name: "James",   last_name: "Bates",      email: "jbates@mydatapath.com",      department: "Sr Leadership", title: "Co-CEO",                manager_uuid: null,    hire_date: iso(subYears(today, 18)), current_annual_comp: 285000, last_raise_date: iso(subMonths(today, 14)), last_raise_amount: 15000 },
  { uuid: "e-002", first_name: "David",   last_name: "Darmstandler",email: "ddarmstandler@mydatapath.com",department: "Sr Leadership", title: "Co-CEO",               manager_uuid: null,    hire_date: iso(subYears(today, 18)), current_annual_comp: 285000, last_raise_date: iso(subMonths(today, 14)), last_raise_amount: 15000 },
  { uuid: "e-010", first_name: "Marcus",  last_name: "Reyes",      email: "mreyes@mydatapath.com",      department: "Engineering",   title: "Tier 2 Senior Tech",   manager_uuid: "e-020", hire_date: iso(subYears(today, 4)),  current_annual_comp: 78000,  last_raise_date: iso(subMonths(today, 8)),  last_raise_amount: 6000 },
  { uuid: "e-011", first_name: "Priya",   last_name: "Shah",       email: "pshah@mydatapath.com",       department: "Engineering",   title: "Tier 1 Help Desk",     manager_uuid: "e-020", hire_date: iso(subYears(today, 1)),  current_annual_comp: 52000,  last_raise_date: null, last_raise_amount: 0 },
  { uuid: "e-012", first_name: "Diego",   last_name: "Hernandez",  email: "dhernandez@mydatapath.com",  department: "Engineering",   title: "Team Leader",          manager_uuid: "e-020", hire_date: iso(subYears(today, 6)),  current_annual_comp: 105000, last_raise_date: iso(subMonths(today, 11)), last_raise_amount: 8000 },
  { uuid: "e-013", first_name: "Sara",    last_name: "Nguyen",     email: "snguyen@mydatapath.com",     department: "Engineering",   title: "Tier 2 Senior Tech",   manager_uuid: "e-020", hire_date: iso(subYears(today, 2)),  current_annual_comp: 72000,  last_raise_date: iso(subMonths(today, 6)),  last_raise_amount: 4000 },
  { uuid: "e-020", first_name: "Robert",  last_name: "Chen",       email: "rchen@mydatapath.com",       department: "Engineering",   title: "Director of IT",       manager_uuid: "e-001", hire_date: iso(subYears(today, 9)),  current_annual_comp: 145000, last_raise_date: iso(subMonths(today, 10)), last_raise_amount: 10000 },
  { uuid: "e-030", first_name: "Lauren",  last_name: "Pierce",     email: "lpierce@mydatapath.com",     department: "Sales",         title: "Account Executive",    manager_uuid: "e-031", hire_date: iso(subYears(today, 3)),  current_annual_comp: 88000,  last_raise_date: iso(subMonths(today, 13)), last_raise_amount: 5000 },
  { uuid: "e-031", first_name: "Thomas",  last_name: "Reed",       email: "treed@mydatapath.com",       department: "Sales",         title: "VP of Sales",          manager_uuid: "e-001", hire_date: iso(subYears(today, 7)),  current_annual_comp: 165000, last_raise_date: iso(subMonths(today, 9)),  last_raise_amount: 12000 },
  { uuid: "e-040", first_name: "Ashley",  last_name: "Kim",        email: "akim@mydatapath.com",        department: "Operations",    title: "Project Coordinator",  manager_uuid: "e-041", hire_date: iso(subYears(today, 2)),  current_annual_comp: 62000,  last_raise_date: iso(subMonths(today, 7)),  last_raise_amount: 3000 },
  { uuid: "e-041", first_name: "Michelle",last_name: "Torres",     email: "mtorres@mydatapath.com",     department: "Operations",    title: "Operations Manager",   manager_uuid: "e-002", hire_date: iso(subYears(today, 8)),  current_annual_comp: 118000, last_raise_date: iso(subMonths(today, 12)), last_raise_amount: 7000 },
  { uuid: "e-050", first_name: "Nathan",  last_name: "Brooks",     email: "nbrooks@mydatapath.com",     department: "Finance",       title: "Staff Accountant",     manager_uuid: "e-051", hire_date: iso(subYears(today, 1)),  current_annual_comp: 65000,  last_raise_date: null, last_raise_amount: 0 },
  { uuid: "e-051", first_name: "Karen",   last_name: "Wallace",    email: "kwallace@mydatapath.com",    department: "Finance",       title: "Controller",           manager_uuid: "e-002", hire_date: iso(subYears(today, 11)), current_annual_comp: 132000, last_raise_date: iso(subMonths(today, 10)), last_raise_amount: 8000 },
];

export const mockReviews: MockReview[] = [
  // Overdue
  { id: "r-001", employee_uuid: "e-011", employee_name: "Priya Shah",         department: "Engineering", scheduled_date: iso(subDays(today, 8)),  completed_date: null, status: "scheduled",   overall_rating: null, comp_adjustment_amount: null, comp_adjustment_percent: null, promotion: false },
  { id: "r-002", employee_uuid: "e-050", employee_name: "Nathan Brooks",      department: "Finance",     scheduled_date: iso(subDays(today, 3)),  completed_date: null, status: "in_progress", overall_rating: null, comp_adjustment_amount: null, comp_adjustment_percent: null, promotion: false },
  // Due soon
  { id: "r-003", employee_uuid: "e-013", employee_name: "Sara Nguyen",        department: "Engineering", scheduled_date: iso(addDays(today, 6)),  completed_date: null, status: "in_progress", overall_rating: null, comp_adjustment_amount: null, comp_adjustment_percent: null, promotion: false },
  { id: "r-004", employee_uuid: "e-040", employee_name: "Ashley Kim",         department: "Operations",  scheduled_date: iso(addDays(today, 12)), completed_date: null, status: "scheduled",   overall_rating: null, comp_adjustment_amount: null, comp_adjustment_percent: null, promotion: false },
  { id: "r-005", employee_uuid: "e-010", employee_name: "Marcus Reyes",       department: "Engineering", scheduled_date: iso(addDays(today, 21)), completed_date: null, status: "scheduled",   overall_rating: null, comp_adjustment_amount: null, comp_adjustment_percent: null, promotion: false },
  { id: "r-006", employee_uuid: "e-030", employee_name: "Lauren Pierce",      department: "Sales",       scheduled_date: iso(addDays(today, 27)), completed_date: null, status: "scheduled",   overall_rating: null, comp_adjustment_amount: null, comp_adjustment_percent: null, promotion: false },
  { id: "r-007", employee_uuid: "e-012", employee_name: "Diego Hernandez",    department: "Engineering", scheduled_date: iso(addMonths(today, 2)),completed_date: null, status: "scheduled",   overall_rating: null, comp_adjustment_amount: null, comp_adjustment_percent: null, promotion: false },
  // Completed this quarter
  { id: "r-101", employee_uuid: "e-020", employee_name: "Robert Chen",        department: "Engineering", scheduled_date: iso(subDays(today, 45)), completed_date: iso(subDays(today, 40)), status: "completed", overall_rating: "exceeds", comp_adjustment_amount: 10000, comp_adjustment_percent: 7.4, promotion: false },
  { id: "r-102", employee_uuid: "e-041", employee_name: "Michelle Torres",    department: "Operations",  scheduled_date: iso(subDays(today, 30)), completed_date: iso(subDays(today, 28)), status: "completed", overall_rating: "meets",   comp_adjustment_amount: 4000,  comp_adjustment_percent: 3.5, promotion: false },
  { id: "r-103", employee_uuid: "e-031", employee_name: "Thomas Reed",        department: "Sales",       scheduled_date: iso(subDays(today, 18)), completed_date: iso(subDays(today, 15)), status: "completed", overall_rating: "exceeds", comp_adjustment_amount: 12000, comp_adjustment_percent: 7.8, promotion: true },
  { id: "r-104", employee_uuid: "e-051", employee_name: "Karen Wallace",     department: "Finance",     scheduled_date: iso(subDays(today, 60)), completed_date: iso(subDays(today, 55)), status: "completed", overall_rating: "meets",   comp_adjustment_amount: 5000,  comp_adjustment_percent: 3.9, promotion: false },
  { id: "r-105", employee_uuid: "e-002", employee_name: "David Darmstandler",department: "Sr Leadership",scheduled_date: iso(subDays(today, 70)), completed_date: iso(subDays(today, 65)), status: "completed", overall_rating: "exceeds", comp_adjustment_amount: 15000, comp_adjustment_percent: 5.6, promotion: false },
];

export const mockActiveCycle = {
  id: "c-active-1",
  name: "Q2 2026 Company Reviews",
  starts_at: iso(subDays(today, 14)),
  ends_at: iso(addDays(today, 21)),
  review_types: ["self", "manager"] as const,
  total: 9,
  completed: 4,
};

export const mockGoalsCount = 17;
export const mockAssessedCount = { assessed: 6, total: mockEmployees.length };

export const ratingLabel: Record<NonNullable<MockReview["overall_rating"]>, string> = {
  exceeds: "Exceeds",
  meets: "Meets",
  below: "Below",
};

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function formatCompDelta(amount: number | null, pct: number | null) {
  if (amount == null) return "—";
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  const abs = Math.abs(amount);
  return `${sign}${formatCurrency(abs)}${pct != null ? ` (${sign}${Math.abs(pct).toFixed(1)}%)` : ""}`;
}