/**
 * Playwright demo recorder — captures MP4 screen recordings of each Performo AI feature.
 * Run: node scripts/record-demos.js
 */
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:5000";
const OUT_DIR = path.join(__dirname, "../client/public/demos");
const TMP_DIR = path.join(__dirname, "../client/public/demos/tmp");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };

// Utility: sleep
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Utility: smooth scroll
async function smoothScroll(page, targetY, steps = 20) {
  const current = await page.evaluate(() => window.scrollY);
  const delta = targetY - current;
  for (let i = 1; i <= steps; i++) {
    await page.evaluate(y => window.scrollTo(0, y), current + (delta * i) / steps);
    await sleep(50);
  }
}

// Utility: convert webm → mp4
function convertToMp4(webmPath, mp4Path) {
  console.log(`  Converting ${path.basename(webmPath)} → ${path.basename(mp4Path)} ...`);
  try {
    execSync(
      `ffmpeg -y -i "${webmPath}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -movflags +faststart -an "${mp4Path}"`,
      { stdio: "pipe" }
    );
    fs.unlinkSync(webmPath);
    console.log(`  ✓ Saved: ${path.basename(mp4Path)}`);
  } catch (e) {
    console.error(`  ✗ ffmpeg error: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────
// DEMO SCENARIOS
// ──────────────────────────────────────────────────
async function recordDashboard(page) {
  await page.goto(BASE_URL + "/");
  await page.waitForLoadState("networkidle");
  await sleep(1200);
  // Hover stat cards
  await page.hover('[data-testid="card-kpi-summary"]').catch(() => {});
  await sleep(600);
  // Slow scroll to show execution section
  await smoothScroll(page, 400, 30);
  await sleep(1500);
  await smoothScroll(page, 700, 20);
  await sleep(1000);
  await smoothScroll(page, 0, 20);
  await sleep(800);
}

async function recordKpis(page) {
  await page.goto(BASE_URL + "/kpis");
  await page.waitForLoadState("networkidle");
  await sleep(1200);
  // Scroll through KPI list
  await smoothScroll(page, 300, 25);
  await sleep(1000);
  await smoothScroll(page, 600, 20);
  await sleep(1000);
  // Click on first KPI row to show detail
  const firstRow = page.locator("table tbody tr, [data-testid*='kpi-row']").first();
  await firstRow.click().catch(() => {});
  await sleep(1200);
  await smoothScroll(page, 0, 20);
  await sleep(800);
}

async function recordPortfolio(page) {
  await page.goto(BASE_URL + "/portfolio");
  await page.waitForLoadState("networkidle");
  await sleep(1200);
  await smoothScroll(page, 300, 25);
  await sleep(1200);
  await smoothScroll(page, 600, 20);
  await sleep(1000);
  // Click first project to show detail
  const firstProject = page.locator("[data-testid^='card-project-']").first();
  if (await firstProject.count() > 0) {
    await firstProject.click();
    await page.waitForLoadState("networkidle");
    await sleep(1500);
    await smoothScroll(page, 400, 20);
    await sleep(1000);
  }
}

async function recordWorkload(page) {
  await page.goto(BASE_URL + "/workload");
  await page.waitForLoadState("networkidle");
  await sleep(1200);
  await smoothScroll(page, 300, 25);
  await sleep(1000);
  // Click first member to expand
  const firstMember = page.locator("[data-testid^='row-member-']").first();
  if (await firstMember.count() > 0) {
    await firstMember.click();
    await sleep(1200);
  }
  await smoothScroll(page, 600, 20);
  await sleep(1000);
  await smoothScroll(page, 0, 20);
  await sleep(600);
}

async function recordActions(page) {
  await page.goto(BASE_URL + "/actions");
  await page.waitForLoadState("networkidle");
  await sleep(1200);
  await smoothScroll(page, 300, 25);
  await sleep(1200);
  await smoothScroll(page, 600, 20);
  await sleep(1000);
  await smoothScroll(page, 0, 20);
  await sleep(800);
}

async function recordReviews(page) {
  await page.goto(BASE_URL + "/reviews");
  await page.waitForLoadState("networkidle");
  await sleep(1200);
  await smoothScroll(page, 300, 25);
  await sleep(1000);
  await smoothScroll(page, 600, 20);
  await sleep(1200);
  await smoothScroll(page, 0, 20);
  await sleep(800);
}

async function recordMeetings(page) {
  await page.goto(BASE_URL + "/meetings");
  await page.waitForLoadState("networkidle");
  await sleep(1200);
  await smoothScroll(page, 300, 25);
  await sleep(1000);
  await smoothScroll(page, 0, 20);
  await sleep(800);
}

// ──────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────
const DEMOS = [
  { name: "dashboard",  label: "Dashboard",         record: recordDashboard },
  { name: "kpis",       label: "KPI Management",    record: recordKpis },
  { name: "portfolio",  label: "Project Portfolio",  record: recordPortfolio },
  { name: "workload",   label: "Team Workload",      record: recordWorkload },
  { name: "actions",    label: "Action Tracker",     record: recordActions },
  { name: "reviews",    label: "Monthly Reviews",    record: recordReviews },
  { name: "meetings",   label: "Meeting Management", record: recordMeetings },
];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

  for (const demo of DEMOS) {
    console.log(`\n▶ Recording: ${demo.label}`);
    const mp4Path = path.join(OUT_DIR, `${demo.name}.mp4`);

    // Use a fresh context per demo with video recording
    const context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: TMP_DIR, size: VIEWPORT },
    });
    const page = await context.newPage();

    // Log in
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await page.evaluate(async () => {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: "demo@performo.ai", password: "demo123" }),
      });
    });
    await sleep(500);

    // Record the feature
    await demo.record(page);

    // Close context → saves .webm
    const videoPath = await page.video().path();
    await context.close();

    // Convert to MP4
    convertToMp4(videoPath, mp4Path);
  }

  await browser.close();

  // Clean up tmp
  try { fs.rmdirSync(TMP_DIR); } catch (_) {}

  console.log("\n✅ All demo videos recorded and converted.");
  console.log("   Files saved to: client/public/demos/");
})();
