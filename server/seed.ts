import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
  const existing = await storage.getUserByEmail("demo@performo.ai");
  if (existing) return;

  const passwordHash = await hashPassword("demo123");
  const user = await storage.createUser({ name: "Ahmed Al Noor", email: "demo@performo.ai", passwordHash });

  const company = await storage.createCompany({
    userId: user.id,
    companyName: "Al Noor Hospitality Group",
    industry: "Hospitality",
    companySize: "51-200",
    country: "UAE",
  });

  const deptNames = ["Sales", "Operations", "HR", "Finance"];
  const depts: Record<string, number> = {};
  for (const name of deptNames) {
    const d = await storage.createDepartment({ companyId: company.id, name });
    depts[name] = d.id;
  }

  const goals = [
    "Increase revenue by 15% YoY",
    "Improve guest satisfaction scores to 4.5+",
    "Reduce employee turnover below 20%",
    "Achieve GOP margin of 35%"
  ];
  for (const goalText of goals) {
    await storage.createBusinessGoal({ companyId: company.id, goalText });
  }

  const kpiData = [
    { dept: "Sales", name: "Occupancy Rate", desc: "Percentage of available rooms occupied", formula: "(Rooms Sold / Available Rooms) x 100", unit: "%", freq: "Monthly", target: "85", green: ">= 85%", amber: "70% - 84%", red: "< 70%", owner: "Revenue Manager", source: "PMS System" },
    { dept: "Sales", name: "Average Daily Rate (ADR)", desc: "Average revenue per occupied room", formula: "Room Revenue / Rooms Sold", unit: "$", freq: "Monthly", target: "180", green: ">= $180", amber: "$150 - $179", red: "< $150", owner: "Revenue Manager", source: "PMS System" },
    { dept: "Sales", name: "RevPAR", desc: "Revenue per available room", formula: "Total Room Revenue / Available Rooms", unit: "$", freq: "Monthly", target: "153", green: ">= $153", amber: "$120 - $152", red: "< $120", owner: "Director of Sales", source: "PMS System" },
    { dept: "Operations", name: "Guest Complaint Rate", desc: "Number of complaints per 100 guests", formula: "Complaints / Total Guests x 100", unit: "per 100", freq: "Monthly", target: "2", green: "<= 2", amber: "2.1 - 4", red: "> 4", owner: "Operations Manager", source: "Guest Feedback System" },
    { dept: "Operations", name: "Room Turnaround Time", desc: "Average time to clean and prepare a room", formula: "Total Cleaning Time / Rooms Cleaned", unit: "minutes", freq: "Weekly", target: "30", green: "<= 30 min", amber: "31 - 45 min", red: "> 45 min", owner: "Housekeeping Supervisor", source: "Housekeeping App" },
    { dept: "HR", name: "Employee Turnover Rate", desc: "Percentage of employees leaving per period", formula: "(Separations / Avg Headcount) x 100", unit: "%", freq: "Monthly", target: "18", green: "<= 18%", amber: "19% - 25%", red: "> 25%", owner: "HR Manager", source: "HRMS" },
    { dept: "HR", name: "Training Completion Rate", desc: "Percentage of required training completed", formula: "(Completed / Required) x 100", unit: "%", freq: "Monthly", target: "90", green: ">= 90%", amber: "75% - 89%", red: "< 75%", owner: "L&D Coordinator", source: "LMS" },
    { dept: "Finance", name: "GOP Margin", desc: "Gross Operating Profit as percentage of revenue", formula: "(GOP / Total Revenue) x 100", unit: "%", freq: "Monthly", target: "35", green: ">= 35%", amber: "28% - 34%", red: "< 28%", owner: "Financial Controller", source: "Accounting System" },
    { dept: "Finance", name: "Budget Variance", desc: "Deviation from planned budget", formula: "((Actual - Budget) / Budget) x 100", unit: "%", freq: "Monthly", target: "5", green: "<= 5%", amber: "5.1% - 10%", red: "> 10%", owner: "Financial Controller", source: "ERP" },
  ];

  const createdKpis: Record<string, number> = {};
  for (const k of kpiData) {
    const kpi = await storage.createKpi({
      companyId: company.id,
      departmentId: depts[k.dept],
      kpiName: k.name,
      description: k.desc,
      formula: k.formula,
      unit: k.unit,
      frequency: k.freq,
      targetValue: k.target,
      greenThreshold: k.green,
      amberThreshold: k.amber,
      redThreshold: k.red,
      ownerName: k.owner,
      dataSource: k.source,
      createdByAi: false,
    });
    createdKpis[k.name] = kpi.id;
  }

  const actuals = [
    { kpi: "Occupancy Rate", month: "2026-02", actual: "82", status: "Amber", comment: "Slightly below target due to seasonal dip" },
    { kpi: "Average Daily Rate (ADR)", month: "2026-02", actual: "192", status: "Green", comment: "Strong corporate bookings" },
    { kpi: "RevPAR", month: "2026-02", actual: "157", status: "Green", comment: "Performing above expectations" },
    { kpi: "Guest Complaint Rate", month: "2026-02", actual: "3.2", status: "Amber", comment: "F&B complaints increased" },
    { kpi: "Employee Turnover Rate", month: "2026-02", actual: "22", status: "Amber", comment: "Higher than target" },
    { kpi: "Training Completion Rate", month: "2026-02", actual: "88", status: "Amber", comment: "New hires pending orientation" },
    { kpi: "GOP Margin", month: "2026-02", actual: "33", status: "Amber", comment: "Utility costs higher than planned" },
    { kpi: "Budget Variance", month: "2026-02", actual: "7", status: "Amber", comment: "Marketing overspend in Feb" },
  ];

  for (const a of actuals) {
    if (createdKpis[a.kpi]) {
      await storage.createKpiActual({
        kpiId: createdKpis[a.kpi],
        reviewMonth: a.month,
        actualValue: a.actual,
        commentary: a.comment,
        status: a.status,
      });
    }
  }

  const meeting = await storage.createMeeting({
    companyId: company.id,
    title: "February Monthly Operations Review",
    meetingDate: "2026-02-28",
    departmentId: depts["Operations"],
    summary: "Reviewed Q1 performance targets and discussed action plans for improving guest satisfaction scores.",
  });

  const actions = [
    { title: "Implement new guest feedback system", desc: "Research and deploy digital guest feedback kiosks in lobby", owner: "Sarah Johnson", due: "2026-03-15", priority: "High", status: "In Progress", dept: "Operations" },
    { title: "Review F&B menu pricing", desc: "Analyze competitor pricing and adjust menu prices for Q2", owner: "Michael Chen", due: "2026-03-20", priority: "Medium", status: "Not Started", dept: "Sales" },
    { title: "Conduct staff retention interviews", desc: "Interview departing employees to identify retention issues", owner: "Fatima Al Rashid", due: "2026-03-10", priority: "High", status: "In Progress", dept: "HR" },
    { title: "Optimize housekeeping schedule", desc: "Redesign room cleaning schedules to reduce turnaround time", owner: "David Park", due: "2026-03-05", priority: "High", status: "Completed", dept: "Operations" },
    { title: "Update budget forecast for Q2", desc: "Revise financial projections based on Feb actuals", owner: "Lisa Wong", due: "2026-03-25", priority: "Medium", status: "Not Started", dept: "Finance" },
    { title: "Launch loyalty program campaign", desc: "Design and launch email campaign for loyalty program members", owner: "Omar Khalil", due: "2026-02-20", priority: "Medium", status: "Delayed", dept: "Sales" },
  ];

  for (const a of actions) {
    await storage.createActionItem({
      companyId: company.id,
      meetingId: meeting.id,
      departmentId: depts[a.dept],
      title: a.title,
      description: a.desc,
      ownerName: a.owner,
      dueDate: a.due,
      priority: a.priority,
      status: a.status,
    });
  }

  await storage.createMonthlyReview({
    companyId: company.id,
    reviewMonth: "2026-02",
    overallSummary: "February showed mixed results across departments. Revenue metrics exceeded targets with strong ADR and RevPAR performance, driven by corporate bookings. However, operational challenges in guest satisfaction and employee retention require immediate attention. The GOP margin fell slightly below target due to higher utility costs and marketing overspend.",
    strengths: "- ADR exceeded target at $192 vs $180 target\n- RevPAR strong at $157 vs $153 target\n- Housekeeping schedule optimization completed ahead of schedule\n- Corporate bookings pipeline remains robust for Q2",
    gaps: "- Guest complaint rate at 3.2 vs 2.0 target, primarily F&B related\n- Employee turnover at 22% vs 18% target\n- Training completion at 88% vs 90% target\n- Budget variance at 7% vs 5% target due to marketing overspend",
    recommendations: "- Prioritize F&B quality improvements and staff training\n- Implement retention bonuses for high-performing staff\n- Review marketing spend allocation for Q2\n- Accelerate digital guest feedback system deployment",
    aiGeneratedText: null,
  });

  console.log("Seed data created successfully");
}
