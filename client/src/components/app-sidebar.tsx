import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Target, ListChecks, Calendar,
  FileText, LayoutTemplate, Settings, LogOut, BarChart3, Sparkles, Users,
  FolderOpen, Users2,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const adminPerformanceNav = [
  { title: "KPI Builder", url: "/kpi-builder", icon: Sparkles },
  { title: "KPI Management", url: "/kpis", icon: Target },
  { title: "Action Tracker", url: "/actions", icon: ListChecks },
  { title: "Meetings", url: "/meetings", icon: Calendar },
];

const executivePerformanceNav = [
  { title: "KPI Management", url: "/kpis", icon: Target },
  { title: "Action Tracker", url: "/actions", icon: ListChecks },
];

const adminInsightsNav = [
  { title: "Monthly Reviews", url: "/reviews", icon: FileText },
  { title: "Dashboard Planner", url: "/planner", icon: LayoutTemplate },
];

const executiveInsightsNav = [
  { title: "Monthly Reviews", url: "/reviews", icon: FileText },
];

const executionNav = [
  { title: "Portfolio", url: "/portfolio", icon: FolderOpen },
  { title: "Workload", url: "/workload", icon: Users2 },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin, isExecutive } = useAuth();

  const renderGroup = (label: string, items: typeof mainNav) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild data-active={location === item.url || location.startsWith(item.url + "/")}>
                <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const performanceNav = isAdmin ? adminPerformanceNav : executivePerformanceNav;
  const insightsNav = isAdmin ? adminInsightsNav : executiveInsightsNav;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
            <BarChart3 className="h-[18px] w-[18px] text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight" data-testid="text-app-name">Performo AI</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Performance Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-1">
        {renderGroup("Overview", mainNav)}
        {renderGroup("Performance", performanceNav)}
        {renderGroup("Execution", executionNav)}
        {renderGroup("AI Insights", insightsNav)}
        {isAdmin && (
          <>
            {renderGroup("Admin", [
              { title: "User Management", url: "/users", icon: Users },
              { title: "Settings", url: "/settings", icon: Settings },
            ])}
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0">
              {user.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-user-name">{user.name}</p>
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1 py-0 h-3.5 ${isAdmin ? "border-blue-400 text-blue-600 dark:text-blue-400" : "border-amber-400 text-amber-600 dark:text-amber-400"}`}
                  data-testid="badge-user-role"
                >
                  {isAdmin ? "Admin" : "Executive"}
                </Badge>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={logout} className="h-8 w-8 shrink-0" data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
