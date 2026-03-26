import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { AssistantDrawer } from "@/components/assistant-drawer";
import { NotificationBell } from "@/components/notification-bell";
import { AuthProvider, useAuth } from "@/lib/auth";
import { OwnerAuthProvider, useOwnerAuth } from "@/lib/owner-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

import KpiBuilderPage from "@/pages/kpi-builder";
import KpiManagementPage from "@/pages/kpi-management";
import ActionsPage from "@/pages/actions";
import ReviewsPage from "@/pages/reviews";
import PlannerPage from "@/pages/planner";
import SettingsPage from "@/pages/settings";
import UserManagementPage from "@/pages/user-management";
import PortfolioPage from "@/pages/portfolio";
import ProjectDetailPage from "@/pages/project-detail";
import WorkloadPage from "@/pages/workload";
import { Skeleton } from "@/components/ui/skeleton";

import AnalyticsStudioPage from "@/pages/analytics-studio";
import AnalyticsStudioNewPage from "@/pages/analytics-studio-new";
import AnalyticsStudioViewPage from "@/pages/analytics-studio-view";
import AnalyticsUploadPage from "@/pages/analytics-upload";
import AnalyticsConfigurePage from "@/pages/analytics-configure";
import AnalyticsExplorePage from "@/pages/analytics-explore";
import AnalyticsDashboardComposePage from "@/pages/analytics-dashboard-compose";

import GuidePage from "@/pages/guide";
import OwnerLogin from "@/pages/owner-login";
import OwnerDashboard from "@/pages/owner-dashboard";
import OwnerCompanies from "@/pages/owner-companies";
import OwnerKeys from "@/pages/owner-keys";
import OwnerActivity from "@/pages/owner-activity";
import OwnerAiUsage from "@/pages/owner-ai-usage";
import OwnerAudit from "@/pages/owner-audit";
import OwnerLogins from "@/pages/owner-logins";
import OwnerUsersPage from "@/pages/owner-users";
import OwnerFeatureUsage from "@/pages/owner-feature-usage";
import OwnerCompanyUsage from "@/pages/owner-company-usage";

function AppRouter() {
  const { isAdmin } = useAuth();
  return (
    <Switch>
      <Route path="/guide" component={GuidePage} />
      <Route path="/guide/" component={GuidePage} />
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/login" component={DashboardPage} />
      <Route path="/kpis" component={KpiManagementPage} />
      <Route path="/actions" component={ActionsPage} />
      <Route path="/reviews" component={ReviewsPage} />
      <Route path="/projects" component={PortfolioPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/initiatives" component={PortfolioPage} />
      <Route path="/projects/:id" component={ProjectDetailPage} />
      <Route path="/initiatives/:id" component={ProjectDetailPage} />
      <Route path="/workload" component={WorkloadPage} />
      <Route path="/analytics" component={AnalyticsStudioPage} />
      <Route path="/analytics/upload" component={AnalyticsUploadPage} />
      <Route path="/analytics/dashboards/new" component={AnalyticsDashboardComposePage} />
      <Route path="/analytics/dashboards/:id" component={AnalyticsDashboardComposePage} />
      <Route path="/analytics/datasets/:id/configure" component={AnalyticsConfigurePage} />
      <Route path="/analytics/datasets/:id/explore" component={AnalyticsExplorePage} />
      <Route path="/analytics/new" component={AnalyticsStudioNewPage} />
      <Route path="/analytics/:id" component={AnalyticsStudioViewPage} />
      {isAdmin && <Route path="/kpi-builder" component={KpiBuilderPage} />}
      {isAdmin && <Route path="/planner" component={PlannerPage} />}
      {isAdmin && <Route path="/settings" component={SettingsPage} />}
      {isAdmin && <Route path="/users" component={UserManagementPage} />}
      <Route component={DashboardPage} />
    </Switch>
  );
}

function AppLayout() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    if (user && location === "/login") {
      navigate("/");
    }
  }, [user, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    const path = location.replace(/\/+$/, "");
    if (path === "/login") return <AuthPage />;
    if (path === "/guide") return <GuidePage />;
    return <LandingPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1" />
            <GlobalSearch />
            <NotificationBell />
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 text-xs font-medium border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
              onClick={() => setAssistantOpen(true)}
              data-testid="button-open-assistant"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assistant</span>
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <AppRouter />
          </main>
        </div>
      </div>
      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </SidebarProvider>
  );
}

function OwnerArea() {
  const { owner, isLoading } = useOwnerAuth();
  const [location, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader />
      </div>
    );
  }

  if (location === "/owner/login" || !owner) {
    return <OwnerLogin />;
  }

  return (
    <Switch>
      <Route path="/owner/dashboard" component={OwnerDashboard} />
      <Route path="/owner/companies" component={OwnerCompanies} />
      <Route path="/owner/keys" component={OwnerKeys} />
      <Route path="/owner/activity" component={OwnerActivity} />
      <Route path="/owner/ai-usage" component={OwnerAiUsage} />
      <Route path="/owner/audit" component={OwnerAudit} />
      <Route path="/owner/logins" component={OwnerLogins} />
      <Route path="/owner/users" component={OwnerUsersPage} />
      <Route path="/owner/feature-usage" component={OwnerFeatureUsage} />
      <Route path="/owner/company-usage" component={OwnerCompanyUsage} />
      <Route component={OwnerDashboard} />
    </Switch>
  );
}

function Loader() {
  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      <div className="h-4 w-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
      Loading...
    </div>
  );
}

function RootRouter() {
  const [location] = useLocation();
  const isOwnerRoute = location.startsWith("/owner");

  if (isOwnerRoute) {
    return (
      <OwnerAuthProvider>
        <OwnerArea />
      </OwnerAuthProvider>
    );
  }

  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RootRouter />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
