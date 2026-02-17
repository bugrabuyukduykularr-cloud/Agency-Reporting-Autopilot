/**
 * scripts/test-fetchers.ts
 *
 * Quick smoke test for all Section 6 utilities and mock data.
 * Run with:  npx tsx scripts/test-fetchers.ts
 *
 * No network calls are made — only pure utility functions and mock data.
 */

import {
  getCurrentPeriod,
  getPreviousPeriod,
  formatPeriodLabel,
  calculateChange,
  getDaysBetween,
  getDaysInRange,
  formatDuration,
  safeDivide,
} from "../lib/utils/date-ranges";
import { generateMockUnifiedData } from "../lib/data-fetchers/mock-data";

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

// ── 1. calculateChange ───────────────────────────────────────────────────────

section("calculateChange()");

assert(
  "positive growth",
  calculateChange(120, 100) === 20,
  `got ${calculateChange(120, 100)}`
);
assert(
  "negative growth",
  calculateChange(80, 100) === -20,
  `got ${calculateChange(80, 100)}`
);
assert(
  "previous is 0 → returns 0",
  calculateChange(100, 0) === 0,
  `got ${calculateChange(100, 0)}`
);
assert(
  "no change",
  calculateChange(100, 100) === 0,
  `got ${calculateChange(100, 100)}`
);
assert(
  "rounds to 1 decimal",
  calculateChange(105, 100) === 5,
  `got ${calculateChange(105, 100)}`
);
assert(
  "fractional — 1/3 change",
  calculateChange(133, 100) === 33,
  `got ${calculateChange(133, 100)}`
);

// ── 2. safeDivide ────────────────────────────────────────────────────────────

section("safeDivide()");

assert("10 / 2 = 5", safeDivide(10, 2) === 5);
assert("divides by zero → 0", safeDivide(100, 0) === 0);
assert("0 / 5 = 0", safeDivide(0, 5) === 0);

// ── 3. formatDuration ────────────────────────────────────────────────────────

section("formatDuration()");

assert("60s → '1m 0s'", formatDuration(60) === "1m 0s");
assert("183s → '3m 3s'", formatDuration(183) === "3m 3s");
assert("45s → '45s'", formatDuration(45) === "45s");
assert("0s → '0s'", formatDuration(0) === "0s");
assert("negative clamped to 0s", formatDuration(-5) === "0s");

// ── 4. getDaysBetween ────────────────────────────────────────────────────────

section("getDaysBetween()");

assert(
  "Jan 1 – Jan 31 = 31",
  getDaysBetween("2026-01-01", "2026-01-31") === 31
);
assert(
  "same day = 1",
  getDaysBetween("2026-01-15", "2026-01-15") === 1
);
assert(
  "7-day week",
  getDaysBetween("2026-01-05", "2026-01-11") === 7
);

// ── 5. getDaysInRange ────────────────────────────────────────────────────────

section("getDaysInRange()");

const days = getDaysInRange({ start: "2026-01-01", end: "2026-01-07" });
assert("returns 7 items for 7-day range", days.length === 7);
assert("first item is start date", days[0] === "2026-01-01");
assert("last item is end date", days[6] === "2026-01-07");
assert("all items are YYYY-MM-DD", days.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));

// ── 6. getCurrentPeriod ──────────────────────────────────────────────────────

section("getCurrentPeriod()");

// Use a fixed reference date so results are stable
const ref = new Date("2026-02-17");

const monthly = getCurrentPeriod("monthly", ref);
assert(
  "monthly start = 2026-01-01",
  monthly.start === "2026-01-01",
  `got ${monthly.start}`
);
assert(
  "monthly end = 2026-01-31",
  monthly.end === "2026-01-31",
  `got ${monthly.end}`
);

const weekly = getCurrentPeriod("weekly", ref);
// Week of Feb 17 2026 (Tuesday) → previous Mon-Sun = Feb 9 – Feb 15
assert(
  "weekly start = 2026-02-09",
  weekly.start === "2026-02-09",
  `got ${weekly.start}`
);
assert(
  "weekly end = 2026-02-15",
  weekly.end === "2026-02-15",
  `got ${weekly.end}`
);

// ── 7. getPreviousPeriod ─────────────────────────────────────────────────────

section("getPreviousPeriod()");

const prevMonthly = getPreviousPeriod(monthly);
assert(
  "prev monthly start = 2025-12-01",
  prevMonthly.start === "2025-12-01",
  `got ${prevMonthly.start}`
);
assert(
  "prev monthly end = 2025-12-31",
  prevMonthly.end === "2025-12-31",
  `got ${prevMonthly.end}`
);

const prevWeekly = getPreviousPeriod(weekly);
assert(
  "prev weekly start = 2026-02-02",
  prevWeekly.start === "2026-02-02",
  `got ${prevWeekly.start}`
);
assert(
  "prev weekly end = 2026-02-08",
  prevWeekly.end === "2026-02-08",
  `got ${prevWeekly.end}`
);

// ── 8. formatPeriodLabel ─────────────────────────────────────────────────────

section("formatPeriodLabel()");

assert(
  "full month",
  formatPeriodLabel(monthly) === "January 2026",
  `got "${formatPeriodLabel(monthly)}"`
);

assert(
  "week within same year",
  formatPeriodLabel(weekly) === "Feb 9 – Feb 15, 2026",
  `got "${formatPeriodLabel(weekly)}"`
);

assert(
  "cross-year range",
  formatPeriodLabel({ start: "2025-12-29", end: "2026-01-04" }) ===
    "Dec 29, 2025 – Jan 4, 2026",
  `got "${formatPeriodLabel({ start: "2025-12-29", end: "2026-01-04" })}"`
);

// ── 9. generateMockUnifiedData ────────────────────────────────────────────────

section("generateMockUnifiedData()");

const mockData = generateMockUnifiedData(
  "client-abc",
  "Test Client",
  "agency-xyz",
  monthly,
  prevMonthly,
  ["ga4", "meta", "linkedin"]
);

assert("clientId set", mockData.clientId === "client-abc");
assert("clientName set", mockData.clientName === "Test Client");
assert("agencyId set", mockData.agencyId === "agency-xyz");
assert("periodStart matches", mockData.periodStart === monthly.start);
assert("periodEnd matches", mockData.periodEnd === monthly.end);
assert("no fetchErrors", mockData.fetchErrors.length === 0);

assert("ga4 present", mockData.ga4 !== null && mockData.ga4 !== undefined);
assert("metaAds present", mockData.metaAds !== null && mockData.metaAds !== undefined);
assert("linkedInAds present", mockData.linkedInAds !== null && mockData.linkedInAds !== undefined);

if (mockData.ga4) {
  assert("ga4.sessions > 0", mockData.ga4.sessions > 0);
  assert("ga4.sessionsChart has data", mockData.ga4.sessionsChart.length === 31);
  assert("ga4.topSources has entries", mockData.ga4.topSources.length > 0);
  assert("ga4.deviceBreakdown has entries", mockData.ga4.deviceBreakdown.length > 0);
}

if (mockData.metaAds) {
  assert("metaAds.spend > 0", mockData.metaAds.spend > 0);
  assert("metaAds.spendChart has data", mockData.metaAds.spendChart.length === 31);
  assert("metaAds.campaigns has entries", mockData.metaAds.campaigns.length > 0);
}

if (mockData.linkedInAds) {
  assert("linkedInAds.leads > 0", mockData.linkedInAds.leads > 0);
  assert("linkedInAds.spendChart has data", mockData.linkedInAds.spendChart.length === 31);
  assert("linkedInAds.campaigns has entries", mockData.linkedInAds.campaigns.length > 0);
}

// Determinism: same clientId → same results
const mockData2 = generateMockUnifiedData(
  "client-abc",
  "Test Client",
  "agency-xyz",
  monthly,
  prevMonthly,
  ["ga4"]
);
assert(
  "mock data is deterministic (same seed → same sessions)",
  mockData.ga4?.sessions === mockData2.ga4?.sessions
);

// Platform filter: only ga4
const mockGa4Only = generateMockUnifiedData(
  "client-abc",
  "Test Client",
  "agency-xyz",
  monthly,
  prevMonthly,
  ["ga4"]
);
assert("only ga4 — metaAds is null", mockGa4Only.metaAds === null);
assert("only ga4 — linkedInAds is null", mockGa4Only.linkedInAds === null);
assert("only ga4 — ga4 present", mockGa4Only.ga4 !== null);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(64)}`);
console.log(`  ${passed} passed  ·  ${failed} failed`);
console.log("═".repeat(64));

if (failed > 0) {
  console.error("\nSome tests failed — review the output above.");
  process.exit(1);
} else {
  console.log("\nAll fetcher utilities working correctly.");
}
