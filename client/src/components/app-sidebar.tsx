import { useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import {
  BarChart3, LogOut, Activity, ChevronDown,
  Clock, Users, Settings, type LucideIcon,
  Home, LayoutDashboard, Lightbulb, Database, Upload,
  Target, Building2, MapPin,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const planBadgeClass: Record<string, string> = {
  Trial: "border-gray-400 text-gray-500 dark:text-gray-400",
  Starter: "border-blue-400 text-blue-600 dark:text-blue-400",
  Growth: "border-emerald-400 text-emerald-600 dark:text-emerald-400",
  Enterprise: "border-purple-400 text-purple-600 dark:text-purple-400",
};

type SubItem = { title: string; href: string; icon: LucideIcon; testId?: string };

function ModuleItem({
  icon: Icon,
  label,
  isActive,
  isExpanded,
  onToggle,
  href,
  testId,
  accentColor,
  subItems,
  location,
  search,
}: {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  href: string;
  testId?: string;
  accentColor: string;
  subItems: SubItem[];
  location: string;
  search: string;
}) {
  return (
    <div>
      {/* Parent row */}
      <Link href={href}>
        <button
          onClick={onToggle}
          data-testid={testId}
          id={testId}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group",
            isActive
              ? `${accentColor} shadow-sm`
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0", isActive ? "" : "text-muted-foreground group-hover:text-foreground")} />
          <span className="flex-1 truncate text-left">{label}</span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200 opacity-50",
            isExpanded ? "rotate-0" : "-rotate-90"
          )} />
        </button>
      </Link>

      {/* Sub-items */}
      {isExpanded && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-border/60 space-y-0.5 pb-1">
          {subItems.map(item => {
            const currentTab = new URLSearchParams(search).get("tab") || "home";
            const subItemActive = (() => {
              if (item.href.includes("?tab=")) {
                const tab = item.href.split("?tab=")[1];
                return location === "/analytics" && currentTab === tab;
              }
              if (item.href === "/analytics") {
                return location === "/analytics" && !search;
              }
              return location === item.href || location.startsWith(item.href + "/");
            })();

            return (
              <Link key={item.href} href={item.href}>
                <button
                  data-testid={item.testId}
                  id={item.testId}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group text-left",
                    subItemActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 font-medium"
                  )}
                >
                  <item.icon className={cn("h-3.5 w-3.5 shrink-0", subItemActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground")} />
                  <span className="flex-1 truncate">{item.title}</span>
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppSidebar({ onStartTour }: { onStartTour?: () => void }) {
  const [location] = useLocation();
  const search = useSearch();
  const { user, logout, isAdmin, isExecutive } = useAuth();

  const isOnAnalytics = location === "/analytics" || location.startsWith("/analytics");
  const isOnScorecard = location === "/scorecard" || location.startsWith("/scorecard");

  const [analyticsOpen, setAnalyticsOpen] = useState(isOnAnalytics);
  const [scorecardOpen, setScorecardOpen] = useState(isOnScorecard);

  const { data: sub } = useQuery<any>({ queryKey: ["/api/subscription"], enabled: !!user });
  const planName: string = sub?.planName || "Trial";

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["/api/scorecard/departments"],
    enabled: !!user,
  });

  const trialDaysLeft = (() => {
    if (planName !== "Trial") return null;
    const start = sub?.trialStartDate ? new Date(sub.trialStartDate).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsed);
  })();

  const analyticsSubItems: SubItem[] = [
    { title: "Home", href: "/analytics", icon: Home, testId: "link-nav-analytics-home" },
    { title: "Dashboards", href: "/analytics?tab=dashboards", icon: LayoutDashboard, testId: "link-nav-analytics-dashboards" },
    { title: "Insights", href: "/analytics?tab=insights", icon: Lightbulb, testId: "link-nav-analytics-insights" },
    { title: "Datasets", href: "/analytics?tab=datasets", icon: Database, testId: "link-nav-analytics-datasets" },
    { title: "Upload Data", href: "/analytics/upload", icon: Upload, testId: "link-nav-analytics-upload" },
  ];

  const scorecardSubItems: SubItem[] = [
    { title: "Overview", href: "/scorecard", icon: Target, testId: "link-nav-scorecard-overview" },
    ...departments.map((d: any) => ({
      title: d.name,
      href: `/scorecard/department/${d.deptId}`,
      icon: Building2,
      testId: `link-nav-scorecard-dept-${d.deptId}`,
    })),
  ];

  const isActive = (url: string) =>
    url === "/" ? location === "/" : location === url || location.startsWith(url + "/");

  return (
    <Sidebar>
      {/* ── Brand Header ── */}
      <SidebarHeader className="p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-9 w-9 rounded-xl object-cover shrink-0 shadow-md" />
          <div>
            <h2 className="text-sm font-bold tracking-tight" data-testid="text-app-name">GHC Beacon</h2>
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Analytics Platform</p>
          </div>
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="space-y-0.5">

              {/* Analytics Studio module */}
              <ModuleItem
                icon={BarChart3}
                label="Analytics Studio"
                isActive={isOnAnalytics}
                isExpanded={analyticsOpen || isOnAnalytics}
                onToggle={() => setAnalyticsOpen(v => !v)}
                href="/analytics"
                testId="link-nav-analytics-studio"
                accentColor="bg-primary/10 text-primary"
                subItems={analyticsSubItems}
                location={location}
                search={search}
              />

              {/* Balanced Scorecard module */}
              <ModuleItem
                icon={Activity}
                label="Balanced Scorecard"
                isActive={isOnScorecard}
                isExpanded={scorecardOpen || isOnScorecard}
                onToggle={() => setScorecardOpen(v => !v)}
                href="/scorecard"
                testId="link-nav-balanced-scorecard"
                accentColor="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                subItems={scorecardSubItems}
                location={location}
                search={search}
              />

            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section */}
        {isAdmin && (
          <SidebarGroup className="mt-2">
            <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/40 px-3 mb-1">Admin</p>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {[
                  { title: "People", url: "/users", icon: Users },
                  { title: "Settings", url: "/settings", icon: Settings },
                ].map(item => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild data-active={active}>
                        <Link
                          href={item.url}
                          data-testid={`link-nav-${item.title.toLowerCase()}`}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                          <span className="flex-1 truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ── User Footer ── */}
      <SidebarFooter className="p-3">
        {onStartTour && (
          <button
            onClick={onStartTour}
            className="flex items-center gap-2 w-full px-2 py-1.5 mb-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors group"
            data-testid="button-start-tour"
          >
            <MapPin className="h-3 w-3 text-primary/70 group-hover:text-primary transition-colors" />
            <span>Take the guided tour</span>
          </button>
        )}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
        {user && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-bold text-primary shrink-0 border border-primary/20">
              {user.name.split(" ").map((n: string) => n[0]).join("")}
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
