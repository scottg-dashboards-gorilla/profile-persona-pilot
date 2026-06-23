import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLES as DEFAULT_ROLES, RoleConfig, RoleId, DEFAULT_ROLE } from "@/data/roles";

export interface StoredRoleConfig extends RoleConfig {
  sort_order: number;
  is_active: boolean;
}

const QUERY_KEY = ["role_configs"];

function rowToConfig(row: any): StoredRoleConfig {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    dimensions: Array.isArray(row.dimension_ids) ? row.dimension_ids : [],
    includesTechnical: !!row.includes_technical,
    sort_order: row.sort_order ?? 100,
    is_active: row.is_active !== false,
  };
}

/** Fallback list used during first paint / when DB is unreachable. */
const fallback: StoredRoleConfig[] = DEFAULT_ROLES.map((r, i) => ({
  ...r,
  sort_order: (i + 1) * 10,
  is_active: true,
}));

export function useRoles(opts: { includeInactive?: boolean } = {}) {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<StoredRoleConfig[]> => {
      const { data, error } = await supabase
        .from("role_configs")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToConfig);
    },
    staleTime: 60_000,
    placeholderData: fallback,
  });

  const all = query.data ?? fallback;
  const roles = opts.includeInactive ? all : all.filter((r) => r.is_active);
  return { ...query, roles };
}

export function getRoleFromList(
  list: StoredRoleConfig[],
  id: string | null | undefined
): StoredRoleConfig {
  return (
    list.find((r) => r.id === id) ??
    list.find((r) => r.id === DEFAULT_ROLE) ??
    list[0] ??
    fallback[0]
  );
}

export function useUpsertRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: StoredRoleConfig) => {
      const { error } = await supabase
        .from("role_configs")
        .upsert({
          id: role.id,
          label: role.label,
          description: role.description,
          dimension_ids: role.dimensions as any,
          includes_technical: role.includesTechnical,
          sort_order: role.sort_order,
          is_active: role.is_active,
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete so historic assessments still resolve a label.
      const { error } = await supabase
        .from("role_configs")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useReactivateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("role_configs")
        .update({ is_active: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export type { RoleId };