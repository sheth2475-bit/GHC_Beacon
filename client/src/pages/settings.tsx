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
import { Settings, User, Building2, Database, Trash2, Plus, LayoutList, Save, X, Target } from "lucide-react";
import type { Department, MeetingType } from "@shared/schema";

const INDUSTRIES = [
  "Offshore Helicopters", "Hospitality", "Restaurants", "Retail", "Real Estate", "Healthcare clinics",
  "Trading companies", "Maintenance / field services", "Professional services",
];

const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newDepartment, setNewDepartment] = useState("");
  const [newMeetingType, setNewMeetingType] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [country, setCountry] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");

  const { data: company, isLoading: companyLoading } = useQuery<any>({ queryKey: ["/api/company"] });
  const { data: departments = [], isLoading: deptsLoading } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: meetingTypes = [], isLoading: mtLoading } = useQuery<MeetingType[]>({ queryKey: ["/api/meeting-types"] });

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
      const deptNames = departments.map(d => d.name);
      await apiRequest("POST", "/api/company", {
        companyName, industry, companySize, country, departments: deptNames, goals,
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

  const createMeetingType = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", "/api/meeting-types", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      setNewMeetingType("");
      toast({ title: "Meeting type added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add meeting type", description: err.message, variant: "destructive" });
    },
  });

  const deleteMeetingType = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/meeting-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-types"] });
      toast({ title: "Meeting type removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to remove meeting type", description: err.message, variant: "destructive" });
    },
  });

  if (companyLoading || deptsLoading || mtLoading) return <LoadingPage />;

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

  const handleAddMeetingType = () => {
    const trimmed = newMeetingType.trim();
    if (!trimmed) return;
    createMeetingType.mutate(trimmed);
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
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              data-testid="input-new-department"
              placeholder="New department name"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDepartment()}
            />
            <Button
              data-testid="button-add-department"
              onClick={handleAddDepartment}
              disabled={createDepartment.isPending || !newDepartment.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2" data-testid="text-no-departments">No departments added yet</p>
          ) : (
            <div className="divide-y">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center justify-between gap-1 py-2"
                  data-testid={`row-department-${dept.id}`}
                >
                  <span className="text-sm" data-testid={`text-department-name-${dept.id}`}>{dept.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-delete-department-${dept.id}`}
                    onClick={() => deleteDepartment.mutate(dept.id)}
                    disabled={deleteDepartment.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutList className="h-4 w-4" />Meeting Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              data-testid="input-new-meeting-type"
              placeholder="New meeting type name"
              value={newMeetingType}
              onChange={(e) => setNewMeetingType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMeetingType()}
            />
            <Button
              data-testid="button-add-meeting-type"
              onClick={handleAddMeetingType}
              disabled={createMeetingType.isPending || !newMeetingType.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          {meetingTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2" data-testid="text-no-meeting-types">No meeting types added yet</p>
          ) : (
            <div className="divide-y">
              {meetingTypes.map((mt) => (
                <div
                  key={mt.id}
                  className="flex items-center justify-between gap-1 py-2"
                  data-testid={`row-meeting-type-${mt.id}`}
                >
                  <span className="text-sm" data-testid={`text-meeting-type-name-${mt.id}`}>{mt.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-delete-meeting-type-${mt.id}`}
                    onClick={() => deleteMeetingType.mutate(mt.id)}
                    disabled={deleteMeetingType.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
