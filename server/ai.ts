import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateKpis(industry: string, department: string, goals: string[]): Promise<any[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are a business performance expert specializing in KPI design for SMEs. Generate practical, measurable KPIs that are realistic and business-friendly. Return ONLY a valid JSON array with no markdown formatting.`
      },
      {
        role: "user",
        content: `Generate 5-7 practical KPIs for a ${industry} company, specifically for the ${department} department. Business goals: ${goals.join(", ")}.

Return a JSON array where each item has:
- kpi_name (string)
- description (string)
- formula (string)
- unit (string, e.g. "%", "$", "days", "count")
- frequency (string, e.g. "Monthly", "Weekly", "Quarterly")
- target_value (string)
- green_threshold (string, e.g. ">= 90%")
- amber_threshold (string, e.g. "70% - 89%")
- red_threshold (string, e.g. "< 70%")
- owner_name (string, a typical role title)
- data_source (string)

Make KPIs specific to ${industry} and ${department}. Be realistic with targets.`
      }
    ],
  });

  const content = response.choices[0]?.message?.content || "[]";
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
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
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are a senior management consultant writing executive business reviews. Write clear, actionable, and professional summaries. Return ONLY valid JSON with no markdown formatting.`
      },
      {
        role: "user",
        content: `Generate a monthly business review for ${companyName} for ${month}.

KPI Performance Data:
${kpiData.map(k => `- ${k.kpiName}: Target=${k.target}, Actual=${k.actual}, Status=${k.status}${k.commentary ? `, Notes: ${k.commentary}` : ""}`).join("\n")}

Return a JSON object with:
- overall_summary (string, 2-3 paragraphs executive summary)
- strengths (string, bullet points of top performing areas)
- gaps (string, bullet points of underperforming areas with likely causes)
- recommendations (string, bullet points of recommended next actions)
- discussion_points (string, bullet points for next management meeting)`
      }
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
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
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are a business intelligence consultant specializing in dashboard design for SMEs. Return ONLY valid JSON with no markdown formatting.`
      },
      {
        role: "user",
        content: `Design a dashboard structure for a ${industry} company, ${department} department, for ${managementLevel} level management.

Return a JSON object with:
- title (string)
- pages (array of objects, each with: page_name, description, sections)
- sections should each have: section_name, type (e.g. "kpi_cards", "trend_chart", "bar_chart", "table", "risk_matrix", "summary"), recommended_kpis (array of strings), chart_type (string), rationale (string)
- executive_summary_structure (object with: key_metrics array, visualization_types array, refresh_frequency string)`
      }
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { title: "Dashboard Plan", pages: [], executive_summary_structure: {} };
  }
}
