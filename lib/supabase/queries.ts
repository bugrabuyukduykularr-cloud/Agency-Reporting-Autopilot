import type { SupabaseClient } from "@supabase/supabase-js";
import type { Agency, Client, Report, ReportWithClientName } from "@/types/database";
import type { DashboardStats, ReportStatus } from "@/types/index";

// ---------------------------------------------------------------------------
// Internal raw type for the joined report query (Supabase returns nested obj)
// ---------------------------------------------------------------------------
interface RawReportRow {
  id: string;
  client_id: string;
  agency_id: string;
  period_start: string;
  period_end: string;
  status: string;
  pdf_url: string | null;
  public_link: string | null;
  ai_commentary: Record<string, unknown> | null;
  raw_data: Record<string, unknown> | null;
  sent_at: string | null;
  opened_at: string | null;
  created_at: string;
  clients: { name: string } | null;
}

// ---------------------------------------------------------------------------
// getAgency
// ---------------------------------------------------------------------------
export async function getAgency(
  supabase: SupabaseClient
): Promise<Agency | null> {
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("[getAgency]", error.message);
    return null;
  }
  return data as Agency;
}

// ---------------------------------------------------------------------------
// getClients
// ---------------------------------------------------------------------------
export async function getClients(
  supabase: SupabaseClient,
  agencyId: string
): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getClients]", error.message);
    return [];
  }
  return (data ?? []) as Client[];
}

// ---------------------------------------------------------------------------
// getRecentReports
// ---------------------------------------------------------------------------
export async function getRecentReports(
  supabase: SupabaseClient,
  agencyId: string,
  limit = 10
): Promise<ReportWithClientName[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*, clients(name)")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getRecentReports]", error.message);
    return [];
  }
  if (!data) return [];

  return (data as unknown as RawReportRow[]).map(
    (row): ReportWithClientName => ({
      id: row.id,
      client_id: row.client_id,
      agency_id: row.agency_id,
      period_start: row.period_start,
      period_end: row.period_end,
      status: row.status as ReportStatus,
      pdf_url: row.pdf_url,
      public_link: row.public_link,
      ai_commentary: row.ai_commentary,
      raw_data: row.raw_data,
      sent_at: row.sent_at,
      opened_at: row.opened_at,
      created_at: row.created_at,
      client_name: row.clients?.name ?? "Unknown",
    })
  );
}

// ---------------------------------------------------------------------------
// getDashboardStats
// ---------------------------------------------------------------------------
export async function getDashboardStats(
  supabase: SupabaseClient,
  agencyId: string
): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [clientsRes, reportsSentRes, pendingRes, openRateRes] =
    await Promise.all([
      // Total active clients
      supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("active", true),

      // Reports sent this month
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .gte("sent_at", startOfMonth),

      // Pending (ready to send)
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("status", "ready"),

      // All sent reports — to calculate open rate
      supabase
        .from("reports")
        .select("opened_at")
        .eq("agency_id", agencyId)
        .eq("status", "sent"),
    ]);

  const openRateData = (openRateRes.data ?? []) as Array<{
    opened_at: string | null;
  }>;
  const totalSent = openRateData.length;
  const opened = openRateData.filter((r) => r.opened_at !== null).length;
  const avgOpenRate = totalSent > 0 ? (opened / totalSent) * 100 : 0;

  return {
    totalClients: clientsRes.count ?? 0,
    reportsSentThisMonth: reportsSentRes.count ?? 0,
    pendingReports: pendingRes.count ?? 0,
    avgOpenRate,
  };
}

// Re-export Report type helper for consumers that only import from queries
export type { Report };
