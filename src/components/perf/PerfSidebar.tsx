import { NavLink, useLocation } from "react-router-dom";
import { Home, ClipboardCheck, Users, ListTodo, FileSpreadsheet, Settings, ShieldCheck, DollarSign, Scale, Network, History, UserSquare2, BookOpen, Building2, Workflow, Wallet, Lock, TrendingUp, CalendarRange } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePermissions, type PermissionArea } from "@/hooks/usePermissions";

type Item = {
  title: string;
  url: string;
  icon: typeof Home;
  /** Only shown when the signed-in person can reach this area. */
  area?: PermissionArea;
  /** Only shown to HR or admin. */
  adminOnly?: boolean;
  /** Only shown in the employee view. */
  employeeOnly?: boolean;
  /** Hidden in the employee view (shown in manager/admin views). */
  notInEmployeeView?: boolean;
};

type Group = { label: string; items: Item[] };

const groupsByMode: Record<"employee" | "manager" | "admin", Group[]> = {
  employee: [
    { label: "Start", items: [{ title: "Home", url: "/", icon: Home }, { title: "Review cycle", url: "/cycle", icon: CalendarRange }] },
    { label: "My work", items: [
      { title: "Objectives", url: "/pdr", icon: Workflow, area: "pdr" },
      { title: "Tasks", url: "/tasks", icon: ListTodo },
      { title: "My feedback", url: "/me", icon: UserSquare2, employeeOnly: true },
    ] },
    { label: "Help", items: [{ title: "Playbook", url: "/playbook", icon: BookOpen }] },
  ],
  manager: [
    { label: "Start", items: [{ title: "Home", url: "/", icon: Home }, { title: "Review cycle", url: "/cycle", icon: CalendarRange }] },
    { label: "Team work", items: [
      { title: "Objectives", url: "/pdr", icon: Workflow, area: "pdr" },
      { title: "Tasks", url: "/tasks", icon: ListTodo },
      { title: "Feedback & reviews", url: "/reviews", icon: ClipboardCheck, area: "reviews" },
      { title: "Team assessments", url: "/people", icon: Users, area: "reviews" },
      { title: "Improvement actions", url: "/improvement", icon: TrendingUp, area: "reviews" },
      { title: "Pay review", url: "/apr", icon: Wallet, area: "apr" },
    ] },
    { label: "People", items: [
      { title: "Org structure", url: "/org", icon: Network, area: "org" },
      { title: "Salary history", url: "/salary-history", icon: Lock, area: "salary" },
    ] },
    { label: "Help", items: [{ title: "Playbook", url: "/playbook", icon: BookOpen }] },
  ],
  admin: [
    { label: "Start", items: [{ title: "Home", url: "/", icon: Home }, { title: "Review cycle", url: "/cycle", icon: CalendarRange }] },
    { label: "Review cycle", items: [
      { title: "Objectives", url: "/pdr", icon: Workflow, area: "pdr" },
      { title: "Feedback & reviews", url: "/reviews", icon: ClipboardCheck, area: "reviews" },
      { title: "Assessments", url: "/assessments", icon: FileSpreadsheet, adminOnly: true },
      { title: "Improvement actions", url: "/improvement", icon: TrendingUp, area: "reviews" },
      { title: "Pay review", url: "/apr", icon: Wallet, area: "apr" },
      { title: "Calibration", url: "/calibration", icon: Scale, area: "calibration" },
    ] },
    { label: "People & pay", items: [
      { title: "Org structure", url: "/org", icon: Network, area: "org" },
      { title: "Company performance", url: "/company", icon: Building2, area: "company" },
      { title: "Salary updates", url: "/compensation", icon: DollarSign, area: "compensation" },
      { title: "Salary history", url: "/salary-history", icon: Lock, area: "salary" },
    ] },
    { label: "Administration", items: [
      { title: "Admin panel", url: "/admin/panel", icon: ShieldCheck, adminOnly: true },
      { title: "Assessment roles", url: "/admin/roles", icon: Settings, adminOnly: true },
      { title: "Access", url: "/admin/access", icon: ShieldCheck, adminOnly: true },
      { title: "Audit log", url: "/admin/audit", icon: History, area: "audit" },
    ] },
    { label: "Help", items: [{ title: "Playbook", url: "/playbook", icon: BookOpen }] },
  ],
};


export function PerfSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { can, has, unconfigured, loading, viewMode: mode } = usePermissions();
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const visible = (item: Item) => {
    if (loading || unconfigured) return true;
    if (item.adminOnly && !(has("admin") || has("hr"))) return false;
    if (item.area && !can(item.area)) return false;
    if (item.employeeOnly && (mode === "manager" || mode === "admin")) return false;
    if (item.notInEmployeeView && mode === "employee") return false;
    return true;
  };

  const groups = groupsByMode[mode].map((group) => ({ ...group, items: group.items.filter(visible) }));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(239 84% 60%), hsl(258 80% 60%))" }}
          >
            D
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Datapath</span>
              <span className="text-xs text-muted-foreground">Performance</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => group.items.length > 0 && (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} data-tour={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
