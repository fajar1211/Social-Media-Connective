const GEMINI_MODEL = "gemma-4-26b-a4b-it";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface TrendData {
  date_events: string[];
  trending_topics: string[];
  viral_patterns: string[];
  emotional_triggers: string[];
  trending_hashtags: string[];
  content_angle_suggestion: string;
}

export interface StrategyData {
  brand_name: string;
  key_points: string[];
  target_audience: string;
  brand_voice: string;
  emotional_hook: string;
  content_angle: string;
  trend_integration: string;
  viral_elements: string[];
}

function getApiKey(): string {
  return (import.meta.env as Record<string, string>)["VITE_GEMINI_API_KEY"] || "";
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
  const parts = data?.candidates?.[0]?.content?.parts || [];
  // Skip thinking parts (thought: true), return the actual response
  const realPart = parts.find((p: { thought?: boolean }) => !p.thought);
  return realPart?.text?.trim() || "";
}

function extractJson(text: string): Record<string, unknown> | null {
  // Remove thinking blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");

  // Strategy 1: Find JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch { /* continue */ }
  }

  // Strategy 2: Try to find balanced braces
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { /* continue */ }
  }

  // Strategy 3: Line-by-line scan for key fields
  const lines = cleaned.split("\n");
  const brandLine = lines.find((l) => l.includes("brand_name"));
  if (brandLine) {
    const brandMatch = brandLine.match(/["']brand_name["']\s*:\s*["']([^"']+)["']/);
    if (brandMatch) {
      return { brand_name: brandMatch[1] };
    }
  }

  return null;
}

// ── AGENT 0: Trend Researcher (simplified) ──

export async function runTrendsAgent(params: {
  date: string;
  country: string;
  platform: string;
  brand_niche: string;
}): Promise<TrendData> {
  const apiKey = getApiKey();
  const prompt = `Date: ${params.date}. Location: ${params.country}. Platform: ${params.platform}. Brand: ${params.brand_niche}.

List 3-5 trending topics, 2-3 viral patterns, 2-3 emotional triggers, 2-3 hashtags relevant to this brand and date.

Output JSON only: {"trending_topics":["..."],"viral_patterns":["..."],"emotional_triggers":["..."],"trending_hashtags":["..."],"content_angle_suggestion":"..."}`;

  try {
    const content = await callGemini(apiKey, prompt, 2048);
    const parsed = extractJson(content);

    if (parsed) {
      const p = parsed as Record<string, unknown>;
      return {
        date_events: [],
        trending_topics: (p["trending_topics"] as string[]) || [],
        viral_patterns: (p["viral_patterns"] as string[]) || [],
        emotional_triggers: (p["emotional_triggers"] as string[]) || [],
        trending_hashtags: (p["trending_hashtags"] as string[]) || [],
        content_angle_suggestion: (p["content_angle_suggestion"] as string) || "",
      };
    }
  } catch { /* fallback */ }

  return { date_events: [], trending_topics: [], viral_patterns: [], emotional_triggers: [], trending_hashtags: [], content_angle_suggestion: "" };
}

// ── AGENT 1: Content Strategist (simplified) ──

export async function runStrategyAgent(params: {
  knowledge: string[];
  trends: TrendData;
  topic: string;
  goal: string;
  reference: string;
}): Promise<StrategyData | null> {
  const apiKey = getApiKey();

  const knowledgeText = params.knowledge.length > 0
    ? params.knowledge.slice(0, 3).join("\n").slice(0, 800)
    : "No knowledge provided.";

  const topic = params.topic || "general content";

  const prompt = `Create a content strategy for a social media post.

TOPIC: ${topic}
GOAL: ${params.goal}
BRAND INFO: ${knowledgeText}

Output JSON only:
{"brand_name":"brand name","key_points":["point1","point2","point3"],"target_audience":"audience","brand_voice":"voice","emotional_hook":"hook","content_angle":"angle","trend_integration":"trend","viral_elements":["el1","el2"]}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
    const content = await callGemini(apiKey, prompt, 2048);
      const parsed = extractJson(content);

      if (parsed && (parsed as Record<string, unknown>)["brand_name"]) {
        const p = parsed as Record<string, unknown>;
        return {
          brand_name: p["brand_name"] as string,
          key_points: (p["key_points"] as string[]) || [],
          target_audience: (p["target_audience"] as string) || "",
          brand_voice: (p["brand_voice"] as string) || "",
          emotional_hook: (p["emotional_hook"] as string) || "",
          content_angle: (p["content_angle"] as string) || "",
          trend_integration: (p["trend_integration"] as string) || "",
          viral_elements: (p["viral_elements"] as string[]) || [],
        };
      }
    } catch { /* retry */ }
  }

  // Final fallback: extract brand name from knowledge
  if (params.knowledge.length > 0) {
    const firstLine = params.knowledge[0] || "";
    const brandMatch = firstLine.match(/\[([^\]]+)\]/);
    if (brandMatch && brandMatch[1]) {
      return {
        brand_name: brandMatch[1],
        key_points: [],
        target_audience: "",
        brand_voice: "",
        emotional_hook: "",
        content_angle: params.topic,
        trend_integration: "",
        viral_elements: [],
      };
    }
  }

  return null;
}

// ── AGENT 2: Caption Writer (simplified) ──

export async function runCaptionAgent(params: {
  strategy: StrategyData;
  knowledge: string[];
  platform: string;
  tone: string;
  variety: string;
}): Promise<string | null> {
  const apiKey = getApiKey();
  const s = params.strategy;

  const knowledgeText = params.knowledge.length > 0
    ? params.knowledge.slice(0, 3).join("\n").slice(0, 600)
    : "";

  const prompt = `Write a ${params.platform} social media post.

BRAND: ${s.brand_name}
VOICE: ${s.brand_voice || params.tone}
AUDIENCE: ${s.target_audience}
HOOK: ${s.emotional_hook}
ANGLE: ${s.content_angle}
KEY POINTS: ${s.key_points.join(", ")}

${knowledgeText ? `DETAILS: ${knowledgeText}` : ""}
${params.variety ? `STYLE: ${params.variety}` : ""}

Output JSON only: {"caption":"your caption here"}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = await callGemini(apiKey, prompt, 2048);
      const parsed = extractJson(content);

      if (parsed && typeof (parsed as Record<string, unknown>)["caption"] === "string") {
        const caption = (parsed as Record<string, unknown>)["caption"] as string;
        if (caption.length >= 20) {
          return caption;
        }
      }
    } catch { /* retry */ }
  }

  return null;
}

// ── AGENT 3: Hashtag + CTA (simplified) ──

export async function runHashtagAgent(params: {
  caption: string;
  brand_name: string;
  platform: string;
  trending_tags: string[];
  emotional_hook: string;
}): Promise<{ hashtags: string[]; cta: string }> {
  const apiKey = getApiKey();

  const prompt = `Generate hashtags and CTA for this ${params.platform} post about ${params.brand_name}.

CAPTION: ${params.caption.slice(0, 200)}
${params.trending_tags.length > 0 ? `TRENDING: ${params.trending_tags.join(", ")}` : ""}

Output JSON only: {"hashtags":["tag1","tag2","tag3"],"cta":"call to action"}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = await callGemini(apiKey, prompt, 512);
      const parsed = extractJson(content);

      if (parsed && Array.isArray((parsed as Record<string, unknown>)["hashtags"])) {
        const tags = (parsed as Record<string, unknown>)["hashtags"] as string[];
        return {
          hashtags: tags.map((t: string) => t.replace(/^#/, "")),
          cta: ((parsed as Record<string, unknown>)["cta"] as string) || "",
        };
      }
    } catch { /* retry */ }
  }

  return { hashtags: [], cta: "" };
}

// ── AGENT 4: Image Prompt (simplified) ──

export async function runImagePromptAgent(params: {
  caption: string;
  brand_name: string;
  key_points: string[];
  viral_patterns: string[];
}): Promise<string> {
  const apiKey = getApiKey();

  const prompt = `Create an image prompt for AI image generation.

BRAND: ${params.brand_name}
CAPTION: ${params.caption.slice(0, 200)}
STYLE: ${params.viral_patterns.join(", ")}

Output JSON only: {"image_prompt":"detailed visual description"}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = await callGemini(apiKey, prompt, 512);
      const parsed = extractJson(content);

      if (parsed && typeof (parsed as Record<string, unknown>)["image_prompt"] === "string") {
        return (parsed as Record<string, unknown>)["image_prompt"] as string;
      }
    } catch { /* retry */ }
  }

  return "";
}
