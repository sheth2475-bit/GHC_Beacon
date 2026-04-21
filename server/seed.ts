import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { platformOwners, workflowSubmissions } from "@shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedProjectData(companyId: number) {
  const deptList = await storage.getDepartments(companyId);
  const depts: Record<string, number> = {};
  for (const d of deptList) depts[d.name] = d.id;

  const projectData = [
    { name: "Loyalty Program Launch", description: "Design and launch a digital loyalty program to drive repeat bookings and increase guest retention across all OYO properties.", owner: "Noura Bin Rashid", dept: "Sales & Revenue", businessUnit: "Marketing", startDate: "2026-01-15", dueDate: "2026-04-30", status: "In Progress", priority: "High", progress: 55, strategicGoal: "Achieve 25% repeat guest rate and reduce customer acquisition cost by 15%", riskNotes: "PMS integration dependency may delay launch if IT capacity is constrained" },
    { name: "F&B Menu Overhaul", description: "Revamp the restaurant and bar menus to increase F&B revenue per cover from AED 128 to AED 145+. Includes new pricing strategy, supplier renegotiation, and seasonal menu items.", owner: "Khalid Mansoor", dept: "Operations", businessUnit: "F&B", startDate: "2026-02-01", dueDate: "2026-03-31", status: "In Progress", priority: "High", progress: 40, strategicGoal: "Increase F&B revenue per cover to AED 145+ and grow F&B contribution to 18% of total revenue", riskNotes: "Supplier renegotiation may extend timeline; backup supplier list required" },
    { name: "Staff Retention Initiative", description: "Reduce employee turnover below 18% through structured retention bonuses, career development programs, and improved working conditions for housekeeping and F&B staff.", owner: "Fatima Al Rashid", dept: "HR & Admin", businessUnit: "People & Culture", startDate: "2026-02-15", dueDate: "2026-06-30", status: "In Progress", priority: "Critical", progress: 30, strategicGoal: "Reduce employee turnover from 23% to below 18% and improve eNPS score by 15 points", riskNotes: "Competitor hotels actively recruiting trained staff; budget approval for bonuses still pending" },
    { name: "Q2 Revenue Recovery Plan", description: "Develop and execute a comprehensive revenue plan for Q2 to recover from February's 5.8% budget shortfall. Includes corporate RFPs, weekend packages, and OTA rate optimization.", owner: "Priya Sharma", dept: "Sales & Revenue", businessUnit: "Revenue", startDate: "2026-03-01", dueDate: "2026-06-30", status: "Not Started", priority: "Critical", progress: 0, strategicGoal: "Recover Q2 revenue to within 3% of budget and restore GOP margin to 35%+", riskNotes: "Market demand softness in April may limit pricing power; corporate RFP outcomes uncertain" },
  ];

  const createdProjects: Record<string, number> = {};
  for (const p of projectData) {
    const proj = await storage.createProject({
      companyId,
      name: p.name,
      description: p.description,
      owner: p.owner,
      departmentId: depts[p.dept] || null,
      businessUnit: p.businessUnit,
      startDate: p.startDate,
      dueDate: p.dueDate,
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      strategicGoal: (p as any).strategicGoal || null,
      riskNotes: (p as any).riskNotes || null,
      tags: null,
      linkedKpiId: null,
    });
    createdProjects[p.name] = proj.id;
  }

  const taskData = [
    { project: "Loyalty Program Launch", title: "Define loyalty tiers and rewards structure", assignee: "Noura Bin Rashid", status: "Completed", priority: "High", dueDate: "2026-02-15", progress: 100 },
    { project: "Loyalty Program Launch", title: "Select loyalty platform vendor", assignee: "Noura Bin Rashid", status: "Completed", priority: "High", dueDate: "2026-02-28", progress: 100 },
    { project: "Loyalty Program Launch", title: "Develop member email communication plan", assignee: "Noura Bin Rashid", status: "In Progress", priority: "Medium", dueDate: "2026-03-20", progress: 60 },
    { project: "Loyalty Program Launch", title: "Integrate loyalty program with PMS", assignee: "IT Team", status: "In Progress", priority: "Critical", dueDate: "2026-04-01", progress: 35 },
    { project: "Loyalty Program Launch", title: "Launch pilot with 500 existing guests", assignee: "Guest Relations Manager", status: "Not Started", priority: "High", dueDate: "2026-04-20", progress: 0 },
    { project: "F&B Menu Overhaul", title: "Benchmark competitor restaurant pricing", assignee: "Khalid Mansoor", status: "Completed", priority: "High", dueDate: "2026-02-20", progress: 100 },
    { project: "F&B Menu Overhaul", title: "Renegotiate supplier contracts for Q2", assignee: "Khalid Mansoor", status: "In Progress", priority: "Critical", dueDate: "2026-03-15", progress: 50 },
    { project: "F&B Menu Overhaul", title: "Design new seasonal menu items", assignee: "Head Chef", status: "In Progress", priority: "Medium", dueDate: "2026-03-10", progress: 70 },
    { project: "F&B Menu Overhaul", title: "Print and deploy updated menus", assignee: "Khalid Mansoor", status: "Not Started", priority: "Medium", dueDate: "2026-03-28", progress: 0 },
    { project: "Staff Retention Initiative", title: "Conduct exit interviews for Q1 departures", assignee: "Fatima Al Rashid", status: "Completed", priority: "High", dueDate: "2026-03-05", progress: 100 },
    { project: "Staff Retention Initiative", title: "Design retention bonus structure", assignee: "Fatima Al Rashid", status: "In Progress", priority: "Critical", dueDate: "2026-03-15", progress: 80 },
    { project: "Staff Retention Initiative", title: "Launch career development framework", assignee: "L&D Coordinator", status: "Not Started", priority: "Medium", dueDate: "2026-04-30", progress: 0 },
    { project: "Staff Retention Initiative", title: "Introduce flexible shift scheduling", assignee: "Operations Manager", status: "Not Started", priority: "Medium", dueDate: "2026-05-31", progress: 0 },
    { project: "Q2 Revenue Recovery Plan", title: "Submit corporate RFP responses (Emirates NBD, ADNOC)", assignee: "Sarah Al Maktoum", status: "In Progress", priority: "Critical", dueDate: "2026-03-10", progress: 70 },
    { project: "Q2 Revenue Recovery Plan", title: "Launch weekend staycation packages", assignee: "Noura Bin Rashid", status: "Not Started", priority: "High", dueDate: "2026-03-18", progress: 0 },
    { project: "Q2 Revenue Recovery Plan", title: "Present dynamic pricing model to GM", assignee: "Priya Sharma", status: "Not Started", priority: "High", dueDate: "2026-03-25", progress: 0 },
    { project: "Q2 Revenue Recovery Plan", title: "OTA rate optimization for April–June", assignee: "Priya Sharma", status: "Not Started", priority: "Medium", dueDate: "2026-04-01", progress: 0 },
  ];

  const createdTasks: Record<string, number> = {};
  for (const t of taskData) {
    const projectId = createdProjects[t.project];
    if (!projectId) continue;
    const task = await storage.createTask({ companyId, projectId, title: t.title, description: null, owner: t.assignee, assignee: t.assignee, status: t.status, priority: t.priority, startDate: null, dueDate: t.dueDate, progress: t.progress, tags: null });
    createdTasks[`${t.project}::${t.title}`] = task.id;
  }

  const subtaskData = [
    { initiative: "Loyalty Program Launch", task: "Define loyalty tiers and rewards structure", title: "Draft tier structure document (Bronze/Silver/Gold)", owner: "Noura Bin Rashid", dueDate: "2026-02-10", status: "Completed", completed: true },
    { initiative: "Loyalty Program Launch", task: "Define loyalty tiers and rewards structure", title: "Benchmark competitor loyalty programs (Marriott, IHG)", owner: "Marketing Analyst", dueDate: "2026-02-12", status: "Completed", completed: true },
    { initiative: "Loyalty Program Launch", task: "Select loyalty platform vendor", title: "Issue RFP to 3 shortlisted vendors", owner: "Noura Bin Rashid", dueDate: "2026-02-15", status: "Completed", completed: true },
    { initiative: "Loyalty Program Launch", task: "Select loyalty platform vendor", title: "Conduct vendor demos and score evaluation matrix", owner: "IT Team", dueDate: "2026-02-25", status: "Completed", completed: true },
    { initiative: "Loyalty Program Launch", task: "Develop member email communication plan", title: "Design welcome email sequence (3 emails)", owner: "Noura Bin Rashid", dueDate: "2026-03-12", status: "In Progress", completed: false },
    { initiative: "Loyalty Program Launch", task: "Develop member email communication plan", title: "Set up email automation in CRM", owner: "IT Team", dueDate: "2026-03-18", status: "Not Started", completed: false },
    { initiative: "Loyalty Program Launch", task: "Integrate loyalty program with PMS", title: "Map loyalty points logic to Opera PMS fields", owner: "IT Team", dueDate: "2026-03-20", status: "In Progress", completed: false },
    { initiative: "Loyalty Program Launch", task: "Integrate loyalty program with PMS", title: "UAT testing in staging environment", owner: "IT Team", dueDate: "2026-03-30", status: "Not Started", completed: false },
    { initiative: "F&B Menu Overhaul", task: "Benchmark competitor restaurant pricing", title: "Visit 5 competitor F&B outlets and record pricing", owner: "Khalid Mansoor", dueDate: "2026-02-15", status: "Completed", completed: true },
    { initiative: "F&B Menu Overhaul", task: "Benchmark competitor restaurant pricing", title: "Compile benchmark report with recommendations", owner: "Khalid Mansoor", dueDate: "2026-02-18", status: "Completed", completed: true },
    { initiative: "F&B Menu Overhaul", task: "Renegotiate supplier contracts for Q2", title: "Schedule meetings with top 5 suppliers", owner: "Khalid Mansoor", dueDate: "2026-03-05", status: "Completed", completed: true },
    { initiative: "F&B Menu Overhaul", task: "Renegotiate supplier contracts for Q2", title: "Negotiate 8-12% cost reduction on key ingredients", owner: "Khalid Mansoor", dueDate: "2026-03-12", status: "In Progress", completed: false },
    { initiative: "F&B Menu Overhaul", task: "Design new seasonal menu items", title: "Chef brainstorming session for 8 new dishes", owner: "Head Chef", dueDate: "2026-03-05", status: "Completed", completed: true },
    { initiative: "F&B Menu Overhaul", task: "Design new seasonal menu items", title: "Costing and margin analysis for new items", owner: "Khalid Mansoor", dueDate: "2026-03-08", status: "In Progress", completed: false },
    { initiative: "Staff Retention Initiative", task: "Conduct exit interviews for Q1 departures", title: "Interview 3 departed housekeeping staff", owner: "Fatima Al Rashid", dueDate: "2026-03-03", status: "Completed", completed: true },
    { initiative: "Staff Retention Initiative", task: "Conduct exit interviews for Q1 departures", title: "Synthesise findings into HR gap report", owner: "Fatima Al Rashid", dueDate: "2026-03-05", status: "Completed", completed: true },
    { initiative: "Staff Retention Initiative", task: "Design retention bonus structure", title: "Draft bonus tiers by tenure and department", owner: "Fatima Al Rashid", dueDate: "2026-03-10", status: "Completed", completed: true },
    { initiative: "Staff Retention Initiative", task: "Design retention bonus structure", title: "Submit bonus budget for Finance approval", owner: "Fatima Al Rashid", dueDate: "2026-03-15", status: "In Progress", completed: false },
    { initiative: "Q2 Revenue Recovery Plan", task: "Submit corporate RFP responses (Emirates NBD, ADNOC)", title: "Gather room rate data and availability grids", owner: "Sarah Al Maktoum", dueDate: "2026-03-07", status: "Completed", completed: true },
    { initiative: "Q2 Revenue Recovery Plan", task: "Submit corporate RFP responses (Emirates NBD, ADNOC)", title: "Finalise and submit RFP documents to 3 corporates", owner: "Sarah Al Maktoum", dueDate: "2026-03-10", status: "In Progress", completed: false },
    { initiative: "Q2 Revenue Recovery Plan", task: "Launch weekend staycation packages", title: "Design 2-night package with F&B credit", owner: "Noura Bin Rashid", dueDate: "2026-03-14", status: "Not Started", completed: false },
    { initiative: "Q2 Revenue Recovery Plan", task: "Launch weekend staycation packages", title: "Load packages on OTA channels (Booking.com, Expedia)", owner: "IT Team", dueDate: "2026-03-18", status: "Not Started", completed: false },
  ];

  for (const s of subtaskData) {
    const taskKey = `${s.initiative}::${s.task}`;
    const taskId = createdTasks[taskKey];
    if (!taskId) continue;
    await storage.createSubtask({ taskId, title: s.title, owner: s.owner, dueDate: s.dueDate, status: s.status, completed: s.completed });
  }

  const milestoneData = [
    { project: "Loyalty Program Launch", title: "Loyalty Platform Vendor Selected", dueDate: "2026-02-28", status: "Completed", progress: 100 },
    { project: "Loyalty Program Launch", title: "PMS Integration Live", dueDate: "2026-04-01", status: "Upcoming", progress: 35 },
    { project: "Loyalty Program Launch", title: "Loyalty Program Public Launch", dueDate: "2026-04-30", status: "Upcoming", progress: 0 },
    { project: "F&B Menu Overhaul", title: "New Menus Approved & Printed", dueDate: "2026-03-28", status: "Upcoming", progress: 40 },
    { project: "Staff Retention Initiative", title: "Retention Bonuses Approved by Finance", dueDate: "2026-03-20", status: "Upcoming", progress: 80 },
    { project: "Q2 Revenue Recovery Plan", title: "Corporate RFPs Submitted", dueDate: "2026-03-10", status: "Upcoming", progress: 70 },
    { project: "Q2 Revenue Recovery Plan", title: "Staycation Packages Live on OTAs", dueDate: "2026-03-25", status: "Upcoming", progress: 0 },
  ];

  for (const m of milestoneData) {
    const projectId = createdProjects[m.project];
    if (!projectId) continue;
    await storage.createMilestone({ companyId, projectId, title: m.title, dueDate: m.dueDate, status: m.status, progress: m.progress });
  }
}

async function seedKpiData(companyId: number, depts: Record<string, number>) {
  const kpiData = [
    { dept: "Sales & Revenue", name: "Occupancy Rate", desc: "Percentage of available rooms sold in the period.", formula: "(Rooms Sold / Total Available Room Nights) × 100", unit: "%", freq: "Monthly", target: "85", green: ">= 85%", amber: "75% - 84%", red: "< 75%", owner: "Revenue Manager", source: "PMS (Opera / Cloudbeds)" },
    { dept: "Sales & Revenue", name: "Average Daily Rate (ADR)", desc: "Average revenue earned per occupied room.", formula: "Total Room Revenue / Number of Rooms Sold", unit: "AED", freq: "Monthly", target: "680", green: ">= AED 680", amber: "AED 580 - 679", red: "< AED 580", owner: "Revenue Manager", source: "PMS - Revenue Report" },
    { dept: "Sales & Revenue", name: "RevPAR", desc: "Revenue per available room.", formula: "Total Room Revenue / Total Available Room Nights", unit: "AED", freq: "Monthly", target: "578", green: ">= AED 578", amber: "AED 450 - 577", red: "< AED 450", owner: "Director of Sales", source: "PMS - Revenue Report" },
    { dept: "Sales & Revenue", name: "Repeat Guest Rate", desc: "Percentage of bookings from returning guests.", formula: "(Return Guest Bookings / Total Bookings) × 100", unit: "%", freq: "Monthly", target: "25", green: ">= 25%", amber: "18% - 24%", red: "< 18%", owner: "Guest Relations Manager", source: "CRM / PMS Guest History" },
    { dept: "Operations", name: "Guest Satisfaction Score (GSS)", desc: "Average review rating across Booking.com, Google, and TripAdvisor.", formula: "Sum of All Ratings / Number of Reviews", unit: "/ 5.0", freq: "Monthly", target: "4.5", green: ">= 4.5", amber: "4.0 - 4.4", red: "< 4.0", owner: "Guest Relations Manager", source: "ReviewPro / OTA Extranet" },
    { dept: "Operations", name: "Room Turnaround Time", desc: "Average minutes to clean and release a room.", formula: "Total Cleaning + Inspection Time / Rooms Cleaned", unit: "min", freq: "Weekly", target: "28", green: "<= 28 min", amber: "29 - 40 min", red: "> 40 min", owner: "Housekeeping Supervisor", source: "Housekeeping App / Manual Log" },
    { dept: "Operations", name: "F&B Revenue per Cover", desc: "Average revenue per restaurant/bar guest.", formula: "Total F&B Revenue / Number of Covers Served", unit: "AED", freq: "Monthly", target: "145", green: ">= AED 145", amber: "AED 110 - 144", red: "< AED 110", owner: "F&B Manager", source: "POS System (Micros / Toast)" },
    { dept: "HR & Admin", name: "Employee Turnover Rate", desc: "Percentage of employees leaving within the period.", formula: "(Number of Separations / Average Headcount) × 100", unit: "%", freq: "Monthly", target: "18", green: "<= 18%", amber: "19% - 25%", red: "> 25%", owner: "HR Manager", source: "HRMS (BambooHR / Workday)" },
    { dept: "HR & Admin", name: "Training Hours per Employee", desc: "Average training hours completed per employee.", formula: "Total Training Hours Delivered / Total Headcount", unit: "hrs", freq: "Monthly", target: "8", green: ">= 8 hrs", amber: "5 - 7 hrs", red: "< 5 hrs", owner: "L&D Coordinator", source: "LMS / Training Records" },
    { dept: "Finance", name: "GOP Margin", desc: "Gross Operating Profit as a percentage of total revenue.", formula: "(Total Revenue - Operating Expenses) / Total Revenue × 100", unit: "%", freq: "Monthly", target: "35", green: ">= 35%", amber: "28% - 34%", red: "< 28%", owner: "Financial Controller", source: "PMS + Accounting (Sun / QuickBooks)" },
    { dept: "Finance", name: "Cost per Occupied Room (CPOR)", desc: "Total operating cost divided by rooms sold.", formula: "Total Operating Expenses / Rooms Sold", unit: "AED", freq: "Monthly", target: "220", green: "<= AED 220", amber: "AED 221 - 280", red: "> AED 280", owner: "Financial Controller", source: "Accounting System" },
    { dept: "Finance", name: "Revenue vs Budget Variance", desc: "Percentage deviation of actual revenue from budgeted revenue.", formula: "((Actual Revenue - Budget) / Budget) × 100", unit: "%", freq: "Monthly", target: "0", green: ">= -3% (within 3%)", amber: "-3.1% to -8%", red: "< -8%", owner: "Financial Controller", source: "ERP / Budget Tracker" },
  ];
  const createdKpis: Record<string, number> = {};
  for (const k of kpiData) {
    const deptId = depts[k.dept] || Object.values(depts)[0];
    const kpi = await storage.createKpi({ companyId, departmentId: deptId, kpiName: k.name, description: k.desc, formula: k.formula, unit: k.unit, frequency: k.freq, targetValue: k.target, greenThreshold: k.green, amberThreshold: k.amber, redThreshold: k.red, ownerName: k.owner, dataSource: k.source, createdByAi: false });
    createdKpis[k.name] = kpi.id;
  }
  const monthlyActuals = [
    { month: "2025-12", data: [
      { kpi: "Occupancy Rate", actual: "92", status: "On Track", comment: "Peak holiday season" },
      { kpi: "Average Daily Rate (ADR)", actual: "740", status: "On Track", comment: "Premium pricing during festive period" },
      { kpi: "RevPAR", actual: "681", status: "On Track", comment: "Best RevPAR month of the year" },
      { kpi: "Repeat Guest Rate", actual: "22", status: "Amber", comment: "Mostly new leisure tourists" },
      { kpi: "Guest Satisfaction Score (GSS)", actual: "4.4", status: "Amber", comment: "Slight dip due to high occupancy" },
      { kpi: "Room Turnaround Time", actual: "32", status: "Amber", comment: "Higher due to full house operations" },
      { kpi: "F&B Revenue per Cover", actual: "158", status: "On Track", comment: "Festive menus drove higher averages" },
      { kpi: "Employee Turnover Rate", actual: "16", status: "On Track", comment: "Year-end bonuses helped retention" },
      { kpi: "Training Hours per Employee", actual: "6", status: "Amber", comment: "Reduced due to peak operations" },
      { kpi: "GOP Margin", actual: "38", status: "On Track", comment: "Strong profitability from high occupancy" },
      { kpi: "Cost per Occupied Room (CPOR)", actual: "205", status: "On Track", comment: "Economies of scale at high occupancy" },
      { kpi: "Revenue vs Budget Variance", actual: "4.2", status: "On Track", comment: "Revenue exceeded budget by 4.2%" },
    ]},
    { month: "2026-01", data: [
      { kpi: "Occupancy Rate", actual: "88", status: "On Track", comment: "Strong January with winter tourism" },
      { kpi: "Average Daily Rate (ADR)", actual: "710", status: "On Track", comment: "Maintained strong rates" },
      { kpi: "RevPAR", actual: "625", status: "On Track", comment: "Solid performance above annual target" },
      { kpi: "Repeat Guest Rate", actual: "24", status: "Amber", comment: "Loyalty program gaining traction" },
      { kpi: "Guest Satisfaction Score (GSS)", actual: "4.5", status: "On Track", comment: "Recovered after Dec dip" },
      { kpi: "Room Turnaround Time", actual: "27", status: "On Track", comment: "New cleaning schedule effective" },
      { kpi: "F&B Revenue per Cover", actual: "142", status: "Amber", comment: "Normal pricing after festive season" },
      { kpi: "Employee Turnover Rate", actual: "19", status: "Amber", comment: "Some post-bonus departures" },
      { kpi: "Training Hours per Employee", actual: "9", status: "On Track", comment: "Annual training plan started" },
      { kpi: "GOP Margin", actual: "36", status: "On Track", comment: "Healthy margins maintained" },
      { kpi: "Cost per Occupied Room (CPOR)", actual: "215", status: "On Track", comment: "Controlled expenses" },
      { kpi: "Revenue vs Budget Variance", actual: "2.1", status: "On Track", comment: "2.1% above budget" },
    ]},
    { month: "2026-02", data: [
      { kpi: "Occupancy Rate", actual: "79", status: "Amber", comment: "Seasonal dip as winter tourism winds down" },
      { kpi: "Average Daily Rate (ADR)", actual: "660", status: "Amber", comment: "Competitive pricing pressure" },
      { kpi: "RevPAR", actual: "521", status: "Amber", comment: "Below target due to occupancy and rate decline" },
      { kpi: "Repeat Guest Rate", actual: "27", status: "On Track", comment: "Loyalty emails driving repeat bookings" },
      { kpi: "Guest Satisfaction Score (GSS)", actual: "4.6", status: "On Track", comment: "Lower occupancy = better service per guest" },
      { kpi: "Room Turnaround Time", actual: "25", status: "On Track", comment: "Best month, lighter load" },
      { kpi: "F&B Revenue per Cover", actual: "128", status: "Below Target", comment: "Business traveler guest mix shift" },
      { kpi: "Employee Turnover Rate", actual: "23", status: "Amber", comment: "3 housekeepers left for competitor" },
      { kpi: "Training Hours per Employee", actual: "10", status: "On Track", comment: "Used quiet period for intensive training" },
      { kpi: "GOP Margin", actual: "31", status: "Amber", comment: "Revenue shortfall hit margin" },
      { kpi: "Cost per Occupied Room (CPOR)", actual: "245", status: "Amber", comment: "Fixed costs on fewer rooms" },
      { kpi: "Revenue vs Budget Variance", actual: "-5.8", status: "Amber", comment: "5.8% below budget for February" },
    ]},
  ];
  for (const monthData of monthlyActuals) {
    for (const a of monthData.data) {
      if (createdKpis[a.kpi]) {
        await storage.createKpiActual({ kpiId: createdKpis[a.kpi], reviewMonth: monthData.month, actualValue: a.actual, commentary: a.comment, status: a.status });
      }
    }
  }
}

async function seedMeetingsAndActions(companyId: number, depts: Record<string, number>) {
  const actions = [
    { title: "Launch business traveler lunch promotion", desc: "Design AED 75 fixed-price lunch menu to increase midweek F&B covers.", owner: "Khalid Mansoor (F&B Manager)", due: "2026-03-10", revisedDue: "2026-03-15", priority: "High", status: "In Progress", dept: "Operations", meetingType: "Monthly Operations Review" },
    { title: "Review and update menu pricing for Q2", desc: "Benchmark competitor pricing. Propose 8-12% adjustments on underperforming items.", owner: "Khalid Mansoor (F&B Manager)", due: "2026-03-15", revisedDue: null, priority: "Medium", status: "Not Started", dept: "Operations", meetingType: "Monthly Operations Review" },
    { title: "Submit corporate RFP responses", desc: "Complete RFP responses for Emirates NBD, ADNOC, Etisalat.", owner: "Sarah Al Maktoum (Sales Manager)", due: "2026-03-10", revisedDue: null, priority: "Critical", status: "In Progress", dept: "Sales & Revenue", meetingType: "PMO Steering Committee" },
    { title: "Design weekend staycation packages", desc: "Create 2-night stay packages with F&B credit for local market.", owner: "Noura Bin Rashid (Marketing Exec)", due: "2026-03-12", revisedDue: "2026-03-18", priority: "High", status: "In Progress", dept: "Sales & Revenue", meetingType: "PMO Steering Committee" },
    { title: "Present dynamic pricing model to GM", desc: "Build shoulder season pricing grid with weekday/weekend rate differentials.", owner: "Priya Sharma (Revenue Manager)", due: "2026-03-18", revisedDue: null, priority: "Medium", status: "Not Started", dept: "Sales & Revenue", meetingType: "CEO Meeting" },
    { title: "Implement housekeeping retention bonuses", desc: "AED 500/month retention bonus for housekeeping staff with >1yr tenure.", owner: "Fatima Al Rashid (HR Manager)", due: "2026-03-08", revisedDue: null, priority: "High", status: "Completed", dept: "HR & Admin", meetingType: "Department Review" },
    { title: "Conduct exit interviews for departed staff", desc: "Structured exit interviews for 3 departed housekeepers.", owner: "Fatima Al Rashid (HR Manager)", due: "2026-03-05", revisedDue: null, priority: "Medium", status: "Completed", dept: "HR & Admin", meetingType: "Department Review" },
    { title: "Defer Q1 capex: lobby renovation", desc: "Postpone lobby furniture replacement (AED 180K) to Q2.", owner: "Lisa Wong (Financial Controller)", due: "2026-03-01", revisedDue: null, priority: "High", status: "Completed", dept: "Finance", meetingType: "Finance Committee" },
    { title: "Analyze F&B food cost ratio", desc: "Food cost at 34% vs 30% target. Investigate wastage and portion control.", owner: "Lisa Wong (Financial Controller)", due: "2026-03-20", revisedDue: "2026-03-25", priority: "High", status: "In Progress", dept: "Finance", meetingType: "Finance Committee" },
    { title: "Loyalty program email campaign - March", desc: "Send email to 2,400 loyalty members with exclusive March rates and F&B voucher.", owner: "Noura Bin Rashid (Marketing Exec)", due: "2026-03-05", revisedDue: "2026-03-12", priority: "Medium", status: "Delayed", dept: "Sales & Revenue", meetingType: "CEO Meeting" },
  ];
  for (const a of actions) {
    const deptId = depts[a.dept] || Object.values(depts)[0];
    await storage.createActionItem({ companyId, departmentId: deptId, meetingType: a.meetingType, title: a.title, description: a.desc, ownerName: a.owner, dueDate: a.due, revisedDueDate: a.revisedDue, priority: a.priority, status: a.status });
  }
}

async function seedMonthlyReview(companyId: number) {
  await storage.createMonthlyReview({
    companyId,
    reviewMonth: "2026-02",
    overallSummary: "February delivered a mixed performance picture across KPIs, projects, and operational execution. On the revenue side, ADR exceeded target at $192 vs $180 and RevPAR held strong at $157 vs $153, driven by robust corporate bookings. However, occupancy declined to 79% against an 85% target — a seasonal dip that compressed the GOP margin to 31% against a 35% goal, with revenue 5.8% below budget.\n\nProject execution is a growing concern heading into March. Of 6 active strategic projects, 2 are flagged Red health — Q2 Revenue Recovery Plan (0% complete) and F&B Menu Overhaul (40%) — with 6 overdue tasks across the portfolio. The Loyalty Program Launch (55%) remains the bright spot, while the Staff Retention Initiative has slipped to 30% completion, mirroring the HR turnover pressure seen in the KPI data.\n\nAction accountability requires urgent attention: 3 of 6 tracked actions are overdue, creating downstream risk to key project milestones. The guest feedback system (Sarah Johnson) and loyalty campaign (Omar Khalil) are both past their revised due dates. Without closing these open loops this week, the Loyalty Program April launch timeline is at risk.",
    strengths: "- ADR exceeded target at $192 vs $180 — corporate segment mix performing strongly\n- RevPAR at $157 vs $153 target — holding up despite occupancy softness\n- Loyalty Program Launch at 55% completion, on track for April go-live milestone\n- Guest satisfaction reached 4.6/5.0 — highest in three months, benefiting from lower occupancy pressure\n- Housekeeping schedule optimization completed ahead of schedule (David Park)",
    gaps: "- Occupancy at 79% vs 85% target — seasonal decline deeper than forecasted\n- GOP margin at 31% vs 35% target — fixed cost base not covered at current revenue level\n- 2 of 6 strategic projects at Red health: Q2 Revenue Recovery Plan and F&B Menu Overhaul\n- 6 overdue tasks across the project portfolio — execution pace below plan\n- 3 of 6 action items overdue — guest feedback system and loyalty campaign both delayed past revised dates\n- Employee turnover at 23% vs 18% target — Staff Retention Initiative not yet delivering impact",
    recommendations: "- Resolve all 3 overdue actions this week: Dharmesh Sheth to personally follow up with Sarah Johnson (guest feedback system) and Omar Khalil (loyalty campaign) before end of month\n- Accelerate F&B Menu Overhaul: Khalid Mansoor to finalise new pricing by 28 March, targeting AED 145/cover from current AED 128\n- Fast-track Q2 Revenue Recovery Plan: Priya Sharma to submit corporate RFPs to Emirates NBD, ADNOC, and Etisalat by 15 March\n- Implement housekeeping retention bonuses (AED 500/month for >1yr tenure) immediately to address 23% turnover before further attrition\n- Hold emergency PMO review for the 6 overdue project tasks — assign hard deadlines and owners at next Steering Committee",
    aiGeneratedText: null,
  });
}

async function seedSubtasksForExistingTasks(allTasks: { id: number; title: string }[]) {
  const subtaskMap: Record<string, { title: string; owner: string; dueDate: string; status: string; completed: boolean }[]> = {
    "Define loyalty tiers and rewards structure": [
      { title: "Draft tier structure document (Bronze/Silver/Gold)", owner: "Noura Bin Rashid", dueDate: "2026-02-10", status: "Completed", completed: true },
      { title: "Benchmark competitor loyalty programs (Marriott, IHG)", owner: "Marketing Analyst", dueDate: "2026-02-12", status: "Completed", completed: true },
    ],
    "Select loyalty platform vendor": [
      { title: "Issue RFP to 3 shortlisted vendors", owner: "Noura Bin Rashid", dueDate: "2026-02-15", status: "Completed", completed: true },
      { title: "Conduct vendor demos and score evaluation matrix", owner: "IT Team", dueDate: "2026-02-25", status: "Completed", completed: true },
    ],
    "Develop member email communication plan": [
      { title: "Design welcome email sequence (3 emails)", owner: "Noura Bin Rashid", dueDate: "2026-03-12", status: "In Progress", completed: false },
      { title: "Set up email automation in CRM", owner: "IT Team", dueDate: "2026-03-18", status: "Not Started", completed: false },
    ],
    "Integrate loyalty program with PMS": [
      { title: "Map loyalty points logic to Opera PMS fields", owner: "IT Team", dueDate: "2026-03-20", status: "In Progress", completed: false },
      { title: "UAT testing in staging environment", owner: "IT Team", dueDate: "2026-03-30", status: "Not Started", completed: false },
    ],
    "Launch pilot with 500 existing guests": [
      { title: "Identify and segment top 500 guests from PMS", owner: "Guest Relations Manager", dueDate: "2026-04-10", status: "Not Started", completed: false },
      { title: "Send personalised pilot invitations", owner: "Noura Bin Rashid", dueDate: "2026-04-15", status: "Not Started", completed: false },
    ],
    "Benchmark competitor restaurant pricing": [
      { title: "Visit 5 competitor F&B outlets and record pricing", owner: "Khalid Mansoor", dueDate: "2026-02-15", status: "Completed", completed: true },
      { title: "Compile benchmark report with recommendations", owner: "Khalid Mansoor", dueDate: "2026-02-18", status: "Completed", completed: true },
    ],
    "Renegotiate supplier contracts for Q2": [
      { title: "Schedule meetings with top 5 suppliers", owner: "Khalid Mansoor", dueDate: "2026-03-05", status: "Completed", completed: true },
      { title: "Negotiate 8-12% cost reduction on key ingredients", owner: "Khalid Mansoor", dueDate: "2026-03-12", status: "In Progress", completed: false },
    ],
    "Design new seasonal menu items": [
      { title: "Chef brainstorming session for 8 new dishes", owner: "Head Chef", dueDate: "2026-03-05", status: "Completed", completed: true },
      { title: "Costing and margin analysis for new items", owner: "Khalid Mansoor", dueDate: "2026-03-08", status: "In Progress", completed: false },
    ],
    "Print and deploy updated menus": [
      { title: "Finalise print-ready menu artwork", owner: "Khalid Mansoor", dueDate: "2026-03-22", status: "Not Started", completed: false },
      { title: "Distribute printed menus to all outlets", owner: "Operations Manager", dueDate: "2026-03-27", status: "Not Started", completed: false },
    ],
    "Conduct exit interviews for Q1 departures": [
      { title: "Interview 3 departed housekeeping staff", owner: "Fatima Al Rashid", dueDate: "2026-03-03", status: "Completed", completed: true },
      { title: "Synthesise findings into HR gap report", owner: "Fatima Al Rashid", dueDate: "2026-03-05", status: "Completed", completed: true },
    ],
    "Design retention bonus structure": [
      { title: "Draft bonus tiers by tenure and department", owner: "Fatima Al Rashid", dueDate: "2026-03-10", status: "Completed", completed: true },
      { title: "Submit bonus budget for Finance approval", owner: "Fatima Al Rashid", dueDate: "2026-03-15", status: "In Progress", completed: false },
    ],
    "Launch career development framework": [
      { title: "Map career paths for housekeeping and F&B roles", owner: "L&D Coordinator", dueDate: "2026-04-15", status: "Not Started", completed: false },
      { title: "Create learning path templates in LMS", owner: "L&D Coordinator", dueDate: "2026-04-25", status: "Not Started", completed: false },
    ],
    "Submit corporate RFP responses (Emirates NBD, ADNOC)": [
      { title: "Gather room rate data and availability grids", owner: "Sarah Al Maktoum", dueDate: "2026-03-07", status: "Completed", completed: true },
      { title: "Finalise and submit RFP documents to 3 corporates", owner: "Sarah Al Maktoum", dueDate: "2026-03-10", status: "In Progress", completed: false },
    ],
    "Launch weekend staycation packages": [
      { title: "Design 2-night package with F&B credit", owner: "Noura Bin Rashid", dueDate: "2026-03-14", status: "Not Started", completed: false },
      { title: "Load packages on OTA channels (Booking.com, Expedia)", owner: "IT Team", dueDate: "2026-03-18", status: "Not Started", completed: false },
    ],
    "Present dynamic pricing model to GM": [
      { title: "Build weekday/weekend rate differential grid", owner: "Priya Sharma", dueDate: "2026-03-20", status: "Not Started", completed: false },
      { title: "Prepare GM presentation deck", owner: "Priya Sharma", dueDate: "2026-03-24", status: "Not Started", completed: false },
    ],
    "OTA rate optimization for April–June": [
      { title: "Audit current OTA rate parity across channels", owner: "Priya Sharma", dueDate: "2026-03-25", status: "Not Started", completed: false },
      { title: "Upload optimised rates to channel manager", owner: "IT Team", dueDate: "2026-04-01", status: "Not Started", completed: false },
    ],
  };

  for (const task of allTasks) {
    const subs = subtaskMap[task.title];
    if (!subs) continue;
    for (const s of subs) {
      await storage.createSubtask({ taskId: task.id, title: s.title, owner: s.owner, dueDate: s.dueDate, status: s.status, completed: s.completed });
    }
  }
}

async function seedAnalyticsData(companyId: number, userId: number) {
  const existing = await storage.getAnalyticsDatasets(companyId);
  const existingDemo = existing.find(d => d.name === "OYO Hotel Performance Data");
  if (existingDemo) {
    const currentRows = (existingDemo.rawData as Record<string, unknown>[] | null) || [];
    if (currentRows.length >= 120 && currentRows[0]?.["Revenue Budget (AED)"] !== undefined) return;
  }

  const PROPERTIES = ["Dubai Marina", "Abu Dhabi Airport", "Sharjah City", "Ajman Beach", "RAK Resort"];
  const MONTH_LABELS = [
    "Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025",
    "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026","Jul 2026","Aug 2026","Sep 2026","Oct 2026","Nov 2026","Dec 2026",
  ];
  const PROP_BASE: Record<string, { rev: number; adr: number; occ: number; sat: number; staff: number }> = {
    "Dubai Marina":      { rev: 2800000, adr: 380, occ: 88, sat: 4.5, staff: 950000 },
    "Abu Dhabi Airport": { rev: 2100000, adr: 290, occ: 84, sat: 4.2, staff: 720000 },
    "Sharjah City":      { rev: 1400000, adr: 210, occ: 79, sat: 4.0, staff: 480000 },
    "Ajman Beach":       { rev: 1100000, adr: 185, occ: 76, sat: 4.1, staff: 390000 },
    "RAK Resort":        { rev:  920000, adr: 165, occ: 72, sat: 4.3, staff: 320000 },
  };
  const SEASONAL = [1.12,1.05,1.10,0.95,1.00,0.85,0.78,0.72,0.80,0.97,1.08,1.15];

  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const rows: Record<string, unknown>[] = [];
  for (let mi = 0; mi < MONTH_LABELS.length; mi++) {
    for (const prop of PROPERTIES) {
      const b = PROP_BASE[prop], s = SEASONAL[mi % 12];
      const year = Number(MONTH_LABELS[mi].slice(-4));
      const yearFactor = year === 2026 ? 1.08 : 1;
      const n = () => 0.93 + rand() * 0.14;
      const revenue = Math.round(b.rev * s * yearFactor * n());
      const revenueBudget = Math.round(b.rev * s * yearFactor * 1.03);
      const adr     = Math.round(b.adr * s * yearFactor * n() * 10) / 10;
      const occ     = Math.round(Math.min(97, b.occ * s * (year === 2026 ? 1.02 : 1) * n()) * 10) / 10;
      const occupancyTarget = Math.round(Math.min(96, b.occ * s * (year === 2026 ? 1.015 : 1.005)) * 10) / 10;
      const rooms   = Math.round(occ / 100 * 200);
      const revpar  = Math.round(adr * occ / 100 * 10) / 10;
      const sat     = Math.round(Math.min(5.0, Math.max(3.2, b.sat + (rand() - 0.5) * 0.4)) * 10) / 10;
      const staff   = Math.round(b.staff * s * n());
      const fb      = Math.round(revenue * (0.18 + rand() * 0.08));
      const comp    = Math.round(rooms * (0.01 + rand() * 0.025));
      const gop     = Math.round((revenue - staff - revenue * 0.28) / revenue * 100 * 10) / 10;
      const gopTarget = Math.round((year === 2026 ? 37 : 35) + (s - 1) * 4 + (PROP_BASE[prop].occ - 80) * 0.05);
      const nps     = Math.round(50 + sat * 8 + (rand() - 0.5) * 10);
      rows.push({
        "Month": MONTH_LABELS[mi], "Property": prop,
        "Revenue (AED)": revenue, "Revenue Budget (AED)": revenueBudget, "Rooms Sold": rooms, "ADR (AED)": adr,
        "Occupancy Rate (%)": occ, "Occupancy Target (%)": occupancyTarget, "RevPAR (AED)": revpar, "F&B Revenue (AED)": fb,
        "Guest Satisfaction": sat, "NPS Score": nps, "Staff Cost (AED)": staff,
        "Guest Complaints": comp, "GOP Margin (%)": gop, "GOP Margin Target (%)": gopTarget,
      });
    }
  }

  const datasetPayload = {
    companyId, createdBy: userId,
    name: "OYO Hotel Performance Data",
    description: "Monthly hotel performance metrics across 5 UAE properties — Jan 2025 to Dec 2026, including budget/target and prior-year comparison fields",
    fileName: "oyo-hotel-performance.xlsx",
    sheetNames: ["Hotel Performance"],
    rowCount: rows.length,
    rawData: rows as any,
    status: "active",
  };

  const dataset = existingDemo
    ? await storage.updateAnalyticsDataset(existingDemo.id, datasetPayload)
    : await storage.createAnalyticsDataset(datasetPayload);

  await storage.upsertAnalyticsDatasetColumns(dataset.id, [
    { columnName: "Month",              label: "Month",              columnType: "date",      aggregation: null,  format: "text",   position: 0,  isFormula: false },
    { columnName: "Property",           label: "Property",           columnType: "dimension", aggregation: null,  format: "text",   position: 1,  isFormula: false },
    { columnName: "Revenue (AED)",      label: "Revenue (AED)",      columnType: "measure",   aggregation: "sum", format: "number", position: 2,  isFormula: false },
    { columnName: "Revenue Budget (AED)", label: "Revenue Budget (AED)", columnType: "measure", aggregation: "sum", format: "number", position: 3, isFormula: false },
    { columnName: "Rooms Sold",         label: "Rooms Sold",         columnType: "measure",   aggregation: "sum", format: "number", position: 4,  isFormula: false },
    { columnName: "ADR (AED)",          label: "ADR (AED)",          columnType: "measure",   aggregation: "avg", format: "number", position: 5,  isFormula: false },
    { columnName: "Occupancy Rate (%)", label: "Occupancy Rate (%)", columnType: "measure",   aggregation: "avg", format: "number", position: 6,  isFormula: false },
    { columnName: "Occupancy Target (%)", label: "Occupancy Target (%)", columnType: "measure", aggregation: "avg", format: "number", position: 7, isFormula: false },
    { columnName: "RevPAR (AED)",       label: "RevPAR (AED)",       columnType: "measure",   aggregation: "avg", format: "number", position: 8,  isFormula: false },
    { columnName: "F&B Revenue (AED)",  label: "F&B Revenue (AED)",  columnType: "measure",   aggregation: "sum", format: "number", position: 9,  isFormula: false },
    { columnName: "Guest Satisfaction", label: "Guest Satisfaction", columnType: "measure",   aggregation: "avg", format: "number", position: 10, isFormula: false },
    { columnName: "NPS Score",          label: "NPS Score",          columnType: "measure",   aggregation: "avg", format: "number", position: 11, isFormula: false },
    { columnName: "Staff Cost (AED)",   label: "Staff Cost (AED)",   columnType: "measure",   aggregation: "sum", format: "number", position: 12, isFormula: false },
    { columnName: "Guest Complaints",   label: "Guest Complaints",   columnType: "measure",   aggregation: "sum", format: "number", position: 13, isFormula: false },
    { columnName: "GOP Margin (%)",     label: "GOP Margin (%)",     columnType: "measure",   aggregation: "avg", format: "number", position: 14, isFormula: false },
    { columnName: "GOP Margin Target (%)", label: "GOP Margin Target (%)", columnType: "measure", aggregation: "avg", format: "number", position: 15, isFormula: false },
  ]);

  // Build aggregated data for hardcoded insights
  const revenueByProp: Record<string, number> = {};
  const revenueBudgetByProp: Record<string, number> = {};
  const occupancyByProp: Record<string, number[]> = {};
  const satisfactionByProp: Record<string, number[]> = {};
  const gopByMonth: Record<string, number[]> = {};
  const gopByMonthYear: Record<string, number[]> = {};
  for (const r of rows) {
    const prop = r["Property"] as string;
    const month = r["Month"] as string;
    revenueByProp[prop] = (revenueByProp[prop] || 0) + (r["Revenue (AED)"] as number);
    revenueBudgetByProp[prop] = (revenueBudgetByProp[prop] || 0) + (r["Revenue Budget (AED)"] as number);
    if (!occupancyByProp[prop]) occupancyByProp[prop] = [];
    occupancyByProp[prop].push(r["Occupancy Rate (%)"] as number);
    if (!satisfactionByProp[prop]) satisfactionByProp[prop] = [];
    satisfactionByProp[prop].push(r["Guest Satisfaction"] as number);
    if (!gopByMonth[month]) gopByMonth[month] = [];
    gopByMonth[month].push(r["GOP Margin (%)"] as number);
    const monthName = month.split(" ")[0];
    const year = month.split(" ")[1];
    const gopKey = `${monthName}|${year}`;
    if (!gopByMonthYear[gopKey]) gopByMonthYear[gopKey] = [];
    gopByMonthYear[gopKey].push(r["GOP Margin (%)"] as number);
  }
  const avg = (arr: number[]) => Math.round((arr.reduce((s,v) => s+v,0)/arr.length)*10)/10;

  const revData = PROPERTIES.map(p => {
    const value = revenueByProp[p] || 0;
    const comparisonValue = revenueBudgetByProp[p] || 0;
    return {
      name: p,
      value,
      comparisonValue,
      comparisonLabel: "Revenue Budget (AED)",
      variance: value - comparisonValue,
      variancePct: comparisonValue ? Math.round(((value - comparisonValue) / comparisonValue) * 1000) / 10 : null,
    };
  }).sort((a,b) => b.value-a.value);
  const occData = PROPERTIES.map(p => ({ name: p, value: avg(occupancyByProp[p] || [0]) }));
  const satData = PROPERTIES.map(p => ({ name: p, value: avg(satisfactionByProp[p] || [0]) }));
  const gopData = MONTH_LABELS.map(m => ({ name: m, value: avg(gopByMonth[m] || [0]) }));
  const gopYoYData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => {
    const value = avg(gopByMonthYear[`${m}|2026`] || [0]);
    const comparisonValue = avg(gopByMonthYear[`${m}|2025`] || [0]);
    return {
      name: m,
      value,
      comparisonValue,
      comparisonLabel: "2025",
      variance: Math.round((value - comparisonValue) * 10) / 10,
      variancePct: comparisonValue ? Math.round(((value - comparisonValue) / Math.abs(comparisonValue)) * 1000) / 10 : null,
    };
  });

  const insights: { title: string; question: string; chartType: string; chartConfig: any; narrative: string }[] = [
    {
      title: "Total Revenue by Property",
      question: "What is the total revenue by property versus budget?",
      chartType: "bar",
      chartConfig: { chartType: "bar", data: { data: revData, xKey: "name", yKey: "value", measureLabel: "Revenue (AED)", dimensionLabel: "Property", comparisonLabel: "Revenue Budget (AED)", comparisonType: "budget" }, measure: "Revenue (AED)", measureLabel: "Revenue (AED)", dimension: "Property", dimensionLabel: "Property", aggregation: "sum", comparisonType: "budget", comparisonMeasure: "Revenue Budget (AED)", comparisonLabel: "Revenue Budget (AED)" },
      narrative: `Dubai Marina leads with the highest total revenue at ${(revData[0].value/1000000).toFixed(1)}M AED. This view now includes budget bars and variance so teams can see where actual performance is ahead of or behind plan.`,
    },
    {
      title: "Average Occupancy Rate by Property",
      question: "Which property has the highest average occupancy rate?",
      chartType: "bar",
      chartConfig: { chartType: "bar", data: { data: occData, xKey: "name", yKey: "value", measureLabel: "Occupancy Rate (%)", dimensionLabel: "Property" }, measure: "Occupancy Rate (%)", measureLabel: "Occupancy Rate (%)", dimension: "Property", aggregation: "avg" },
      narrative: "Dubai Marina consistently achieves the highest occupancy across all properties, driven by its premium location and corporate demand. All properties show strong peak season performance.",
    },
    {
      title: "Guest Satisfaction by Property",
      question: "Compare guest satisfaction scores by property",
      chartType: "bar",
      chartConfig: { chartType: "bar", data: { data: satData, xKey: "name", yKey: "value", measureLabel: "Guest Satisfaction", dimensionLabel: "Property" }, measure: "Guest Satisfaction", measureLabel: "Guest Satisfaction", dimension: "Property", aggregation: "avg" },
      narrative: "Guest satisfaction scores are consistently high across all properties (3.8–4.6/5.0). Dubai Marina and RAK Resort lead on guest experience, while Sharjah City shows room for improvement.",
    },
    {
      title: "GOP Margin Trend Over Time",
      question: "Show GOP Margin trend over time compared with previous year",
      chartType: "line",
      chartConfig: { chartType: "line", data: { data: gopYoYData, xKey: "name", yKey: "value", measureLabel: "GOP Margin (%)", dimensionLabel: "Month", comparisonLabel: "2025", comparisonType: "previousYear" }, measure: "GOP Margin (%)", measureLabel: "GOP Margin (%)", dimension: "Month", dimensionLabel: "Month", aggregation: "avg", comparisonType: "previousYear", comparisonLabel: "2025" },
      narrative: "GOP margins now show a dual-series previous-year comparison. The 2026 line can be read against the 2025 line month by month to understand whether profitability is improving or weakening seasonally.",
    },
  ];

  const insightIds: number[] = [];
  if (existingDemo) {
    const savedInsights = await storage.getAnalyticsInsightsByDataset(dataset.id);
    for (const ins of insights) {
      const existingInsight = savedInsights.find(s => s.title === ins.title);
      if (!existingInsight) continue;
      await storage.updateAnalyticsInsight(existingInsight.id, {
        question: ins.question,
        interpretation: ins.question,
        chartType: ins.chartType,
        chartConfig: ins.chartConfig,
        narrative: ins.narrative,
      });
      insightIds.push(existingInsight.id);
    }
    console.log(`Seed: updated analytics demo dataset (${rows.length} rows) with budget and previous-year comparison data`);
    return;
  }

  for (const ins of insights) {
    const saved = await storage.createAnalyticsInsight({
      companyId, createdBy: userId, datasetId: dataset.id,
      title: ins.title, question: ins.question, interpretation: ins.question,
      chartType: ins.chartType, chartConfig: ins.chartConfig,
      narrative: ins.narrative, status: "saved",
    });
    insightIds.push(saved.id);
  }

  const dashboard = await storage.createAnalyticsDashboardDefinition({
    companyId, createdBy: userId,
    title: "OYO Performance Analytics",
    description: "Comprehensive hotel performance dashboard tracking revenue, occupancy, guest satisfaction, and operational margins across all 5 UAE properties.",
    status: "published",
    visibility: "company",
    tags: ["hotel", "revenue", "occupancy", "performance"],
  });

  for (let i = 0; i < insightIds.length; i++) {
    await storage.addAnalyticsDashboardItem({ dashboardId: dashboard.id, insightId: insightIds[i], position: i });
  }

  console.log(`Seed: created analytics demo dataset (${rows.length} rows), ${insightIds.length} insights, 1 dashboard`);
}

export async function seedDatabase() {
  const existing = await storage.getUserByEmail("demo@performo.ai");

  if (existing) {
    let companyId = existing.companyId;
    if (!companyId) {
      const company = await storage.getCompanyByUserId(existing.id);
      if (company) {
        await storage.updateUser(existing.id, { companyId: company.id, role: "admin" });
        companyId = company.id;
      }
    } else {
      await storage.updateUser(existing.id, { role: "admin" });
    }

    if (!companyId) return;

    // ── Ensure executive demo user ──────────────────────────────
    const execExists = await storage.getUserByEmail("exec@performo.ai");
    if (!execExists) {
      const execHash = await hashPassword("exec123");
      await storage.createUser({ name: "Ravi Mehta", email: "exec@performo.ai", passwordHash: execHash, companyId, role: "executive" });
      console.log("Seed: created executive demo user exec@performo.ai");
    }

    // ── Ensure team member demo user ─────────────────────────────
    const memberExists = await storage.getUserByEmail("member@performo.ai");
    if (!memberExists) {
      const memberHash = await hashPassword("member123");
      await storage.createUser({ name: "Noura Bin Rashid", email: "member@performo.ai", passwordHash: memberHash, companyId, role: "team_member" });
      console.log("Seed: created team member demo user member@performo.ai");
    }

    // ── Ensure departments ──────────────────────────────────────
    let deptList = await storage.getDepartments(companyId);
    if (deptList.length === 0) {
      for (const name of ["Sales & Revenue", "Operations", "HR & Admin", "Finance"]) {
        await storage.createDepartment({ companyId, name });
      }
      deptList = await storage.getDepartments(companyId);
      console.log("Seed: restored departments");
    }
    const depts: Record<string, number> = {};
    for (const d of deptList) depts[d.name] = d.id;

    // ── Ensure demo user dept access ──────────────────────────────
    // exec: no dept restrictions (sees all departments)
    // member: Sales dept (full) — Dept Head persona
    const salesDeptId = depts["Sales & Revenue"] ?? depts["Sales"] ?? Object.values(depts)[0];
    const memberUser = await storage.getUserByEmail("member@performo.ai");
    if (memberUser && salesDeptId) {
      const memberAccess = await storage.getDeptAccessForUser(memberUser.id);
      if (memberAccess.length === 0) {
        await storage.setDeptAccess(memberUser.id, salesDeptId, "full");
        console.log("Seed: configured dept access for team member user");
      }
    }

    // ── Ensure KPIs ─────────────────────────────────────────────
    const existingKpis = await storage.getKpis(companyId);
    if (existingKpis.length < 10) {
      await seedKpiData(companyId, depts);
      console.log("Seed: restored KPI data (12 KPIs with actuals)");
    }

    // ── Ensure action items ─────────────────────────────────────
    const existingActions = await storage.getActionItems(companyId);
    if (existingActions.length === 0) {
      await seedMeetingsAndActions(companyId, depts);
      console.log("Seed: restored action items");
    }

    // ── Ensure monthly review ───────────────────────────────────
    const existingReviews = await storage.getMonthlyReviews(companyId);
    if (existingReviews.length === 0) {
      await seedMonthlyReview(companyId);
      console.log("Seed: restored monthly review");
    }

    // ── Ensure projects, tasks, milestones ──────────────────────
    const existingProjects = await storage.getProjects(companyId);
    if (existingProjects.length === 0) {
      await seedProjectData(companyId);
      console.log("Seed: restored projects, tasks, milestones");
    }

    // ── Ensure subtasks (Tasks within Initiatives) ───────────────
    const allTasks = await storage.getTasks(companyId);
    if (allTasks.length > 0) {
      // Check if ANY task has subtasks — prevents mass duplication on restart
      let anySubtasksExist = false;
      for (const t of allTasks.slice(0, 5)) {
        const subs = await storage.getSubtasks(t.id);
        if (subs.length > 0) { anySubtasksExist = true; break; }
      }
      if (!anySubtasksExist) {
        await seedSubtasksForExistingTasks(allTasks);
        console.log("Seed: seeded tasks (subtasks) within initiatives");
      }
    }

    // ── Ensure subscription ──────────────────────────────────────
    const existingSub = await storage.getSubscription(companyId);
    if (!existingSub) {
      await storage.upsertSubscription(companyId, {
        planName: "Growth",
        status: "Active",
        maxUsers: 50,
        dailyAiLimit: 75,
        startDate: new Date(),
      });
      console.log("Seed: created Growth subscription for demo company");
    }

    // ── Ensure analytics V2 datasets, insights, definitions ─────
    const existingDatasets = await storage.getAnalyticsDatasets(companyId);
    if (existingDatasets.length === 0 || existingDatasets.some(d => d.name === "OYO Hotel Performance Data")) {
      await seedAnalyticsData(companyId, existing.id);
      console.log("Seed: restored analytics V2 data (datasets, insights, definitions)");
    }

    // ── Ensure workflow groups ────────────────────────────────────
    await seedWorkflowGroups(companyId, existing.id);

    // ── Ensure presentation demo data ────────────────────────────
    await seedPresentationData(companyId, existing.id);

    // ── Ensure balanced scorecard data ───────────────────────────
    await seedBscData(companyId);

    // ── Ensure platform owner ───────────────────────────────────
    await seedPlatformOwner();

    return;
  }

  const passwordHash = await hashPassword("demo123");
  const user = await storage.createUser({ name: "Dharmesh Sheth", email: "demo@performo.ai", passwordHash, role: "admin", companyId: null });

  const company = await storage.createCompany({
    userId: user.id,
    companyName: "OYO Hospitality",
    industry: "Hospitality",
    companySize: "51-200",
    country: "UAE",
  });

  await storage.updateUser(user.id, { companyId: company.id });

  const deptNames = ["Sales & Revenue", "Operations", "HR & Admin", "Finance"];
  const depts: Record<string, number> = {};
  for (const name of deptNames) {
    const d = await storage.createDepartment({ companyId: company.id, name });
    depts[name] = d.id;
  }

  // ── Demo users with realistic dept access ─────────────────────
  const salesId = depts["Sales & Revenue"] ?? depts["Sales"] ?? Object.values(depts)[0];

  // exec: no dept restrictions (sees all departments)
  const execHash = await hashPassword("exec123");
  await storage.createUser({ name: "Ravi Mehta", email: "exec@performo.ai", passwordHash: execHash, companyId: company.id, role: "executive" });

  // member: Sales Dept Head — manages Sales department
  const memberHash = await hashPassword("member123");
  const memberUser = await storage.createUser({ name: "Noura Bin Rashid", email: "member@performo.ai", passwordHash: memberHash, companyId: company.id, role: "team_member" });
  if (salesId) await storage.setDeptAccess(memberUser.id, salesId, "full");

  const goals = [
    "Increase total revenue by 15% year-over-year through improved occupancy and ADR",
    "Achieve guest satisfaction score of 4.5+ on all major OTA platforms",
    "Reduce staff turnover below 20% and improve employee engagement",
    "Maintain GOP margin at or above 35% through cost discipline",
    "Launch loyalty program to drive 25% repeat guest rate",
  ];
  for (const goalText of goals) {
    await storage.createBusinessGoal({ companyId: company.id, goalText });
  }

  const kpiData = [
    { dept: "Sales & Revenue", name: "Occupancy Rate", desc: "Percentage of available rooms sold in the period. Key driver of total room revenue.", formula: "(Rooms Sold / Total Available Room Nights) × 100", unit: "%", freq: "Monthly", target: "85", green: ">= 85%", amber: "75% - 84%", red: "< 75%", owner: "Revenue Manager", source: "PMS (Opera / Cloudbeds)" },
    { dept: "Sales & Revenue", name: "Average Daily Rate (ADR)", desc: "Average revenue earned per occupied room. Measures pricing effectiveness.", formula: "Total Room Revenue / Number of Rooms Sold", unit: "AED", freq: "Monthly", target: "680", green: ">= AED 680", amber: "AED 580 - 679", red: "< AED 580", owner: "Revenue Manager", source: "PMS - Revenue Report" },
    { dept: "Sales & Revenue", name: "RevPAR", desc: "Revenue per available room. Combines occupancy and rate performance.", formula: "Total Room Revenue / Total Available Room Nights", unit: "AED", freq: "Monthly", target: "578", green: ">= AED 578", amber: "AED 450 - 577", red: "< AED 450", owner: "Director of Sales", source: "PMS - Revenue Report" },
    { dept: "Sales & Revenue", name: "Repeat Guest Rate", desc: "Percentage of bookings from returning guests. Indicates loyalty and satisfaction.", formula: "(Return Guest Bookings / Total Bookings) × 100", unit: "%", freq: "Monthly", target: "25", green: ">= 25%", amber: "18% - 24%", red: "< 18%", owner: "Guest Relations Manager", source: "CRM / PMS Guest History" },
    { dept: "Operations", name: "Guest Satisfaction Score (GSS)", desc: "Average review rating across Booking.com, Google, and TripAdvisor.", formula: "Sum of All Ratings / Number of Reviews", unit: "/ 5.0", freq: "Monthly", target: "4.5", green: ">= 4.5", amber: "4.0 - 4.4", red: "< 4.0", owner: "Guest Relations Manager", source: "ReviewPro / OTA Extranet" },
    { dept: "Operations", name: "Room Turnaround Time", desc: "Average minutes to clean, inspect, and release a room for check-in.", formula: "Total Cleaning + Inspection Time / Rooms Cleaned", unit: "min", freq: "Weekly", target: "28", green: "<= 28 min", amber: "29 - 40 min", red: "> 40 min", owner: "Housekeeping Supervisor", source: "Housekeeping App / Manual Log" },
    { dept: "Operations", name: "F&B Revenue per Cover", desc: "Average revenue per restaurant/bar guest. Measures menu pricing and upselling.", formula: "Total F&B Revenue / Number of Covers Served", unit: "AED", freq: "Monthly", target: "145", green: ">= AED 145", amber: "AED 110 - 144", red: "< AED 110", owner: "F&B Manager", source: "POS System (Micros / Toast)" },
    { dept: "HR & Admin", name: "Employee Turnover Rate", desc: "Percentage of employees leaving within the period. High turnover increases training costs.", formula: "(Number of Separations / Average Headcount) × 100", unit: "%", freq: "Monthly", target: "18", green: "<= 18%", amber: "19% - 25%", red: "> 25%", owner: "HR Manager", source: "HRMS (BambooHR / Workday)" },
    { dept: "HR & Admin", name: "Training Hours per Employee", desc: "Average training hours completed per employee. Compliance and skill development indicator.", formula: "Total Training Hours Delivered / Total Headcount", unit: "hrs", freq: "Monthly", target: "8", green: ">= 8 hrs", amber: "5 - 7 hrs", red: "< 5 hrs", owner: "L&D Coordinator", source: "LMS / Training Records" },
    { dept: "Finance", name: "GOP Margin", desc: "Gross Operating Profit as a percentage of total revenue. Primary profitability measure.", formula: "(Total Revenue - Operating Expenses) / Total Revenue × 100", unit: "%", freq: "Monthly", target: "35", green: ">= 35%", amber: "28% - 34%", red: "< 28%", owner: "Financial Controller", source: "PMS + Accounting (Sun / QuickBooks)" },
    { dept: "Finance", name: "Cost per Occupied Room (CPOR)", desc: "Total operating cost divided by rooms sold. Efficiency measure for cost control.", formula: "Total Operating Expenses / Rooms Sold", unit: "AED", freq: "Monthly", target: "220", green: "<= AED 220", amber: "AED 221 - 280", red: "> AED 280", owner: "Financial Controller", source: "Accounting System" },
    { dept: "Finance", name: "Revenue vs Budget Variance", desc: "Percentage deviation of actual revenue from budgeted revenue.", formula: "((Actual Revenue - Budget) / Budget) × 100", unit: "%", freq: "Monthly", target: "0", green: ">= -3% (within 3%)", amber: "-3.1% to -8%", red: "< -8%", owner: "Financial Controller", source: "ERP / Budget Tracker" },
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

  const monthlyActuals: { month: string; data: { kpi: string; actual: string; status: string; comment: string }[] }[] = [
    {
      month: "2025-12",
      data: [
        { kpi: "Occupancy Rate", actual: "92", status: "On Track", comment: "Peak holiday season, strong demand from leisure segment" },
        { kpi: "Average Daily Rate (ADR)", actual: "740", status: "On Track", comment: "Premium pricing during festive period" },
        { kpi: "RevPAR", actual: "681", status: "On Track", comment: "Best RevPAR month of the year" },
        { kpi: "Repeat Guest Rate", actual: "22", status: "Amber", comment: "Good for peak season, mostly new tourists" },
        { kpi: "Guest Satisfaction Score (GSS)", actual: "4.4", status: "Amber", comment: "Slight dip due to high occupancy strain on service" },
        { kpi: "Room Turnaround Time", actual: "32", status: "Amber", comment: "Higher due to full house operations" },
        { kpi: "F&B Revenue per Cover", actual: "158", status: "On Track", comment: "Festive menus and events drove higher check averages" },
        { kpi: "Employee Turnover Rate", actual: "16", status: "On Track", comment: "Stable month, year-end bonuses helped retention" },
        { kpi: "Training Hours per Employee", actual: "6", status: "Amber", comment: "Reduced training due to peak operational demands" },
        { kpi: "GOP Margin", actual: "38", status: "On Track", comment: "Strong profitability from high occupancy + ADR" },
        { kpi: "Cost per Occupied Room (CPOR)", actual: "205", status: "On Track", comment: "Economies of scale at high occupancy" },
        { kpi: "Revenue vs Budget Variance", actual: "4.2", status: "On Track", comment: "Revenue exceeded budget by 4.2%" },
      ]
    },
    {
      month: "2026-01",
      data: [
        { kpi: "Occupancy Rate", actual: "88", status: "On Track", comment: "Strong January with continued winter tourism" },
        { kpi: "Average Daily Rate (ADR)", actual: "710", status: "On Track", comment: "Maintained strong rates into January" },
        { kpi: "RevPAR", actual: "625", status: "On Track", comment: "Solid performance, above annual target" },
        { kpi: "Repeat Guest Rate", actual: "24", status: "Amber", comment: "Improving as loyalty program gains traction" },
        { kpi: "Guest Satisfaction Score (GSS)", actual: "4.5", status: "On Track", comment: "Recovered after Dec dip, new SOPs implemented" },
        { kpi: "Room Turnaround Time", actual: "27", status: "On Track", comment: "New cleaning schedule reduced turnaround" },
        { kpi: "F&B Revenue per Cover", actual: "142", status: "Amber", comment: "Normal menu pricing after festive season ended" },
        { kpi: "Employee Turnover Rate", actual: "19", status: "Amber", comment: "Some post-bonus departures in January" },
        { kpi: "Training Hours per Employee", actual: "9", status: "On Track", comment: "Annual training plan kicked off" },
        { kpi: "GOP Margin", actual: "36", status: "On Track", comment: "Healthy margins maintained" },
        { kpi: "Cost per Occupied Room (CPOR)", actual: "215", status: "On Track", comment: "Controlled expenses" },
        { kpi: "Revenue vs Budget Variance", actual: "2.1", status: "On Track", comment: "Revenue 2.1% above budget" },
      ]
    },
    {
      month: "2026-02",
      data: [
        { kpi: "Occupancy Rate", actual: "79", status: "Amber", comment: "Seasonal dip as winter tourism winds down" },
        { kpi: "Average Daily Rate (ADR)", actual: "660", status: "Amber", comment: "Competitive pricing pressure, lowered BAR slightly" },
        { kpi: "RevPAR", actual: "521", status: "Amber", comment: "Below target due to combined occupancy and rate decline" },
        { kpi: "Repeat Guest Rate", actual: "27", status: "On Track", comment: "Loyalty emails driving repeat bookings, exceeded target" },
        { kpi: "Guest Satisfaction Score (GSS)", actual: "4.6", status: "On Track", comment: "Lower occupancy = better service attention per guest" },
        { kpi: "Room Turnaround Time", actual: "25", status: "On Track", comment: "Best month — lighter load, team well-trained" },
        { kpi: "F&B Revenue per Cover", actual: "128", status: "Below Target", comment: "Fewer high-spend tourists, mostly business travelers" },
        { kpi: "Employee Turnover Rate", actual: "23", status: "Amber", comment: "3 experienced housekeepers left for competitor property" },
        { kpi: "Training Hours per Employee", actual: "10", status: "On Track", comment: "Excellent — used quieter period for intensive training" },
        { kpi: "GOP Margin", actual: "31", status: "Amber", comment: "Lower revenue hit margin despite stable costs" },
        { kpi: "Cost per Occupied Room (CPOR)", actual: "245", status: "Amber", comment: "Fixed costs spread over fewer rooms sold" },
        { kpi: "Revenue vs Budget Variance", actual: "-5.8", status: "Amber", comment: "Revenue 5.8% below budget for February" },
      ]
    },
  ];

  for (const monthData of monthlyActuals) {
    for (const a of monthData.data) {
      if (createdKpis[a.kpi]) {
        await storage.createKpiActual({
          kpiId: createdKpis[a.kpi],
          reviewMonth: monthData.month,
          actualValue: a.actual,
          commentary: a.comment,
          status: a.status,
        });
      }
    }
  }

  const actions = [
    { title: "Launch business traveler lunch promotion", desc: "Design a fixed-price AED 75 business lunch menu to increase midweek F&B covers. Target 30+ covers/day.", owner: "Khalid Mansoor (F&B Manager)", due: "2026-03-10", revisedDue: "2026-03-15", priority: "High", status: "In Progress", dept: "Operations", meetingType: "Monthly Operations Review" },
    { title: "Review and update menu pricing for Q2", desc: "Benchmark competitor restaurant pricing. Propose 8-12% price adjustments on underperforming items. Present to GM by March 15.", owner: "Khalid Mansoor (F&B Manager)", due: "2026-03-15", revisedDue: null, priority: "Medium", status: "Not Started", dept: "Operations", meetingType: "Monthly Operations Review" },
    { title: "Submit corporate RFP responses", desc: "Complete RFP responses for 3 key corporate accounts (Emirates NBD, ADNOC, Etisalat). Pricing approved by Revenue Manager.", owner: "Sarah Al Maktoum (Sales Manager)", due: "2026-03-10", revisedDue: null, priority: "Critical", status: "In Progress", dept: "Sales & Revenue", meetingType: "PMO Steering Committee" },
    { title: "Design weekend staycation packages", desc: "Create 2-night stay packages with F&B credit and late checkout for local market. Publish on OTAs and website by March 12.", owner: "Noura Bin Rashid (Marketing Exec)", due: "2026-03-12", revisedDue: "2026-03-18", priority: "High", status: "In Progress", dept: "Sales & Revenue", meetingType: "PMO Steering Committee" },
    { title: "Present dynamic pricing model to GM", desc: "Build shoulder season pricing grid with weekday/weekend rate differentials. Include competitor rate analysis from STR report.", owner: "Priya Sharma (Revenue Manager)", due: "2026-03-18", revisedDue: null, priority: "Medium", status: "Not Started", dept: "Sales & Revenue", meetingType: "CEO Meeting" },
    { title: "Implement housekeeping retention bonuses", desc: "Propose AED 500/month retention bonus for housekeeping staff with >1 year tenure. Budget impact analysis required.", owner: "Fatima Al Rashid (HR Manager)", due: "2026-03-08", revisedDue: null, priority: "High", status: "Completed", dept: "HR & Admin", meetingType: "Department Review" },
    { title: "Conduct exit interviews for departed staff", desc: "Complete structured exit interviews for 3 departed housekeepers. Document findings and share with operations.", owner: "Fatima Al Rashid (HR Manager)", due: "2026-03-05", revisedDue: null, priority: "Medium", status: "Completed", dept: "HR & Admin", meetingType: "Department Review" },
    { title: "Defer Q1 capex: lobby renovation", desc: "Postpone lobby furniture replacement (AED 180K) to Q2 pending improved revenue performance. Notify procurement.", owner: "Lisa Wong (Financial Controller)", due: "2026-03-01", revisedDue: null, priority: "High", status: "Completed", dept: "Finance", meetingType: "Finance Committee" },
    { title: "Analyze F&B food cost ratio", desc: "Current food cost at 34% vs 30% target. Investigate supplier pricing, wastage, and portion control. Report with recommendations due March 20.", owner: "Lisa Wong (Financial Controller)", due: "2026-03-20", revisedDue: "2026-03-25", priority: "High", status: "In Progress", dept: "Finance", meetingType: "Finance Committee" },
    { title: "Loyalty program email campaign - March", desc: "Send targeted email to 2,400 loyalty members with exclusive March rates and F&B voucher. Measure open rate and conversion.", owner: "Noura Bin Rashid (Marketing Exec)", due: "2026-03-05", revisedDue: "2026-03-12", priority: "Medium", status: "Delayed", dept: "Sales & Revenue", meetingType: "CEO Meeting" },
  ];

  for (const a of actions) {
    await storage.createActionItem({
      companyId: company.id,
      departmentId: depts[a.dept],
      meetingType: a.meetingType,
      title: a.title,
      description: a.desc,
      ownerName: a.owner,
      dueDate: a.due,
      revisedDueDate: a.revisedDue,
      priority: a.priority,
      status: a.status,
    });
  }

  await storage.createMonthlyReview({
    companyId: company.id,
    reviewMonth: "2026-02",
    overallSummary: "February delivered a mixed performance picture across KPIs, projects, and operational execution. On the revenue side, ADR exceeded target at $192 vs $180 and RevPAR held strong at $157 vs $153, driven by robust corporate bookings. However, occupancy declined to 79% against an 85% target — a seasonal dip that compressed the GOP margin to 31% against a 35% goal, with revenue 5.8% below budget.\n\nProject execution is a growing concern heading into March. Of 6 active strategic projects, 2 are flagged Red health — Q2 Revenue Recovery Plan (0% complete) and F&B Menu Overhaul (40%) — with 6 overdue tasks across the portfolio. The Loyalty Program Launch (55%) remains the bright spot, while the Staff Retention Initiative has slipped to 30% completion, mirroring the HR turnover pressure seen in the KPI data.\n\nAction accountability requires urgent attention: 3 of 6 tracked actions are overdue, creating downstream risk to key project milestones. The guest feedback system (Sarah Johnson) and loyalty campaign (Omar Khalil) are both past their revised due dates. Without closing these open loops this week, the Loyalty Program April launch timeline is at risk.",
    strengths: "- ADR exceeded target at $192 vs $180 — corporate segment mix performing strongly\n- RevPAR at $157 vs $153 target — holding up despite occupancy softness\n- Loyalty Program Launch at 55% completion, on track for April go-live milestone\n- Guest satisfaction reached 4.6/5.0 — highest in three months, benefiting from lower occupancy pressure\n- Housekeeping schedule optimization completed ahead of schedule (David Park)",
    gaps: "- Occupancy at 79% vs 85% target — seasonal decline deeper than forecasted\n- GOP margin at 31% vs 35% target — fixed cost base not covered at current revenue level\n- 2 of 6 strategic projects at Red health: Q2 Revenue Recovery Plan and F&B Menu Overhaul\n- 6 overdue tasks across the project portfolio — execution pace below plan\n- 3 of 6 action items overdue — guest feedback system and loyalty campaign both delayed past revised dates\n- Employee turnover at 23% vs 18% target — Staff Retention Initiative not yet delivering impact",
    recommendations: "- Resolve all 3 overdue actions this week: Dharmesh Sheth to personally follow up with Sarah Johnson (guest feedback system) and Omar Khalil (loyalty campaign) before end of month\n- Accelerate F&B Menu Overhaul: Khalid Mansoor to finalise new pricing by 28 March, targeting AED 145/cover from current AED 128\n- Fast-track Q2 Revenue Recovery Plan: Priya Sharma to submit corporate RFPs to Emirates NBD, ADNOC, and Etisalat by 15 March\n- Implement housekeeping retention bonuses (AED 500/month for >1yr tenure) immediately to address 23% turnover before further attrition\n- Hold emergency PMO review for the 6 overdue project tasks — assign hard deadlines and owners at next Steering Committee",
    aiGeneratedText: null,
  });

  // ─── Demo Projects, Tasks, Milestones ────────────────────────────────────
  await seedProjectData(company.id);

  // ─── Analytics Demo Data ──────────────────────────────────────────────
  await seedAnalyticsData(company.id, user.id);

  // ─── Workflow Center Demo Data ────────────────────────────────────────
  await seedWorkflowData(company.id, user.id);
  await seedWorkflowGroups(company.id, user.id);

  // ─── Presentation Studio Demo Data ───────────────────────────────────
  await seedPresentationData(company.id, user.id);

  // ─── Balanced Scorecard Demo Data ────────────────────────────────────
  await seedBscData(company.id);

  await storage.upsertSubscription(company.id, {
    planName: "Growth",
    status: "Active",
    maxUsers: 50,
    dailyAiLimit: 75,
    startDate: new Date(),
  });

  await seedPlatformOwner();

  console.log("Seed data created: 12 KPIs, 10 action items, 4 projects, 17 tasks, 7 milestones, admin + executive + team_member users + platform owner");
}

async function seedWorkflowData(companyId: number, userId: number) {
  const existing = await storage.getWorkflowSubmissions(companyId);
  if (existing.length > 0) return;

  const today = new Date();
  const d = (offset: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().slice(0, 10);
  };

  type Sub = {
    workflowType: "recurring_task" | "service_ticket" | "license" | "certificate";
    title: string; description: string; status: string; priority: string;
    ownerName: string; departmentName: string; category: string;
    dueDate?: string; expiryDate?: string; recurrenceType?: string;
    vendorName?: string; issueAuthority?: string; licenseType?: string;
    holderName?: string; slaTarget?: string; referenceNumber: string;
  };

  const submissions: Sub[] = [
    // ── Recurring Tasks ───────────────────────────────────────────────────
    {
      workflowType: "recurring_task", title: "Monthly P&L Review", category: "Finance",
      description: "Review profit & loss statements with department heads and update forecasting models.",
      status: "Due Soon", priority: "High", ownerName: "Dharmesh Sheth", departmentName: "Finance",
      dueDate: d(3), recurrenceType: "Monthly", referenceNumber: "RT-LMNO99-PLR",
    },
    {
      workflowType: "recurring_task", title: "Weekly Safety Walkthrough", category: "Operations",
      description: "Inspect all public and back-of-house areas for safety compliance and record findings.",
      status: "Scheduled", priority: "Medium", ownerName: "Khalid Mansoor", departmentName: "Operations",
      dueDate: d(7), recurrenceType: "Weekly", referenceNumber: "RT-WKS22-SFY",
    },
    {
      workflowType: "recurring_task", title: "Quarterly Staff Performance Review", category: "HR",
      description: "Conduct 1-on-1 performance appraisals for all department heads. Update scorecards in the system.",
      status: "Scheduled", priority: "High", ownerName: "Priya Sharma", departmentName: "Human Resources",
      dueDate: d(21), recurrenceType: "Quarterly", referenceNumber: "RT-QRT55-PRV",
    },
    {
      workflowType: "recurring_task", title: "Monthly Guest Satisfaction Report", category: "Guest Experience",
      description: "Compile and analyse guest feedback scores from OTAs, on-property surveys, and review platforms.",
      status: "Overdue", priority: "High", ownerName: "Sarah Johnson", departmentName: "Guest Experience",
      dueDate: d(-5), recurrenceType: "Monthly", referenceNumber: "RT-GST01-MRP",
    },
    // ── Service Tickets ───────────────────────────────────────────────────
    {
      workflowType: "service_ticket", title: "PMS Integration Failure — Booking Feed", category: "IT",
      description: "Opera PMS is not syncing with OTA channels. Bookings made after 18:00 are not reflecting in the system. Urgently impacting front desk operations.",
      status: "In Progress", priority: "Critical", ownerName: "Noura Bin Rashid", departmentName: "Information Technology",
      dueDate: d(1), slaTarget: "4 hours", referenceNumber: "TKT-IT001-PMS",
    },
    {
      workflowType: "service_ticket", title: "Air Conditioning Unit — Room 412", category: "Engineering",
      description: "Guest reported A/C unit making loud noise and blowing warm air. Room taken offline pending engineer inspection.",
      status: "Assigned", priority: "High", ownerName: "Khalid Mansoor", departmentName: "Engineering",
      dueDate: d(0), slaTarget: "2 hours", referenceNumber: "TKT-ENG12-ACA",
    },
    {
      workflowType: "service_ticket", title: "F&B POS Terminal Replacement", category: "IT",
      description: "POS terminal at Pool Bar is unresponsive. Temporary workaround in place. Requires replacement hardware.",
      status: "Pending", priority: "Medium", ownerName: "Noura Bin Rashid", departmentName: "Food & Beverage",
      dueDate: d(5), slaTarget: "1 day", referenceNumber: "TKT-FB033-POS",
    },
    {
      workflowType: "service_ticket", title: "Staff Access Card System Malfunction", category: "Security",
      description: "Access cards for levels B1 and B2 car park are not reading. Security team using manual override.",
      status: "Resolved", priority: "High", ownerName: "Khalid Mansoor", departmentName: "Security",
      dueDate: d(-2), slaTarget: "4 hours", referenceNumber: "TKT-SEC07-ACC",
    },
    {
      workflowType: "service_ticket", title: "Update Brand Guidelines on Intranet", category: "Marketing",
      description: "New brand identity assets need uploading to the intranet and Teams channels. Coordinate with Corporate.",
      status: "New", priority: "Low", ownerName: "Omar Khalil", departmentName: "Marketing",
      dueDate: d(14), slaTarget: "3 days", referenceNumber: "TKT-MKT88-BRD",
    },
    // ── Licenses ──────────────────────────────────────────────────────────
    {
      workflowType: "license", title: "Annual Trade License — OYO Grand Hotel", category: "Legal & Compliance",
      description: "Dubai Department of Economic Development trade license. Must be renewed 45 days before expiry.",
      status: "Active", priority: "Critical", ownerName: "Dharmesh Sheth", departmentName: "Finance",
      expiryDate: d(38), licenseType: "Trade License", vendorName: "DED — Dubai Dept. of Economic Development",
      holderName: "OYO Grand Hotel LLC", referenceNumber: "LIC-DED01-TRD",
    },
    {
      workflowType: "license", title: "Liquor License — F&B Outlets", category: "Legal & Compliance",
      description: "Dubai Tourism liquor license covering all F&B outlets on property. Includes pool bar, lobby bar and rooftop.",
      status: "Expiring Soon", priority: "Critical", ownerName: "Dharmesh Sheth", departmentName: "Food & Beverage",
      expiryDate: d(14), licenseType: "Liquor License", vendorName: "Dubai Tourism & Commerce Marketing",
      holderName: "OYO Grand Hotel LLC", referenceNumber: "LIC-DTM02-LQR",
    },
    {
      workflowType: "license", title: "Oracle OPERA PMS — Annual Subscription", category: "IT",
      description: "Annual software subscription for Oracle OPERA Property Management System. Covers all modules.",
      status: "Active", priority: "High", ownerName: "Noura Bin Rashid", departmentName: "Information Technology",
      expiryDate: d(95), licenseType: "Software License", vendorName: "Oracle Hospitality",
      holderName: "OYO Grand Hotel", referenceNumber: "LIC-ORC03-PMS",
    },
    {
      workflowType: "license", title: "Food Hygiene License — Main Kitchen", category: "Legal & Compliance",
      description: "Dubai Municipality food hygiene permit for the main kitchen facility. Annual inspection required.",
      status: "Active", priority: "High", ownerName: "Khalid Mansoor", departmentName: "Food & Beverage",
      expiryDate: d(180), licenseType: "Food Hygiene Permit", vendorName: "Dubai Municipality",
      holderName: "OYO Grand Hotel — Main Kitchen", referenceNumber: "LIC-DXM04-FHY",
    },
    // ── Certificates ──────────────────────────────────────────────────────
    {
      workflowType: "certificate", title: "Fire Safety Certificate — Main Building", category: "Safety & Compliance",
      description: "Annual fire safety inspection certificate for the main hotel building. Issued by Civil Defence.",
      status: "Active", priority: "Critical", ownerName: "Khalid Mansoor", departmentName: "Engineering",
      expiryDate: d(72), issueAuthority: "Dubai Civil Defence", licenseType: "Fire Safety Certificate",
      holderName: "OYO Grand Hotel — Main Building", referenceNumber: "CERT-CDF01-FSC",
    },
    {
      workflowType: "certificate", title: "HACCP Certification — Kitchen Operations", category: "Food Safety",
      description: "HACCP certification for kitchen food safety management system. Renewal requires 3rd-party audit.",
      status: "Expiring Soon", priority: "High", ownerName: "Khalid Mansoor", departmentName: "Food & Beverage",
      expiryDate: d(22), issueAuthority: "Bureau Veritas", licenseType: "HACCP Certificate",
      holderName: "OYO Grand Hotel F&B Team", referenceNumber: "CERT-BVC02-HCP",
    },
    {
      workflowType: "certificate", title: "ISO 14001 Environmental Management", category: "Sustainability",
      description: "ISO 14001 certification for environmental management system. Demonstrates commitment to sustainability targets.",
      status: "Active", priority: "Medium", ownerName: "Priya Sharma", departmentName: "Operations",
      expiryDate: d(210), issueAuthority: "SGS International", licenseType: "ISO 14001",
      holderName: "OYO Grand Hotel", referenceNumber: "CERT-SGS03-ENV",
    },
    {
      workflowType: "certificate", title: "Ravi Mehta — Certified Hospitality Manager (CHM)", category: "HR",
      description: "Professional certification for General Manager. Renewal requires 40 CPD hours documentation.",
      status: "Active", priority: "Medium", ownerName: "Ravi Mehta", departmentName: "General Management",
      expiryDate: d(310), issueAuthority: "American Hotel & Lodging Educational Institute",
      licenseType: "Professional Certification", holderName: "Ravi Mehta", referenceNumber: "CERT-AHL04-CHM",
    },
    {
      workflowType: "certificate", title: "Elevator Safety Certificate — All Lifts", category: "Safety & Compliance",
      description: "Annual safety inspection certificate for all 4 passenger lifts and 2 service lifts on property.",
      status: "Expired", priority: "Critical", ownerName: "Khalid Mansoor", departmentName: "Engineering",
      expiryDate: d(-8), issueAuthority: "Dubai Municipality — Buildings Dept.",
      licenseType: "Elevator Safety Certificate", holderName: "OYO Grand Hotel", referenceNumber: "CERT-DXM05-ELV",
    },
  ];

  for (const s of submissions) {
    await storage.createWorkflowSubmission({
      companyId, createdBy: userId,
      workflowType: s.workflowType, title: s.title, description: s.description,
      status: s.status, priority: s.priority, ownerName: s.ownerName,
      departmentName: s.departmentName, category: s.category,
      dueDate: s.dueDate, expiryDate: s.expiryDate,
      recurrenceType: s.recurrenceType, vendorName: s.vendorName,
      issueAuthority: s.issueAuthority, licenseType: s.licenseType,
      holderName: s.holderName, slaTarget: s.slaTarget,
      referenceNumber: s.referenceNumber, requesterName: "Dharmesh Sheth",
    });
  }

  console.log(`Seed: created ${submissions.length} workflow submissions for demo company`);
}

async function seedWorkflowGroups(companyId: number, userId: number) {
  const existing = await storage.getWorkflowGroups(companyId);
  if (existing.length > 0) return;

  // Create groups for each workflow type
  type GroupDef = { workflowType: string; name: string; description: string; categoryMatch: string[] };
  const groupDefs: GroupDef[] = [
    // Service Desk groups
    { workflowType: "service_ticket", name: "IT Helpdesk", description: "Technical support for PMS, POS, network, devices and all software-related issues across the property.", categoryMatch: ["IT"] },
    { workflowType: "service_ticket", name: "Engineering & Maintenance", description: "Facilities management, room repairs, HVAC, electrical, plumbing and preventive maintenance requests.", categoryMatch: ["Engineering"] },
    { workflowType: "service_ticket", name: "Admin & Operations Desk", description: "Cross-departmental requests covering security, marketing, HR admin, and general operations.", categoryMatch: ["Security", "Marketing", "HR", "Administration"] },

    // Recurring Task groups
    { workflowType: "recurring_task", name: "Finance & Reporting", description: "Monthly P&L reviews, budget submissions, forecasting updates and financial reporting cycles.", categoryMatch: ["Finance"] },
    { workflowType: "recurring_task", name: "Operations & Safety", description: "Safety walkthroughs, housekeeping audits, engineering checks and operational compliance tasks.", categoryMatch: ["Operations"] },
    { workflowType: "recurring_task", name: "People & Guest Experience", description: "Staff performance reviews, guest satisfaction reports, training schedules and HR compliance tasks.", categoryMatch: ["HR", "Guest Experience", "Human Resources"] },

    // License categories
    { workflowType: "license", name: "Legal & Compliance Licenses", description: "Trade licenses, liquor licenses, health permits and all statutory licenses required for hotel operations.", categoryMatch: ["Legal & Compliance"] },
    { workflowType: "license", name: "Technology & Software Licenses", description: "PMS, POS, Office 365, and all third-party software subscription licenses.", categoryMatch: ["IT", "Technology"] },
    { workflowType: "license", name: "Food Safety Licenses", description: "Municipality food handling, HACCP-related permits and kitchen hygiene licenses.", categoryMatch: ["Food Safety"] },

    // Certificate groups
    { workflowType: "certificate", name: "Safety & Regulatory Certificates", description: "Fire safety, elevator inspection, civil defence and statutory property certificates.", categoryMatch: ["Safety & Compliance"] },
    { workflowType: "certificate", name: "Food & Hygiene Certifications", description: "HACCP, food handler and kitchen hygiene certifications for F&B operations.", categoryMatch: ["Food Safety"] },
    { workflowType: "certificate", name: "Sustainability & Environmental", description: "ISO 14001, Green Globe, environmental management and sustainability certifications.", categoryMatch: ["Sustainability"] },
    { workflowType: "certificate", name: "Professional Certifications", description: "Individual professional qualifications, hospitality certifications and CPD-linked credentials for key staff.", categoryMatch: ["HR", "General Management"] },
  ];

  // Create all groups and record their IDs
  const groupMap: { id: number; workflowType: string; categoryMatch: string[] }[] = [];
  for (const g of groupDefs) {
    const group = await storage.createWorkflowGroup({
      companyId, createdBy: userId,
      workflowType: g.workflowType,
      name: g.name, description: g.description,
    });
    groupMap.push({ id: group.id, workflowType: g.workflowType, categoryMatch: g.categoryMatch });
  }

  // Assign existing submissions to groups based on workflowType + category
  const submissions = await storage.getWorkflowSubmissions(companyId);
  for (const sub of submissions) {
    if (sub.groupId) continue; // already assigned
    // Find best group: same workflowType + category appears in categoryMatch
    const candidates = groupMap.filter(g => g.workflowType === sub.workflowType);
    const best = candidates.find(g => g.categoryMatch.some(c => sub.category?.toLowerCase().includes(c.toLowerCase())))
      || candidates[0]; // fallback to first group of that type
    if (best) {
      await db.update(workflowSubmissions).set({ groupId: best.id }).where(eq(workflowSubmissions.id, sub.id));
    }
  }

  console.log(`Seed: created ${groupDefs.length} workflow groups for demo company`);
}

async function seedPresentationData(companyId: number, userId: number) {
  const existing = await storage.listPresentations(companyId, userId);
  if (existing.length > 0) return;

  const presentations = [
    {
      title: "Q2 2026 Hotel Performance Review",
      status: "published",
      theme: "executive-dark",
      sourceTypes: ["prompt"],
      brief: {
        title: "Q2 2026 Hotel Performance Review",
        audience: "Board of Directors & Senior Leadership",
        objective: "Present Q2 KPI performance, project portfolio status, and strategic priorities for Q3",
        tone: "Professional",
        deckType: "Board Presentation",
        targetSlides: 10,
        designStyle: "Executive",
        instructions: "",
        prompt: "Q2 board review covering occupancy, ADR, RevPAR, F&B performance, project portfolio, and Q3 priorities",
      },
      slides: [
        {
          id: "s1", type: "title",
          title: "Q2 2026 Hotel Performance Review",
          subtitle: "OYO Hospitality · Board Presentation · April 2026",
        },
        {
          id: "s2", type: "agenda",
          title: "Today's Agenda",
          bullets: ["Q2 KPI Scorecard — Revenue & Operations", "Occupancy & Rate Analysis", "F&B Performance", "Project Portfolio Update", "People & Retention", "Q3 Strategic Priorities"],
        },
        {
          id: "s3", type: "data",
          title: "Q2 Revenue KPI Scorecard",
          stat: [
            { value: "AED 96.4M", label: "Total Revenue", change: "+8.2% vs Q1", trend: "up", pct: 97, color: "green" },
            { value: "82%", label: "Occupancy Rate", change: "vs 85% target", trend: "down", pct: 82, color: "amber" },
            { value: "AED 192", label: "Average Daily Rate", change: "+6.7% YoY", trend: "up", pct: 107, color: "green" },
            { value: "AED 157", label: "RevPAR", change: "vs AED 153 target", trend: "up", pct: 103, color: "green" },
          ],
        },
        {
          id: "s4", type: "two-column",
          title: "Occupancy: Seasonal Softness Contained",
          bullets: ["Occupancy reached 82% vs 85% target — 3pp gap driven by lower leisure demand in April", "Corporate segment held strong at 91% occupancy, offsetting leisure shortfall", "RevPAR recovered to AED 157 through ADR discipline (+6.7% YoY)", "May bookings tracking at 87% — Q3 outlook positive"],
          stat: [
            { value: "82%", label: "Q2 Occupancy", change: "vs 85% target", trend: "down", color: "amber" },
            { value: "AED 192", label: "ADR", change: "+6.7% YoY", trend: "up", color: "green" },
            { value: "91%", label: "Corporate Seg.", change: "above plan", trend: "up", color: "green" },
          ],
        },
        {
          id: "s5", type: "data",
          title: "F&B Revenue Per Cover — Progress",
          stat: [
            { value: "AED 138", label: "Revenue per Cover", change: "vs AED 128 Q1", trend: "up", pct: 95, color: "amber" },
            { value: "18.2%", label: "F&B Revenue Mix", change: "vs 18% target", trend: "up", pct: 101, color: "green" },
            { value: "4.6/5.0", label: "Guest Satisfaction", change: "3-month high", trend: "up", pct: 92, color: "green" },
            { value: "AED 145", label: "Q3 Cover Target", change: "Menu overhaul underway", trend: "flat", pct: 0, color: "amber" },
          ],
        },
        {
          id: "s6", type: "section",
          title: "Project Portfolio",
          subtitle: "4 Active Strategic Initiatives",
        },
        {
          id: "s7", type: "content",
          title: "Strategic Project Status",
          bullets: [
            "✅ Loyalty Program Launch — 55% complete, April go-live on track",
            "🟡 F&B Menu Overhaul — 40% complete, new pricing by 28 March",
            "🔴 Q2 Revenue Recovery Plan — 0% complete, RFPs to be submitted by 15 March",
            "🟡 Staff Retention Initiative — 30% complete, retention bonuses approved",
          ],
          emphasis: "2 of 4 projects require immediate action to avoid Q3 impact",
          colorCode: "amber",
        },
        {
          id: "s8", type: "two-column",
          title: "People & Retention",
          bullets: ["Employee turnover at 23% vs 18% target — housekeeping and F&B most affected", "Retention bonus programme approved: AED 500/month for >1yr tenure staff", "CHM certification programme launched for 8 supervisors", "eNPS survey planned for May to baseline engagement"],
          stat: [
            { value: "23%", label: "Turnover Rate", change: "vs 18% target", trend: "down", color: "red" },
            { value: "AED 500", label: "Monthly Bonus", change: "per eligible staff", trend: "up", color: "green" },
            { value: "8", label: "CHM Candidates", change: "in programme", trend: "up", color: "green" },
          ],
        },
        {
          id: "s9", type: "content",
          title: "Q3 2026 Strategic Priorities",
          bullets: [
            "1. Drive occupancy to 87%+ through corporate RFP wins and weekend leisure packages",
            "2. Complete Loyalty Program launch — target 500 enrolled members by end of Q3",
            "3. Achieve AED 145 F&B revenue per cover through full menu overhaul rollout",
            "4. Reduce staff turnover to below 20% by Q3 end through retention programme",
            "5. Deliver Q3 Monthly Reviews within 5 days of month-end — no exceptions",
          ],
        },
        {
          id: "s10", type: "closing",
          title: "Thank You",
          subtitle: "Questions & Discussion",
          bullets: ["Next board review: July 2026", "Monthly updates via Performo AI dashboard", "Contact: Dharmesh Sheth · GM · dharmesh@oyohotels.ae"],
        },
      ],
      outline: [
        { id: "o1", type: "title", title: "Title Slide", description: "Presentation title and date" },
        { id: "o2", type: "agenda", title: "Agenda", description: "Overview of topics" },
        { id: "o3", type: "data", title: "Q2 KPI Scorecard", description: "Revenue, occupancy, ADR, RevPAR" },
        { id: "o4", type: "two-column", title: "Occupancy Analysis", description: "Seasonal softness and rate discipline" },
        { id: "o5", type: "data", title: "F&B Performance", description: "Revenue per cover and guest satisfaction" },
        { id: "o6", type: "section", title: "Project Portfolio", description: "Section break" },
        { id: "o7", type: "content", title: "Project Status", description: "4 active initiatives" },
        { id: "o8", type: "two-column", title: "People & Retention", description: "Turnover and retention programme" },
        { id: "o9", type: "content", title: "Q3 Priorities", description: "Strategic priorities for next quarter" },
        { id: "o10", type: "closing", title: "Closing", description: "Thank you and next steps" },
      ],
    },
    {
      title: "Staff Retention Initiative — March Update",
      status: "draft",
      theme: "corporate",
      sourceTypes: ["prompt"],
      brief: {
        title: "Staff Retention Initiative — March Update",
        audience: "HR Leadership & General Manager",
        objective: "Update on the staff retention programme progress and next steps",
        tone: "Professional",
        deckType: "Operational Update",
        targetSlides: 6,
        designStyle: "Clean",
        instructions: "",
        prompt: "HR update on the staff retention initiative — current turnover, actions taken, and programme milestones",
      },
      slides: [
        {
          id: "s1", type: "title",
          title: "Staff Retention Initiative",
          subtitle: "March 2026 Progress Update · HR & General Management",
        },
        {
          id: "s2", type: "data",
          title: "Retention Metrics — Current Status",
          stat: [
            { value: "23%", label: "Current Turnover", change: "vs 18% target", trend: "down", pct: 72, color: "red" },
            { value: "30%", label: "Initiative Progress", change: "of milestones complete", trend: "up", pct: 30, color: "amber" },
            { value: "8", label: "Staff Exited in Feb", change: "housekeeping & F&B", trend: "down", pct: 0, color: "red" },
            { value: "AED 500", label: "Monthly Bonus", change: "approved, rollout April 1", trend: "up", pct: 100, color: "green" },
          ],
        },
        {
          id: "s3", type: "content",
          title: "Actions Completed in March",
          bullets: [
            "✅ Retention bonus of AED 500/month approved for all staff with >1yr tenure (effective April 1)",
            "✅ CHM certification programme launched — 8 supervisors enrolled with Bureau Veritas",
            "✅ Exit interview process formalised — all departing staff now interviewed within 48 hrs",
            "✅ Housekeeping schedule optimised — reduced split shifts from 62% to 38% of rosters",
          ],
          colorCode: "green",
        },
        {
          id: "s4", type: "content",
          title: "Actions in Progress",
          bullets: [
            "🔄 eNPS engagement survey — launching May 1, results by May 15",
            "🔄 Career pathing framework — Operations and HR drafting ladder for 5 departments",
            "🔄 Competitor salary benchmarking — HR to complete by April 10",
            "🔄 Staff recognition programme — quarterly awards, first cycle starts Q2",
          ],
          colorCode: "amber",
        },
        {
          id: "s5", type: "two-column",
          title: "Root Cause Analysis",
          bullets: ["Exit interviews confirm: 61% left for higher pay at competitor hotels", "38% cited lack of career progression visibility", "Seasonal contract uncertainty (Feb–Mar) drives 'pre-emptive' exits", "Competitor activity: 2 new hotel openings in Q1 actively targeting trained F&B staff"],
          stat: [
            { value: "61%", label: "Left for higher pay", change: "from exit interviews", trend: "flat", color: "red" },
            { value: "38%", label: "Career growth concern", change: "from exit interviews", trend: "flat", color: "amber" },
          ],
        },
        {
          id: "s6", type: "closing",
          title: "Target: Below 20% Turnover by Q3",
          subtitle: "Fatima Al Rashid · HR Director · March 2026",
          bullets: ["April: Retention bonus live for 94 eligible staff", "May: eNPS survey results — baseline engagement score", "June: Mid-year review — first cohort of CHM candidates assessed"],
        },
      ],
      outline: [
        { id: "o1", type: "title", title: "Title Slide", description: "" },
        { id: "o2", type: "data", title: "Retention Metrics", description: "Current KPI status" },
        { id: "o3", type: "content", title: "Completed Actions", description: "March achievements" },
        { id: "o4", type: "content", title: "In Progress", description: "Current workstreams" },
        { id: "o5", type: "two-column", title: "Root Cause Analysis", description: "Exit interview findings" },
        { id: "o6", type: "closing", title: "Closing", description: "Q3 target and milestones" },
      ],
    },
  ];

  for (const p of presentations) {
    await storage.createPresentation({
      companyId, createdBy: userId,
      title: p.title, status: p.status, theme: p.theme,
      sourceTypes: p.sourceTypes as any,
      brief: p.brief as any,
      slides: p.slides as any,
      outline: p.outline as any,
      version: 1,
    });
  }
  console.log(`Seed: created ${presentations.length} demo presentations`);
}

async function seedPlatformOwner() {
  const existing = await storage.getPlatformOwnerByEmail("owner@performo.ai");
  if (existing) return;
  const passwordHash = await hashPassword("owner123");
  await storage.createPlatformOwner({ name: "Platform Owner", email: "owner@performo.ai", passwordHash, isActive: true });
  console.log("Seed: created platform owner → owner@performo.ai / owner123");
}

async function seedBscData(companyId: number) {
  const existingDepts = await storage.getBscDepartments(companyId);
  if (existingDepts.length > 0) return;

  // Canonical demo setup: Corporate + Engineering only
  const departments = [
    { deptId: "corp", name: "Corporate",   icon: "🏢", color: "#3B82F6", sortOrder: 0 },
    { deptId: "eng",  name: "Engineering", icon: "🔧", color: "#8B5CF6", sortOrder: 1 },
  ];
  await storage.saveBscDepartments(companyId, departments);

  // 7 months of scorecard actuals (Oct 2025 – Apr 2026) — Corporate + Engineering
  const store: Record<string, Record<string, number>> = {
    "2025-10": {
      cr_f1:2.8, cr_f2:15.5, cr_f3:23.8, cr_f4:1012, cr_c1:83.4, cr_c2:3.4, cr_c3:95.8, cr_c4:84.2, cr_i1:0.89, cr_i2:90.1, cr_i3:90.8, cr_l1:26, cr_l2:22.1, cr_l3:82, cr_l4:65,
      eng_f1:9120, eng_f2:88.4, eng_c1:94.2, eng_c2:3.9, eng_i1:93.1, eng_i2:2.1, eng_l1:18, eng_l2:91,
    },
    "2025-11": {
      cr_f1:3.2, cr_f2:17.8, cr_f3:21.2, cr_f4:991, cr_c1:84.8, cr_c2:3.5, cr_c3:96.4, cr_c4:85.5, cr_i1:0.78, cr_i2:90.8, cr_i3:91.2, cr_l1:28, cr_l2:20.8, cr_l3:84, cr_l4:67,
      eng_f1:8870, eng_f2:90.1, eng_c1:95.6, eng_c2:4.0, eng_i1:94.3, eng_i2:1.9, eng_l1:20, eng_l2:93,
    },
    "2025-12": {
      cr_f1:3.8, cr_f2:17.8, cr_f3:20.6, cr_f4:974, cr_c1:86.4, cr_c2:3.6, cr_c3:97.1, cr_c4:86.8, cr_i1:0.68, cr_i2:91.5, cr_i3:92.1, cr_l1:30, cr_l2:19.2, cr_l3:86, cr_l4:70,
      eng_f1:8640, eng_f2:91.8, eng_c1:96.4, eng_c2:4.1, eng_i1:95.1, eng_i2:1.7, eng_l1:22, eng_l2:95,
    },
    "2026-01": {
      cr_f1:3.4, cr_f2:17.6, cr_f3:21.4, cr_f4:1002, cr_c1:85.8, cr_c2:3.5, cr_c3:96.8, cr_c4:85.1, cr_i1:0.74, cr_i2:91.2, cr_i3:91.6, cr_l1:27, cr_l2:20.4, cr_l3:83, cr_l4:68,
      eng_f1:8950, eng_f2:89.2, eng_c1:95.1, eng_c2:4.0, eng_i1:93.8, eng_i2:1.8, eng_l1:19, eng_l2:94,
    },
    "2026-02": {
      cr_f1:3.9, cr_f2:17.8, cr_f3:20.9, cr_f4:982, cr_c1:87.1, cr_c2:3.6, cr_c3:96.9, cr_c4:86.8, cr_i1:0.72, cr_i2:91.8, cr_i3:91.9, cr_l1:29, cr_l2:18.8, cr_l3:84, cr_l4:69,
      eng_f1:8720, eng_f2:92.4, eng_c1:96.8, eng_c2:4.1, eng_i1:94.9, eng_i2:1.6, eng_l1:21, eng_l2:96,
    },
    "2026-03": {
      cr_f1:4.0, cr_f2:17.9, cr_f3:20.8, cr_f4:971, cr_c1:88.5, cr_c2:3.7, cr_c3:97.2, cr_c4:87.8, cr_i1:0.71, cr_i2:91.9, cr_i3:92.0, cr_l1:31, cr_l2:18.2, cr_l3:85, cr_l4:70,
      eng_f1:8480, eng_f2:93.6, eng_c1:97.2, eng_c2:4.2, eng_i1:95.6, eng_i2:1.5, eng_l1:23, eng_l2:98,
    },
    "2026-04": {
      cr_f1:4.2, cr_f2:17.8, cr_f3:21.3, cr_f4:968, cr_c1:89.2, cr_c2:3.8, cr_c3:97.4, cr_c4:88.6, cr_i1:0.58, cr_i2:92.1, cr_i3:91.4, cr_l1:32, cr_l2:17.3, cr_l3:85, cr_l4:68,
      eng_f1:8310, eng_f2:94.8, eng_c1:97.8, eng_c2:4.2, eng_i1:96.1, eng_i2:1.4, eng_l1:24, eng_l2:99,
    },
  };

  await storage.saveBscActualsBatch(companyId, store);
  console.log(`Seed: created BSC departments (Corporate + Engineering) and 7 months of actuals`);
}

