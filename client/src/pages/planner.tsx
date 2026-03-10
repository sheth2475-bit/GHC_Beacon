import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import {
  Sparkles, LayoutTemplate, Loader2, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Copy, Clock, Eye, List,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import type { Department, DashboardPlan } from "@shared/schema";

const INDUSTRIES = [
  "Hospitality", "Restaurants", "Retail", "Real Estate", "Healthcare clinics",
  "Trading companies", "Maintenance / field services", "Professional services",
  "Offshore Helicopter company"
];

const LEVELS = ["Executive", "Department", "Operational"];

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function generateMockValue(kpiName: string): { value: number; target: number; unit: string; trend: number } {
  const hash = kpiName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 50 + (hash % 50);
  const target = base + 10;
  const trend = ((hash % 20) - 10);
  const isPercent = kpiName.toLowerCase().includes("rate") || kpiName.toLowerCase().includes("%") || kpiName.toLowerCase().includes("margin") || kpiName.toLowerCase().includes("score");
  return { value: isPercent ? Math.min(base, 99) : base * 10, target: isPercent ? Math.min(target, 100) : target * 10, unit: isPercent ? "%" : "", trend };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashStr(str: string): number {
  const s = str || "default";
  return s.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0) >>> 0;
}

function generateTrendData(seed: string, count: number = 6): { month: string; value: number; target: number }[] {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const rng = seededRandom(hashStr(seed));
  let v = 60 + rng() * 20;
  return months.slice(0, count).map(m => {
    v = Math.max(30, Math.min(100, v + (rng() - 0.4) * 10));
    return { month: m, value: Math.round(v), target: Math.round(v + 5 + rng() * 5) };
  });
}

function generateBarData(labels: string[], seed: string): { name: string; value: number }[] {
  const rng = seededRandom(hashStr(seed));
  return labels.map(name => ({ name: name.length > 14 ? name.slice(0, 12) + ".." : name, value: Math.round(40 + rng() * 60) }));
}

function generatePieData(labels: string[], seed: string): { name: string; value: number }[] {
  const rng = seededRandom(hashStr(seed));
  return labels.map(name => ({ name: name.length > 16 ? name.slice(0, 14) + ".." : name, value: Math.round(10 + rng() * 40) }));
}

function KpiCardPreview({ name, index }: { name: string; index: number }) {
  const mock = generateMockValue(name);
  const isUp = mock.trend >= 0;
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2" data-testid={`preview-kpi-card-${index}`}>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{name}</p>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tabular-nums">{mock.value.toLocaleString()}{mock.unit}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Target: {mock.target.toLocaleString()}{mock.unit}</p>
        </div>
        <div className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>
          {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(mock.trend)}%
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{
          width: `${Math.min(100, Math.round((mock.value / mock.target) * 100))}%`,
          backgroundColor: mock.value >= mock.target ? "#10b981" : mock.value >= mock.target * 0.85 ? "#f59e0b" : "#ef4444"
        }} />
      </div>
    </div>
  );
}

function TrendChartPreview({ section }: { section: any }) {
  const data = generateTrendData(section.section_name || "trend");
  return (
    <div className="rounded-xl border bg-card p-4" data-testid="preview-trend-chart">
      <p className="text-sm font-semibold mb-1">{section.section_name}</p>
      {section.rationale && <p className="text-[11px] text-muted-foreground mb-3">{section.rationale}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorValue)" />
          <Line type="monotone" dataKey="target" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      {section.recommended_kpis && section.recommended_kpis.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {section.recommended_kpis.map((k: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{k}</Badge>)}
        </div>
      )}
    </div>
  );
}

function BarChartPreview({ section }: { section: any }) {
  const labels = section.recommended_kpis?.slice(0, 6) || ["Category A", "Category B", "Category C", "Category D"];
  const data = generateBarData(labels, section.section_name || "bar");
  return (
    <div className="rounded-xl border bg-card p-4" data-testid="preview-bar-chart">
      <p className="text-sm font-semibold mb-1">{section.section_name}</p>
      {section.rationale && <p className="text-[11px] text-muted-foreground mb-3">{section.rationale}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartPreview({ section }: { section: any }) {
  const labels = section.recommended_kpis?.slice(0, 5) || ["Segment A", "Segment B", "Segment C", "Segment D"];
  const data = generatePieData(labels, section.section_name || "pie");
  return (
    <div className="rounded-xl border bg-card p-4" data-testid="preview-pie-chart">
      <p className="text-sm font-semibold mb-1">{section.section_name}</p>
      {section.rationale && <p className="text-[11px] text-muted-foreground mb-3">{section.rationale}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-2 flex-wrap justify-center mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function TablePreview({ section }: { section: any }) {
  const kpis = section.recommended_kpis || ["Metric 1", "Metric 2", "Metric 3", "Metric 4"];
  const statuses = ["On Track", "At Risk", "Below Target", "On Track"];
  return (
    <div className="rounded-xl border bg-card p-4" data-testid="preview-table">
      <p className="text-sm font-semibold mb-1">{section.section_name}</p>
      {section.rationale && <p className="text-[11px] text-muted-foreground mb-3">{section.rationale}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Metric</th>
              <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Target</th>
              <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Actual</th>
              <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Variance</th>
              <th className="text-center py-2 px-2 font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {kpis.slice(0, 6).map((kpi: string, i: number) => {
              const mock = generateMockValue(kpi);
              const variance = mock.value - mock.target;
              const status = statuses[i % statuses.length];
              const statusColor = status === "On Track" ? "bg-emerald-500/10 text-emerald-700" : status === "At Risk" ? "bg-amber-500/10 text-amber-700" : "bg-red-500/10 text-red-700";
              return (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 px-2 font-medium">{kpi.length > 28 ? kpi.slice(0, 26) + ".." : kpi}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{mock.target.toLocaleString()}{mock.unit}</td>
                  <td className="py-2 px-2 text-right tabular-nums font-medium">{mock.value.toLocaleString()}{mock.unit}</td>
                  <td className={`py-2 px-2 text-right tabular-nums font-medium ${variance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {variance >= 0 ? "+" : ""}{variance.toLocaleString()}{mock.unit}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>{status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GaugePreview({ section }: { section: any }) {
  const kpis = section.recommended_kpis?.slice(0, 4) || ["Score"];
  return (
    <div className="rounded-xl border bg-card p-4" data-testid="preview-gauge">
      <p className="text-sm font-semibold mb-1">{section.section_name}</p>
      {section.rationale && <p className="text-[11px] text-muted-foreground mb-3">{section.rationale}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi: string, i: number) => {
          const mock = generateMockValue(kpi);
          const pct = Math.min(100, Math.round((mock.value / mock.target) * 100));
          const color = pct >= 90 ? "#10b981" : pct >= 75 ? "#f59e0b" : "#ef4444";
          return (
            <div key={i} className="flex flex-col items-center gap-1 p-2">
              <div className="relative h-16 w-16">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${pct * 0.94} 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">{pct}%</div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center truncate w-full">{kpi.length > 18 ? kpi.slice(0, 16) + ".." : kpi}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeatmapPreview({ section }: { section: any }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeks = ["W1", "W2", "W3", "W4"];
  const rng = seededRandom(hashStr(section.section_name || "heatmap"));
  return (
    <div className="rounded-xl border bg-card p-4" data-testid="preview-heatmap">
      <p className="text-sm font-semibold mb-1">{section.section_name}</p>
      {section.rationale && <p className="text-[11px] text-muted-foreground mb-3">{section.rationale}</p>}
      <div className="grid gap-1">
        <div className="grid grid-cols-8 gap-1">
          <div />
          {days.map(d => <div key={d} className="text-[10px] text-center text-muted-foreground font-medium">{d}</div>)}
        </div>
        {weeks.map((w, wi) => (
          <div key={w} className="grid grid-cols-8 gap-1">
            <div className="text-[10px] text-muted-foreground font-medium flex items-center">{w}</div>
            {days.map((_, di) => {
              const intensity = rng();
              const bg = intensity > 0.75 ? "bg-emerald-500" : intensity > 0.5 ? "bg-emerald-400" : intensity > 0.25 ? "bg-emerald-300" : "bg-emerald-100";
              return <div key={di} className={`h-7 rounded ${bg} opacity-80`} />;
            })}
          </div>
        ))}
      </div>
      {section.recommended_kpis && section.recommended_kpis.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {section.recommended_kpis.map((k: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{k}</Badge>)}
        </div>
      )}
    </div>
  );
}

function ComparisonChartPreview({ section }: { section: any }) {
  const labels = section.recommended_kpis?.slice(0, 5) || ["Q1", "Q2", "Q3", "Q4"];
  const rng = seededRandom(hashStr(section.section_name || "comparison"));
  const data = labels.map((name: string) => ({
    name: name.length > 12 ? name.slice(0, 10) + ".." : name,
    current: Math.round(50 + rng() * 40),
    previous: Math.round(40 + rng() * 40),
  }));
  return (
    <div className="rounded-xl border bg-card p-4" data-testid="preview-comparison-chart">
      <p className="text-sm font-semibold mb-1">{section.section_name}</p>
      {section.rationale && <p className="text-[11px] text-muted-foreground mb-3">{section.rationale}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={16} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} />
          <Bar dataKey="current" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Current" />
          <Bar dataKey="previous" fill="#94a3b8" radius={[3, 3, 0, 0]} name="Previous" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionRenderer({ section }: { section: any }) {
  const type = (section.type || section.chart_type || "").toLowerCase().replace(/\s+/g, "_");

  if (type === "kpi_cards" || type === "kpi_card" || type === "summary") {
    const kpis = section.recommended_kpis || ["Metric 1", "Metric 2", "Metric 3", "Metric 4"];
    return (
      <div>
        {section.rationale && <p className="text-[11px] text-muted-foreground mb-3">{section.rationale}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.slice(0, 8).map((kpi: string, i: number) => <KpiCardPreview key={i} name={kpi} index={i} />)}
        </div>
      </div>
    );
  }

  if (type === "trend_chart" || type === "line_chart" || type === "area_chart") {
    return <TrendChartPreview section={section} />;
  }

  if (type === "bar_chart" || type === "clustered_bar" || type === "stacked_bar") {
    return <BarChartPreview section={section} />;
  }

  if (type === "pie_chart" || type === "donut_chart" || type === "donut") {
    return <PieChartPreview section={section} />;
  }

  if (type === "table" || type === "matrix" || type === "data_table") {
    return <TablePreview section={section} />;
  }

  if (type === "gauge" || type === "scorecard") {
    return <GaugePreview section={section} />;
  }

  if (type === "heatmap" || type === "heat_map") {
    return <HeatmapPreview section={section} />;
  }

  if (type === "comparison_chart" || type === "comparison") {
    return <ComparisonChartPreview section={section} />;
  }

  if (type === "risk_matrix") {
    return <TablePreview section={section} />;
  }

  return (
    <div className="rounded-xl border bg-card p-4" data-testid="preview-unknown-type">
      <p className="text-sm font-semibold mb-1">{section.section_name}</p>
      {section.rationale && <p className="text-[11px] text-muted-foreground mb-3">{section.rationale}</p>}
      <div className="flex items-center justify-center h-24 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">Widget: {type || "unknown"}</p>
      </div>
      {section.recommended_kpis && section.recommended_kpis.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {section.recommended_kpis.map((k: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{k}</Badge>)}
        </div>
      )}
    </div>
  );
}

function DashboardPreview({ plan }: { plan: any }) {
  return (
    <div className="space-y-6" data-testid="dashboard-preview">
      {(plan.pages || []).map((page: any, pi: number) => (
        <div key={pi} className="space-y-4" data-testid={`preview-page-${pi}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <LayoutTemplate className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{page.page_name || page.page_title}</h3>
              {page.description && <p className="text-xs text-muted-foreground">{page.description}</p>}
            </div>
            <Badge variant="secondary" className="text-[10px] ml-auto">Page {pi + 1}</Badge>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-4 space-y-4">
            {(page.sections || []).map((section: any, si: number) => (
              <SectionRenderer key={si} section={section} />
            ))}
          </div>
        </div>
      ))}

      {plan.executive_summary_structure && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Implementation Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plan.executive_summary_structure.key_metrics && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Key Metrics to Track</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.executive_summary_structure.key_metrics.map((m: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {plan.executive_summary_structure.visualization_types && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Chart Types</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.executive_summary_structure.visualization_types.map((v: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {plan.executive_summary_structure.refresh_frequency && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Refresh Frequency</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm">{plan.executive_summary_structure.refresh_frequency}</p>
                  </div>
                </div>
              )}
            </div>
            {plan.implementation_notes && (
              <div className="pt-2 border-t">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Setup Notes</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{plan.implementation_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlanListView({ plan }: { plan: any }) {
  return (
    <div className="space-y-4" data-testid="plan-list-view">
      {(plan.executive_summary || plan.key_metrics || plan.refresh_frequency) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.executive_summary && <p className="text-sm text-muted-foreground leading-relaxed">{plan.executive_summary}</p>}
            {plan.key_metrics && plan.key_metrics.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Key Metrics</p>
                <div className="flex gap-1 flex-wrap">
                  {plan.key_metrics.map((m: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{m}</Badge>)}
                </div>
              </div>
            )}
            {plan.visualization_types && plan.visualization_types.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Visualization Types</p>
                <div className="flex gap-1 flex-wrap">
                  {plan.visualization_types.map((v: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{v}</Badge>)}
                </div>
              </div>
            )}
            {plan.refresh_frequency && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Refresh Frequency</p>
                <p className="text-sm text-muted-foreground">{plan.refresh_frequency}</p>
              </div>
            )}
            {plan.implementation_notes && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Implementation Notes</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{plan.implementation_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {(plan.pages || []).map((page: any, pi: number) => (
        <Card key={pi}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{page.page_name || page.page_title}</CardTitle>
            {page.description && <CardDescription>{page.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(page.sections || []).map((section: any, si: number) => (
                <div key={si} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{section.section_name}</span>
                      <Badge variant="secondary" className="text-[10px]">{section.type}</Badge>
                      {section.chart_type && <Badge variant="outline" className="text-[10px]">{section.chart_type}</Badge>}
                    </div>
                    {section.rationale && <p className="text-xs text-muted-foreground leading-relaxed">{section.rationale}</p>}
                    {section.recommended_kpis && section.recommended_kpis.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {section.recommended_kpis.map((kpi: string, ki: number) => (
                          <Badge key={ki} variant="outline" className="text-[10px]">{kpi}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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
    navigator.clipboard.writeText(JSON.stringify(displayPlan, null, 2));
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard Planner"
        description="AI-powered dashboard design with visual preview"
        icon={LayoutTemplate}
        testId="text-planner-title"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate Dashboard Plan
          </CardTitle>
          <CardDescription>Choose your parameters and AI will design a complete dashboard with visual preview</CardDescription>
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
            {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Dashboard</>}
          </Button>
        </CardContent>
      </Card>

      {displayPlan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="text-plan-title">{displayPlan.title || "Dashboard Plan"}</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={copyPlan} data-testid="button-copy-plan">
                <Copy className="h-3.5 w-3.5 mr-1" />Copy JSON
              </Button>
            </div>
          </div>

          <Tabs defaultValue="preview" className="w-full">
            <TabsList data-testid="tabs-plan-view">
              <TabsTrigger value="preview" data-testid="tab-preview">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Visual Preview
              </TabsTrigger>
              <TabsTrigger value="structure" data-testid="tab-structure">
                <List className="h-3.5 w-3.5 mr-1.5" />
                Structure View
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-4">
              <DashboardPreview plan={displayPlan} />
            </TabsContent>
            <TabsContent value="structure" className="mt-4">
              <PlanListView plan={displayPlan} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
