/**
 * Seed demo analytics data for Performo AI
 * Run: node scripts/seed-demo-analytics.mjs
 * Requires Node 20+ (built-in fetch + FormData)
 */
import xlsx from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:5000';
const DEMO_EMAIL = 'demo@performo.ai';
const DEMO_PASS  = 'demo123';

// ── Generate data ─────────────────────────────────────────────────────────────
const PROPERTIES = ['Dubai Marina', 'Abu Dhabi Airport', 'Sharjah City', 'Ajman Beach', 'RAK Resort'];
const MONTH_LABELS = [
  'Apr 2024','May 2024','Jun 2024','Jul 2024',
  'Aug 2024','Sep 2024','Oct 2024','Nov 2024',
  'Dec 2024','Jan 2025','Feb 2025','Mar 2025',
];
const PROP_BASE = {
  'Dubai Marina':       { rev: 2800000, adr: 380, occ: 88, sat: 4.5, staff: 950000 },
  'Abu Dhabi Airport':  { rev: 2100000, adr: 290, occ: 84, sat: 4.2, staff: 720000 },
  'Sharjah City':       { rev: 1400000, adr: 210, occ: 79, sat: 4.0, staff: 480000 },
  'Ajman Beach':        { rev: 1100000, adr: 185, occ: 76, sat: 4.1, staff: 390000 },
  'RAK Resort':         { rev:  920000, adr: 165, occ: 72, sat: 4.3, staff: 320000 },
};
// UAE peak season Oct–Mar; low Jun–Aug
const SEASONAL = [0.95, 1.00, 0.85, 0.78, 0.72, 0.80, 0.97, 1.08, 1.15, 1.12, 1.05, 1.10];

let seed = 42;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const rows = [];
for (let mi = 0; mi < MONTH_LABELS.length; mi++) {
  for (const prop of PROPERTIES) {
    const b = PROP_BASE[prop], s = SEASONAL[mi];
    const n = () => 0.93 + rand() * 0.14;
    const revenue = Math.round(b.rev * s * n());
    const adr     = Math.round(b.adr * s * n() * 10) / 10;
    const occ     = Math.round(Math.min(97, b.occ * s * n()) * 10) / 10;
    const rooms   = Math.round(occ / 100 * 200);
    const revpar  = Math.round(adr * occ / 100 * 10) / 10;
    const sat     = Math.round(Math.min(5.0, Math.max(3.2, b.sat + (rand() - 0.5) * 0.4)) * 10) / 10;
    const staff   = Math.round(b.staff * s * n());
    const fb      = Math.round(revenue * (0.18 + rand() * 0.08));
    const comp    = Math.round(rooms * (0.01 + rand() * 0.025));
    const gop     = Math.round((revenue - staff - revenue * 0.28) / revenue * 100 * 10) / 10;
    const nps     = Math.round(50 + sat * 8 + (rand() - 0.5) * 10);
    rows.push({
      'Month':               MONTH_LABELS[mi],
      'Property':            prop,
      'Revenue (AED)':       revenue,
      'Rooms Sold':          rooms,
      'ADR (AED)':           adr,
      'Occupancy Rate (%)':  occ,
      'RevPAR (AED)':        revpar,
      'F&B Revenue (AED)':   fb,
      'Guest Satisfaction':  sat,
      'NPS Score':           nps,
      'Staff Cost (AED)':    staff,
      'Guest Complaints':    comp,
      'GOP Margin (%)':      gop,
    });
  }
}
console.log(`✓ Generated ${rows.length} rows`);

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(rows);
xlsx.utils.book_append_sheet(wb, ws, 'Hotel Performance');
const xlsxPath = path.join(__dirname, 'oyo-hotel-performance.xlsx');
xlsx.writeFile(wb, xlsxPath);
console.log(`✓ Excel written: ${xlsxPath}`);

// ── HTTP helpers ──────────────────────────────────────────────────────────────
let cookies = '';

async function api(method, endpoint, body, isFormData = false) {
  const headers = { Cookie: cookies };
  let bodyPayload;
  if (isFormData) {
    bodyPayload = body; // FormData — no Content-Type header, browser sets boundary
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    bodyPayload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: bodyPayload,
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookies = setCookie.split(';')[0];
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Login ─────────────────────────────────────────────────────────────────────
console.log('\n→ Logging in…');
const loginRes = await api('POST', '/api/auth/login', { email: DEMO_EMAIL, password: DEMO_PASS });
if (loginRes.status !== 200) { console.error('Login failed:', loginRes); process.exit(1); }
console.log(`✓ Logged in as ${loginRes.data.name}`);

// ── Remove old demo datasets ──────────────────────────────────────────────────
const { data: existDs } = await api('GET', '/api/v2/analytics/datasets');
for (const ds of (existDs || [])) {
  if (/OYO|Hotel/i.test(ds.name || '')) {
    await api('DELETE', `/api/v2/analytics/datasets/${ds.id}`);
    console.log(`  Deleted old dataset: ${ds.name}`);
  }
}

// ── Upload Excel via multipart ────────────────────────────────────────────────
console.log('\n→ Uploading Excel…');
const fileBytes = fs.readFileSync(xlsxPath);
const fd = new FormData();
fd.append('file', new Blob([fileBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'oyo-hotel-performance.xlsx');
fd.append('name', 'OYO Hotel Performance Data');
fd.append('description', 'Monthly hotel performance metrics across 5 UAE properties — Apr 2024 to Mar 2025');

const upRes = await api('POST', '/api/v2/analytics/datasets', fd, true);
if (upRes.status !== 200 && upRes.status !== 201) { console.error('Upload failed:', upRes); process.exit(1); }
const dsId = upRes.data.id;
console.log(`✓ Uploaded: id=${dsId}, rows=${upRes.data.rowCount}`);

// ── Configure columns ─────────────────────────────────────────────────────────
console.log('\n→ Configuring columns…');
const columnConfig = [
  { columnName: 'Month',               label: 'Month',               columnType: 'date',      aggregation: null,  format: 'text',    position: 0,  isFormula: false },
  { columnName: 'Property',            label: 'Property',            columnType: 'dimension', aggregation: null,  format: 'text',    position: 1,  isFormula: false },
  { columnName: 'Revenue (AED)',       label: 'Revenue (AED)',       columnType: 'measure',   aggregation: 'sum', format: 'number',  position: 2,  isFormula: false },
  { columnName: 'Rooms Sold',          label: 'Rooms Sold',          columnType: 'measure',   aggregation: 'sum', format: 'number',  position: 3,  isFormula: false },
  { columnName: 'ADR (AED)',           label: 'ADR (AED)',           columnType: 'measure',   aggregation: 'avg', format: 'number',  position: 4,  isFormula: false },
  { columnName: 'Occupancy Rate (%)',  label: 'Occupancy Rate (%)',  columnType: 'measure',   aggregation: 'avg', format: 'number',  position: 5,  isFormula: false },
  { columnName: 'RevPAR (AED)',        label: 'RevPAR (AED)',        columnType: 'measure',   aggregation: 'avg', format: 'number',  position: 6,  isFormula: false },
  { columnName: 'F&B Revenue (AED)',   label: 'F&B Revenue (AED)',   columnType: 'measure',   aggregation: 'sum', format: 'number',  position: 7,  isFormula: false },
  { columnName: 'Guest Satisfaction',  label: 'Guest Satisfaction',  columnType: 'measure',   aggregation: 'avg', format: 'number',  position: 8,  isFormula: false },
  { columnName: 'NPS Score',           label: 'NPS Score',           columnType: 'measure',   aggregation: 'avg', format: 'number',  position: 9,  isFormula: false },
  { columnName: 'Staff Cost (AED)',    label: 'Staff Cost (AED)',    columnType: 'measure',   aggregation: 'sum', format: 'number',  position: 10, isFormula: false },
  { columnName: 'Guest Complaints',    label: 'Guest Complaints',    columnType: 'measure',   aggregation: 'sum', format: 'number',  position: 11, isFormula: false },
  { columnName: 'GOP Margin (%)',      label: 'GOP Margin (%)',      columnType: 'measure',   aggregation: 'avg', format: 'number',  position: 12, isFormula: false },
];
const cfgRes = await api('POST', `/api/v2/analytics/datasets/${dsId}/columns`, { columns: columnConfig });
if (cfgRes.status !== 200 && cfgRes.status !== 201) { console.error('Configure failed:', cfgRes); process.exit(1); }
console.log(`✓ Columns configured (${cfgRes.data.length} columns)`);

// ── Auto-insights ─────────────────────────────────────────────────────────────
console.log('\n→ Triggering auto-insights…');
const aiRes = await api('POST', `/api/v2/analytics/datasets/${dsId}/auto-insights`);
console.log(`  Auto-insights: ${aiRes.status}`);

// ── Ask 6 questions ───────────────────────────────────────────────────────────
console.log('\n→ Building insights via /ask…');
const QUESTIONS = [
  'What is the total revenue by property for the full period?',
  'Show the monthly revenue trend across all properties',
  'Which property has the highest average occupancy rate?',
  'Compare guest satisfaction scores by property',
  'Show GOP Margin trend over time',
  'What is the ADR vs RevPAR comparison by property?',
];

const insightIds = [];
for (const q of QUESTIONS) {
  process.stdout.write(`  → "${q.slice(0, 55)}" `);
  const askRes = await api('POST', `/api/v2/analytics/datasets/${dsId}/ask`, { question: q });
  if (askRes.status !== 200) { console.log(`✗ ask failed (${askRes.status})`); await delay(800); continue; }
  const r = askRes.data;

  const saveRes = await api('POST', '/api/v2/analytics/insights', {
    datasetId: dsId,
    question: q,
    title: r.title,
    chartType: r.chartType,
    chartConfig: r.chartConfig,
    chartData: r.chartData,
    narrative: r.narrative,
  });
  if (saveRes.status === 200 || saveRes.status === 201) {
    insightIds.push(saveRes.data.id);
    console.log(`✓ id=${saveRes.data.id} [${r.chartType}]`);
  } else {
    console.log(`✗ save failed (${saveRes.status}) ${JSON.stringify(saveRes.data).slice(0,80)}`);
  }
  await delay(1000); // rate-limit guard
}

// ── Remove old OYO dashboards ─────────────────────────────────────────────────
const { data: existDash } = await api('GET', '/api/v2/analytics/definitions');
for (const d of (existDash || [])) {
  if (/OYO/i.test(d.title || '')) {
    await api('DELETE', `/api/v2/analytics/definitions/${d.id}`);
    console.log(`  Deleted old dashboard: ${d.title}`);
  }
}

// ── Create dashboard ──────────────────────────────────────────────────────────
console.log('\n→ Creating dashboard…');
const dashRes = await api('POST', '/api/v2/analytics/definitions', {
  title: 'OYO Performance Analytics',
  description: 'Comprehensive hotel performance dashboard tracking revenue, occupancy, guest satisfaction, and operational margins across all 5 UAE properties.',
  status: 'draft',
  visibility: 'company',
  tags: ['hotel', 'revenue', 'occupancy', 'performance'],
});
if (dashRes.status !== 200 && dashRes.status !== 201) { console.error('Dashboard failed:', dashRes); process.exit(1); }
const dashId = dashRes.data.id;
console.log(`✓ Dashboard created: id=${dashId}`);

// ── Pin insights ──────────────────────────────────────────────────────────────
console.log('\n→ Pinning insights…');
for (let i = 0; i < insightIds.length; i++) {
  const pinRes = await api('POST', `/api/v2/analytics/definitions/${dashId}/items`, {
    insightId: insightIds[i],
    position: i,
  });
  console.log(`  Pinned ${insightIds[i]}: HTTP ${pinRes.status}`);
}

// ── Publish ───────────────────────────────────────────────────────────────────
await api('PATCH', `/api/v2/analytics/definitions/${dashId}`, { status: 'published' });
console.log('\n🎉 Seeding complete!');
console.log(`   Dataset   : ${dsId}`);
console.log(`   Dashboard : ${dashId}`);
console.log(`   Insights  : ${insightIds.join(', ') || 'none'}`);
