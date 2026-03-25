import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, ChevronLeft, ChevronRight, Sparkles,
  FileSpreadsheet, Upload, Check, Download, Loader2,
  ArrowLeft,
} from "lucide-react";

const AUDIENCES = ["CEO / MD", "GM / COO", "Finance Director", "Department Head", "Operations Manager", "HR Manager", "Board / Investors", "Analyst"];
const BUSINESS_AREAS = ["Revenue & Sales", "Finance & Budgeting", "Operations", "Human Resources", "Marketing", "Customer Experience", "Supply Chain", "Product", "General"];
const VISIBILITIES = [
  { value: "private", label: "Private — only me" },
  { value: "department", label: "Department — visible to my department" },
  { value: "company", label: "Company-wide — all employees" },
];

interface WizardState {
  title: string;
  description: string;
  audience: string;
  businessArea: string;
  naturalLanguagePrompt: string;
  visibility: string;
}

const STEPS = [
  { id: 1, label: "Describe", icon: Sparkles },
  { id: 2, label: "Template", icon: FileSpreadsheet },
  { id: 3, label: "Upload", icon: Upload },
];

export default function AnalyticsStudioNewPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [dashboardId, setDashboardId] = useState<number | null>(null);
  const [templateDownloaded, setTemplateDownloaded] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ rowCount: number; errors: { row: number; column: string; message: string }[]; status: string } | null>(null);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);

  const [form, setForm] = useState<WizardState>({
    title: "",
    description: "",
    audience: "",
    businessArea: "",
    naturalLanguagePrompt: "",
    visibility: "private",
  });

  const set = (k: keyof WizardState) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  /* ── Step 1: create dashboard record ── */
  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/analytics/dashboards", form),
    onSuccess: async (res) => {
      const dash = await res.json();
      setDashboardId(dash.id);
      setStep(2);
    },
    onError: () => toast({ title: "Failed to create dashboard", variant: "destructive" }),
  });

  /* ── Step 2: download AI-generated template ── */
  const handleDownloadTemplate = async () => {
    if (!dashboardId) return;
    setGeneratingTemplate(true);
    try {
      const res = await fetch(`/api/analytics/dashboards/${dashboardId}/generate-template`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Failed to generate template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form.title.replace(/[^a-z0-9]/gi, "_")}_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setTemplateDownloaded(true);
    } catch (err) {
      toast({ title: "Template generation failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setGeneratingTemplate(false);
    }
  };

  /* ── Step 3: upload data ── */
  const [uploading, setUploading] = useState(false);
  const handleUpload = async () => {
    if (!uploadFile || !dashboardId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      const res = await fetch(`/api/analytics/dashboards/${dashboardId}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      setUploadResult(data);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const canProceedStep1 = form.title.trim().length >= 3 && form.naturalLanguagePrompt.trim().length >= 10;

  return (
    <div className="h-full overflow-auto">
      <div className="p-5 max-w-2xl mx-auto space-y-6">

        {/* Back */}
        <button onClick={() => navigate("/analytics")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-analytics">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Analytics Studio
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shrink-0">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black">New Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">Describe what you need — AI handles the rest</p>
          </div>
        </div>

        {/* Step tracker */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                  step > s.id ? "bg-emerald-500 border-emerald-500 text-white" :
                  step === s.id ? "bg-primary border-primary text-white" :
                  "bg-background border-border text-muted-foreground"
                }`}>
                  {step > s.id ? <Check className="h-4 w-4" /> : <s.icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`text-[10px] font-semibold ${step === s.id ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-2 transition-colors ${step > s.id + 1 ? "bg-emerald-500" : step > s.id ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Describe ── */}
        {step === 1 && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <h2 className="font-bold text-base mb-0.5">Describe your dashboard</h2>
                <p className="text-xs text-muted-foreground">Tell us what data you want to visualise and who will be looking at it.</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold" htmlFor="title">Dashboard Title *</Label>
                <Input id="title" value={form.title} onChange={e => set("title")(e.target.value)} placeholder="e.g. Monthly Revenue Performance Dashboard" data-testid="input-dashboard-title" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Audience *</Label>
                  <Select value={form.audience} onValueChange={set("audience")}>
                    <SelectTrigger className="h-9 text-sm" data-testid="select-audience">
                      <SelectValue placeholder="Who will view this?" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Business Area *</Label>
                  <Select value={form.businessArea} onValueChange={set("businessArea")}>
                    <SelectTrigger className="h-9 text-sm" data-testid="select-business-area">
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">What do you want to see? *</Label>
                <Textarea
                  value={form.naturalLanguagePrompt}
                  onChange={e => set("naturalLanguagePrompt")(e.target.value)}
                  placeholder="Describe in plain language, e.g. 'I want a monthly revenue dashboard showing ADR, RevPAR, and occupancy by property, with trend charts and a comparison against target. The audience is the GM and finance director.'"
                  className="min-h-[100px] text-sm resize-none"
                  data-testid="textarea-natural-language-prompt"
                />
                <p className="text-[10px] text-muted-foreground">{form.naturalLanguagePrompt.length} chars — aim for at least 30 characters for best results</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description (optional)</Label>
                <Input value={form.description} onChange={e => set("description")(e.target.value)} placeholder="Brief description for colleagues" data-testid="input-dashboard-description" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Visibility</Label>
                <Select value={form.visibility} onValueChange={set("visibility")}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITIES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!canProceedStep1 || createMutation.isPending}
                  className="gap-2"
                  data-testid="button-next-step-1"
                >
                  {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : <>Next — Get Template <ChevronRight className="h-4 w-4" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Download template ── */}
        {step === 2 && (
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <h2 className="font-bold text-base mb-0.5">Download your Excel template</h2>
                <p className="text-xs text-muted-foreground">AI has analysed your requirements and will generate a tailored Excel template with the exact columns you need.</p>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold mb-0.5">{form.title} — Template</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    The template will include: an Instructions sheet, a Data sheet with required columns, and a Column Guide.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.audience && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{form.audience}</span>}
                    {form.businessArea && <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">{form.businessArea}</span>}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleDownloadTemplate}
                disabled={generatingTemplate}
                variant={templateDownloaded ? "outline" : "default"}
                className="w-full gap-2"
                data-testid="button-download-template"
              >
                {generatingTemplate ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Generating template with AI…</>
                ) : templateDownloaded ? (
                  <><Check className="h-4 w-4 text-emerald-500" />Template downloaded — Download again</>
                ) : (
                  <><Download className="h-4 w-4" />Generate & Download Excel Template</>
                )}
              </Button>

              {templateDownloaded && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">✓ Template downloaded successfully</p>
                  <p className="text-xs text-muted-foreground">Fill in the <strong>Data</strong> sheet with your data. Keep all column headers exactly as they are. Then click Next to upload the completed file.</p>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1"><ChevronLeft className="h-4 w-4" />Back</Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!templateDownloaded}
                  className="gap-2"
                  data-testid="button-next-step-2"
                >
                  Next — Upload Data <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Upload ── */}
        {step === 3 && (
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <h2 className="font-bold text-base mb-0.5">Upload your filled template</h2>
                <p className="text-xs text-muted-foreground">Upload the completed Excel file. We'll validate the data and build your dashboard automatically.</p>
              </div>

              {/* File drop zone */}
              <label
                htmlFor="analytics-file-upload"
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                  uploadFile ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"
                }`}
                data-testid="label-file-upload-zone"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  {uploadFile ? <FileSpreadsheet className="h-6 w-6 text-primary" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                </div>
                {uploadFile ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-primary">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB — Click to change</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold">Click to select your Excel file</p>
                    <p className="text-xs text-muted-foreground">Supports .xlsx and .xls files up to 10MB</p>
                  </div>
                )}
                <input
                  id="analytics-file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => { setUploadFile(e.target.files?.[0] || null); setUploadResult(null); }}
                  data-testid="input-file-upload"
                />
              </label>

              {/* Upload button */}
              {uploadFile && !uploadResult && (
                <Button onClick={handleUpload} disabled={uploading} className="w-full gap-2" data-testid="button-upload-data">
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Validating & processing…</> : <><Upload className="h-4 w-4" />Upload & Validate</>}
                </Button>
              )}

              {/* Validation results */}
              {uploadResult && (
                <div className={`rounded-xl border p-4 space-y-2 ${uploadResult.status === "valid" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                  <div className="flex items-center gap-2">
                    {uploadResult.status === "valid" ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <span className="h-4 w-4 text-red-500 font-bold text-sm">!</span>
                    )}
                    <p className={`text-sm font-bold ${uploadResult.status === "valid" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
                      {uploadResult.status === "valid" ? `✓ Validated — ${uploadResult.rowCount} rows ready` : `Validation issues — ${uploadResult.errors?.length || 0} errors found`}
                    </p>
                  </div>
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {uploadResult.errors.slice(0, 5).map((e, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400">Row {e.row}: {e.column} — {e.message}</p>
                      ))}
                      {uploadResult.errors.length > 5 && <p className="text-xs text-muted-foreground">…and {uploadResult.errors.length - 5} more</p>}
                    </div>
                  )}
                  {uploadResult.status === "valid" && (
                    <p className="text-xs text-muted-foreground">Dashboard widgets are being generated. Click below to view your dashboard.</p>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="gap-1"><ChevronLeft className="h-4 w-4" />Back</Button>
                {uploadResult?.status === "valid" && dashboardId && (
                  <Button onClick={() => navigate(`/analytics/${dashboardId}`)} className="gap-2" data-testid="button-view-dashboard">
                    <BarChart3 className="h-4 w-4" />View Dashboard
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips panel */}
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="px-4 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tips</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Be specific about metrics — e.g. "ADR, RevPAR, occupancy rate" works better than "revenue metrics"</li>
              <li>• Mention time granularity — monthly, weekly, daily</li>
              <li>• State the audience — this shapes the AI narrative style</li>
              <li>• You can refresh the dashboard later by uploading updated data</li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
