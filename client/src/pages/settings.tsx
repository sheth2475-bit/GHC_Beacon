import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-state";
import { useToast } from "@/hooks/use-toast";
import { Settings, User, Building2, Database, Trash2, Plus, Save, X, Target, ShieldCheck, Key, Loader2, Bot } from "lucide-react";
import type { Department } from "@shared/schema";

const INDUSTRIES = [
  "Hospitality", "Restaurants", "Retail", "Real Estate", "Healthcare clinics",
  "Trading companies", "Maintenance / field services", "Professional services",
  "Offshore Helicopters",
];

const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newDepartment, setNewDepartment] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [country, setCountry] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");

  const { data: company, isLoading: companyLoading } = useQuery<any>({ queryKey: ["/api/company"] });
  const { data: departments = [], isLoading: deptsLoading } = useQuery<Department[]>({ queryKey: ["/api/departments"] });

  useEffect(() => {
    if (company) {
      setCompanyName(company.companyName || "");
      setIndustry(company.industry || "");
      setCompanySize(company.companySize || "");
      setCountry(company.country || "");
      setGoals(company.goals?.map((g: any) => g.goalText) || []);
    }
  }, [company]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/company", {
        companyName, industry, companySize, country, goals,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({ title: "Saved", description: "Business profile updated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createDepartment = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", "/api/departments", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setNewDepartment("");
      toast({ title: "Department added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add department", description: err.message, variant: "destructive" });
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Department removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove department", description: err.message, variant: "destructive" });
    },
  });

  if (companyLoading || deptsLoading) return <LoadingPage />;

  const infoRow = (label: string, value: React.ReactNode, testId?: string) => (
    <div className="flex items-center justify-between gap-1 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium" data-testid={testId}>{value}</span>
    </div>
  );

  const handleAddDepartment = () => {
    const trimmed = newDepartment.trim();
    if (!trimmed) return;
    createDepartment.mutate(trimmed);
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals(prev => [...prev, newGoal.trim()]);
      setNewGoal("");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your business profile, departments, and application settings"
        icon={Settings}
        testId="text-settings-title"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />Account
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {infoRow("Name", user?.name, "text-setting-name")}
          {infoRow("Email", user?.email, "text-setting-email")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />Business Profile
          </CardTitle>
          <CardDescription>Company information used for personalized KPIs and insights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company name" data-testid="input-company-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" data-testid="input-country" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger data-testid="select-industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger data-testid="select-size"><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {SIZES.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} data-testid="button-save-profile">
            <Save className="h-4 w-4 mr-2" />
            {saveProfile.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />Strategic Goals
          </CardTitle>
          <CardDescription>Key business priorities used for AI-generated insights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {goals.map((goal, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 p-2.5 rounded-lg bg-muted/50 border text-sm" data-testid={`text-goal-${i}`}>{goal}</div>
              <Button size="icon" variant="ghost" onClick={() => setGoals(prev => prev.filter((_, idx) => idx !== i))} data-testid={`button-remove-goal-${i}`}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="Add a strategic goal..." onKeyDown={(e) => e.key === "Enter" && addGoal()} data-testid="input-new-goal" />
            <Button size="icon" variant="secondary" onClick={addGoal} data-testid="button-add-goal">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />Departments
          </CardTitle>
          <CardDescription>Departments used to organise KPIs, actions, and team members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-departments">No departments added yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center gap-1 bg-muted border rounded-full px-3 py-1"
                  data-testid={`row-department-${dept.id}`}
                >
                  <span className="text-sm font-medium" data-testid={`text-department-name-${dept.id}`}>{dept.name}</span>
                  <button
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                    data-testid={`button-delete-department-${dept.id}`}
                    onClick={() => deleteDepartment.mutate(dept.id)}
                    disabled={deleteDepartment.isPending}
                    aria-label={`Remove ${dept.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              data-testid="input-new-department"
              placeholder="Add new department..."
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDepartment()}
            />
            <Button
              data-testid="button-add-department"
              onClick={handleAddDepartment}
              disabled={createDepartment.isPending || !newDepartment.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <SubscriptionCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />Application
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {infoRow("Version", <Badge variant="secondary">1.0.0</Badge>)}
          {infoRow("AI Engine", <Badge variant="secondary">GPT-4o</Badge>)}
          {infoRow("Database", <Badge variant="secondary">PostgreSQL</Badge>)}
        </CardContent>
      </Card>
    </div>
  );
}

const planColors: Record<string, string> = {
  Trial: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  Starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Growth: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Enterprise: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

function SubscriptionCard() {
  const { toast } = useToast();
  const [keyValue, setKeyValue] = useState("");
  const [activating, setActivating] = useState(false);

  const { data: sub, isLoading } = useQuery<any>({
    queryKey: ["/api/subscription"],
  });

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyValue.trim()) return;
    setActivating(true);
    try {
      await apiRequest("POST", "/api/activate-key", { keyValue: keyValue.trim() });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({ title: "Plan activated!", description: `Your plan has been upgraded.` });
      setKeyValue("");
    } catch (err: any) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
    } finally {
      setActivating(false);
    }
  };

  const planName = sub?.planName || "Trial";
  const dailyLimit = sub?.dailyAiLimit ?? 15;
  const dailyUsed = sub?.dailyUsed ?? 0;
  const pct = Math.min(100, (dailyUsed / dailyLimit) * 100);
  const status = sub?.status || "Active";

  const trialDaysLeft = (() => {
    if (planName !== "Trial" || !sub?.trialStartDate) return null;
    const start = new Date(sub.trialStartDate).getTime();
    const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsed);
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />Subscription & Plan
        </CardTitle>
        <CardDescription>Your current plan and AI usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Loading...
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-2.5 py-1 rounded-full font-semibold ${planColors[planName] || planColors.Trial}`} data-testid="text-plan-name">
                {planName} Plan
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`} data-testid="text-plan-status">
                {status}
              </span>
            </div>

            {trialDaysLeft !== null && (
              <div className={`rounded-lg border p-3 flex items-start gap-3 ${trialDaysLeft <= 7 ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10" : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10"}`} data-testid="box-trial-countdown">
                <Key className={`h-4 w-4 mt-0.5 shrink-0 ${trialDaysLeft <= 7 ? "text-red-500" : "text-amber-600"}`} />
                <div>
                  <p className={`text-sm font-semibold ${trialDaysLeft <= 7 ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`} data-testid="text-trial-days-left">
                    {trialDaysLeft === 0 ? "Trial expired today" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} remaining in your trial`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your 30-day free trial {trialDaysLeft === 0 ? "has ended" : "ends in " + trialDaysLeft + (trialDaysLeft === 1 ? " day" : " days")}. Activate a key below to upgrade your plan.
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" />
                  Daily AI Usage
                </div>
                <span className="text-sm font-medium" data-testid="text-ai-usage">{dailyUsed} / {dailyLimit}</span>
              </div>
              <div className="bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                  data-testid="progress-ai-usage"
                />
              </div>
              {pct >= 100 && (
                <p className="text-xs text-red-500 mt-1">Daily limit reached. Resets at midnight.</p>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                Activate with key
              </p>
              <form onSubmit={handleActivate} className="flex gap-2">
                <Input
                  value={keyValue}
                  onChange={e => setKeyValue(e.target.value.toUpperCase())}
                  placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                  className="font-mono text-sm flex-1"
                  data-testid="input-activation-key"
                />
                <Button type="submit" disabled={activating || !keyValue.trim()} className="flex-shrink-0" data-testid="button-activate-key">
                  {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-1.5">Enter a key provided by your platform administrator</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
