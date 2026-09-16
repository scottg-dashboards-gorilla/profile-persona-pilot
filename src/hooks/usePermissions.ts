import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "hr" | "manager";

/** Feature areas that can be gated by role. */
export type PermissionArea =
  | "reviews"
  | "cycles"
  | "compensation"
  | "calibration"
  | "org"
  | "audit"
  | "company"
  | "pdr"
  | "apr"
  | "overview"
  | "salary";

const AREA_ROLES: Record<PermissionArea, AppRole[]> = {
  reviews: ["admin", "hr", "manager"],
  cycles: ["admin", "hr"],
  compensation: ["admin", "hr"],
  calibration: ["admin", "hr"],
  org: ["admin", "hr", "manager"],
  audit: ["admin", "hr"],
  company: ["admin", "hr"],
  pdr: ["admin", "hr", "manager"],
  apr: ["admin", "hr", "manager"],
  overview: ["admin"],
  salary: ["admin", "manager"],
};

export const areaLabels: Record<PermissionArea, string> = {
  reviews: "Reviews",
  cycles: "Cycles",
  compensation: "Compensation & Raises",
  calibration: "Calibration",
  org: "Org rollups",
  audit: "Audit log",
  company: "Company performance",
  pdr: "Development reviews (PDR)",
  apr: "Pay review cycle",
  overview: "Overview",
  salary: "Salary history",
};

/** Areas any signed-in person can open; the rows they see are scoped by database rules. */
const OPEN_AREAS: PermissionArea[] = ["pdr"];

export function rolesForArea(area: PermissionArea) {
  return AREA_ROLES[area];
}

type State = {
  loading: boolean;
  userId: string | null;
  roles: AppRole[];
  /** True while nobody has been granted a role yet — access stays open so the first admin can bootstrap. */
  unconfigured: boolean;
};

export function usePermissions() {
  const [state, setState] = useState<State>({
    loading: true,
    userId: null,
    roles: [],
    unconfigured: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [mine, configured] = await Promise.all([
        user
          ? supabase.from("user_roles").select("role").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { role: AppRole }[] }),
        // Asks the database directly — a signed-in person without a role cannot
        // see other people's role rows, so counting them client-side wrongly
        // looked like "nobody has roles yet" and opened up every page.
        supabase.rpc("roles_configured"),
      ]);

      if (!active) return;
      setState({
        loading: false,
        userId: user?.id ?? null,
        roles: ((mine.data ?? []) as { role: AppRole }[]).map((r) => r.role),
        unconfigured: configured.data === false,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  const has = (role: AppRole) => state.roles.includes(role);

  const can = (area: PermissionArea) => {
    if (state.unconfigured) return true;
    // Development reviews are open to every signed-in person: employees reach
    // their own PDR, managers their team's, admins/HR everyone's (enforced in the database).
    if (OPEN_AREAS.includes(area)) return !!state.userId;
    return AREA_ROLES[area].some((r) => state.roles.includes(r));
  };

  return { ...state, has, can };
}
