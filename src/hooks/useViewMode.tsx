import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ViewMode = "employee" | "manager" | "admin";

export const viewModeLabels: Record<ViewMode, string> = {
  employee: "Employee view",
  manager: "Manager view",
  admin: "Admin view",
};

export const viewModeHints: Record<ViewMode, string> = {
  employee: "Only your own review, objectives and tasks",
  manager: "The people you manage",
  admin: "Everything across the company",
};

type Ctx = {
  /** null means no explicit choice yet — the highest view the person has is used. */
  mode: ViewMode | null;
  /** True when a provider is present. */
  ready?: boolean;
  setMode: (mode: ViewMode) => void;
};

const ViewModeContext = createContext<Ctx>({ mode: null, ready: false, setMode: () => {} });

const KEY = "datapath.viewMode";

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode | null>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    return stored === "employee" || stored === "manager" || stored === "admin" ? stored : null;
  });

  useEffect(() => {
    if (mode) window.localStorage.setItem(KEY, mode);
  }, [mode]);

  const setMode = useCallback((next: ViewMode) => setModeState(next), []);
  const value = useMemo(() => ({ mode, ready: true, setMode }), [mode, setMode]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
