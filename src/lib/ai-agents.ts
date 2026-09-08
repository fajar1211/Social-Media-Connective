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

export interface CaptionData {
  caption: string;
}

export interface HashtagData {
  hashtags: string[];
  cta: string;
}

export interface ImagePromptData {
  image_prompt: string;
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

function cleanJson(text: string): string {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return text;
  return cleaned.slice(firstBrace, lastBrace + 1);
}

// ── AGENT 0: Trend Researcher ──

const TRENDS_PROMPT = `You are a social media trend researcher. Based on your knowledge, provide relevant trends for content creation.

Current date: {date}
Country/Location: {country}
Platform: {platform}
Brand niche: {niche}

Provide:
1. What holidays, events, or cultural moments are happening around this date in this country?
2. What trending topics relate to this brand's niche?
3. What viral content patterns are popular right now on this platform?
4. What emotional triggers would make this content shareable?
5. What hashtags are currently trending in this niche?

Be specific. Reference actual events, real trending topics, and proven viral patterns.

Output ONLY a valid JSON object:
{"date_events":["event1","event2"],"trending_topics":["topic1","topic2"],"viral_patterns":["pattern1","pattern2"],"emotional_triggers":["trigger1","trigger2"],"trending_hashtags":["tag1","tag2"],"content_angle_suggestion":"specific suggestion combining brand and trends"}`;

export async function runTrendsAgent(params: {
  date: string;
  country: string;
  platform: string;
  brand_niche: string;
}): Promise<TrendData> {
  const apiKey = getApiKey();
  const prompt = TRENDS_PROMPT
    .replace("{date}", params.date)
    .replace("{country}", params.country)
    .replace("{platform}", params.platform)
    .replace("{niche}", params.brand_niche || "general business");

  const content = await callGemini(apiKey, prompt, 2048);
  const parsed = extractJson(content);

  if (parsed) {
    const p = parsed as Record<string, unknown>;
    return {
      date_events: (p["date_events"] as string[]) || [],
      trending_topics: (p["trending_topics"] as string[]) || [],
      viral_patterns: (p["viral_patterns"] as string[]) || [],
      emotional_triggers: (p["emotional_triggers"] as string[]) || [],
      trending_hashtags: (p["trending_hashtags"] as string[]) || [],
      content_angle_suggestion: (p["content_angle_suggestion"] as string) || "",
    };
  }

  return { date_events: [], trending_topics: [], viral_patterns: [], emotional_triggers: [], trending_hashtags: [], content_angle_suggestion: "" };
}

// ── AGENT 1: Content Strategist ──

const STRATEGY_PROMPT = `You are a social media content strategist. Create a detailed content plan.

You have two sources of truth:
1. KNOWLEDGE CONTEXT — Brand-specific details (name, products, location, values, audience)
2. TREND INSIGHTS — Current events, trending topics, viral patterns

Combine these into a content strategy that:
- References SPECIFIC brand details (not generic)
- Incorporates current trends naturally (not forced)
- Uses proven viral patterns
- Targets the right emotional hooks
- Feels timely and relevant

Output ONLY a valid JSON object:
{"brand_name":"exact brand name from knowledge","key_points":["specific point 1","specific point 2","specific point 3"],"target_audience":"who we are talking to","brand_voice":"how the brand speaks","emotional_hook":"the feeling we want to evoke","content_angle":"the unique perspective for this post","trend_integration":"how to naturally incorporate trending topics","viral_elements":["element1","element2"]}`;

export async function runStrategyAgent(params: {
  knowledge: string[];
  trends: TrendData;
  topic: string;
  goal: string;
  reference: string;
}): Promise<StrategyData | null> {
  const apiKey = getApiKey();

  const knowledgeText = params.knowledge.length > 0
    ? params.knowledge.join("\n\n")
    : "No knowledge context provided.";

  const trendsText = params.trends.trending_topics.length > 0
    ? `Trending topics: ${params.trends.trending_topics.join(", ")}. Viral patterns: ${params.trends.viral_patterns.join(", ")}. Emotional triggers: ${params.trends.emotional_triggers.join(", ")}. Suggested angle: ${params.trends.content_angle_suggestion}`
    : "No trend data available.";

  const prompt = [
    STRATEGY_PROMPT,
    "",
    "KNOWLEDGE CONTEXT:",
    knowledgeText,
    "",
    "TREND INSIGHTS:",
    trendsText,
    "",
    `Topic: ${params.topic}`,
    `Goal: ${params.goal}`,
    params.reference ? `Reference: ${params.reference.slice(0, 500)}` : "",
    "",
    "Create a content strategy combining brand knowledge with current trends.",
  ].filter(Boolean).join("\n");

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

  return null;
}

// ── AGENT 2: Caption Writer ──

const CAPTION_PROMPT = `You are a social media caption writer. Write ONE engaging, specific caption.

Your caption MUST:
- Reference the brand_name and specific key_points from the strategy
- Use the emotional_hook to open with impact
- Incorporate viral_elements naturally
- Follow the trend_integration suggestion
- Match the brand_voice
- Feel timely (reference current events if relevant)

Platform rules:
- Instagram: 100-2200 chars. Storytelling. Personal. Engaging. Natural emojis.
- Facebook: 100-500 chars. Conversational. Community-focused. Warm.
- Twitter: Under 280 chars. Punchy. Direct.

DO NOT:
- Write generic content that could be any brand
- Include hashtags in the caption
- Include CTA in the caption
- Use the client ID as the brand name

Output ONLY a valid JSON object:
{"caption":"the caption text here"}`;

export async function runCaptionAgent(params: {
  strategy: StrategyData;
  knowledge: string[];
  platform: string;
  tone: string;
  variety: string;
}): Promise<string | null> {
  const apiKey = getApiKey();

  const knowledgeText = params.knowledge.length > 0
    ? params.knowledge.join("\n\n")
    : "No knowledge context provided.";

  const s = params.strategy;
  const strategyText = `Brand: ${s.brand_name}. Key points: ${s.key_points.join(", ")}. Voice: ${s.brand_voice || params.tone}. Audience: ${s.target_audience}. Hook: ${s.emotional_hook}. Angle: ${s.content_angle}. Trend integration: ${s.trend_integration}. Viral elements: ${s.viral_elements.join(", ")}.`;

  const prompt = [
    CAPTION_PROMPT,
    "",
    "STRATEGY:",
    strategyText,
    "",
    "KNOWLEDGE CONTEXT:",
    knowledgeText,
    "",
    `Platform: ${params.platform}`,
    `Tone: ${params.tone}`,
    params.variety ? `Post style: ${params.variety}` : "",
    "",
    `Write a ${params.platform} caption using the strategy and knowledge above.`,
  ].filter(Boolean).join("\n");

  const content = await callGemini(apiKey, prompt, 2048);
  const parsed = extractJson(content);

  if (parsed && typeof (parsed as Record<string, unknown>)["caption"] === "string" && ((parsed as Record<string, unknown>)["caption"] as string).length >= 20) {
    return (parsed as Record<string, unknown>)["caption"] as string;
  }

  return null;
}

// ── AGENT 3: Hashtag + CTA ──

const HASHTAG_PROMPT = `You are a social media hashtag and CTA expert.

Generate hashtags and a call-to-action for this social media post.

Rules:
- Hashtags: 3-5 for Instagram, 1-2 for Facebook, 1-2 for Twitter
- Include 1-2 trending hashtags if provided
- Include 2-3 brand-specific hashtags (using actual brand name)
- Include 1-2 niche hashtags
- NO generic tags like ForYou, love, instagood
- WITHOUT # symbol in the array
- CTA: One compelling sentence telling readers what to do next
- CTA should match the content angle and emotional hook

Output ONLY a valid JSON object:
{"hashtags":["tag1","tag2","tag3"],"cta":"one compelling call to action"}`;

export async function runHashtagAgent(params: {
  caption: string;
  brand_name: string;
  platform: string;
  trending_tags: string[];
  emotional_hook: string;
}): Promise<HashtagData> {
  const apiKey = getApiKey();

  const trendingText = params.trending_tags.length > 0
    ? `Trending hashtags to consider: ${params.trending_tags.join(", ")}`
    : "No trending hashtags available.";

  const prompt = [
    HASHTAG_PROMPT,
    "",
    `Caption: ${params.caption}`,
    `Brand name: ${params.brand_name}`,
    `Platform: ${params.platform}`,
    trendingText,
    params.emotional_hook ? `Emotional hook: ${params.emotional_hook}` : "",
    "",
    "Generate relevant hashtags and a compelling CTA.",
  ].filter(Boolean).join("\n");

  const content = await callGemini(apiKey, prompt, 1024);
  const parsed = extractJson(content);

  if (parsed && Array.isArray((parsed as Record<string, unknown>)["hashtags"])) {
    const tags = (parsed as Record<string, unknown>)["hashtags"] as string[];
    return {
      hashtags: tags.map((t: string) => t.replace(/^#/, "")),
      cta: ((parsed as Record<string, unknown>)["cta"] as string) || "",
    };
  }

  return { hashtags: [], cta: "" };
}

// ── AGENT 4: Image Prompt ──

const IMAGE_PROMPT = `You are a visual designer specializing in social media content.

Create a detailed image prompt for AI image generation based on this caption.

The image prompt must:
- Visually represent the caption's message
- Incorporate trending visual styles if provided
- Be specific enough for AI to generate a high-quality image
- Include: subject, setting, lighting, mood, style, composition
- Reference brand-specific elements (location, products, style)

DO NOT:
- Be vague (like "a nice photo")
- Forget the brand's specific elements

Output ONLY a valid JSON object:
{"image_prompt":"detailed visual description for AI image generation"}`;

export async function runImagePromptAgent(params: {
  caption: string;
  brand_name: string;
  key_points: string[];
  viral_patterns: string[];
}): Promise<string> {
  const apiKey = getApiKey();

  const viralText = params.viral_patterns.length > 0
    ? `Trending visual styles: ${params.viral_patterns.join(", ")}`
    : "No viral patterns available.";

  const prompt = [
    IMAGE_PROMPT,
    "",
    `Caption: ${params.caption}`,
    `Brand name: ${params.brand_name}`,
    `Key points: ${params.key_points.join(", ")}`,
    viralText,
    "",
    "Create a detailed image prompt for this content.",
  ].filter(Boolean).join("\n");

  const content = await callGemini(apiKey, prompt, 1024);
  const parsed = extractJson(content);

  if (parsed && typeof (parsed as Record<string, unknown>)["image_prompt"] === "string" && ((parsed as Record<string, unknown>)["image_prompt"] as string).length >= 20) {
    return (parsed as Record<string, unknown>)["image_prompt"] as string;
  }

  return "";
}
