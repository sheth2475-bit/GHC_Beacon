import { useLocation, Link } from "wouter";
import {
  BarChart3, LogOut, Activity, ChevronRight, ChevronDown,
  Clock, Users, Settings, type LucideIcon,
  Home, LayoutDashboard, Lightbulb, Database, Upload,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const analyticsSubNav = [
  { title: "Home", tab: "home", icon: Home },
  { title: "Dashboards", tab: "dashboards", icon: LayoutDashboard },
  { title: "Insights", tab: "insights", icon: Lightbulb },
  { title: "Datasets", tab: "datasets", icon: Database },
  { title: "Upload Data", tab: "upload", icon: Upload },
];

const planBadgeClass: Record<string, string> = {
  Trial: "border-gray-400 text-gray-500 dark:text-gray-400",
  Starter: "border-blue-400 text-blue-600 dark:text-blue-400",
  Growth: "border-emerald-400 text-emerald-600 dark:text-emerald-400",
  Enterprise: "border-purple-400 text-purple-600 dark:text-purple-400",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin, isExecutive } = useAuth();

  const { data: sub } = useQuery<any>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });
  const planName: string = sub?.planName || "Trial";

  const trialDaysLeft = (() => {
    if (planName !== "Trial") return null;
    const start = sub?.trialStartDate
      ? new Date(sub.trialStartDate).getTime()
      : Date.now();
    const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsed);
  })();

  const isOnAnalytics = location === "/analytics" || location.startsWith("/analytics");

  const isActive = (url: string) =>
    url === "/" ? location === "/" : location === url || location.startsWith(url + "/");

  const activeTab = (() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("tab") || "home";
    }
    return "home";
  })();

  const renderGroup = (label: string, items: { title: string; url: string; icon: LucideIcon }[]) => (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50 px-3 mb-0.5">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild data-active={active}>
                  <Link
                    href={item.url}
                    data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                    <span className="flex-1 truncate">{item.title}</span>
                    {active && <ChevronRight className="h-3 w-3 opacity-60 shrink-0" />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar>
      {/* ── Brand Header ── */}
      <SidebarHeader className="p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/ghc-beacon-logo.jpg"
            alt="GHC Beacon"
            className="h-9 w-9 rounded-xl object-cover shrink-0 shadow-md"
          />
          <div>
            <h2 className="text-sm font-bold tracking-tight" data-testid="text-app-name">GHC Beacon</h2>
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Analytics Platform</p>
          </div>
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="px-2 py-1 gap-0">
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50 px-3 mb-0.5">Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">

              {/* Analytics Studio — parent item */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isOnAnalytics && !location.startsWith("/analytics/")}>
                  <Link
                    href="/analytics"
                    data-testid="link-nav-analytics-studio"
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                      isOnAnalytics
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <BarChart3 className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">Analytics Studio</span>
                    {isOnAnalytics
                      ? <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                      : <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Sub-items — shown only when on analytics pages */}
              {isOnAnalytics && analyticsSubNav.map(sub => {
                const href = sub.tab === "upload" ? "/analytics/upload" : `/analytics?tab=${sub.tab}`;
                const subActive = sub.tab === "upload"
                  ? location.startsWith("/analytics/upload")
                  : isOnAnalytics && !location.startsWith("/analytics/") && activeTab === sub.tab;
                return (
                  <SidebarMenuItem key={sub.tab}>
                    <SidebarMenuButton asChild data-active={subActive}>
                      <Link
                        href={href}
                        data-testid={`link-nav-analytics-${sub.tab}`}
                        className={cn(
                          "flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-lg text-sm transition-all duration-150 group",
                          subActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent font-medium"
                        )}
                      >
                        <sub.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">{sub.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Balanced Scorecard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/scorecard")}>
                  <Link
                    href="/scorecard"
                    data-testid="link-nav-balanced-scorecard"
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                      isActive("/scorecard")
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <Activity className={`h-4 w-4 shrink-0 ${isActive("/scorecard") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                    <span className="flex-1 truncate">Balanced Scorecard</span>
                    {isActive("/scorecard") && <ChevronRight className="h-3 w-3 opacity-60 shrink-0" />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && renderGroup("Admin", [
          { title: "People", url: "/users", icon: Users },
          { title: "Settings", url: "/settings", icon: Settings },
        ])}
      </SidebarContent>

      {/* ── User Footer ── */}
      <SidebarFooter className="p-3">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
        {user && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-bold text-primary shrink-0 border border-primary/20">
              {user.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight" data-testid="text-user-name">{user.name}</p>
              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-3.5 ${isAdmin ? "border-blue-400/60 text-blue-600 dark:text-blue-400" : "border-amber-400/60 text-amber-600 dark:text-amber-400"}`}
                  data-testid="badge-user-role"
                >
                  {isAdmin ? "Admin" : isExecutive ? "Executive" : "Member"}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-3.5 ${planBadgeClass[planName] || planBadgeClass.Trial}`}
                  data-testid="badge-plan-name"
                >
                  {planName}
                </Badge>
                {trialDaysLeft !== null && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-3.5 flex items-center gap-0.5 ${trialDaysLeft <= 7 ? "border-red-400/60 text-red-500" : "border-amber-400/60 text-amber-600 dark:text-amber-400"}`}
                    data-testid="badge-trial-days"
                  >
                    <Clock className="h-2 w-2" />
                    {trialDaysLeft}d left
                  </Badge>
                )}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={logout} className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" data-testid="button-logout">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
