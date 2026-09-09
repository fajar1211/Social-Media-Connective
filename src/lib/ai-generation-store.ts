import { useSyncExternalStore, useCallback } from "react";
import { actions } from "@/lib/content-store";
import type { SocialPlatform, Platform, ContentType } from "@/lib/content-store";

// ── Types ──

export type PostStatus = "pending" | "generating" | "completed" | "failed" | "cancelled";

export type GenerationPost = {
  id: string;
  platform: string;
  variety: string;
  status: PostStatus;
  result?: {
    topic: string;
    caption: string;
    hashtags: string[];
    cta: string;
    image_prompt: string;
    content_type: string;
  };
  error?: string;
};

export type GenerationConfig = {
  topic: string;
  body: string;
  clientName: string;
  clientId: string;
  tone: string;
  goal: string;
  knowledgeFiles: { name: string; content: string }[];
  campaignImage: string;
  referenceUrl: string;
  startDate: string;
  endDate: string;
  postsPerPlatform: Record<string, number>;
  connectedPlatforms: string[];
  varietyAspects: string[];
};

export type GenerationJobStatus = "idle" | "running" | "completed" | "cancelled";

export type GenerationJob = {
  id: string;
  clientId: string;
  clientName: string;
  topic: string;
  status: GenerationJobStatus;
  posts: GenerationPost[];
  currentIndex: number;
  total: number;
  config: GenerationConfig;
  createdAt: string;
  savedCount: number;
  failedCount: number;
};

// ── Storage ──

const STORAGE_KEY = "socmed_ai_generation";

function loadJob(): GenerationJob | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GenerationJob;
  } catch {
    return null;
  }
}

function saveJob(job: GenerationJob) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
  } catch {}
}

function clearJob() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ── Store ──

let state: GenerationJob = createEmptyJob();

const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return state;
}

function createEmptyJob(): GenerationJob {
  return {
    id: "",
    clientId: "",
    clientName: "",
    topic: "",
    status: "idle",
    posts: [],
    currentIndex: 0,
    total: 0,
    config: createEmptyConfig(),
    createdAt: "",
    savedCount: 0,
    failedCount: 0,
  };
}

function createEmptyConfig(): GenerationConfig {
  return {
    topic: "",
    body: "",
    clientName: "",
    clientId: "",
    tone: "professional",
    goal: "",
    knowledgeFiles: [],
    campaignImage: "",
    referenceUrl: "",
    startDate: "",
    endDate: "",
    postsPerPlatform: {},
    connectedPlatforms: [],
    varietyAspects: [],
  };
}

// ── Abort ──

let currentAbortController: AbortController | null = null;

// ── Actions ──

function generateId() {
  return `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function distributeSchedule(
  start: string,
  end: string,
  count: number
): { date: string; time: string }[] {
  const defaultTimes = ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "09:00", "11:00", "13:00", "15:00"];
  if (!start || !end || count <= 0) {
    return Array.from({ length: count }, (_, i) => ({
      date: start || new Date().toISOString().slice(0, 10),
      time: defaultTimes[i % defaultTimes.length] || "10:00",
    }));
  }
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const range = endMs - startMs;
  return Array.from({ length: count }, (_, i) => {
    const ms = count === 1 ? startMs : startMs + (range * i) / (count - 1);
    const d = new Date(ms);
    return {
      date: d.toISOString().slice(0, 10),
      time: defaultTimes[i % defaultTimes.length] || "10:00",
    };
  });
}

function buildPosts(config: GenerationConfig): GenerationPost[] {
  const posts: GenerationPost[] = [];
  for (const platform of config.connectedPlatforms) {
    const count = config.postsPerPlatform[platform] || 5;
    const schedule = distributeSchedule(config.startDate, config.endDate, count);
    for (let i = 0; i < count; i++) {
      posts.push({
        id: generateId(),
        platform,
        variety: config.varietyAspects[i % config.varietyAspects.length] || "",
        status: "pending",
      });
    }
  }
  return posts;
}

export async function startGeneration(config: GenerationConfig) {
  if (state.status === "running") return;

  const posts = buildPosts(config);
  if (posts.length === 0) return;

  const job: GenerationJob = {
    id: generateId(),
    clientId: config.clientId,
    clientName: config.clientName,
    topic: config.topic,
    status: "running",
    posts,
    currentIndex: 0,
    total: posts.length,
    config,
    createdAt: new Date().toISOString(),
    savedCount: 0,
    failedCount: 0,
  };

  state = job;
  saveJob(job);
  emit();

  await processNext();
}

export async function resumeGeneration() {
  const saved = loadJob();
  if (!saved || saved.status !== "running") return;

  state = saved;
  emit();

  await processNext();
}

export function cancelGeneration() {
  if (state.status !== "running") return;

  state.status = "cancelled";
  state.posts = state.posts.map((p) =>
    p.status === "pending" ? { ...p, status: "cancelled" as const } : p
  );
  saveJob(state);
  emit();

  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

function updatePost(postId: string, patch: Partial<GenerationPost>) {
  state.posts = state.posts.map((p) => (p.id === postId ? { ...p, ...patch } : p));
  state.savedCount = state.posts.filter((p) => p.status === "completed").length;
  state.failedCount = state.posts.filter((p) => p.status === "failed").length;
  saveJob(state);
  emit();
}

async function processNext() {
  if (state.status !== "running") return;

  const nextIndex = state.posts.findIndex((p) => p.status === "pending");
  if (nextIndex === -1) {
    state.status = "completed";
    saveJob(state);
    emit();
    clearJob();
    return;
  }

  state.currentIndex = nextIndex;
  const post = state.posts[nextIndex];
  if (!post) {
    state.status = "completed";
    saveJob(state);
    emit();
    clearJob();
    return;
  }

  updatePost(post.id, { status: "generating" });

  currentAbortController = new AbortController();

  try {
    const resp = await fetch("/api/ai/generate-caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: currentAbortController.signal,
      body: JSON.stringify({
        topic: state.config.topic,
        body: state.config.body,
        platform: post.platform,
        tone: state.config.tone,
        client_name: state.config.clientName,
        knowledge_files: state.config.knowledgeFiles,
        variety: post.variety,
        reference_url: state.config.referenceUrl,
        goal: state.config.goal,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `API error ${resp.status}`);
    }

    const data = await resp.json();

    if (!data.caption) {
      throw new Error("No caption in response");
    }

    const topicTitle = data.topic || state.config.topic.slice(0, 80);
    const schedule = distributeSchedule(state.config.startDate, state.config.endDate, state.total);
    const postSchedule = schedule[nextIndex];

    await actions.addContent({
      title: topicTitle,
      client: state.config.clientName,
      clientId: state.config.clientId,
      platform: post.platform as Platform,
      type: (data.content_type || "Image") as ContentType,
      status: "Suggested",
      date: new Date().toISOString().slice(0, 10),
      caption: data.caption,
      body: data.hashtags?.length > 0 ? `${data.caption}\n\n${data.hashtags.map((h: string) => `#${h}`).join(" ")}` : data.caption,
      hashtags: data.hashtags || [],
      cta: data.cta || "",
      notes: [
        state.config.goal ? `Goal: ${state.config.goal}` : "",
        data.image_prompt ? `Image Prompt: ${data.image_prompt}` : "",
      ].filter(Boolean).join("\n"),
      media: state.config.campaignImage ? [state.config.campaignImage] : [],
      timezone: "Asia/Jakarta",
      scheduledDate: postSchedule?.date || "",
      scheduledTime: postSchedule?.time || "",
    });

    updatePost(post.id, {
      status: "completed",
      result: {
        topic: topicTitle,
        caption: data.caption,
        hashtags: data.hashtags || [],
        cta: data.cta || "",
        image_prompt: data.image_prompt || "",
        content_type: data.content_type || "Image",
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      updatePost(post.id, { status: "cancelled", error: "Cancelled" });
    } else {
      updatePost(post.id, {
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  } finally {
    currentAbortController = null;
  }

  await new Promise((r) => setTimeout(r, 300));
  await processNext();
}

// ── React Hook ──

export function useGenerationStore(): GenerationJob {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getGenerationState(): GenerationJob {
  return state;
}
