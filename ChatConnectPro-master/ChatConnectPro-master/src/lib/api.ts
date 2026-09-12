import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_BOT_API_URL || "http://localhost:3000";

export type BotStatus = {
  status: string;
  bot: "connected" | "initializing" | "stopped" | "paused";
  phone: string | null;
};

export type ChatMessage = {
  id: number;
  sender: string;
  name: string | null;
  message: string;
  direction: "incoming" | "outgoing";
  recipient: string | null;
  platform: string | null;
  instance_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type Conversation = {
  sender: string;
  name: string;
  last_message: string;
  last_chat: string;
};

export type KnowledgeItem = {
  id: number;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BotInstance = {
  id: string;
  user_id: string;
  phone: string | null;
  status: "connected" | "initializing" | "stopped" | "paused";
  instance_id: string;
  platform?: string;
  credentials?: Record<string, any> | null;
  previous_credentials?: { saved_at: string; credentials: any }[];
  created_at: string;
  updated_at: string;
};

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    let msg: string;
    try {
      const json = JSON.parse(body);
      msg = json.error || json.detail || body;
    } catch {
      msg = body;
    }
    throw new Error(msg);
  }
  return res.json();
}

async function authFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const body = await res.text();
    let msg: string;
    try {
      const json = JSON.parse(body);
      msg = json.error || json.detail || body;
    } catch {
      msg = body;
    }
    throw new Error(msg);
  }
  return res.json();
}

// ─── FASE 9: Types ────────────────────────────────
export type AutoReplyRule = {
  id: number;
  user_id: string;
  instance_id: string | null;
  platform: string;
  keyword: string;
  reply: string;
  match_type: "exact" | "contains" | "starts" | "regex";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Template = {
  id: number;
  user_id: string;
  name: string;
  content: string;
  platform: string;
  category: string;
  created_at: string;
  updated_at: string;
};

export type ScheduledMessage = {
  id: number;
  user_id: string;
  instance_id: string | null;
  platform: string;
  recipient: string;
  message: string;
  scheduled_at: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  business_name?: string | null;
  phone?: string | null;
  additional_email?: string | null;
  address?: string | null;
  logo_url?: string | null;
  last_login: string;
  created_at: string;
};

// Active instanceId management
const INSTANCE_KEY = "mc_active_instance";

export function getActiveInstance(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(INSTANCE_KEY);
}

export function setActiveInstance(instanceId: string | null): void {
  if (typeof window === "undefined") return;
  if (instanceId) {
    localStorage.setItem(INSTANCE_KEY, instanceId);
  } else {
    localStorage.removeItem(INSTANCE_KEY);
  }
}



export const api = {
  // Legacy (public) endpoints — backward compatibility
  getStatus: () => fetchJson<BotStatus>("/"),

  getConversations: (instanceId?: string, platform?: string) => {
    const params = new URLSearchParams();
    if (instanceId) params.set("instance_id", instanceId);
    if (platform) params.set("platform", platform);
    const qs = params.toString();
    return authFetchJson<Conversation[]>(`/api/conversations${qs ? `?${qs}` : ""}`);
  },

  getChats: (sender?: string, limit = 100, instanceId?: string, platform?: string) => {
    const params = new URLSearchParams();
    if (sender) params.set("sender", sender);
    if (instanceId) params.set("instance_id", instanceId);
    if (platform) params.set("platform", platform);
    params.set("limit", String(limit));
    return authFetchJson<ChatMessage[]>(`/api/chats?${params}`);
  },

  getKnowledge: () => authFetchJson<KnowledgeItem[]>("/api/knowledge"),

  createKnowledge: (data: { question: string; answer: string; category?: string }) =>
    authFetchJson<KnowledgeItem>("/api/knowledge", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateKnowledge: (id: number, data: Partial<KnowledgeItem>) =>
    authFetchJson<KnowledgeItem>(`/api/knowledge/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteKnowledge: (id: number) =>
    authFetchJson<{ success: boolean }>(`/api/knowledge/${id}`, {
      method: "DELETE",
    }),

  bulkDeleteKnowledge: (ids: number[]) =>
    authFetchJson<{ success: boolean; deleted: number }>("/api/knowledge/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  refreshKnowledge: () =>
    authFetchJson<{ success: boolean }>("/api/knowledge/refresh", {
      method: "POST",
    }),

  importUrl: (url: string, generateAi = false, crawl = false, maxPages = 20, maxDepth = 3) =>
    authFetchJson<{ success: boolean; count: number; saved: number; pages_crawled?: number; total_chars?: number; urls?: string[] }>("/api/knowledge/import-url", {
      method: "POST",
      body: JSON.stringify({ url, generate_ai: generateAi, crawl, max_pages: maxPages, max_depth: maxDepth }),
    }),

  startCrawl: (url: string, generateAi = false, maxPages = 20, maxDepth = 3) =>
    authFetchJson<{ jobId: string }>("/api/knowledge/import-url", {
      method: "POST",
      body: JSON.stringify({ url, generate_ai: generateAi, crawl: true, max_pages: maxPages, max_depth: maxDepth }),
    }),

  getCrawlProgress: (jobId: string) =>
    authFetchJson<{
      status: "running" | "done" | "error";
      progress: number;
      currentPage: number;
      totalPages: number;
      currentUrl: string;
      pagesFound: number;
      linksFound: number;
      result?: { success: boolean; count: number; saved: number; pages_crawled: number; total_chars: number; urls: string[] };
      error?: string;
    }>(`/api/knowledge/crawl-progress/${jobId}`),

  deleteChat: (sender: string) =>
    authFetchJson<{ success: boolean }>(`/api/chats/${encodeURIComponent(sender)}`, {
      method: "DELETE",
    }),

  bulkDeleteConversations: (senders: string[]) =>
    authFetchJson<{ success: boolean; deleted: number }>("/api/chats/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ senders }),
    }),

  clearAllChats: () =>
    authFetchJson<{ success: boolean; deleted?: number }>("/api/chats", {
      method: "DELETE",
    }),

  importFile: async (files: File[], generateAi = false) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("generate_ai", String(generateAi));
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/knowledge/import-file`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      let msg: string;
      try {
        const json = JSON.parse(body);
        msg = json.error || json.detail || body;
      } catch {
        msg = body;
      }
      throw new Error(msg);
    }
    return res.json() as Promise<{ success: boolean; count: number; saved: number; warnings?: string[] }>;
  },

  // ===== Instance-based endpoints (authenticated) =====

  getInstances: () =>
    authFetchJson<BotInstance[]>("/api/bot/instances"),

  createInstance: () =>
    authFetchJson<{ instanceId: string }>("/api/bot/create", {
      method: "POST",
    }),

  deleteInstance: (instanceId: string) =>
    authFetchJson<{ success: boolean; message: string }>(`/api/bot/${instanceId}`, {
      method: "DELETE",
    }),

  getBotStatus: (instanceId: string) =>
    authFetchJson<BotStatus>(`/api/bot/${instanceId}`),

  getQrCode: (instanceId: string) =>
    authFetchJson<{ qr: string | null; message?: string }>(`/api/bot/${instanceId}/qr`),

  restartBot: (instanceId: string) =>
    authFetchJson<{ success: boolean; message: string }>(`/api/bot/${instanceId}/restart`, {
      method: "POST",
    }),

  stopBot: (instanceId: string) =>
    authFetchJson<{ success: boolean; message: string }>(`/api/bot/${instanceId}/stop`, {
      method: "POST",
    }),

  logoutBot: (instanceId: string) =>
    authFetchJson<{ success: boolean; message: string }>(`/api/bot/${instanceId}/logout`, {
      method: "POST",
    }),

  sendMessage: (instanceId: string, to: string, message: string) =>
    authFetchJson<{ success: boolean }>(`/api/bot/${instanceId}/send`, {
      method: "POST",
      body: JSON.stringify({ to, message }),
    }),

  disableBotForSender: (instanceId: string, sender: string) =>
    authFetchJson<{ success: boolean; message: string }>(`/api/bot/${instanceId}/disable-sender`, {
      method: "POST",
      body: JSON.stringify({ sender }),
    }),

  enableBotForSender: (instanceId: string, sender: string) =>
    authFetchJson<{ success: boolean; message: string }>(`/api/bot/${instanceId}/enable-sender`, {
      method: "POST",
      body: JSON.stringify({ sender }),
    }),

  getDisabledSenders: (instanceId: string) =>
    authFetchJson<{ senders: string[] }>(`/api/bot/${instanceId}/disabled-senders`),

  pauseBot: (instanceId: string) =>
    authFetchJson<{ success: boolean; message: string }>(`/api/bot/${instanceId}/pause`, {
      method: "POST",
    }),

  resumeBot: (instanceId: string) =>
    authFetchJson<{ success: boolean; message: string }>(`/api/bot/${instanceId}/resume`, {
      method: "POST",
    }),

  getAnalytics: () =>
    authFetchJson<AnalyticsData>("/api/analytics"),

  // Instagram
  connectInstagram: (data: { page_id: string; access_token: string; ig_user_id: string; verify_token: string }) =>
    authFetchJson<{ success: boolean; message: string }>("/api/channel/instagram/connect", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  testInstagramConnection: () =>
    authFetchJson<{ ok: boolean; message: string }>("/api/channel/instagram/test", {
      method: "POST",
    }),

  getInstagramStatus: () =>
    authFetchJson<{ connected: boolean; configured: boolean; ig_user_id: string | null; status: string }>("/api/channel/instagram/status"),

  // Messenger
  connectMessenger: (data: { page_id: string; access_token: string; verify_token: string; app_secret: string }) =>
    authFetchJson<{ success: boolean; message: string }>("/api/channel/messenger/connect", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  testMessengerConnection: () =>
    authFetchJson<{ ok: boolean; message: string }>("/api/channel/messenger/test", {
      method: "POST",
    }),

  getMessengerStatus: () =>
    authFetchJson<{ connected: boolean; configured: boolean; page_id: string | null; status: string }>("/api/channel/messenger/status"),

  // ─── FASE 9: Export Chats ────────────────────────
  exportChats: (format: "csv" | "json" = "csv", platform?: string) => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (platform) params.set("platform", platform);
    return authFetchJson<any[]>(`/api/chats/export?${params}`);
  },

  // ─── FASE 9: Auto-Reply Rules ────────────────────
  getAutoReplyRules: () =>
    authFetchJson<AutoReplyRule[]>("/api/auto-reply"),

  createAutoReplyRule: (data: { keyword: string; reply: string; match_type?: string; platform?: string; instance_id?: string }) =>
    authFetchJson<AutoReplyRule>("/api/auto-reply", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAutoReplyRule: (id: number, data: Partial<AutoReplyRule>) =>
    authFetchJson<AutoReplyRule>(`/api/auto-reply/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteAutoReplyRule: (id: number) =>
    authFetchJson<{ success: boolean }>(`/api/auto-reply/${id}`, {
      method: "DELETE",
    }),

  // ─── FASE 9: Templates ───────────────────────────
  getTemplates: () =>
    authFetchJson<Template[]>("/api/templates"),

  createTemplate: (data: { name: string; content: string; platform?: string; category?: string }) =>
    authFetchJson<Template>("/api/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTemplate: (id: number, data: Partial<Template>) =>
    authFetchJson<Template>(`/api/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTemplate: (id: number) =>
    authFetchJson<{ success: boolean }>(`/api/templates/${id}`, {
      method: "DELETE",
    }),

  // ─── FASE 9: Scheduled Messages ──────────────────
  getScheduledMessages: (instanceId?: string) => {
    const params = instanceId ? `?instance_id=${encodeURIComponent(instanceId)}` : "";
    return authFetchJson<ScheduledMessage[]>(`/api/scheduled${params}`);
  },

  createScheduledMessage: (data: { recipient: string; message: string; scheduled_at: string; platform?: string; instance_id?: string }) =>
    authFetchJson<ScheduledMessage>("/api/scheduled", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancelScheduledMessage: (id: number) =>
    authFetchJson<ScheduledMessage>(`/api/scheduled/${id}/cancel`, {
      method: "PUT",
    }),

  deleteScheduledMessage: (id: number) =>
    authFetchJson<{ success: boolean }>(`/api/scheduled/${id}`, {
      method: "DELETE",
    }),

  bulkDeleteScheduledMessages: (ids: number[]) =>
    authFetchJson<{ success: boolean; deleted: number }>("/api/scheduled/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  // ─── FASE 9: Broadcast ───────────────────────────
  sendBroadcast: (data: { message: string; platform?: string; instance_id?: string }) =>
    authFetchJson<{ success: boolean; sent: number; failed: number; total: number; errors: string[] }>("/api/broadcast", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ─── FASE 9: Admin Users ─────────────────────────
  getAdminUsers: () =>
    authFetchJson<AdminUser[]>("/api/admin/users"),

  getAdminStats: () =>
    authFetchJson<{ totalUsers: number; totalInstances: number; connectedInstances: number; totalChats: number }>("/api/admin/stats"),

  deleteAdminUser: (id: string) =>
    authFetchJson<{ success: boolean }>(`/api/admin/users/${id}`, {
      method: "DELETE",
    }),

  resetUserPassword: (id: string, password: string) =>
    authFetchJson<{ success: boolean }>(`/api/admin/users/${id}/reset-password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    }),

  // ─── Admin Global Endpoints ────────────────────────
  getAdminInstances: (userId?: string) => {
    const params = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    return authFetchJson<BotInstance[]>(`/api/admin/instances${params}`);
  },

  getAdminChats: (limit = 100, offset = 0, sender?: string, userId?: string) => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (sender) params.set("sender", sender);
    if (userId) params.set("user_id", userId);
    return authFetchJson<{ data: ChatMessage[]; total: number; limit: number; offset: number }>(
      `/api/admin/chats?${params}`
    );
  },

  getAdminScheduled: (status?: string) => {
    const params = status ? `?status=${encodeURIComponent(status)}` : "";
    return authFetchJson<ScheduledMessage[]>(`/api/admin/scheduled${params}`);
  },

  // ─── Profile ──────────────────────────────────────
  getProfile: () =>
    authFetchJson<AdminUser>("/api/admin/profile"),

  getUserProfile: (userId: string) =>
    authFetchJson<AdminUser>(`/api/admin/profile/${userId}`),

  updateProfile: (data: {
    business_name?: string | null;
    phone?: string | null;
    additional_email?: string | null;
    address?: string | null;
    logo_url?: string | null;
  }) =>
    authFetchJson<AdminUser>("/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export type AnalyticsData = {
  instances: { total: number; connected: number; disconnected: number };
  conversations: { total: number; active: number };
  messages: { total: number; incoming: number; outgoing: number; aiReplies: number };
  platformBreakdown: Record<string, { incoming: number; outgoing: number }>;
  dailyActivity: { date: string; incoming: number; outgoing: number }[];
  topSenders: { sender: string; name: string; count: number }[];
  responseRate: number;
  instancePhones: { instance_id: string; phone: string | null; status: string }[];
};
