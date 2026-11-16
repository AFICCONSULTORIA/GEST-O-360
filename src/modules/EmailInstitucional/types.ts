export type EmailProviderType = 'simulated' | 'resend' | 'supabase_edge' | 'smtp_imap';

export type EmailAccountType = 'mailbox' | 'alias' | 'secretariat';

export type EmailAccountStatus = 'active' | 'suspended' | 'pending';

export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';

export type EmailDeliveryStatus = 'delivered' | 'sent' | 'queued' | 'simulated' | 'failed';

export interface EmailProviderConfig {
  resend_api_key_hint?: string;
  edge_function_name?: string;
  webhook_url?: string;
  smtp_host?: string;
  smtp_port?: number;
  imap_host?: string;
  imap_port?: number;
  use_tls?: boolean;
  default_from_name?: string;
  reply_to?: string;
  webmail_enabled?: boolean;
  allow_self_password_change?: boolean;
  default_quota_mb?: number;
  require_official_signature?: boolean;
  maintenance_message?: string;
}

export interface InstitutionalEmailDomain {
  id: string;
  institution_id: string;
  domain: string;
  is_primary: boolean;
  mx_verified: boolean;
  spf_verified: boolean;
  dkim_verified: boolean;
  dmarc_verified: boolean;
  dkim_selector: string;
  dkim_public_key: string;
  provider_type: EmailProviderType;
  provider_config: EmailProviderConfig;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InstitutionalEmailAccount {
  id: string;
  institution_id: string;
  domain_id?: string | null;
  email_address: string;
  display_name: string;
  account_type: EmailAccountType;
  department_name?: string | null;
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  forward_to?: string | null;
  quota_mb: number;
  used_mb: number;
  signature_html?: string | null;
  password_hash?: string | null;
  last_login_at?: string | null;
  status: EmailAccountStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InstitutionalEmailMessage {
  id: string;
  institution_id: string;
  account_id: string;
  folder: EmailFolder;
  from_address: string;
  from_name: string;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  body_text: string;
  body_html?: string | null;
  is_read: boolean;
  is_starred: boolean;
  thread_id?: string | null;
  external_message_id?: string | null;
  delivery_status: EmailDeliveryStatus;
  delivery_provider?: string | null;
  sent_at: string;
  created_at: string;
  updated_at: string;
}

export interface SendEmailPayload {
  accountId: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  isDraft?: boolean;
  threadId?: string;
}
