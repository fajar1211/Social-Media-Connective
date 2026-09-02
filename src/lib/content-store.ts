import { useSyncExternalStore, useCallback } from "react";
import { supabaseConfigured } from "@/lib/supabase";
import {
  getContent as dbGetContent,
  getContentByClient as dbGetContentByClient,
  createContent as dbCreateContent,
  updateContent as dbUpdateContent,
  deleteContent as dbDeleteContent,
  getClients as dbGetClients,
  createClient as dbCreateClient,
  updateClient as dbUpdateClient,
  deleteClient as dbDeleteClient,
  getPlatforms as dbGetPlatforms,
  getNextClientId as dbGetNextClientId,
} from "@/lib/db";
import type { ContentStatus } from "@/lib/database.types";

export type Platform = "Facebook" | "Instagram" | "X / Twitter" | "LinkedIn" | "Blog";
export type ContentType = "Text Post" | "Image" | "Carousel" | "Short Video" | "Long-form" | "Blog Article";
export type Status = ContentStatus;
export type SocialPlatform = "Facebook" | "Instagram" | "YouTube" | "GBP" | "LinkedIn" | "Blog" | "TikTok" | "Xiaohongshu" | "Reddit" | "Threads" | "X (Twitter)";

export const PLATFORMS: Platform[] = ["Facebook", "Instagram", "X / Twitter", "LinkedIn", "Blog"];
export const SOCIAL_PLATFORMS: SocialPlatform[] = ["Facebook", "Instagram", "YouTube", "GBP", "LinkedIn", "Blog", "TikTok", "Xiaohongshu", "Reddit", "Threads", "X (Twitter)"];
export const CONTENT_TYPES: ContentType[] = [
  "Text Post",
  "Image",
  "Carousel",
  "Short Video",
  "Long-form",
  "Blog Article",
];
export const STATUSES: Status[] = ["Suggested", "Additional", "Submitted", "Approved", "Deleted"];

export type ContentItem = {
  id: string;
  title: string;
  client: string;
  clientId?: string;
  platform: Platform;
  type: ContentType;
  status: Status;
  date: string;
  caption: string;
  body?: string;
  hashtags: string[];
  cta: string;
  notes?: string;
  media?: string[];
  previousStatus?: Status;
  timezone?: string;
  scheduledDate?: string;
  scheduledTime?: string;
};

export type FacebookPage = {
  id: string;
  name: string;
  access_token: string;
  category?: string;
};

export type SocialConnection = {
  connected: boolean;
  accountName?: string;
  accountId?: string;
  connectedAt?: string;
  accessToken?: string;
  tokenExpiresIn?: number;
  pages?: FacebookPage[];
};

export type Client = {
  id: string;
  name: string;
  active: boolean;
  platforms: Platform[];
  socialIntegrations: Partial<Record<SocialPlatform, SocialConnection>>;
};

type State = {
  content: ContentItem[];
  clients: Client[];
  platforms: { name: Platform; enabled: boolean; types: ContentType[] }[];
  loaded: boolean;
};

const slides = [
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=70",
];

const defaultState: State = {
  content: [
    {
      id: "c-1001",
      title: "Men's Health: 5 Things You Should Know",
      client: "Divine Medical Spa",
      clientId: "S0100",
      platform: "Instagram",
      type: "Carousel",
      status: "Submitted",
      date: "2026-08-29",
      caption:
        "Men's health is more than the gym. Swipe through 5 essentials every man should know — from hormone balance to recovery and skin health.",
      body: "Slide 1 — Know your baseline\nSlide 2 — Hormones matter\nSlide 3 — Sleep is treatment\nSlide 4 — Skin health is health\nSlide 5 — Book your consult",
      hashtags: ["#MensHealth", "#Wellness", "#DivineMedicalSpa", "#Testosterone"],
      cta: "Book a consultation today.",
      notes: "Client requested a calm, clinical tone. Avoid before/after imagery.",
      media: slides,
    },
  ],
  clients: [
    { id: "S0100", name: "Divine Medical Spa", active: true, platforms: ["Instagram", "Facebook"], socialIntegrations: {} },
    { id: "S0101", name: "Northline Dental", active: true, platforms: ["Facebook", "Blog"], socialIntegrations: {} },
    { id: "S0102", name: "Harbor Fitness Co.", active: false, platforms: ["Instagram", "LinkedIn"], socialIntegrations: {} },
  ],
  platforms: [
    { name: "Facebook", enabled: true, types: ["Text Post", "Image", "Carousel", "Short Video"] },
    { name: "Instagram", enabled: true, types: ["Image", "Carousel", "Short Video"] },
    { name: "X / Twitter", enabled: true, types: ["Text Post", "Image"] },
    { name: "LinkedIn", enabled: true, types: ["Text Post", "Image", "Blog Article"] },
    { name: "Blog", enabled: false, types: ["Blog Article"] },
  ],
  loaded: false,
};

const STORAGE_KEY = "socmedconnective-store";

// ============================================
// LOCAL STORAGE FALLBACK (when Supabase not configured)
// ============================================

function loadLocalState(): State {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        ...defaultState,
        clients: saved.clients || defaultState.clients,
        content: saved.content || defaultState.content,
        platforms: saved.platforms || defaultState.platforms,
        loaded: true,
      };
    }
  } catch {}
  return { ...defaultState, loaded: true };
}

function saveLocalState(s: State) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        clients: s.clients,
        content: s.content,
        platforms: s.platforms,
      })
    );
  } catch {}
}

// ============================================
// STORE
// ============================================

let state: State = { ...defaultState };

const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  if (!supabaseConfigured) saveLocalState(state);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = () => state;
export const getStoreState = () => state;

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ============================================
// DATA LOADING (Supabase or localStorage)
// ============================================

export async function loadStoreData(clientId?: string): Promise<void> {
  if (!supabaseConfigured) {
    state = loadLocalState();
    emit();
    return;
  }

  try {
    const [contentData, clientsData, platformsData] = await Promise.all([
      clientId ? dbGetContentByClient(clientId) : dbGetContent(),
      dbGetClients(),
      dbGetPlatforms(),
    ]);

    const mappedContent: ContentItem[] = contentData.map((c) => ({
      id: c.id,
      title: c.title,
      client: clientsData.find((cl) => cl.id === c.client_id)?.name || "",
      clientId: c.client_id,
      platform: c.platform as Platform,
      type: c.type as ContentType,
      status: c.status as Status,
      date: c.date,
      caption: c.caption,
      body: c.body || undefined,
      hashtags: c.hashtags || [],
      cta: c.cta,
      notes: c.notes || undefined,
      media: c.media || [],
      previousStatus: (c.previous_status as Status) || undefined,
      timezone: c.timezone || undefined,
      scheduledDate: c.scheduled_date || undefined,
      scheduledTime: c.scheduled_time || undefined,
    }));

    const mappedClients: Client[] = clientsData.map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      platforms: [],
      socialIntegrations: {},
    }));

    const mappedPlatforms = platformsData.map((p) => ({
      name: p.name as Platform,
      enabled: p.enabled,
      types: (p.types || []) as ContentType[],
    }));

    state = {
      content: mappedContent,
      clients: mappedClients,
      platforms: mappedPlatforms.length > 0 ? mappedPlatforms : defaultState.platforms,
      loaded: true,
    };
  } catch (error) {
    console.error("Error loading store data:", error);
    state = { ...defaultState, loaded: true };
  }
  emit();
}

// ============================================
// ACTIONS
// ============================================

export const actions = {
  async addContent(item: Omit<ContentItem, "id">) {
    if (supabaseConfigured && item.clientId) {
      const created = await dbCreateContent({
        client_id: item.clientId,
        title: item.title,
        caption: item.caption,
        body: item.body || "",
        platform: item.platform,
        type: item.type,
        status: item.status || "Suggested",
        hashtags: item.hashtags || [],
        cta: item.cta,
        notes: item.notes || "",
        media: item.media || [],
        date: item.date,
        previous_status: item.previousStatus || null,
        timezone: item.timezone || "",
        scheduled_date: item.scheduledDate || null,
        scheduled_time: item.scheduledTime || "",
      });
      if (created) {
        state.content = [
          {
            ...item,
            id: created.id,
          },
          ...state.content,
        ];
      }
    } else {
      state.content = [
        { ...item, id: `c-${Date.now()}${Math.floor(Math.random() * 100)}` },
        ...state.content,
      ];
    }
    emit();
  },

  async addMany(items: Omit<ContentItem, "id">[]) {
    if (supabaseConfigured) {
      for (const item of items) {
        await actions.addContent(item);
      }
    } else {
      state.content = [
        ...items.map((i, idx) => ({ ...i, id: `c-${Date.now()}${idx}` })),
        ...state.content,
      ];
      emit();
    }
  },

  async update(id: string, patch: Partial<ContentItem>) {
    if (supabaseConfigured) {
      const dbPatch: Record<string, unknown> = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.caption !== undefined) dbPatch.caption = patch.caption;
      if (patch.body !== undefined) dbPatch.body = patch.body;
      if (patch.platform !== undefined) dbPatch.platform = patch.platform;
      if (patch.type !== undefined) dbPatch.type = patch.type;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.hashtags !== undefined) dbPatch.hashtags = patch.hashtags;
      if (patch.cta !== undefined) dbPatch.cta = patch.cta;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      if (patch.media !== undefined) dbPatch.media = patch.media;
      if (patch.date !== undefined) dbPatch.date = patch.date;
      if (patch.previousStatus !== undefined) dbPatch.previous_status = patch.previousStatus;
      if (patch.timezone !== undefined) dbPatch.timezone = patch.timezone;
      if (patch.scheduledDate !== undefined) dbPatch.scheduled_date = patch.scheduledDate;
      if (patch.scheduledTime !== undefined) dbPatch.scheduled_time = patch.scheduledTime;

      await dbUpdateContent(id, dbPatch);
    }

    state.content = state.content.map((c) => (c.id === id ? { ...c, ...patch } : c));
    emit();
  },

  async setStatus(id: string, status: Status) {
    if (supabaseConfigured) {
      const item = state.content.find((c) => c.id === id);
      await dbUpdateContent(id, {
        status,
        previous_status: item?.status || null,
      });
    }

    state.content = state.content.map((c) =>
      c.id === id ? { ...c, previousStatus: c.status, status } : c,
    );
    emit();
  },

  async restore(id: string) {
    const item = state.content.find((c) => c.id === id);
    const newStatus = item?.previousStatus && item.previousStatus !== "Deleted" ? item.previousStatus : "Suggested";

    if (supabaseConfigured) {
      await dbUpdateContent(id, { status: newStatus, previous_status: null });
    }

    state.content = state.content.map((c) =>
      c.id === id ? { ...c, previousStatus: undefined, status: newStatus } : c,
    );
    emit();
  },

  async purge(id: string) {
    if (supabaseConfigured) {
      await dbDeleteContent(id);
    }

    state.content = state.content.filter((c) => c.id !== id);
    emit();
  },

  async addClient(clientId: string, name: string, platforms: Platform[]) {
    if (supabaseConfigured) {
      const created = await dbCreateClient({ id: clientId, name, active: true });
      if (created) {
        state.clients = [...state.clients, { id: created.id, name, active: true, platforms, socialIntegrations: {} }];
      }
    } else {
      state.clients = [...state.clients, { id: clientId, name, active: true, platforms, socialIntegrations: {} }];
    }
    emit();
  },

  async getNextClientId(): Promise<string> {
    if (supabaseConfigured) {
      return await dbGetNextClientId();
    }
    // Local fallback: find max S-prefixed ID
    const sIds = state.clients
      .map((c) => c.id)
      .filter((id) => /^S\d+$/.test(id))
      .map((id) => parseInt(id.replace("S", ""), 10));
    const maxNum = sIds.length > 0 ? Math.max(...sIds) : 99;
    return `S${String(maxNum + 1).padStart(4, "0")}`;
  },

  async updateClient(id: string, patch: Partial<Client>) {
    if (supabaseConfigured) {
      await dbUpdateClient(id, { name: patch.name, active: patch.active });
    }

    state.clients = state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c));
    emit();
  },

  async deleteClient(id: string) {
    if (supabaseConfigured) {
      await dbDeleteClient(id);
    }

    state.clients = state.clients.filter((c) => c.id !== id);
    emit();
  },

  togglePlatform(name: Platform) {
    state.platforms = state.platforms.map((p) =>
      p.name === name ? { ...p, enabled: !p.enabled } : p,
    );
    emit();
  },
};

export function counts(items: ContentItem[]) {
  return {
    Suggested: items.filter((i) => i.status === "Suggested").length,
    Additional: items.filter((i) => i.status === "Additional").length,
    Submitted: items.filter((i) => i.status === "Submitted").length,
    Approved: items.filter((i) => i.status === "Approved").length,
    Deleted: items.filter((i) => i.status === "Deleted").length,
  };
}

export function formatDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function parseImportFile(content: string, defaultClient: string): Omit<ContentItem, "id">[] {
  const posts: Omit<ContentItem, "id">[] = [];
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/(?=^date:\s)/m).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.split("\n");
    const meta: Record<string, string> = {};
    let bodyStart = 0;
    let foundNonMeta = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] as string;
      const match = line.match(/^(date|platform|title|content_type|goal|image):\s*(.*)/);
      if (match) {
        const key = match[1] as string;
        meta[key] = (match[2] as string).trim();
        bodyStart = i + 1;
      } else if (!foundNonMeta) {
        if (line.trim() !== "") {
          foundNonMeta = true;
          bodyStart = i;
        } else {
          bodyStart = i + 1;
        }
      }
    }

    if (!meta["title"] && !meta["date"]) continue;

    const bodyLines = lines.slice(bodyStart);
    const body = bodyLines.join("\n").trim();
    const allHashtags = body.match(/#[\w\u00C0-\u024F]+/g) || [];
    const hashtags = [...new Set(allHashtags)];
    const captionBody = body;

    const platformMap: Record<string, Platform> = {
      "Google Business Profile": "Facebook",
      "Facebook": "Facebook",
      "Instagram": "Instagram",
      "LinkedIn": "LinkedIn",
      "Blog": "Blog",
      "X / Twitter": "X / Twitter",
      "X (Twitter)": "X / Twitter",
    };

    const typeMap: Record<string, ContentType> = {
      "Image": "Image",
      "Carousel": "Carousel",
      "Short Video": "Short Video",
      "Text Post": "Text Post",
      "Blog Article": "Blog Article",
    };

    const platform = platformMap[meta["platform"] as string] || "Facebook";
    const contentType = typeMap[meta["content_type"] as string] || "Image";
    const imagePrompt = meta["image"] as string | undefined;

    const item: Omit<ContentItem, "id"> = {
      title: (meta["title"] as string) || "Untitled",
      client: defaultClient,
      platform,
      type: contentType,
      status: "Additional",
      date: (meta["date"] as string) || new Date().toISOString().slice(0, 10),
      caption: captionBody,
      body: captionBody,
      hashtags,
      cta: "",
    };
    if (imagePrompt) {
      item.media = [];
      item.notes = `AI Image Prompt: ${imagePrompt}`;
    }

    posts.push(item);
  }

  return posts;
}
