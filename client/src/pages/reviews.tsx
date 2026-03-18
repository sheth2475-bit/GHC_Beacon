import { useState } from "react";
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
import { ErrorState } from "@/components/error-state";
import { Sparkles, FileText, Loader2, Copy, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Lightbulb, MessageSquare, Printer } from "lucide-react";
import type { Kpi, MonthlyReview } from "@shared/schema";

export default function ReviewsPage() {
  const { toast } = useToast();
  const { data: kpis, error: kpiError } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: reviews, error: reviewError, refetch } = useQuery<MonthlyReview[]>({ queryKey: ["/api/monthly-reviews"] });
  const [month, setMonth] = useState("");
  const [kpiInputs, setKpiInputs] = useState<Record<number, { actual: string; status: string; commentary: string }>>({});
  const [generatedReview, setGeneratedReview] = useState<MonthlyReview | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);

  const updateKpiInput = (kpiId: number, field: string, value: string) => {
    setKpiInputs(prev => ({
      ...prev,
      [kpiId]: { ...(prev[kpiId] || { actual: "", status: "On Track", commentary: "" }), [field]: value },
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
      if (kpiData.length === 0) throw new Error("Please enter at least one KPI actual value");
      const res = await apiRequest("POST", "/api/ai/monthly-review", { month, kpiData });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedReview(data);
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-reviews"] });
      toast({ title: "Review generated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const displayReview = generatedReview || reviews?.[0] || null;

  const handlePrint = () => {
    window.print();
  };

  if (kpiError || reviewError) {
    return <div className="p-6"><ErrorState message="Failed to load data" onRetry={() => refetch()} /></div>;
  }

  const formatSection = (text: string | null) => {
    if (!text) return null;
    return text.split("\n").filter(l => l.trim()).map((line, i) => (
      <div key={i} className="flex items-start gap-2 py-1">
        <span className="text-muted-foreground mt-0.5">•</span>
        <span className="text-sm text-muted-foreground leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span>
      </div>
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Monthly Reviews"
        description="Generate AI-powered business performance reviews"
        icon={FileText}
        testId="text-reviews-title"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate Review
          </CardTitle>
          <CardDescription>Enter KPI actuals for the month and let AI analyze performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Review Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="max-w-xs" data-testid="input-review-month" />
          </div>

          {(kpis || []).length > 0 && month && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Enter KPI Actuals:</p>
              <div className="border rounded-lg divide-y">
                {(kpis || []).map(kpi => (
                  <div key={kpi.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3">
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
                    <Select
                      value={kpiInputs[kpi.id]?.status || "On Track"}
                      onValueChange={(v) => updateKpiInput(kpi.id, "status", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="On Track">On Track</SelectItem>
                        <SelectItem value="Amber">At Risk</SelectItem>
                        <SelectItem value="Below Target">Below Target</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Commentary (optional)"
                      value={kpiInputs[kpi.id]?.commentary || ""}
                      onChange={(e) => updateKpiInput(kpi.id, "commentary", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(kpis || []).length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
              No KPIs found. Create KPIs first using the KPI Builder.
            </p>
          )}

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !month || (kpis || []).length === 0}
            data-testid="button-generate-review"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating review...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Generate Monthly Review</>
            )}
          </Button>
        </CardContent>
      </Card>

      {displayReview && (
        <>
        <div className="print-only" id="print-review-area" style={{ display: "none" }}>
          <div style={{ fontFamily: "Georgia, serif", maxWidth: 720, margin: "0 auto", padding: 40, color: "#111" }}>
            <div style={{ borderBottom: "2px solid #3b82f6", paddingBottom: 12, marginBottom: 24 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: 4 }}>Performo AI — Monthly Performance Review</div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{displayReview.reviewMonth}</h1>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#374151", marginBottom: 8 }}>Executive Summary</h2>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "#374151", margin: 0, whiteSpace: "pre-line" }}>{displayReview.overallSummary}</p>
            </div>
            {displayReview.strengths && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#059669", marginBottom: 8 }}>✓ Strengths</h2>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "#374151", whiteSpace: "pre-line" }}>{displayReview.strengths}</div>
              </div>
            )}
            {displayReview.gaps && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#dc2626", marginBottom: 8 }}>⚠ Gaps & Concerns</h2>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "#374151", whiteSpace: "pre-line" }}>{displayReview.gaps}</div>
              </div>
            )}
            {displayReview.recommendations && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#2563eb", marginBottom: 8 }}>→ Recommendations</h2>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "#374151", whiteSpace: "pre-line" }}>{displayReview.recommendations}</div>
              </div>
            )}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, marginTop: 32, fontSize: 10, color: "#9ca3af", display: "flex", justifyContent: "space-between" }}>
              <span>Generated by Performo AI</span>
              <span>Confidential — For internal use only</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Monthly Review — {displayReview.reviewMonth}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  data-testid="button-export-pdf"
                >
                  <Printer className="h-4 w-4 mr-1" />Export PDF
                </Button>
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
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/30 border">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />Executive Summary
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line" data-testid="text-review-summary">
                {displayReview.overallSummary}
              </p>
            </div>

            {displayReview.strengths && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />Strengths
                </h3>
                {formatSection(displayReview.strengths)}
              </div>
            )}

            {displayReview.gaps && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />Gaps & Concerns
                </h3>
                {formatSection(displayReview.gaps)}
              </div>
            )}

            {displayReview.recommendations && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-primary">
                  <Lightbulb className="h-4 w-4" />Recommendations
                </h3>
                {formatSection(displayReview.recommendations)}
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}

      {(reviews || []).length > 1 && (
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full justify-center gap-2"
            onClick={() => setShowPrevious(!showPrevious)}
          >
            {showPrevious ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showPrevious ? "Hide" : "Show"} Previous Reviews ({(reviews || []).length - 1})
          </Button>
          {showPrevious && (reviews || []).slice(1).map(review => (
            <button
              key={review.id}
              type="button"
              className="w-full text-left rounded-lg border bg-card hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-4"
              onClick={() => setGeneratedReview(review)}
              data-testid={`button-prev-review-${review.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-1" data-testid={`badge-prev-review-${review.id}`}>{review.reviewMonth}</Badge>
                  <p className="text-sm text-muted-foreground line-clamp-2">{review.overallSummary?.split("\n")[0]}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
