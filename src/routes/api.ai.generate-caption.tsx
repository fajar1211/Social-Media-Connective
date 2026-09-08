import { createFileRoute } from "@tanstack/react-router";

const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GOALS = ["Education", "Promotion", "Engagement", "Awareness", "Announcement"];

const SYSTEM_PROMPT = `You are a social media content expert. Create ONE post.

The "Knowledge Context" below is your PRIMARY source of truth.
Write content that references SPECIFIC details from it:
- Exact brand name, products, location, chef, values
- Target audience preferences and behaviors
- Brand voice, personality, and style
- Specific menu items, services, or offerings mentioned

Do NOT write generic content. Every post must feel specific to this brand.

Output ONLY a JSON object:
{"topic":"...","caption":"...","hashtags":[...],"cta":"...","image_prompt":"...","content_type":"Image"}`;

interface ApiResponse {
  topic?: string;
  caption?: string;
  hashtags?: string[];
  cta?: string;
  image_prompt?: string;
  content_type?: string;
}

interface TrendData {
  date_events: string[];
  trending_topics: string[];
  viral_patterns: string[];
  emotional_triggers: string[];
  trending_hashtags: string[];
  content_angle_suggestion: string;
}

interface StrategyData {
  brand_name: string;
  key_points: string[];
  target_audience: string;
  brand_voice: string;
  emotional_hook: string;
  content_angle: string;
  trend_integration: string;
  viral_elements: string[];
}

async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: maxTokens,
      },
    }),
  });
  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return null;
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentBot/1.0)" },
    });
    clearTimeout(timeout);
    if (!resp.ok) return "";
    const html = await resp.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1500);
  } catch {
    return "";
  }
}

async function callAgent(url: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!resp.ok) return {};
    return await resp.json();
  } catch {
    return {};
  }
}

async function runFallbackGeneration(
  apiKey: string,
  topic: string,
  clientName: string,
  platform: string,
  tone: string,
  selectedGoal: string,
  knowledgeBlocks: string[]
): Promise<ApiResponse | null> {
  const knowledgeText = knowledgeBlocks.length > 0
    ? `\nBrand info: ${knowledgeBlocks.join(" | ").slice(0, 500)}`
    : "";

  const prompt = [
    SYSTEM_PROMPT,
    "",
    "Knowledge Context:",
    ...knowledgeBlocks,
    "",
    `Topic: ${topic}. Goal: ${selectedGoal}. Platform: ${platform}. Tone: ${tone}.`,
    "",
    `Write a ${platform} post using the knowledge above.`,
  ].filter(Boolean).join("\n");

  const content = await callGemini(apiKey, prompt, 4000);
  const parsed = extractJson(content);

  if (parsed && typeof (parsed as Record<string, unknown>)["caption"] === "string" && ((parsed as Record<string, unknown>)["caption"] as string).length >= 20) {
    const p = parsed as Record<string, unknown>;
    return {
      topic: (p["topic"] as string) || topic,
      caption: p["caption"] as string,
      hashtags: (p["hashtags"] as string[]) || [],
      cta: (p["cta"] as string) || "",
      image_prompt: (p["image_prompt"] as string) || "",
      content_type: (p["content_type"] as string) || "Image",
    };
  }

  if (knowledgeText) {
    const retryPrompt = [
      `Generate ONE ${platform} post as JSON.`,
      `Topic: ${topic}. Goal: ${selectedGoal}. Tone: ${tone}.`,
      knowledgeText,
      `Example: {"topic":"Topic","caption":"Post body text here","hashtags":["tag1","tag2"],"cta":"Call to action","image_prompt":"Image description","content_type":"Image"}`,
    ].filter(Boolean).join("\n");

    const retryContent = await callGemini(apiKey, retryPrompt, 2048);
    const retryParsed = extractJson(retryContent);

    if (retryParsed && typeof (retryParsed as Record<string, unknown>)["caption"] === "string" && ((retryParsed as Record<string, unknown>)["caption"] as string).length >= 20) {
      const rp = retryParsed as Record<string, unknown>;
      return {
        topic: (rp["topic"] as string) || topic,
        caption: rp["caption"] as string,
        hashtags: (rp["hashtags"] as string[]) || [],
        cta: (rp["cta"] as string) || "",
        image_prompt: (rp["image_prompt"] as string) || "",
        content_type: (rp["content_type"] as string) || "Image",
      };
    }
  }

  return null;
}

export const Route = createFileRoute("/api/ai/generate-caption")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            topic = "",
            body: contentBody = "",
            platform = "Facebook",
            tone = "professional",
            client_name = "",
            knowledge_files = [],
            variety = "",
            reference_url = "",
            goal = "",
          } = body;

          if (!topic || !topic.trim()) {
            return new Response(
              JSON.stringify({ error: "Missing required field: topic" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const apiKey = (import.meta.env as Record<string, string>)["VITE_GEMINI_API_KEY"] || "";
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "Gemini API key not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const selectedGoal = goal || GOALS[Math.floor(Math.random() * GOALS.length)];

          let referenceContent = "";
          if (reference_url) {
            referenceContent = await fetchUrlContent(reference_url);
          }

          const knowledgeBlocks: string[] = [];
          for (const kf of knowledge_files) {
            if (kf.content?.trim()) {
              knowledgeBlocks.push(`[${kf.name}]:\n${kf.content.trim()}`);
            }
          }

          const brandNiche = knowledgeBlocks.length > 0
            ? knowledgeBlocks.join(" ").slice(0, 500)
            : client_name || "general business";

          const trends = await callAgent("/api/ai/research-trends", {
            date: new Date().toISOString().slice(0, 10),
            country: "Indonesia",
            platform,
            brand_niche: brandNiche,
          }) as unknown as TrendData;

          const strategy = await callAgent("/api/ai/strategize", {
            knowledge: knowledgeBlocks,
            trends,
            topic: topic.trim(),
            goal: selectedGoal,
            reference: referenceContent,
          }) as unknown as StrategyData;

          if (!strategy.brand_name) {
            const fallback = await runFallbackGeneration(
              apiKey, topic.trim(), client_name, platform, tone, selectedGoal, knowledgeBlocks
            );
            if (fallback) {
              return new Response(
                JSON.stringify({ success: true, ...fallback, goal: selectedGoal }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              );
            }
            return new Response(
              JSON.stringify({ error: "Failed to generate content strategy" }),
              { status: 422, headers: { "Content-Type": "application/json" } }
            );
          }

          const captionResult = await callAgent("/api/ai/write-caption", {
            strategy,
            knowledge: knowledgeBlocks,
            platform,
            tone,
            variety,
          });

          const captionText = (captionResult as Record<string, unknown>)["caption"];
          if (!captionText || typeof captionText !== "string" || captionText.length < 20) {
            const fallback = await runFallbackGeneration(
              apiKey, topic.trim(), client_name, platform, tone, selectedGoal, knowledgeBlocks
            );
            if (fallback) {
              return new Response(
                JSON.stringify({ success: true, ...fallback, goal: selectedGoal }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              );
            }
            return new Response(
              JSON.stringify({ error: "Failed to generate caption" }),
              { status: 422, headers: { "Content-Type": "application/json" } }
            );
          }

          const caption = captionText as string;

          const [hashtagResult, imageResult] = await Promise.all([
            callAgent("/api/ai/generate-hashtags", {
              caption,
              brand_name: strategy.brand_name,
              platform,
              trending_tags: trends.trending_hashtags || [],
              emotional_hook: strategy.emotional_hook,
            }),
            callAgent("/api/ai/generate-image-prompt", {
              caption,
              brand_name: strategy.brand_name,
              key_points: strategy.key_points || [],
              viral_patterns: trends.viral_patterns || [],
            }),
          ]);

          const hashtagsRaw = (hashtagResult as Record<string, unknown>)["hashtags"];
          const hashtags = Array.isArray(hashtagsRaw)
            ? (hashtagsRaw as string[]).map((t: string) => t.replace(/^#/, ""))
            : [];
          const cta = typeof (hashtagResult as Record<string, unknown>)["cta"] === "string"
            ? (hashtagResult as Record<string, unknown>)["cta"] as string
            : "";
          const image_prompt = typeof (imageResult as Record<string, unknown>)["image_prompt"] === "string"
            ? (imageResult as Record<string, unknown>)["image_prompt"] as string
            : "";

          const topicTitle = strategy.brand_name
            ? `${strategy.brand_name}: ${strategy.content_angle || topic.trim()}`
            : topic.trim();

          return new Response(
            JSON.stringify({
              success: true,
              topic: topicTitle.slice(0, 80),
              caption,
              hashtags,
              cta,
              image_prompt,
              content_type: "Image",
              goal: selectedGoal,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
