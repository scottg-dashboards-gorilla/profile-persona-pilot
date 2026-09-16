import { Outlet, useLocation, Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PerfSidebar } from "./PerfSidebar";
import { Search, Bell, Loader2, LogOut, UserSquare2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ViewModeProvider } from "@/hooks/useViewMode";
import { ViewModeBadge, ViewModeMenuSection } from "./ViewModeSwitcher";

const pageTitles: Record<string, string> = {
  "/": "Overview",
  "/reviews": "Reviews",
  "/people": "People",
  "/cycles": "Cycles",
  "/tasks": "Task Tracker",
  "/me": "My review",
  "/compensation": "Compensation & Raises",
  "/calibration": "Reviewer Calibration",
  "/org": "Org Rollups",
  "/admin/audit": "Audit Log",
};

export default function PerfLayout() {
  const { pathname } = useLocation();
  const { session, loading, signOut } = useAuth();
  const [me, setMe] = useState<{ first_name: string; last_name: string; title: string | null } | null>(
    null,
  );

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setMe(null);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("first_name, last_name, title")
        .eq("user_id", userId)
        .maybeSingle();
      if (active) setMe(data ?? null);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const title =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(([k]) => k !== "/" && pathname.startsWith(k))?.[1] ??
    "Performance";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  const email = session.user.email ?? "";
  const displayName = me ? `${me.first_name} ${me.last_name}` : email;
  const initials = me
    ? `${me.first_name[0] ?? ""}${me.last_name[0] ?? ""}`.toUpperCase()
    : (email[0] ?? "?").toUpperCase();

  return (
    <div className="perf-theme">
      <ViewModeProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background text-foreground">
          <PerfSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/80 backdrop-blur flex items-center gap-3 px-4">
              <SidebarTrigger />
              <h1 className="text-base font-semibold tracking-tight">{title}</h1>
              <div className="ml-auto flex items-center gap-3">
                <ViewModeBadge />
                <div className="relative hidden md:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search people, reviews…" className="pl-8 w-72 h-9" />
                </div>
                <button className="relative p-2 rounded-md hover:bg-muted" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold"
                      aria-label="Your account"
                    >
                      {initials}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="space-y-0.5">
                      <div className="text-sm font-medium leading-tight">{displayName}</div>
                      <div className="text-xs font-normal text-muted-foreground">{email}</div>
                      {me?.title && (
                        <div className="text-xs font-normal text-muted-foreground">{me.title}</div>
                      )}
                      {!me && (
                        <div className="text-xs font-normal text-amber-600">
                          Not linked to a staff record yet
                        </div>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ViewModeMenuSection />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/me" className="flex items-center gap-2">
                        <UserSquare2 className="h-4 w-4" /> My review
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
      </ViewModeProvider>
    </div>
  );
}
