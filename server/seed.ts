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
    const execExists = await storage.getUserByEmail("exec@performo.ai");
    if (!execExists && companyId) {
      const execHash = await hashPassword("exec123");
      await storage.createUser({
        name: "Ravi Mehta",
        email: "exec@performo.ai",
        passwordHash: execHash,
        companyId,
        role: "executive",
      });
      console.log("Seed: created executive demo user exec@performo.ai");
    }
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

  const meetingTypeNames = [
    "PMO Steering Committee", "CEO Meeting", "Monthly Operations Review",
    "Department Review", "Finance Committee", "Board Meeting",
    "Weekly Standup", "Strategy Meeting", "Other"
  ];
  for (const name of meetingTypeNames) {
    await storage.createMeetingType({ companyId: company.id, name });
  }

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

  const meetings = [
    {
      title: "February Monthly Operations Review",
      date: "2026-02-28",
      dept: "Operations",
      summary: "Reviewed February performance. Occupancy dropped to 79% as winter tourism slows. Guest satisfaction improved to 4.6. Key concern: F&B revenue per cover fell below target at AED 128. Agreed to review menu pricing and introduce a business traveler lunch promotion. Housekeeping performance excellent at 25 min turnaround."
    },
    {
      title: "Q1 Revenue Strategy Meeting",
      date: "2026-02-15",
      dept: "Sales & Revenue",
      summary: "Discussed March-April booking pipeline. Corporate RFP responses due by March 10. Proposed weekend staycation packages to offset midweek softness. Revenue Manager to present dynamic pricing recommendations for shoulder season. Loyalty program showing early traction with 27% repeat rate."
    },
    {
      title: "HR Monthly Review - February",
      date: "2026-02-25",
      dept: "HR & Admin",
      summary: "Turnover at 23% — 3 experienced housekeepers joined competitor hotel. Exit interviews indicate salary and workload concerns. Training completion excellent at 10 hrs/employee. Discussed retention bonus structure for high performers. New hires onboarding plan for March."
    },
    {
      title: "Finance Committee - February Closeout",
      date: "2026-02-27",
      dept: "Finance",
      summary: "GOP margin at 31%, below 35% target. Revenue shortfall of 5.8% vs budget drove the gap. Fixed costs remained stable. CPOR rose to AED 245 due to lower room volume. Recommendation: defer non-essential capex to Q2. Review F&B cost of goods — food cost ratio crept up to 34%."
    },
  ];

  const createdMeetings: Record<string, number> = {};
  for (const m of meetings) {
    const meeting = await storage.createMeeting({
      companyId: company.id,
      title: m.title,
      meetingDate: m.date,
      departmentId: depts[m.dept],
      summary: m.summary,
    });
    createdMeetings[m.title] = meeting.id;
  }

  const actions = [
    { title: "Launch business traveler lunch promotion", desc: "Design a fixed-price AED 75 business lunch menu to increase midweek F&B covers. Target 30+ covers/day.", owner: "Khalid Mansoor (F&B Manager)", due: "2026-03-10", revisedDue: "2026-03-15", priority: "High", status: "In Progress", dept: "Operations", meeting: "February Monthly Operations Review", meetingType: "Monthly Operations Review" },
    { title: "Review and update menu pricing for Q2", desc: "Benchmark competitor restaurant pricing. Propose 8-12% price adjustments on underperforming items. Present to GM by March 15.", owner: "Khalid Mansoor (F&B Manager)", due: "2026-03-15", revisedDue: null, priority: "Medium", status: "Not Started", dept: "Operations", meeting: "February Monthly Operations Review", meetingType: "Monthly Operations Review" },
    { title: "Submit corporate RFP responses", desc: "Complete RFP responses for 3 key corporate accounts (Emirates NBD, ADNOC, Etisalat). Pricing approved by Revenue Manager.", owner: "Sarah Al Maktoum (Sales Manager)", due: "2026-03-10", revisedDue: null, priority: "Critical", status: "In Progress", dept: "Sales & Revenue", meeting: "Q1 Revenue Strategy Meeting", meetingType: "PMO Steering Committee" },
    { title: "Design weekend staycation packages", desc: "Create 2-night stay packages with F&B credit and late checkout for local market. Publish on OTAs and website by March 12.", owner: "Noura Bin Rashid (Marketing Exec)", due: "2026-03-12", revisedDue: "2026-03-18", priority: "High", status: "In Progress", dept: "Sales & Revenue", meeting: "Q1 Revenue Strategy Meeting", meetingType: "PMO Steering Committee" },
    { title: "Present dynamic pricing model to GM", desc: "Build shoulder season pricing grid with weekday/weekend rate differentials. Include competitor rate analysis from STR report.", owner: "Priya Sharma (Revenue Manager)", due: "2026-03-18", revisedDue: null, priority: "Medium", status: "Not Started", dept: "Sales & Revenue", meeting: "Q1 Revenue Strategy Meeting", meetingType: "CEO Meeting" },
    { title: "Implement housekeeping retention bonuses", desc: "Propose AED 500/month retention bonus for housekeeping staff with >1 year tenure. Budget impact analysis required.", owner: "Fatima Al Rashid (HR Manager)", due: "2026-03-08", revisedDue: null, priority: "High", status: "Completed", dept: "HR & Admin", meeting: "HR Monthly Review - February", meetingType: "Department Review" },
    { title: "Conduct exit interviews for departed staff", desc: "Complete structured exit interviews for 3 departed housekeepers. Document findings and share with operations.", owner: "Fatima Al Rashid (HR Manager)", due: "2026-03-05", revisedDue: null, priority: "Medium", status: "Completed", dept: "HR & Admin", meeting: "HR Monthly Review - February", meetingType: "Department Review" },
    { title: "Defer Q1 capex: lobby renovation", desc: "Postpone lobby furniture replacement (AED 180K) to Q2 pending improved revenue performance. Notify procurement.", owner: "Lisa Wong (Financial Controller)", due: "2026-03-01", revisedDue: null, priority: "High", status: "Completed", dept: "Finance", meeting: "Finance Committee - February Closeout", meetingType: "Finance Committee" },
    { title: "Analyze F&B food cost ratio", desc: "Current food cost at 34% vs 30% target. Investigate supplier pricing, wastage, and portion control. Report with recommendations due March 20.", owner: "Lisa Wong (Financial Controller)", due: "2026-03-20", revisedDue: "2026-03-25", priority: "High", status: "In Progress", dept: "Finance", meeting: "Finance Committee - February Closeout", meetingType: "Finance Committee" },
    { title: "Loyalty program email campaign - March", desc: "Send targeted email to 2,400 loyalty members with exclusive March rates and F&B voucher. Measure open rate and conversion.", owner: "Noura Bin Rashid (Marketing Exec)", due: "2026-03-05", revisedDue: "2026-03-12", priority: "Medium", status: "Delayed", dept: "Sales & Revenue", meeting: "Q1 Revenue Strategy Meeting", meetingType: "CEO Meeting" },
  ];

  for (const a of actions) {
    await storage.createActionItem({
      companyId: company.id,
      meetingId: a.meeting ? createdMeetings[a.meeting] || null : null,
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
    overallSummary: "February marked the beginning of the seasonal transition for OYO Hospitality. As winter tourism volumes subsided, occupancy declined to 79% against an 85% target, with ADR softening to AED 660. RevPAR fell to AED 521, placing the hotel 9.9% below its annual benchmark. The revenue shortfall of 5.8% versus budget was the primary driver behind a compressed GOP margin of 31%.\n\nOn the positive side, guest satisfaction improved to 4.6/5.0 — the highest score in three months — benefiting from reduced operational pressure and improved staff-to-guest ratios. The loyalty program continued its upward trajectory with a repeat guest rate of 27%, exceeding the 25% target for the first time.\n\nThe key concern this month is the F&B revenue per cover dropping to AED 128, well below the AED 145 target. This reflects a shift in guest mix from leisure tourists to business travelers who spend less on dining. Additionally, employee turnover rose to 23% following the departure of three experienced housekeepers to a competing property, signaling a need for retention interventions.",
    strengths: "- Guest satisfaction score reached 4.6/5.0, highest since property reopened\n- Repeat guest rate exceeded 25% target at 27%, validating loyalty program investment\n- Training hours per employee hit 10 hours, leveraging quieter period effectively\n- Room turnaround time at 25 minutes, best performance to date\n- Housekeeping schedule optimization from December fully embedded in operations",
    gaps: "- Occupancy at 79% vs 85% target — seasonal decline steeper than forecasted\n- F&B revenue per cover at AED 128 vs AED 145 target — guest mix shift impact\n- Employee turnover at 23% vs 18% target — competitive poaching of trained staff\n- GOP margin at 31% vs 35% target — revenue shortfall amplified fixed cost impact\n- CPOR at AED 245 vs AED 220 target — fixed cost burden on fewer occupied rooms\n- Revenue 5.8% below budget — shoulder season impact underestimated in annual forecast",
    recommendations: "- Launch business traveler lunch promotion (AED 75 fixed-price) by March 10 to boost F&B covers\n- Implement housekeeping retention bonuses (AED 500/month for >1yr tenure) immediately\n- Fast-track corporate RFP responses for Emirates NBD, ADNOC, and Etisalat accounts\n- Design weekend staycation packages for local market to offset midweek softness\n- Defer non-essential capex (lobby renovation AED 180K) to Q2 pending revenue recovery\n- Review F&B food cost ratio — currently 34% vs 30% target, investigate wastage\n- Present dynamic pricing model for shoulder season to GM by March 18",
    aiGeneratedText: null,
  });

  const execHash = await hashPassword("exec123");
  await storage.createUser({
    name: "Ravi Mehta",
    email: "exec@performo.ai",
    passwordHash: execHash,
    companyId: company.id,
    role: "executive",
  });

  console.log("Seed data created: 12 KPIs with 3 months of actuals, 4 meetings, 10 action items, admin + executive users");
}
