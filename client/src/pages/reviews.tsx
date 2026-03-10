import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, FileText, Loader2, Copy } from "lucide-react";
import type { Kpi, MonthlyReview } from "@shared/schema";

export default function ReviewsPage() {
  const { toast } = useToast();
  const { data: kpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: reviews } = useQuery<MonthlyReview[]>({ queryKey: ["/api/monthly-reviews"] });
  const [month, setMonth] = useState("");
  const [kpiInputs, setKpiInputs] = useState<Record<number, { actual: string; status: string; commentary: string }>>({});
  const [generatedReview, setGeneratedReview] = useState<MonthlyReview | null>(null);

  const updateKpiInput = (kpiId: number, field: string, value: string) => {
    setKpiInputs(prev => ({
      ...prev,
      [kpiId]: { ...prev[kpiId], [field]: value },
    }));
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const kpiData = (kpis || [])
        .filter(k => kpiInputs[k.id]?.actual)
        .map(k => ({
          kpiName: k.kpiName,
          target: k.targetValue || "",
          actual: kpiInputs[k.id]?.actual || "",
          status: kpiInputs[k.id]?.status || "On Track",
          commentary: kpiInputs[k.id]?.commentary || "",
        }));
      const res = await apiRequest("POST", "/api/ai/monthly-review", { month, kpiData });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedReview(data);
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-reviews"] });
      toast({ title: "Review Generated", description: "AI monthly review created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const displayReview = generatedReview || reviews?.[0] || null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-reviews-title">Monthly Reviews</h1>
        <p className="text-muted-foreground">Generate AI-powered monthly business performance reviews</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate Review
          </CardTitle>
          <CardDescription>Enter KPI actuals for the month and let AI analyze your performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Review Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="input-review-month" />
          </div>

          {(kpis || []).length > 0 && month && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Enter KPI Actuals:</p>
              {(kpis || []).map(kpi => (
                <div key={kpi.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-md bg-muted/50">
                  <div className="sm:col-span-1">
                    <p className="text-sm font-medium">{kpi.kpiName}</p>
                    <p className="text-xs text-muted-foreground">Target: {kpi.targetValue} {kpi.unit}</p>
                  </div>
                  <Input
                    placeholder="Actual value"
                    value={kpiInputs[kpi.id]?.actual || ""}
                    onChange={(e) => updateKpiInput(kpi.id, "actual", e.target.value)}
                    data-testid={`input-actual-${kpi.id}`}
                  />
                  <Input
                    placeholder="Status (Green/Amber/Red)"
                    value={kpiInputs[kpi.id]?.status || ""}
                    onChange={(e) => updateKpiInput(kpi.id, "status", e.target.value)}
                  />
                  <Input
                    placeholder="Notes"
                    value={kpiInputs[kpi.id]?.commentary || ""}
                    onChange={(e) => updateKpiInput(kpi.id, "commentary", e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !month || (kpis || []).length === 0}
            data-testid="button-generate-review"
          >
            {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Monthly Review</>}
          </Button>
        </CardContent>
      </Card>

      {displayReview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Monthly Review - {displayReview.reviewMonth}
              </CardTitle>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copyToClipboard(
                  `Monthly Review - ${displayReview.reviewMonth}\n\n${displayReview.overallSummary}\n\nStrengths:\n${displayReview.strengths}\n\nGaps:\n${displayReview.gaps}\n\nRecommendations:\n${displayReview.recommendations}`
                )}
                data-testid="button-copy-review"
              >
                <Copy className="h-4 w-4 mr-1" />Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Executive Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line" data-testid="text-review-summary">{displayReview.overallSummary}</p>
            </div>
            {displayReview.strengths && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-chart-2">Strengths</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{displayReview.strengths}</p>
              </div>
            )}
            {displayReview.gaps && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-destructive">Gaps & Concerns</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{displayReview.gaps}</p>
              </div>
            )}
            {displayReview.recommendations && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-primary">Recommendations</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{displayReview.recommendations}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(reviews || []).length > 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Previous Reviews</h2>
          {(reviews || []).slice(1).map(review => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Badge variant="secondary" data-testid={`badge-prev-review-${review.id}`}>{review.reviewMonth}</Badge>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{review.overallSummary}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setGeneratedReview(review)}>View</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
