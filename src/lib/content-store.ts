import { useSyncExternalStore } from "react";

export type Platform = "Facebook" | "Instagram" | "X / Twitter" | "LinkedIn" | "Blog";
export type ContentType = "Text Post" | "Image" | "Carousel" | "Short Video" | "Blog Article";
export type Status = "Suggested" | "Additional" | "Submitted" | "Approved" | "Deleted";
export type SocialPlatform = "Facebook" | "Instagram" | "YouTube" | "GBP" | "LinkedIn" | "Blog";

export const PLATFORMS: Platform[] = ["Facebook", "Instagram", "X / Twitter", "LinkedIn", "Blog"];
export const SOCIAL_PLATFORMS: SocialPlatform[] = ["Facebook", "Instagram", "YouTube", "GBP", "LinkedIn", "Blog"];
export const CONTENT_TYPES: ContentType[] = [
  "Text Post",
  "Image",
  "Carousel",
  "Short Video",
  "Blog Article",
];
export const STATUSES: Status[] = ["Suggested", "Additional", "Submitted", "Approved", "Deleted"];

export type ContentItem = {
  id: string;
  title: string;
  client: string;
  platform: Platform;
  type: ContentType;
  status: Status;
  date: string; // ISO
  caption: string;
  body?: string;
  hashtags: string[];
  cta: string;
  notes?: string;
  media?: string[];
  previousStatus?: Status;
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
};

const slides = [
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=70",
];

let state: State = {
  content: [
    {
      id: "c-1001",
      title: "Men's Health: 5 Things You Should Know",
      client: "Divine Medical Spa",
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
    { id: "1001", name: "Divine Medical Spa", active: true, platforms: ["Instagram", "Facebook"], socialIntegrations: {} },
    { id: "1002", name: "Northline Dental", active: true, platforms: ["Facebook", "Blog"], socialIntegrations: {} },
    { id: "1003", name: "Harbor Fitness Co.", active: false, platforms: ["Instagram", "LinkedIn"], socialIntegrations: {} },
  ],
  platforms: [
    { name: "Facebook", enabled: true, types: ["Text Post", "Image", "Carousel", "Short Video"] },
    { name: "Instagram", enabled: true, types: ["Image", "Carousel", "Short Video"] },
    { name: "X / Twitter", enabled: true, types: ["Text Post", "Image"] },
    { name: "LinkedIn", enabled: true, types: ["Text Post", "Image", "Blog Article"] },
    { name: "Blog", enabled: false, types: ["Blog Article"] },
  ],
};

const listeners = new Set<() => void>();
function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getSnapshot = () => state;

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const actions = {
  addContent(item: Omit<ContentItem, "id">) {
    state.content = [{ ...item, id: `c-${Date.now()}${Math.floor(Math.random() * 100)}` }, ...state.content];
    emit();
  },
  addMany(items: Omit<ContentItem, "id">[]) {
    state.content = [
      ...items.map((i, idx) => ({ ...i, id: `c-${Date.now()}${idx}` })),
      ...state.content,
    ];
    emit();
  },
  update(id: string, patch: Partial<ContentItem>) {
    state.content = state.content.map((c) => (c.id === id ? { ...c, ...patch } : c));
    emit();
  },
  setStatus(id: string, status: Status) {
    state.content = state.content.map((c) =>
      c.id === id ? { ...c, previousStatus: c.status, status } : c,
    );
    emit();
  },
  restore(id: string) {
    state.content = state.content.map((c) =>
      c.id === id ? { ...c, status: c.previousStatus && c.previousStatus !== "Deleted" ? c.previousStatus : "Suggested" } : c,
    );
    emit();
  },
  purge(id: string) {
    state.content = state.content.filter((c) => c.id !== id);
    emit();
  },
  addClient(clientId: string, name: string, platforms: Platform[]) {
    state.clients = [...state.clients, { id: clientId, name, active: true, platforms, socialIntegrations: {} }];
    emit();
  },
  updateClient(id: string, patch: Partial<Client>) {
    state.clients = state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c));
    emit();
  },
  deleteClient(id: string) {
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
