import type {
  Plan,
  ReportSchedule,
  Platform,
  ConnectionStatus,
  ReportStatus,
  TeamRole,
} from "./index";

export interface Agency {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  custom_domain: string | null;
  reply_to_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  trial_ends_at: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  agency_id: string;
  name: string;
  logo_url: string | null;
  contact_emails: string[];
  report_schedule: ReportSchedule;
  report_day: number;
  report_time: string;
  timezone: string;
  next_report_at: string | null;
  active: boolean;
  created_at: string;
}

export interface DataConnection {
  id: string;
  client_id: string;
  agency_id: string;
  platform: Platform;
  account_id: string;
  account_name: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[];
  status: ConnectionStatus;
  last_synced_at: string | null;
  error_message: string | null;
}

export interface Report {
  id: string;
  client_id: string;
  agency_id: string;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  pdf_url: string | null;
  public_link: string | null;
  ai_commentary: Record<string, unknown> | null;
  raw_data: Record<string, unknown> | null;
  sent_at: string | null;
  opened_at: string | null;
  created_at: string;
}

export interface ReportSection {
  id: string;
  client_id: string;
  agency_id: string;
  platform: Platform;
  section_type: string;
  title: string;
  enabled: boolean;
  sort_order: number;
  custom_metrics: Record<string, unknown> | null;
}

export interface TeamMember {
  id: string;
  agency_id: string;
  user_id: string;
  role: TeamRole;
  invited_at: string;
  joined_at: string | null;
}
