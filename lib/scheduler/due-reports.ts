import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addMonths,
  setDate,
  setHours,
  setMinutes,
  nextDay,
  addWeeks,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import type { Agency, Client } from "@/types/database";

// ── Get clients due for report ───────────────────────────────────────────────

export type ClientWithAgency = Client & { agencies: Agency };

export async function getClientsDueForReport(
  supabase: SupabaseClient
): Promise<ClientWithAgency[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("clients")
    .select("*, agencies(*)")
    .eq("active", true)
    .neq("report_schedule", "on_demand")
    .lte("next_report_at", now)
    .order("next_report_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[scheduler] Failed to query due clients:", error.message);
    return [];
  }

  // Filter: only agencies with active/trial plan
  const rows = (data ?? []) as unknown as ClientWithAgency[];
  return rows.filter(
    (r) => r.agencies.plan === "active" || r.agencies.plan === "trial"
  );
}

// ── Calculate next report date ───────────────────────────────────────────────

const DAY_INDEX: Record<number, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  0: 0, // Sunday
  1: 1, // Monday
  2: 2, // Tuesday
  3: 3, // Wednesday
  4: 4, // Thursday
  5: 5, // Friday
  6: 6, // Saturday
};

export function calculateNextReportDate(
  client: Client,
  currentDate: Date = new Date()
): Date | null {
  if (client.report_schedule === "on_demand") return null;

  const tz = client.timezone || "UTC";
  const [hh, mm] = (client.report_time ?? "09:00").split(":").map(Number);

  if (client.report_schedule === "monthly") {
    // report_day is 1-28
    const reportDay = Math.min(Math.max(client.report_day ?? 1, 1), 28);

    // Start from next month
    const nextDate = addMonths(currentDate, 1);
    // Convert to the client's timezone to set the correct day/time
    const zoned = toZonedTime(nextDate, tz);
    const withDay = setDate(zoned, reportDay);
    const withHour = setHours(withDay, hh);
    const adjusted = setMinutes(withHour, mm);

    // Convert back to UTC for storage
    return fromZonedTime(adjusted, tz);
  }

  if (client.report_schedule === "weekly") {
    // report_day: 0=Sun, 1=Mon, etc.
    const targetDay = DAY_INDEX[client.report_day ?? 1] ?? 1;

    // Find next occurrence of that weekday
    const zoned = toZonedTime(currentDate, tz);
    let next = nextDay(zoned, targetDay);

    // If next would be today, push to next week
    if (next.getTime() <= currentDate.getTime()) {
      next = addWeeks(next, 1);
    }

    next = setHours(next, hh);
    next = setMinutes(next, mm);

    return fromZonedTime(next, tz);
  }

  return null;
}
