import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  parseISO,
  differenceInDays,
  addDays,
  subDays,
} from "date-fns";
import type { DateRange } from "@/types/report-data";

/**
 * Returns the date range for the previous completed period.
 * Monthly → previous calendar month
 * Weekly  → previous Mon-Sun week
 */
export function getCurrentPeriod(
  schedule: "monthly" | "weekly",
  referenceDate?: Date
): DateRange {
  const ref = referenceDate ?? new Date();

  if (schedule === "monthly") {
    const lastMonth = subMonths(ref, 1);
    return {
      start: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
      end: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
    };
  }

  // weekly: Monday–Sunday of last week
  const lastWeekSunday = endOfWeek(subWeeks(ref, 1), { weekStartsOn: 1 });
  const lastWeekMonday = startOfWeek(lastWeekSunday, { weekStartsOn: 1 });
  return {
    start: format(lastWeekMonday, "yyyy-MM-dd"),
    end: format(lastWeekSunday, "yyyy-MM-dd"),
  };
}

/**
 * Returns the period immediately before the given period.
 * Same duration as the current period.
 */
export function getPreviousPeriod(currentPeriod: DateRange): DateRange {
  const start = parseISO(currentPeriod.start);
  const end = parseISO(currentPeriod.end);
  const duration = differenceInDays(end, start); // inclusive-1

  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, duration);

  return {
    start: format(prevStart, "yyyy-MM-dd"),
    end: format(prevEnd, "yyyy-MM-dd"),
  };
}

/**
 * Human-readable label for a date range.
 * Single-month: "January 2026"
 * Week or cross-month: "Feb 10 – Feb 16, 2026"
 */
export function formatPeriodLabel(dateRange: DateRange): string {
  const start = parseISO(dateRange.start);
  const end = parseISO(dateRange.end);

  // Full calendar month?
  const isFullMonth =
    format(start, "yyyy-MM-dd") === format(startOfMonth(start), "yyyy-MM-dd") &&
    format(end, "yyyy-MM-dd") === format(endOfMonth(start), "yyyy-MM-dd") &&
    start.getMonth() === end.getMonth();

  if (isFullMonth) {
    return format(start, "MMMM yyyy");
  }

  // Same year
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }

  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

/**
 * Number of days between two dates, inclusive.
 * e.g. Jan 1 to Jan 31 = 31
 */
export function getDaysBetween(start: string, end: string): number {
  return differenceInDays(parseISO(end), parseISO(start)) + 1;
}

/**
 * Converts seconds to "Xm Ys" format.
 * e.g. 183 → "3m 3s"
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

/**
 * Percentage change from previous to current, rounded to 1 decimal.
 * Returns 0 if previous is 0 (avoid divide-by-zero).
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/**
 * Generates an array of YYYY-MM-DD strings for every day in the range.
 * Useful for building chart data arrays with no gaps.
 */
export function getDaysInRange(dateRange: DateRange): string[] {
  const start = parseISO(dateRange.start);
  const days = getDaysBetween(dateRange.start, dateRange.end);
  return Array.from({ length: days }, (_, i) =>
    format(addDays(start, i), "yyyy-MM-dd")
  );
}

/**
 * Safe division helper — returns 0 if denominator is 0.
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}
