export type UserRole = "admin" | "client";
export type ContentStatus = "Suggested" | "Additional" | "Submitted" | "Approved" | "Deleted";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  active: boolean;
  social_integrations: Record<string, unknown>;
  magic_link_token: string;
  magic_link_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Platform {
  id: string;
  name: string;
  enabled: boolean;
  types: string[];
  created_at: string;
}

export interface Content {
  id: string;
  client_id: string;
  title: string;
  caption: string;
  body: string;
  platform: string;
  type: string;
  status: ContentStatus;
  hashtags: string[];
  cta: string;
  notes: string;
  media: string[];
  date: string;
  previous_status: ContentStatus | null;
  timezone: string;
  scheduled_date: string | null;
  scheduled_time: string;
  created_at: string;
  updated_at: string;
}

export interface SocialConnection {
  id: string;
  client_id: string;
  platform: string;
  connected: boolean;
  account_name: string;
  account_id: string;
  access_token: string;
  token_expires_in: number;
  pages: FacebookPage[];
  selected_business_id: string;
  selected_business_name: string;
  selected_page_id: string;
  selected_page_name: string;
  created_at: string;
  updated_at: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

// Extended types with joins
export interface ContentWithClient extends Content {
  clients?: Client;
}

export interface ProfileWithClient extends Profile {
  clients?: Client;
}
