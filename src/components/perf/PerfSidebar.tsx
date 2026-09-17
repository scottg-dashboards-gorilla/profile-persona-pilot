import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardCheck, Users, CalendarRange, Target, ListTodo, FileSpreadsheet, Settings, ShieldCheck, DollarSign, Scale, Network, History, UserSquare2, BookOpen, Building2, Workflow, Wallet, Lock } from "lucide-react";
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
import { useViewMode } from "@/hooks/useViewMode";

type Item = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  /** Only shown when the signed-in person can reach this area. */
  area?: PermissionArea;
  /** Only shown to HR or admin. */
  adminOnly?: boolean;
  /** Only shown in the employee view. */
  employeeOnly?: boolean;
};

const primary: Item[] = [
  { title: "Overview", url: "/", icon: LayoutDashboard, area: "overview" },
  { title: "Objective setting", url: "/pdr", icon: Workflow, area: "pdr" },
  { title: "Pay review cycle", url: "/apr", icon: Wallet, area: "apr" },
  { title: "Reviews", url: "/reviews", icon: ClipboardCheck, area: "reviews" },
  { title: "Team's Assessment", url: "/people", icon: Users, area: "reviews" },
  { title: "Task Tracker", url: "/tasks", icon: ListTodo },
  { title: "My review", url: "/me", icon: UserSquare2, employeeOnly: true },
  { title: "Company performance", url: "/company", icon: Building2, area: "company" },
  { title: "Compensation", url: "/compensation", icon: DollarSign, area: "compensation" },
  { title: "Salary history", url: "/salary-history", icon: Lock, area: "salary" },
  { title: "Calibration", url: "/calibration", icon: Scale, area: "calibration" },
  { title: "Org rollups", url: "/org", icon: Network, area: "org" },
];

const secondary: Item[] = [
  { title: "Playbook", url: "/playbook", icon: BookOpen },
  { title: "Assessments", url: "/assessments", icon: FileSpreadsheet, adminOnly: true },
  { title: "Role Configs", url: "/admin/roles", icon: Settings, adminOnly: true },
  { title: "Access", url: "/admin/access", icon: ShieldCheck, adminOnly: true },
  { title: "Audit log", url: "/admin/audit", icon: History, area: "audit" },
];


export function PerfSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { can, has, unconfigured, loading } = usePermissions();
  const { mode } = useViewMode();
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const visible = (item: Item) => {
    if (loading || unconfigured) return true;
    if (item.adminOnly && !(has("admin") || has("hr"))) return false;
    if (item.area && !can(item.area)) return false;
    if (item.employeeOnly && (mode === "manager" || mode === "admin")) return false;
    return true;
  };

  const primaryItems = primary.filter(visible);
  const secondaryItems = secondary.filter(visible);

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
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === "/"} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
