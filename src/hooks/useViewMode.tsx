import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ViewMode = "employee" | "manager" | "admin";

export const viewModeLabels: Record<ViewMode, string> = {
  employee: "Employee view",
  manager: "Manager view",
  admin: "Admin view",
};

export const viewModeHints: Record<ViewMode, string> = {
  employee: "Only your own review, PDR and goals",
  manager: "The people you manage",
  admin: "Everything across the company",
};

type Ctx = {
  /** null means "not inside a provider" — no view restriction is applied. */
  mode: ViewMode | null;
  setMode: (mode: ViewMode) => void;
};

const ViewModeContext = createContext<Ctx>({ mode: null, setMode: () => {} });

const KEY = "datapath.viewMode";

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ViewMode>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    return stored === "employee" || stored === "manager" || stored === "admin" ? stored : "employee";
  });

  useEffect(() => {
    window.localStorage.setItem(KEY, mode);
  }, [mode]);

  const setMode = useCallback((next: ViewMode) => setModeState(next), []);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
