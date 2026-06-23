import { dimensions } from "./dimensions";

export type RoleId =
  | "technical"
  | "team-leader-nontech"
  | "sales"
  | "marketing"
  | "finance"
  | "hr"
  | "operations"
  | "other";

export interface RoleConfig {
  id: RoleId;
  label: string;
  description: string;
  /** Whitelist of dimension IDs included for this role. */
  dimensions: string[];
  /** Whether this role takes technical questions (affects tier classification). */
  includesTechnical: boolean;
}

// Behavioral / cross-functional dimensions everyone takes
const UNIVERSAL_DIMS = [
  "disc-dominance",
  "disc-influence",
  "disc-steadiness",
  "disc-conscientiousness",
  "coaching-preferences",
  "self-assessment",
];

const TECHNICAL_DIMS = [
  "azure-cloud",
  "m365-admin",
  "security-compliance",
  "network-infrastructure",
  "comptia-fundamentals",
  "comptia-data",
  "comptia-cyberops",
];

const ALL_DIMS = dimensions.map((d) => d.id);

export const ROLES: RoleConfig[] = [
  {
    id: "technical",
    label: "Technical / Engineer / IT",
    description: "Full technical battery — Azure, M365, security, networking, CompTIA",
    dimensions: ALL_DIMS,
    includesTechnical: true,
  },
  {
    id: "team-leader-nontech",
    label: "Team Leader (non-technical)",
    description: "Leadership, behavioral, and culture — no technical questions",
    dimensions: [
      "leadership-example",
      "adaptability-dynamics",
      "problem-solving",
      "culture-communication",
      ...UNIVERSAL_DIMS,
    ],
    includesTechnical: false,
  },
  {
    id: "sales",
    label: "Sales",
    description: "DISC, communication, adaptability, coaching preferences",
    dimensions: [
      "adaptability-dynamics",
      "culture-communication",
      ...UNIVERSAL_DIMS,
    ],
    includesTechnical: false,
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "DISC, communication, adaptability, coaching preferences",
    dimensions: [
      "adaptability-dynamics",
      "culture-communication",
      ...UNIVERSAL_DIMS,
    ],
    includesTechnical: false,
  },
  {
    id: "finance",
    label: "Finance / Accounting",
    description: "DISC, communication, problem solving, coaching preferences",
    dimensions: [
      "problem-solving",
      "culture-communication",
      ...UNIVERSAL_DIMS,
    ],
    includesTechnical: false,
  },
  {
    id: "hr",
    label: "HR / People Ops",
    description: "DISC, leadership, communication, coaching preferences",
    dimensions: [
      "leadership-example",
      "culture-communication",
      ...UNIVERSAL_DIMS,
    ],
    includesTechnical: false,
  },
  {
    id: "operations",
    label: "Operations / Admin",
    description: "DISC, adaptability, communication, coaching preferences",
    dimensions: [
      "adaptability-dynamics",
      "culture-communication",
      ...UNIVERSAL_DIMS,
    ],
    includesTechnical: false,
  },
  {
    id: "other",
    label: "Other / General",
    description: "Shortest path — DISC and coaching preferences only",
    dimensions: UNIVERSAL_DIMS,
    includesTechnical: false,
  },
];

export const DEFAULT_ROLE: RoleId = "technical";

export function getRole(roleId: RoleId | string | null | undefined): RoleConfig {
  return ROLES.find((r) => r.id === roleId) ?? ROLES[0];
}

export function getDimensionsForRole(roleId: RoleId | string | null | undefined): string[] {
  return getRole(roleId).dimensions;
}

export function roleIncludesTechnical(roleId: RoleId | string | null | undefined): boolean {
  return getRole(roleId).includesTechnical;
}