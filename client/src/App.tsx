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
import { GuidedTour, useTourDone } from "@/components/guided-tour";
import { AuthProvider, useAuth } from "@/lib/auth";
import { OwnerAuthProvider, useOwnerAuth } from "@/lib/owner-auth";
import AuthPage from "@/pages/auth";
import LandingPage from "@/pages/landing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ExecutiveHomePage from "@/pages/executive-home";

import UserManagementPage from "@/pages/user-management";
import SettingsPage from "@/pages/settings";
import { Skeleton } from "@/components/ui/skeleton";

import AnalyticsStudioPage from "@/pages/analytics-studio";
import AnalyticsStudioNewPage from "@/pages/analytics-studio-new";
import AnalyticsStudioViewPage from "@/pages/analytics-studio-view";
import AnalyticsUploadPage from "@/pages/analytics-upload";
import AnalyticsConfigurePage from "@/pages/analytics-configure";
import AnalyticsExplorePage from "@/pages/analytics-explore";
import AnalyticsDashboardComposePage from "@/pages/analytics-dashboard-compose";

import GuidePage from "@/pages/guide";
import DemoPage from "@/pages/demo";
import ScorecardPage from "@/pages/scorecard";
import PublicDashboardPage from "@/pages/public-dashboard";
import PublicScorecardPage from "@/pages/public-scorecard";
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

function ForcePasswordChangeModal() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    if (next.length < 6) {
      toast({ title: "Password too short", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiRequest("POST", "/api/auth/change-password", { currentPassword: current, newPassword: next });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Password updated", description: "You can now access the platform." });
    } catch (err: any) {
      toast({ title: "Failed to change password", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-blue-500 px-8 py-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-4">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Set your password</h2>
          <p className="text-sm text-blue-100 mt-1">You must create a new password before accessing the platform.</p>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fc-current">Temporary Password</Label>
            <div className="relative">
              <Input
                id="fc-current"
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="Enter the password from your email"
                required
                className="pr-9"
                data-testid="input-fc-current"
              />
              <button type="button" tabIndex={-1} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrent(v => !v)}>
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fc-new">New Password</Label>
            <div className="relative">
              <Input
                id="fc-new"
                type={showNext ? "text" : "password"}
                value={next}
                onChange={e => setNext(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="pr-9"
                data-testid="input-fc-new"
              />
              <button type="button" tabIndex={-1} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNext(v => !v)}>
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fc-confirm">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="fc-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="pr-9"
                data-testid="input-fc-confirm"
              />
              <button type="button" tabIndex={-1} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full mt-2" disabled={saving || !current || !next || !confirm} data-testid="button-fc-submit">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            {saving ? "Saving…" : "Set Password & Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function AppRouter() {
  const { isAdmin } = useAuth();
  return (
    <Switch>
      <Route path="/guide" component={GuidePage} />
      <Route path="/guide/" component={GuidePage} />
      <Route path="/" component={ExecutiveHomePage} />
      <Route path="/analytics" component={AnalyticsStudioPage} />
      <Route path="/analytics/upload" component={AnalyticsUploadPage} />
      <Route path="/analytics/dashboards/new" component={AnalyticsDashboardComposePage} />
      <Route path="/analytics/dashboards/:id" component={AnalyticsDashboardComposePage} />
      <Route path="/analytics/datasets/:id/configure" component={AnalyticsConfigurePage} />
      <Route path="/analytics/datasets/:id/explore" component={AnalyticsExplorePage} />
      <Route path="/analytics/new" component={AnalyticsStudioNewPage} />
      <Route path="/analytics/:id" component={AnalyticsStudioViewPage} />
      <Route path="/scorecard" component={ScorecardPage} />
      <Route path="/scorecard/department/:id" component={ScorecardPage} />
      <Route path="/scorecard/kpi/:id" component={ScorecardPage} />
      {isAdmin && <Route path="/users" component={UserManagementPage} />}
      {isAdmin && <Route path="/settings" component={SettingsPage} />}
      <Route component={AnalyticsStudioPage} />
    </Switch>
  );
}

function AppLayout() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const tourDone = useTourDone(user?.id);
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    if (user && location === "/login") {
      navigate("/");
    }
  }, [user, location]);

  // Auto-launch tour for first-time users
  useEffect(() => {
    if (user && !tourDone && !tourActive) {
      const timer = setTimeout(() => setTourActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user, tourDone]);

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

  const path = location.replace(/\/+$/, "");
  if (path === "/demo") return <DemoPage />;

  if (!user) {
    if (path === "/login") return <AuthPage />;
    if (path === "/guide") return <GuidePage />;
    return <LandingPage />;
  }

  if (user.mustChangePassword) {
    return <ForcePasswordChangeModal />;
  }

  const isModuleRoute =
    path === "/" ||
    path.startsWith("/analytics") ||
    path.startsWith("/scorecard");

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar onStartTour={() => setTourActive(true)} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1" />
            <GlobalSearch />
            {isModuleRoute && <NotificationBell />}
            {isModuleRoute && (
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
            )}
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <AppRouter />
          </main>
        </div>
      </div>
      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      {tourActive && <GuidedTour userId={user.id} onClose={() => setTourActive(false)} />}
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
  const isPublicRoute = location.startsWith("/public/");

  if (isPublicRoute) {
    return (
      <Switch>
        <Route path="/public/dashboard/:token" component={PublicDashboardPage} />
        <Route path="/public/scorecard/:token" component={PublicScorecardPage} />
      </Switch>
    );
  }

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
