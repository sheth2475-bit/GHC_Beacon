import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const kpiSchema = z.object({
  kpi_name: z.string(),
  description: z.string(),
  formula: z.string(),
  unit: z.string(),
  frequency: z.string(),
  target_value: z.string(),
  green_threshold: z.string(),
  amber_threshold: z.string(),
  red_threshold: z.string(),
  owner_name: z.string(),
  data_source: z.string(),
});

const reviewSchema = z.object({
  overall_summary: z.string(),
  strengths: z.string(),
  gaps: z.string(),
  recommendations: z.string(),
  discussion_points: z.string().optional(),
});

const dashboardSectionSchema = z.object({
  section_name: z.string(),
  type: z.string(),
  chart_type: z.string().optional(),
  recommended_kpis: z.array(z.string()).optional(),
  rationale: z.string().optional(),
});

const dashboardPageSchema = z.object({
  page_name: z.string(),
  description: z.string().optional(),
  sections: z.array(dashboardSectionSchema),
});

const dashboardPlanSchema = z.object({
  title: z.string(),
  pages: z.array(dashboardPageSchema),
  executive_summary_structure: z.object({
    key_metrics: z.array(z.string()).optional(),
    visualization_types: z.array(z.string()).optional(),
    refresh_frequency: z.string().optional(),
  }).optional(),
  implementation_notes: z.string().optional(),
});

function cleanJsonResponse(content: string): string {
  return content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

export async function generateKpis(industry: string, department: string, goals: string[]): Promise<any[]> {
  const goalsContext = goals.length > 0
    ? `The company has these specific business priorities:\n${goals.map((g, i) => `${i + 1}. ${g}`).join("\n")}\n\nEach KPI should directly support at least one of these priorities.`
    : "Generate KPIs based on industry best practices for this department.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a seasoned business performance consultant who has worked with hundreds of SMEs across the Middle East, Southeast Asia, and Europe. You specialize in designing KPIs that are:

1. PRACTICAL — Can be tracked with tools SMEs actually have (Excel, POS systems, basic ERPs, CRMs, HRMS). No KPIs requiring expensive BI tools or data warehouses.
2. ACTIONABLE — Each KPI must clearly indicate what action to take when it moves. Avoid vanity metrics.
3. INDUSTRY-SPECIFIC — Use real terminology, benchmarks, and formulas specific to ${industry}. Reference actual data sources used in ${industry} businesses.
4. ROLE-APPROPRIATE — Owner names should be realistic job titles found in SMEs (not "VP of Analytics" but "Sales Manager" or "Operations Supervisor").
5. THRESHOLD-REALISTIC — Green/amber/red thresholds should reflect actual industry benchmarks, not arbitrary percentages.

For the ${department} department in ${industry}:
- Think about what the department head reports to the CEO/GM every month
- What metrics actually drive decisions in this department
- What can be measured without custom software
- What benchmarks are realistic for a mid-sized company (50-200 employees)

Return a JSON object with a "kpis" array containing 5-7 KPIs. Each KPI must have: kpi_name, description, formula, unit, frequency, target_value, green_threshold, amber_threshold, red_threshold, owner_name, data_source.

IMPORTANT: 
- Formulas must be specific and calculable (e.g., "Total Room Revenue / Number of Rooms Sold" not "Revenue / Sales")
- Target values must be single numbers with units (e.g., "85" not "85% or above")
- Thresholds must be clear ranges (e.g., ">= 85%" or "<= 5 days")
- Data sources must name specific systems (e.g., "POS System - Monthly Sales Report" not just "System")`
      },
      {
        role: "user",
        content: `Generate KPIs for the ${department} department in a ${industry} company.\n\n${goalsContext}\n\nReturn JSON with a "kpis" array.`
      }
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(cleanJsonResponse(content));
    const kpisArray = parsed.kpis || parsed;
    const validated = z.array(kpiSchema).safeParse(Array.isArray(kpisArray) ? kpisArray : []);
    return validated.success ? validated.data : (Array.isArray(kpisArray) ? kpisArray : []);
  } catch {
    return [];
  }
}

export async function generateMonthlyReview(
  kpiData: { kpiName: string; target: string; actual: string; status: string; commentary: string }[],
  companyName: string,
  month: string
): Promise<any> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a senior management consultant writing a monthly performance review for the CEO/GM of an SME. Your writing style is:

1. DIRECT AND HONEST — State what happened clearly. No corporate jargon or filler phrases like "moving forward" or "leveraging synergies."
2. DATA-DRIVEN — Reference specific numbers. Say "Occupancy dropped to 78% from a target of 85%" not "occupancy was below target."
3. CAUSE-FOCUSED — For each gap, suggest the most likely root cause based on the data pattern. If F&B revenue dropped while room revenue grew, note the disconnect.
4. ACTION-ORIENTED — Each recommendation should be a specific action with a suggested owner and timeline, not vague advice like "improve customer service."
5. BALANCED — Acknowledge wins genuinely. If revenue exceeded target, celebrate it but also ask whether it's sustainable.

Write as if you're presenting to a busy business owner who has 10 minutes to read this. Use bullet points for strengths, gaps, and recommendations. The executive summary should be 2-3 concise paragraphs that tell the story of the month.

Return a JSON object with: overall_summary, strengths (bullet points as string), gaps (bullet points as string), recommendations (bullet points as string), discussion_points (bullet points for next management meeting).`
      },
      {
        role: "user",
        content: `Write the ${month} monthly performance review for ${companyName}.

KPI Performance Data:
${kpiData.map(k => `- ${k.kpiName}: Target = ${k.target}, Actual = ${k.actual}, Status = ${k.status}${k.commentary ? ` | Commentary: ${k.commentary}` : ""}`).join("\n")}

Analyze the data, identify patterns, and write a professional management review. Be specific with numbers and root cause analysis.`
      }
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(cleanJsonResponse(content));
    const validated = reviewSchema.safeParse(parsed);
    return validated.success ? validated.data : parsed;
  } catch {
    return { overall_summary: content, strengths: "", gaps: "", recommendations: "" };
  }
}

export async function generateDashboardPlan(
  industry: string,
  department: string,
  managementLevel: string
): Promise<any> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a business intelligence consultant who builds dashboards for SMEs using Power BI, Google Data Studio, or web-based tools. Your dashboard designs are:

1. IMPLEMENTABLE — Every section you recommend can be built in Power BI or a simple web dashboard. Specify exact chart types (clustered bar, line with markers, donut, KPI card, matrix table).
2. HIERARCHY-AWARE — ${managementLevel} level dashboards should show:
   - Executive: High-level KPIs, trends, comparisons, financial summary. Max 1-2 pages.
   - Department: Detailed operational metrics, team performance, drill-downs. 2-3 pages.
   - Operational: Real-time or daily metrics, task completion, queue status. 1-2 pages.
3. STORY-DRIVEN — Pages should flow logically. Start with summary, then details, then action items.
4. DATA-PRACTICAL — Only recommend charts if the underlying data exists in typical SME systems (POS, PMS, HRMS, ERP, CRM, Excel).
5. ACTIONABLE — Each visualization should answer a specific business question. State what question each section answers.

For each section, specify:
- section_name: Clear label for the dashboard section
- type: One of "kpi_cards", "trend_chart", "bar_chart", "pie_chart", "table", "comparison_chart", "gauge", "heatmap"
- chart_type: Specific Power BI/chart type (e.g., "Clustered Bar Chart", "Line Chart with Data Markers", "Donut Chart")
- recommended_kpis: Specific metrics to display
- rationale: What business question this answers

Return a JSON object with: title, pages (array), executive_summary_structure (object with key_metrics, visualization_types, refresh_frequency), implementation_notes (string with setup guidance).`
      },
      {
        role: "user",
        content: `Design a ${managementLevel}-level dashboard for the ${department} department of a ${industry} company.

The dashboard should be practical for a mid-sized company (50-200 employees) and implementable in Power BI or a web dashboard within 1-2 weeks.

Return structured JSON.`
      }
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(cleanJsonResponse(content));
    const validated = dashboardPlanSchema.safeParse(parsed);
    return validated.success ? validated.data : parsed;
  } catch {
    return { title: "Dashboard Plan", pages: [], executive_summary_structure: {} };
  }
}
