// Shared app types - will be populated as features are built
export type Plan = "trial" | "active" | "cancelled";
export type ReportSchedule = "monthly" | "weekly" | "on_demand";
export type Platform = "google_analytics" | "meta_ads" | "linkedin_ads";
export type ConnectionStatus = "connected" | "error" | "expired";
export type ReportStatus = "generating" | "ready" | "sent" | "failed";
export type TeamRole = "owner" | "admin" | "viewer";
