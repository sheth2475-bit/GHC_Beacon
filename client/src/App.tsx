import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { AssistantDrawer } from "@/components/assistant-drawer";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

import KpiBuilderPage from "@/pages/kpi-builder";
import KpiManagementPage from "@/pages/kpi-management";
import ActionsPage from "@/pages/actions";
import MeetingsPage from "@/pages/meetings";
import ReviewsPage from "@/pages/reviews";
import PlannerPage from "@/pages/planner";
import SettingsPage from "@/pages/settings";
import UserManagementPage from "@/pages/user-management";
import PortfolioPage from "@/pages/portfolio";
import ProjectDetailPage from "@/pages/project-detail";
import WorkloadPage from "@/pages/workload";
import { Skeleton } from "@/components/ui/skeleton";

function Router() {
  const { isAdmin } = useAuth();
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/kpis" component={KpiManagementPage} />
      <Route path="/actions" component={ActionsPage} />
      <Route path="/reviews" component={ReviewsPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/projects/:id" component={ProjectDetailPage} />
      <Route path="/workload" component={WorkloadPage} />
      {isAdmin && <Route path="/kpi-builder" component={KpiBuilderPage} />}
      {isAdmin && <Route path="/meetings" component={MeetingsPage} />}
      {isAdmin && <Route path="/planner" component={PlannerPage} />}
      {isAdmin && <Route path="/settings" component={SettingsPage} />}
      {isAdmin && <Route path="/users" component={UserManagementPage} />}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { user, isLoading } = useAuth();
  const [assistantOpen, setAssistantOpen] = useState(false);

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
    return <AuthPage />;
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
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
