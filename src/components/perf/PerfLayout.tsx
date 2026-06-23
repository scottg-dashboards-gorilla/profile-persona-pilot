import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PerfSidebar } from "./PerfSidebar";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";

const pageTitles: Record<string, string> = {
  "/": "Overview",
  "/reviews": "Reviews",
  "/people": "People",
  "/cycles": "Cycles",
  "/goals": "Goals",
};

export default function PerfLayout() {
  const { pathname } = useLocation();
  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([k]) => k !== "/" && pathname.startsWith(k))?.[1] ??
    "Performance";

  return (
    <div className="perf-theme">
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background text-foreground">
          <PerfSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/80 backdrop-blur flex items-center gap-3 px-4">
              <SidebarTrigger />
              <h1 className="text-base font-semibold tracking-tight">{title}</h1>
              <div className="ml-auto flex items-center gap-3">
                <div className="relative hidden md:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search people, reviews…" className="pl-8 w-72 h-9" />
                </div>
                <button className="relative p-2 rounded-md hover:bg-muted" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  SG
                </div>
              </div>
            </header>
            <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}