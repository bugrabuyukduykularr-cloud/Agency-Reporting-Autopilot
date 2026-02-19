/**
 * scripts/test-email.ts
 *
 * Tests the email rendering pipeline without actually sending.
 * Also tests calculateNextReportDate logic.
 *
 * Run with:  npx tsx scripts/test-email.ts
 */

import { render } from "@react-email/components";
import ReportDeliveryEmail from "../emails/report-delivery";
import ReportFailedEmail from "../emails/report-failed";
import { calculateNextReportDate } from "../lib/scheduler/due-reports";
import type { Client } from "../types/database";

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function section(title: string) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
}

// Wrap in async IIFE to support top-level await in CJS output
(async () => {

// ── 1. Report Delivery Email ─────────────────────────────────────────────────

section("Report Delivery Email Rendering");

const deliveryHtml = await render(
  ReportDeliveryEmail({
    clientName: "Test Corp",
    periodLabel: "January 2026",
    agencyName: "Test Agency",
    agencyLogoUrl: null,
    agencyPrimaryColor: "#3B82F6",
    reportViewerUrl: "https://app.example.com/r/test-link",
    pdfDownloadUrl: "https://storage.example.com/report.pdf",
    recipientEmail: "client@test.com",
    replyToEmail: "hello@agency.com",
  })
);

assert("renders HTML string", typeof deliveryHtml === "string");
assert("contains period label", deliveryHtml.includes("January 2026"));
assert("contains agency name", deliveryHtml.includes("Test Agency"));
assert("contains View Report button", deliveryHtml.includes("View Report Online"));
assert("contains Download PDF button", deliveryHtml.includes("Download PDF"));
assert("contains tracking pixel", deliveryHtml.includes("/api/track/open"));
assert("HTML length > 1000", deliveryHtml.length > 1000, `got ${deliveryHtml.length}`);

// ── 2. Report Failed Email ───────────────────────────────────────────────────

section("Report Failed Email Rendering");

const failedHtml = await render(
  ReportFailedEmail({
    clientName: "Test Corp",
    periodLabel: "January 2026",
    agencyName: "Test Agency",
    errorMessage: "Token expired for Google Analytics",
    clientSettingsUrl: "https://app.example.com/clients/abc123",
  })
);

assert("renders HTML string", typeof failedHtml === "string");
assert("contains error message", failedHtml.includes("Token expired"));
assert("contains client name", failedHtml.includes("Test Corp"));
assert("contains View Client Settings", failedHtml.includes("View Client Settings"));
assert("has red accent", failedHtml.includes("#DC2626") || failedHtml.includes("dc2626"));

// ── 3. calculateNextReportDate — Monthly ─────────────────────────────────────

section("calculateNextReportDate() — Monthly");

const monthlyClient: Client = {
  id: "test-1",
  agency_id: "agency-1",
  name: "Monthly Client",
  logo_url: null,
  contact_emails: [],
  report_schedule: "monthly",
  report_day: 15,
  report_time: "09:00",
  timezone: "UTC",
  next_report_at: null,
  active: true,
  ai_tone: "professional",
  created_at: "2026-01-01",
};

const jan10 = new Date("2026-01-10T12:00:00Z");
const nextMonthly = calculateNextReportDate(monthlyClient, jan10);
assert("returns a Date", nextMonthly instanceof Date);
assert(
  "next is Feb 15, 2026",
  nextMonthly !== null &&
    nextMonthly.getUTCMonth() === 1 && // Feb = 1
    nextMonthly.getUTCDate() === 15,
  `got ${nextMonthly?.toISOString()}`
);
assert(
  "time is 09:00 UTC",
  nextMonthly !== null && nextMonthly.getUTCHours() === 9,
  `got hour ${nextMonthly?.getUTCHours()}`
);

// ── 4. calculateNextReportDate — Weekly ──────────────────────────────────────

section("calculateNextReportDate() — Weekly");

const weeklyClient: Client = {
  id: "test-2",
  agency_id: "agency-1",
  name: "Weekly Client",
  logo_url: null,
  contact_emails: [],
  report_schedule: "weekly",
  report_day: 1, // Monday
  report_time: "10:00",
  timezone: "UTC",
  next_report_at: null,
  active: true,
  ai_tone: "professional",
  created_at: "2026-01-01",
};

const wed = new Date("2026-02-18T12:00:00Z"); // Wednesday
const nextWeekly = calculateNextReportDate(weeklyClient, wed);
assert("returns a Date", nextWeekly instanceof Date);
assert(
  "next is a Monday",
  nextWeekly !== null && nextWeekly.getUTCDay() === 1,
  `got day ${nextWeekly?.getUTCDay()} (${nextWeekly?.toISOString()})`
);
assert(
  "time is 10:00 UTC",
  nextWeekly !== null && nextWeekly.getUTCHours() === 10,
  `got hour ${nextWeekly?.getUTCHours()}`
);
assert(
  "next Monday is Feb 23",
  nextWeekly !== null && nextWeekly.getUTCDate() === 23,
  `got date ${nextWeekly?.getUTCDate()}`
);

// ── 5. calculateNextReportDate — On Demand ───────────────────────────────────

section("calculateNextReportDate() — On Demand");

const onDemandClient: Client = {
  ...monthlyClient,
  id: "test-3",
  report_schedule: "on_demand",
};

const nextOnDemand = calculateNextReportDate(onDemandClient);
assert("returns null", nextOnDemand === null);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(64)}`);
console.log(`  ${passed} passed  ·  ${failed} failed`);
console.log("═".repeat(64));

if (failed > 0) {
  console.error("\nSome tests failed — review the output above.");
  process.exit(1);
} else {
  console.log("\nAll email utilities working correctly.");
}

})();
