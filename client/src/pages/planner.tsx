import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { Sparkles, LayoutTemplate, Loader2, BarChart3, PieChart, Table, AlertTriangle, Copy } from "lucide-react";
import type { Department, DashboardPlan } from "@shared/schema";

const INDUSTRIES = [
  "Hospitality", "Restaurants", "Retail", "Real Estate", "Healthcare clinics",
  "Trading companies", "Maintenance / field services", "Professional services",
  "Offshore Helicopter company"
];

const LEVELS = ["Executive", "Department", "Operational"];

const iconMap: Record<string, any> = {
  kpi_cards: BarChart3,
  trend_chart: BarChart3,
  bar_chart: BarChart3,
  pie_chart: PieChart,
  table: Table,
  risk_matrix: AlertTriangle,
  summary: LayoutTemplate,
};

export default function PlannerPage() {
  const { toast } = useToast();
  const { data: company } = useQuery<any>({ queryKey: ["/api/company"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: plans } = useQuery<DashboardPlan[]>({ queryKey: ["/api/dashboard-plans"] });

  const [industry, setIndustry] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("Executive");
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/dashboard-plan", {
        industry: industry || company?.industry,
        department: department || "All Departments",
        managementLevel: level,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const plan = data.structureJson ? JSON.parse(data.structureJson) : data;
      setGeneratedPlan(plan);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-plans"] });
      toast({ title: "Dashboard plan generated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const displayPlan = generatedPlan || (plans?.[0]?.structureJson ? JSON.parse(plans[0].structureJson) : null);

  const copyPlan = () => {
    if (!displayPlan) return;
    const text = JSON.stringify(displayPlan, null, 2);
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard Planner"
        description="AI-powered dashboard structure recommendations for Power BI or web dashboards"
        icon={LayoutTemplate}
        testId="text-planner-title"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate Dashboard Plan
          </CardTitle>
          <CardDescription>Specify your requirements for a recommended dashboard layout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industry || company?.industry || ""} onValueChange={setIndustry}>
                <SelectTrigger data-testid="select-planner-industry"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger data-testid="select-planner-dept"><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Departments">All Departments</SelectItem>
                  {(departments || []).map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Management Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger data-testid="select-planner-level"><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} data-testid="button-generate-plan">
            {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Plan</>}
          </Button>
        </CardContent>
      </Card>

      {displayPlan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold" data-testid="text-plan-title">{displayPlan.title || "Dashboard Plan"}</h2>
            <Button size="sm" variant="secondary" onClick={copyPlan} data-testid="button-copy-plan">
              <Copy className="h-4 w-4 mr-1" />Copy JSON
            </Button>
          </div>

          {(displayPlan.pages || []).map((page: any, pi: number) => (
            <Card key={pi}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{page.page_name}</CardTitle>
                {page.description && <CardDescription>{page.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {(page.sections || []).map((section: any, si: number) => {
                    const Icon = iconMap[section.type] || LayoutTemplate;
                    return (
                      <div key={si} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 flex-shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{section.section_name}</span>
                            <Badge variant="secondary" className="text-xs">{section.type}</Badge>
                            {section.chart_type && <Badge variant="secondary" className="text-xs">{section.chart_type}</Badge>}
                          </div>
                          {section.rationale && <p className="text-xs text-muted-foreground leading-relaxed">{section.rationale}</p>}
                          {section.recommended_kpis && section.recommended_kpis.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-1">
                              {section.recommended_kpis.map((kpi: string, ki: number) => (
                                <Badge key={ki} variant="outline" className="text-xs">{kpi}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {displayPlan.executive_summary_structure && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Executive Summary Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {displayPlan.executive_summary_structure.key_metrics && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Key Metrics</p>
                      <div className="flex flex-wrap gap-1">
                        {displayPlan.executive_summary_structure.key_metrics.map((m: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {displayPlan.executive_summary_structure.visualization_types && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Visualizations</p>
                      <div className="flex flex-wrap gap-1">
                        {displayPlan.executive_summary_structure.visualization_types.map((v: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {displayPlan.executive_summary_structure.refresh_frequency && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Refresh</p>
                      <p className="text-sm">{displayPlan.executive_summary_structure.refresh_frequency}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
