import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "hr" | "manager";

/** Feature areas that can be gated by role. */
export type PermissionArea = "reviews" | "cycles" | "compensation" | "calibration" | "org" | "audit";

const AREA_ROLES: Record<PermissionArea, AppRole[]> = {
  reviews: ["admin", "hr", "manager"],
  cycles: ["admin", "hr"],
  compensation: ["admin", "hr"],
  calibration: ["admin", "hr"],
  org: ["admin", "hr", "manager"],
  audit: ["admin", "hr"],
};

export const areaLabels: Record<PermissionArea, string> = {
  reviews: "Reviews",
  cycles: "Cycles",
  compensation: "Compensation & Raises",
  calibration: "Calibration",
  org: "Org rollups",
  audit: "Audit log",
};

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

      const [mine, any] = await Promise.all([
        user
          ? supabase.from("user_roles").select("role").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { role: AppRole }[] }),
        supabase.from("user_roles").select("id").limit(1),
      ]);

      if (!active) return;
      setState({
        loading: false,
        userId: user?.id ?? null,
        roles: ((mine.data ?? []) as { role: AppRole }[]).map((r) => r.role),
        unconfigured: ((any.data ?? []) as unknown[]).length === 0,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  const has = (role: AppRole) => state.roles.includes(role);

  const can = (area: PermissionArea) => {
    if (state.unconfigured) return true;
    return AREA_ROLES[area].some((r) => state.roles.includes(r));
  };

  return { ...state, has, can };
}
