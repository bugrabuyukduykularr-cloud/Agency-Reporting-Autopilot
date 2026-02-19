export interface EmailDelivery {
  id: string;
  report_id: string;
  agency_id: string;
  recipient_email: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  bounced: boolean;
  bounce_reason: string | null;
  resend_message_id: string | null;
  created_at: string;
}

export interface EmailTemplate {
  to: string[];
  cc?: string[];
  subject: string;
  replyTo: string;
}
