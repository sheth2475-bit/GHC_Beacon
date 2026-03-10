import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-state";
import { Building2, Plus, X, Save } from "lucide-react";

const INDUSTRIES = [
  "Hospitality", "Restaurants", "Retail", "Real Estate", "Healthcare clinics",
  "Trading companies", "Maintenance / field services", "Professional services",
  "Offshore Helicopter company"
];

const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

const DEFAULT_DEPARTMENTS = ["Sales", "Finance", "HR", "Operations", "Procurement", "Customer Service", "Marketing"];

export default function ProfilePage() {
  const { toast } = useToast();
  const { data: company, isLoading } = useQuery<any>({ queryKey: ["/api/company"] });

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [country, setCountry] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");

  useEffect(() => {
    if (company) {
      setCompanyName(company.companyName || "");
      setIndustry(company.industry || "");
      setCompanySize(company.companySize || "");
      setCountry(company.country || "");
      setDepartments(company.departments?.map((d: any) => d.name) || []);
      setGoals(company.goals?.map((g: any) => g.goalText) || []);
    }
  }, [company]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/company", {
        companyName, industry, companySize, country, departments, goals,
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

  const toggleDepartment = (dept: string) => {
    setDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals(prev => [...prev, newGoal.trim()]);
      setNewGoal("");
    }
  };

  if (isLoading) return <LoadingPage />;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader
        title="Business Profile"
        description="Set up your company information to get personalized KPIs and insights"
        icon={Building2}
        testId="text-profile-title"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Information</CardTitle>
          <CardDescription>Tell us about your business</CardDescription>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Departments</CardTitle>
          <CardDescription>Select the departments in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_DEPARTMENTS.map(dept => (
              <button
                key={dept}
                type="button"
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => toggleDepartment(dept)}
                aria-pressed={departments.includes(dept)}
                data-testid={`badge-dept-${dept.toLowerCase()}`}
                style={{
                  background: departments.includes(dept) ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                  color: departments.includes(dept) ? 'hsl(var(--primary-foreground))' : 'hsl(var(--secondary-foreground))',
                }}
              >
                {dept}
                {departments.includes(dept) && <X className="ml-1 h-3 w-3" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strategic Goals</CardTitle>
          <CardDescription>Define your key business priorities</CardDescription>
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

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full sm:w-auto" data-testid="button-save-profile">
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}
