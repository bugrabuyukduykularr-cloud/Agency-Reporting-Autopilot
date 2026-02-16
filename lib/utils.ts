import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReportSchedule } from "@/types/index";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Avatar helpers
// ---------------------------------------------------------------------------
const AVATAR_COLORS = [
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#3B82F6", // blue
  "#EF4444", // red
  "#14B8A6", // teal
  "#F97316", // orange
  "#84CC16", // lime
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// ---------------------------------------------------------------------------
// calculateNextReportAt
// ---------------------------------------------------------------------------
/**
 * Given a schedule, day, time, and timezone, returns the ISO string of the
 * next report date/time, or null when schedule is "on_demand".
 *
 * - monthly:  next occurrence of `report_day` (1–28) at `report_time` in `timezone`
 * - weekly:   next occurrence of `report_day` weekday (0=Sun, 1=Mon … 6=Sat)
 *             at `report_time` in `timezone`
 * - on_demand: returns null
 */
export function calculateNextReportAt(
  schedule: ReportSchedule,
  reportDay: number | null,
  reportTime: string | null,
  timezone: string
): string | null {
  if (schedule === "on_demand") return null;

  const time = reportTime ?? "09:00";
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr ?? "0", 10);

  // Build a date in the target timezone using Intl tricks
  const now = new Date();

  if (schedule === "monthly") {
    const day = reportDay ?? 1;
    // Try this month first
    let candidate = buildDateInTimezone(
      now.getFullYear(),
      now.getMonth(),
      day,
      hour,
      minute,
      timezone
    );
    if (candidate <= now) {
      // Move to next month
      const nextMonth = now.getMonth() + 1;
      const nextYear = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
      candidate = buildDateInTimezone(
        nextYear,
        nextMonth % 12,
        day,
        hour,
        minute,
        timezone
      );
    }
    return candidate.toISOString();
  }

  if (schedule === "weekly") {
    const targetDay = reportDay ?? 1; // 0 = Sunday, 1 = Monday, …
    // Find the next occurrence of targetDay
    const candidate = new Date(now);
    const currentDay = candidate.getDay(); // 0-6 in local time
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0) {
      // Check if today's time has passed
      const todayCandidate = buildDateInTimezone(
        candidate.getFullYear(),
        candidate.getMonth(),
        candidate.getDate(),
        hour,
        minute,
        timezone
      );
      if (todayCandidate <= now) daysUntil = 7;
    }
    candidate.setDate(candidate.getDate() + daysUntil);
    const result = buildDateInTimezone(
      candidate.getFullYear(),
      candidate.getMonth(),
      candidate.getDate(),
      hour,
      minute,
      timezone
    );
    return result.toISOString();
  }

  return null;
}

/** Build a UTC Date that corresponds to a local datetime in `timezone`. */
function buildDateInTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Use the Temporal-like approach: create a string and parse it with the
  // timezone offset inferred from Intl.DateTimeFormat.
  // We build a local datetime string and then find the UTC offset for that tz.
  const localStr = `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

  // Parse as if it were UTC, then adjust for the actual timezone offset.
  const utcDate = new Date(localStr + "Z");

  // Get what Intl reports as the local time in `timezone` for this UTC instant.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(utcDate).map((p) => [p.type, p.value])
  );

  const tzHour = parseInt(parts["hour"] === "24" ? "0" : parts["hour"], 10);
  const tzMinute = parseInt(parts["minute"], 10);
  const tzDay = parseInt(parts["day"], 10);

  // Compute offset in minutes
  const desiredMinutes = hour * 60 + minute;
  const actualMinutes = tzHour * 60 + tzMinute;

  // Account for date wrapping (tzDay vs day)
  let dayOffset = 0;
  if (tzDay > day) dayOffset = -1;
  else if (tzDay < day) dayOffset = 1;

  const offsetMs = (desiredMinutes - actualMinutes + dayOffset * 24 * 60) * 60 * 1000;
  return new Date(utcDate.getTime() + offsetMs);
}
