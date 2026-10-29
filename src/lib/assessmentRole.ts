import { dimensions } from "@/data/dimensions";

/** A nontechnical profile must not admit technical dimensions, even in stored overrides. */
export function assessmentDimensions(ids: string[], includesTechnical: boolean) {
  const technical = new Set(dimensions.filter(d => d.category === "comptia" ||
    ["azure-cloud", "m365-admin", "security-compliance", "network-infrastructure"].includes(d.id)).map(d => d.id));
  return includesTechnical ? ids : ids.filter(id => !technical.has(id));
}